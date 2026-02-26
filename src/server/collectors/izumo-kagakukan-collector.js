/**
 * 出雲科学館 コレクタ
 * 月別イベントカレンダー (静的HTML) + URL埋め込み日付
 * 島根県出雲市 ~30-50件/月
 */
const { fetchText } = require("../fetch-utils");

const BASE_URL = "https://www.izumo.ed.jp/kagaku";
const EVENT_URL = (y, m) => `${BASE_URL}/event/${y}/${String(m).padStart(2, "0")}/`;

function createIzumoKagakukanCollector({ source }, { resolveEventPoint }) {
  return async function collectIzumoKagakukanEvents(maxDays) {
    const events = [];
    const seen = new Set();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cutoff = new Date(now.getTime() + (maxDays || 30) * 86400000);

    // 今月+来月を取得
    const months = [];
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 2; i++) {
      months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
      d.setMonth(d.getMonth() + 1);
    }

    for (const { y, m } of months) {
      let html;
      try {
        html = await fetchText(EVENT_URL(y, m), 12000);
      } catch (e) {
        console.error(`[${source.label}] ${y}/${m} fetch error:`, e.message);
        continue;
      }

      // eventList ブロックを分割 (各カレンダー日)
      const blocks = html.split(/<article class="block">/i).slice(1);

      for (const block of blocks) {
        const end = block.indexOf("</article>");
        const content = end > 0 ? block.slice(0, end) : block;

        // 休館日をスキップ
        if (/休館日/.test(content)) continue;

        // リンクと日付抽出
        const linkMatch = content.match(/<a\s+href="([^"]+)">/i);
        if (!linkMatch) continue;
        const url = linkMatch[1];

        // タイトル (タグ除去)
        const text = content.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        // badge部分 (整理券/自由出入/事前応募/自由参加/観覧無料) を除去してタイトルに
        const title = text.replace(/^(整理券|自由出入|事前応募|自由参加|観覧無料)\s*/, "").trim();
        if (!title) continue;

        // URLから日付抽出: /20260301.html or /20260301-1.html
        const dateMatch = url.match(/\/(\d{4})(\d{2})(\d{2})(?:[-.])/);
        if (!dateMatch) continue; // 月単位のURL (202603-1.html) はスキップ

        const evYear = Number(dateMatch[1]);
        const evMonth = Number(dateMatch[2]);
        const evDay = Number(dateMatch[3]);
        if (evMonth < 1 || evMonth > 12 || evDay < 1 || evDay > 31) continue;

        const evDate = new Date(evYear, evMonth - 1, evDay);
        if (evDate < today || evDate > cutoff) continue;

        const dateStr = `${evYear}-${String(evMonth).padStart(2, "0")}-${String(evDay).padStart(2, "0")}`;
        const absUrl = url.startsWith("http") ? url : `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
        const id = `${source.key}:${dateStr}:${title}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const point = resolveEventPoint(
          { source: source.key, venue_name: source.label, address: "" },
          source.center
        );

        events.push({
          id,
          source: source.key,
          title,
          starts_at: `${dateStr}T00:00:00+09:00`,
          ends_at: null,
          venue_name: source.label,
          address: "島根県出雲市今市町1900-2",
          point,
          url: absUrl,
        });
      }
    }

    return events;
  };
}

module.exports = { createIzumoKagakukanCollector };
