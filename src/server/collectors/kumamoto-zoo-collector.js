/**
 * 熊本市動植物園 (ezooko.jp) コレクタ
 * ASP.NET カレンダー + デタイルページから動物園イベントを収集
 * ~15-25件/月 (日替わり動物ガイド + 講習会)
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const { parseTimeRangeFromText } = require("../date-utils");

const CAL_BASE = "https://www.ezooko.jp/cal_copy/pub/default.aspx";
const DETAIL_BASE = "https://www.ezooko.jp/cal_copy/pub/detail.aspx";
const FACILITY_POINT = { lat: 32.7869, lng: 130.7476 };
const FACILITY_ADDRESS = "熊本市東区健軍5丁目14-2";
const FACILITY_NAME = "熊本市動植物園";

function createKumamotoZooCollector({ source }, { resolveEventPoint }) {
  return async function collectKumamotoZooEvents() {
    const now = new Date();
    const events = [];
    const seen = new Set();

    // 当月 + 来月
    const months = [];
    months.push({ y: now.getFullYear(), m: now.getMonth() + 1 });
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    months.push({ y: next.getFullYear(), m: next.getMonth() + 1 });

    for (const { y, m } of months) {
      const url = `${CAL_BASE}?c_id=4&sely=${y}&selm=${m}`;
      let html;
      try {
        html = await fetchText(url, 15000);
      } catch (e) {
        console.error(`[${source.label}] fetch error:`, e.message);
        continue;
      }
      if (!html) continue;

      // カレンダーテーブルからイベントリンクを抽出
      // <a href="...detail.aspx?c_id=4&id=8300&sely=2026&selm=3&seld=1" title="タイトル">
      const linkRe = /<a\s+href="([^"]*detail\.aspx\?[^"]*)"[^>]*title="([^"]*)"[^>]*>/gi;
      let lm;
      while ((lm = linkRe.exec(html)) !== null) {
        const href = lm[1];
        const title = lm[2].trim();

        // 休園日はスキップ
        if (title === "休園日") continue;

        // パラメータ抽出
        const idMatch = href.match(/id=(\d+)/);
        const dayMatch = href.match(/seld=(\d+)/);
        if (!idMatch || !dayMatch) continue;

        const eventId = idMatch[1];
        const day = Number(dayMatch[1]);
        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const id = `${source.key}:${eventId}:${title}:${dateStr}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const point = resolveEventPoint(
          { source: source.key, venue_name: FACILITY_NAME, address: FACILITY_ADDRESS },
          FACILITY_POINT
        );

        const fullUrl = href.startsWith("http") ? href : `https://www.ezooko.jp${href.startsWith("/") ? "" : "/cal_copy/pub/"}${href}`;

        events.push({
          id,
          source: source.key,
          title,
          starts_at: `${dateStr}T00:00:00+09:00`,
          ends_at: null,
          venue_name: FACILITY_NAME,
          address: FACILITY_ADDRESS,
          point,
          url: fullUrl,
        });
      }
    }

    return events;
  };
}

module.exports = { createKumamotoZooCollector };
