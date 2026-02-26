/**
 * 東広島きんサイト (higashihiroshima-kinsai.site) コレクタ
 * Next.js SSR / Material-UI リストページから子育てイベントを収集
 * category=17 (ファミリー) でフィルタ済み、~40-61件/月
 */
const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE_URL = "https://higashihiroshima-kinsai.site";
const LIST_URL = `${BASE_URL}/list/?category=17`;
const MAX_PAGES = 5;

function createKinsaiCollector({ source }, { geocodeForWard, resolveEventPoint }) {
  return async function collectKinsaiEvents() {
    const now = new Date();
    const year = now.getFullYear();
    const events = [];
    const seen = new Set();

    for (let page = 0; page < MAX_PAGES; page++) {
      const url = page === 0 ? `${LIST_URL}` : `${LIST_URL}&page=${page}`;
      let html;
      try {
        html = await fetchText(url, 15000);
      } catch { break; }
      if (!html) break;

      // カード抽出: href="/events/..." で始まるリンクブロック
      const cardRe = /href="(\/events\/[A-Z0-9]+)"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/a>/gi;
      let m;
      let found = 0;
      while ((m = cardRe.exec(html)) !== null) {
        found++;
        const eventPath = m[1];
        const eventUrl = `${BASE_URL}${eventPath}`;
        const title = stripTags(m[0].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || "").trim();
        if (!title) continue;

        // カード全体テキスト
        const card = m[0];

        // 期間抽出
        const periodMatch = card.match(/期間<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i);
        const periodText = periodMatch ? stripTags(periodMatch[1]).trim() : "";

        // 日付パース: "2026年2月8日(日)〜2026年2月26日(木)" or "2026年2月26日(木)"
        const dateRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
        const dates = [];
        let dm;
        while ((dm = dateRe.exec(periodText)) !== null) {
          dates.push({ y: Number(dm[1]), mo: Number(dm[2]), d: Number(dm[3]) });
        }
        if (dates.length === 0) continue;

        const startDate = dates[0];
        const endDate = dates.length > 1 ? dates[dates.length - 1] : startDate;

        // 場所抽出: 住所 + 施設名
        let address = "";
        let venueName = "";
        // 住所は SVG アイコンの後に続くテキスト
        const addrMatch = card.match(/<\/svg>([\s\S]*?)<\/div>/i);
        if (addrMatch) {
          address = stripTags(addrMatch[1]).trim();
        }
        // 施設名は css-1fhgjcy クラスの div
        const venueMatch = card.match(/class="MuiBox-root css-1fhgjcy">([\s\S]*?)<\/div>/i);
        if (venueMatch) {
          venueName = stripTags(venueMatch[1]).trim();
        }

        // 日付範囲を個別イベントとして生成 (ただし14日以内のみ展開)
        const start = new Date(startDate.y, startDate.mo - 1, startDate.d);
        const end = new Date(endDate.y, endDate.mo - 1, endDate.d);
        const diffDays = Math.round((end - start) / 86400000);

        const datesToEmit = [];
        if (diffDays <= 14 && diffDays > 0) {
          // 範囲展開
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            datesToEmit.push(new Date(d));
          }
        } else {
          // 単日 or 長期 → startDate のみ
          datesToEmit.push(start);
        }

        for (const dt of datesToEmit) {
          const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
          const id = `${source.key}:${eventPath}:${title}:${dateStr}`;
          if (seen.has(id)) continue;
          seen.add(id);

          let point = null;
          if (address) {
            const geo = await geocodeForWard(address, source.label, source.center);
            if (geo) point = geo;
          }
          if (!point && venueName) {
            const geo = await geocodeForWard(venueName, source.label, source.center);
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
            url: eventUrl,
          });
        }
      }

      // ページにカードがなければ終了
      if (found === 0) break;
    }

    return events;
  };
}

module.exports = { createKinsaiCollector };
