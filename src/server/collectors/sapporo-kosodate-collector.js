/**
 * 札幌市子育てサイト (kosodate.city.sapporo.jp) コレクター
 * SMART CMS API からイベント一覧を JSON で取得
 *
 * API: https://api.smart-lgov.jp/v1/events/get_event_page_list.json
 * Params: token, category_no=0, limit=0, sort=0, order=0, event_type_no=1,
 *         from_date=YYYY/MM/DD, to_date=YYYY/MM/DD
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText, parseYmdFromJst } = require("../date-utils");
const { sanitizeVenueText, normalizeJaDigits } = require("../text-utils");

const API_URL = "https://api.smart-lgov.jp/v1/events/get_event_page_list.json";
const API_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjdXN0b21lcl9jb2RlIjoiMTYxMDI1Iiwic2VydmljZV9uYW1lIjoiU01BUlQgQ01TIn0.zsECr_L3m72nCDNBjvboVi3Kck6RbSpEjZ8T4qmz9CU";

/**
 * event_place から会場名と住所を分離
 * 例: "ちあふる・しろいし(札幌市白石区南郷通1丁目南8)" -> { venue: "ちあふる・しろいし", address: "札幌市白石区南郷通1丁目南8" }
 * 例: "会場名のみ" -> { venue: "会場名のみ", address: "" }
 */
function parseEventPlace(raw) {
  if (!raw) return { venue: "", address: "" };
  const text = raw.trim();

  // パターン1: "会場名(札幌市XX区...)" or "会場名（札幌市XX区...）"
  const m = text.match(/^(.+?)[（(](札幌市[^）)]+)[）)]$/);
  if (m) {
    return { venue: m[1].trim(), address: m[2].trim() };
  }

  // パターン2: 括弧はあるが札幌市を含まない場合 → 全体を会場名として扱う
  const m2 = text.match(/^(.+?)[（(]([^）)]+)[）)]$/);
  if (m2) {
    return { venue: m2[1].trim(), address: "" };
  }

  return { venue: text, address: "" };
}

/**
 * event_date_supplement から最初の日付を抽出
 * 例: "3月5日（水曜日）10時00分～11時30分" -> { y, mo, d }
 * 例: "2026年3月5日 10:00" -> { y, mo, d }
 */
function parseDateFromSupplement(text, baseY, baseMo) {
  if (!text) return null;
  const normalized = normalizeJaDigits(text);

  // "YYYY年M月D日" パターン
  let m = normalized.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (m) {
    return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  }

  // "M月D日" パターン (年なし)
  m = normalized.match(/(\d{1,2})月\s*(\d{1,2})日/);
  if (m) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    let y = baseY;
    if (mo < baseMo - 6) y += 1;
    return { y, mo, d };
  }

  // "YYYY/M/D" パターン
  m = normalized.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) {
    return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  }

  return null;
}

/**
 * org_event_start_datetime から日付を抽出
 * 形式: "YYYY-MM-DD HH:MM:SS"
 */
function parseApiDatetime(dtStr) {
  if (!dtStr) return null;
  const m = dtStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  return {
    y: Number(m[1]),
    mo: Number(m[2]),
    d: Number(m[3]),
    h: Number(m[4]),
    min: Number(m[5]),
  };
}

