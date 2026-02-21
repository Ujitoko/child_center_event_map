const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
  parseDatesFromHtml,
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
 * HTML構造: <div class="in_column_box"><a href="...">...block...</a></div>
 * タイトル: <strong class="ttl_event">Title</strong>
 * 日付: ブロック内 <span class="break"><span>M月D日...～M月D日...</span>
 * 場所: <span class="place">区名：会場名</span>
 */
function parseEventListPage(html, baseUrl) {
  const events = [];

  // ページ全体から年を取得（フォールバック用）
  const now = new Date();
  const jstYear = new Date(now.getTime() + 9 * 3600000).getFullYear();

  // in_column_box ブロックを分割して処理
  const blockRe = /<div\s+class="in_column_box">\s*<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&").trim();
    const blockHtml = m[2];

    // タイトルを <strong class="ttl_event"> から抽出
    const titleMatch = blockHtml.match(/<strong[^>]*class="ttl_event"[^>]*>([\s\S]*?)<\/strong>/i);
    const title = titleMatch ? stripTags(titleMatch[1]).trim() : "";
    if (!title) continue;

    // 子育て関連フィルタ
    const fullText = stripTags(blockHtml);
    if (!WARD_CHILD_HINT_RE.test(title) && !CHILD_RE.test(title) && !WARD_CHILD_HINT_RE.test(fullText) && !CHILD_RE.test(fullText)) continue;

    // 日付を <span class="break"> 内の最初の <span> から抽出
    const breakMatch = blockHtml.match(/<span\s+class="break">\s*<span>([\s\S]*?)<\/span>/i);
    const dateText = breakMatch ? stripTags(breakMatch[1]).trim() : "";

    let y = null, mo = null, d = null;

    // M月D日 パターン (開始日を使用)
    const mdMatch = dateText.match(/(\d{1,2})月\s*(\d{1,2})日/);
    if (mdMatch) {
      mo = Number(mdMatch[1]);
      d = Number(mdMatch[2]);
      // 年の推定: 日付テキストにYYYY年があればそれを使用
      const yearMatch = dateText.match(/(\d{4})年/);
      y = yearMatch ? Number(yearMatch[1]) : jstYear;
    }

    // 令和N年M月D日 パターン
    if (!d) {
      const reMatch = dateText.match(/令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
      if (reMatch) {
        y = 2018 + Number(reMatch[1]);
        mo = Number(reMatch[2]);
        d = Number(reMatch[3]);
      }
    }

    // 日付が取れなくても詳細ページで補完するため追加
    const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    events.push({ title, url: absUrl, y: y || 0, mo: mo || 0, d: d || 0, needDates: !d });
  }

  // フォールバック: in_column_box が見つからない場合、従来のリンクパターンも試す
  if (events.length === 0) {
    const linkRe = /<a\s+[^>]*href="(\/(?:004|003|001|006|chuo|urawa)\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = linkRe.exec(html)) !== null) {
      const href = m[1].replace(/&amp;/g, "&").trim();
      const rawTitle = stripTags(m[2]).trim();
      if (!rawTitle || !href) continue;
      if (!WARD_CHILD_HINT_RE.test(rawTitle) && !CHILD_RE.test(rawTitle)) continue;
      const absUrl = `${baseUrl}${href}`;
      events.push({ title: rawTitle, url: absUrl, y: 0, mo: 0, d: 0, needDates: true });
    }
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

    // URL単位で重複除去
    const uniqueByUrl = new Map();
    for (const ev of rawEvents) {
      if (!uniqueByUrl.has(ev.url)) uniqueByUrl.set(ev.url, ev);
    }
    const uniqueEvents = Array.from(uniqueByUrl.values());

    // 詳細ページバッチ取得 (全イベント)
    const detailUrls = [...new Set(uniqueEvents.map((e) => e.url))].slice(0, 60);
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

          // place span パターン (一覧ページ構造)
          if (!venue) {
            const placeMatch = text.match(/(?:場所|会場|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim().replace(/\s*(?:住所|郵便番号|駐車|対象|定員|電話|内容|費用|日時|申込).*$/, "").trim();
              if (v.length >= 2) venue = v;
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

          // 複数日付を取得
          const dates = parseDatesFromHtml(html);
          const eventDate = parseDateFromDetail(text);
          const timeRange = parseTimeRangeFromText(text);
          return { url, venue, address, eventDate, dates, timeRange };
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

      // 日付リストの構築
      let dateList = [];
      if (ev.needDates && detail) {
        // 詳細ページから取得した複数日付を使用
        if (detail.dates && detail.dates.length > 0) {
          dateList = detail.dates;
        } else if (detail.eventDate) {
          dateList = [detail.eventDate];
        }
      } else if (ev.y && ev.mo && ev.d) {
        dateList = [{ y: ev.y, mo: ev.mo, d: ev.d }];
      } else if (detail && detail.eventDate) {
        dateList = [detail.eventDate];
      }

      if (dateList.length === 0) continue;

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

      for (const dd of dateList) {
        const { y, mo, d } = dd;
        if (!inRangeJst(y, mo, d, maxDays)) continue;

        const dateKey = `${y}${String(mo).padStart(2, "0")}${String(d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate({ y, mo, d }, timeRange);
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
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectSaitamaEvents };
