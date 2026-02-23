const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { WARD_CHILD_HINT_RE, FUNABASHI_SOURCE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

function createCollectFunabashiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = FUNABASHI_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectFunabashiEvents(maxDays) {
    const jsonUrl = `${source.baseUrl}/event/event_search.json`;
    let entries;
    try {
      const jsonText = await fetchText(jsonUrl);
      entries = JSON.parse(jsonText);
    } catch (e) {
      console.warn(`[${label}] event_search.json fetch/parse failed:`, e.message || e);
      return [];
    }

    if (!Array.isArray(entries)) {
      console.warn(`[${label}] event_search.json is not an array`);
      return [];
    }

    // 子育て関連フィルタ
    const childEntries = entries.filter((ev) => {
      const cat1 = ev.category1 || "";
      const cat2 = ev.category2 || "";
      if (/子育て|子ども|親子/.test(cat1) || /子育て|親子/.test(cat2)) return true;
      if (ev.title && WARD_CHILD_HINT_RE.test(ev.title)) return true;
      return false;
    });

    // 日付パースと範囲フィルタ
    const rawItems = [];
    for (const ev of childEntries) {
      if (!ev.title || !ev.eventday) continue;
      const days = String(ev.eventday).split(",");
      for (const dayStr of days) {
        const trimmed = dayStr.trim();
        if (!/^\d{8}$/.test(trimmed)) continue;
        const y = Number(trimmed.slice(0, 4));
        const mo = Number(trimmed.slice(4, 6));
        const d = Number(trimmed.slice(6, 8));
        if (!inRangeJst(y, mo, d, maxDays)) continue;
        rawItems.push({
          title: ev.title,
          url: ev.pageurl ? `${source.baseUrl}${ev.pageurl}` : source.baseUrl,
          facility: ev.facility || "",
          y, mo, d,
        });
      }
    }

    // URL + date で重複除去
    const uniqueMap = new Map();
    for (const item of rawItems) {
      const dateKey = `${item.y}${String(item.mo).padStart(2, "0")}${String(item.d).padStart(2, "0")}`;
      const key = `${item.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...item, dateKey });
    }
    const uniqueItems = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueItems.map((e) => e.url))].slice(0, 200);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseDetailMeta(html);
          const plainText = stripTags(html);
          const timeRange = parseTimeRangeFromText(plainText);
          if (!meta.venue) {
            const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim();
              v = v.replace(/\s*(?:住所|郵便番号|駐車|大きな地図|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考|注意|詳細).*$/, "").trim();
              if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) meta.venue = v;
            }
          }
          return { url, meta, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.url, r.value);
        }
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const item of uniqueItems) {
      const detail = detailMap.get(item.url);

      // 会場: JSON の facility を優先、なければ詳細ページから
      const jsonVenue = sanitizeVenueText(item.facility);
      const detailVenue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      let venue = jsonVenue || detailVenue;
      venue = venue.replace(/\s*\d*階.*$/, "").trim();
      // パンくずナビ「トップ > 施設 > …」等を除外
      if (/トップ/.test(venue) || /^[>＞]/.test(venue)) venue = "";
      venue = venue.replace(/^.*[>＞]\s*/, "").trim();
      // breadcrumb除外後にvenueが空になった場合、detailVenueにfallback
      if (!venue && detailVenue) venue = detailVenue;

      const rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      const candidates = [];
      if (rawAddress) {
        const full = rawAddress.includes(label) ? rawAddress : `${label}${rawAddress}`;
        candidates.push(`千葉県${full}`);
      }
      if (venue) {
        candidates.push(`千葉県${label} ${venue}`);
      }
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
          candidates.unshift(full);
        }
      }
      let point = await geocodeForWard(candidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: item.y, mo: item.mo, d: item.d },
        timeRange
      );
      const id = `${srcKey}:${item.url}:${item.title}:${item.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: item.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: address || "",
        url: item.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectFunabashiEvents };
