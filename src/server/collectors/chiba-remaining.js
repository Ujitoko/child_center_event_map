/**
 * 千葉県 残り13自治体カスタムコレクター
 *
 * 多くの自治体はイベントカレンダーが存在しないか極めて限定的なため、
 * 子育て関連ページのスクレイピングで対応する。
 *
 * 対象:
 *   茂原市, 館山市, 南房総市, 大網白里市, 酒々井町, 神崎町, 多古町,
 *   芝山町, 睦沢町, 長生村, 長柄町, 御宿町, 長南町
 */
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

const DETAIL_BATCH_SIZE = 5;

// ---- 共通ユーティリティ ----

/** 西暦・令和の日付をテキストから抽出 */
function parseDateFromText(text) {
  const isoMatch = text.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (isoMatch) {
    return { y: Number(isoMatch[1]), mo: Number(isoMatch[2]), d: Number(isoMatch[3]) };
  }
  const reMatch = text.match(/令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (reMatch) {
    return { y: 2018 + Number(reMatch[1]), mo: Number(reMatch[2]), d: Number(reMatch[3]) };
  }
  return null;
}

/** 複数日付をテキストから抽出 */
function parseDatesFromText(text) {
  const dates = [];
  const isoRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  let m;
  while ((m = isoRe.exec(text)) !== null) {
    dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  if (dates.length > 0) return dates;
  const reRe = /令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  while ((m = reRe.exec(text)) !== null) {
    dates.push({ y: 2018 + Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  return dates;
}

/** pubDate (RFC 2822) → {y, mo, d} */
function parsePubDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return { y: jst.getUTCFullYear(), mo: jst.getUTCMonth() + 1, d: jst.getUTCDate() };
}

/** RSS 2.0/RDF フィードからアイテムを抽出 */
function parseRssFeed(xml) {
  const items = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || "";
    const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1] || "";
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] ||
                    (block.match(/<dc:date>([\s\S]*?)<\/dc:date>/) || [])[1] || "";
    const desc = (block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) || [])[1] || "";
    if (!title.trim() || !link.trim()) continue;
    items.push({
      title: stripTags(title).trim(),
      url: link.trim(),
      pubDate: pubDate.trim(),
      description: stripTags(desc).trim(),
    });
  }
  return items;
}

/** 子育てイベント判定 */
function isChildEvent(title, extra) {
  const text = title + (extra || "");
  return WARD_CHILD_HINT_RE.test(text) ||
    /子育て|子ども|子供|親子|乳幼児|幼児|キッズ|児童|赤ちゃん|ベビー|保育|マタニティ|妊婦/.test(text);
}

/** 詳細ページからイベント情報を抽出する汎用関数 */
async function fetchDetailInfo(url) {
  const html = await fetchText(url);
  const text = stripTags(html);
  let venue = "";
  let address = "";

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
  const eventDate = parseDateFromText(text);
  const allDates = parseDatesFromText(text);
  const timeRange = parseTimeRangeFromText(text);
  return { url, venue, address, eventDate, allDates, timeRange, text };
}

/** ジオコーディング候補を生成 */
function buildGeoCandidatesForCity(cityName, venue, address, prefixLabel) {
  const candidates = [];
  if (address) {
    const full = address.includes(cityName) ? address : `${cityName}${address}`;
    candidates.push(`千葉県${full}`);
  }
  if (venue) {
    candidates.push(`千葉県${prefixLabel || cityName} ${venue}`);
  }
  return [...new Set(candidates)];
}

