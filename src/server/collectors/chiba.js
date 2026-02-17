const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  getMonthsForRange,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { WARD_CHILD_HINT_RE, CHIBA_CITY_SOURCE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/**
 * CGI カレンダー一覧ページをパース
 * event_cal/calendar.cgi?type=2 のリスト表示形式
 */
function parseListPage(html, baseUrl) {
  const events = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html)) !== null) {
    const row = rm[1];
    const dateMatch = row.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) continue;
    const y = Number(dateMatch[1]);
    const mo = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);
    // 各 <li> からリンクを抽出
    const liRe = /<li>([\s\S]*?)<\/li>/gi;
    let lim;
    while ((lim = liRe.exec(row)) !== null) {
      const li = lim[1];
      const linkMatch = li.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (!linkMatch) continue;
      const href = linkMatch[1].replace(/&amp;/g, "&").trim();
      let title = stripTags(linkMatch[2]).trim();
      if (!href || !title) continue;
      // 子育てフィルタ: タイトルキーワード
      if (!WARD_CHILD_HINT_RE.test(title)) continue;
      title = title.replace(/\s*事前申込(あり|なし).*$/, "").trim();
      title = title.replace(/\s*【締切】.*$/, "").trim();
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
      events.push({ y, mo, d, title, url: absUrl });
    }
  }
  return events;
}

function createCollectChibaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = CHIBA_CITY_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectChibaEvents(maxDays) {
    const months = getMonthsForRange(maxDays);

    // 一覧ページ取得
    const rawEvents = [];
    for (const ym of months) {
      const url = `${source.baseUrl}/cgi-bin/event_cal/calendar.cgi?type=2&year=${ym.year}&mon=${ym.month}`;
      try {
        const html = await fetchText(url);
        rawEvents.push(...parseListPage(html, source.baseUrl));
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseDetailMeta(html);
          const plainText = stripTags(html);
          const timeRange = parseTimeRangeFromText(plainText);
          if (!meta.venue) {
            const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim();
              v = v.replace(/\s*(?:住所|郵便番号|駐車|大きな地図|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考|注意|詳細).*$/, "").trim();
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
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const detail = detailMap.get(ev.url);
      let venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      venue = venue.replace(/\s*\d*階.*$/, "").trim();
      let rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      rawAddress = rawAddress.replace(/[（(][^）)]*(?:駅|バス停|徒歩)[^）)]*[）)]/g, "").trim();
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      const candidates = [];
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
          candidates.push(full);
        }
      }
      if (rawAddress) {
        const full = rawAddress.includes(label) ? rawAddress : `${label}${rawAddress}`;
        candidates.push(`千葉県${full}`);
      }
      if (venue) {
        candidates.push(`千葉県${label} ${venue}`);
      }
      let point = await geocodeForWard(candidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const dateKeyStr = ev.dateKey.replace(/-/g, "");
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKeyStr}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
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

module.exports = { createCollectChibaEvents };
