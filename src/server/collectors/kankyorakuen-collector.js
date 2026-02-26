/**
 * 河川環境楽園 コレクタ (岐阜県各務原市)
 * 子ども向けイベントを「子どもと」タグページから収集
 * 日付は #posts-calendar 内の article class の YYYYMMDD 形式から取得
 * ~20-30件/月 (自然発見館 + オアシスパーク + アクア・トト)
 */
const { fetchText } = require("../fetch-utils");

const LIST_BASE = "https://kankyorakuen.jp/event/with/%E5%AD%90%E3%81%A9%E3%82%82%E3%81%A8/";
const FACILITY_POINT = { lat: 35.3782, lng: 136.8325 };
const FACILITY_ADDRESS = "岐阜県各務原市川島笠田町1564-1";
const FACILITY_NAME = "河川環境楽園";

function createKankyorakuenCollector({ source }, { resolveEventPoint }) {
  return async function collectKankyorakuenEvents(maxDays) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const cutoff = new Date(now.getTime() + (maxDays || 30) * 86400000);
    const cutoffStr = cutoff.toISOString().slice(0, 10).replace(/-/g, "");

    const events = [];
    const seen = new Set();

    let html;
    try {
      html = await fetchText(LIST_BASE, 15000);
    } catch (e) {
      console.error(`[${source.label}] fetch error:`, e.message);
      return [];
    }
    if (!html) return [];

    // Calendar section has article elements with date classes:
    // <article class="post YYYYMMDD YYYYMMDD ..." data-id="NNN">
    //   <a href="/event/facility/xxx/">Facility</a>
    //   <h2 class="post--ttl"><a href="URL" class="post--link">Title</a></h2>
    // </article>
    const calSection = html.split('id="posts-calendar"')[1];
    if (!calSection) return [];

    const articleRe = /<article\s+class="post\s+([\d\s]+)"\s+data-id="(\d+)">([\s\S]*?)<\/article>/gi;
    let am;
    while ((am = articleRe.exec(calSection)) !== null) {
      const dateClasses = am[1].trim();
      const dataId = am[2];
      const card = am[3];

      // Extract title and URL
      const linkMatch = card.match(/<a\s+href="([^"]+)"\s+class="post--link">([^<]+)<\/a>/);
      if (!linkMatch) continue;
      const url = linkMatch[1];
      const title = linkMatch[2].trim();

      // Skip Aqua Toto events (covered by separate aquatoto-collector)
      if (/aquatotto/i.test(url)) continue;

      // Extract facility
      const facilityMatch = card.match(/<a\s+href="\/event\/facility\/[^"]*">([^<]+)<\/a>/);
      const subfacility = facilityMatch ? facilityMatch[1].trim() : "";
      const venueName = subfacility ? `${FACILITY_NAME} ${subfacility}` : FACILITY_NAME;

      // Parse dates from class attribute (YYYYMMDD format)
      const dateNums = dateClasses.split(/\s+/);
      for (const ds of dateNums) {
        if (ds.length !== 8 || !/^\d{8}$/.test(ds)) continue;
        if (ds < todayStr || ds > cutoffStr) continue;

        const dateStr = `${ds.slice(0, 4)}-${ds.slice(4, 6)}-${ds.slice(6, 8)}`;
        const id = `${source.key}:${dataId}:${title}:${dateStr}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const point = resolveEventPoint(
          { source: source.key, venue_name: venueName, address: FACILITY_ADDRESS },
          FACILITY_POINT
        );

        events.push({
          id,
          source: source.key,
          title,
          starts_at: `${dateStr}T00:00:00+09:00`,
          ends_at: null,
          venue_name: venueName,
          address: FACILITY_ADDRESS,
          point,
          url,
        });
      }
    }

    return events;
  };
}

module.exports = { createKankyorakuenCollector };
