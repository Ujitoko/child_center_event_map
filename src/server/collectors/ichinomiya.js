const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  inRangeJst,
  parseYmdFromJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const {
  sanitizeVenueText,
  sanitizeAddressText,
} = require("../text-utils");
const { ICHINOMIYA_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/**
 * 一宮町 schedule テーブルからイベントを抽出
 * <table class="schedule"> 内の <tr> を解析
 *
 * <tr class="tue workday">
 *   <td class="date">2</td>
 *   <td class="week">火</td>
 *   <td class="detail">
 *     <a class="people" href="event/12/17.html">
 *       <span class="cat townspeople">行事（町民対象）</span>
 *       <p class="title people">親子教室　ひよこ組</p>
 *     </a>
 *   </td>
 * </tr>
 */
/**
 * ページ内の複数タブ（月別）からイベントを抽出。
 * タブ構造: <div class="tab" id="tab12"> ... <table class="schedule"> ...
 * tabCurrent = 当月, tabN = N月。年は現在日時から推定。
 */
function parseSchedulePage(html, baseUrl) {
  const events = [];
  const now = parseYmdFromJst(new Date());

  // 各タブセクションを抽出: <div class="tab..." id="tabXX"> ... </div>
  const tabRe = /<div class="tab[^"]*" id="(tab\w+)">([\s\S]*?)(?=<div class="tab[^"]*" id="tab|<\/div>\s*<\/div>\s*<\/section)/gi;
  let tm;
  while ((tm = tabRe.exec(html)) !== null) {
    const tabId = tm[1];
    const section = tm[2];

    // タブIDから月を決定
    let mo;
    if (tabId === "tabCurrent") {
      mo = now.m;
    } else {
      const moM = tabId.match(/tab(\d{1,2})/);
      if (!moM) continue;
      mo = Number(moM[1]);
    }

    // 年を推定: 当月±6ヶ月以内の最も近い年を選択
    let y = now.y;
    const diff = mo - now.m;
    if (diff > 6) y = now.y - 1;    // e.g. tab12 when current=2 → Dec of prev year
    else if (diff < -6) y = now.y + 1; // e.g. tab1 when current=11 → Jan of next year

    parseTabSection(section, baseUrl, y, mo, events);
  }

  return events;
}

/** 単一タブセクション内の schedule テーブルからイベントを抽出 */
function parseTabSection(section, baseUrl, y, mo, events) {
  const trParts = section.split(/<tr\b[^>]*>/i);
  for (let i = 1; i < trParts.length; i++) {
    const tr = trParts[i];

    // 日付: <td class="date">N</td>
    const dayMatch = tr.match(/class="date"[^>]*>\s*(\d{1,2})\s*<\/td>/);
    if (!dayMatch) continue;
    const d = Number(dayMatch[1]);

    // イベントリンクがない行はスキップ
    if (!/<a\b/i.test(tr)) continue;

    // <a href="..."><span class="cat ...">...</span><p class="title ...">TITLE</p></a>
    const linkRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(tr)) !== null) {
      const href = lm[1].replace(/&amp;/g, "&").trim();
      const inner = lm[2];

      // タイトル抽出: <p class="title ...">...</p>
      const titleMatch = inner.match(/<p\s+class="title[^"]*"[^>]*>([\s\S]*?)<\/p>/);
      const title = titleMatch ? stripTags(titleMatch[1]).trim() : stripTags(inner).trim();
      if (!href || !title) continue;

      // 子育て関連フィルタ
      const catMatch = inner.match(/<span\s+class="cat[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      const category = catMatch ? stripTags(catMatch[1]).trim() : "";
      const isChild = WARD_CHILD_HINT_RE.test(title) || /子育て|子ども|親子|乳幼児|幼児|保育/.test(title + category);
      if (!isChild) continue;

      const absUrl = href.startsWith("http") ? href : `${baseUrl}/${href.replace(/^\.?\/?/, "")}`;
      events.push({ title, url: absUrl, y, mo, d });
    }
  }
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("一宮町") ? address : `一宮町${address}`;
    const withGun = full.includes("長生郡") ? full : `長生郡${full}`;
    candidates.push(`千葉県${withGun}`);
  }
  if (venue) {
    candidates.push(`千葉県長生郡一宮町 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectIchinomiyaEvents(deps) {
  const {
    geocodeForWard,
    resolveEventPoint,
    resolveEventAddress,
    getFacilityAddressFromMaster,
  } = deps;

  return async function collectIchinomiyaEvents(maxDays) {
    const source = `ward_${ICHINOMIYA_SOURCE.key}`;
    const label = ICHINOMIYA_SOURCE.label;

    // メインイベントページ取得 (月別URLなし、単一ページ)
    let rawEvents = [];
    try {
      const html = await fetchText(`${ICHINOMIYA_SOURCE.baseUrl}/event/`);
      rawEvents = parseSchedulePage(html, ICHINOMIYA_SOURCE.baseUrl);
    } catch (e) {
      console.warn(`[${label}] event page fetch failed:`, e.message || e);
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
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 40);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseDetailMeta(html);
          let venue = meta.venue || "";
          let address = meta.address || "";
          // テキストベースのフォールバック
          if (!venue) {
            const plainText = stripTags(html);
            const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim();
              v = v.replace(/\s*(?:住所|郵便番号|駐車|大きな地図|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考|注意|詳細).*$/, "").trim();
              if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) venue = v;
            }
          }
          const timeRange = parseTimeRangeFromText(stripTags(html));
          return { url, venue, address, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(ICHINOMIYA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), ICHINOMIYA_SOURCE);
      point = resolveEventPoint(ICHINOMIYA_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const resolvedAddr = resolveEventAddress(ICHINOMIYA_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const id = `${source}:${ev.url}:${ev.title}:${ev.dateKey}`;
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
        lat: point ? point.lat : ICHINOMIYA_SOURCE.center.lat,
        lng: point ? point.lng : ICHINOMIYA_SOURCE.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectIchinomiyaEvents };
