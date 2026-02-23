const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  parseYmdFromJst,
  getMonthsForRange,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  parseDatesFromHtml,
} = require("../date-utils");
const { KAMAKURA_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const CHILD_URL_PATHS = /\/(sei-fukushi|kodomo|kodomokyoku|kosodate|kyouiku)\//;
const DETAIL_BATCH_SIZE = 6;

function parseListPage(html, baseUrl) {
  const events = [];
  // type=2 リスト表示: テーブル行から日付とリンクを抽出
  // 日付行パターン: <td>2026年2月12日(木曜日)</td>
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html)) !== null) {
    const row = rm[1];
    // 日付を抽出
    const dateMatch = row.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) continue;
    const y = Number(dateMatch[1]);
    const mo = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);
    // リンクを抽出
    const linkRe = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(row)) !== null) {
      const href = lm[1].replace(/&amp;/g, "&").trim();
      const title = stripTags(lm[2]).trim();
      if (!href || !title) continue;
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
      events.push({ y, mo, d, title, url: absUrl });
    }
  }
  return events;
}

function isChildRelated(ev) {
  // ひきこもり支援は子育てイベントではない
  if (/ひきこもり/.test(ev.title)) return false;
  if (CHILD_URL_PATHS.test(ev.url)) return true;
  if (WARD_CHILD_HINT_RE.test(ev.title)) return true;
  return false;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("鎌倉市") ? address : `鎌倉市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県鎌倉市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectKamakuraEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectKamakuraEvents(maxDays) {
    const source = `ward_${KAMAKURA_SOURCE.key}`;
    const label = KAMAKURA_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // 一覧ページ取得
    const rawEvents = [];
    for (const ym of months) {
      const url = `${KAMAKURA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${ym.year}&month=${ym.month}`;
      try {
        const html = await fetchText(url);
        rawEvents.push(...parseListPage(html, KAMAKURA_SOURCE.baseUrl));
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 子育て関連フィルタ
    const childEvents = rawEvents.filter(isChildRelated);

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of childEvents) {
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
          const dates = parseDatesFromHtml(html);
          const timeRange = parseTimeRangeFromText(stripTags(html));
          return { url, meta, dates, timeRange };
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
      const venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(KAMAKURA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), KAMAKURA_SOURCE);
      point = resolveEventPoint(KAMAKURA_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(KAMAKURA_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const dateKeyStr = ev.dateKey.replace(/-/g, "");
      const id = `${source}:${ev.url}:${ev.title}:${dateKeyStr}`;
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

/**
 * 鎌倉子育てメディアスポット (kmspot) コレクター
 * http://kmspot.kids.coocan.jp/jyouhou.htm
 * リストページから日付付きイベントを抽出し、
 * 支援センター月間スケジュール(Type B)詳細ページも展開
 */
const KMSPOT_BASE = "http://kmspot.kids.coocan.jp";

const KMSPOT_FACILITIES = {
  "鎌倉子育て支援センター": "鎌倉市御成町20-21",
  "腰越子育て支援センター": "鎌倉市腰越2-2-1",
  "深沢子育て支援センター": "鎌倉市常盤111-3",
  "大船子育て支援センター": "鎌倉市大船2-10-3",
  "玉縄子育て支援センター": "鎌倉市玉縄1-2-1",
  "由比ガ浜保育園": "鎌倉市由比ガ浜3-11-45",
  "深沢保育園": "鎌倉市梶原2-33-2",
  "大船保育園": "鎌倉市大船6-1-2",
  "岡本保育園": "鎌倉市岡本2-3-17",
  "鎌倉青少年会館": "鎌倉市二階堂912-1",
  "鎌倉武道館": "鎌倉市山崎616-16",
  "鎌倉生涯学習センター": "鎌倉市小町1-10-5",
  "腰越学習センター": "鎌倉市腰越864",
  "深沢学習センター": "鎌倉市常盤111-3",
  "大船学習センター": "鎌倉市大船2-1-26",
  "玉縄学習センター": "鎌倉市岡本2-16-3",
};

/** jyouhou.htm の日付セルからM/D(曜)パターンを抽出 */
function parseKmspotDates(dateText) {
  const dates = [];
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const thisY = now.getUTCFullYear();
  const thisMo = now.getUTCMonth() + 1;

  // M/D（曜） パターン (複数日: ・ 区切り)
  // 例: "2/20（金）" or "2/7（土）・14（土）・21（土）" or "2/24（火）・3/24（火）"
  const parts = dateText.split(/[・、,]/);
  let lastMo = 0;
  for (const part of parts) {
    const full = part.match(/(\d{1,2})\s*[/／]\s*(\d{1,2})/);
    if (full) {
      lastMo = Number(full[1]);
      const d = Number(full[2]);
      if (lastMo >= 1 && lastMo <= 12 && d >= 1 && d <= 31) {
        const y = (lastMo < thisMo - 2) ? thisY + 1 : thisY;
        dates.push({ y, mo: lastMo, d });
      }
    } else {
      // 日だけ: "14（土）"
      const dayOnly = part.match(/(\d{1,2})\s*[（(]/);
      if (dayOnly && lastMo > 0) {
        const d = Number(dayOnly[1]);
        if (d >= 1 && d <= 31) {
          const y = (lastMo < thisMo - 2) ? thisY + 1 : thisY;
          dates.push({ y, mo: lastMo, d });
        }
      }
    }
  }
  return dates;
}

/** 支援センター詳細ページ(Type B)からサブイベント+日付を抽出 */
function parseKmspotDetailPage(html, pageUrl) {
  const text = stripTags(html).normalize("NFKC");
  const events = [];
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const thisY = now.getUTCFullYear();
  const thisMo = now.getUTCMonth() + 1;

  // 施設名をタイトルから推定
  let facility = "";
  for (const name of Object.keys(KMSPOT_FACILITIES)) {
    if (text.includes(name)) {
      facility = name;
      break;
    }
  }

  // ●サブイベント名 の後に M月D日(曜曜日) パターン
  const lines = text.split(/\n/);
  let currentSubEvent = "";
  for (const line of lines) {
    const trimmed = line.trim();
    // ● で始まるサブイベント名
    const subMatch = trimmed.match(/^[●◆■★☆]\s*(.{2,40})/);
    if (subMatch) {
      currentSubEvent = subMatch[1].replace(/\s+/g, " ").trim();
    }
    // M月D日（曜曜日）HH時MM分～HH時MM分
    const dateMatch = trimmed.match(/(\d{1,2})月(\d{1,2})日[（(][^）)]*[）)]\s*(\d{1,2})時(\d{0,2})分?[～~ー-]\s*(\d{1,2})時(\d{0,2})分?/);
    if (dateMatch && currentSubEvent) {
      const mo = Number(dateMatch[1]);
      const d = Number(dateMatch[2]);
      const startH = Number(dateMatch[3]);
      const startM = Number(dateMatch[4] || 0);
      const endH = Number(dateMatch[5]);
      const endM = Number(dateMatch[6] || 0);
      const y = (mo < thisMo - 2) ? thisY + 1 : thisY;
      events.push({
        title: currentSubEvent,
        y, mo, d,
        timeRange: { startH, startM, endH, endM },
        facility,
        url: pageUrl,
      });
    }
    // 日付のみ（時間なし）: M月D日（曜曜日）
    if (!dateMatch) {
      const dateOnly = trimmed.match(/(\d{1,2})月(\d{1,2})日[（(][^）)]*[）)]/);
      if (dateOnly && currentSubEvent) {
        const mo = Number(dateOnly[1]);
        const d = Number(dateOnly[2]);
        const y = (mo < thisMo - 2) ? thisY + 1 : thisY;
        events.push({
          title: currentSubEvent,
          y, mo, d,
          timeRange: null,
          facility,
          url: pageUrl,
        });
      }
    }
  }
  return events;
}

function createCollectKamakuraKmspotEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectKamakuraKmspotEvents(maxDays) {
    const source = `ward_${KAMAKURA_SOURCE.key}`;
    const label = `${KAMAKURA_SOURCE.label}kmspot`;
    const byId = new Map();

    // 1) jyouhou.htm を取得
    let listHtml;
    try {
      listHtml = await fetchText(`${KMSPOT_BASE}/jyouhou.htm`);
    } catch (e) {
      console.warn(`[${label}] jyouhou.htm fetch failed:`, e.message || e);
      return [];
    }

    // 2) テーブル行からイベントを抽出
    // 緑背景(#ccffcc)が日付付きイベント行, 黄背景(#ffffe5)は常設サロン
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm;
    const listEvents = [];
    const detailUrls = new Set();

    while ((rm = rowRe.exec(listHtml)) !== null) {
      const row = rm[1];
      // リンク抽出
      const linkMatch = row.match(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;
      const href = linkMatch[1].trim();
      const title = stripTags(linkMatch[2]).trim();
      if (!title || !href) continue;

      const absUrl = href.startsWith("http") ? href : `${KMSPOT_BASE}/${href.replace(/^\.\//, "")}`;

      // 日付セル (2番目の<td>)
      const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (!tds || tds.length < 2) continue;
      const dateCell = stripTags(tds[tds.length - 1]).trim();

      // 支援センター月間スケジュール → 詳細ページ展開が必要
      if (/支援センター.*催し|催し.*支援センター/.test(title) && /sincyaku\//.test(href)) {
        detailUrls.add(absUrl);
        continue;
      }

      // 「詳細は左記リンク」の場合も詳細ページを見る
      if (/詳細.*リンク|リンク.*ご覧/.test(dateCell) && /sincyaku\//.test(href)) {
        detailUrls.add(absUrl);
        continue;
      }

      // 日付パース
      const dates = parseKmspotDates(dateCell);
      if (dates.length === 0) continue;

      // 施設名推定
      let facility = "";
      for (const name of Object.keys(KMSPOT_FACILITIES)) {
        if (title.includes(name)) { facility = name; break; }
      }

      for (const dd of dates) {
        listEvents.push({ title, url: absUrl, facility, ...dd });
      }
    }

    // 3) 詳細ページ(Type B: 支援センター月間スケジュール)を展開
    const detailBatch = [...detailUrls].slice(0, 30);
    for (let i = 0; i < detailBatch.length; i += 4) {
      const batch = detailBatch.slice(i, i + 4);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          return parseKmspotDetailPage(html, url);
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && Array.isArray(r.value)) {
          for (const ev of r.value) {
            listEvents.push(ev);
          }
        }
      }
    }

    // 4) レコード生成
    for (const ev of listEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const venue = ev.facility || "";
      const venueAddr = KMSPOT_FACILITIES[venue] || "";

      let geoCandidates = [];
      if (venueAddr) {
        geoCandidates.push(`神奈川県${venueAddr}`);
      }
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(KAMAKURA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      if (venue) geoCandidates.push(`神奈川県鎌倉市 ${venue}`);
      let point = await geocodeForWard(geoCandidates.slice(0, 7), KAMAKURA_SOURCE);
      point = resolveEventPoint(KAMAKURA_SOURCE, venue, point, venueAddr ? `神奈川県${venueAddr}` : `鎌倉市 ${venue}`);
      const address = resolveEventAddress(KAMAKURA_SOURCE, venue, venueAddr ? `神奈川県${venueAddr}` : `鎌倉市 ${venue}`, point);

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange || null
      );
      const id = `${source}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source,
        source_label: KAMAKURA_SOURCE.label,
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

module.exports = { createCollectKamakuraEvents, createCollectKamakuraKmspotEvents };
