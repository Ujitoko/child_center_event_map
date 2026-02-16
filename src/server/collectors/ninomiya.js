const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  getMonthsForRange,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { NINOMIYA_SOURCE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const DETAIL_BATCH_SIZE = 6;

const CHILD_KEYWORDS_RE =
  /子育て|子ども|親子|乳幼児|幼児|赤ちゃん|ベビー|おはなし|リトミック|ママ|パパ|離乳食|健診|マタニティ|体操|はぐくみ|でんでんむし/;

/**
 * カレンダー一覧ページからイベントを抽出
 * <table class="calendar_month"> 内の各行から日付とリンクを取得
 */
function parseListPage(html, year, month) {
  const events = [];
  // 各行: <th class="cal_date">日</th> ... <a href="...">タイトル</a>
  const rowRe = /<tr[^>]*>[\s\S]*?<th[^>]*class="cal_date"[^>]*>(\d{1,2})<\/th>[\s\S]*?<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const day = Number(rowMatch[1]);
    const rowHtml = rowMatch[0];
    // 行内のリンクを全て抽出
    const linkRe = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkRe.exec(rowHtml)) !== null) {
      const href = linkMatch[1].replace(/&amp;/g, "&").trim();
      const title = stripTags(linkMatch[2]).trim();
      if (!href || !title) continue;
      // 子ども関連キーワードでフィルタ
      if (!CHILD_KEYWORDS_RE.test(title)) continue;
      // 相対パス ../XXXXXXXXXX.html → baseUrl + /XXXXXXXXXX.html
      let absUrl;
      if (href.startsWith("http")) {
        absUrl = href;
      } else if (href.startsWith("../")) {
        absUrl = `${NINOMIYA_SOURCE.baseUrl}/${href.replace(/^\.\.\//, "")}`;
      } else {
        absUrl = `${NINOMIYA_SOURCE.baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
      }
      events.push({ y: year, mo: month, d: day, title, url: absUrl });
    }
  }
  return events;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("二宮町") ? address : `中郡二宮町${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県中郡二宮町 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectNinomiyaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectNinomiyaEvents(maxDays) {
    const source = `ward_${NINOMIYA_SOURCE.key}`;
    const label = NINOMIYA_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // 一覧ページ取得 (月別カレンダー)
    const rawEvents = [];
    for (const ym of months) {
      const mm = String(ym.month).padStart(2, "0");
      const url = `${NINOMIYA_SOURCE.baseUrl}/event2/${ym.year}${mm}.html`;
      try {
        const html = await fetchText(url);
        rawEvents.push(...parseListPage(html, ym.year, ym.month));
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, ev);
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map((e) => e.url))].slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseDetailMeta(html);
          const plainText = stripTags(html);
          const timeRange = parseTimeRangeFromText(plainText);
          // テキストベースの会場抽出フォールバック
          if (!meta.venue) {
            const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim();
              v = v.replace(/\s*(?:住所|郵便番号|駐車|大きな地図|対象|定員|電話|内容|持ち物|日時|費用|備考|協力|おはなし|についてのお知らせ).*$/, "").trim();
              if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) meta.venue = v;
            }
          }
          return { url, meta, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.url, r.value);
        }
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(NINOMIYA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), NINOMIYA_SOURCE);
      point = resolveEventPoint(NINOMIYA_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(NINOMIYA_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const id = `${source}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: address || "",
        url: ev.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectNinomiyaEvents };
