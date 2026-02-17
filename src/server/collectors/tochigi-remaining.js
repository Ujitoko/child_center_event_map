/**
 * 栃木県 残り19自治体カスタムコレクター
 *
 * 多くの自治体はイベントカレンダーが存在しないか極めて限定的なため、
 * 子育て関連ページのスクレイピングで対応する。
 *
 * 対象:
 *   【市】宇都宮市, 足利市, 鹿沼市, 小山市, 大田原市, さくら市, 那須烏山市, 下野市
 *   【町】上三川町, 益子町, 茂木町, 市貝町, 芳賀町, 壬生町, 野木町, 塩谷町,
 *        高根沢町, 那須町, 那珂川町
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

// ---- SOURCE定義（栃木県） ----

const UTSUNOMIYA_SOURCE = {
  key: "utsunomiya", label: "宇都宮市",
  baseUrl: "https://www.city.utsunomiya.lg.jp",
  center: { lat: 36.5551, lng: 139.8836 },
};
const ASHIKAGA_SOURCE = {
  key: "ashikaga", label: "足利市",
  baseUrl: "https://www.city.ashikaga.tochigi.jp",
  center: { lat: 36.3407, lng: 139.4499 },
};
const KANUMA_SOURCE = {
  key: "kanuma", label: "鹿沼市",
  baseUrl: "https://www.city.kanuma.tochigi.jp",
  center: { lat: 36.5667, lng: 139.7449 },
};
const OYAMA_SOURCE = {
  key: "oyama", label: "小山市",
  baseUrl: "https://www.city.oyama.tochigi.jp",
  center: { lat: 36.3145, lng: 139.8003 },
};
const OHTAWARA_SOURCE = {
  key: "ohtawara", label: "大田原市",
  baseUrl: "https://www.city.ohtawara.tochigi.jp",
  center: { lat: 36.8716, lng: 140.0148 },
};
const TOCHIGI_SAKURA_SOURCE = {
  key: "tochigi_sakura", label: "さくら市",
  baseUrl: "https://www.city.tochigi-sakura.lg.jp",
  center: { lat: 36.6851, lng: 139.9669 },
};
const NASUKARASUYAMA_SOURCE = {
  key: "nasukarasuyama", label: "那須烏山市",
  baseUrl: "https://www.city.nasukarasuyama.lg.jp",
  center: { lat: 36.6570, lng: 140.1530 },
};
const SHIMOTSUKE_SOURCE = {
  key: "shimotsuke", label: "下野市",
  baseUrl: "https://www.city.shimotsuke.lg.jp",
  center: { lat: 36.3883, lng: 139.8419 },
};
const KAMINOKAWA_SOURCE = {
  key: "kaminokawa", label: "上三川町",
  baseUrl: "https://www.town.kaminokawa.lg.jp",
  center: { lat: 36.4395, lng: 139.9100 },
};
const MASHIKO_SOURCE = {
  key: "mashiko", label: "益子町",
  baseUrl: "https://www.town.mashiko.lg.jp",
  center: { lat: 36.4650, lng: 140.0960 },
};
const MOTEGI_SOURCE = {
  key: "motegi", label: "茂木町",
  baseUrl: "https://www.town.motegi.tochigi.jp",
  center: { lat: 36.5320, lng: 140.1870 },
};
const ICHIKAI_SOURCE = {
  key: "ichikai", label: "市貝町",
  baseUrl: "https://www.town.ichikai.tochigi.jp",
  center: { lat: 36.5200, lng: 140.0940 },
};
const HAGA_SOURCE = {
  key: "haga", label: "芳賀町",
  baseUrl: "https://www.town.tochigi-haga.lg.jp",
  center: { lat: 36.5430, lng: 140.0240 },
};
const MIBU_SOURCE = {
  key: "mibu", label: "壬生町",
  baseUrl: "https://www.town.mibu.tochigi.jp",
  center: { lat: 36.4230, lng: 139.8070 },
};
const NOGI_SOURCE = {
  key: "nogi", label: "野木町",
  baseUrl: "https://www.town.nogi.lg.jp",
  center: { lat: 36.2310, lng: 139.7380 },
};
const SHIOYA_SOURCE = {
  key: "shioya", label: "塩谷町",
  baseUrl: "https://www.town.shioya.tochigi.jp",
  center: { lat: 36.7640, lng: 139.8530 },
};
const TAKANEZAWA_SOURCE = {
  key: "takanezawa", label: "高根沢町",
  baseUrl: "https://www.town.takanezawa.tochigi.jp",
  center: { lat: 36.6260, lng: 139.9840 },
};
const NASU_SOURCE = {
  key: "nasu", label: "那須町",
  baseUrl: "https://www.town.nasu.lg.jp",
  center: { lat: 37.0200, lng: 140.1170 },
};
const TOCHIGI_NAKAGAWA_SOURCE = {
  key: "tochigi_nakagawa", label: "那珂川町",
  baseUrl: "https://www.town.tochigi-nakagawa.lg.jp",
  center: { lat: 36.7250, lng: 140.1620 },
};


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

/** 会場テキストから括弧内の住所を抽出 */
function extractEmbeddedAddressFromVenue(venue, cityName) {
  if (!venue) return [];
  const results = [];
  const parenMatches = venue.match(/[（(]([^）)]{3,60})[）)]/g) || [];
  for (const m of parenMatches) {
    const inner = m.slice(1, -1);
    if (/[0-9０-９]+[-ー－][0-9０-９]+|[0-9０-９]+番地|[0-9０-９]+丁目/.test(inner)) {
      let addr = /栃木県/.test(inner) ? inner
        : inner.includes(cityName) ? `栃木県${inner}`
        : `栃木県${cityName}${inner}`;
      results.push(addr);
    }
  }
  return results;
}

