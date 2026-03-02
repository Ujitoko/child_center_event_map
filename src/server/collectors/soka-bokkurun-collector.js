/**
 * 草加市 ぼっくるん (soka-bokkurun.com) イベントコレクター
 *
 * WordPressカレンダーのHTMLからイベントリンク+タイトル+日付を抽出。
 * 詳細ページfetchは不要（カレンダー内のspan display:noneにURL+タイトルあり）。
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  getMonthsForRange,
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { SOKA_SOURCE } = require("../../config/wards");

const BASE_URL = "https://www.soka-bokkurun.com";

/**
 * カレンダーHTMLからイベントを抽出
 *
 * カレンダーのtdセル構造:
 *   <td><a href="/eventinfo/date/2026/03/02" title="イベント1, イベント2">2</a>
 *     <span style="display:none"><a href="/eventinfo/12345/">イベント1</a></span>
 *     <span style="display:none"><a href="/eventinfo/12346/">イベント2</a></span>
 *   </td>
 */
function parseBokkurunCalendar(html, year, month) {
  const events = [];
  const seen = new Set();

  // カレンダーテーブル内のtdセルを処理
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let tdM;
  while ((tdM = tdRe.exec(html)) !== null) {
    const cell = tdM[1];

    // 日付リンクから日を取得: <a href="/eventinfo/date/YYYY/MM/DD">D</a>
    const dateM = cell.match(
      /href="\/eventinfo\/date\/(\d{4})\/(\d{2})\/(\d{2})"/
    );
    if (!dateM) continue;
    const y = Number(dateM[1]);
    const mo = Number(dateM[2]);
    const d = Number(dateM[3]);

    // 各イベントリンクを抽出: <span ...><a href="/eventinfo/ID/">Title</a></span>
    const linkRe =
      /<span[^>]*>\s*<a\s+href="(\/eventinfo\/(\d+)\/)"[^>]*>([^<]+)<\/a>\s*<\/span>/gi;
    let linkM;
    while ((linkM = linkRe.exec(cell)) !== null) {
      const eventPath = linkM[1];
      const eventId = linkM[2];
      const title = stripTags(linkM[3]).trim();
      if (!title || title.length < 2) continue;

      // 同一イベント+同日の重複排除（複数回表示されることがある）
      const dedupKey = `${eventId}:${y}-${mo}-${d}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      events.push({
        y,
        mo,
        d,
        title,
        eventId,
        url: `${BASE_URL}${eventPath}`,
      });
    }
  }
  return events;
}

function createCollectSokaBokkurunEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const source = SOKA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectSokaBokkurunEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      const mm = String(month).padStart(2, "0");
      const url = `${BASE_URL}/eventinfo/date/${year}/${mm}/`;
      try {
        const html = await fetchText(url);
        const evts = parseBokkurunCalendar(html, year, month);
        rawEvents.push(...evts);
      } catch (e) {
        console.warn(
          `[${label}/ぼっくるん] ${year}/${mm} failed:`,
          e.message || e
        );
      }
    }

    // 範囲内フィルタ + 重複除去
    const byId = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:bokkurun:${ev.eventId}:${dateKey}`;
      if (byId.has(id)) continue;

      // ジオコーディング: 草加市全体のセンター座標をデフォルト使用
      // イベント詳細からは会場が取れないのでタイトルベースで推定
      const venueName = label;
      let point = null;
      point = resolveEventPoint(source, venueName, point, `草加市 ${ev.title}`);
      const address = resolveEventAddress(source, venueName, "草加市", point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        null
      );
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venueName,
        address: address || "",
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}/ぼっくるん] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectSokaBokkurunEvents };
