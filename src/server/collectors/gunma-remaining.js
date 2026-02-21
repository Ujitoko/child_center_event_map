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
const { inferWardVenueFromTitle, isJunkVenueName } = require("../venue-utils");

const DETAIL_BATCH_SIZE = 5;

// ---- 共通ユーティリティ ----

/** 西暦・令和の日付をテキストから抽出（最新の日付を返す） */
function parseDateFromText(text) {
  let best = null;
  const isoMatch = text.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (isoMatch) {
    best = { y: Number(isoMatch[1]), mo: Number(isoMatch[2]), d: Number(isoMatch[3]) };
  }
  const reMatch = text.match(/令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (reMatch) {
    const reDate = { y: 2018 + Number(reMatch[1]), mo: Number(reMatch[2]), d: Number(reMatch[3]) };
    if (!best || reDate.y > best.y || (reDate.y === best.y && (reDate.mo > best.mo || (reDate.mo === best.mo && reDate.d > best.d)))) {
      best = reDate;
    }
  }
  return best;
}

/** 複数日付をテキストから抽出 */
function parseDatesFromText(text) {
  const dates = [];
  const isoRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  let m;
  while ((m = isoRe.exec(text)) !== null) {
    dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  // 令和パターンも常に実行（YYYY形式の更新日だけでなく令和形式の日付も拾う）
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
const ANNOUNCEMENT_TITLE_RE = /入所申込|入園申込|入所案内|民法改正|条例改正|計画策定|パブリック[・]?コメント|意見募集|公表します|測定結果|放射性物質|申請書について|実態調査|施設一覧|についてお知らせ|応援手当|助成事業|補助します|受験料|臨時休館|休館のお知らせ|特定健診|がん検診/;

function isChildEvent(title, extra) {
  const t = title.trim();
  if (GENERIC_TITLE_RE.test(t)) return false;
  if (ANNOUNCEMENT_TITLE_RE.test(t)) return false;
  const text = title + (extra || "");
  return WARD_CHILD_HINT_RE.test(text) ||
    /子育て|子ども|子供|親子|乳幼児|幼児|キッズ|児童|赤ちゃん|ベビー|保育|マタニティ|妊婦|健診|予防接種/.test(text) ||
    /\d+\s*(?:か月|歳|ヶ月|カ月)\s*児/.test(text) ||
    /おはなし会|家庭の日|読み聞かせ|絵本/.test(text);
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
    point = resolveEventPoint(sourceObj, venue, point, rawAddress);
    const resolvedAddr = resolveEventAddress(sourceObj, venue, rawAddress, point);

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
          if (venue && isJunkVenueName(venue)) venue = "";
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
        if (venue && isJunkVenueName(venue)) venue = "";
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
      "https://www.city.kiryu.lg.jp/kosodate/1018221/index.html",
      "https://www.city.kiryu.lg.jp/event/",
    ],
  }, deps);
}

