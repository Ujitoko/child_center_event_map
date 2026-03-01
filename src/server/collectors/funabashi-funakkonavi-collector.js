const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  getMonthsForRange,
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { FUNABASHI_SOURCE } = require("../../config/wards");

const BASE_URL = "https://www.city.funabashi.lg.jp";

// 2カテゴリ: 子育て支援センター (8778/01), 子育てサロン (8779/05)
const CATEGORIES = [
  { path: "/funakkonavi/event/8180/8778/01/event", label: "支援センター" },
  { path: "/funakkonavi/event/8180/8779/05/event", label: "サロン" },
];

/**
 * HTMLカレンダーページからイベントを抽出
 * 構造: <h3>令和N(YYYY)年M月D日(曜日)</h3> + <h4><a href="...">Title</a></h4>
 */
function parseFunakkonaviPage(html) {
  const events = [];
  // 日付見出しで分割
  const dayBlockRe = /<h3[^>]*>(?:<a[^>]*><\/a>)?令和\d+\s*[(（]\s*(\d{4})\s*[)）]\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日[^<]*<\/h3>([\s\S]*?)(?=<h3|<div class="pager|$)/gi;
  let dm;
  while ((dm = dayBlockRe.exec(html)) !== null) {
    const y = Number(dm[1]);
    const mo = Number(dm[2]);
    const d = Number(dm[3]);
    const dayHtml = dm[4];

    // イベントリンクを抽出
    const linkRe = /<h4[^>]*>\s*<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*<\/h4>/gi;
    let lm;
    while ((lm = linkRe.exec(dayHtml)) !== null) {
      let title = stripTags(lm[2]).trim();
      if (!title || title.length < 3) continue;
      const href = lm[1];
      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;

      // 施設名を括弧から推定: "ハワイアンリトミック（高根台）" → "高根台子育て支援センター"
      const facilityMatch = title.match(/[（(]([^）)]+)[）)]\s*$/);
      let facility = "";
      if (facilityMatch) {
        facility = facilityMatch[1];
        // 括弧をタイトルから除去はしない（施設名が分かるので有用）
      }

      events.push({ y, mo, d, title, url, facility });
    }
  }
  return events;
}

function createCollectFunakkonaviEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = FUNABASHI_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectFunakkonaviEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const cat of CATEGORIES) {
      for (const { year, month } of months) {
        const ym = String(year) + String(month).padStart(2, "0");
        const url = `${BASE_URL}${cat.path}${ym}.html`;
        try {
          const html = await fetchText(url);
          const evts = parseFunakkonaviPage(html);
          rawEvents.push(...evts);
        } catch (e) {
          console.warn(`[${label}/ふなっこナビ${cat.label}] ${ym} failed:`, e.message || e);
        }
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

    const byId = new Map();
    for (const ev of uniqueMap.values()) {
      const venueName = ev.facility || label;
      const candidates = [];
      if (getFacilityAddressFromMaster && ev.facility) {
        const fmAddr = getFacilityAddressFromMaster(source.key, ev.facility);
        if (fmAddr) candidates.push(/千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`);
        // 施設名にサフィックスを試す
        for (const suffix of ["子育て支援センター", "子育てサロン", "児童ホーム"]) {
          const fmAddr2 = getFacilityAddressFromMaster(source.key, `${ev.facility}${suffix}`);
          if (fmAddr2) { candidates.push(/千葉県/.test(fmAddr2) ? fmAddr2 : `千葉県${fmAddr2}`); break; }
        }
      }
      candidates.push(`千葉県船橋市 ${venueName}`);
      let point = await geocodeForWard(candidates.slice(0, 5), source);
      point = resolveEventPoint(source, venueName, point, `船橋市 ${venueName}`);
      const address = resolveEventAddress(source, venueName, `船橋市 ${venueName}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, null
      );
      const id = `${srcKey}:funakkonavi:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
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
    console.log(`[${label}/ふなっこナビ] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectFunakkonaviEvents };
