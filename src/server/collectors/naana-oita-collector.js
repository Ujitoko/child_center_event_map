/**
 * naana大分（大分市子育て支援サイト）コレクター
 * https://naana-oita.jp/events
 *
 * イベント一覧ページをAJAXページネーションで日別に巡回。
 * 会場名→KNOWN_FACILITIES で座標・住所を解決（詳細ページ不要）。
 *
 * - メイン一覧: GET /events (HTML table)
 * - AJAX次日: GET /events/next-event/{YYYY-MM-DD} (HTML table rows)
 * - ~500 events/30日
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseYmdFromJst } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText } = require("../text-utils");

const SITE_BASE = "https://www.naana-oita.jp";

/**
 * 会場→住所・座標のマスタ (詳細ページから事前取得済み)
 * 住所は大分県プレフィクス付き、郵便番号除去済み。
 */
const KNOWN_FACILITIES = {
  "大南こどもルーム":     { address: "大分県大分市中戸次5115番地の1", point: { lat: 33.151754, lng: 131.654484 } },
  "明治明野こどもルーム": { address: "大分県大分市明野北4丁目7番8号", point: { lat: 33.2286549, lng: 131.6583212 } },
  "稙田こどもルーム":     { address: "大分県大分市大字玉沢743番地の2", point: { lat: 33.1883556, lng: 131.5782282 } },
  "府内こどもルーム":     { address: "大分県大分市荷揚町3番45号", point: { lat: 33.2406579, lng: 131.6083756 } },
  "中央こどもルーム":     { address: "大分県大分市金池南1丁目5番1号", point: { lat: 33.2304335, lng: 131.6061753 } },
  "佐賀関こどもルーム":   { address: "大分県大分市大字佐賀関1407番地の27", point: { lat: 33.24906868, lng: 131.8733435 } },
  "坂ノ市こどもルーム":   { address: "大分県大分市坂ノ市南3丁目5番33号", point: { lat: 33.2308212, lng: 131.7517072 } },
  "大在こどもルーム":     { address: "大分県大分市政所1丁目4番3号", point: { lat: 33.2466077, lng: 131.7230649 } },
  "鶴崎こどもルーム":     { address: "大分県大分市東鶴崎1丁目2番3号", point: { lat: 33.2405137, lng: 131.6945593 } },
  "大分南部こどもルーム":  { address: "大分県大分市大字曲1113番地", point: { lat: 33.2020285, lng: 131.6120613 } },
  "原新町こどもルーム":   { address: "大分県大分市原新町1番31号", point: { lat: 33.24688223, lng: 131.6496769 } },
  "大分県立美術館（OPAM）": { address: "大分県大分市寿町2番1号", point: { lat: 33.23948, lng: 131.6013373 } },
};

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
    // uuid → { uuid, title, venueName, url }
    const eventMap = new Map();
    // uuid → [{ y, mo, d }, ...]
    const uuidDates = new Map();

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

    // Step 2: KNOWN_FACILITIES で座標・住所を解決 (詳細ページ不要)
    // 未知の会場名はジオコーディングにフォールバック
    const venueCache = new Map(); // venueName → { point, address }
    for (const [name, fac] of Object.entries(KNOWN_FACILITIES)) {
      venueCache.set(name, { point: fac.point, address: fac.address });
    }

    // Step 3: イベントレコード生成
    const byId = new Map();

    for (const [uuid, entry] of eventMap) {
      const dates = uuidDates.get(uuid) || [];
      if (dates.length === 0) continue;

      const venue = sanitizeVenueText(entry.venueName || "");

      // 座標・住所: KNOWN_FACILITIES キャッシュ → ジオコーディング
      let resolved = venueCache.get(entry.venueName);
      if (!resolved) {
        // 未知会場: ジオコーディングで解決し、キャッシュ
        const candidates = [`大分県大分市 ${venue}`];
        if (venue) candidates.unshift(`大分県${venue}`);
        const point = await geocodeForWard(candidates.slice(0, 5), source);
        resolved = { point, address: `大分県大分市 ${venue}` };
        venueCache.set(entry.venueName, resolved);
      }

      let point = resolved.point;
      const address = resolved.address;
      point = resolveEventPoint(source, venue, point, address);
      const resolvedAddress = resolveEventAddress(source, venue, address, point);

      // 日付ごとにイベントレコード生成 (同一UUID でも日が異なればそれぞれ)
      // 日付の重複排除
      const seenDateKeys = new Set();
      for (const dd of dates) {
        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        if (seenDateKeys.has(dateKey)) continue;
        seenDateKeys.add(dateKey);

        const { startsAt, endsAt } = buildStartsEndsForDate(dd, null);
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
