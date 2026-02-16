const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const {
  sanitizeVenueText,
  sanitizeAddressText,
} = require("../text-utils");
const { SAITAMA_CITY_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/** 子育て関連フィルタ (WARD_CHILD_HINT_RE を補完) */
const CHILD_RE = /子育て|子ども|親子|乳幼児|幼児|離乳食|保育|キッズ|児童/;

/**
 * さいたま市イベント一覧ページからイベントリンクを抽出
 *
 * リンク: <a href="/004/...">タイトル</a>
 * 日付: 周辺テキストから YYYY年M月D日 または M月D日 を検出
 */
function parseEventListPage(html, baseUrl) {
  const events = [];

  // ページ全体から年月を取得（フォールバック用）
  const ymMatch = html.match(/(\d{4})年\s*(\d{1,2})月/);
  const fallbackYear = ymMatch ? Number(ymMatch[1]) : new Date().getFullYear();
  const fallbackMonth = ymMatch ? Number(ymMatch[2]) : null;

  // イベントブロックを分割して処理
  // リンクとその前後のテキストから日付を抽出
  const linkRe = /<a\s+[^>]*href="(\/004\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&").trim();
    const title = stripTags(m[2]).trim();
    if (!title || !href) continue;

    // 子育て関連フィルタ
    if (!WARD_CHILD_HINT_RE.test(title) && !CHILD_RE.test(title)) continue;

    // リンク前後のテキストブロック(500文字)から日付を検出
    const pos = m.index;
    const context = html.substring(Math.max(0, pos - 500), pos + m[0].length + 300);
    const contextText = stripTags(context);

    let y = null;
    let mo = null;
    let d = null;

    // YYYY年M月D日 パターン
    const fullDateMatch = contextText.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (fullDateMatch) {
      y = Number(fullDateMatch[1]);
      mo = Number(fullDateMatch[2]);
      d = Number(fullDateMatch[3]);
    }

    // M月D日 パターン (年はフォールバック)
    if (!d) {
      const mdMatch = contextText.match(/(\d{1,2})月\s*(\d{1,2})日/);
      if (mdMatch) {
        mo = Number(mdMatch[1]);
        d = Number(mdMatch[2]);
        y = fallbackYear;
      }
    }

    // 令和N年M月D日 パターン
    if (!d) {
      const reMatch = contextText.match(/令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
      if (reMatch) {
        y = 2018 + Number(reMatch[1]);
        mo = Number(reMatch[2]);
        d = Number(reMatch[3]);
      }
    }

    // 日付が取れなければスキップ（詳細ページで補完する手もあるが、一覧で取れないものは対象外）
    if (!y || !mo || !d) continue;

    const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    events.push({ title, url: absUrl, y, mo, d });
  }

  return events;
}

/**
 * 詳細ページから日付を抽出
 */
function parseDateFromDetail(text) {
  const isoMatch = text.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (isoMatch) {
    return { y: Number(isoMatch[1]), mo: Number(isoMatch[2]), d: Number(isoMatch[3]) };
  }
  const reMatch = text.match(/令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (reMatch) {
    return { y: 2018 + Number(reMatch[1]), mo: Number(reMatch[2]), d: Number(reMatch[3]) };
  }
  return null;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("さいたま市") ? address : `さいたま市${address}`;
    const withPref = full.includes("埼玉県") ? full : `埼玉県${full}`;
    candidates.push(withPref);
  }
  if (venue) {
    candidates.push(`埼玉県さいたま市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectSaitamaEvents(deps) {
  const {
    geocodeForWard,
    resolveEventPoint,
    resolveEventAddress,
    getFacilityAddressFromMaster,
  } = deps;

  return async function collectSaitamaEvents(maxDays) {
    const source = `ward_${SAITAMA_CITY_SOURCE.key}`;
    const label = SAITAMA_CITY_SOURCE.label;
    const baseUrl = SAITAMA_CITY_SOURCE.baseUrl;

    // 月別ページURL生成
    const months = getMonthsForRange(maxDays);
    const urls = months.map(({ year, month }) => {
      const mm = String(month).padStart(2, "0");
      return `${baseUrl}/004/001/002/005/event${year}${mm}.html`;
    });
    // 現在のイベントページも追加
    urls.push(`${baseUrl}/004/001/002/005/event.html`);

    // 一覧ページ取得・解析
    let rawEvents = [];
    for (const url of urls) {
      try {
        const html = await fetchText(url);
        const parsed = parseEventListPage(html, baseUrl);
        rawEvents = rawEvents.concat(parsed);
      } catch (e) {
        // 404等は無視して次へ
        console.warn(`[${label}] page fetch failed (${url}):`, e.message || e);
      }
    }

    if (rawEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 重複除去
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map((e) => e.url))].slice(0, 40);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const text = stripTags(html);
          let venue = "";
          let address = "";

          // dt/dd パターン
          const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
          let mm;
          while ((mm = metaRe.exec(html)) !== null) {
            const k = stripTags(mm[1]);
            const v = stripTags(mm[2]);
            if (!k || !v) continue;
            if (!venue && /(会場|開催場所|場所)/.test(k)) venue = v;
            if (!address && /(住所|所在地)/.test(k)) address = v;
          }

          // th/td パターン
          if (!venue || !address) {
            const trRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
            while ((mm = trRe.exec(html)) !== null) {
              const k = stripTags(mm[1]);
              const v = stripTags(mm[2]);
              if (!k || !v) continue;
              if (!venue && /(会場|開催場所|場所)/.test(k)) venue = v;
              if (!address && /(住所|所在地)/.test(k)) address = v;
            }
          }

          // さいたま市X区 パターンでアドレス補完
          if (!address) {
            const addrMatch = text.match(/さいたま市[^\s、。,]{1,4}区[^\s、。,]{2,30}/);
            if (addrMatch) address = addrMatch[0];
          }

          // 〒 郵便番号パターン
          if (!address) {
            const postalMatch = text.match(/〒?\s*\d{3}-?\d{4}\s*[^\n]{5,40}/);
            if (postalMatch) {
              const afterPostal = postalMatch[0].replace(/〒?\s*\d{3}-?\d{4}\s*/, "").trim();
              if (afterPostal) address = afterPostal;
            }
          }

          const eventDate = parseDateFromDetail(text);
          const timeRange = parseTimeRangeFromText(text);
          return { url, venue, address, eventDate, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const detail = detailMap.get(ev.url);

      // 詳細ページの日付で補完
      let { y, mo, d } = ev;
      if (detail && detail.eventDate) {
        y = detail.eventDate.y;
        mo = detail.eventDate.mo;
        d = detail.eventDate.d;
      }

      if (!inRangeJst(y, mo, d, maxDays)) continue;

      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(SAITAMA_CITY_SOURCE.key, venue);
        if (fmAddr) {
          const full = /埼玉県/.test(fmAddr) ? fmAddr : `埼玉県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), SAITAMA_CITY_SOURCE);
      point = resolveEventPoint(SAITAMA_CITY_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const resolvedAddr = resolveEventAddress(SAITAMA_CITY_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      const dateKey = `${y}${String(mo).padStart(2, "0")}${String(d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y, mo, d },
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
        address: resolvedAddr || "",
        url: ev.url,
        lat: point ? point.lat : SAITAMA_CITY_SOURCE.center.lat,
        lng: point ? point.lng : SAITAMA_CITY_SOURCE.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectSaitamaEvents };
