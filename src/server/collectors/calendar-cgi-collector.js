/**
 * 汎用 CGI カレンダーコレクター
 * 対象CMS: Joruri CMS (event_cal / event_cal_multi), FourWeb (板橋区), calendar.php (新宿区)
 */
const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  getMonthsForRange,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH = 6;
const DAY_BATCH = 6;

/* ──────────────────── Joruri CMS ──────────────────── */

/** type=1 グリッドから type=3 リンクの日を抽出 */
function parseGridDays(html) {
  const days = new Set();
  const re = /calendar\.cgi\?type=3&(?:amp;)?year=\d+&(?:amp;)?month=\d+&(?:amp;)?day=(\d+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const d = Number(m[1]);
    if (d >= 1 && d <= 31) days.add(d);
  }
  return Array.from(days).sort((a, b) => a - b);
}

/** type=3 日別ページからイベントを抽出 (2形式対応) */
function parseDayPageJoruri(html, baseUrl, year, month, day) {
  const events = [];
  const seen = new Set();

  // Format A: <li><a href="...">TITLE&nbsp;&nbsp;DATE</a></li> (文京/荒川/江戸川/杉並/豊島)
  const liRe = /<li>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/li>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&").trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript")) continue;
    const rawText = stripTags(m[2]).replace(/&nbsp;/g, " ").trim();
    if (!rawText || rawText.length < 5) continue;
    // nav links
    if (/サイトマップ|トップページ|アクセス|プライバシー|文字サイズ|Language|音声|RSS|使い方|考え方|ウェブ/.test(rawText)) continue;
    // need date pattern
    if (!/\d{4}年\d{1,2}月\d{1,2}日/.test(rawText)) continue;
    let title = rawText
      .replace(/\d{4}年\d{1,2}月\d{1,2}日[（(][^）)]*[）)]/g, "")
      .replace(/\s*～\s*/g, " ～ ")
      .replace(/\d{1,2}時\d{0,2}分?\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || title.length < 2) continue;
    title = title.replace(/^\s*～\s*/, "").replace(/\s*～\s*$/, "").trim();
    if (!title) continue;
    const absUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
    if (seen.has(absUrl)) continue;
    seen.add(absUrl);
    events.push({ y: year, mo: month, d: day, title, url: absUrl, rawText });
  }

  // Format B: <div class="shisetsu_idx"><p class="shisetsu_ttl"><a href="..."><strong>TITLE</strong></a></p><p>DATE</p></div> (足立区)
  const divRe = /<div\s+class="shisetsu_idx">\s*<p\s+class="shisetsu_ttl">\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/p>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/gi;
  while ((m = divRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&").trim();
    if (!href || href.startsWith("#")) continue;
    const title = stripTags(m[2]).trim();
    if (!title || title.length < 2) continue;
    const absUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
    if (seen.has(absUrl)) continue;
    seen.add(absUrl);
    const dateText = stripTags(m[3]).trim();
    events.push({ y: year, mo: month, d: day, title, url: absUrl, rawText: `${title} ${dateText}` });
  }

  return events;
}

/* ──────────────────── 板橋区 FourWeb ──────────────────── */

/** 板橋区 event.cgi 月間テーブルからイベント抽出 */
function parseItabashiPage(html, baseUrl, year, month) {
  const events = [];
  // <tr><th>N日<span>曜日</span></th><td><ul><li>...</li></ul></td></tr>
  const trRe = /<tr>\s*<th[^>]*>\s*<span[^>]*>(\d+)<\/span>\s*日[\s\S]*?<\/th>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const d = Number(m[1]);
    const cell = m[2];
    // <li><a href="...">TITLE</a><span class="ecate e50">子ども</span></li>
    const liRe = /<li>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)<\/li>/gi;
    let lm;
    while ((lm = liRe.exec(cell)) !== null) {
      const badges = lm[3] || "";
      // c50 = 子ども・保護者向け
      if (!/e50/.test(badges)) continue;
      const href = lm[1].replace(/&amp;/g, "&").trim();
      const title = stripTags(lm[2]).trim();
      if (!title || title.length < 2) continue;
      const absUrl = href.startsWith("http") ? href : new URL(href, `${baseUrl}/`).href;
      events.push({ y: year, mo: month, d, title, url: absUrl, rawText: title });
    }
  }
  return events;
}

