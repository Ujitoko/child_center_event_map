const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const {
  sanitizeVenueText,
  sanitizeAddressText,
} = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/**
 * RDF/RSS 1.0 イベントフィードをパース
 * nc: namespace の event_sdate/edate, category を使用
 * 対象: 八街市, 袖ケ浦市 等
 */
function parseRdfFeed(xml) {
  const items = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "";
    const eventSdate = (block.match(/<nc:event_sdate>([\s\S]*?)<\/nc:event_sdate>/) || [])[1] || "";
    const eventEdate = (block.match(/<nc:event_edate>([\s\S]*?)<\/nc:event_edate>/) || [])[1] || "";
    const dcDate = (block.match(/<dc:date>([\s\S]*?)<\/dc:date>/) || [])[1] || "";
    const cat1 = (block.match(/<nc:category01>([\s\S]*?)<\/nc:category01>/) || [])[1] || "";
    const cat2 = (block.match(/<nc:category02>([\s\S]*?)<\/nc:category02>/) || [])[1] || "";
    const cat3 = (block.match(/<nc:category03>([\s\S]*?)<\/nc:category03>/) || [])[1] || "";

    if (!title.trim() || !link.trim()) continue;
    items.push({
      title: stripTags(title).trim(),
      url: link.trim(),
      eventSdate: eventSdate.trim(),
      eventEdate: eventEdate.trim(),
      dcDate: dcDate.trim(),
      categories: [cat1, cat2, cat3].filter(Boolean).map(s => s.trim()),
    });
  }
  return items;
}

/**
 * ISO 8601 日時文字列から年月日を抽出
 */
function parseIsoDate(iso) {
  if (!iso) return null;
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

function buildGeoCandidates(venue, address, source) {
  const candidates = [];
  const city = source.label;
  if (address) {
    const full = address.includes(city) ? address : `${city}${address}`;
    candidates.push(`千葉県${full}`);
  }
  if (venue) {
    candidates.push(`千葉県${city} ${venue}`);
  }
  return [...new Set(candidates)];
}

/**
 * RDFイベントフィード型コレクターファクトリー
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {string} config.feedUrl - RSSフィードURL
 * @param {Object} deps
 */
function createRdfEventCollector(config, deps) {
  const { source, feedUrl } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectRdfEvents(maxDays) {
    let xml;
    try {
      xml = await fetchText(feedUrl);
    } catch (e) {
      console.warn(`[${label}] RSS feed fetch failed:`, e.message || e);
      return [];
    }

    const items = parseRdfFeed(xml);

    // 子育て関連フィルタ: カテゴリまたはタイトル
    const filtered = items.filter(item => {
      const catText = item.categories.join(" ");
      return WARD_CHILD_HINT_RE.test(item.title) ||
        /子育て|子ども|子供|親子|乳幼児|幼児|キッズ|児童|教室|講座|おはなし会|家庭の日|読み聞かせ|絵本/.test(item.title) ||
        /子育て|子ども/.test(catText);
    });

    // 日付決定: event_sdate > dcDate
    const dated = [];
    for (const item of filtered) {
      const eventDate = parseIsoDate(item.eventSdate);
      const pubDate = parseIsoDate(item.dcDate);
      const date = eventDate || pubDate;
      if (!date) continue;
      if (!inRangeJst(date.y, date.mo, date.d, maxDays)) continue;
      dated.push({ ...item, ...date });
    }

    // 詳細ページバッチ取得
    const detailUrls = [...new Set(dated.map(e => e.url))].slice(0, 60);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const text = stripTags(html);
          let venue = "";
          let address = "";
          // ◆会場、◆場所 パターン (袖ケ浦市スタイル)
          const bulletRe = /◆\s*(会場|場所|開催場所)\s*[：:\s]*(.*?)(?=◆|\n\n|$)/g;
          let bm;
          while ((bm = bulletRe.exec(text)) !== null) {
            if (!venue) venue = bm[2].trim().split(/\n/)[0].trim();
          }
          // dt/dd パターン
          const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
          let mm;
          while ((mm = metaRe.exec(html)) !== null) {
            const k = stripTags(mm[1]);
            const v = stripTags(mm[2]);
            if (!k || !v) continue;
            if (!venue && /(会場|開催場所|実施場所|場所)/.test(k)) venue = v;
            if (!address && /(住所|所在地)/.test(k)) address = v;
          }
          // th/td パターン
          if (!venue || !address) {
            const trRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
            while ((mm = trRe.exec(html)) !== null) {
              const k = stripTags(mm[1]);
              const v = stripTags(mm[2]);
              if (!k || !v) continue;
              if (!venue && /(会場|開催場所|実施場所|場所)/.test(k)) venue = v;
              if (!address && /(住所|所在地)/.test(k)) address = v;
            }
          }
          const timeRange = parseTimeRangeFromText(text);
          return { url, venue, address, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of dated) {
      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      let geoCandidates = buildGeoCandidates(venue, rawAddress, source);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: address || "",
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createRdfEventCollector };
