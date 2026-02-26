/**
 * オーテピア (高知みらい科学館 + 図書館) コレクタ
 * CGI event-list.cgi ページから日付・タイトルを直接パース
 * 高知県高知市 ~10-20件/月
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");

const SECTIONS = [
  { path: "science", label: "高知みらい科学館" },
  { path: "library", label: "高知県立図書館" },
];

const CHILD_KW = /子ども|こども|親子|キッズ|ベビー|赤ちゃん|幼児|おはなし|読み聞かせ|映画|サイエンス|科学|ロボット|プラネタリウム|工作|実験|教室|ICT|ロケット|星/;

function createOtepiaCollector({ source }, { resolveEventPoint }) {
  return async function collectOtepiaEvents(maxDays) {
    const events = [];
    const seen = new Set();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cutoff = new Date(now.getTime() + (maxDays || 30) * 86400000);

    for (const section of SECTIONS) {
      // 2ページ分取得
      let allItems = [];
      for (let idx = 1; idx <= 2; idx++) {
        try {
          const url = `https://otepia.kochi.jp/${section.path}/event-list.cgi?idx=${idx}&gCd=`;
          const html = await fetchText(url, 12000);
          const items = html.split(/<li class="column">/i).slice(1);
          allItems = allItems.concat(items);
        } catch (e) {
          if (idx === 1) console.error(`[${source.label}] ${section.label} fetch error:`, e.message);
          break;
        }
      }

      const items = allItems;

      for (const item of items) {
        const endIdx = item.indexOf("</li>");
        const block = endIdx > 0 ? item.slice(0, endIdx) : item;

        // 日付
        const dateMatch = block.match(/<p class="day">(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (!dateMatch) continue;
        const y = Number(dateMatch[1]);
        const m = Number(dateMatch[2]);
        const d = Number(dateMatch[3]);
        if (m < 1 || m > 12 || d < 1 || d > 31) continue;

        const evDate = new Date(y, m - 1, d);
        if (evDate < today || evDate > cutoff) continue;

        // タイトル (2番目の <p> タグ)
        const titleMatch = block.match(/<p class="day">[^<]*<\/p>\s*<p>([^<]+)<\/p>/);
        const rawTitle = titleMatch ? titleMatch[1].trim() : "";
        if (!rawTitle) continue;

        // 終了イベント除外
        if (/おわりました/.test(rawTitle)) continue;

        // 科学館は全て子ども向け、図書館はキーワードフィルタ
        if (section.path === "library" && !CHILD_KW.test(rawTitle)) continue;

        const title = rawTitle;

        // リンク
        const linkMatch = block.match(/href="\.\/event\.cgi\?id=([^"]+)"/);
        const eventId = linkMatch ? linkMatch[1] : "";
        const url = eventId
          ? `https://otepia.kochi.jp/${section.path}/event.cgi?id=${eventId}`
          : `https://otepia.kochi.jp/${section.path}/event-list.cgi`;

        const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const id = `${source.key}:${eventId || title}:${dateStr}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const point = resolveEventPoint(
          { source: source.key, venue_name: section.label, address: "" },
          source.center
        );

        events.push({
          id,
          source: source.key,
          title: `${title}`,
          starts_at: `${dateStr}T00:00:00+09:00`,
          ends_at: null,
          venue_name: section.label,
          address: "高知県高知市追手筋2-1-1",
          point,
          url,
        });
      }
    }

    return events;
  };
}

module.exports = { createOtepiaCollector };
