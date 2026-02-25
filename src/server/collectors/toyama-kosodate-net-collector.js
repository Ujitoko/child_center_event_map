/**
 * 富山県 子育てネッ!とやま イベントコレクター
 * https://www.pref.toyama.jp/3009/kurashi/kyouiku/kosodate/hp/tsudou/event/event.html
 *
 * 県営子育てポータルの月間イベント一覧ページ(静的HTML, 1ページのみ)。
 * <h2>施設名</h2> → <li>イベント名<br>【とき】日付</li> の構造。
 * 施設住所はKNOWN_FACILITIESでマッピング。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText } = require("../text-utils");

const PAGE_URL = "https://www.pref.toyama.jp/3009/kurashi/kyouiku/kosodate/hp/tsudou/event/event.html";

const KNOWN_FACILITIES = {
  "県民公園太閤山ランド": { addr: "富山県射水市黒河4774-6", lat: 36.7341, lng: 137.0230 },
  "こどもみらい館": { addr: "富山県射水市黒河 県民公園太閤山ランド内", lat: 36.7341, lng: 137.0230 },
  "富山市科学博物館": { addr: "富山県富山市西中野1-8-31", lat: 36.6856, lng: 137.2031 },
  "富山市ファミリーパーク": { addr: "富山県富山市古沢254", lat: 36.7019, lng: 137.1566 },
  "ねいの里": { addr: "富山県富山市婦中町吉住1-1", lat: 36.6569, lng: 137.1262 },
  "高志の国文学館": { addr: "富山県富山市舟橋南町2-22", lat: 36.6950, lng: 137.2146 },
  "富山県美術館": { addr: "富山県富山市木場町3-20", lat: 36.7059, lng: 137.2147 },
  "富山県映像センター": { addr: "富山県富山市舟橋北町7-1", lat: 36.6960, lng: 137.2130 },
  "富山県埋蔵文化財センター": { addr: "富山県富山市茶屋町206-3", lat: 36.6571, lng: 137.1630 },
  "射水市大島絵本館": { addr: "富山県射水市鳥取50", lat: 36.7402, lng: 137.0681 },
  "吉田科学館": { addr: "富山県黒部市吉田574-1", lat: 36.8678, lng: 137.4361 },
  "海王丸パーク": { addr: "富山県射水市海王町8", lat: 36.7735, lng: 137.0730 },
  "立山青少年自然の家": { addr: "富山県中新川郡立山町芦峅寺字前谷1", lat: 36.5758, lng: 137.3286 },
  "砺波青少年自然の家": { addr: "富山県砺波市徳万字赤坂6-3", lat: 36.6388, lng: 136.9623 },
  "呉羽青少年自然の家": { addr: "富山県富山市吉作4044-1", lat: 36.6883, lng: 137.1656 },
  "頼成の森": { addr: "富山県砺波市頼成156", lat: 36.6513, lng: 136.9834 },
};

/**
 * ページHTMLからイベントを抽出
 * タイトルから年月を取得: <title>...イベント情報 2026年2月</title>
 */
function parseEventsPage(html) {
  const events = [];

  // Extract year and month from page title
  const titleM = html.match(/(\d{4})年(\d{1,2})月/);
  if (!titleM) return events;
  const pageYear = Number(titleM[1]);
  const pageMonth = Number(titleM[2]);

  // Split HTML by <h2> to get venue sections
  const sections = html.split(/<h2>/);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];

    // Extract venue name from the text before </h2>
    const h2End = section.indexOf("</h2>");
    if (h2End < 0) continue;
    const h2Content = section.substring(0, h2End);
    let venueName = stripTags(h2Content).replace(/\s+/g, "").trim();
    if (!venueName) continue;

    // Extract <li> items
    const liRe = /<li>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = liRe.exec(section)) !== null) {
      const liContent = stripTags(m[1]).trim();

      // Split by 【とき】
      const tokiIdx = liContent.indexOf("【とき】");
      if (tokiIdx < 0) continue;

      const title = liContent.substring(0, tokiIdx).replace(/\s+/g, " ").trim();
      const dateText = liContent.substring(tokiIdx + 4).trim();
      if (!title || !dateText) continue;

      // Skip ongoing events starting with ～ (no specific start date)
      if (dateText.startsWith("～")) continue;

      // Parse dates: "2月15日", "2月7日(土)・2月8日(日)", "3月7日(土)"
      const dateRe = /(\d{1,2})月(\d{1,2})日/g;
      let dm;
      while ((dm = dateRe.exec(dateText)) !== null) {
        const mo = Number(dm[1]);
        const d = Number(dm[2]);
        // Infer year: if month is less than page month - 2, it's next year
        let y = pageYear;
        if (mo < pageMonth - 2) y = pageYear + 1;

        events.push({ title, venueName, y, mo, d });
      }
    }
  }

  return events;
}

function createToyamaKosodateNetCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectToyamaKosodateNetEvents(maxDays) {
    let html;
    try {
      html = await fetchText(PAGE_URL);
    } catch (e) {
      console.warn(`[${label}] fetch failed:`, e.message || e);
      return [];
    }
    if (!html) return [];

    const parsed = parseEventsPage(html);
    if (parsed.length === 0) return [];

    const byId = new Map();

    for (const ev of parsed) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.venueName}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const venue = sanitizeVenueText(ev.venueName);

      // Try KNOWN_FACILITIES first
      let point = null;
      let addr = "";
      for (const [name, info] of Object.entries(KNOWN_FACILITIES)) {
        if (ev.venueName.includes(name) || name.includes(ev.venueName)) {
          point = { lat: info.lat, lng: info.lng };
          addr = info.addr;
          break;
        }
      }

      // Geocoding fallback
      if (!point) {
        const candidates = [`富山県 ${venue}`];
        point = await geocodeForWard(candidates, source);
      }

      const addrFallback = addr || `富山県 ${venue}`;
      point = resolveEventPoint(source, venue, point, addrFallback);
      const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

      const dd = { y: ev.y, mo: ev.mo, d: ev.d };
      const { startsAt, endsAt } = buildStartsEndsForDate(dd, {
        startHour: null, startMinute: null, endHour: null, endMinute: null,
      });

      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue || "",
        address: resolvedAddress || addr || "",
        url: PAGE_URL,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
        time_unknown: true,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createToyamaKosodateNetCollector };