function createCollectNumataEvents(deps) {
  const { NUMATA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(NUMATA_SOURCE, {
    cityName: "沼田市", prefixLabel: "沼田市",
    urls: [
      "https://www.city.numata.gunma.jp/life/kosodate/kenko/",
      "https://www.city.numata.gunma.jp/life/kosodate/hoiku/",
    ],
  }, deps);
}

function createCollectTatebayashiEvents(deps) {
  const { TATEBAYASHI_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(TATEBAYASHI_SOURCE, {
    cityName: "館林市", prefixLabel: "館林市",
    urls: [
      "https://www.city.tatebayashi.gunma.jp/li/kosodate/010/index.html",
      "https://www.city.tatebayashi.gunma.jp/li/kenko/140/040/index.html",
      "https://www.city.tatebayashi.gunma.jp/li/kenko/020/index.html",
      "https://www.city.tatebayashi.gunma.jp/event.html",
    ],
  }, deps);
}

function createCollectShibukawaEvents(deps) {
  const { SHIBUKAWA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(SHIBUKAWA_SOURCE, {
    cityName: "渋川市", prefixLabel: "渋川市",
    urls: [
      "https://www.city.shibukawa.lg.jp/viewer/calendar-monthly.html",
      "https://www.city.shibukawa.lg.jp/event/000341/index.html",
      "https://www.city.shibukawa.lg.jp/kosodate-site/kosodate/000437/000446/000448/index.html",
      "https://www.city.shibukawa.lg.jp/kosodate-site/kosodate/000437/000446/000447/p015021.html",
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


// ---- calendar-json/municipal-calendar 代替コレクター ----
// カレンダーに子育てイベントが掲載されない自治体向け

function createCollectOtaGunmaKosodateEvents(deps) {
  const { OTA_GUNMA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(OTA_GUNMA_SOURCE, {
    cityName: "太田市", prefixLabel: "太田市",
    urls: [
      "https://www.city.ota.gunma.jp/site/kosodate/",
      "https://www.city.ota.gunma.jp/life/2/20/",
      "https://www.city.ota.gunma.jp/site/boshi-kenko/",
    ],
  }, deps);
}

function createCollectFujiokaGunmaKosodateEvents(deps) {
  const { FUJIOKA_GUNMA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(FUJIOKA_GUNMA_SOURCE, {
    cityName: "藤岡市", prefixLabel: "藤岡市",
    urls: [
      "https://www.city.fujioka.gunma.jp/kodomo_kyoiku/index.html",
      "https://www.city.fujioka.gunma.jp/kurashi_sagasu/kosodate/index.html",
      "https://www.city.fujioka.gunma.jp/kodomo_kyoiku/ninshin_shussan/3047.html", // 両親学級 (日付あり)
      "https://www.city.fujioka.gunma.jp/kodomo_kyoiku/ninshin_shussan/2951.html", // ママサロン (日付あり)
    ],
  }, deps);
}

function createCollectAnnakaKosodateEvents(deps) {
  const { ANNAKA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(ANNAKA_SOURCE, {
    cityName: "安中市", prefixLabel: "安中市",
    urls: [
      "https://www.city.annaka.lg.jp/life/3/19/",
      "https://www.city.annaka.lg.jp/life/3/",
    ],
  }, deps);
}


// ---- 群馬県スケジュール表コレクター ----
// 固定URLのスケジュール表ページからイベントを収集する汎用コレクター (群馬県版)

function createGunmaScheduleTableCollector(sourceObj, config, deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const { cityName, prefixLabel, pages } = config;

  function currentFiscalYear() {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const m = jst.getUTCMonth() + 1;
    return m >= 4 ? y : y - 1;
  }

  function inferYear(text) {
    const reiwaFy = text.match(/令和\s*(\d{1,2})\s*年度/);
    if (reiwaFy) return 2018 + Number(reiwaFy[1]);
    const westernFy = text.match(/(\d{4})\s*年度/);
    if (westernFy) return Number(westernFy[1]);
    const reiwa = text.match(/令和\s*(\d{1,2})\s*年/);
    if (reiwa) return 2018 + Number(reiwa[1]);
    return null;
  }

  function resolveMonthDay(month, day, fiscalYear) {
    return month >= 4 ? { y: fiscalYear, mo: month, d: day } : { y: fiscalYear + 1, mo: month, d: day };
  }

  function extractDatesFromTable(tableHtml, fiscalYear) {
    const dates = [];
    const nText = tableHtml.normalize("NFKC");
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRe.exec(nText)) !== null) {
      const rowHtml = trMatch[1];
      const rowText = stripTags(rowHtml).trim();
      if (!rowText) continue;
      // 令和N年M月D日
      const fullRe = /令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
      let fm;
      while ((fm = fullRe.exec(rowText)) !== null) {
        dates.push({ y: 2018 + Number(fm[1]), mo: Number(fm[2]), d: Number(fm[3]) });
      }
      // YYYY年M月D日
      const isoRe = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
      let im;
      while ((im = isoRe.exec(rowText)) !== null) {
        const dup = dates.some(d => d.y === Number(im[1]) && d.mo === Number(im[2]) && d.d === Number(im[3]));
        if (!dup) dates.push({ y: Number(im[1]), mo: Number(im[2]), d: Number(im[3]) });
      }
      // M月D日 (年なし → 年度推定) — セル単位でチェック (対象者列の「令和N年...生まれ」を回避)
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
        const cellText = stripTags(cellMatch[1]).trim();
        if (!cellText || /令和|年|生まれ/.test(cellText)) continue;
        const mdRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
        let md;
        while ((md = mdRe.exec(cellText)) !== null) {
          const mo = Number(md[1]);
          const d = Number(md[2]);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            const resolved = resolveMonthDay(mo, d, fiscalYear);
            const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
            if (!dup) dates.push(resolved);
          }
        }
      }
      // Fallback: row-level bare M月D日 when no cells have 令和/年
      if (!/令和|年/.test(rowText)) {
        const mdRe2 = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
        let md2;
        while ((md2 = mdRe2.exec(rowText)) !== null) {
          const mo = Number(md2[1]);
          const d = Number(md2[2]);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            const resolved = resolveMonthDay(mo, d, fiscalYear);
            const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
            if (!dup) dates.push(resolved);
          }
        }
      }
    }
    return dates;
  }

  /** ページテキストからも日付を抽出 (テーブル外の日付リスト対応) */
  function extractDatesFromText(text, fiscalYear) {
    const dates = [];
    // 令和N年M月D日
    const reRe = /令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
    let m;
    while ((m = reRe.exec(text)) !== null) {
      dates.push({ y: 2018 + Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
    }
    // YYYY年M月D日
    const isoRe = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
    while ((m = isoRe.exec(text)) !== null) {
      const dup = dates.some(d => d.y === Number(m[1]) && d.mo === Number(m[2]) && d.d === Number(m[3]));
      if (!dup) dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
    }
    // M月D日 (年なし → 年度推定) — 令和/年 を含まない行の裸のM月D日を拾う
    const lines = text.split(/\n/);
    for (const line of lines) {
      if (/令和|年/.test(line)) continue;
      const mdRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
      let md;
      while ((md = mdRe.exec(line)) !== null) {
        const mo = Number(md[1]);
        const d = Number(md[2]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          const resolved = resolveMonthDay(mo, d, fiscalYear);
          const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
          if (!dup) dates.push(resolved);
        }
      }
    }
    return dates;
  }

  function extractPageMeta(text) {
    let venue = "";
    const venueStopRe = /\s+(?:対象|内容|申し込み|申込|問い合わせ|日時|時間|持ち物|定員|費用|参加費|料金|備考|注意|その他|電話|TEL|ホーム|この記事|令和|お問い合わせ|連絡先|〒\d|受付)/;
    const venueMatch = text.match(/(?:ところ|場所|会場|実施場所)\s*[：:]\s*(.{3,})/u);
    if (venueMatch) {
      let v = venueMatch[1];
      const stopIdx = v.search(venueStopRe);
      if (stopIdx > 0) v = v.substring(0, stopIdx);
      if (v.length > 60) v = v.substring(0, 60);
      v = sanitizeVenueText(v.trim());
      if (v && v.length >= 2 && v.length <= 50 && !/トップページ|ホームページ|>/.test(v)) venue = v;
    }
    if (!venue) {
      const venueMatch2 = text.match(/(?:ところ|場所|会場|実施場所)\s+(.{3,})/u);
      if (venueMatch2) {
        let v = venueMatch2[1];
        const stopIdx = v.search(venueStopRe);
        if (stopIdx > 0) v = v.substring(0, stopIdx);
        if (v.length > 60) v = v.substring(0, 60);
        v = sanitizeVenueText(v.trim());
        if (v && v.length >= 2 && v.length <= 50 && !/トップページ|ホームページ|>/.test(v)) venue = v;
      }
    }
    const timeRange = parseTimeRangeFromText(text);
    return { venue, timeRange };
  }

  return async function collector(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    for (const page of pages) {
      let html;
      try {
        html = await fetchText(page.url);
      } catch (e) {
        console.warn(`[${label}] schedule page fetch failed (${page.url}):`, e.message || e);
        continue;
      }

      const nHtml = html.normalize("NFKC");
      const text = stripTags(nHtml);
      const fiscalYear = inferYear(text) || currentFiscalYear();

      let pageTitle = page.title;
      if (!pageTitle) {
        const h1Match = nHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1Match) pageTitle = stripTags(h1Match[1]).trim();
      }
      if (!pageTitle) pageTitle = `${label}子育てイベント`;

      const meta = extractPageMeta(text);
      const venue = meta.venue || page.defaultVenue || "";
      const timeRange = meta.timeRange || null;

      // テーブルから日付抽出
      const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
      let tableMatch;
      const allDates = [];
      while ((tableMatch = tableRe.exec(nHtml)) !== null) {
        allDates.push(...extractDatesFromTable(tableMatch[1], fiscalYear));
      }
      // テーブル外の日付も抽出（dl/dd パターンやプレーンテキスト日付）
      if (allDates.length === 0) {
        allDates.push(...extractDatesFromText(text, fiscalYear));
      }

      // 重複除去
      const uniqueDates = [];
      const seen = new Set();
      for (const d of allDates) {
        const key = `${d.y}-${d.mo}-${d.d}`;
        if (!seen.has(key)) { seen.add(key); uniqueDates.push(d); }
      }

      // 住所抽出
      let rawAddress = "";
      if (venue) {
        const embedded = extractEmbeddedAddressFromVenue(venue, cityName);
        if (embedded.length > 0) rawAddress = embedded[0];
      }

      const promises = [];
      for (const eventDate of uniqueDates) {
        if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;
        promises.push(addEventRecord(byId, {
          sourceObj, eventDate, title: pageTitle, url: page.url,
          venue: sanitizeVenueText(venue), rawAddress,
          timeRange,
          cityName, prefixLabel,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        }));
      }
      await Promise.all(promises.filter(Boolean));
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (schedule)`);
    return results;
  };
}


// ---- 前橋市スケジュール+カレンダー併用コレクター ----

function createCollectMaebashiScheduleEvents(deps) {
  const { MAEBASHI_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(MAEBASHI_SOURCE, {
    cityName: "前橋市", prefixLabel: "前橋市",
    pages: [
      { url: "https://www.city.maebashi.gunma.jp/kosodate_kyoiku/2/4/1/47247.html", title: "ひよこクラス", defaultVenue: "前橋市第二コミュニティセンター" },
      { url: "https://www.city.maebashi.gunma.jp/kosodate_kyoiku/2/4/1/12086.html", title: "離乳食講習会すてっぷ1", defaultVenue: "前橋市保健センター" },
      { url: "https://www.city.maebashi.gunma.jp/kosodate_kyoiku/2/4/1/19040.html", title: "離乳食講習会すてっぷ2", defaultVenue: "前橋市保健センター" },
      { url: "https://www.city.maebashi.gunma.jp/kosodate_kyoiku/2/4/1/38411.html", title: "離乳食講習会すてっぷ3", defaultVenue: "前橋市保健センター" },
      { url: "https://www.city.maebashi.gunma.jp/kosodate_kyoiku/4/2/1/12087.html", title: "ハローベビークラス", defaultVenue: "前橋市保健センター" },
      { url: "https://www.city.maebashi.gunma.jp/kosodate_kyoiku/2/4/1/37326.html", title: "プリミークラブ", defaultVenue: "前橋市第二コミュニティセンター" },
      { url: "https://www.city.maebashi.gunma.jp/kosodate_kyoiku/2/4/1/27587.html", title: "のびのびあそぼう会", defaultVenue: "前橋市保健センター" },
      { url: "https://www.city.maebashi.gunma.jp/kosodate_kyoiku/2/3/1/12077.html", title: "2歳児歯科健診", defaultVenue: "前橋市保健センター" },
      { url: "https://www.city.maebashi.gunma.jp/kosodate_kyoiku/2/4/1/47262.html", title: "親子の絆づくりプログラム" },
    ],
  }, deps);
}


// ---- 伊勢崎市スケジュール表コレクター ----

function createCollectIsesakiScheduleEvents(deps) {
  const { ISESAKI_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(ISESAKI_SOURCE, {
    cityName: "伊勢崎市", prefixLabel: "伊勢崎市",
    pages: [
      { url: "https://www.city.isesaki.lg.jp/iryo_kenko_fukushi/iryo_kenko/kenshin_kenshin/kodomonokenshin/15521.html", title: "4か月児健康診査", defaultVenue: "保健センター" },
      { url: "https://www.city.isesaki.lg.jp/iryo_kenko_fukushi/iryo_kenko/kenshin_kenshin/kodomonokenshin/15517.html", title: "10か月児健康相談", defaultVenue: "保健センター" },
      { url: "https://www.city.isesaki.lg.jp/iryo_kenko_fukushi/iryo_kenko/kenshin_kenshin/kodomonokenshin/15518.html", title: "1歳6か月児健康診査", defaultVenue: "保健センター" },
      { url: "https://www.city.isesaki.lg.jp/iryo_kenko_fukushi/iryo_kenko/kenshin_kenshin/kodomonokenshin/15520.html", title: "3歳児健康診査", defaultVenue: "保健センター" },
      { url: "https://www.city.isesaki.lg.jp/iryo_kenko_fukushi/iryo_kenko/boshi_kenko/15547.html", title: "両親学級", defaultVenue: "保健センター" },
    ],
  }, deps);
}


// ---- 桐生市スケジュール表コレクター ----

function createCollectKiryuScheduleEvents(deps) {
  const { KIRYU_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(KIRYU_SOURCE, {
    cityName: "桐生市", prefixLabel: "桐生市",
    pages: [
      { url: "https://www.city.kiryu.lg.jp/kosodate/1009668/1018526/1018527.html", title: "3か月児健康診査", defaultVenue: "桐生市保健福祉会館" },
      { url: "https://www.city.kiryu.lg.jp/kosodate/1009668/1018526/1018529.html", title: "10か月児健康診査", defaultVenue: "桐生市保健福祉会館" },
      { url: "https://www.city.kiryu.lg.jp/kosodate/1009668/1018526/1018531.html", title: "1歳6か月児健康診査", defaultVenue: "桐生市保健福祉会館" },
      { url: "https://www.city.kiryu.lg.jp/kosodate/1009668/1018526/1018532.html", title: "2歳児歯科健康診査", defaultVenue: "桐生市保健福祉会館" },
      { url: "https://www.city.kiryu.lg.jp/kosodate/1009668/1018526/1018533.html", title: "3歳児健康診査", defaultVenue: "桐生市保健福祉会館" },
      { url: "https://www.city.kiryu.lg.jp/kosodate/1009668/1008597/1000819.html", title: "もぐもぐ離乳食教室", defaultVenue: "桐生市保健福祉会館" },
      { url: "https://www.city.kiryu.lg.jp/kosodate/1009668/1008597/1018461.html", title: "ステップアップ離乳食教室", defaultVenue: "桐生市保健福祉会館" },
      { url: "https://www.city.kiryu.lg.jp/kosodate/1009666/1001432.html", title: "ママ&パパ教室", defaultVenue: "桐生市保健福祉会館" },
    ],
  }, deps);
}


// ---- 館林市スケジュール表コレクター ----

function createCollectTatebayashiScheduleEvents(deps) {
  const { TATEBAYASHI_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(TATEBAYASHI_SOURCE, {
    cityName: "館林市", prefixLabel: "館林市",
    pages: [
      { url: "https://www.city.tatebayashi.gunma.jp/s051/kenko/020/080/010/20200107033000.html", title: "4か月児健康診査", defaultVenue: "保健センター" },
      { url: "https://www.city.tatebayashi.gunma.jp/s051/kenko/020/080/020/20200107032000.html", title: "10か月児健康診査", defaultVenue: "保健センター" },
      { url: "https://www.city.tatebayashi.gunma.jp/s051/kenko/020/080/030/20200107031000.html", title: "1歳6か月児健康診査", defaultVenue: "保健センター" },
      { url: "https://www.city.tatebayashi.gunma.jp/s051/kenko/020/080/040/20200107030000.html", title: "2歳児歯科健康診査", defaultVenue: "保健センター" },
      { url: "https://www.city.tatebayashi.gunma.jp/s051/kenko/020/080/050/20200107025000.html", title: "3歳児健康診査", defaultVenue: "保健センター" },
      { url: "https://www.city.tatebayashi.gunma.jp/s051/kenko/020/035/20210314145703.html", title: "離乳食教室", defaultVenue: "保健センター" },
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
  // calendar代替コレクター
  createCollectOtaGunmaKosodateEvents,
  createCollectFujiokaGunmaKosodateEvents,
  createCollectAnnakaKosodateEvents,
  // スケジュール表コレクター
  createCollectMaebashiScheduleEvents,
  createCollectIsesakiScheduleEvents,
  createCollectKiryuScheduleEvents,
  createCollectTatebayashiScheduleEvents,
};
