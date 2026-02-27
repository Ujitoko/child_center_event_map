/**
 * 志免町 カレンダーコレクター
 * https://www.town.shime.lg.jp/calendar/index.php
 *
 * PHP カレンダーの「子ども」カテゴリ (s_d1[]=2) をフィルタリング。
 * カレンダー一覧に日付・時間・会場がインラインで含まれるため、
 * 詳細ページフェッチは不要。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE = "https://www.town.shime.lg.jp";

const KNOWN_FACILITIES = {
  "志免町総合福祉施設シーメイト": "福岡県糟屋郡志免町大字志免451-1",
  "シーメイト": "福岡県糟屋郡志免町大字志免451-1",
  "子育て支援センター": "福岡県糟屋郡志免町大字志免451-1 シーメイト1F",
  "志免町役場": "福岡県糟屋郡志免町大字志免中央1-1-1",
};

function createShimeCalendarCollector({ source }, geoDeps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = geoDeps;

  /** カレンダーページからイベントを抽出 */
  function parseCalendarPage(html) {
    const events = [];

    // 年月: <h2>2026年3月</h2> inside calendar_detail_title
    const ymM = html.match(/<div[^>]*class="calendar_detail_title"[\s\S]*?<h2>(\d{4})年(\d{1,2})月/);
    const y = ymM ? parseInt(ymM[1], 10) : null;
    const mo = ymM ? parseInt(ymM[2], 10) : null;
    if (!y || !mo) return events;

    // 日ブロック: <dl class="calendar_day ...">
    const dayRe = /<dl class="calendar_day[^"]*">([\s\S]*?)<\/dl>/gi;
    let dm;
    while ((dm = dayRe.exec(html)) !== null) {
      const block = dm[1];

      // 日番号: <span class="t_day"><span>N</span>日</span>
      const dayM = block.match(/<span class="t_day"><span>(\d{1,2})<\/span>日<\/span>/);
      if (!dayM) continue;
      const d = parseInt(dayM[1], 10);

      // 各イベント: <div class="cal_event_box">
      const evRe = /<div class="cal_event_box">([\s\S]*?)<\/div>\s*(?=<div class="cal_event_box"|<\/dd>)/gi;
      let em;
      while ((em = evRe.exec(block)) !== null) {
        const evBlock = em[1];

        // タイトル + URL
        const linkM = evBlock.match(/<span class="article_title">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        if (!linkM) continue;
        const url = linkM[1].startsWith("http") ? linkM[1] : BASE + linkM[1];
        const title = stripTags(linkM[2]).trim();

        // 時間: <img alt="開催時間">....<dd>TIME</dd>
        let timeText = "";
        const timeM = evBlock.match(/alt="開催時間"[\s\S]*?<dd>([\s\S]*?)<\/dd>/);
        if (timeM) timeText = stripTags(timeM[1]).trim();

        // 会場: <img alt="開催場所">....<dd>VENUE</dd>
        let venue = "";
        const venueM = evBlock.match(/alt="開催場所"[\s\S]*?<dd>([\s\S]*?)<\/dd>/);
        if (venueM) venue = stripTags(venueM[1]).trim();

        events.push({ y, mo, d, url, title, timeText, venue });
      }
    }

    // 複数期間イベント
    const multiM = html.match(/<div[^>]*id="claendar_event_multi_period"[^>]*>([\s\S]*?)(?:<\/div>\s*<\/div>\s*<\/div>)/i);
    if (multiM) {
      const multiBlock = multiM[1];
      const mEvRe = /<div class="cal_event_box">([\s\S]*?)<\/div>\s*(?=<div class="cal_event_box"|$)/gi;
      let me;
      while ((me = mEvRe.exec(multiBlock)) !== null) {
        const evBlock = me[1];
        const linkM = evBlock.match(/<(?:span|div) class="article_title">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        if (!linkM) continue;
        const url = linkM[1].startsWith("http") ? linkM[1] : BASE + linkM[1];
        const title = stripTags(linkM[2]).trim();

        // 開催期間: YYYY年M月D日（DOW）からYYYY年M月D日（DOW）
        const periodM = evBlock.match(/alt="開催期間"[\s\S]*?<dd>([\s\S]*?)<\/dd>/);
        // 複数期間は当月1日をデフォルト日付として使用
        events.push({ y, mo, d: 1, url, title, timeText: "", venue: "", isMultiPeriod: true });
      }
    }

    return events;
  }

  return async function collectShimeCalendarEvents(days) {
    const results = [];
    const seen = new Set();
    const now = new Date();

    try {
      for (let offset = 0; offset <= 2; offset++) {
        const target = new Date(now);
        target.setMonth(target.getMonth() + offset);
        const ty = target.getFullYear();
        const tmo = target.getMonth() + 1;

        // 子どもカテゴリでフィルタ
        const calUrl = `${BASE}/calendar/index.php?dsp=1&y=${ty}&m=${tmo}&d=1&sch=1&s_d1[]=2`;
        let html;
        try { html = await fetchText(calUrl); } catch { continue; }
        if (!html) continue;

        const events = parseCalendarPage(html);

        for (const ev of events) {
          if (seen.has(ev.url + ev.y + ev.mo + ev.d)) continue;
          seen.add(ev.url + ev.y + ev.mo + ev.d);

          if (!inRangeJst(ev.y, ev.mo, ev.d, days)) continue;

          const timeRange = parseTimeRangeFromText(ev.timeText || "");
          const { startsAt, endsAt, timeUnknown } = buildStartsEndsForDate(
            { y: ev.y, mo: ev.mo, d: ev.d }, timeRange
          );
          const dateKey = startsAt.slice(0, 10);

          const venueName = ev.venue || "";
          let address = KNOWN_FACILITIES[venueName] || "";
          if (!address) {
            address = await resolveEventAddress(source.key, venueName, null) || "";
          }

          let point = null;
          if (address) {
            point = await resolveEventPoint(source.key, venueName, address, null);
            if (!point) {
              const geo = await geocodeForWard(address, source);
              point = geo || null;
            }
          }

          results.push({
            id: `${source.key}:${ev.url}:${ev.title}:${dateKey}`,
            source: source.key,
            title: ev.title,
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
    } catch (e) {
      console.error(`[${source.key}] error:`, e.message);
    }
    console.log(`[${source.key}] collected ${results.length} events`);
    return results;
  };
}

module.exports = { createShimeCalendarCollector };
