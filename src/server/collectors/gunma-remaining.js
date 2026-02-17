/**
 * 群馬県 残り28自治体カスタムコレクター
 *
 * 多くの自治体はイベントカレンダーが存在しないか極めて限定的なため、
 * 子育て関連ページのスクレイピングで対応する。
 *
 * 対象:
 *   桐生市, 沼田市, 館林市, 渋川市, 富岡市, みどり市,
 *   榛東村, 吉岡町, 上野村, 神流町, 下仁田町, 南牧村, 甘楽町,
 *   長野原町, 嬬恋村, 草津町, 高山村, 東吾妻町,
 *   片品村, 川場村, 昭和村, みなかみ町, 玉村町,
 *   板倉町, 明和町, 千代田町, 大泉町, 邑楽町
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
const { inferWardVenueFromTitle } = require("../venue-utils");

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
/** カテゴリページ・告知ページなど実際のイベントでないタイトルを除外 */
const GENERIC_TITLE_RE = /^(?:子育て|子育て支援|妊娠・出産|子育て・健康・福祉|子ども・子育て|育児|教育|健康・福祉|出産・子育て|結婚・子育て|子育て・教育)$/;
const ANNOUNCEMENT_TITLE_RE = /入所申込|入園申込|入所案内|民法改正|条例改正|計画策定|パブリックコメント|意見募集|公表します/;

function isChildEvent(title, extra) {
  const t = title.trim();
  if (GENERIC_TITLE_RE.test(t)) return false;
  if (ANNOUNCEMENT_TITLE_RE.test(t)) return false;
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
  // テキストベースの場所抽出（dt/dd, th/tdで見つからない場合）
  if (!venue) {
    const venueMatch = text.match(/(?:場所|会場|開催場所|ところ)\s+(.+?)(?=\s+(?:その他|内容|対象|日時|時間|問い合わせ|関連|申込|定員|費用|参加費|連絡|主催|企業|託児)|$)/u);
    if (venueMatch) venue = venueMatch[1].trim();
  }
  if (!address) {
    const addrMatch = text.match(/(?:住所|所在地)\s+([^\n]{3,60})/);
    if (addrMatch) address = addrMatch[1].trim();
  }

  const eventDate = parseDateFromText(text);
  const allDates = parseDatesFromText(text);
  const timeRange = parseTimeRangeFromText(text);
  return { url, venue, address, eventDate, allDates, timeRange, text };
}

/** ジオコーディング候補を生成 (群馬県) */
/** 会場テキストから括弧内の住所を抽出 */
function extractEmbeddedAddressFromVenue(venue, cityName) {
  if (!venue) return [];
  const results = [];
  const parenMatches = venue.match(/[（(]([^）)]{3,60})[）)]/g) || [];
  for (const m of parenMatches) {
    const inner = m.slice(1, -1);
    if (/[0-9０-９]+[-ー－][0-9０-９]+|[0-9０-９]+番地|[0-9０-９]+丁目/.test(inner)) {
      let addr = /群馬県/.test(inner) ? inner
        : inner.includes(cityName) ? `群馬県${inner}`
        : `群馬県${cityName}${inner}`;
      results.push(addr);
    }
  }
  return results;
}

