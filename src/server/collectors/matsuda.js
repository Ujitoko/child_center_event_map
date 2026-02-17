const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseYmdFromJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  parseDatesFromHtml,
} = require("../date-utils");
const {
  sanitizeVenueText,
  sanitizeAddressText,
  normalizeJaDigits,
} = require("../text-utils");
const { MATSUDA_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/** 子育て関連キーワード (WARD_CHILD_HINT_RE を補完) */
const CHILD_KEYWORD_RE =
  /(子育て|子ども|こども|親子|幼児|乳幼児|児童|赤ちゃん|あかちゃん|ベビー|キッズ|読み聞かせ|絵本|離乳食|妊娠|出産|母子|プレママ|パパママ)/;

/**
 * カレンダーテーブル (<table summary="カレンダーの表">) を解析し、
 * 日付・タイトル・リンク・担当課を抽出する。
 *
 * 各 <tr> は4列: 日付 | 曜日（祝日） | 行事 | 担当課
 * 日付セルから "X日" のパターンで日を取得し、年月は呼び出し元から受け取る。
 *
 * @param {string} html - ページ全体のHTML
 * @param {number} year - 対象年
 * @param {number} month - 対象月
 * @param {string} baseUrl - ベースURL (リンクの絶対URL生成用)
 * @returns {Array<{y:number, mo:number, d:number, title:string, url:string, department:string}>}
 */
function parseCalendarTable(html, year, month, baseUrl) {
  const events = [];

  // カレンダーテーブルを抽出
  const tableMatch = html.match(
    /<table[^>]*summary\s*=\s*"カレンダーの表"[^>]*>([\s\S]*?)<\/table>/i
  );
  if (!tableMatch) return events;
  const tableHtml = tableMatch[1];

  // 各行を解析 (ヘッダー行をスキップ)
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  let isFirst = true;
  while ((rm = rowRe.exec(tableHtml)) !== null) {
    // ヘッダー行 (<th>) をスキップ
    if (isFirst && /<th[\s>]/i.test(rm[1])) {
      isFirst = false;
      continue;
    }
    isFirst = false;

    // <td> セルを抽出
    const cells = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cm;
    while ((cm = tdRe.exec(rm[1])) !== null) {
      cells.push(cm[1]);
    }
    if (cells.length < 3) continue;

    // 日付セル: "X日" パターン
    const dateText = normalizeJaDigits(stripTags(cells[0]));
    const dayMatch = dateText.match(/(\d{1,2})\s*日/);
    if (!dayMatch) continue;
    const d = Number(dayMatch[1]);

    // 行事セル: タイトルとリンクを抽出
    const eventCell = cells[2];
    const linkMatch = eventCell.match(
      /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
    );
    let title, url;
    if (linkMatch) {
      const href = linkMatch[1].replace(/&amp;/g, "&").trim();
      title = stripTags(linkMatch[2]).trim();
      url = href.startsWith("http") ? href : `${baseUrl}${href}`;
    } else {
      title = stripTags(eventCell).trim();
      url = "";
    }
    if (!title) continue;

    // 担当課セル (あれば)
    const department = cells.length >= 4 ? stripTags(cells[3]).trim() : "";

    events.push({ y: year, mo: month, d, title, url, department });
  }

  return events;
}

/**
 * テーブル前の複数日イベント (期間表記) を解析する。
 * 形式: "1月17日～2月15日  イベント名"
 * テーブルの前にある2列テーブルや <p> ブロックから抽出する。
 *
 * @param {string} html - ページ全体のHTML
 * @param {number} year - 対象年
 * @param {string} baseUrl - ベースURL
 * @returns {Array<{y:number, mo:number, d:number, title:string, url:string, department:string}>}
 */
function parseMultiDayEvents(html, year, baseUrl) {
  const events = [];

  // テーブル前の期間イベントを探す
  // パターン: MM月DD日～MM月DD日 or MM月DD日～DD日 + イベント名
  const text = normalizeJaDigits(stripTags(html));
  const rangeRe =
    /(\d{1,2})月(\d{1,2})日\s*[～〜~ー]\s*(?:(\d{1,2})月)?(\d{1,2})日\s+([^\n]{2,80})/g;
  let m;
  while ((m = rangeRe.exec(text)) !== null) {
    const startMo = Number(m[1]);
    const startD = Number(m[2]);
    const endMo = m[3] ? Number(m[3]) : startMo;
    const endD = Number(m[4]);
    const title = m[5].trim();
    if (!title) continue;

    // リンクは元HTMLから探す
    let url = "";
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const linkRe = new RegExp(
      `<a\\s+href="([^"]+)"[^>]*>[^<]*${escapedTitle.slice(0, 20)}`,
      "i"
    );
    const linkMatch = html.match(linkRe);
    if (linkMatch) {
      const href = linkMatch[1].replace(/&amp;/g, "&").trim();
      url = href.startsWith("http") ? href : `${baseUrl}${href}`;
    }

    // 期間の各日を展開
    const startDate = new Date(year, startMo - 1, startD);
    const endDate = new Date(year, endMo - 1, endD);
    // 年跨ぎ補正 (12月→1月)
    if (endDate < startDate) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    for (
      let dt = new Date(startDate);
      dt <= endDate;
      dt.setDate(dt.getDate() + 1)
    ) {
      events.push({
        y: dt.getFullYear(),
        mo: dt.getMonth() + 1,
        d: dt.getDate(),
        title,
        url,
        department: "",
      });
    }
  }

  return events;
}

/**
 * 子育て関連イベントかどうか判定
 * @param {{title:string, department:string}} ev
 * @returns {boolean}
 */
function isChildRelated(ev) {
  const combined = `${ev.title} ${ev.department}`;
  if (CHILD_KEYWORD_RE.test(combined)) return true;
  if (WARD_CHILD_HINT_RE.test(combined)) return true;
  return false;
}

/**
 * ジオコーディング候補リストを構築
 * 松田町は神奈川県足柄上郡に所属
 */
function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("松田町") ? address : `松田町${address}`;
    const withGun = full.includes("足柄上郡") ? full : `足柄上郡${full}`;
    candidates.push(`神奈川県${withGun}`);
  }
  if (venue) {
    candidates.push(`神奈川県足柄上郡松田町 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectMatsudaEvents(deps) {
  const {
    geocodeForWard,
    resolveEventPoint,
    resolveEventAddress,
    getFacilityAddressFromMaster,
  } = deps;

  return async function collectMatsudaEvents(maxDays) {
    const source = `ward_${MATSUDA_SOURCE.key}`;
    const label = MATSUDA_SOURCE.label;

    // 現在のJST年月を取得
    const now = new Date();
    const jst = parseYmdFromJst(now);
    const year = jst.y;
    const month = jst.m;

    // カレンダーページ取得 (当月のみ)
    const calendarUrl = `${MATSUDA_SOURCE.baseUrl}/calendar/`;
    let calendarHtml;
    try {
      calendarHtml = await fetchText(calendarUrl);
    } catch (e) {
      console.warn(`[${label}] calendar page fetch failed:`, e.message || e);
      return [];
    }

    // テーブルからイベントを抽出
    const tableEvents = parseCalendarTable(
      calendarHtml,
      year,
      month,
      MATSUDA_SOURCE.baseUrl
    );

    // 期間イベントも抽出
    const multiDayEvents = parseMultiDayEvents(
      calendarHtml,
      year,
      MATSUDA_SOURCE.baseUrl
    );

    // マージして子育て関連でフィルタ
    const allRaw = [...tableEvents, ...multiDayEvents];
    const childEvents = allRaw.filter(isChildRelated);

    // 重複除去 (url + date + title)
    const uniqueMap = new Map();
    for (const ev of childEvents) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url || ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, ev);
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // リンク付きイベントの詳細ページをバッチ取得
    const detailUrls = [
      ...new Set(uniqueEvents.map((e) => e.url).filter(Boolean)),
    ].slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const dates = parseDatesFromHtml(html);
          const timeRange = parseTimeRangeFromText(stripTags(html));
          // 詳細ページから会場・住所を抽出 (簡易パース)
          const bodyText = stripTags(html);
          const venueMatch = bodyText.match(
            /(?:会場|場所|ところ|開催場所)[：:\s]*([^\n]{2,40})/
          );
          const venue = venueMatch ? venueMatch[1].trim() : "";
          const addrMatch = bodyText.match(
            /(?:住所|所在地)[：:\s]*([^\n]{2,60})/
          );
          const addr = addrMatch ? addrMatch[1].trim() : "";
          return { url, dates, timeRange, venue, address: addr };
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

      const detail = ev.url ? detailMap.get(ev.url) : null;
      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(MATSUDA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(
        geoCandidates.slice(0, 7),
        MATSUDA_SOURCE
      );
      point = resolveEventPoint(
        MATSUDA_SOURCE,
        venue,
        point,
        rawAddress || `${label} ${venue}`
      );
      const address = resolveEventAddress(
        MATSUDA_SOURCE,
        venue,
        rawAddress || `${label} ${venue}`,
        point
      );

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const id = `${source}:${ev.url || "no-link"}:${ev.title}:${dateKey}`;
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
        url: ev.url || calendarUrl,
        lat: point ? point.lat : MATSUDA_SOURCE.center.lat,
        lng: point ? point.lng : MATSUDA_SOURCE.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectMatsudaEvents };
