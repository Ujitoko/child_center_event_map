/**
 * naana大分（大分市子育て支援サイト）コレクター
 * https://naana-oita.jp/events
 *
 * イベント一覧ページをAJAXページネーションで日別に巡回し、
 * 詳細ページから住所・座標・時間を取得する。
 *
 * - メイン一覧: GET /events (HTML table)
 * - AJAX次日: GET /events/next-event/{YYYY-MM-DD} (HTML table rows)
 * - 詳細: GET /events/detail/{UUID} (dl/dt/dd + Google Maps link)
 * - ~470 events/30日
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText, parseYmdFromJst } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const SITE_BASE = "https://www.naana-oita.jp";

/**
 * naanaのAJAXエンドポイントは X-Requested-With ヘッダーが必要
 */
async function fetchNaanaAjax(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "text/html,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer()).toString("utf8");
}
const DETAIL_BATCH = 5;
const MAX_PAGES = 100; // 日数上限ガード

/**
 * イベント一覧HTML (テーブル) からイベント行を抽出
 *
 * 行パターン:
 *   <tr class="today">
 *     <td valign="top" class="eventdate" rowspan="N">M月D日（曜日）</td>
 *     <td><ul><li><a href="/events/detail/{UUID}">Title</a></li></ul></td>
 *     <td>Venue</td>
 *   </tr>
 * rowspan付きの日付セルは最初の行のみに出現し、
 * 同日の後続行には日付セルが無い。
 */
function parseEventRows(html) {
  const events = [];
  let currentDate = ""; // "M月D日" 形式

  // <tr ...> から </tr> までを抽出
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(html)) !== null) {
    const rowHtml = trMatch[1];

    // 日付セル (eventdate class)
    const dateM = rowHtml.match(/<td[^>]*class="eventdate"[^>]*>([\s\S]*?)<\/td>/i);
    if (dateM) {
      currentDate = stripTags(dateM[1]).replace(/\s+/g, "").trim();
    }

    if (!currentDate) continue;

    // イベントリンク
    const linkM = rowHtml.match(/<a\s+href="(\/events\/detail\/([^"]+))"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkM) continue;

    const href = linkM[1];
    const uuid = linkM[2];
    const title = stripTags(linkM[3]).trim();

    // 会場名 (リンクを含むtdの次のtd)
    // リンクのあるtd以降のtdから会場名を取得
    const tds = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdM;
    while ((tdM = tdRe.exec(rowHtml)) !== null) {
      tds.push(stripTags(tdM[1]).trim());
    }
    // tds: [日付(optional), イベント名(リンク含む), 会場名]
    // 会場は最後のtd
    const venueName = tds.length > 0 ? tds[tds.length - 1] : "";

    if (title && uuid) {
      events.push({
        uuid,
        title,
        venueName,
        dateText: currentDate,
        url: `${SITE_BASE}${href}`,
      });
    }
  }

  return events;
}

/**
 * nextDay spanから次の日付を取得
 * <span class="nextDay" style="display:none">2026-02-25</span>
 */
function parseNextDay(html) {
  const m = html.match(/<span\s+class="nextDay"[^>]*>([\d-]+)<\/span>/i);
  return m ? m[1].trim() : null;
}

/**
 * 日付テキスト "M月D日（曜日）" から { y, mo, d } を解析
 */
