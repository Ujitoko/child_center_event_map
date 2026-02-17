const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const DETAIL_BATCH_SIZE = 6;

/**
 * 蓮田市CGIカレンダーページからイベントリンクを抽出
 *
 * 構造: <ul><li><a href="/kodomo/...html">タイトル<br>YYYY年M月D日（曜日）</a></li></ul>
 */
function parseHasudaCalendarPage(html, baseUrl, fallbackYear) {
  const events = [];
  const linkRe = /<li>\s*<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/li>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].trim();
    const inner = m[2];

    // /kodomo/ パス以下のみ子育て関連として扱う
    if (!href.includes("/kodomo/")) continue;

    // title と日付を分離 (<br> で区切られている)
    const parts = inner.split(/<br\s*\/?>/i);
    const title = stripTags(parts[0] || "").trim();
    const dateText = stripTags(parts[1] || "").trim();

    if (!title) continue;

    // 日付パース: "YYYY年M月D日（曜日）"
    let y = null;
    let mo = null;
    let d = null;
    const fullDate = dateText.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (fullDate) {
      y = Number(fullDate[1]);
      mo = Number(fullDate[2]);
      d = Number(fullDate[3]);
    }
    if (!y || !mo || !d) continue;

    const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    events.push({ title, url: absUrl, y, mo, d });
  }
  return events;
}

/**
 * 詳細ページからメタ情報を抽出
 * パターンA: h2 "開催場所" + p
 * パターンB: h2 "開催場所" + dl/dt/dd
 */
function parseHasudaDetailPage(html) {
  let venue = "";
  let address = "";

  // h2 セクションを分割して処理
  const sectionRe = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*>|<\/main|<footer|$)/gi;
  let sm;
  while ((sm = sectionRe.exec(html)) !== null) {
    const heading = stripTags(sm[1]).trim();
    const body = sm[2];

    if (/^開催場所$/.test(heading)) {
      // th/td テーブルパターン (<th><p>名称</p></th><td><p>施設名</p></td>)
      const thTdRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tm;
      while ((tm = thTdRe.exec(body)) !== null) {
        const k = stripTags(tm[1]).trim();
        const v = stripTags(tm[2]).trim();
        if (!venue && /名称/.test(k)) venue = v;
        if (!address && /住所/.test(k)) address = v;
      }

      // dl/dt/dd パターン
      if (!venue) {
        const dtddRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
        let dm;
        while ((dm = dtddRe.exec(body)) !== null) {
          const k = stripTags(dm[1]).trim();
          const v = stripTags(dm[2]).trim();
          if (!venue && /名称/.test(k)) venue = v;
          if (!address && /住所/.test(k)) address = v;
        }
      }

      // p タグパターン (名称：xxx)
      if (!venue) {
        const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let pm;
        while ((pm = pRe.exec(body)) !== null) {
          const pText = stripTags(pm[1]).trim();
          if (!venue && /名称[：:]/.test(pText)) {
            venue = pText.replace(/名称[：:]\s*/, "").trim();
          }
          if (!address && /住所[：:]/.test(pText)) {
            address = pText.replace(/住所[：:]\s*/, "").trim();
          }
        }
      }
    }
  }

  // テキスト全体から蓮田市住所パターン
  if (!address) {
    const text = stripTags(html);
    const addrMatch = text.match(/蓮田市[^\s、。,）)]{2,30}/);
    if (addrMatch) address = addrMatch[0];
  }

  return { venue, address };
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("蓮田市") ? address : `蓮田市${address}`;
    candidates.push(full.includes("埼玉県") ? full : `埼玉県${full}`);
  }
  if (venue) {
    candidates.push(`埼玉県蓮田市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectHasudaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectHasudaEvents(maxDays) {
    const source = deps.source || { key: "hasuda", label: "蓮田市", baseUrl: "https://www.city.hasuda.saitama.jp", center: { lat: 35.9925, lng: 139.6621 } };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      const url = `${baseUrl}/cgi-bin/event_cal/cal_month.cgi?year=${year}&month=${month}`;
      try {
        const html = await fetchText(url);
        const parsed = parseHasudaCalendarPage(html, baseUrl, year);
        rawEvents.push(...parsed);
      } catch (e) {
        console.warn(`[${label}] CGI calendar fetch failed (${year}/${month}):`, e.message || e);
      }
    }

    if (rawEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map((e) => e.url))].slice(0, 60);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseHasudaDetailPage(html);
          const text = stripTags(html);
          const timeRange = parseTimeRangeFromText(text);
          return { url, ...meta, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const resolvedAddr = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate({ y: ev.y, mo: ev.mo, d: ev.d }, timeRange);
      const id = `${srcKey}:${ev.url}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: resolvedAddr || "",
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

module.exports = { createCollectHasudaEvents };