/** イベントレコードを生成して byId Map に追加 */
function addEventRecord(byId, {
  sourceObj, eventDate, title, url, venue, rawAddress, timeRange, cityName, prefixLabel,
  geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
}) {
  const source = `ward_${sourceObj.key}`;
  const label = sourceObj.label;
  const dateKey = `${eventDate.y}${String(eventDate.mo).padStart(2, "0")}${String(eventDate.d).padStart(2, "0")}`;
  const id = `${source}:${url}:${title}:${dateKey}`;
  if (byId.has(id)) return;

  return (async () => {
    let geoCandidates = buildGeoCandidatesForCity(cityName, venue, rawAddress, prefixLabel);
    if (getFacilityAddressFromMaster && venue) {
      const fmAddr = getFacilityAddressFromMaster(sourceObj.key, venue);
      if (fmAddr) {
        const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
        geoCandidates.unshift(full);
      }
    }
    let point = await geocodeForWard(geoCandidates.slice(0, 7), sourceObj);
    point = resolveEventPoint(sourceObj, venue, point, rawAddress || `${label} ${venue}`);
    const resolvedAddr = resolveEventAddress(sourceObj, venue, rawAddress || `${label} ${venue}`, point);

    const { startsAt, endsAt } = buildStartsEndsForDate(
      { y: eventDate.y, mo: eventDate.mo, d: eventDate.d },
      timeRange
    );
    byId.set(id, {
      id, source,
      source_label: label,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      venue_name: venue,
      address: resolvedAddr || "",
      url,
      lat: point ? point.lat : sourceObj.center.lat,
      lng: point ? point.lng : sourceObj.center.lng,
    });
  })();
}


// ---- 子育てページリンク収集型コレクター (汎用) ----

/**
 * 自治体の子育てページから子育てイベントのリンクを収集し、
 * 詳細ページから日付・会場を取得するコレクター。
 *
 * イベントカレンダーがない自治体向け。
 */
