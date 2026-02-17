const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { WARD_CHILD_HINT_RE, NARITA_SOURCE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

function createCollectNaritaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = NARITA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectNaritaEvents(maxDays) {
    const txtUrl = `${source.baseUrl}/event/event_all.txt`;
    let data;
    try {
      const text = await fetchText(txtUrl);
      data = JSON.parse(text);
    } catch (e) {
      console.warn(`[${label}] event_all.txt fetch/parse failed:`, e.message || e);
      return [];
    }

    if (!data || !Array.isArray(data.events)) {
      console.warn(`[${label}] event_all.txt events is not an array`);
      return [];
    }

    // 子育て関連フィルタ (カテゴリに子育て区分がないためタイトルマッチ)
    const childEntries = data.events.filter((ev) => {
      const name = ev.event_name || "";
      return WARD_CHILD_HINT_RE.test(name);
    });

    // 日付パースと範囲フィルタ
    const rawItems = [];
    for (const ev of childEntries) {
      if (!ev.event_name || !ev.event_date) continue;
      const parts = String(ev.event_date).split("/");
      if (parts.length !== 3) continue;
      const y = Number(parts[0]);
      const mo = Number(parts[1]);
      const d = Number(parts[2]);
      if (!inRangeJst(y, mo, d, maxDays)) continue;
      const url = ev.url && ev.url.startsWith("http") ? ev.url
        : ev.url ? `${source.baseUrl}${ev.url}` : source.baseUrl;
      rawItems.push({
        title: ev.event_name,
        url,
        y, mo, d,
      });
    }

    // URL + title で重複除去 (複数日の同イベント → 各日は残す、同日同URL同タイトルを除去)
    const uniqueMap = new Map();
    for (const item of rawItems) {
      const dateKey = `${item.y}${String(item.mo).padStart(2, "0")}${String(item.d).padStart(2, "0")}`;
      const key = `${item.url}:${item.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...item, dateKey });
    }
    const uniqueItems = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueItems.map((e) => e.url))].slice(0, 120);
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

      let venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      venue = venue.replace(/\s*\d*階.*$/, "").trim();

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

module.exports = { createCollectNaritaEvents };