function parseDateFromEventDate(dateText, baseYear, baseMonth) {
  const m = dateText.match(/(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  const mo = Number(m[1]);
  const d = Number(m[2]);
  // 年をまたぐ場合の補正
  let y = baseYear;
  if (mo < baseMonth - 6) y += 1;
  return { y, mo, d };
}

/**
 * 詳細ページの <dl> から key→value を抽出
 * <dt>開催時間</dt><dd>11時から11時20分</dd>
 */
function parseDetailDl(html) {
  const meta = {};
  if (!html) return meta;
  const dlM = html.match(/<dl[^>]*>([\s\S]*?)<\/dl>/i);
  if (!dlM) return meta;
  const pairRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let m;
  while ((m = pairRe.exec(dlM[1])) !== null) {
    const key = stripTags(m[1]).replace(/\s+/g, "").trim();
    const val = stripTags(m[2]).replace(/\s+/g, " ").trim();
    if (key && val) meta[key] = val;
  }
  return meta;
}

/**
 * Google Maps リンクから座標を抽出
 * <a href="https://www.google.com/maps/dir/?api=1&destination=33.2406579,131.6083756">
 */
function parseGoogleMapsPoint(html) {
  const m = html.match(/google\.com\/maps[^"]*destination=([\d.]+),([\d.]+)/i);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // 日本国内の簡易バウンディングボックス
  if (lat < 24.0 || lat > 45.6 || lng < 122.9 || lng > 145.9) return null;
  return { lat, lng };
}

/**
 * 詳細ページから住所テキストを抽出
 * <dd>〒870-0046大分市荷揚町３番45号</dd>
 */
function parseAddress(text) {
  if (!text) return "";
  // 郵便番号を除去
  let addr = text.replace(/〒?\d{3}-?\d{4}\s*/, "").trim();
  // 大分県プレフィクスがなければ追加
  if (addr && !addr.startsWith("大分県")) {
    addr = `大分県${addr}`;
  }
  return sanitizeAddressText(addr);
}

/**
 * 開催時間テキストをparseTimeRangeFromText用に正規化
 * "11時から11時20分" → "11時~11時20分"
 */
function normalizeTimeText(text) {
  if (!text) return "";
  return text
    .replace(/から/g, "~")
    .replace(/まで/g, "")
    .replace(/[〜～]/g, "~");
}

function buildGeoCandidates(venue, address) {
  const pref = "大分県";
  const city = "大分市";
  const candidates = [];
  if (address) {
    const full = address.includes("大分") ? address : `${pref}${address}`;
    candidates.push(full);
  }
  if (venue) {
    candidates.push(`${pref}${city} ${venue}`);
  }
  if (!address && !venue) {
    candidates.push(`${pref}${city}`);
  }
  return [...new Set(candidates)];
}

function createNaanaOitaCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectNaanaOitaEvents(maxDays) {
    const now = parseYmdFromJst(new Date());
    const baseYear = now.y;
    const baseMonth = now.m;

    // Step 1: AJAX ページネーションで日別イベント一覧を収集
    // uuid → { uuid, title, venueName, dates: Set<dateText>, url }
    const eventMap = new Map();
    // 日付ごとの uuid → dateObj マッピング
    const uuidDates = new Map(); // uuid → [{ y, mo, d }, ...]

    let pagesWalked = 0;

    try {
      // 最初のページ
      const firstHtml = await fetchText(`${SITE_BASE}/events`);
      if (!firstHtml) {
        console.warn(`[${label}] Failed to fetch initial listing`);
        return [];
      }

      const firstEvents = parseEventRows(firstHtml);
      for (const ev of firstEvents) {
        const dateObj = parseDateFromEventDate(ev.dateText, baseYear, baseMonth);
        if (!dateObj) continue;
        if (!inRangeJst(dateObj.y, dateObj.mo, dateObj.d, maxDays)) continue;

        if (!eventMap.has(ev.uuid)) {
          eventMap.set(ev.uuid, {
            uuid: ev.uuid,
            title: ev.title,
            venueName: ev.venueName,
            url: ev.url,
          });
          uuidDates.set(ev.uuid, []);
        }
        uuidDates.get(ev.uuid).push(dateObj);
      }

      // nextDay で次ページを取得
      let nextDay = parseNextDay(firstHtml);
      pagesWalked = 1;

      while (nextDay && pagesWalked < MAX_PAGES) {
        // nextDay が maxDays の範囲外なら終了
        const ndParts = nextDay.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!ndParts) break;
        const ndY = Number(ndParts[1]);
        const ndM = Number(ndParts[2]);
        const ndD = Number(ndParts[3]);
        if (!inRangeJst(ndY, ndM, ndD, maxDays)) break;

        try {
          const ajaxUrl = `${SITE_BASE}/events/next-event/${nextDay}`;
          const ajaxHtml = await fetchNaanaAjax(ajaxUrl);
          if (!ajaxHtml) break;
          pagesWalked++;

          const pageEvents = parseEventRows(ajaxHtml);
          for (const ev of pageEvents) {
            const dateObj = parseDateFromEventDate(ev.dateText, baseYear, baseMonth);
            if (!dateObj) continue;
            if (!inRangeJst(dateObj.y, dateObj.mo, dateObj.d, maxDays)) continue;

            if (!eventMap.has(ev.uuid)) {
              eventMap.set(ev.uuid, {
                uuid: ev.uuid,
                title: ev.title,
                venueName: ev.venueName,
                url: ev.url,
              });
              uuidDates.set(ev.uuid, []);
            }
            uuidDates.get(ev.uuid).push(dateObj);
          }

          nextDay = parseNextDay(ajaxHtml);
        } catch (e) {
          console.warn(`[${label}] AJAX page error (${nextDay}):`, e.message || e);
          break;
        }
      }
    } catch (e) {
      console.warn(`[${label}] Listing fetch error:`, e.message || e);
      return [];
    }

    if (eventMap.size === 0) return [];
    console.log(`[${label}] Found ${eventMap.size} unique events across ${pagesWalked} pages`);

    // Step 2: 詳細ページをバッチ取得 (座標・住所・時間を取得)
    const entries = Array.from(eventMap.values());
    // detailMap: uuid → { meta, point, rawHtml }
    const detailMap = new Map();

    for (let i = 0; i < entries.length; i += DETAIL_BATCH) {
      const batch = entries.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (e) => {
          const html = await fetchText(e.url);
          const meta = parseDetailDl(html);
          const point = parseGoogleMapsPoint(html);
          return { uuid: e.uuid, meta, point };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.uuid, {
            meta: r.value.meta,
            point: r.value.point,
          });
        }
      }
    }

    // Step 3: イベントレコード生成
    const byId = new Map();

    for (const [uuid, entry] of eventMap) {
      const dates = uuidDates.get(uuid) || [];
      if (dates.length === 0) continue;

      const detail = detailMap.get(uuid) || { meta: {}, point: null };
      const { meta, point: gmapsPoint } = detail;

      // 会場名: 詳細ページ優先、なければリスト一覧から
      const detailVenue = meta["会場"] || "";
      const venue = sanitizeVenueText(detailVenue || entry.venueName || "");

      // 住所
      const rawAddress = meta["所在地"] || "";
      const address = parseAddress(rawAddress);

      // 時間
      const timeText = meta["開催時間"] || "";
      const timeRange = parseTimeRangeFromText(normalizeTimeText(timeText));

      // 座標: Google Maps座標がある場合はそれを使用、なければジオコーディング
      let point = gmapsPoint;
      if (!point) {
        const geoCandidates = buildGeoCandidates(venue, address);
        point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      }
      point = resolveEventPoint(source, venue, point, address || `大分県大分市 ${venue}`);
      const resolvedAddress = resolveEventAddress(source, venue, address || `大分県大分市 ${venue}`, point);

      // 日付ごとにイベントレコード生成 (同一UUID でも日が異なればそれぞれ)
      // 日付の重複排除
      const seenDateKeys = new Set();
      for (const dd of dates) {
        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        if (seenDateKeys.has(dateKey)) continue;
        seenDateKeys.add(dateKey);

        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${uuid}:${entry.title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: entry.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue,
          address: resolvedAddress || "",
          url: entry.url,
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

module.exports = { createNaanaOitaCollector };
