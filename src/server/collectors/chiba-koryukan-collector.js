const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  getMonthsForRange,
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { CHIBA_CITY_SOURCE } = require("../../config/wards");

const VENUE_NAME = "千葉市子ども交流館";
const VENUE_ADDRESS = "千葉市中央区中央4-5-1";
const BASE_URL = "https://kodomo-koryukan.jp";

// 休館・非イベント行を除外
const SKIP_RE = /休館日|講座・イベントはありませんが開館/;

/**
 * 月別カレンダーページからイベントを抽出
 */
function parseCalendarPage(html, year, month) {
  const events = [];
  // 各行: <tr> <th class="date">N</th> <th>曜日</th> <td>...</td> </tr>
  const rowRe = /<tr[^>]*>\s*<th\s+class="date">(\d{1,2})<\/th>\s*<th[^>]*>[^<]*<\/th>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html)) !== null) {
    const day = Number(rm[1]);
    const cellHtml = rm[2];
    if (SKIP_RE.test(cellHtml)) continue;

    // セル内の各リンクをイベントとして抽出
    const linkRe = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(cellHtml)) !== null) {
      let title = stripTags(lm[2]).trim();
      if (!title || title.length < 3) continue;
      if (SKIP_RE.test(title)) continue;
      // 状態表示を除去: （満席・受付終了）など
      title = title.replace(/[（(]\s*(?:満席|受付終了|抽選結果発表中)[^）)]*[）)]/g, "").trim();
      title = title.replace(/[（(]\s*(?:事前申し込み|当日先着|当日参加)[^）)]*[）)]/g, "").trim();
      // 募集停止をスキップ
      if (/募集停止/.test(title)) continue;
      const url = lm[1].startsWith("http") ? lm[1] : `${BASE_URL}${lm[1]}`;
      events.push({ y: year, mo: month, d: day, title, url });
    }
  }
  return events;
}

function createCollectChibaKoryukanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const source = CHIBA_CITY_SOURCE;
  const srcKey = `ward_${source.key}`;

  return async function collectChibaKoryukanEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      const ym = String(year) + String(month).padStart(2, "0");
      const url = `${BASE_URL}/event/?month=${ym}`;
      try {
        const html = await fetchText(url);
        const evts = parseCalendarPage(html, year, month);
        rawEvents.push(...evts);
      } catch (e) {
        console.warn(`[千葉市子ども交流館] ${ym} fetch failed:`, e.message || e);
      }
    }

    // 重複除去
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }

    // ジオコーディング (固定住所なので1回)
    const geoCandidates = [`千葉県${VENUE_ADDRESS}`, `千葉県千葉市 ${VENUE_NAME}`];
    let point = await geocodeForWard(geoCandidates, source);
    point = resolveEventPoint(source, VENUE_NAME, point, VENUE_ADDRESS);
    const address = resolveEventAddress(source, VENUE_NAME, VENUE_ADDRESS, point);

    const byId = new Map();
    for (const ev of uniqueMap.values()) {
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, null
      );
      const id = `${srcKey}:koryukan:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: source.label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: VENUE_NAME,
        address: address || `千葉県${VENUE_ADDRESS}`,
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[千葉市子ども交流館] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectChibaKoryukanEvents };
