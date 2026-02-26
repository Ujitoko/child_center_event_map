/**
 * ごーやーどっとネット (goyah.net) コレクタ
 * イベント一覧ページから event-item を直接パース (子ども向けカテゴリフィルタ)
 * 沖縄県全域のイベント ~15-25件/月
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");

const LIST_URL = "https://goyah.net/okinawa_event/";
const CHILD_TYPES = /子ども向け|親子で参加|子育て|キッズ|ベビー|赤ちゃん|幼児|ファミリー/;

function createGoyahCollector({ source }, { resolveEventPoint }) {
  return async function collectGoyahEvents(maxDays) {
    const events = [];
    const seen = new Set();
    const now = new Date();
    const year = now.getFullYear();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cutoff = new Date(now.getTime() + (maxDays || 30) * 86400000);

    let html;
    try {
      html = await fetchText(LIST_URL, 15000);
    } catch (e) {
      console.error(`[${source.label}] fetch error:`, e.message);
      return events;
    }

    // event-item ブロックを分割
    const blocks = html.split(/<div class="event-item"/i).slice(1);

    for (const rawBlock of blocks) {
      const block = rawBlock;

      // 子ども向けカテゴリフィルタ (種類フィールド)
      const typeMatch = block.match(/種類:<\/strong>\s*([^<]+)/);
      const types = typeMatch ? typeMatch[1].trim() : "";
      if (!CHILD_TYPES.test(types)) continue;

      // タイトル
      const titleMatch = block.match(/<h3[^>]*><a[^>]*>([^<]+)<\/a>/);
      const title = titleMatch ? titleMatch[1].trim() : "";
      if (!title) continue;

      // リンク (archives URL)
      const linkMatch = block.match(/href="(https:\/\/goyah\.net\/okinawa_event\/archives\/\d+)"/);
      const link = linkMatch ? linkMatch[1] : LIST_URL;

      // 日付 (YY-MM-DD ～ YY-MM-DD or single YY-MM-DD)
      const dateMatch = block.match(/開催日:<\/strong>\s*([^<]+)/);
      const dateText = dateMatch ? dateMatch[1].trim() : "";
      const dates = [];
      const yyDateRe = /(\d{2})-(\d{2})-(\d{2})/g;
      let dm;
      while ((dm = yyDateRe.exec(dateText)) !== null) {
        const y = 2000 + Number(dm[1]);
        const mo = Number(dm[2]);
        const d = Number(dm[3]);
        if (y >= year - 1 && y <= year + 1 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          dates.push({ y, mo, d });
        }
      }
      if (dates.length === 0) continue;

      // エリア
      const areaMatch = block.match(/エリア:<\/strong>\s*([^<]+)/);
      const area = areaMatch ? areaMatch[1].trim() : "";

      // 日付展開
      const startDate = dates[0];
      const endDate = dates.length > 1 ? dates[dates.length - 1] : startDate;
      const start = new Date(startDate.y, startDate.mo - 1, startDate.d);
      const end = new Date(endDate.y, endDate.mo - 1, endDate.d);
      const diffDays = Math.round((end - start) / 86400000);

      const datesToEmit = [];
      if (diffDays >= 0 && diffDays <= 60) {
        const emitStart = start < today ? today : start;
        const emitEnd = end > cutoff ? cutoff : end;
        for (let d = new Date(emitStart); d <= emitEnd; d.setDate(d.getDate() + 1)) {
          datesToEmit.push(new Date(d));
        }
      } else {
        // 超長期: 開始日のみ
        datesToEmit.push(start);
      }

      for (const dt of datesToEmit) {
        const evDate = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        if (evDate < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) continue;
        if (evDate > cutoff) continue;

        const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        const postId = (linkMatch ? linkMatch[1].match(/\d+$/)[0] : title);
        const id = `${source.key}:${postId}:${dateStr}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const point = resolveEventPoint(
          { source: source.key, venue_name: area, address: "" },
          source.center
        );

        events.push({
          id,
          source: source.key,
          title,
          starts_at: `${dateStr}T00:00:00+09:00`,
          ends_at: null,
          venue_name: area || null,
          address: null,
          point,
          url: link,
        });
      }
    }

    return events;
  };
}

module.exports = { createGoyahCollector };