/* ──────────────────── 新宿区 calendar.php ──────────────────── */

/** 新宿区 calendar.php list ページからイベント抽出 */
function parseShinjukuPage(html, baseUrl, year, month) {
  const events = [];
  // <div class="eventSelectDay"><p>N日(曜日)</p><ul><li class="eventItem"><span><a href="...">TITLE</a></span></li>...</ul></div>
  const dayRe = /<p>(\d{1,2})日[^<]*<\/p>\s*<ul>([\s\S]*?)<\/ul>/gi;
  let m;
  while ((m = dayRe.exec(html)) !== null) {
    const d = Number(m[1]);
    const ul = m[2];
    const liRe = /<li\s+class="eventItem"[^>]*>\s*<span[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = liRe.exec(ul)) !== null) {
      const href = lm[1].replace(/&amp;/g, "&").trim();
      let title = stripTags(lm[2]).trim();
      // remove trailing date range "(YYYY年M月D日まで)"
      title = title.replace(/\s*\(\d{4}年\d{1,2}月\d{1,2}日まで\)\s*$/, "").trim();
      if (!title || title.length < 2) continue;
      const absUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
      events.push({ y: year, mo: month, d, title, url: absUrl, rawText: title });
    }
  }
  return events;
}

/* ──────────────────── 詳細ページ解析 ──────────────────── */

async function fetchDetailPages(urls, fetchFn) {
  const detailMap = new Map();
  for (let i = 0; i < urls.length; i += DETAIL_BATCH) {
    const batch = urls.slice(i, i + DETAIL_BATCH);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const html = await fetchFn(url);
        const meta = parseDetailMeta(html);
        const plainText = stripTags(html);
        const timeRange = parseTimeRangeFromText(plainText);
        if (!meta.venue) {
          const pm = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
          if (pm) {
            let v = pm[1].trim();
            v = v.replace(/\s*(?:住所|郵便番号|駐車|大きな地図|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考|注意|詳細).*$/, "").trim();
            if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) meta.venue = v;
          }
        }
        return { url, meta, timeRange };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
    }
  }
  return detailMap;
}

/* ──────────────────── ジオコーディング ──────────────────── */

function detectPrefecture(source) {
  const url = source.baseUrl || "";
  if (/tokyo\.jp/.test(url)) return "東京都";
  if (/saitama/.test(url)) return "埼玉県";
  if (/chiba/.test(url)) return "千葉県";
  if (/kanagawa/.test(url)) return "神奈川県";
  if (/ibaraki/.test(url)) return "茨城県";
  if (/tochigi/.test(url)) return "栃木県";
  if (/gunma/.test(url)) return "群馬県";
  return "東京都";
}

/* ──────────────────── ファクトリー ──────────────────── */

/**
 * @param {Object} config
 * @param {Object} config.source - SOURCE定義
 * @param {string} config.cgiPath - CGIパス (e.g. "/cgi-bin/event_cal_multi/calendar.cgi")
 * @param {string|string[]} [config.categoryParams] - カテゴリ絞込みパラメータ
 * @param {boolean} [config.useKeywordFilter=true] - 子育てキーワードフィルタ使用
 * @param {RegExp} [config.childKeywords] - カスタムキーワードRE
 * @param {string} [config.mode="joruri"] - "joruri"|"fourweb"|"php"
 * @param {boolean} [config.useUA=false] - User-Agent必要
 * @param {Object} deps - DI dependencies
 */
