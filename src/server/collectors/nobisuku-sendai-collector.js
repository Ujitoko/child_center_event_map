/**
 * のびすく仙台 イベントコレクター
 * https://www.nobisuku-sendai.jp/
 *
 * 仙台市の子育て支援施設5箇所。CGIカレンダーから全イベントを取得。
 * 各施設は固定住所。Shift_JIS。~60-80 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE = "https://www.nobisuku-sendai.jp";
const FACILITIES = [
  { path: "/event/p-event.cgi", name: "のびすく仙台", address: "宮城県仙台市青葉区中央2丁目10番24号", lat: 38.2607, lng: 140.8792 },
  { path: "/event-izumi/p-event.cgi", name: "のびすく泉中央", address: "宮城県仙台市泉区泉中央1丁目8番6号", lat: 38.3200, lng: 140.8815 },
  { path: "/event-miyagino/p-event.cgi", name: "のびすく宮城野", address: "宮城県仙台市宮城野区五輪2丁目12番70号", lat: 38.2677, lng: 140.9095 },
  { path: "/event-wakabayashi/p-event.cgi", name: "のびすく若林", address: "宮城県仙台市若林区保春院前丁3番1号", lat: 38.2474, lng: 140.8929 },
  { path: "/event-nagamachi/p-event.cgi", name: "のびすく長町南", address: "宮城県仙台市太白区長町7丁目20番5号", lat: 38.2274, lng: 140.8812 },
];

/** CGIページからイベントを抽出 */
function parseEvents(html, year, month) {
  const events = [];
  // event_url.js 以降の詳細テーブル部分を対象にする
  const splitIdx = html.indexOf("event_url.js");
  const detail = splitIdx >= 0 ? html.substring(splitIdx) : html;

  // 各イベント行: <a name="DAY"> + <strong>TITLE</strong> + <div class="event_box">DETAILS</div>
  const rowRe = /<a\s+name="(\d+)">\s*<\/a>\s*<font[^>]*>(\d+)日/gi;
  let m;
  // 先に全マッチ位置を収集
  const anchors = [];
  while ((m = rowRe.exec(detail)) !== null) {
    anchors.push({ idx: m.index, day: Number(m[1]) });
  }

  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].idx;
    const end = i + 1 < anchors.length ? anchors[i + 1].idx : detail.length;
    const block = detail.substring(start, end);
    const day = anchors[i].day;

    // タイトル抽出
    const titleM = block.match(/<strong>([\s\S]*?)<\/strong>/i);
    if (!titleM) continue;
    const titleRaw = stripTags(titleM[1]).replace(/\s+/g, " ").trim();
    // 休館日スキップ
    if (/休館日/.test(titleRaw)) continue;
    // 予約締切注記を除去
    const title = titleRaw.replace(/※.*$/, "").trim();
    if (!title) continue;

    // event_box から時間抽出
    const boxM = block.match(/<div\s+class="event_box">([\s\S]*?)<\/div>/i);
    const boxText = boxM ? stripTags(boxM[1]).replace(/\s+/g, " ") : "";
    let timeRange = null;
    const timeM = boxText.match(/(\d{1,2})[：:](\d{2})\s*[〜~～ー-]\s*(\d{1,2})[：:](\d{2})/);
    if (timeM) {
      timeRange = {
        startHour: Number(timeM[1]), startMinute: Number(timeM[2]),
        endHour: Number(timeM[3]), endMinute: Number(timeM[4]),
      };
    } else {
      const timeM2 = boxText.match(/(\d{1,2})[：:](\d{2})\s*[〜~～]/);
      if (timeM2) {
        timeRange = { startHour: Number(timeM2[1]), startMinute: Number(timeM2[2]) };
      }
    }

    // 場所抽出 (外部会場の場合)
    const venueM = boxText.match(/場\s*所[：:]\s*([^\n]+)/);
    const venueExtra = venueM ? venueM[1].trim() : null;

    events.push({ day, title, timeRange, venueExtra });
  }
  return events;
}

function createNobisukuSendaiCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectNobisukuSendaiEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    const byId = new Map();

    for (const fac of FACILITIES) {
      // 今月+来月+再来月
      for (let i = 0; i < 3; i++) {
        let mm = mo + i;
        let yy = y;
        if (mm > 12) { mm -= 12; yy++; }

        try {
          const url = `${BASE}${fac.path}?year=${yy}&month=${mm}`;
          const html = await fetchText(url);
          if (!html) continue;

          const events = parseEvents(html, yy, mm);
          const point = { lat: fac.lat, lng: fac.lng };

          for (const ev of events) {
            const dd = { y: yy, mo: mm, d: ev.day };
            if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

            const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
            const { startsAt, endsAt } = buildStartsEndsForDate(dd, ev.timeRange);
            const eventUrl = `${BASE}${fac.path}?year=${yy}&month=${mm}#${ev.day}`;
            const id = `${srcKey}:${fac.name}:${ev.title}:${dateKey}`;

            if (byId.has(id)) continue;
            const resolvedAddr = resolveEventAddress(source, fac.name, fac.address, point);
            byId.set(id, {
              id, source: srcKey, source_label: label,
              title: ev.title,
              starts_at: startsAt, ends_at: endsAt,
              venue_name: ev.venueExtra || fac.name,
              address: resolvedAddr || fac.address,
              url: eventUrl,
              lat: point.lat, lng: point.lng,
            });
          }
        } catch (e) {
          console.warn(`[${label}] ${fac.name} ${yy}/${mm} failed:`, e.message || e);
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createNobisukuSendaiCollector };