function buildGeoCandidatesForCity(cityName, venue, address, prefixLabel) {
  const candidates = [];
  // 会場テキスト内の括弧住所を抽出（最優先）
  const embeddedAddrs = extractEmbeddedAddressFromVenue(venue, cityName);
  for (const ea of embeddedAddrs) candidates.push(ea);
  if (address) {
    const full = address.includes(cityName) ? address : `${cityName}${address}`;
    candidates.push(`群馬県${full}`);
  }
  if (venue) {
    candidates.push(`群馬県${prefixLabel || cityName} ${venue}`);
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
        const full = /群馬県/.test(fmAddr) ? fmAddr : `群馬県${fmAddr}`;
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
        // 相対URL→絶対URL (new URL resolves ../ properly)
        let absUrl;
        try {
          absUrl = new URL(href, pageUrl).href;
        } catch {
          if (href.startsWith("/")) {
            absUrl = `${sourceObj.baseUrl}${href}`;
          } else {
            absUrl = `${sourceObj.baseUrl}/${href}`;
          }
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
          let venue = sanitizeVenueText(detail.venue || "");
          // タイトルから施設名を推定（会場空の場合）
          if (!venue) {
            const inferred = inferWardVenueFromTitle(link.title, sourceObj.label);
            if (inferred && inferred !== `${sourceObj.label}子ども関連施設`) venue = inferred;
          }
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

        let venue = sanitizeVenueText((detail && detail.venue) || "");
        if (!venue) {
          const inferred = inferWardVenueFromTitle(item.title, sourceObj.label);
          if (inferred && inferred !== `${sourceObj.label}子ども関連施設`) venue = inferred;
        }
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


// ---- ファクトリー関数群 ----

// --- 市 (Cities) ---

function createCollectKiryuEvents(deps) {
  const { KIRYU_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(KIRYU_SOURCE, {
    cityName: "桐生市", prefixLabel: "桐生市",
    urls: [
      "https://www.city.kiryu.lg.jp/kosodate/index.html",
      "https://www.city.kiryu.lg.jp/kosodate/1009668/index.html",
      "https://www.city.kiryu.lg.jp/event/",
    ],
  }, deps);
}

function createCollectNumataEvents(deps) {
  const { NUMATA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(NUMATA_SOURCE, {
    cityName: "沼田市", prefixLabel: "沼田市",
    urls: [
      "https://www.city.numata.gunma.jp/event/",
    ],
  }, deps);
}

function createCollectTatebayashiEvents(deps) {
  const { TATEBAYASHI_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(TATEBAYASHI_SOURCE, {
    cityName: "館林市", prefixLabel: "館林市",
    urls: [
      "https://www.city.tatebayashi.gunma.jp/calendar/index.html",
      "https://www.city.tatebayashi.gunma.jp/event.html",
      "https://www.city.tatebayashi.gunma.jp/li/kosodate/030/010/index.html",
    ],
  }, deps);
}

function createCollectShibukawaEvents(deps) {
  const { SHIBUKAWA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(SHIBUKAWA_SOURCE, {
    cityName: "渋川市", prefixLabel: "渋川市",
    urls: [
      "https://www.city.shibukawa.lg.jp/kosodate/",
      "https://www.city.shibukawa.lg.jp/viewer/calendar-monthly.html",
    ],
  }, deps);
}

function createCollectTomiokaEvents(deps) {
  const { TOMIOKA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(TOMIOKA_SOURCE, {
    cityName: "富岡市", prefixLabel: "富岡市",
    urls: [
      "https://www.city.tomioka.lg.jp/www/genre/1001050000259/index.html",
      "https://www.city.tomioka.lg.jp/www/genre/1001050000218/index.html",
    ],
  }, deps);
}

function createCollectMidoriEvents(deps) {
  const { MIDORI_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(MIDORI_SOURCE, {
    cityName: "みどり市", prefixLabel: "みどり市",
    urls: [
      "https://www.city.midori.gunma.jp/kosodate/",
    ],
  }, deps);
}

// --- 町村 (Towns/Villages) ---

function createCollectShintoEvents(deps) {
  const { SHINTO_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(SHINTO_SOURCE, {
    cityName: "榛東村", prefixLabel: "北群馬郡榛東村",
    urls: [
      "https://www.vill.shinto.gunma.jp/viewer/calendar-monthly.html",
    ],
  }, deps);
}

function createCollectYoshiokaEvents(deps) {
  const { YOSHIOKA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(YOSHIOKA_SOURCE, {
    cityName: "吉岡町", prefixLabel: "北群馬郡吉岡町",
    urls: [
      "https://www.town.yoshioka.gunma.jp/kosodate/",
    ],
  }, deps);
}

function createCollectUenoGunmaEvents(deps) {
  const { UENO_GUNMA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(UENO_GUNMA_SOURCE, {
    cityName: "上野村", prefixLabel: "多野郡上野村",
    urls: [
      "https://www.uenomura.jp/admin/education/",
      "https://www.uenomura.jp/admin/health/",
    ],
  }, deps);
}

function createCollectKannaEvents(deps) {
  const { KANNA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(KANNA_SOURCE, {
    cityName: "神流町", prefixLabel: "多野郡神流町",
    urls: [
      "https://www.town.kanna.gunma.jp/kosodate_kyouiku/index.html",
    ],
  }, deps);
}

function createCollectShimonitaEvents(deps) {
  const { SHIMONITA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(SHIMONITA_SOURCE, {
    cityName: "下仁田町", prefixLabel: "甘楽郡下仁田町",
    urls: [
      "https://www.town.shimonita.lg.jp/m03/index.html",
      "https://www.town.shimonita.lg.jp/m04/index.html",
    ],
  }, deps);
}

function createCollectNanmokuEvents(deps) {
  const { NANMOKU_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(NANMOKU_SOURCE, {
    cityName: "南牧村", prefixLabel: "甘楽郡南牧村",
    urls: [
      "https://nanmoku.ne.jp/index.php",
    ],
  }, deps);
}

function createCollectKanraEvents(deps) {
  const { KANRA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(KANRA_SOURCE, {
    cityName: "甘楽町", prefixLabel: "甘楽郡甘楽町",
    urls: [
      "https://www.town.kanra.lg.jp/mokuteki/kosodate/index.html",
      "https://www.town.kanra.lg.jp/kurashi/kosodate/index.html",
    ],
  }, deps);
}

function createCollectNaganoharaEvents(deps) {
  const { NAGANOHARA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(NAGANOHARA_SOURCE, {
    cityName: "長野原町", prefixLabel: "吾妻郡長野原町",
    urls: [
      "https://www.town.naganohara.gunma.jp/www/genre/1453880353425/index.html",
      "https://www.town.naganohara.gunma.jp/www/genre/1453880949101/index.html",
    ],
  }, deps);
}

function createCollectTsumagoiEvents(deps) {
  const { TSUMAGOI_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(TSUMAGOI_SOURCE, {
    cityName: "嬬恋村", prefixLabel: "吾妻郡嬬恋村",
    urls: [
      "https://www.vill.tsumagoi.gunma.jp/www/genre/1000200000000/index.html",
      "https://www.vill.tsumagoi.gunma.jp/www/genre/1000300000000/index.html",
    ],
  }, deps);
}

function createCollectKusatsuEvents(deps) {
  const { KUSATSU_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(KUSATSU_SOURCE, {
    cityName: "草津町", prefixLabel: "吾妻郡草津町",
    urls: [
      "https://www.town.kusatsu.gunma.jp/www/genre/1489906238180/index.html",
      "https://www.town.kusatsu.gunma.jp/www/genre/1484728967001/index.html",
    ],
  }, deps);
}

function createCollectTakayamaGunmaEvents(deps) {
  const { TAKAYAMA_GUNMA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(TAKAYAMA_GUNMA_SOURCE, {
    cityName: "高山村", prefixLabel: "吾妻郡高山村",
    urls: [
      "https://vill.takayama.gunma.jp/02chiiki/event/top.html",
      "https://vill.takayama.gunma.jp/soshiki/06kyouiku.html",
    ],
  }, deps);
}

function createCollectHigashiagatsumaEvents(deps) {
  const { HIGASHIAGATSUMA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(HIGASHIAGATSUMA_SOURCE, {
    cityName: "東吾妻町", prefixLabel: "吾妻郡東吾妻町",
    urls: [
      "https://www.town.higashiagatsuma.gunma.jp/www/genre/1430102609712/index.html",
      "https://www.town.higashiagatsuma.gunma.jp/www/genre/1204195768541/index.html",
    ],
  }, deps);
}

function createCollectKatashinaEvents(deps) {
  const { KATASHINA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(KATASHINA_SOURCE, {
    cityName: "片品村", prefixLabel: "利根郡片品村",
    urls: [
      "https://www.vill.katashina.gunma.jp/kosodate/",
    ],
  }, deps);
}

function createCollectKawabaEvents(deps) {
  const { KAWABA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(KAWABA_SOURCE, {
    cityName: "川場村", prefixLabel: "利根郡川場村",
    urls: [
      "https://www.vill.kawaba.gunma.jp/kurashi/",
    ],
  }, deps);
}

function createCollectShowaGunmaEvents(deps) {
  const { SHOWA_GUNMA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(SHOWA_GUNMA_SOURCE, {
    cityName: "昭和村", prefixLabel: "利根郡昭和村",
    urls: [
      "https://www.vill.showa.gunma.jp/kosodate/",
    ],
  }, deps);
}

function createCollectMinakamiEvents(deps) {
  const { MINAKAMI_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(MINAKAMI_SOURCE, {
    cityName: "みなかみ町", prefixLabel: "利根郡みなかみ町",
    urls: [
      "https://www.town.minakami.gunma.jp/life/",
      "https://www.town.minakami.gunma.jp/politics/",
    ],
  }, deps);
}

function createCollectTamamuraEvents(deps) {
  const { TAMAMURA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(TAMAMURA_SOURCE, {
    cityName: "玉村町", prefixLabel: "佐波郡玉村町",
    urls: [
      "https://www.town.tamamura.lg.jp/soshiki/kosodate/",
    ],
  }, deps);
}

function createCollectItakuraEvents(deps) {
  const { ITAKURA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(ITAKURA_SOURCE, {
    cityName: "板倉町", prefixLabel: "邑楽郡板倉町",
    urls: [
      "https://www.town.itakura.gunma.jp/d000020/index.html",
      "https://www.town.itakura.gunma.jp/d000120/index.html",
    ],
  }, deps);
}

function createCollectMeiwaGunmaEvents(deps) {
  const { MEIWA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(MEIWA_SOURCE, {
    cityName: "明和町", prefixLabel: "邑楽郡明和町",
    urls: [
      "https://www.town.meiwa.gunma.jp/life/",
    ],
  }, deps);
}

function createCollectChiyodaGunmaEvents(deps) {
  const { CHIYODA_GUNMA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(CHIYODA_GUNMA_SOURCE, {
    cityName: "千代田町", prefixLabel: "邑楽郡千代田町",
    urls: [
      "https://www.town.chiyoda.gunma.jp/kyoiku/kosodate.html",
      "https://www.town.chiyoda.gunma.jp/fukushi/index.html",
    ],
  }, deps);
}

function createCollectOizumiEvents(deps) {
  const { OIZUMI_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(OIZUMI_SOURCE, {
    cityName: "大泉町", prefixLabel: "邑楽郡大泉町",
    urls: [
      "https://www.town.oizumi.gunma.jp/li/kosodate/index.html",
      "https://www.town.oizumi.gunma.jp/calendar/index.html",
    ],
  }, deps);
}

function createCollectOraEvents(deps) {
  const { ORA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(ORA_SOURCE, {
    cityName: "邑楽町", prefixLabel: "邑楽郡邑楽町",
    urls: [
      "https://www.town.ora.gunma.jp/li/040/index.html",
      "https://www.town.ora.gunma.jp/event.html",
    ],
  }, deps);
}


module.exports = {
  createCollectKiryuEvents,
  createCollectNumataEvents,
  createCollectTatebayashiEvents,
  createCollectShibukawaEvents,
  createCollectTomiokaEvents,
  createCollectMidoriEvents,
  createCollectShintoEvents,
  createCollectYoshiokaEvents,
  createCollectUenoGunmaEvents,
  createCollectKannaEvents,
  createCollectShimonitaEvents,
  createCollectNanmokuEvents,
  createCollectKanraEvents,
  createCollectNaganoharaEvents,
  createCollectTsumagoiEvents,
  createCollectKusatsuEvents,
  createCollectTakayamaGunmaEvents,
  createCollectHigashiagatsumaEvents,
  createCollectKatashinaEvents,
  createCollectKawabaEvents,
  createCollectShowaGunmaEvents,
  createCollectMinakamiEvents,
  createCollectTamamuraEvents,
  createCollectItakuraEvents,
  createCollectMeiwaGunmaEvents,
  createCollectChiyodaGunmaEvents,
  createCollectOizumiEvents,
  createCollectOraEvents,
};