function createKosodatePageCollector(sourceObj, config, deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const { cityName, prefixLabel, urls } = config;

  return async function collector(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    for (const pageUrl of urls) {
      let html;
      try {
        html = await fetchText(pageUrl);
      } catch (e) {
        console.warn(`[${label}] page fetch failed (${pageUrl}):`, e.message || e);
        continue;
      }

      // ページ内のリンクを抽出
      const linkRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const links = [];
      let lm;
      while ((lm = linkRe.exec(html)) !== null) {
        const href = lm[1].replace(/&amp;/g, "&").trim();
        const text = stripTags(lm[2]).trim();
        if (!href || !text || text.length < 2) continue;
        if (!isChildEvent(text, "")) continue;
        // 相対URL→絶対URL
        let absUrl;
        if (href.startsWith("http")) {
          absUrl = href;
        } else if (href.startsWith("/")) {
          absUrl = `${sourceObj.baseUrl}${href}`;
        } else {
          const base = pageUrl.replace(/\/[^/]*$/, "/");
          absUrl = `${base}${href}`;
        }
        links.push({ title: text, url: absUrl });
      }

      // 詳細ページからイベント情報を取得
      const uniqueUrls = [...new Set(links.map(l => l.url))].slice(0, 30);
      const detailMap = new Map();
      for (let i = 0; i < uniqueUrls.length; i += DETAIL_BATCH_SIZE) {
        const batch = uniqueUrls.slice(i, i + DETAIL_BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(u => fetchDetailInfo(u)));
        for (const r of results) {
          if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
        }
      }

      for (const link of links) {
        const detail = detailMap.get(link.url);
        if (!detail) continue;

        const dates = (detail.allDates && detail.allDates.length > 0)
          ? detail.allDates
          : detail.eventDate ? [detail.eventDate] : [];

        for (const eventDate of dates) {
          if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;
          const venue = sanitizeVenueText(detail.venue || "");
          const rawAddress = sanitizeAddressText(detail.address || "");
          await addEventRecord(byId, {
            sourceObj, eventDate, title: link.title, url: link.url,
            venue, rawAddress, timeRange: detail.timeRange,
            cityName, prefixLabel,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}


// ---- RSS型コレクター (汎用) ----

function createRssChildCollector(sourceObj, config, deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const { cityName, prefixLabel, feedUrls } = config;

  return async function collector(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    for (const feedUrl of feedUrls) {
      let xml;
      try {
        xml = await fetchText(feedUrl);
      } catch (e) {
        console.warn(`[${label}] RSS fetch failed (${feedUrl}):`, e.message || e);
        continue;
      }

      const items = parseRssFeed(xml);
      const filtered = items.filter(item => isChildEvent(item.title, item.description));

      // 詳細ページバッチ取得
      const detailUrls = [...new Set(filtered.map(e => e.url))].slice(0, 30);
      const detailMap = new Map();
      for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
        const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(u => fetchDetailInfo(u)));
        for (const r of results) {
          if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
        }
      }

      for (const item of filtered) {
        const detail = detailMap.get(item.url);
        const eventDate = (detail && detail.eventDate) || parsePubDate(item.pubDate);
        if (!eventDate) continue;
        if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;

        const venue = sanitizeVenueText((detail && detail.venue) || "");
        const rawAddress = sanitizeAddressText((detail && detail.address) || "");
        const timeRange = detail ? detail.timeRange : null;

        await addEventRecord(byId, {
          sourceObj, eventDate, title: item.title, url: item.url,
          venue, rawAddress, timeRange,
          cityName, prefixLabel,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}


// ---- 酒々井町テーブルカレンダー型コレクター ----

function createShisuiCollector(sourceObj, deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;

  return async function collectShisuiEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    // 今月と来月のカレンダーページを取得
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // JST
    const months = [];
    for (let offset = 0; offset <= 2; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      months.push({ y: d.getFullYear(), mo: d.getMonth() + 1 });
    }

    for (const { y, mo } of months) {
      const url = `${sourceObj.baseUrl}/event/${y}/${String(mo).padStart(2, "0")}/`;
      let html;
      try {
        html = await fetchText(url);
      } catch (e) {
        console.warn(`[${label}] calendar fetch failed (${url}):`, e.message || e);
        continue;
      }

      // テーブル内のイベントリンクを抽出
      // <td> 内の日付と <a href> を組み合わせて解析
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let dayCounter = 0;
      let tm;
      while ((tm = tdRe.exec(html)) !== null) {
        const cell = tm[1];
        // 日付を含むセルかチェック
        const dayMatch = cell.match(/(\d{1,2})\s*日?/);
        if (!dayMatch) continue;
        const d = Number(dayMatch[1]);
        if (d < 1 || d > 31) continue;

        // セル内のリンクを抽出
        const linkRe2 = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let lm2;
        while ((lm2 = linkRe2.exec(cell)) !== null) {
          const href = lm2[1].replace(/&amp;/g, "&").trim();
          const title = stripTags(lm2[2]).trim();
          if (!href || !title || title.length < 2) continue;
          if (!isChildEvent(title, "")) continue;

          let absUrl;
          if (href.startsWith("http")) {
            absUrl = href;
          } else if (href.startsWith("/")) {
            absUrl = `${sourceObj.baseUrl}${href}`;
          } else {
            absUrl = `${sourceObj.baseUrl}/event/${y}/${String(mo).padStart(2, "0")}/${href}`;
          }

          if (!inRangeJst(y, mo, d, maxDays)) continue;

          // 詳細取得はスキップ（バッチ後で）
          await addEventRecord(byId, {
            sourceObj, eventDate: { y, mo, d },
            title, url: absUrl, venue: "", rawAddress: "",
            timeRange: null, cityName: "酒々井町", prefixLabel: "印旛郡酒々井町",
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}


// ---- 館山市 CGI カレンダー型コレクター ----

function createTateyamaCollector(sourceObj, deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;

  return async function collectTateyamaEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    // cal.cgi は公開ページなので試行
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const months = [];
    for (let offset = 0; offset <= 2; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      months.push({ y: d.getFullYear(), mo: d.getMonth() + 1 });
    }

    for (const { y, mo } of months) {
      // cal.cgi をHTMLカレンダーとしてフェッチ
      const url = `${sourceObj.baseUrl}/cgi-bin/event/cal.cgi?year=${y}&month=${mo}`;
      let html;
      try {
        html = await fetchText(url);
      } catch (e) {
        console.warn(`[${label}] cal.cgi fetch failed:`, e.message || e);
        continue;
      }

      // カレンダーHTML内のイベントリンクを抽出
      const linkRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let lm;
      while ((lm = linkRe.exec(html)) !== null) {
        const href = lm[1].replace(/&amp;/g, "&").trim();
        const title = stripTags(lm[2]).trim();
        if (!href || !title || title.length < 2) continue;
        if (!isChildEvent(title, "")) continue;

        // 日付をhrefから推定 (?date=YYYYMMDD 等)
        let eventDate = null;
        const dateParam = href.match(/date=(\d{4})(\d{2})(\d{2})/);
        if (dateParam) {
          eventDate = { y: Number(dateParam[1]), mo: Number(dateParam[2]), d: Number(dateParam[3]) };
        }
        // テキストからの日付パース
        if (!eventDate) {
          eventDate = parseDateFromText(title);
        }
        if (!eventDate) continue;
        if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;

        let absUrl;
        if (href.startsWith("http")) {
          absUrl = href;
        } else if (href.startsWith("/")) {
          absUrl = `${sourceObj.baseUrl}${href}`;
        } else {
          absUrl = `${sourceObj.baseUrl}/cgi-bin/event/${href}`;
        }

        await addEventRecord(byId, {
          sourceObj, eventDate, title, url: absUrl,
          venue: "", rawAddress: "",
          timeRange: null, cityName: "館山市", prefixLabel: "館山市",
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    // フォールバック: 子育てページからもリンク収集
    const kosodateUrls = [
      `${sourceObj.baseUrl}/kosodate/`,
      `${sourceObj.baseUrl}/soshiki/kosodate/`,
    ];
    for (const pageUrl of kosodateUrls) {
      let html;
      try {
        html = await fetchText(pageUrl);
      } catch { continue; }

      const linkRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let lm;
      while ((lm = linkRe.exec(html)) !== null) {
        const href = lm[1].replace(/&amp;/g, "&").trim();
        const title = stripTags(lm[2]).trim();
        if (!href || !title || title.length < 3) continue;
        if (!isChildEvent(title, "")) continue;

        let absUrl = href.startsWith("http") ? href :
          href.startsWith("/") ? `${sourceObj.baseUrl}${href}` :
          `${sourceObj.baseUrl}/kosodate/${href}`;

        // 詳細ページから日付取得
        let detail;
        try {
          detail = await fetchDetailInfo(absUrl);
        } catch { continue; }
        if (!detail.eventDate) continue;
        if (!inRangeJst(detail.eventDate.y, detail.eventDate.mo, detail.eventDate.d, maxDays)) continue;

        const venue = sanitizeVenueText(detail.venue || "");
        const rawAddress = sanitizeAddressText(detail.address || "");
        await addEventRecord(byId, {
          sourceObj, eventDate: detail.eventDate, title, url: absUrl,
          venue, rawAddress, timeRange: detail.timeRange,
          cityName: "館山市", prefixLabel: "館山市",
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}


// ---- ファクトリー関数群 ----

function createCollectMobaraEvents(deps) {
  const { MOBARA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(MOBARA_SOURCE, {
    cityName: "茂原市", prefixLabel: "茂原市",
    urls: [
      "https://www.city.mobara.chiba.jp/category/5-2-0-0-0-0-0-0-0-0.html",
      "https://www.city.mobara.chiba.jp/category/5-1-0-0-0-0-0-0-0-0.html",
    ],
  }, deps);
}

function createCollectTateyamaEvents(deps) {
  const { TATEYAMA_SOURCE } = require("../../config/wards");
  return createTateyamaCollector(TATEYAMA_SOURCE, deps);
}

function createCollectMinamibosoEvents(deps) {
  const { MINAMIBOSO_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(MINAMIBOSO_SOURCE, {
    cityName: "南房総市", prefixLabel: "南房総市",
    urls: [
      "https://www.city.minamiboso.chiba.jp/category/6-1-0-0-0-0-0-0-0-0.html",
      "https://www.city.minamiboso.chiba.jp/soshiki/kosodate/",
    ],
  }, deps);
}

function createCollectOamishirasatoEvents(deps) {
  const { OAMISHIRASATO_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(OAMISHIRASATO_SOURCE, {
    cityName: "大網白里市", prefixLabel: "大網白里市",
    urls: [
      "https://www.city.oamishirasato.lg.jp/category/7-1-0-0-0-0-0-0-0-0.html",
      "https://www.city.oamishirasato.lg.jp/category/7-2-0-0-0-0-0-0-0-0.html",
    ],
  }, deps);
}

function createCollectShisuiEvents(deps) {
  const { SHISUI_SOURCE } = require("../../config/wards");
  return createShisuiCollector(SHISUI_SOURCE, deps);
}

function createCollectKozakiEvents(deps) {
  const { KOZAKI_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(KOZAKI_SOURCE, {
    cityName: "神崎町", prefixLabel: "香取郡神崎町",
    urls: [
      "https://www.town.kozaki.chiba.jp/events/",
      "https://www.town.kozaki.chiba.jp/category/3-3-0-0-0-0-0-0-0-0.html",
    ],
  }, deps);
}

function createCollectTakoEvents(deps) {
  const { TAKO_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(TAKO_SOURCE, {
    cityName: "多古町", prefixLabel: "香取郡多古町",
    urls: [
      "https://www.town.tako.chiba.jp/category/4-1-0-0-0-0-0-0-0-0.html",
      "https://www.town.tako.chiba.jp/soshiki/kosodate/",
    ],
  }, deps);
}

function createCollectShibayamaEvents(deps) {
  const { SHIBAYAMA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(SHIBAYAMA_SOURCE, {
    cityName: "芝山町", prefixLabel: "山武郡芝山町",
    urls: [
      "https://www.town.shibayama.lg.jp/category/5-1-0-0-0-0-0-0-0-0.html",
      "https://www.town.shibayama.lg.jp/soshiki/kosodate/",
    ],
  }, deps);
}

function createCollectMutsuzawaEvents(deps) {
  const { MUTSUZAWA_SOURCE } = require("../../config/wards");
  return createRssChildCollector(MUTSUZAWA_SOURCE, {
    cityName: "睦沢町", prefixLabel: "長生郡睦沢町",
    feedUrls: [
      "https://www.town.mutsuzawa.chiba.jp/feed/",
      "https://www.town.mutsuzawa.chiba.jp/feed/atom/",
    ],
  }, deps);
}

function createCollectChoseiEvents(deps) {
  const { CHOSEI_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(CHOSEI_SOURCE, {
    cityName: "長生村", prefixLabel: "長生郡長生村",
    urls: [
      "https://www.vill.chosei.chiba.jp/category/4-1-0-0-0-0-0-0-0-0.html",
      "https://www.vill.chosei.chiba.jp/soshiki/kosodate/",
    ],
  }, deps);
}

function createCollectNagaraEvents(deps) {
  const { NAGARA_SOURCE } = require("../../config/wards");
  return createRssChildCollector(NAGARA_SOURCE, {
    cityName: "長柄町", prefixLabel: "長生郡長柄町",
    feedUrls: [
      "https://www.town.nagara.chiba.jp/feed/",
    ],
  }, deps);
}

function createCollectOnjukuEvents(deps) {
  const { ONJUKU_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(ONJUKU_SOURCE, {
    cityName: "御宿町", prefixLabel: "夷隅郡御宿町",
    urls: [
      "https://www.town.onjuku.chiba.jp/category/4-1-0-0-0-0-0-0-0-0.html",
      "https://www.town.onjuku.chiba.jp/soshiki/kosodate/",
    ],
  }, deps);
}

function createCollectChonanEvents(deps) {
  const { CHONAN_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(CHONAN_SOURCE, {
    cityName: "長南町", prefixLabel: "長生郡長南町",
    urls: [
      "https://www.town.chonan.chiba.jp/event/",
      "https://www.town.chonan.chiba.jp/category/4-1-0-0-0-0-0-0-0-0.html",
    ],
  }, deps);
}


module.exports = {
  createCollectMobaraEvents,
  createCollectTateyamaEvents,
  createCollectMinamibosoEvents,
  createCollectOamishirasatoEvents,
  createCollectShisuiEvents,
  createCollectKozakiEvents,
  createCollectTakoEvents,
  createCollectShibayamaEvents,
  createCollectMutsuzawaEvents,
  createCollectChoseiEvents,
  createCollectNagaraEvents,
  createCollectOnjukuEvents,
  createCollectChonanEvents,
};
