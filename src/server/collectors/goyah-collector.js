/**
 * ごーやーどっとネット (goyah.net) コレクタ
 * WP REST API (event_type=127 子ども向け) + HTMLデタイル取得
 * 沖縄県全域のイベント ~15-20件/月
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");

const API_BASE = "https://goyah.net/wp-json/wp/v2/posts";
const PER_PAGE = 50;
// event_type=127: 子ども向け
const EVENT_TYPE_CHILD = 127;

function createGoyahCollector({ source }, { geocodeForWard, resolveEventPoint }) {
  return async function collectGoyahEvents() {
    const events = [];
    const seen = new Set();
    const now = new Date();
    const year = now.getFullYear();

    // WP REST API でリスト取得
    let posts = [];
    try {
      const url = `${API_BASE}?event_type=${EVENT_TYPE_CHILD}&per_page=${PER_PAGE}&_fields=id,title,link,content`;
      const json = await fetchText(url, 20000);
      posts = JSON.parse(json);
    } catch (e) {
      console.error(`[${source.label}] API error:`, e.message);
      return events;
    }
    if (!Array.isArray(posts)) return events;

    // 各投稿のデタイルページから日付・場所を取得
    for (const post of posts) {
      const title = stripTags(post.title?.rendered || "").trim();
      if (!title) continue;
      const link = post.link;

      // デタイルページfetch
      let detailHtml;
      try {
        detailHtml = await fetchText(link, 12000);
      } catch { continue; }
      if (!detailHtml) continue;

      // 開催日: <strong>開催日:</strong> YY-MM-DD ～ YY-MM-DD
      const dateMatch = detailHtml.match(/<strong>開催日:<\/strong>\s*([\s\S]*?)<\/p>/i);
      const dateText = dateMatch ? stripTags(dateMatch[1]).trim() : "";

      // YY-MM-DD パターン
      const yyDateRe = /(\d{2})-(\d{2})-(\d{2})/g;
      const dates = [];
      let dm;
      while ((dm = yyDateRe.exec(dateText)) !== null) {
        const y = 2000 + Number(dm[1]);
        const mo = Number(dm[2]);
        const d = Number(dm[3]);
        if (y >= year - 1 && y <= year + 1 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          dates.push({ y, mo, d });
        }
      }

      // フォールバック: コンテンツ内の YYYY年M月D日 パターン
      if (dates.length === 0) {
        const content = post.content?.rendered || "";
        const fullDateRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
        while ((dm = fullDateRe.exec(content)) !== null) {
          const y = Number(dm[1]);
          const mo = Number(dm[2]);
          const d = Number(dm[3]);
          if (y >= year - 1 && y <= year + 1 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            dates.push({ y, mo, d });
            break; // 最初の日付のみ
          }
        }
      }

      if (dates.length === 0) continue;

      // 開催地: <strong>開催地:</strong> 会場名（住所）
      const placeMatch = detailHtml.match(/<strong>開催地:<\/strong>\s*([\s\S]*?)<\/p>/i);
      const placeText = placeMatch ? stripTags(placeMatch[1]).trim() : "";
      let venueName = "";
      let address = "";
      // "会場名（沖縄県...）" パターン
      const placeAddrMatch = placeText.match(/^(.+?)[（(](沖縄県[^）)]+)[）)]/);
      if (placeAddrMatch) {
        venueName = placeAddrMatch[1].trim();
        address = placeAddrMatch[2].trim();
      } else if (placeText) {
        venueName = placeText;
      }

      // 日付から期間展開 (開始～終了、14日以内)
      const startDate = dates[0];
      const endDate = dates.length > 1 ? dates[dates.length - 1] : startDate;
      const start = new Date(startDate.y, startDate.mo - 1, startDate.d);
      const end = new Date(endDate.y, endDate.mo - 1, endDate.d);
      const diffDays = Math.round((end - start) / 86400000);

      const datesToEmit = [];
      if (diffDays > 0 && diffDays <= 14) {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          datesToEmit.push(new Date(d));
        }
      } else {
        datesToEmit.push(start);
      }

      for (const dt of datesToEmit) {
        const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        const id = `${source.key}:${post.id}:${title}:${dateStr}`;
        if (seen.has(id)) continue;
        seen.add(id);

        let point = null;
        if (address) {
          const geo = await geocodeForWard(address, source.label, source.center);
          if (geo) point = geo;
        }
        if (!point && venueName) {
          const geo = await geocodeForWard(venueName + " 沖縄", source.label, source.center);
          if (geo) point = geo;
        }
        point = resolveEventPoint({ source: source.key, venue_name: venueName, address }, point);

        events.push({
          id,
          source: source.key,
          title,
          starts_at: `${dateStr}T00:00:00+09:00`,
          ends_at: null,
          venue_name: venueName || null,
          address: address || null,
          point,
          url: link,
        });
      }
    }

    return events;
  };
}

module.exports = { createGoyahCollector };
