/**
 * 五泉市 にこサポ (nikosapo.jp) イベントコレクター
 * https://www.nikosapo.jp/event/list
 *
 * 子育て支援ポータル。月間カレンダーグリッド + 詳細ページ。
 * 詳細ページに lat/lng が埋め込まれているためジオコード不要。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText } = require("../text-utils");

const SITE_BASE = "https://www.nikosapo.jp";
const DETAIL_BATCH = 5;

/** カレンダーグリッドからイベントリンクを抽出 */
function parseListPage(html) {
  const events = [];
  // 年月を取得: <div class="calendarTitle"><h3>2026年3月</h3>
  const ymM = html.match(/<div class="calendarTitle[\s\S]*?<h3>(\d{4})年(\d{1,2})月/);
  const y = ymM ? parseInt(ymM[1], 10) : null;
  const mo = ymM ? parseInt(ymM[2], 10) : null;
  if (!y || !mo) return { y, mo, events };

  // 各日セルをパース
  const cellRe = /<div class="cContent[^"]*">([\s\S]*?)<\/div>\s*(?=<div class="cContent|<\/div>\s*<\/div>)/gi;
  let cm;
  while ((cm = cellRe.exec(html)) !== null) {
    const cell = cm[1];
    // 日番号
    const dayM = cell.match(/<span class="cDate">(\d{1,2})日<\/span>/);
    if (!dayM) continue;
    const d = parseInt(dayM[1], 10);

    // イベントリンク
    const linkRe = /<a href="(\/event\/detail\?no=\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(cell)) !== null) {
      const url = SITE_BASE + lm[1];
      const title = stripTags(lm[2]).trim();
      if (title) events.push({ y, mo, d, url, title });
    }
  }
  return { y, mo, events };
}

/** 詳細ページからメタデータを抽出 */
function parseDetailPage(html) {
  const meta = {};
  if (!html) return meta;

  // タイトル
  const titleM = html.match(/<h3 class="sstit03_event">([\s\S]*?)<\/h3>/);
  meta.title = titleM ? stripTags(titleM[1]).trim() : "";

  // 開催日: 開催日：2026年3月5日（木）／こども家庭課
  const dateM = html.match(/開催日：(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (dateM) {
    meta.y = parseInt(dateM[1], 10);
    meta.mo = parseInt(dateM[2], 10);
    meta.d = parseInt(dateM[3], 10);
  }

  // lat/lng (hidden inputs)
  const latM = html.match(/id="map_lat"[^>]*value="([^"]+)"/);
  const lngM = html.match(/id="map_lng"[^>]*value="([^"]+)"/);
  if (latM && lngM) {
    const lat = parseFloat(latM[1]);
    const lng = parseFloat(lngM[1]);
    if (lat && lng) meta.point = { lat, lng };
  }
  // fallback: Google Maps LatLng in JS
  if (!meta.point) {
    const jsM = html.match(/google\.maps\.LatLng\(([0-9.]+),\s*([0-9.]+)\)/);
    if (jsM) {
      const lat = parseFloat(jsM[1]);
      const lng = parseFloat(jsM[2]);
      if (lat && lng) meta.point = { lat, lng };
    }
  }

  // 本文テキスト (h4の後の<p>)
  const bodyM = html.match(/<h4 class="sstit_event">開催日[\s\S]*?<\/h4>\s*<p>([\s\S]*?)<\/p>/);
  const bodyText = bodyM ? stripTags(bodyM[1]).replace(/\s+/g, " ").trim() : "";

  // 時間
  const timeM = bodyText.match(/(?:時間|日時)[：:\s]+([\s\S]*?)(?:$|会場|場所|対象|定員|持)/);
  meta.timeText = timeM ? timeM[1].trim() : "";

  // 会場
  const venueM = bodyText.match(/(?:会場|場所)[：:\s]+([\s\S]*?)(?:$|対象|定員|時間|持|申|連|参加費)/);
  meta.venue = venueM ? sanitizeVenueText(venueM[1].trim().split(/\s{2,}/)[0]) : "";

  // 連絡先 → 施設名 + 住所
  const contactM = html.match(/<div class="contactBox">([\s\S]*?)<\/div>/);
  if (contactM) {
    const nameM = contactM[1].match(/<strong>([\s\S]*?)<\/strong>/);
    meta.contactName = nameM ? stripTags(nameM[1]).trim() : "";
    const addrM = contactM[1].match(/〒[\d-]+\s*([\s\S]*?)(?:<br|TEL|$)/i);
    meta.address = addrM ? stripTags(addrM[1]).trim() : "";
  }

  return meta;
}

function createNikosapoCollector({ source }, geoDeps) {
  const { resolveEventPoint } = geoDeps;

  return async function collectNikosapoEvents(days) {
    const results = [];
    const seen = new Set();
    const now = new Date();

    try {
      // 当月 + 翌月 + 翌々月をフェッチ
      for (let offset = 0; offset <= 2; offset++) {
        const target = new Date(now);
        target.setMonth(target.getMonth() + offset);
        const ty = target.getFullYear();
        const tmo = target.getMonth() + 1;

        const listUrl = `${SITE_BASE}/event/list?year=${ty}&month=${tmo}&agetype=&listflg=0`;
        let html;
        try { html = await fetchText(listUrl); } catch { continue; }
        if (!html) continue;

        const { events } = parseListPage(html);

        // 詳細ページをバッチフェッチ
        for (let i = 0; i < events.length; i += DETAIL_BATCH) {
          const batch = events.slice(i, i + DETAIL_BATCH);
          const details = await Promise.all(batch.map(async (ev) => {
            if (seen.has(ev.url)) return null;
            seen.add(ev.url);
            if (!inRangeJst(ev.y, ev.mo, ev.d, days)) return null;
            try { return { ev, detail: parseDetailPage(await fetchText(ev.url)) }; }
            catch { return null; }
          }));

          for (const item of details) {
            if (!item) continue;
            const { ev, detail } = item;
            const y = detail.y || ev.y;
            const mo = detail.mo || ev.mo;
            const d = detail.d || ev.d;

            const title = detail.title || ev.title;
            const timeRange = parseTimeRangeFromText(detail.timeText || "");
            const { startsAt, endsAt, timeUnknown } = buildStartsEndsForDate({ y, mo, d }, timeRange);
            const dateKey = startsAt.slice(0, 10);

            const venueName = detail.venue || detail.contactName || "";
            const address = detail.address || "";
            const point = detail.point || null;

            // facility master にキャッシュ
            if (point && venueName) {
              resolveEventPoint(source.key, venueName, address, point);
            }

            results.push({
              id: `${source.key}:${ev.url}:${title}:${dateKey}`,
              source: source.key,
              title,
              starts_at: startsAt,
              ends_at: endsAt,
              time_unknown: timeUnknown,
              venue_name: venueName,
              address,
              point,
              url: ev.url,
            });
          }
        }
      }
    } catch (e) {
      console.error(`[${source.key}] error:`, e.message);
    }
    console.log(`[${source.key}] collected ${results.length} events`);
    return results;
  };
}

module.exports = { createNikosapoCollector };
