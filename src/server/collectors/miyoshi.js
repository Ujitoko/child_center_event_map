const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|おはなし|絵本|紙芝居|リトミック|ママ|パパ|マタニティ|ひろば|誕生|手形|ハイハイ|なかよし|ねんね|よちよち|てくてく|ぐんぐん|わんぱく|製作|工作|測定|相談|読み聞かせ|ふれあい|遊び/;

/**
 * 三芳町 WCVカレンダーHTMLからイベントを抽出
 *
 * HTML構造:
 * <table class="wcv_sys_cal_caltype">
 *   <td><p class="wcv_sys_cal_date">D</p>
 *     <p><img alt="category"/> <span>イベント名【施設名】</span> <span>[HH時MM分～HH時MM分]</span></p>
 *   </td>
 */
function parseWcvCalendarHtml(html, year, month) {
  const events = [];

  // <td>要素を順に処理
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
  let tdm;
  while ((tdm = tdRe.exec(html)) !== null) {
    const tdContent = tdm[1];

    // 日付取得
    const dateMatch = tdContent.match(/<p\s+class="wcv_sys_cal_date">(\d{1,2})<\/p>/);
    if (!dateMatch) continue;
    const day = Number(dateMatch[1]);

    // イベントの<p>タグを抽出（日付pタグ以降）
    const eventPRe = /<p>\s*(?:<img[^>]*alt="([^"]*)"[^>]*\/?>)?\s*(?:<span[^>]*>([^<]*)<\/span>)?\s*(?:<span[^>]*>\[([^\]]*)\]<\/span>)?\s*<\/p>/g;
    let evm;
    while ((evm = eventPRe.exec(tdContent)) !== null) {
      const rawText = (evm[2] || "").trim();
      const timeText = (evm[3] || "").trim();

      if (!rawText) continue;

      // イベント名と施設名を分離: "イベント名【施設名】"
      let title = rawText;
      let venue = "";
      const bracketMatch = rawText.match(/^(.+?)【([^】]+)】$/);
      if (bracketMatch) {
        title = bracketMatch[1].trim();
        venue = bracketMatch[2].trim();
      }
      if (!title || title.length < 2) continue;

      // 時刻パース: "HH時MM分～HH時MM分"
      let timeRange = null;
      if (timeText) {
        const tm = timeText.match(/(\d{1,2})時(\d{2})分\s*[～〜~-]\s*(\d{1,2})時(\d{2})分/);
        if (tm) {
          timeRange = {
            startHour: Number(tm[1]), startMin: Number(tm[2]),
            endHour: Number(tm[3]), endMin: Number(tm[4]),
          };
        }
      }

      events.push({ y: year, mo: month, d: day, title, venue, timeRange });
    }
  }

  return events;
}

// WCVカレンダーID
const CALENDAR_IDS = {
  kosodate: "4txpDe",  // 子育て支援センター
  jidokan: "VT6fUD",   // 児童館
};

function createCollectMiyoshiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectMiyoshiEvents(maxDays) {
    const source = deps.source || {
      key: "miyoshi_saitama", label: "三芳町",
      baseUrl: "https://www.town.saitama-miyoshi.lg.jp",
      center: { lat: 35.8278, lng: 139.5306 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    const now = new Date();
    const allEvents = [];

    // 当月と来月の2ヶ月分を取得
    for (let offset = 0; offset < 2; offset++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + offset);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const ym = `${year}${String(month).padStart(2, "0")}`;

      for (const [calKey, calId] of Object.entries(CALENDAR_IDS)) {
        const calUrl = `${baseUrl}/_wcv/calendar/viewcal/${calId}/${ym}.html`;
        try {
          const html = await fetchText(calUrl);
          if (!html || html.length < 100) continue;
          const events = parseWcvCalendarHtml(html, year, month);
          for (const ev of events) {
            ev.calKey = calKey;
          }
          allEvents.push(...events);
        } catch (e) {
          console.warn(`[${label}] calendar fetch failed (${calKey} ${ym}):`, e.message || e);
        }
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 子育てフィルタ + 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!CHILD_RE.test(ev.title)) continue;
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.title}:${dateKey}:${ev.venue}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = ev.venue || "三芳町子育て支援センター";
      let geoCandidates = [`埼玉県入間郡三芳町 ${venueName}`, `埼玉県三芳町 ${venueName}`];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `${label} ${venueName}`);
      const address = resolveEventAddress(source, venueName, null, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:wcv:${ev.title}:${ev.dateKey}:${venueName}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: `${baseUrl}/_wcv/calendar/viewcal/${CALENDAR_IDS[ev.calKey] || CALENDAR_IDS.kosodate}/${ev.dateKey.substring(0, 6)}.html`,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (WCV calendar)`);
    return results;
  };
}

module.exports = { createCollectMiyoshiEvents };
