const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

const CHILD_KW_RE =
  /子育て|子ども|こども|子供|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|健診|健康診査|マタニティ|プレママ|ママ|パパ|おはなし会|読み聞かせ|絵本|広場|サロン/;

/**
 * 水戸市 calendar/index.php パーサー
 * URL: /calendar/index.php?year=YYYY&month=MM
 * HTML構造: <div class="event-item"><a href="/calendar/detail.php?id=NNN">タイトル</a> <span class="date">MM/DD</span></div>
 * or standard <table> calendar with links
 */
function parseMitoCalendarPage(html, baseUrl, fallbackYear, fallbackMonth) {
  const events = [];

  // パターン1: <a href> リンクからイベント抽出
  const linkRe = /<a\s+[^>]*href="([^"]*(?:detail|event|calendar)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&");
    const title = stripTags(m[2]).trim();
    if (!title || title.length < 3) continue;
    if (!CHILD_KW_RE.test(title) && !WARD_CHILD_HINT_RE.test(title)) continue;

    // 日付抽出: URLパラメータ or 前後テキストから
    const yearMatch = href.match(/year=(\d{4})/);
    const monthMatch = href.match(/month=(\d{1,2})/);
    const dayMatch = href.match(/day=(\d{1,2})/);

    const y = yearMatch ? Number(yearMatch[1]) : fallbackYear;
    const mo = monthMatch ? Number(monthMatch[1]) : fallbackMonth;
    const d = dayMatch ? Number(dayMatch[1]) : null;

    const absUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
    if (d) {
      events.push({ title, url: absUrl, y, mo, d });
    }
  }

  // パターン2: カレンダーテーブル内の日付 + イベントリンク
  if (events.length === 0) {
    const dayBlockRe = /<td[^>]*>[\s\S]*?<\/td>/gi;
    let dayBlock;
    while ((dayBlock = dayBlockRe.exec(html)) !== null) {
      const content = dayBlock[0];
      const dayNumMatch = content.match(/>(\d{1,2})<\/(?:a|span|div)/);
      if (!dayNumMatch) continue;
      const d = Number(dayNumMatch[1]);
      if (d < 1 || d > 31) continue;

      const innerLinks = content.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi) || [];
      for (const link of innerLinks) {
        const lm = link.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        if (!lm) continue;
        const href = lm[1].replace(/&amp;/g, "&");
        const title = stripTags(lm[2]).trim();
        if (!title || title.length < 3) continue;
        if (!CHILD_KW_RE.test(title) && !WARD_CHILD_HINT_RE.test(title)) continue;
        const absUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
        events.push({ title, url: absUrl, y: fallbackYear, mo: fallbackMonth, d });
      }
    }
  }

  return events;
}

/**
 * 水戸市カスタムPHPカレンダーコレクター
 */
function createCollectMitoEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster, source } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;
  const baseUrl = source.baseUrl;

  return async function collectMitoEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      const url = `${baseUrl}/calendar/index.php?year=${year}&month=${month}`;
      try {
        const html = await fetchText(url);
        const parsed = parseMitoCalendarPage(html, baseUrl, year, month);
        rawEvents.push(...parsed);
      } catch (e) {
        console.warn(`[${label}] calendar fetch failed (${year}/${month}):`, e.message || e);
      }
    }

    if (rawEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 重複除去 + 範囲フィルタ
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 60);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const text = stripTags(html);
          const timeRange = parseTimeRangeFromText(text);
          let venue = "";
          let address = "";
          // dt/dd パターン
          const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
          let mm;
          while ((mm = metaRe.exec(html)) !== null) {
            const k = stripTags(mm[1]).trim();
            const v = stripTags(mm[2]).trim();
            if (!venue && /(会場|場所|開催場所|ところ)/.test(k)) venue = v;
            if (!address && /(住所|所在地)/.test(k)) address = v;
          }
          // th/td フォールバック
          if (!venue) {
            const trRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
            while ((mm = trRe.exec(html)) !== null) {
              const k = stripTags(mm[1]).trim();
              const v = stripTags(mm[2]).trim();
              if (!venue && /(会場|場所|開催場所|ところ)/.test(k)) venue = v;
              if (!address && /(住所|所在地)/.test(k)) address = v;
            }
          }
          // h3+p フォールバック
          if (!venue) {
            const sectionRe = /<h3[^>]*>([\s\S]*?)<\/h3>\s*(?:<p[^>]*>([\s\S]*?)<\/p>)?/gi;
            let sm;
            while ((sm = sectionRe.exec(html)) !== null) {
              const heading = stripTags(sm[1]).trim();
              const value = sm[2] ? stripTags(sm[2]).trim() : "";
              if (!value) continue;
              if (!venue && /^(?:会場|場所|開催場所|ところ)$/.test(heading)) venue = value;
            }
          }
          // テキストベースフォールバック
          if (!venue) {
            const placeMatch = text.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim().replace(/\s*(?:住所|駐車|参加|申込|対象|定員|電話|日時|費用|備考).*$/, "").trim();
              if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) venue = v;
            }
          }
          return { url, venue, address, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const pref = "茨城県";
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      const geoCandidates = [];
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) geoCandidates.push(new RegExp(pref).test(fmAddr) ? fmAddr : `${pref}${fmAddr}`);
      }
      if (rawAddress) {
        const full = rawAddress.includes(label) ? rawAddress : `${label}${rawAddress}`;
        geoCandidates.push(full.includes(pref) ? full : `${pref}${full}`);
      }
      if (venue) geoCandidates.push(`${pref}${label} ${venue}`);

      let point = await geocodeForWard([...new Set(geoCandidates)].slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const resolvedAddr = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate({ y: ev.y, mo: ev.mo, d: ev.d }, timeRange);
      const id = `${srcKey}:${ev.url}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: resolvedAddr || "",
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

/**
 * 鹿嶋市カスタムPHPカレンダーコレクター (水戸市と同型)
 */
function createCollectKashimaIbEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster, source } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;
  const baseUrl = source.baseUrl;

  return async function collectKashimaIbEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      const url = `${baseUrl}/calendar/index.php?year=${year}&month=${month}`;
      try {
        const html = await fetchText(url);
        const parsed = parseMitoCalendarPage(html, baseUrl, year, month);
        rawEvents.push(...parsed);
      } catch (e) {
        console.warn(`[${label}] calendar fetch failed (${year}/${month}):`, e.message || e);
      }
    }

    if (rawEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    const pref = "茨城県";
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const geoCandidates = [`${pref}${label}`];
      let point = await geocodeForWard(geoCandidates, source);
      point = resolveEventPoint(source, "", point);
      const resolvedAddr = resolveEventAddress(source, "", `${label}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate({ y: ev.y, mo: ev.mo, d: ev.d }, null);
      const id = `${srcKey}:${ev.url}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: "",
        address: resolvedAddr || "",
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = {
  createCollectMitoEvents,
  createCollectKashimaIbEvents,
};