/** ジオコーディング候補を生成 */
function buildGeoCandidatesForCity(cityName, venue, address, prefixLabel) {
  const candidates = [];
  // 会場テキスト内の括弧住所を抽出（最優先）
  const embeddedAddrs = extractEmbeddedAddressFromVenue(venue, cityName);
  for (const ea of embeddedAddrs) candidates.push(ea);
  if (address) {
    const full = address.includes(cityName) ? address : `${cityName}${address}`;
    candidates.push(`栃木県${full}`);
  }
  if (venue) {
    candidates.push(`栃木県${prefixLabel || cityName} ${venue}`);
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
        const full = /栃木県/.test(fmAddr) ? fmAddr : `栃木県${fmAddr}`;
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


// ---- ファクトリー関数群 ----

// 【市】

function createCollectUtsunomiyaEvents(deps) {
  return createKosodatePageCollector(UTSUNOMIYA_SOURCE, {
    cityName: "宇都宮市", prefixLabel: "宇都宮市",
    urls: [
      "https://www.city.utsunomiya.lg.jp/event/",
      "https://www.city.utsunomiya.lg.jp/kosodate/",
    ],
  }, deps);
}

function createCollectAshikagaEvents(deps) {
  return createKosodatePageCollector(ASHIKAGA_SOURCE, {
    cityName: "足利市", prefixLabel: "足利市",
    urls: [
      "https://www.city.ashikaga.tochigi.jp/viewer/calendar-monthly.html",
      "https://www.city.ashikaga.tochigi.jp/health/000035/index.html",
    ],
  }, deps);
}

function createCollectKanumaEvents(deps) {
  return createKosodatePageCollector(KANUMA_SOURCE, {
    cityName: "鹿沼市", prefixLabel: "鹿沼市",
    urls: [
      "https://www.city.kanuma.tochigi.jp/viewer/calendar-monthly.html",
      "https://www.city.kanuma.tochigi.jp/0029/genre1-0-001.html",
    ],
  }, deps);
}

function createCollectOyamaEvents(deps) {
  return createKosodatePageCollector(OYAMA_SOURCE, {
    cityName: "小山市", prefixLabel: "小山市",
    urls: [
      "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/",
      "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/",
      "https://www.city.oyama.tochigi.jp/news.php?type=2",
    ],
  }, deps);
}

function createCollectOhtawaraEvents(deps) {
  return createKosodatePageCollector(OHTAWARA_SOURCE, {
    cityName: "大田原市", prefixLabel: "大田原市",
    urls: [
      "https://www.city.ohtawara.tochigi.jp/lifeevent/child.html",
      "https://www.city.ohtawara.tochigi.jp/category/zokusei/event/more.html",
    ],
  }, deps);
}

function createCollectTochigiSakuraEvents(deps) {
  return createKosodatePageCollector(TOCHIGI_SAKURA_SOURCE, {
    cityName: "さくら市", prefixLabel: "さくら市",
    urls: [
      "https://www.city.tochigi-sakura.lg.jp/viewer/calendar-monthly.html",
      "https://www.city.tochigi-sakura.lg.jp/education/000036/index.html",
    ],
  }, deps);
}

function createCollectNasukarasuyamaEvents(deps) {
  return createKosodatePageCollector(NASUKARASUYAMA_SOURCE, {
    cityName: "那須烏山市", prefixLabel: "那須烏山市",
    urls: [
      "https://www.city.nasukarasuyama.lg.jp/page/dir000039.html",
      "https://www.city.nasukarasuyama.lg.jp/news.php?type=1",
    ],
  }, deps);
}

function createCollectShimotsukeEvents(deps) {
  return createKosodatePageCollector(SHIMOTSUKE_SOURCE, {
    cityName: "下野市", prefixLabel: "下野市",
    urls: [
      "https://www.city.shimotsuke.lg.jp/0002/genre1-3-001.html",
      "https://www.city.shimotsuke.lg.jp/viewer/calendar-monthly.html?idSubTop=3",
    ],
  }, deps);
}

// 【町】

function createCollectKaminokawaEvents(deps) {
  return createKosodatePageCollector(KAMINOKAWA_SOURCE, {
    cityName: "上三川町", prefixLabel: "河内郡上三川町",
    urls: [
      "https://www.town.kaminokawa.lg.jp/0016/genre1-0-001.html",
      "https://www.town.kaminokawa.lg.jp/viewer/calendar-monthly.html",
    ],
  }, deps);
}

function createCollectMashikoEvents(deps) {
  return createKosodatePageCollector(MASHIKO_SOURCE, {
    cityName: "益子町", prefixLabel: "芳賀郡益子町",
    urls: [
      "https://www.town.mashiko.lg.jp/page/dir003566.html",
      "https://www.town.mashiko.lg.jp/cal.php",
    ],
  }, deps);
}

function createCollectMotegiEvents(deps) {
  return createKosodatePageCollector(MOTEGI_SOURCE, {
    cityName: "茂木町", prefixLabel: "芳賀郡茂木町",
    urls: [
      "https://www.town.motegi.tochigi.jp/motegi/nextpage.php?cd=46726&syurui=0",
    ],
  }, deps);
}

function createCollectIchikaiEvents(deps) {
  return createKosodatePageCollector(ICHIKAI_SOURCE, {
    cityName: "市貝町", prefixLabel: "芳賀郡市貝町",
    urls: [
      "https://www.town.ichikai.tochigi.jp/mg/11",
      "https://www.town.ichikai.tochigi.jp/menu/24",
    ],
  }, deps);
}

function createCollectHagaEvents(deps) {
  return createKosodatePageCollector(HAGA_SOURCE, {
    cityName: "芳賀町", prefixLabel: "芳賀郡芳賀町",
    urls: [
      "https://www.town.tochigi-haga.lg.jp/menu/kurashi/ninshin/kosodate/index.html",
      "https://www.town.tochigi-haga.lg.jp/menu/kanko/index.html",
    ],
  }, deps);
}

function createCollectMibuEvents(deps) {
  return createKosodatePageCollector(MIBU_SOURCE, {
    cityName: "壬生町", prefixLabel: "下都賀郡壬生町",
    urls: [
      "https://www.town.mibu.tochigi.jp/category/bunya/kosodate/",
      "https://www.town.mibu.tochigi.jp/category/bunya/kosodate/kosodateshien/",
      "https://www.town.mibu.tochigi.jp/category/bunya/kosodate/jidoukan/",
    ],
  }, deps);
}

function createCollectNogiEvents(deps) {
  return createKosodatePageCollector(NOGI_SOURCE, {
    cityName: "野木町", prefixLabel: "下都賀郡野木町",
    urls: [
      "https://www.town.nogi.lg.jp/kosodate_kyouiku/",
      "https://www.town.nogi.lg.jp/viewer/calendar-monthly.html",
    ],
  }, deps);
}

function createCollectShioyaEvents(deps) {
  return createKosodatePageCollector(SHIOYA_SOURCE, {
    cityName: "塩谷町", prefixLabel: "塩谷郡塩谷町",
    urls: [
      "https://www.town.shioya.tochigi.jp/menu/56",
      "https://www.town.shioya.tochigi.jp/menu/11",
    ],
  }, deps);
}

function createCollectTakanezawaEvents(deps) {
  return createKosodatePageCollector(TAKANEZAWA_SOURCE, {
    cityName: "高根沢町", prefixLabel: "塩谷郡高根沢町",
    urls: [
      "https://www.town.takanezawa.tochigi.jp/kosodate/",
      "https://www.town.takanezawa.tochigi.jp/kosodate/index.html",
    ],
  }, deps);
}

function createCollectNasuEvents(deps) {
  return createKosodatePageCollector(NASU_SOURCE, {
    cityName: "那須町", prefixLabel: "那須郡那須町",
    urls: [
      "https://www.town.nasu.lg.jp/0018/genre1-1-001.html",
      "https://www.town.nasu.lg.jp/viewer/calendar-monthly.html?idSubTop=1",
    ],
  }, deps);
}

function createCollectTochigiNakagawaEvents(deps) {
  return createKosodatePageCollector(TOCHIGI_NAKAGAWA_SOURCE, {
    cityName: "那珂川町", prefixLabel: "那須郡那珂川町",
    urls: [
      "https://www.town.tochigi-nakagawa.lg.jp/life/kosodate_kyouiku",
      "https://www.town.tochigi-nakagawa.lg.jp/01event/01calendar/event_calendar.html",
    ],
  }, deps);
}


module.exports = {
  // 市
  createCollectUtsunomiyaEvents,
  createCollectAshikagaEvents,
  createCollectKanumaEvents,
  createCollectOyamaEvents,
  createCollectOhtawaraEvents,
  createCollectTochigiSakuraEvents,
  createCollectNasukarasuyamaEvents,
  createCollectShimotsukeEvents,
  // 町
  createCollectKaminokawaEvents,
  createCollectMashikoEvents,
  createCollectMotegiEvents,
  createCollectIchikaiEvents,
  createCollectHagaEvents,
  createCollectMibuEvents,
  createCollectNogiEvents,
  createCollectShioyaEvents,
  createCollectTakanezawaEvents,
  createCollectNasuEvents,
  createCollectTochigiNakagawaEvents,
  // SOURCE定義のエクスポート（他モジュールから参照用）
  UTSUNOMIYA_SOURCE,
  ASHIKAGA_SOURCE,
  KANUMA_SOURCE,
  OYAMA_SOURCE,
  OHTAWARA_SOURCE,
  TOCHIGI_SAKURA_SOURCE,
  NASUKARASUYAMA_SOURCE,
  SHIMOTSUKE_SOURCE,
  KAMINOKAWA_SOURCE,
  MASHIKO_SOURCE,
  MOTEGI_SOURCE,
  ICHIKAI_SOURCE,
  HAGA_SOURCE,
  MIBU_SOURCE,
  NOGI_SOURCE,
  SHIOYA_SOURCE,
  TAKANEZAWA_SOURCE,
  NASU_SOURCE,
  TOCHIGI_NAKAGAWA_SOURCE,
};
