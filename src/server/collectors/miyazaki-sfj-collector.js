/**
 * 宮崎市児童館・児童センター イベントコレクター
 * https://www.miyazakicity-sfj.jp/event_calendar/
 *
 * 宮崎市社会福祉事業団が運営する9児童館/児童センター。
 * WordPressカレンダーテーブルから全イベントを取得。~80-115 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE_URL = "https://www.miyazakicity-sfj.jp/event_calendar/";

const FACILITY_MAP = {
  chi_kibana: { name: "木花児童センター", address: "宮崎県宮崎市大字熊野635番地", lat: 31.8714, lng: 131.4303 },
  chi_sakaemachi: { name: "栄町児童館", address: "宮崎県宮崎市栄町12番地", lat: 31.9123, lng: 131.4252 },
  chi_heiwagaoka: { name: "平和が丘児童センター", address: "宮崎県宮崎市池内町陳ノ平594番地5", lat: 31.9313, lng: 131.4474 },
  chi_kuraoka: { name: "倉岡児童館", address: "宮崎県宮崎市大字糸原419番地20", lat: 31.9402, lng: 131.3621 },
  chi_ootukadai: { name: "大塚台児童センター", address: "宮崎県宮崎市大塚台西3丁目22番地3", lat: 31.9115, lng: 131.3977 },
  chi_oosima: { name: "大島児童館", address: "宮崎県宮崎市大島町四反田668番地2", lat: 31.9357, lng: 131.4466 },
  chi_nishihara: { name: "西原児童センター", address: "宮崎県宮崎市大字恒久5124番地", lat: 31.8908, lng: 131.4266 },
  chi_aoki: { name: "檍児童センター", address: "宮崎県宮崎市吉村町平塚甲1797番地", lat: 31.9277, lng: 131.4453 },
  chi_ootuka: { name: "大塚児童センター", address: "宮崎県宮崎市大塚町八所3765番地1", lat: 31.9189, lng: 131.3845 },
  chi_kirishima: { name: "霧島児童館", address: "宮崎県宮崎市船塚1丁目81番地", lat: 31.9263, lng: 131.4176 },
  chi_tsunehisa: { name: "恒久児童館", address: "宮崎県宮崎市恒久2丁目16番地4", lat: 31.8850, lng: 131.4222 },
  chi_hongo: { name: "本郷児童館", address: "宮崎県宮崎市大字本郷北方4029番地6", lat: 31.8947, lng: 131.4016 },
};

/** カレンダーHTMLからイベントを抽出 */
function parseCalendar(html) {
  const events = [];

  // 年月抽出: <span class="thisYm">2026年3月</span>
  const ymM = html.match(/<span\s+class="thisYm">(\d{4})年(\d{1,2})月<\/span>/);
  if (!ymM) return events;
  const year = Number(ymM[1]);
  const month = Number(ymM[2]);

  // 各<td>セルからイベントを抽出
  // セルには日付divとイベントulが含まれる
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let cm;
  while ((cm = cellRe.exec(html)) !== null) {
    const cell = cm[1];
    // 日付抽出: <div class='dspDate eventTableCell-sm smDate'>3月3日（火曜日）</div>
    const dateM = cell.match(/eventTableCell-sm\s+smDate'>(\d{1,2})月(\d{1,2})日/);
    if (!dateM) continue;
    const cellMonth = Number(dateM[1]);
    const cellDay = Number(dateM[2]);
    // 前月/翌月のセルはスキップ
    if (cellMonth !== month) continue;

    // イベント<li>抽出
    const liRe = /<li\s+class='[^']*areaSelection\s+[^']*'[^>]*>\s*<span\s+class='childhouseIcon'[^>]*>[^<]*<\/span>\s*<a\s+href='([^']+)'[^>]*>([^<]+)<\/a>\s*<\/li>/gi;
    let lm;
    while ((lm = liRe.exec(cell)) !== null) {
      const slug = lm[1];
      const titleWithTime = lm[2].trim();

      // 施設解決
      const fac = FACILITY_MAP[slug];
      if (!fac) continue;

      // タイトルから時間抽出
      let title = titleWithTime;
      let timeRange = null;
      // パターン: "タイトル10:30～" or "10:30～タイトル"
      const timeM = titleWithTime.match(/(\d{1,2}):(\d{2})\s*[～~]/);
      if (timeM) {
        timeRange = { startHour: Number(timeM[1]), startMinute: Number(timeM[2]) };
        title = titleWithTime.replace(/\d{1,2}:\d{2}\s*[～~]\s*/, "").trim();
      }
      if (!title) title = titleWithTime;

      events.push({
        day: cellDay, title, timeRange,
        facilitySlug: slug,
        venueName: fac.name,
        address: fac.address,
        lat: fac.lat, lng: fac.lng,
      });
    }
  }
  return events;
}

function createMiyazakiSfjCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectMiyazakiSfjEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    const byId = new Map();

    // 今月+来月+再来月
    for (let i = 0; i < 3; i++) {
      let mm = mo + i;
      let yy = y;
      if (mm > 12) { mm -= 12; yy++; }

      try {
        const url = `${BASE_URL}?ym=${yy}-${String(mm).padStart(2, "0")}`;
        const html = await fetchText(url);
        if (!html) continue;

        const events = parseCalendar(html);
        for (const ev of events) {
          const dd = { y: yy, mo: mm, d: ev.day };
          if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

          const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
          const { startsAt, endsAt } = buildStartsEndsForDate(dd, ev.timeRange);
          const eventUrl = `${BASE_URL}?ym=${yy}-${String(mm).padStart(2, "0")}`;
          const id = `${srcKey}:${ev.facilitySlug}:${ev.title}:${dateKey}`;

          if (byId.has(id)) continue;
          const point = { lat: ev.lat, lng: ev.lng };
          const resolvedAddr = resolveEventAddress(source, ev.venueName, ev.address, point);
          byId.set(id, {
            id, source: srcKey, source_label: label,
            title: ev.title,
            starts_at: startsAt, ends_at: endsAt,
            venue_name: ev.venueName,
            address: resolvedAddr || ev.address,
            url: eventUrl,
            lat: point.lat, lng: point.lng,
          });
        }
      } catch (e) {
        console.warn(`[${label}] ${yy}/${mm} failed:`, e.message || e);
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createMiyazakiSfjCollector };
