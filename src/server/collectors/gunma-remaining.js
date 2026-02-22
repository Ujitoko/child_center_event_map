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
    // M月D日 (年なし) — 令和N年コンテキストを引き継いでセグメント処理
    // 令和N年（年度ではない）をセグメント境界として、各セグメント内のM月D日に暦年を適用
    const yearMarkerRe = /令和\s*(\d{1,2})\s*年(?!度)/g;
    const segments = [];
    let lastIdx = 0;
    let lastYear = 0; // 0 = use fiscalYear-based resolution
    let ym;
    while ((ym = yearMarkerRe.exec(text)) !== null) {
      if (lastIdx < ym.index) {
        segments.push({ t: text.substring(lastIdx, ym.index), calYear: lastYear });
      }
      lastYear = 2018 + Number(ym[1]);
      lastIdx = ym.index + ym[0].length;
    }
    if (lastIdx < text.length) {
      segments.push({ t: text.substring(lastIdx), calYear: lastYear });
    }
    for (const seg of segments) {
      // 令和/年 を含まない行（従来パス）またはセグメント処理
      const processLines = seg.calYear > 0 ? [seg.t] : seg.t.split(/\n/).filter(l => !/令和|年/.test(l));
      for (const line of processLines) {
        const mdRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
        let md;
        while ((md = mdRe.exec(line)) !== null) {
          const mo = Number(md[1]);
          const d = Number(md[2]);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            const resolved = seg.calYear > 0 ? { y: seg.calYear, mo, d } : resolveMonthDay(mo, d, fiscalYear);
            const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
            if (!dup) dates.push(resolved);
          }
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
      const venue = (meta.venue && !isJunkVenueName(meta.venue)) ? meta.venue : (page.defaultVenue || "");
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


// ---- 沼田市スケジュール表コレクター ----

function createCollectNumataScheduleEvents(deps) {
  const { NUMATA_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(NUMATA_SOURCE, {
    cityName: "沼田市", prefixLabel: "沼田市",
    pages: [
      { url: "https://www.city.numata.gunma.jp/life/kosodate/kenko/1002228.html", title: "乳幼児健康診査", defaultVenue: "沼田市保健福祉センター" },
      { url: "https://www.city.numata.gunma.jp/life/kosodate/kenko/1002229.html", title: "すこやか育児相談", defaultVenue: "沼田市保健福祉センター" },
    ],
  }, deps);
}


// ---- 川場村スケジュール表コレクター ----

function createCollectKawabaScheduleEvents(deps) {
  const { KAWABA_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(KAWABA_SOURCE, {
    cityName: "川場村", prefixLabel: "利根郡川場村",
    pages: [
      { url: "https://www.vill.kawaba.gunma.jp/kurashi/fukushi/kosodate/nyuji.html", title: "乳幼児健診・子育て支援教室", defaultVenue: "川場村保健福祉センター" },
    ],
  }, deps);
}


// ---- 下仁田町スケジュール表コレクター ----

function createCollectShimonitaScheduleEvents(deps) {
  const { SHIMONITA_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(SHIMONITA_SOURCE, {
    cityName: "下仁田町", prefixLabel: "甘楽郡下仁田町",
    pages: [
      { url: "https://www.town.shimonita.lg.jp/hoken-kankyo/m01/m03/m02/20210409154722.html", title: "乳幼児健診", defaultVenue: "下仁田町保健センター" },
      { url: "https://www.town.shimonita.lg.jp/hoken-kankyo/m01/m03/m02/20210409153629.html", title: "ふれあい広場（定期健康相談）", defaultVenue: "下仁田町保健センター" },
    ],
  }, deps);
}


// ---- 千代田町スケジュール表コレクター ----

function createCollectChiyodaGunmaScheduleEvents(deps) {
  const { CHIYODA_GUNMA_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(CHIYODA_GUNMA_SOURCE, {
    cityName: "千代田町", prefixLabel: "邑楽郡千代田町",
    pages: [
      { url: "https://www.town.chiyoda.gunma.jp/kenkou/kenkou/hoken003.html", title: "マタニティセミナー", defaultVenue: "千代田町総合保健福祉センター" },
      { url: "https://www.town.chiyoda.gunma.jp/kenkou/kenkou/post-575.html", title: "もぐもぐ離乳食教室", defaultVenue: "千代田町総合保健福祉センター" },
      { url: "https://www.town.chiyoda.gunma.jp/kenkou/kenkou/hoken008.html", title: "発達相談", defaultVenue: "千代田町総合保健福祉センター" },
    ],
  }, deps);
}


// ---- 藤岡市スケジュール表コレクター ----

function createCollectFujiokaGunmaScheduleEvents(deps) {
  const { FUJIOKA_GUNMA_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(FUJIOKA_GUNMA_SOURCE, {
    cityName: "藤岡市", prefixLabel: "藤岡市",
    pages: [
      { url: "https://www.city.fujioka.gunma.jp/kodomo_kyoiku/ninshin_shussan/3047.html", title: "両親学級", defaultVenue: "藤岡市総合学習センター" },
      { url: "https://www.city.fujioka.gunma.jp/kodomo_kyoiku/ninshin_shussan/2951.html", title: "ママサロン", defaultVenue: "藤岡市総合学習センター" },
    ],
  }, deps);
}


// ---- 玉村町スケジュール表コレクター ----

function createCollectTamamuraScheduleEvents(deps) {
  const { TAMAMURA_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(TAMAMURA_SOURCE, {
    cityName: "玉村町", prefixLabel: "佐波郡玉村町",
    pages: [
      { url: "https://www.town.tamamura.lg.jp/docs/2022012700035/", title: "母親学級・パパママ教室", defaultVenue: "玉村町保健センター" },
      { url: "https://www.town.tamamura.lg.jp/docs/2020032400089/", title: "子育て相談", defaultVenue: "玉村町保健センター" },
    ],
  }, deps);
}


// ---- 甘楽町スケジュール表コレクター ----

function createCollectKanraScheduleEvents(deps) {
  const { KANRA_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(KANRA_SOURCE, {
    cityName: "甘楽町", prefixLabel: "甘楽郡甘楽町",
    pages: [
      { url: "https://www.town.kanra.lg.jp/kenkou/kodomo/kodomo/20250514150634.html", title: "にこにこEnglish", defaultVenue: "にこにこキッズかんら" },
    ],
  }, deps);
}


// ---- 安中市スケジュール表コレクター ----

function createCollectAnnakaScheduleEvents(deps) {
  const { ANNAKA_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(ANNAKA_SOURCE, {
    cityName: "安中市", prefixLabel: "安中市",
    pages: [
      { url: "https://www.city.annaka.lg.jp/page/24746.html", title: "パパママ教室", defaultVenue: "安中市保健センター" },
    ],
  }, deps);
}


// ---- 東吾妻町おやココスケジュールコレクター ----
// にこにこひろば「おやココ」予定表は M/D(曜) 形式のプレーンテキスト

function createCollectHigashiagatsumaScheduleEvents(deps) {
  const { HIGASHIAGATSUMA_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = HIGASHIAGATSUMA_SOURCE;
  const cityName = "東吾妻町";
  const prefixLabel = "吾妻郡東吾妻町";

  return async function collector(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();
    const pageUrl = "https://www.town.higashiagatsuma.gunma.jp/www/contents/1326350968652/index.html";

    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${label}] おやココ fetch failed:`, e.message || e);
      return [];
    }

    const nHtml = html.normalize("NFKC");
    const text = stripTags(nHtml);

    // 年度推定
    const fyMatch = text.match(/令和\s*(\d{1,2})\s*年度/);
    const fiscalYear = fyMatch ? 2018 + Number(fyMatch[1]) : (() => {
      const now = new Date();
      const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const y = jst.getUTCFullYear();
      const m = jst.getUTCMonth() + 1;
      return m >= 4 ? y : y - 1;
    })();

    // M/D(曜) パターンで日付抽出（次のM/D(曜)の手前で区切る）
    const dateRe = /(\d{1,2})\/(\d{1,2})\s*\([月火水木金土日]\)\s*(.+?)(?=\s*\d{1,2}\/\d{1,2}\s*\([月火水木金土日]\)|[*＊]\s*予定|$)/g;
    let m;
    while ((m = dateRe.exec(text)) !== null) {
      const mo = Number(m[1]);
      const d = Number(m[2]);
      let eventTitle = m[3].replace(/&amp;/g, "&").trim();
      // ページフッターなどが混入した場合はトリミング
      const stopIdx = eventTitle.search(/\s*(?:予定は変更|詳細は|ダウンロード|関連リンク|お問い合わせ|電話番号|Copyright|申込み|ピヨピヨ)/);
      if (stopIdx > 0) eventTitle = eventTitle.substring(0, stopIdx).trim();
      if (eventTitle.length > 60) eventTitle = eventTitle.substring(0, 60).trim();
      if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;

      // 年度→暦年変換: 4月以降はfiscalYear、1-3月はfiscalYear+1
      const y = mo >= 4 ? fiscalYear : fiscalYear + 1;
      const eventDate = { y, mo, d };

      if (!inRangeJst(y, mo, d, maxDays)) continue;

      await addEventRecord(byId, {
        sourceObj, eventDate,
        title: `おやココ: ${eventTitle}`,
        url: pageUrl,
        venue: "にこにこひろば",
        rawAddress: "",
        timeRange: { startH: 10, startM: 0, endH: null, endM: null },
        cityName, prefixLabel,
        geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (おやココ schedule)`);
    return results;
  };
}


// ---- 板倉町カレンダーコレクター ----
// 板倉町の月カレンダーページはJavaScript配列にイベントデータが埋め込まれている

function createCollectItakuraCalendarEvents(deps) {
  const { ITAKURA_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = ITAKURA_SOURCE;
  const cityName = "板倉町";
  const prefixLabel = "邑楽郡板倉町";

  return async function collector(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    // 今月と来月のカレンダーを取得
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const baseUrl = "https://www.town.itakura.gunma.jp/d000120/index.html";

    const monthUrls = [baseUrl];
    // 来月分
    const nextMonth = new Date(jst);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const ny = nextMonth.getUTCFullYear();
    const nm = nextMonth.getUTCMonth() + 1;
    monthUrls.push(`https://www.town.itakura.gunma.jp/d000120/index.html?ym=${ny}${String(nm).padStart(2, "0")}`);
    // 再来月分
    const nextMonth2 = new Date(jst);
    nextMonth2.setUTCMonth(nextMonth2.getUTCMonth() + 2);
    const ny2 = nextMonth2.getUTCFullYear();
    const nm2 = nextMonth2.getUTCMonth() + 1;
    monthUrls.push(`https://www.town.itakura.gunma.jp/d000120/index.html?ym=${ny2}${String(nm2).padStart(2, "0")}`);

    for (const pageUrl of monthUrls) {
      let html;
      try {
        html = await fetchText(pageUrl);
      } catch (e) {
        console.warn(`[${label}] calendar fetch failed (${pageUrl}):`, e.message || e);
        continue;
      }

      // JavaScript配列からイベントデータを抽出
      // title2.push("event title"); url2.push("relative URL"); hiduke2.push("YYYY/M/D");
      const titleRe = /title2\.push\("([^"]+)"\)/g;
      const urlRe = /url2\.push\("([^"]+)"\)/g;
      const dateRe = /hiduke2\.push\("([^"]+)"\)/g;

      const titles = [];
      const urls = [];
      const dates = [];
      let tm;
      while ((tm = titleRe.exec(html)) !== null) titles.push(tm[1]);
      while ((tm = urlRe.exec(html)) !== null) urls.push(tm[1]);
      while ((tm = dateRe.exec(html)) !== null) dates.push(tm[1]);

      for (let i = 0; i < titles.length && i < dates.length; i++) {
        const title = titles[i];
        if (!isChildEvent(title, "")) continue;

        const dateParts = dates[i].split("/");
        if (dateParts.length !== 3) continue;
        const eventDate = {
          y: Number(dateParts[0]),
          mo: Number(dateParts[1]),
          d: Number(dateParts[2]),
        };
        if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;

        let eventUrl = baseUrl;
        if (i < urls.length && urls[i]) {
          try {
            eventUrl = new URL(urls[i], pageUrl).href;
          } catch {
            eventUrl = baseUrl;
          }
        }

        // タイトルから施設名を推定
        let venue = "";
        const venueMatch = title.match(/[（(]([^）)]+)[）)]/);
        if (venueMatch) {
          venue = sanitizeVenueText(venueMatch[1]);
          if (isJunkVenueName(venue)) venue = "";
        }
        if (!venue) {
          const inferred = inferWardVenueFromTitle(title, label);
          if (inferred && inferred !== `${label}子ども関連施設`) venue = inferred;
        }

        await addEventRecord(byId, {
          sourceObj, eventDate, title, url: eventUrl,
          venue, rawAddress: "",
          timeRange: null,
          cityName, prefixLabel,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (calendar)`);
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
      { url: "https://www.city.maebashi.gunma.jp/soshiki/kodomomiraibu/kodomoshien/gyomu/1/3/34821.html", title: "パパひろば", defaultVenue: "前橋市第二保育所" },
      { url: "https://www.city.maebashi.gunma.jp/kosodate_kyoiku/4/3/12143.html", title: "にこにこ健康相談", defaultVenue: "前橋市保健センター" },
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


// ---- みどり市 スケジュールコレクター ----
function createCollectMidoriScheduleEvents(deps) {
  const { MIDORI_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(MIDORI_SOURCE, {
    cityName: "みどり市", prefixLabel: "みどり市",
    pages: [
      { url: "https://www.city.midori.gunma.jp/kosodate/1001761/1002388.html", title: "乳幼児健診・相談", defaultVenue: "大間々保健センター" },
      { url: "https://www.city.midori.gunma.jp/kosodate/1001641/1002403.html", title: "ベビークラス", defaultVenue: "大間々保健センター" },
      { url: "https://www.city.midori.gunma.jp/kosodate/1001642/1002661.html", title: "ファミリークラス", defaultVenue: "大間々保健センター" },
    ],
  }, deps);
}

// ---- 大泉町 スケジュールコレクター ----
function createCollectOizumiScheduleEvents(deps) {
  const { OIZUMI_SOURCE } = require("../../config/wards");
  return createGunmaScheduleTableCollector(OIZUMI_SOURCE, {
    cityName: "大泉町", prefixLabel: "邑楽郡大泉町",
    pages: [
      { url: "https://www.town.oizumi.gunma.jp/s016/kosodate/030/010/050/20230329185203.html", title: "4か月児健康診査", defaultVenue: "保健福祉総合センター" },
      { url: "https://www.town.oizumi.gunma.jp/s016/kosodate/030/010/040/20200814200338.html", title: "7か月児健康診査", defaultVenue: "保健福祉総合センター" },
      { url: "https://www.town.oizumi.gunma.jp/s016/kosodate/030/010/030/20200814200623.html", title: "1歳6か月児健康診査", defaultVenue: "保健福祉総合センター" },
      { url: "https://www.town.oizumi.gunma.jp/s016/kosodate/030/010/020/20200814200943.html", title: "2歳児歯科健康診査", defaultVenue: "保健福祉総合センター" },
      { url: "https://www.town.oizumi.gunma.jp/s016/kosodate/030/010/010/20200814201224.html", title: "3歳児健康診査", defaultVenue: "保健福祉総合センター" },
    ],
  }, deps);
}

// ---- 太田市 こども館コレクター ----
// D日 形式 (月コンテキストはヘッダーから推定)
function createCollectOtaKodomokanEvents(deps) {
  const { OTA_GUNMA_SOURCE } = require("../../config/wards");
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const sourceObj = OTA_GUNMA_SOURCE;
  const cityName = "太田市";
  const prefixLabel = "太田市";
  const venue = "太田市こども館";

  return async function collectOtaKodomokanEvents(maxDays) {
    const days = Math.min(Math.max(Number(maxDays) || 30, 1), 90);
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = new Date(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate());
    const rangeEnd = new Date(today.getTime() + days * 86400000);
    const byId = new Map();
    const pageUrl = "https://www.city.ota.gunma.jp/site/kosodate/2874.html";

    try {
      const html = await fetchText(pageUrl);
      if (!html) return Array.from(byId.values());

      // HTMLから<h3>タグでイベント名+日時ブロックを抽出
      // 構造: <h2>M月の通常事業</h2> ... <h3>イベント名</h3> ... 日時:D日・D日 ...
      const normalizedHtml = html.normalize("NFKC");

      // h2タグから月を抽出
      const h2Re = /<h2[^>]*>(.*?)<\/h2>/gi;
      const monthSections = []; // { month, startIdx }
      let h2m;
      while ((h2m = h2Re.exec(normalizedHtml)) !== null) {
        const h2Text = h2m[1].replace(/<[^>]+>/g, "").trim();
        const moMatch = h2Text.match(/(\d{1,2})月/);
        if (moMatch) {
          monthSections.push({ month: Number(moMatch[1]), startIdx: h2m.index });
        }
      }

      // h3タグからイベント名と後続の日時を抽出
      const h3Re = /<h3[^>]*>(.*?)<\/h3>/gi;
      let h3m;
      while ((h3m = h3Re.exec(normalizedHtml)) !== null) {
        let eventTitle = h3m[1].replace(/<[^>]+>/g, "").trim();
        // タイトルクリーニング
        eventTitle = eventTitle.replace(/\s*第[\d・]+[月火水木金土日]曜日.*$/, "").trim();
        eventTitle = eventTitle.replace(/\s*[(（][^)）]*[)）]\s*$/, "").trim();
        eventTitle = eventTitle.replace(/\s*毎週.*$/, "").trim();
        eventTitle = eventTitle.replace(/\s+\d+月の.*$/, "").trim();
        eventTitle = eventTitle.replace(/\s*\[PDF.*$/i, "").trim();
        eventTitle = eventTitle.replace(/\s*第[\d、]+[月火水木金土日]曜日.*$/, "").trim();
        if (!eventTitle || /休館/.test(eventTitle)) continue;

        // この h3 が属する月を決定
        let month = 0;
        for (const ms of monthSections) {
          if (ms.startIdx <= h3m.index) month = ms.month;
        }
        if (month < 1 || month > 12) continue;

        // h3の後方300文字から日時を抽出
        const afterH3 = normalizedHtml.substring(h3m.index + h3m[0].length, h3m.index + h3m[0].length + 500);
        const afterText = afterH3.replace(/<[^>]+>/g, " ").trim();
        const dateSection = afterText.match(/日時[：:](.+?)(?:場所|対象|申込|内容|定員)/s);
        if (!dateSection) continue;

        const dayMatches = [...dateSection[1].matchAll(/(\d{1,2})日/g)];
        if (dayMatches.length === 0) continue;

        const timeRange = parseTimeRangeFromText(dateSection[1]);

        for (const dm of dayMatches) {
          const day = Number(dm[1]);
          if (day < 1 || day > 31) continue;

          let year = jstNow.getUTCFullYear();
          const candidate = new Date(year, month - 1, day);
          if (candidate - today > 180 * 86400000) year--;
          if (today - candidate > 180 * 86400000) year++;

          const d = new Date(year, month - 1, day);
          if (d < today || d >= rangeEnd) continue;

          const eventDate = { y: year, mo: month, d: day };
          await addEventRecord(byId, {
            sourceObj, eventDate,
            title: `太田市こども館 ${eventTitle}`,
            url: pageUrl, venue, rawAddress: `群馬県${cityName}`,
            timeRange, cityName, prefixLabel,
            geocodeForWard, resolveEventPoint, resolveEventAddress,
            getFacilityAddressFromMaster,
          });
        }
      }
    } catch (err) {
      console.error(`[太田市こども館] fetch failed: ${err.message}`);
    }

    const results = Array.from(byId.values());
    console.log(`[太田市こども館] ${results.length} events collected`);
    return results;
  };
}

// ---- 高崎市 子育てなんでもセンター イベントコレクター ----
// https://takasaki-kosodate.jp/cityindex/index511.html の M月のイベント セクション
function createCollectTakasakiNandemoEvents(deps) {
  const { TAKASAKI_SOURCE } = require("../../config/wards");
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const sourceObj = TAKASAKI_SOURCE;
  const cityName = "高崎市";
  const prefixLabel = "高崎市";
  const venue = "子育てなんでもセンター";

  return async function collectTakasakiNandemoEvents(maxDays) {
    const byId = new Map();
    const pageUrl = "https://takasaki-kosodate.jp/cityindex/index511.html";

    let html;
    try { html = await fetchText(pageUrl); } catch { return []; }
    const nHtml = html.normalize("NFKC");

    // <h4>M月のイベント</h4> セクションを抽出
    const sectionRe = /<h4[^>]*>([\s\S]*?)<\/h4>([\s\S]*?)(?=<h4|<\/div>|<footer)/gi;
    let sm;
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    while ((sm = sectionRe.exec(nHtml)) !== null) {
      const header = stripTags(sm[1]).trim();
      const monthMatch = header.match(/(\d{1,2})月のイベント/);
      if (!monthMatch) continue;
      const month = Number(monthMatch[1]);
      if (month < 1 || month > 12) continue;

      // 年推定: 現在の近傍
      let year = jstNow.getUTCFullYear();
      const candidate = new Date(year, month - 1, 15);
      if (candidate - jstNow > 180 * 86400000) year--;
      if (jstNow - candidate > 180 * 86400000) year++;

      // <li> からイベントを抽出
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let lm;
      while ((lm = liRe.exec(sm[2])) !== null) {
        const liHtml = lm[1];
        const liText = stripTags(liHtml).trim();

        // タイトル抽出: <a>タグのテキスト or liテキスト全体
        const aMatch = liHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
        let title = aMatch ? stripTags(aMatch[1]).trim() : liText;
        title = title.replace(/\[PDF[^\]]*\]/gi, "").trim();
        if (!title || title.length < 2) continue;

        // 日付抽出: M/D(曜)、D(曜) パターン (複数日対応)
        // "3/5(木)、17(火)" → [5, 17]
        const dateText = liText.match(/^(\d{1,2})\/(\d{1,2})\s*[(（][^)）]*[)）](?:[、,]\s*(\d{1,2})\s*[(（][^)）]*[)）])*/);
        if (!dateText) continue;

        const days = [];
        // 最初の日
        days.push(Number(dateText[2]));
        // 追加日 (M/D(曜)、D(曜) の D部分)
        const extraDayRe = /、\s*(\d{1,2})\s*[(（]/g;
        let edm;
        while ((edm = extraDayRe.exec(liText)) !== null) {
          days.push(Number(edm[1]));
        }

        const timeRange = parseTimeRangeFromText(liText);

        for (const day of days) {
          if (day < 1 || day > 31) continue;
          const eventDate = { y: year, mo: month, d: day };
          if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;
          await addEventRecord(byId, {
            sourceObj, eventDate, title, url: pageUrl,
            venue, rawAddress: `群馬県高崎市田町71`,
            timeRange, cityName, prefixLabel,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[高崎市なんでもセンター] ${results.length} events collected`);
    return results;
  };
}


// ---- 桐生市 子育て支援センター イベントコレクター ----
// インデックスページから全リンクを辿り、各サブページの令和N年M月D日を抽出
function createCollectKiryuShienCenterEvents(deps) {
  const { KIRYU_SOURCE } = require("../../config/wards");
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const sourceObj = KIRYU_SOURCE;
  const cityName = "桐生市";
  const prefixLabel = "桐生市";

  return async function collectKiryuShienCenterEvents(maxDays) {
    const byId = new Map();
    const indexUrl = "https://www.city.kiryu.lg.jp/kosodate/spot/1025228/1025330/index.html";
    const extraPages = [
      { title: "Baby cafe 離乳食試食会・相談", url: "https://www.city.kiryu.lg.jp/kosodate/1009668/1008597/1024907.html" },
    ];

    let html;
    try { html = await fetchText(indexUrl); } catch { return []; }

    // インデックスからサブページリンクを収集
    const linkRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    const links = [];
    while ((lm = linkRe.exec(html)) !== null) {
      const href = lm[1].replace(/&amp;/g, "&").trim();
      const text = stripTags(lm[2]).trim();
      if (!href || !text || text.length < 2) continue;
      if (/\.pdf$/i.test(href) || /index\.html$/.test(href)) continue;
      let absUrl;
      try { absUrl = new URL(href, indexUrl).href; } catch { continue; }
      if (/\/kosodate\/spot\/1025228\//.test(absUrl)) {
        links.push({ title: text, url: absUrl });
      }
    }
    // 追加ページも含める
    for (const ep of extraPages) {
      links.push(ep);
    }

    // 各サブページをバッチ取得
    const uniqueUrls = [...new Set(links.map(l => l.url))].slice(0, 60);
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
        ? detail.allDates : detail.eventDate ? [detail.eventDate] : [];

      let title = link.title;
      if (!title) continue;
      // タイトルから括弧や「要申込」等を除去
      title = title.replace(/\s*[(（][^)）]*[)）]\s*$/, "").trim();

      for (const eventDate of dates) {
        if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;
        let venue = sanitizeVenueText(detail.venue || "");
        if (venue && isJunkVenueName(venue)) venue = "";
        if (!venue) venue = "桐生市保健福祉会館";
        const rawAddress = sanitizeAddressText(detail.address || "");
        await addEventRecord(byId, {
          sourceObj, eventDate, title, url: link.url,
          venue, rawAddress, timeRange: detail.timeRange,
          cityName, prefixLabel,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[桐生市子育て支援センター] ${results.length} events collected`);
    return results;
  };
}


// ---- 中之条町 定期イベントコレクター ----
// 母と子の健康相談: 毎週木曜日 13:00-16:00
function createCollectNakanojoRecurringEvents(deps) {
  const { NAKANOJO_SOURCE } = require("../../config/wards");
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const sourceObj = NAKANOJO_SOURCE;
  const cityName = "中之条町";
  const prefixLabel = "吾妻郡中之条町";

  return async function collectNakanojoRecurringEvents(maxDays) {
    const days = Math.min(Math.max(Number(maxDays) || 30, 1), 90);
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = new Date(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate());
    const rangeEnd = new Date(today.getTime() + days * 86400000);
    const byId = new Map();

    // 毎週木曜日を生成 (dayOfWeek=4)
    const events = [
      { title: "母と子の健康相談", dayOfWeek: 4, venue: "中之条町保健センター",
        url: "https://www.town.nakanojo.gunma.jp/site/kosodate/1395.html",
        timeRange: { startH: 13, startM: 0, endH: 16, endM: 0 } },
    ];

    for (const ev of events) {
      // 今日から最初の該当曜日を求める
      let d = new Date(today);
      const diff = (ev.dayOfWeek - d.getDay() + 7) % 7;
      d = new Date(d.getTime() + (diff || 7) * 86400000); // diff=0の場合は来週
      // 今日が該当曜日ならば今日も含める
      if (today.getDay() === ev.dayOfWeek) d = new Date(today);

      while (d < rangeEnd) {
        const eventDate = { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() };
        await addEventRecord(byId, {
          sourceObj, eventDate, title: ev.title, url: ev.url,
          venue: ev.venue, rawAddress: `群馬県吾妻郡中之条町中之条町1091`,
          timeRange: ev.timeRange, cityName, prefixLabel,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
        d = new Date(d.getTime() + 7 * 86400000);
      }
    }

    const results = Array.from(byId.values());
    console.log(`[中之条町] ${results.length} events collected (recurring)`);
    return results;
  };
}


// ---- 下仁田町 クロス行テーブルコレクター ----
// ふれあい広場: 月行と日行が別々の<tr>にあるテーブル
function createCollectShimonitaCrossRowEvents(deps) {
  const { SHIMONITA_SOURCE } = require("../../config/wards");
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const sourceObj = SHIMONITA_SOURCE;
  const cityName = "下仁田町";
  const prefixLabel = "甘楽郡下仁田町";

  return async function collectShimonitaCrossRowEvents(maxDays) {
    const byId = new Map();
    const pageUrl = "https://www.town.shimonita.lg.jp/hoken-kankyo/m01/m03/m02/20210409153629.html";

    let html;
    try { html = await fetchText(pageUrl); } catch { return []; }
    const nHtml = html.normalize("NFKC");

    // テーブルを全て取得し、クロス行パターンを検出
    const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    while ((tableMatch = tableRe.exec(nHtml)) !== null) {
      const tableHtml = tableMatch[1];
      const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const rows = [];
      let trm;
      while ((trm = trRe.exec(tableHtml)) !== null) {
        const cellRe = /<t[dh][^>]*(?:\s+colspan="(\d+)")?[^>]*>([\s\S]*?)<\/t[dh]>/gi;
        const cells = [];
        let cm;
        while ((cm = cellRe.exec(trm[1])) !== null) {
          const colspan = cm[1] ? Number(cm[1]) : 1;
          const text = stripTags(cm[2]).trim();
          cells.push({ text, colspan });
        }
        rows.push(cells);
      }

      // 年度行 + 月行 + 日行 のパターンを検出
      // パターン: 年行(2セル: 令和7年, 令和8年) + 月行(12セル: 4月...3月) + 日行(12セル: D日...)
      for (let ri = 0; ri < rows.length - 2; ri++) {
        const yearRow = rows[ri];
        const monthRow = rows[ri + 1];
        const dayRow = rows[ri + 2];

        // 年度行: 令和N年を含むセルが少なくとも1つ
        const years = [];
        let hasYear = false;
        for (const cell of yearRow) {
          const ym = cell.text.match(/令和\s*(\d{1,2})\s*年/);
          if (ym) {
            hasYear = true;
            years.push(2018 + Number(ym[1]));
          }
        }
        if (!hasYear) continue;

        // 月行: 各セルが「M月」
        const months = [];
        let allMonth = true;
        for (const cell of monthRow) {
          const mm = cell.text.match(/^(\d{1,2})月$/);
          if (mm) {
            months.push(Number(mm[1]));
          } else if (/^\s*$/.test(cell.text)) {
            months.push(0);
          } else {
            allMonth = false;
            break;
          }
        }
        if (!allMonth || months.length < 3) continue;

        // 日行: 各セルが「D日」
        const daysArr = [];
        for (const cell of dayRow) {
          const dm = cell.text.match(/^(\d{1,2})日$/);
          daysArr.push(dm ? Number(dm[1]) : 0);
        }

        // 年を月に対応付け: 年度ベース (4-12月=1番目の年, 1-3月=2番目の年)
        // 年行セル数 < 月行セル数の場合は年度推定
        const yearForMonth = [];
        if (years.length >= 2) {
          for (const mo of months) {
            yearForMonth.push(mo >= 4 ? years[0] : years[1]);
          }
        } else {
          // 年が1つしかない場合は年度推定
          for (const mo of months) {
            yearForMonth.push(mo >= 4 ? years[0] : years[0] + 1);
          }
        }

        // 月と日を組み合わせて日付を生成
        const len = Math.min(months.length, daysArr.length, yearForMonth.length);
        for (let i = 0; i < len; i++) {
          const mo = months[i];
          const d = daysArr[i];
          const y = yearForMonth[i];
          if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2020) continue;
          const eventDate = { y, mo, d };
          if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;
          await addEventRecord(byId, {
            sourceObj, eventDate, title: "ふれあい広場", url: pageUrl,
            venue: "下仁田町保健センター", rawAddress: `群馬県甘楽郡下仁田町下仁田111`,
            timeRange: null, cityName, prefixLabel,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[下仁田町] ${results.length} events collected (cross-row)`);
    return results;
  };
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
  // 新規スケジュール表コレクター
  createCollectNumataScheduleEvents,
  createCollectKawabaScheduleEvents,
  createCollectShimonitaScheduleEvents,
  createCollectChiyodaGunmaScheduleEvents,
  createCollectFujiokaGunmaScheduleEvents,
  createCollectTamamuraScheduleEvents,
  createCollectKanraScheduleEvents,
  createCollectAnnakaScheduleEvents,
  createCollectHigashiagatsumaScheduleEvents,
  // 板倉町カレンダーコレクター
  createCollectItakuraCalendarEvents,
  // 人口比改善コレクター
  createCollectMidoriScheduleEvents,
  createCollectOizumiScheduleEvents,
  createCollectOtaKodomokanEvents,
  // 人口比改善コレクター (第2弾)
  createCollectKiryuShienCenterEvents,
  createCollectNakanojoRecurringEvents,
  createCollectShimonitaCrossRowEvents,
  createCollectTakasakiNandemoEvents,
};