function createCalendarCgiCollector(config, deps) {
  const {
    source,
    cgiPath = "/cgi-bin/event_cal_multi/calendar.cgi",
    categoryParams = "",
    useKeywordFilter = true,
    childKeywords = WARD_CHILD_HINT_RE,
    mode = "joruri",
    useUA = false,
  } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;
  const pref = detectPrefecture(source);

  const fetchOpts = useUA ? { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } } : {};
  function fetchPage(url) {
    return fetchText(url, fetchOpts);
  }

  return async function collectEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    if (mode === "joruri") {
      // ──── Joruri CMS: grid(type=1) → day(type=3) ────
      const paramVariants = Array.isArray(categoryParams) ? categoryParams : [categoryParams || ""];
      for (const ym of months) {
        for (const cp of paramVariants) {
          const gridUrl = `${source.baseUrl}${cgiPath}?type=1&year=${ym.year}&month=${ym.month}${cp}`;
          let gridHtml;
          try { gridHtml = await fetchPage(gridUrl); } catch (e) {
            console.warn(`[${label}] grid ${ym.year}/${ym.month} failed:`, e.message);
            continue;
          }
          const eventDays = parseGridDays(gridHtml);
          for (let i = 0; i < eventDays.length; i += DAY_BATCH) {
            const batch = eventDays.slice(i, i + DAY_BATCH);
            const results = await Promise.allSettled(
              batch.map(async (day) => {
                const dayUrl = `${source.baseUrl}${cgiPath}?type=3&year=${ym.year}&month=${ym.month}&day=${day}${cp}`;
                const html = await fetchPage(dayUrl);
                return parseDayPageJoruri(html, source.baseUrl, ym.year, ym.month, day);
              })
            );
            for (const r of results) {
              if (r.status === "fulfilled") rawEvents.push(...r.value);
            }
          }
        }
      }
    } else if (mode === "fourweb") {
      // ──── FourWeb CMS (板橋区): 月間テーブル ────
      const cp = categoryParams || "";
      for (const ym of months) {
        const url = `${source.baseUrl}${cgiPath}?${cp}&type=2&year=${ym.year}&month=${ym.month}&day=1`;
        try {
          const html = await fetchPage(url);
          rawEvents.push(...parseItabashiPage(html, source.baseUrl, ym.year, ym.month));
        } catch (e) {
          console.warn(`[${label}] ${ym.year}/${ym.month} failed:`, e.message);
        }
      }
    } else if (mode === "php") {
      // ──── calendar.php (新宿区): 月間リスト ────
      for (const ym of months) {
        const url = `${source.baseUrl}${cgiPath}?mode=list&Y=${ym.year}&M=${ym.month}`;
        try {
          const html = await fetchPage(url);
          rawEvents.push(...parseShinjukuPage(html, source.baseUrl, ym.year, ym.month));
        } catch (e) {
          console.warn(`[${label}] ${ym.year}/${ym.month} failed:`, e.message);
        }
      }
    }

    // 子育てフィルタ
    const filtered = useKeywordFilter
      ? rawEvents.filter((ev) => childKeywords.test(ev.title) || childKeywords.test(ev.rawText || ""))
      : rawEvents;

    // 重複除去
    const uniqueMap = new Map();
    for (const ev of filtered) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページ取得
    const detailUrls = [...new Set(uniqueEvents.map((e) => e.url))].slice(0, 120);
    const detailMap = await fetchDetailPages(detailUrls, fetchPage);

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

      const candidates = [];
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const full = new RegExp(pref).test(fmAddr) ? fmAddr : `${pref}${fmAddr}`;
          candidates.push(full);
        }
      }
      if (rawAddress) {
        const full = rawAddress.includes(label) ? rawAddress : `${label}${rawAddress}`;
        candidates.push(full.includes(pref) ? full : `${pref}${full}`);
      }
      if (venue) candidates.push(`${pref}${label} ${venue}`);
      let point = await geocodeForWard(candidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate({ y: ev.y, mo: ev.mo, d: ev.d }, timeRange);
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
    console.log(`[${label}] ${results.length} events collected (raw: ${rawEvents.length}, filtered: ${filtered.length})`);
    return results;
  };
}

module.exports = { createCalendarCgiCollector };