/**
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 */
function createSapporoKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectSapporoKosodateEvents(maxDays) {
    const now = new Date();
    const jst = parseYmdFromJst(now);

    // from_date: today, to_date: today + maxDays
    const fromDate = `${jst.y}/${String(jst.m).padStart(2, "0")}/${String(jst.d).padStart(2, "0")}`;
    const endDt = new Date(Date.UTC(jst.y, jst.m - 1, jst.d + Math.min(maxDays, 90)));
    const ey = endDt.getUTCFullYear();
    const emo = endDt.getUTCMonth() + 1;
    const ed = endDt.getUTCDate();
    const toDate = `${ey}/${String(emo).padStart(2, "0")}/${String(ed).padStart(2, "0")}`;

    let items = [];
    try {
      const params = new URLSearchParams({
        token: API_TOKEN,
        category_no: "0",
        limit: "0",
        sort: "0",
        order: "0",
        event_type_no: "1",
        from_date: fromDate,
        to_date: toDate,
      });
      const url = `${API_URL}?${params.toString()}`;
      const json = await fetchText(url);
      const parsed = JSON.parse(json);
      // API may return { result: [...] } or array directly
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && Array.isArray(parsed.data)) {
        items = parsed.data;
      } else if (parsed && Array.isArray(parsed.result)) {
        items = parsed.result;
      } else if (parsed && Array.isArray(parsed.event_page_list)) {
        items = parsed.event_page_list;
      } else {
        items = [];
      }
    } catch (e) {
      console.warn(`[${label}] SMART CMS API failed:`, e.message || e);
      return [];
    }

    if (items.length === 0) return [];

    const byId = new Map();

    for (const item of items) {
      try {
        const title = (item.page_name || "").trim();
        if (!title) continue;

        const eventUrl = (item.page_path || "").trim();
        if (!eventUrl) continue;

        // -- 日付の決定 --
        // API の from_date/to_date で既に期間内の有効イベントに絞られている
        // org_event_start_datetime は元の開始日（過去の場合あり）
        // event_date_supplement から次回日付を推定、なければ今日を使用
        let dd = null;
        let timeRange = null;

        // 1) event_date_supplement から将来の日付を抽出
        const supplement = item.event_date_supplement || "";
        if (supplement) {
          dd = parseDateFromSupplement(supplement, jst.y, jst.m);
          timeRange = parseTimeRangeFromText(supplement);
          // 抽出日付が過去なら無効化
          if (dd && !inRangeJst(dd.y, dd.mo, dd.d, maxDays)) dd = null;
        }

        // 2) org_event_start_datetime を試行
        if (!dd) {
          const apiDt = parseApiDatetime(item.org_event_start_datetime);
          if (apiDt) {
            dd = { y: apiDt.y, mo: apiDt.mo, d: apiDt.d };
            if (apiDt.h !== 0 || apiDt.min !== 0) {
              const endDtParsed = parseApiDatetime(item.org_event_end_datetime);
              timeRange = {
                startHour: apiDt.h,
                startMinute: apiDt.min,
                endHour: endDtParsed ? endDtParsed.h : null,
                endMinute: endDtParsed ? endDtParsed.min : null,
              };
            }
            // 過去の開始日 → 今日に補正（期間中のため有効）
            if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) {
              dd = { y: jst.y, mo: jst.m, d: jst.d };
              timeRange = null;
            }
          }
        }

        // 3) それでも日付がなければ今日を使用（APIのfrom_date/to_dateで有効と判定済み）
        if (!dd) {
          dd = { y: jst.y, mo: jst.m, d: jst.d };
        }

        // -- 会場・住所 --
        const { venue: rawVenue, address: rawAddress } = parseEventPlace(item.event_place || "");
        const venue = sanitizeVenueText(rawVenue);

        // area_list からエリア名(区名)を取得
        const areaName = (Array.isArray(item.area_list) && item.area_list.length > 0)
          ? (item.area_list[0].event_area_name || "").trim()
          : "";

        // -- ジオコーディング --
        const candidates = [];
        if (rawAddress) {
          // 括弧内の住所 (例: "札幌市白石区南郷通1丁目南8")
          const fullAddr = rawAddress.includes("北海道") ? rawAddress : `北海道${rawAddress}`;
          candidates.push(fullAddr);
        }
        if (venue && areaName) {
          candidates.push(`北海道札幌市${areaName} ${venue}`);
        }
        if (venue) {
          candidates.push(`北海道札幌市 ${venue}`);
        }
        if (areaName) {
          candidates.push(`北海道札幌市${areaName}`);
        }

        let point = await geocodeForWard(candidates.slice(0, 5), source);
        const addrFallback = rawAddress
          ? (rawAddress.includes("北海道") ? rawAddress : `北海道${rawAddress}`)
          : (areaName ? `北海道札幌市${areaName}` : "北海道札幌市");
        point = resolveEventPoint(source, venue, point, addrFallback);
        const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

        // -- イベントレコード生成 --
        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);

        // URL からスラッグ部分を抽出 (ID用)
        let urlSlug = "";
        try {
          const urlObj = new URL(eventUrl);
          urlSlug = urlObj.pathname.replace(/^\/|\.html$/g, "").replace(/\//g, "_");
        } catch {
          urlSlug = String(item.page_no || "");
        }
        const id = `${srcKey}:${urlSlug}:${title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue || rawVenue,
          address: resolvedAddress || "",
          url: eventUrl,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
        });
      } catch (e) {
        // 個別イベントのエラーはスキップ
        continue;
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createSapporoKosodateCollector };
