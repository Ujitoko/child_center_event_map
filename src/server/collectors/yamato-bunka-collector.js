/**
 * 大和市文化創造拠点シリウス プラザ(こども)カレンダー コレクター
 *
 * yamato-bunka.jp/plaza/calendar/YYYY/MM/ からこどもイベントを抽出。
 * シリウス屋内こども広場の全イベントが子ども向け（キーワードフィルタ不要）。
 * 既存 yamato.js (ehon_no_machi JSON) とは完全に別ソース・重複なし。
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const { normalizeJaDigits } = require("../text-utils");
const {
  getMonthsForRange,
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { YAMATO_SOURCE } = require("../../config/wards");

const FIXED_VENUE = "シリウス 屋内こども広場";
const FIXED_ADDRESS = "大和市大和南一丁目8番1号";

/**
 * プラザカレンダーHTMLからイベントを抽出
 *
 * テーブル行構造:
 *   <tr>
 *     <th>3日（火）</th>
 *     <td>10:00～11:00</td>
 *     <td>多目的室</td>
 *     <td><a href="https://yamato-bunka.jp/plaza/2026/013011.html">ベビトレヨガ</a></td>
 *     <td>500円</td>
 *     <td>屋内こども広場<br>電話.046-259-7592</td>
 *   </tr>
 */
function parsePlazaCalendar(html, year, month) {
  const events = [];
  const seen = new Set();

  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trM;
  while ((trM = trRe.exec(html)) !== null) {
    const row = trM[1];

    // 日付: <th>3日（火）</th> or <th class="sun">1日（日）</th>
    const dateM = row.match(/<th[^>]*>[\s\S]*?(\d{1,2})日/i);
    if (!dateM) continue;
    const d = Number(dateM[1]);
    if (d < 1 || d > 31) continue;

    // 時間: 「10時～11時30分」or「9時15分～10時45分」(Japanese format)
    const timeText = normalizeJaDigits(stripTags(row));
    const jaTimeM = timeText.match(
      /(\d{1,2})時(\d{1,2})?分?\s*[～〜~\-－]\s*(\d{1,2})時(\d{1,2})?分?/
    );
    let timeRange = null;
    if (jaTimeM) {
      timeRange = {
        startHour: Number(jaTimeM[1]),
        startMinute: Number(jaTimeM[2] || 0),
        endHour: Number(jaTimeM[3]),
        endMinute: Number(jaTimeM[4] || 0),
      };
    }

    // タイトル+URL: <a href="...">Title</a> を探す
    const linkRe = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let linkM;
    while ((linkM = linkRe.exec(row)) !== null) {
      const eventUrl = linkM[1].trim();
      let title = stripTags(linkM[2]).replace(/\s+/g, " ").trim();
      if (!title || title.length < 2) continue;
      // 「【満員御礼】」「【キャンセル待ち】」等のステータスプレフィックスを除去
      title = title.replace(/^【[^】]*】\s*/, "").trim();
      if (!title) continue;

      // 重複排除
      const dedupKey = `${year}-${month}-${d}:${title}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      events.push({
        y: year,
        mo: month,
        d,
        title,
        timeRange,
        url: eventUrl,
      });
    }
  }
  return events;
}

function createCollectYamatoBunkaEvents(deps) {
  const { resolveEventPoint, resolveEventAddress } = deps;
  const source = YAMATO_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectYamatoBunkaEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      const mm = String(month).padStart(2, "0");
      const url = `https://yamato-bunka.jp/plaza/calendar/${year}/${mm}/`;
      try {
        const html = await fetchText(url);
        const evts = parsePlazaCalendar(html, year, month);
        rawEvents.push(...evts);
      } catch (e) {
        console.warn(
          `[${label}/シリウス] ${year}/${mm} failed:`,
          e.message || e
        );
      }
    }

    // 範囲内フィルタ + 重複除去
    const byId = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:sirius:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const point = resolveEventPoint(
        source,
        FIXED_VENUE,
        null,
        `大和市 ${FIXED_VENUE}`
      );
      const address = resolveEventAddress(
        source,
        FIXED_VENUE,
        FIXED_ADDRESS,
        point
      );

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );

      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: FIXED_VENUE,
        address: address || FIXED_ADDRESS,
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}/シリウス] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectYamatoBunkaEvents };
