/**
 * 古賀市(福岡)子育てカレンダーコレクター
 * https://www.city.koga.fukuoka.jp/calendar/?choice=こども
 *
 * ?choice=こども でプレフィルタ済み。3列テーブル(日付/タイトル/詳細)。
 * メタデータは ◎時間/◎場所 等でインライン。詳細ページ不要。~24 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, getMonthsForRange, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText } = require("../text-utils");

const SITE_BASE = "https://www.city.koga.fukuoka.jp";

/** カレンダーページからイベントを抽出 */
function parseCalendarPage(html, year, month) {
  const events = [];

  // <table class="font_mini"> を抽出
  const tableRe = /<table\s+class="font_mini"[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  while ((tableMatch = tableRe.exec(html)) !== null) {
    const table = tableMatch[1];

    // 各行を処理
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let currentDate = null; // rowspan で日付が省略される場合
    while ((rowMatch = rowRe.exec(table)) !== null) {
      const row = rowMatch[1];

      // ヘッダ行スキップ
      if (/<th\b/i.test(row)) continue;

      // セルを取得
      const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellRe.exec(row)) !== null) {
        cells.push(cellMatch[1]);
      }

      let titleCell, detailCell;
      if (cells.length >= 3) {
        // 日付セル + タイトルセル + 詳細セル
        const dateText = stripTags(cells[0]).trim();
        const dm = dateText.match(/(\d{1,2})月(\d{1,2})日/);
        if (dm) {
          const mo2 = Number(dm[1]);
          const d2 = Number(dm[2]);
          // 年を推定 (12月→1月は年越し)
          let y2 = year;
          if (month <= 2 && mo2 >= 11) y2 = year - 1;
          if (month >= 11 && mo2 <= 2) y2 = year + 1;
          currentDate = { y: y2, mo: mo2, d: d2 };
        }
        titleCell = cells[1];
        detailCell = cells[2];
      } else if (cells.length === 2 && currentDate) {
        // rowspan で日付省略 → 前の日付を継続
        titleCell = cells[0];
        detailCell = cells[1];
      } else {
        continue;
      }

      if (!currentDate) continue;

      // タイトル抽出 (div id="thumsbox..." 内の <strong>)
      const titleMatch = titleCell.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
      let title = titleMatch ? stripTags(titleMatch[1]).trim() : stripTags(titleCell).trim();
      // カテゴリバッジ残留テキストを除去
      title = title.replace(/\s+(?:こども|健康|イベント|その他)\s*$/g, "").trim();
      if (!title) continue;

      // 詳細セルからメタデータ抽出
      const detailText = stripTags(detailCell).replace(/\s+/g, " ");
      let venue = "";
      let timeRange = null;

      // ◎場所：xxx
      const venueMatch = detailText.match(/◎場所[：:]\s*([^◎]+)/);
      if (venueMatch) {
        venue = sanitizeVenueText(venueMatch[1].trim());
      }

      // ◎時間：xxx
      const timeMatch = detailText.match(/◎時間[：:]\s*([^◎]+)/);
      if (timeMatch) {
        timeRange = parseTimeRangeFromText(timeMatch[1]);
      }

      events.push({
        y: currentDate.y, mo: currentDate.mo, d: currentDate.d,
        title, venue, timeRange,
      });
    }
  }

  return events;
}

function createKogaKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKogaKosodateEvents(maxDays) {
    const months = getMonthsForRange(maxDays);

    const allEvents = [];
    for (const ym of months) {
      const ymStr = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      const url = `${SITE_BASE}/calendar/?ym=${ymStr}&choice=%E3%81%93%E3%81%A9%E3%82%82`;
      try {
        const html = await fetchText(url);
        if (html) allEvents.push(...parseCalendarPage(html, ym.year, ym.month));
      } catch (e) {
        console.warn(`[${label}] calendar ${ymStr} failed:`, e.message || e);
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    const byId = new Map();
    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const candidates = [];
      if (ev.venue) candidates.push(`福岡県古賀市 ${ev.venue}`);
      candidates.push("福岡県古賀市");

      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, ev.venue, point, `福岡県古賀市 ${ev.venue}`);
      const address = resolveEventAddress(source, ev.venue, `福岡県古賀市`, point);

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );

      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: ev.venue,
        address: address || "福岡県古賀市",
        url: `${SITE_BASE}/calendar/?date=${dateKey.substring(0, 6)}&choice=%E3%81%93%E3%81%A9%E3%82%82`,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKogaKosodateCollector };
