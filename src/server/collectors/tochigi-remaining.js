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
const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
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
  center: { lat: 36.5725, lng: 139.7500 },
};
const OYAMA_SOURCE = {
  key: "oyama", label: "小山市",
  baseUrl: "https://www.city.oyama.tochigi.jp",
  center: { lat: 36.3198, lng: 139.7961 },
};
const OHTAWARA_SOURCE = {
  key: "ohtawara", label: "大田原市",
  baseUrl: "https://www.city.ohtawara.tochigi.jp",
  center: { lat: 36.8716, lng: 140.0148 },
};
const TOCHIGI_SAKURA_SOURCE = {
  key: "tochigi_sakura", label: "さくら市",
  baseUrl: "https://www.city.tochigi-sakura.lg.jp",
  center: { lat: 36.6935, lng: 139.9690 },
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

/** 子育てイベント判定 */
/** カテゴリページ・告知ページなど実際のイベントでないタイトルを除外 */
const GENERIC_TITLE_RE = /^(?:子育て|子育て支援|子育て支援課|妊娠・出産|子育て・健康・福祉|子ども・子育て|育児|教育|健康・福祉|出産・子育て|結婚・子育て|子育て・教育|こども・教育|こども|子ども|子育て情報|子育て・子ども)$/;
const ANNOUNCEMENT_TITLE_RE = /入所申込|入園申込|入所案内|民法改正|条例改正|計画策定|パブリック[・]?コメント|意見募集|公表します|測定結果|放射性物質|申請書について|実態調査|施設一覧|についてお知らせ|応援手当|助成事業|補助します|受験料|臨時休館|休館のお知らせ|特定健診|がん検診|委員の募集|委員を募集|インフルエンザ予防接種|ロタウイルス|ヒブワクチン/;

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
  // h2/h3 見出しパターン（足利市等: <h2>会場</h2><p>施設名</p>）
  if (!venue || !address) {
    const h23Re = /<h[23][^>]*>([\s\S]*?)<\/h[23]>\s*(?:<[^>]*>\s*)*([\s\S]*?)(?=<h[2-6]|<\/div>|<div[\s>]|$)/gi;
    let hm;
    while ((hm = h23Re.exec(html)) !== null) {
      const key = stripTags(hm[1]).trim();
      const val = stripTags(hm[2]).split(/\n/)[0].trim();
      if (!val || val.length > 80) continue;
      if (!venue && /^(?:会場|場所|開催場所|ところ|実施場所)/.test(key)) venue = val;
      if (!address && /^(?:住所|所在地)/.test(key)) address = val;
    }
  }
  // h1 タイトルからの施設名推定（支援センター等のハブページ）
  // 複数の h1 がある場合があるため、全て検査する（サイトロゴ h1 を除外）
  if (!venue) {
    const h1All = html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
    for (const h1Match of h1All) {
      const h1Text = stripTags(h1Match[1]).trim();
      if (h1Text.length >= 3 && h1Text.length <= 40 && /(?:センター|児童館|保健|ひろば|会館|ホール|プラザ)/.test(h1Text)) {
        venue = h1Text;
        break;
      }
    }
  }
  // テキストベースの場所抽出（dt/dd, th/tdで見つからない場合）
  if (!venue) {
    const venueMatch = text.match(/(?:場所|会場|開催場所|ところ)\s+(.+?)(?=\s+(?:その他|内容|対象|日時|時間|問い合わせ|関連|申込|定員|費用|参加費|連絡|主催|企業|託児)|$)/u);
    if (venueMatch) venue = venueMatch[1].trim();
  }
  // 文中の施設名推定（「○○センターへお問い合わせ」等のパターン）
  if (!venue) {
    const facilityTextMatch = text.match(/([\u3040-\u9FFF\uFF00-\uFFEFー]{2,20}(?:子育て支援センター|保健センター|ふれあいセンター|福祉センター|児童館|保健福祉センター|ひろば))/u);
    if (facilityTextMatch) venue = facilityTextMatch[1];
  }
  if (!address) {
    const addrMatch = text.match(/(?:住所|所在地)\s+([^\n]{3,60})/);
    if (addrMatch) address = addrMatch[1].trim();
  }

  const eventDate = parseDateFromText(text);
  let allDates = parseDatesFromText(text);

  // bare M月D日 フォールバック: YYYY年/令和N年 形式がない場合、年度推定で M月D日 を収集
  if (allDates.length === 0) {
    const now = new Date(Date.now() + 9 * 3600000);
    const fiscalYear = (now.getUTCMonth() + 1) >= 4 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    const fyMatch = text.match(/令和\s*(\d{1,2})\s*年度/);
    const fy = fyMatch ? 2018 + Number(fyMatch[1]) : fiscalYear;
    const mdRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
    let md;
    while ((md = mdRe.exec(text)) !== null) {
      const mo = Number(md[1]);
      const d = Number(md[2]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        const y = mo >= 4 ? fy : fy + 1;
        allDates.push({ y, mo, d });
      }
    }
  }

  const timeRange = parseTimeRangeFromText(text);
  return { url, venue, address, eventDate, allDates, timeRange, text };
}

/** 会場テキストから括弧内の住所を抽出 */
function extractEmbeddedAddressFromVenue(venue, cityName, prefecture) {
  if (!venue) return [];
  const pref = prefecture || "栃木県";
  const results = [];
  const parenMatches = venue.match(/[（(]([^）)]{3,60})[）)]/g) || [];
  for (const m of parenMatches) {
    const inner = m.slice(1, -1);
    if (/[0-9０-９]+[-ー－][0-9０-９]+|[0-9０-９]+番地|[0-9０-９]+丁目/.test(inner) || (inner.includes(cityName) && /[0-9０-９]/.test(inner))) {
      let addr = /[都道府県]/.test(inner) ? inner
        : inner.includes(cityName) ? `${pref}${inner}`
        : `${pref}${cityName}${inner}`;
      results.push(addr);
    }
  }
  return results;
}

/** ジオコーディング候補を生成 */
function buildGeoCandidatesForCity(cityName, venue, address, prefixLabel, prefecture) {
  const pref = prefecture || "栃木県";
  const candidates = [];
  // 会場テキスト内の括弧住所を抽出（最優先）
  const embeddedAddrs = extractEmbeddedAddressFromVenue(venue, cityName, pref);
  for (const ea of embeddedAddrs) candidates.push(ea);
  if (address) {
    const full = address.includes(cityName) ? address : `${cityName}${address}`;
    candidates.push(/[都道府県]/.test(full) ? full : `${pref}${full}`);
  }
  if (venue) {
    candidates.push(`${pref}${prefixLabel || cityName} ${venue}`);
  }
  return [...new Set(candidates)];
}

/** イベントレコードを生成して byId Map に追加 */
function addEventRecord(byId, {
  sourceObj, eventDate, title, url, venue, rawAddress, timeRange, cityName, prefixLabel,
  prefecture,
  geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
}) {
  const pref = prefecture || "栃木県";
  const source = `ward_${sourceObj.key}`;
  const label = sourceObj.label;
  const dateKey = `${eventDate.y}${String(eventDate.mo).padStart(2, "0")}${String(eventDate.d).padStart(2, "0")}`;
  const id = `${source}:${url}:${title}:${dateKey}`;
  if (byId.has(id)) return;

  return (async () => {
    let geoCandidates = buildGeoCandidatesForCity(cityName, venue, rawAddress, prefixLabel, pref);
    if (getFacilityAddressFromMaster && venue) {
      const fmAddr = getFacilityAddressFromMaster(sourceObj.key, venue);
      if (fmAddr) {
        const full = /[都道府県]/.test(fmAddr) ? fmAddr : `${pref}${fmAddr}`;
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


// ---- ファクトリー関数群 ----

// 【市】

/**
 * 宇都宮市: H3見出し=会場名 + 日付リスト形式のスケジュールページをパースし、
 * kosodatePageCollector の結果とマージする。
 *
 * 対象ページ構造:
 *   <h3>東市民活動センター</h3>
 *   4月10日（木曜日）、4月23日（水曜日）...
 *   <h3>保健センター</h3>
 *   4月22日（火曜日）...
 */
function createCollectUtsunomiyaEvents(deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = UTSUNOMIYA_SOURCE;
  const cityName = "宇都宮市";
  const prefixLabel = "宇都宮市";

  // 会場H3見出しと認識するパターン
  const VENUE_HINT_RE = /センター|保健|活動|地区|児童|ひろば|プラザ|会館|市民|福祉|図書/;
  const SKIP_HEADING_RE = /受付時間|対象|持ち物|注意|問い合わせ|お知らせ|内容|備考|目次|関連|担当|このページ|ページの先頭/;

  // H3ベースのスケジュールページ
  const SCHEDULE_PAGES = [
    { url: "https://www.city.utsunomiya.lg.jp/kenko/kenshin/boshi/1004364.html", title: "1歳6カ月児健康診査" },
    { url: "https://www.city.utsunomiya.lg.jp/kenko/kenshin/boshi/1004365.html", title: "3歳児健康診査" },
    { url: "https://www.city.utsunomiya.lg.jp/kenko/kenshin/boshi/1004366.html", title: "先天性股関節脱臼検診" },
    { url: "https://www.city.utsunomiya.lg.jp/kenko/kenshin/boshi/1004368.html", title: "2歳5カ月児歯科健康診査" },
    { url: "https://www.city.utsunomiya.lg.jp/kenko/kenshin/boshi/1004367.html", title: "フッ化物塗布事業" },
  ];

  /** 年度ベースで月→年を解決 */
  function resolveYearForMonth(mo, fiscalYear) {
    return mo >= 4 ? fiscalYear : fiscalYear + 1;
  }

  return async function collectUtsunomiyaEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    // --- H3ベースのスケジュールページからイベント収集 ---
    for (const page of SCHEDULE_PAGES) {
      let html;
      try {
        html = await fetchText(page.url);
      } catch (e) {
        console.warn(`[${label}] schedule page fetch failed (${page.url}):`, e.message || e);
        continue;
      }

      // 年度推定
      const text = stripTags(html);
      let fiscalYear;
      const fyMatch = text.match(/令和\s*(\d{1,2})\s*年度/);
      if (fyMatch) {
        fiscalYear = 2018 + Number(fyMatch[1]);
      } else {
        const now = new Date();
        const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        fiscalYear = (jst.getUTCMonth() + 1) >= 4 ? jst.getUTCFullYear() : jst.getUTCFullYear() - 1;
      }

      const timeRange = parseTimeRangeFromText(text);

      // H3タグで分割してパース
      const h3Parts = html.split(/<h3[^>]*>/i);
      for (let i = 1; i < h3Parts.length; i++) {
        const part = h3Parts[i];
        // H3の閉じタグまでが見出し
        const h3Close = part.indexOf("</h3>");
        if (h3Close < 0) continue;
        const heading = stripTags(part.substring(0, h3Close)).trim();

        // 会場名として有効かチェック
        if (!heading || heading.length < 2 || heading.length > 40) continue;
        if (SKIP_HEADING_RE.test(heading)) continue;
        if (!VENUE_HINT_RE.test(heading)) continue;

        const venue = sanitizeVenueText(heading);
        // H3の後、次のH2/H3/divまでのテキストから日付を抽出
        const afterH3 = part.substring(h3Close + 5);
        const blockEnd = afterH3.search(/<h[2-3]|<div\s+class="inquiry|<div\s+class="footer/i);
        const block = blockEnd > 0 ? afterH3.substring(0, blockEnd) : afterH3.substring(0, 2000);
        const blockText = stripTags(block);

        // M月D日パターンを抽出
        const dateRe = /(\d{1,2})月\s*(\d{1,2})日/g;
        let dm;
        const promises = [];
        while ((dm = dateRe.exec(blockText)) !== null) {
          const mo = Number(dm[1]);
          const d = Number(dm[2]);
          if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
          const y = resolveYearForMonth(mo, fiscalYear);

          if (!inRangeJst(y, mo, d, maxDays)) continue;

          promises.push(addEventRecord(byId, {
            sourceObj, eventDate: { y, mo, d },
            title: page.title, url: page.url,
            venue, rawAddress: "",
            timeRange,
            cityName, prefixLabel,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          }));
        }
        await Promise.all(promises.filter(Boolean));
      }
    }

    // --- <strong>タグベースのスケジュールページ（会場名がstrongで区切り） ---
    const STRONG_PAGES = [
      { url: "https://www.city.utsunomiya.lg.jp/kenko/kenshin/boshi/1004372.html", title: "親子の健康・栄養相談" },
      { url: "https://www.city.utsunomiya.lg.jp/kenko/kenshin/boshi/1013510.html", title: "離乳食教室" },
    ];
    for (const page of STRONG_PAGES) {
      let html;
      try { html = await fetchText(page.url); } catch (e) {
        console.warn(`[${label}] strong page fetch failed (${page.url}):`, e.message || e);
        continue;
      }
      const nHtml = html.normalize("NFKC");
      const text = stripTags(nHtml);
      const fyMatch = text.match(/令和\s*(\d{1,2})\s*年度/);
      const fy = fyMatch ? 2018 + Number(fyMatch[1]) : resolveYearForMonth(4, 0) - 1;
      const timeRange = parseTimeRangeFromText(text);

      // <strong>で区切られたセクションを処理
      // テキストを「会場名（strongタグ）→ 日付リスト」に分割
      const strongRe = /<strong>([^<]{3,60})<\/strong>/gi;
      let sm;
      const sections = [];
      while ((sm = strongRe.exec(nHtml)) !== null) {
        const rawVenue = stripTags(sm[1]).normalize("NFKC").trim();
        if (/センター|活動|市民|地区|保健|プラザ/.test(rawVenue)) {
          sections.push({ venue: rawVenue.replace(/\([^)]*\)/g, "").replace(/（[^）]*）/g, "").replace(/:.*/, "").trim(), startIdx: sm.index + sm[0].length });
        }
      }

      // 各セクションのテキストから日付を抽出（次のセクションまで）
      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si];
        const endIdx = si + 1 < sections.length ? sections[si + 1].startIdx : nHtml.length;
        const sectionText = stripTags(nHtml.substring(sec.startIdx, Math.min(endIdx, sec.startIdx + 2000))).normalize("NFKC");

        // 令和N年コンテキスト付きM月D日
        let currentYear = fy;
        const dateRe = /(?:令和\s*(\d{1,2})\s*年\s*)?(\d{1,2})月\s*(\d{1,2})日/g;
        let dm;
        const promises = [];
        while ((dm = dateRe.exec(sectionText)) !== null) {
          if (dm[1]) currentYear = 2018 + Number(dm[1]);
          const mo = Number(dm[2]);
          const d = Number(dm[3]);
          if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
          const y = dm[1] ? currentYear : resolveYearForMonth(mo, fy);
          if (!inRangeJst(y, mo, d, maxDays)) continue;
          const venue = sanitizeVenueText(sec.venue);
          promises.push(addEventRecord(byId, {
            sourceObj, eventDate: { y, mo, d },
            title: page.title, url: page.url,
            venue, rawAddress: "",
            timeRange,
            cityName, prefixLabel,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          }));
        }
        await Promise.all(promises.filter(Boolean));
      }

      // strong外テキスト（離乳食教室のように平文に会場+日付が続くパターン）
      // 「保健センター(トナリエ宇都宮9階):先着26組」のような行の後に日付
      const plainVenueRe = /([\u4e00-\u9fff]{2,}(?:センター|地区市民センター)(?:\([^)]*\))?)[：:]?[^\n]{0,20}\n/g;
      // このパターンは strong タグ版で既に処理しているので追加不要
    }

    // --- 子育てページからも並行収集（児童館、子育てサロン等） ---
    const kosodateCollector = createKosodatePageCollector(sourceObj, {
      cityName, prefixLabel,
      urls: [
        "https://www.city.utsunomiya.lg.jp/kosodate/",
        "https://www.city.utsunomiya.lg.jp/kosodate/kosodate/shien/index.html",
        "https://www.city.utsunomiya.lg.jp/kosodate/kosodate/jidokan/index.html",
      ],
    }, deps);
    try {
      const kosodateResults = await kosodateCollector(maxDays);
      for (const ev of kosodateResults) {
        if (!byId.has(ev.id)) byId.set(ev.id, ev);
      }
    } catch (e) {
      console.warn(`[${label}] kosodate fallback failed:`, e.message || e);
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (schedule+kosodate)`);
    return results;
  };
}

function createCollectAshikagaEvents(deps) {
  return createKosodatePageCollector(ASHIKAGA_SOURCE, {
    cityName: "足利市", prefixLabel: "足利市",
    urls: [
      "https://www.city.ashikaga.tochigi.jp/health/000035/000204/index.html",
      "https://www.city.ashikaga.tochigi.jp/health/000035/index.html",
      "https://www.city.ashikaga.tochigi.jp/health/000041/000220/index.html", // 子育て支援センター
      "https://www.city.ashikaga.tochigi.jp/health/000041/000220/p001865.html", // さいこう支援センター
      "https://www.city.ashikaga.tochigi.jp/health/000041/000220/p001870.html", // にし支援センター
      "https://www.city.ashikaga.tochigi.jp/health/000041/000220/p001871.html", // やまがわ支援センター
    ],
  }, deps);
}

function createCollectKanumaEvents(deps) {
  return createKosodatePageCollector(KANUMA_SOURCE, {
    cityName: "鹿沼市", prefixLabel: "鹿沼市",
    urls: [
      "https://www.city.kanuma.tochigi.jp/0030/genre1-0-001.html",
      "https://www.city.kanuma.tochigi.jp/0183/genre2-0-001.html",
      "https://www.city.kanuma.tochigi.jp/0029/genre1-0-001.html",
      "https://www.city.kanuma.tochigi.jp/viewer/calendar-monthly.html",
    ],
  }, deps);
}

function createCollectOyamaEvents(deps) {
  return createKosodatePageCollector(OYAMA_SOURCE, {
    cityName: "小山市", prefixLabel: "小山市",
    urls: [
      "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/",
      "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/",
      "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/shussan/",
      "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/ninshin/",
      "https://www.city.oyama.tochigi.jp/news.php?type=2",
      "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page000528.html", // 乳児健康診査
      "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page000488.html", // 9か月児健康相談
      "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page000395.html", // 離乳食教室
      "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/ninshin/page000396.html",       // マタニティクラス
    ],
  }, deps);
}

function createCollectOhtawaraEvents(deps) {
  return createKosodatePageCollector(OHTAWARA_SOURCE, {
    cityName: "大田原市", prefixLabel: "大田原市",
    urls: [
      "https://www.city.ohtawara.tochigi.jp/lifeevent/child.html",
      "https://www.city.ohtawara.tochigi.jp/unit/health/kodomo/more.html",
      "https://www.city.ohtawara.tochigi.jp/category/bunya/life/child-rearing/more@docs-shinchaku.html",
    ],
  }, deps);
}

function createCollectTochigiSakuraEvents(deps) {
  return createKosodatePageCollector(TOCHIGI_SAKURA_SOURCE, {
    cityName: "さくら市", prefixLabel: "さくら市",
    urls: [
      "https://www.city.tochigi-sakura.lg.jp/viewer/calendar-monthly.html",
      "https://www.city.tochigi-sakura.lg.jp/education/000036/index.html",
      "https://www.city.tochigi-sakura.lg.jp/education/000036/000218/index.html",
      "https://www.city.tochigi-sakura.lg.jp/education/000036/000220/index.html",
      "https://www.city.tochigi-sakura.lg.jp/education/000036/000222/p003065.html",
    ],
  }, deps);
}

function createCollectNasukarasuyamaEvents(deps) {
  return createKosodatePageCollector(NASUKARASUYAMA_SOURCE, {
    cityName: "那須烏山市", prefixLabel: "那須烏山市",
    urls: [
      "https://www.city.nasukarasuyama.lg.jp/page/dir000039.html",
      "https://www.city.nasukarasuyama.lg.jp/news.php?type=1",
      "https://www.city.nasukarasuyama.lg.jp/news_kosodate.php",
      "https://www.city.nasukarasuyama.lg.jp/page/page003261.html",
      "https://www.city.nasukarasuyama.lg.jp/page/dir000103.html",
    ],
  }, deps);
}

function createCollectShimotsukeEvents(deps) {
  return createKosodatePageCollector(SHIMOTSUKE_SOURCE, {
    cityName: "下野市", prefixLabel: "下野市",
    urls: [
      "https://www.city.shimotsuke.lg.jp/0002/genre1-3-001.html",
      "https://www.city.shimotsuke.lg.jp/viewer/calendar-monthly.html?idSubTop=3",
      "https://www.city.shimotsuke.lg.jp/0484/info-0000007710-3.html",
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
      "https://www.town.nogi.lg.jp/kosodate_kyouiku/kosodate_shien/",
      "https://www.town.nogi.lg.jp/kosodate_kyouiku/kenshin_houmon/page006367.html",
      "https://www.town.nogi.lg.jp/kosodate_kyouiku/ninshin_syussan/",
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


// ---- 鹿沼市カレンダーコレクター ----

/**
 * 鹿沼市イベントカレンダーのリスト表示からイベントを収集。
 * kosodatePageCollector ではカレンダーの日付を拾えないため、
 * リスト表示 (display_type_list) を直接パースする。
 */
function createCollectKanumaCalendarEvents(deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = KANUMA_SOURCE;
  const cityName = "鹿沼市";
  const prefixLabel = "鹿沼市";

  /** 鹿沼市の詳細ページから情報を抽出 */
  async function fetchKanumaDetailInfo(url) {
    const html = await fetchText(url);
    const text = stripTags(html);
    let venue = "";
    let address = "";
    let timeRange = null;

    // <h3>とき</h3> の次の <p> or テキスト → 日時
    // <h3>ところ</h3> の次の <p> or テキスト → 会場
    const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*([\s\S]*?)(?=<h3|<\/div>|<div\s|$)/gi;
    let hm;
    while ((hm = h3Re.exec(html)) !== null) {
      const key = stripTags(hm[1]).trim();
      const val = stripTags(hm[2]).trim();
      if (!val) continue;
      if (/^(?:とき|日時|開催日)/.test(key)) {
        timeRange = timeRange || parseTimeRangeFromText(val);
      }
      if (/^(?:ところ|場所|会場|開催場所)/.test(key) && !venue) {
        venue = sanitizeVenueText(val);
      }
    }

    // dt/dd パターン (フォールバック)
    if (!venue || !address) {
      const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
      let mm;
      while ((mm = metaRe.exec(html)) !== null) {
        const k = stripTags(mm[1]);
        const v = stripTags(mm[2]);
        if (!k || !v) continue;
        if (!venue && /(会場|場所|ところ)/.test(k)) venue = sanitizeVenueText(v);
        if (!address && /(住所|所在地)/.test(k)) address = v;
      }
    }

    // inquiry-box の住所
    if (!address) {
      const addrMatch = html.match(/住所[：:]\s*<\/div>\s*<div[^>]*>\s*([\s\S]*?)<\/div>/i);
      if (addrMatch) address = stripTags(addrMatch[1]).trim();
    }
    // テキストベースの住所抽出
    if (!address) {
      const addrMatch2 = text.match(/〒\d{3}-\d{4}\s*(.+?)(?=\s*(?:電話|TEL|FAX|問|$))/);
      if (addrMatch2) address = addrMatch2[1].trim();
    }

    if (!timeRange) timeRange = parseTimeRangeFromText(text);

    return { url, venue, address, timeRange };
  }

  return async function collectKanumaCalendarEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    // 今月 + 来月の2ヶ月分
    const months = [
      { y: jstNow.getUTCFullYear(), m: jstNow.getUTCMonth() + 1 },
    ];
    const nextM = jstNow.getUTCMonth() + 2;
    if (nextM > 12) {
      months.push({ y: jstNow.getUTCFullYear() + 1, m: 1 });
    } else {
      months.push({ y: jstNow.getUTCFullYear(), m: nextM });
    }

    // イベントリンク収集 (URL→日付のマッピング)
    const eventsByUrl = new Map(); // url -> { title, dates: Set }

    for (const { y, m } of months) {
      const calUrl = `https://www.city.kanuma.tochigi.jp/viewer/calendar-monthly.html?date=${y}/${m}/1&T_Display_Type=display_type_list`;
      let html;
      try {
        html = await fetchText(calUrl);
      } catch (e) {
        console.warn(`[${label}] calendar fetch failed (${calUrl}):`, e.message || e);
        continue;
      }

      // カレンダーのイベントセルをパース
      // 構造: <a class="bar-event" href="../XXXX/info-XXXX.html">
      //          <span class="page-date">YYYY年M月D日</span>
      //          <span class="page-title">タイトル</span>
      //        </a>
      const eventLinkRe = /<a\s+[^>]*href="([^"]*info-[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let lm;
      while ((lm = eventLinkRe.exec(html)) !== null) {
        const href = lm[1].replace(/&amp;/g, "&").trim();
        const innerHtml = lm[2];

        // page-date からYYYY年M月D日を抽出
        const dateSpan = innerHtml.match(/<span[^>]*class="page-date"[^>]*>([\s\S]*?)<\/span>/i);
        if (!dateSpan) continue;
        const dateText = stripTags(dateSpan[1]).trim();
        const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (!dateMatch) continue;
        const dateObj = {
          y: Number(dateMatch[1]),
          mo: Number(dateMatch[2]),
          d: Number(dateMatch[3]),
        };

        if (!inRangeJst(dateObj.y, dateObj.mo, dateObj.d, maxDays)) continue;

        // page-title からタイトルを抽出
        const titleSpan = innerHtml.match(/<span[^>]*class="page-title"[^>]*>([\s\S]*?)<\/span>/i);
        const title = titleSpan ? stripTags(titleSpan[1]).trim() : stripTags(innerHtml).trim();
        if (!title || title.length < 2) continue;
        if (!isChildEvent(title, "")) continue;

        let absUrl;
        try {
          absUrl = new URL(href, `https://www.city.kanuma.tochigi.jp/viewer/`).href;
        } catch {
          absUrl = `https://www.city.kanuma.tochigi.jp${href.replace(/^\.\./, "")}`;
        }

        if (!eventsByUrl.has(absUrl)) {
          eventsByUrl.set(absUrl, { title, dates: [] });
        }
        const entry = eventsByUrl.get(absUrl);
        const dateKey = `${dateObj.y}-${dateObj.mo}-${dateObj.d}`;
        if (!entry.dates.some(d => `${d.y}-${d.mo}-${d.d}` === dateKey)) {
          entry.dates.push(dateObj);
        }
      }
    }

    // 詳細ページをバッチ取得
    const urls = [...eventsByUrl.keys()].slice(0, 30);
    const detailMap = new Map();
    for (let i = 0; i < urls.length; i += DETAIL_BATCH_SIZE) {
      const batch = urls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(u => fetchKanumaDetailInfo(u)));
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const promises = [];
    for (const [url, { title, dates }] of eventsByUrl) {
      const detail = detailMap.get(url) || {};
      const venue = detail.venue || "";
      const rawAddress = sanitizeAddressText(detail.address || "");
      const timeRange = detail.timeRange || null;

      for (const dateObj of dates) {
        promises.push(addEventRecord(byId, {
          sourceObj, eventDate: dateObj, title, url,
          venue, rawAddress, timeRange,
          cityName, prefixLabel,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        }));
      }
    }
    await Promise.all(promises.filter(Boolean));

    // 子育てページからも並行収集（カレンダーに載らないイベントを補完）
    const kosodateCollector = createKosodatePageCollector(sourceObj, {
      cityName, prefixLabel,
      urls: [
        "https://www.city.kanuma.tochigi.jp/0030/genre1-0-001.html",
        "https://www.city.kanuma.tochigi.jp/0183/genre2-0-001.html",
        "https://www.city.kanuma.tochigi.jp/0029/genre1-0-001.html",
      ],
    }, deps);
    try {
      const kosodateResults = await kosodateCollector(maxDays);
      for (const ev of kosodateResults) {
        if (!byId.has(ev.id)) byId.set(ev.id, ev);
      }
    } catch (e) {
      console.warn(`[${label}] kosodate fallback failed:`, e.message || e);
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (calendar+kosodate)`);
    return results;
  };
}


// ---- スケジュール表コレクター（佐野市・真岡市・栃木市） ----

/**
 * 固定URLのスケジュール表ページからイベントを収集する汎用コレクター。
 * 各ページの <table> から日付を抽出し、イベントレコードを生成する。
 *
 * @param {Object} sourceObj - SOURCE定義
 * @param {Object} config - { cityName, prefixLabel, prefecture, pages: [{ url, title, defaultVenue }] }
 * @param {Object} deps - DI依存
 */
function createScheduleTableCollector(sourceObj, config, deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const { cityName, prefixLabel, prefecture = "栃木県", pages } = config;

  /** 現在の年度を返す (4月始まり) */
  function currentFiscalYear() {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const m = jst.getUTCMonth() + 1;
    return m >= 4 ? y : y - 1;
  }

  /** テキストから年度を推定 */
  function inferYear(text) {
    // 令和N年度
    const reiwaFy = text.match(/令和\s*(\d{1,2})\s*年度/);
    if (reiwaFy) return 2018 + Number(reiwaFy[1]);
    // YYYY年度
    const westernFy = text.match(/(\d{4})\s*年度/);
    if (westernFy) return Number(westernFy[1]);
    // 令和N年 (年度ではないが年の参考)
    const reiwa = text.match(/令和\s*(\d{1,2})\s*年/);
    if (reiwa) return 2018 + Number(reiwa[1]);
    return null;
  }

  /** M月D日 形式の日付を年度ベースで補完 */
  function resolveMonthDay(month, day, fiscalYear) {
    // 4月～3月の年度内で年を決定
    if (month >= 4) return { y: fiscalYear, mo: month, d: day };
    return { y: fiscalYear + 1, mo: month, d: day };
  }

  /** テーブルHTMLから日付を抽出 */
  function extractDatesFromTable(tableHtml, fiscalYear) {
    const dates = [];
    const nText = tableHtml.normalize("NFKC"); // 全角→半角

    // 行をまたぐ年コンテキスト（栃木市: 「令和7年 5月」の後、次行は「6月」のみ）
    let lastYear = null;
    // ピボットテーブル用: ヘッダー行に月、データ行に日のみのパターン
    let pivotColumnMonths = null; // [{year, month}, null, ...] per column

    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRe.exec(nText)) !== null) {
      const rowHtml = trMatch[1];
      const rowText = stripTags(rowHtml).trim();
      if (!rowText) continue;

      const datesCountBefore = dates.length;

      // 令和N年M月D日 形式
      const fullRe = /令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
      let fm;
      while ((fm = fullRe.exec(rowText)) !== null) {
        const y = 2018 + Number(fm[1]);
        lastYear = y;
        dates.push({ y, mo: Number(fm[2]), d: Number(fm[3]) });
      }

      // YYYY年M月D日 形式
      const isoRe = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
      let im;
      while ((im = isoRe.exec(rowText)) !== null) {
        const dup = dates.some(d => d.y === Number(im[1]) && d.mo === Number(im[2]) && d.d === Number(im[3]));
        if (!dup) {
          lastYear = Number(im[1]);
          dates.push({ y: Number(im[1]), mo: Number(im[2]), d: Number(im[3]) });
        }
      }

      // 令和N年M月 D(曜日) 形式 — 「日」なし (栃木市: 「令和7年 5月 14(水曜日)」)
      const fullNoDayRe = /令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s+(\d{1,2})\s*[(\(（]/g;
      let fnd;
      while ((fnd = fullNoDayRe.exec(rowText)) !== null) {
        const y = 2018 + Number(fnd[1]);
        const mo = Number(fnd[2]);
        const d = Number(fnd[3]);
        lastYear = y;
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          const dup = dates.some(dd => dd.y === y && dd.mo === mo && dd.d === d);
          if (!dup) dates.push({ y, mo, d });
        }
      }

      // M月 D(曜日) 形式 — 「日」なし、年なし (栃木市: 「6月 12(木曜日)」)
      const mdNoDayRe = /(?<!\d)(\d{1,2})\s*月\s+(\d{1,2})\s*[(\(（]/g;
      let mnd;
      while ((mnd = mdNoDayRe.exec(rowText)) !== null) {
        const mo = Number(mnd[1]);
        const d = Number(mnd[2]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          // 令和年がある行はスキップ（上のfullNoDayReで処理済み）
          if (/令和/.test(rowText)) continue;
          const baseYear = lastYear || fiscalYear;
          const resolved = resolveMonthDay(mo, d, baseYear);
          const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
          if (!dup) dates.push(resolved);
        }
      }

      // M月D日 形式 (年なし → 年度から推定) — セル単位チェック
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
        const cellText = stripTags(cellMatch[1]).trim();
        if (!cellText || /令和|年|生まれ/.test(cellText)) continue;
        let cellMonth = null; // セル内月コンテキスト
        const mdRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
        let md;
        while ((md = mdRe.exec(cellText)) !== null) {
          const mo = Number(md[1]);
          const d = Number(md[2]);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            cellMonth = mo;
            const resolved = resolveMonthDay(mo, d, fiscalYear);
            const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
            if (!dup) dates.push(resolved);
          }
        }
        // セル内月コンテキスト: "M月 D日(曜) D日(曜)" — 月1回+裸のD日が複数
        if (cellMonth) {
          const bareCellDayRe = /(\d{1,2})\s*日\s*[（(][月火水木金土日]曜?日?[）)]/g;
          let bcd;
          while ((bcd = bareCellDayRe.exec(cellText)) !== null) {
            const d = Number(bcd[1]);
            if (d < 1 || d > 31) continue;
            const resolved = resolveMonthDay(cellMonth, d, fiscalYear);
            const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
            if (!dup) dates.push(resolved);
          }
        }
        // M/D 形式 (栃木市サポートクラブ: "6/4、7/2、9/3、10/1")
        const slashRe = /(?:^|[、,\s])(\d{1,2})\/(\d{1,2})(?=[、,\s]|$)/g;
        let sl;
        while ((sl = slashRe.exec(cellText)) !== null) {
          const mo = Number(sl[1]);
          const d = Number(sl[2]);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            const resolved = resolveMonthDay(mo, d, fiscalYear);
            const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
            if (!dup) dates.push(resolved);
          }
        }
      }

      // Row-level month context: 行の先頭セルに R7.4月 / 令和7年4月 / 4月 がある場合、
      // 後続セルの裸の D(曜日) や D日(曜日) にその月を適用する
      {
        let rowMonth = null;
        let rowYear = null;
        // 先頭セルからmonthを抽出（対象者の生年月日を誤検出しない）
        const firstCellMatch = rowHtml.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/i);
        const firstCellText = firstCellMatch ? stripTags(firstCellMatch[1]).normalize("NFKC").trim() : "";

        // R<N>.<M>月 形式 (栃木市乳幼児健診: "R7.4月")
        const rsmMatch = firstCellText.match(/R\s*(\d{1,2})\s*[.．]\s*(\d{1,2})\s*月/);
        if (rsmMatch) {
          rowYear = 2018 + Number(rsmMatch[1]);
          rowMonth = Number(rsmMatch[2]);
          lastYear = rowYear;
        }
        // 令和N年M月 (先頭セル内)
        if (!rowMonth) {
          const rymMatch = firstCellText.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月/);
          if (rymMatch) {
            rowYear = 2018 + Number(rymMatch[1]);
            rowMonth = Number(rymMatch[2]);
            lastYear = rowYear;
          }
        }
        // bare M月 (先頭セル内) — のびのび相談: "5月", 妊娠8か月教室: "5月"
        if (!rowMonth) {
          const bmMatch = firstCellText.match(/^(\d{1,2})\s*月/);
          if (bmMatch) {
            rowMonth = Number(bmMatch[1]);
            if (rowMonth >= 1 && rowMonth <= 12) rowYear = lastYear || fiscalYear;
            else rowMonth = null;
          }
        }

        if (rowMonth && rowMonth >= 1 && rowMonth <= 12) {
          // 裸の D日(曜日) or D(曜日) パターンを全て拾う — セル単位で走査し対象者セルをスキップ
          const cellRe2 = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
          let cm2;
          while ((cm2 = cellRe2.exec(rowHtml)) !== null) {
            const ct = stripTags(cm2[1]).normalize("NFKC").trim();
            // 対象者の生年月日セル（R6.11月生, 令和5年生 etc.）はスキップ
            if (/生$|生まれ|対象/.test(ct)) continue;
            const bareDayRe = /(\d{1,2})\s*日?\s*[(\(（]\s*[月火水木金土日]曜日?\s*[)\)）]/g;
            let bdm;
            while ((bdm = bareDayRe.exec(ct)) !== null) {
              const d = Number(bdm[1]);
              if (d < 1 || d > 31) continue;
              const baseYear = rowYear || lastYear || fiscalYear;
              const resolved = resolveMonthDay(rowMonth, d, baseYear);
              const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
              if (!dup) dates.push(resolved);
            }
          }
        }
      }

      // Row-level fallback: M月D日 when entire row has no 令和/年
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

      // ピボットテーブル: ヘッダー行に月、データ行に日のみのパターン
      // (下野市フレッシュママ・パパ教室: <th>令和8年3月</th><th>5月</th>...  / <td>12日（木）</td>...)
      if (dates.length === datesCountBefore) {
        // この行から日付が抽出されなかった → ヘッダー行かデータ行かチェック
        const cells = [];
        const pivCellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let pcm;
        while ((pcm = pivCellRe.exec(rowHtml)) !== null) {
          cells.push(stripTags(pcm[1]).normalize("NFKC").trim());
        }
        // ヘッダー行チェック: 3つ以上のセルに月パターンがあるか
        const monthEntries = [];
        let pivRunningYear = lastYear || fiscalYear;
        for (const cell of cells) {
          const rym = cell.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月/);
          if (rym) {
            pivRunningYear = 2018 + Number(rym[1]);
            monthEntries.push({ year: pivRunningYear, month: Number(rym[2]) });
            continue;
          }
          const bm = cell.match(/^(\d{1,2})\s*月$/);
          if (bm && Number(bm[1]) >= 1 && Number(bm[1]) <= 12) {
            monthEntries.push({ year: pivRunningYear, month: Number(bm[1]) });
            continue;
          }
          monthEntries.push(null);
        }
        if (monthEntries.filter(m => m !== null).length >= 3) {
          pivotColumnMonths = monthEntries;
          lastYear = pivRunningYear;
        } else if (pivotColumnMonths) {
          // データ行チェック: ピボットヘッダーが設定済みなら、各セルのD日をペアリング
          for (let ci = 0; ci < cells.length && ci < pivotColumnMonths.length; ci++) {
            if (!pivotColumnMonths[ci]) continue;
            const dayMatch = cells[ci].match(/(\d{1,2})\s*日?\s*[(\(（]/);
            if (dayMatch) {
              const d = Number(dayMatch[1]);
              if (d >= 1 && d <= 31) {
                const { year, month } = pivotColumnMonths[ci];
                const dup = dates.some(dd => dd.y === year && dd.mo === month && dd.d === d);
                if (!dup) dates.push({ y: year, mo: month, d });
              }
            }
          }
        }
      }
    }
    return dates;
  }

  /** 抽出した会場が有効か検証 */
  function isValidVenue(v) {
    if (!v || v.length < 2) return false;
    // ナビゲーション・パンくずリスト等のゴミを除外
    if (/トップページ|ホームページ|現在地|>|サイトマップ|ページの先頭/.test(v)) return false;
    // テーブルヘッダー・日程用語がvenueとして誤抽出されるのを除外
    if (/^(?:開催日|開催時間|開催場所|日程|時間|備考|対象者|受付|内容|日時|実施日)$/.test(v)) return false;
    // ミニ講座等の余計なテキストを除外
    if (v.length > 50) return false;
    return true;
  }

  /** ページからテーブル外の会場・時間を抽出 */
  function extractPageMeta(text) {
    let venue = "";
    let timeRange = null;

    // 会場パターン: 「ところ」「場所」「会場」 の後の値
    // stripTagsの結果は改行なし1行テキストなので、stopwordsで切る
    const venueStopRe = /\s+(?:対象|内容|申し込み|申込|問い合わせ|日時|日程|時間|持ち物|定員|費用|参加費|料金|備考|注意|その他|電話|TEL|ホーム|この記事|令和|お問い合わせ|連絡先|〒\d|受付|ミニ講座|講座|子育てミニ)/;
    const venueMatch = text.match(/(?:ところ|場所|会場|実施場所)\s*[：:]\s*(.{3,})/u);
    if (venueMatch) {
      let v = venueMatch[1];
      const stopIdx = v.search(venueStopRe);
      if (stopIdx > 0) v = v.substring(0, stopIdx);
      if (v.length > 60) v = v.substring(0, 60);
      v = sanitizeVenueText(v.trim());
      if (isValidVenue(v)) venue = v;
    }
    if (!venue) {
      const venueMatch2 = text.match(/(?:ところ|場所|会場|実施場所)\s+(.{3,})/u);
      if (venueMatch2) {
        let v = venueMatch2[1];
        const stopIdx = v.search(venueStopRe);
        if (stopIdx > 0) v = v.substring(0, stopIdx);
        if (v.length > 60) v = v.substring(0, 60);
        v = sanitizeVenueText(v.trim());
        if (isValidVenue(v)) venue = v;
      }
    }

    // 時間パターン
    timeRange = parseTimeRangeFromText(text);

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

      // ページタイトル: <h1> or config.title
      let pageTitle = page.title;
      if (!pageTitle) {
        const h1Match = nHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1Match) pageTitle = stripTags(h1Match[1]).trim();
      }
      if (!pageTitle) pageTitle = `${label}子育てイベント`;

      // 会場・時間をページ全体から抽出
      const meta = extractPageMeta(text);
      const venue = meta.venue || page.defaultVenue || "";
      const timeRange = meta.timeRange || null;

      // テーブルから日付抽出 — caption がある場合はテーブルごとに別タイトルで処理
      const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
      let tableMatch;
      const tableEntries = []; // { title, dates[] }
      while ((tableMatch = tableRe.exec(nHtml)) !== null) {
        const tableInner = tableMatch[1];
        const tableDates = extractDatesFromTable(tableInner, fiscalYear);
        // <caption> からサブタイトルを抽出
        const captionMatch = tableInner.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i);
        const caption = captionMatch ? stripTags(captionMatch[1]).normalize("NFKC").trim() : "";
        const tableTitle = (caption && caption.length >= 3 && caption.length <= 40) ? caption : pageTitle;
        tableEntries.push({ title: tableTitle, dates: tableDates });
      }

      // caption なしテーブル群はページタイトルで統合、caption ありはテーブルごとに独立
      const groups = new Map(); // title -> dates[]
      for (const { title, dates } of tableEntries) {
        if (!groups.has(title)) groups.set(title, []);
        groups.get(title).push(...dates);
      }
      if (groups.size === 0) groups.set(pageTitle, []);

      // テーブル外テキストからも M月D日 を補完抽出（更新日・ページ日付は除外）
      {
        const allTableDates = new Set();
        for (const ds of groups.values()) {
          for (const d of ds) allTableDates.add(`${d.y}-${d.mo}-${d.d}`);
        }
        const bodyMdRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
        let bm;
        const textDates = [];
        while ((bm = bodyMdRe.exec(text)) !== null) {
          const mo = Number(bm[1]);
          const d = Number(bm[2]);
          if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
          // 更新日 (YYYY年M月D日) / 令和N年M月D日 をスキップ
          const before = text.substring(Math.max(0, bm.index - 10), bm.index);
          if (/更新日|最終更新|掲載日|年\s*$/.test(before)) continue;
          const resolved = resolveMonthDay(mo, d, fiscalYear);
          const key = `${resolved.y}-${resolved.mo}-${resolved.d}`;
          if (!allTableDates.has(key)) {
            textDates.push(resolved);
            allTableDates.add(key);
          }
        }
        if (textDates.length > 0) {
          if (!groups.has(pageTitle)) groups.set(pageTitle, []);
          groups.get(pageTitle).push(...textDates);
        }
      }

      for (const [title, allDates] of groups) {
        // 重複除去
        const seen = new Set();
        const uniqueDates = allDates.filter(d => {
          const key = `${d.y}-${d.mo}-${d.d}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // 住所抽出
        let rawAddress = "";
        if (venue) {
          const embedded = extractEmbeddedAddressFromVenue(venue, cityName, prefecture);
          if (embedded.length > 0) rawAddress = embedded[0];
        }

        const promises = [];
        for (const eventDate of uniqueDates) {
          if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;
          promises.push(addEventRecord(byId, {
            sourceObj, eventDate, title, url: page.url,
            venue: sanitizeVenueText(venue), rawAddress,
            timeRange,
            cityName, prefixLabel, prefecture,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          }));
        }
        await Promise.all(promises.filter(Boolean));
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (schedule)`);
    return results;
  };
}


// ---- 佐野市スケジュール表コレクター ----

function createCollectSanoScheduleEvents(deps) {
  const { SANO_SOURCE } = require("../../config/wards");
  return createScheduleTableCollector(SANO_SOURCE, {
    cityName: "佐野市", prefixLabel: "佐野市", prefecture: "栃木県",
    pages: [
      { url: "https://www.city.sano.lg.jp/kurashi_gyosei/kosodate_kyoiku/kosodate/10/7802.html", title: "ママパパ学級", defaultVenue: "佐野市保健センター" },
      { url: "https://www.city.sano.lg.jp/kurashi_gyosei/kosodate_kyoiku/kosodate/1/7879.html", title: "育児相談", defaultVenue: "佐野市保健センター" },
      { url: "https://www.city.sano.lg.jp/kurashi_gyosei/kosodate_kyoiku/kosodate/7/7816.html", title: "1歳6か月児健康診査", defaultVenue: "佐野市保健センター" },
      { url: "https://www.city.sano.lg.jp/kurashi_gyosei/kosodate_kyoiku/kosodate/7/7817.html", title: "3歳児健康診査", defaultVenue: "佐野市保健センター" },
      { url: "https://www.city.sano.lg.jp/kurashi_gyosei/kosodate_kyoiku/kosodate/7/10210.html", title: "4か月児健康診査", defaultVenue: "佐野市保健センター" },
      { url: "https://www.city.sano.lg.jp/kurashi_gyosei/kosodate_kyoiku/kosodate/7/7815.html", title: "9か月児健康診査", defaultVenue: "佐野市保健センター" },
      { url: "https://www.city.sano.lg.jp/kurashi_gyosei/kosodate_kyoiku/kosodate/7/10209.html", title: "股関節脱臼検診", defaultVenue: "佐野市保健センター" },
    ],
  }, deps);
}


// ---- 真岡市スケジュール表コレクター ----

function createCollectMokaScheduleEvents(deps) {
  const { MOKA_SOURCE } = require("../../config/wards");
  return createScheduleTableCollector(MOKA_SOURCE, {
    cityName: "真岡市", prefixLabel: "真岡市", prefecture: "栃木県",
    pages: [
      { url: "https://www.city.moka.lg.jp/kosodate_kyoiku/ninshin_shussan/19660.html", title: "マタニティセミナー", defaultVenue: "真岡市総合福祉保健センター" },
      { url: "https://www.city.moka.lg.jp/kosodate_kyoiku/kosodate/ikuji_kosodate/koza_kosodate/16923.html", title: "赤ちゃん教室", defaultVenue: "真岡市総合福祉保健センター" },
      { url: "https://www.city.moka.lg.jp/kosodate_kyoiku/kosodate/ikuji_kosodate/koza_kosodate/16924.html", title: "もぐもぐ教室（離乳食）", defaultVenue: "真岡市総合福祉保健センター" },
      { url: "https://www.city.moka.lg.jp/kosodate_kyoiku/kosodate/2/7990.html", title: "子育て相談会", defaultVenue: "真岡市総合福祉保健センター" },
      { url: "https://www.city.moka.lg.jp/kosodate_kyoiku/kosodate/kodomo_kenshin/16909.html", title: "乳幼児健康診査", defaultVenue: "真岡市総合福祉保健センター" },
    ],
  }, deps);
}


// ---- 栃木市スケジュール表コレクター ----

function createCollectTochigiCityScheduleEvents(deps) {
  const { TOCHIGI_CITY_SOURCE } = require("../../config/wards");
  return createScheduleTableCollector(TOCHIGI_CITY_SOURCE, {
    cityName: "栃木市", prefixLabel: "栃木市", prefecture: "栃木県",
    pages: [
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/28354.html", title: "Hello赤ちゃん教室", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/56531.html", title: "離乳食教室", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/30790.html", title: "子育て広場", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/78408.html", title: "あかちゃん交流会", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/59415.html", title: "プレパパ教室", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/83757.html", title: "プレママカフェ", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/7290.html", title: "子ども食堂", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/80804.html", title: "ペアレント・プログラム", defaultVenue: "栃木保健福祉センター" },
      // 追加ページ
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/30786.html", title: "乳幼児健康診査", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/72430.html", title: "のびのび相談", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/61443.html", title: "にこにこ教室", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/78601.html", title: "妊娠8か月教室", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/59562.html", title: "多胎児交流会", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/70484.html", title: "ぴよぴよ交流会", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/79079.html", title: "医療相談", defaultVenue: "栃木保健福祉センター" },
      { url: "https://www.city.tochigi.lg.jp/site/kosodatekyouiku/69644.html", title: "こどもサポートクラブ", defaultVenue: "きららの杜蔵の街楽習館" },
    ],
  }, deps);
}


// ---- 小山市スケジュール表コレクター ----

function createCollectOyamaScheduleEvents(deps) {
  const { OYAMA_SOURCE } = require("../../config/wards");
  return createScheduleTableCollector(OYAMA_SOURCE, {
    cityName: "小山市", prefixLabel: "小山市", prefecture: "栃木県",
    pages: [
      { url: "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page000528.html", title: "乳児健康診査", defaultVenue: "小山市役所 3階 保健センター" },
      { url: "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page000488.html", title: "9か月児健康相談", defaultVenue: "小山市役所 3階 保健センター" },
      { url: "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page000531.html", title: "1歳6か月児健康診査", defaultVenue: "小山市役所 3階 保健センター" },
      { url: "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page005641.html", title: "3歳児健康診査", defaultVenue: "小山市役所 3階 保健センター" },
      { url: "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page000758.html", title: "2歳児歯科健康診査", defaultVenue: "小山市役所 3階 保健センター" },
      { url: "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page000395.html", title: "離乳食教室", defaultVenue: "小山市役所 3階 保健センター" },
      { url: "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page004469.html", title: "幼児食教室", defaultVenue: "小山市役所 3階 保健センター" },
      { url: "https://www.city.oyama.tochigi.jp/kosodate-kyouiku/mokuteki/kenkou-soudan/page000394.html", title: "乳幼児健康相談", defaultVenue: "小山市役所 3階 保健センター" },
    ],
  }, deps);
}


// ---- 大田原市スケジュールコレクター ----

function createCollectOhtawaraScheduleEvents(deps) {
  const { OHTAWARA_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;

  // 大田原市の健診ページは <table> ではなくテキストベースの日付リスト
  // 乳幼児健康相談ページ (13日付) のみ table/text パーサーで対応
  return async function collectOhtawaraScheduleEvents(maxDays) {
    const sourceObj = OHTAWARA_SOURCE;
    const cityName = "大田原市";
    const prefixLabel = "大田原市";
    const byId = new Map();

    const pages = [
      { url: "https://www.city.ohtawara.tochigi.jp/docs/2025041100029/", title: "乳幼児健康相談", defaultVenue: "大田原市福祉センター" },
      { url: "https://www.city.ohtawara.tochigi.jp/docs/2016042600069/", title: "教育支援相談会", defaultVenue: "大田原市役所" },
      { url: "https://www.city.ohtawara.tochigi.jp/docs/2021111100029/", title: "保護者の会（教育支援センター）", defaultVenue: "大志館すばる" },
      { url: "https://www.city.ohtawara.tochigi.jp/docs/2013082771599/", title: "ファミサポ出張登録会", defaultVenue: "つどいの広場トコトコ" },
      { url: "https://www.city.ohtawara.tochigi.jp/docs/2021070900043/", title: "就学時健康診断", defaultVenue: "大田原市役所" },
    ];

    const now = new Date(Date.now() + 9 * 3600000);
    const fiscalYear = (now.getUTCMonth() + 1) >= 4 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;

    for (const page of pages) {
      let html;
      try { html = await fetchText(page.url); } catch (e) {
        console.warn(`[${cityName}] fetch failed (${page.url}):`, e.message || e);
        continue;
      }
      const nHtml = html.normalize("NFKC");
      const text = stripTags(nHtml);

      // 年度推定
      const fyMatch = text.match(/令和\s*(\d{1,2})\s*年度/);
      const fy = fyMatch ? 2018 + Number(fyMatch[1]) : fiscalYear;

      // テキストから全 M月D日 を抽出
      const mdRe = /(\d{1,2})月\s*(\d{1,2})日/g;
      let md;
      const promises = [];
      while ((md = mdRe.exec(text)) !== null) {
        const mo = Number(md[1]);
        const d = Number(md[2]);
        if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
        const y = mo >= 4 ? fy : fy + 1;
        if (!inRangeJst(y, mo, d, maxDays)) continue;
        promises.push(addEventRecord(byId, {
          sourceObj, eventDate: { y, mo, d }, title: page.title, url: page.url,
          venue: sanitizeVenueText(page.defaultVenue), rawAddress: "",
          timeRange: parseTimeRangeFromText(text),
          cityName, prefixLabel,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        }));
      }
      await Promise.all(promises.filter(Boolean));
    }

    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected (schedule)`);
    return results;
  };
}


// ---- 足利市スケジュールコレクター ----
// 足利市の健診・教室ページは M月D日 形式のテキスト/テーブル日付リスト
function createCollectAshikagaScheduleEvents(deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = ASHIKAGA_SOURCE;
  const cityName = "足利市";
  const prefixLabel = "足利市";

  const pages = [
    { url: "https://www.city.ashikaga.tochigi.jp/health/000035/000204/p006916.html", title: "パパママ心の相談", defaultVenue: "足利市保健センター" },
    { url: "https://www.city.ashikaga.tochigi.jp/health/000035/000204/p002151.html", title: "こどものお口・食事相談", defaultVenue: "足利市保健センター" },
    { url: "https://www.city.ashikaga.tochigi.jp/health/000035/000204/p002141.html", title: "離乳食講座", defaultVenue: "足利市保健センター" },
  ];

  return async function collectAshikagaScheduleEvents(maxDays) {
    const byId = new Map();
    const now = new Date(Date.now() + 9 * 3600000);
    const fiscalYear = (now.getUTCMonth() + 1) >= 4 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;

    for (const page of pages) {
      let html;
      try { html = await fetchText(page.url); } catch (e) {
        console.warn(`[${cityName}] fetch failed (${page.url}):`, e.message || e);
        continue;
      }
      const nHtml = html.normalize("NFKC");
      const text = stripTags(nHtml);

      // 年度推定
      const fyMatch = text.match(/令和\s*(\d{1,2})\s*年度/);
      const fy = fyMatch ? 2018 + Number(fyMatch[1]) : fiscalYear;

      // 会場抽出
      let venue = page.defaultVenue;
      const vm = text.match(/(?:会場|場所|ところ)\s+(.{3,40})/u);
      if (vm) {
        const v = sanitizeVenueText(vm[1].split(/\s{2,}/)[0]);
        if (v && v.length >= 3 && !/での|について/.test(v)) venue = v;
      }

      // テーブルからの日付抽出
      const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
      let tm;
      const dates = [];
      while ((tm = tableRe.exec(nHtml)) !== null) {
        const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let cm;
        while ((cm = cellRe.exec(tm[1])) !== null) {
          const ct = stripTags(cm[1]).normalize("NFKC").trim();
          const mdRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
          let md;
          while ((md = mdRe.exec(ct)) !== null) {
            const mo = Number(md[1]);
            const d = Number(md[2]);
            if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
              const y = mo >= 4 ? fy : fy + 1;
              dates.push({ y, mo, d });
            }
          }
        }
      }

      // テキストからも M月D日 抽出（テーブルがない場合のフォールバック）
      if (dates.length === 0) {
        const mdRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
        let md;
        while ((md = mdRe.exec(text)) !== null) {
          const mo = Number(md[1]);
          const d = Number(md[2]);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            const y = mo >= 4 ? fy : fy + 1;
            dates.push({ y, mo, d });
          }
        }
      }

      // 重複除去
      const seen = new Set();
      const timeRange = parseTimeRangeFromText(text);
      const promises = [];
      for (const dt of dates) {
        const key = `${dt.y}-${dt.mo}-${dt.d}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
        promises.push(addEventRecord(byId, {
          sourceObj, eventDate: dt, title: page.title, url: page.url,
          venue: sanitizeVenueText(venue), rawAddress: "",
          timeRange,
          cityName, prefixLabel,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        }));
      }
      await Promise.all(promises.filter(Boolean));
    }

    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected (schedule)`);
    return results;
  };
}


// ---- 下野市スケジュールコレクター ----
function createCollectShimotsukeScheduleEvents(deps) {
  return createScheduleTableCollector(SHIMOTSUKE_SOURCE, {
    cityName: "下野市", prefixLabel: "下野市", prefecture: "栃木県",
    pages: [
      { url: "https://www.city.shimotsuke.lg.jp/0484/info-0000007710-3.html", title: "育児相談・子育て巡回相談", defaultVenue: "下野市役所" },
      { url: "https://www.city.shimotsuke.lg.jp/1974/info-0000001994-3.html", title: "乳幼児健診", defaultVenue: "保健福祉センターゆうゆう館" },
      { url: "https://www.city.shimotsuke.lg.jp/1324/info-0000002403-3.html", title: "フレッシュママ・パパ教室", defaultVenue: "保健福祉センターゆうゆう館" },
    ],
  }, deps);
}


// ---- 那須町スケジュール表コレクター ----

function createCollectNasuScheduleEvents(deps) {
  const { NASU_SOURCE } = require("../../config/wards");
  return createScheduleTableCollector(NASU_SOURCE, {
    cityName: "那須町", prefixLabel: "那須町", prefecture: "栃木県",
    pages: [
      { url: "https://www.town.nasu.lg.jp/0126/info-0000000713-1.html", title: "乳幼児健康診査", defaultVenue: "ゆめプラザ・那須" },
      { url: "https://www.town.nasu.lg.jp/0127/info-0000003516-1.html", title: "ママベビーリフレッシュ教室", defaultVenue: "ゆめプラザ・那須" },
      { url: "https://www.town.nasu.lg.jp/0138/info-0000003168-1.html", title: "ひよっこ教室", defaultVenue: "ゆめプラザ・那須" },
    ],
  }, deps);
}


// ---- 高根沢町スケジュール表コレクター ----

function createCollectTakanezawaScheduleEvents(deps) {
  return createScheduleTableCollector(TAKANEZAWA_SOURCE, {
    cityName: "高根沢町", prefixLabel: "塩谷郡高根沢町", prefecture: "栃木県",
    pages: [
      { url: "https://www.town.takanezawa.tochigi.jp/kosodate/kosodate/rengeso/yotei.html", title: "子育て支援センターれんげそう", defaultVenue: "子育て支援センターれんげそう" },
    ],
  }, deps);
}


// ---- PDF解析ベースのスケジュールコレクター ----

/**
 * PDFファイルをjina.ai経由でテキスト化し、日付を抽出するコレクター。
 * 太田市・渋川市・富岡市・安中市 等のPDF日程表に対応。
 */
function createPdfScheduleCollector(sourceObj, config, deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const { cityName, prefixLabel, prefecture = "群馬県", pages } = config;

  function currentFiscalYear() {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const m = jst.getUTCMonth() + 1;
    return m >= 4 ? y : y - 1;
  }

  function resolveMonthDay(month, day, fy) {
    if (month >= 4) return { y: fy, mo: month, d: day };
    return { y: fy + 1, mo: month, d: day };
  }

  function extractDatesFromPdfText(text, fiscalYear) {
    const dates = [];
    const nText = text.normalize("NFKC");
    // 令和N年M月D日
    const reRe = /令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
    let m;
    while ((m = reRe.exec(nText)) !== null) {
      dates.push({ y: 2018 + Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
    }
    // YYYY年M月D日
    const isoRe = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
    while ((m = isoRe.exec(nText)) !== null) {
      const dup = dates.some(d => d.y === Number(m[1]) && d.mo === Number(m[2]) && d.d === Number(m[3]));
      if (!dup) dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
    }
    // M月D日 (年なし → 年度推定) — 行単位チェック
    const lines = nText.split(/\n/);
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
    // RN.M.D(曜日) 形式 (令和略記: R7.4.10(木) = 令和7年4月10日)
    // 実施日のみ抽出（曜日付き）。対象者の生年月日範囲 (R6.9.1 ～) を除外
    const rShortRe = /R(\d{1,2})\.(\d{1,2})\.(\d{1,2})\s*[(\(（][月火水木金土日]/g;
    while ((m = rShortRe.exec(nText)) !== null) {
      const y = 2018 + Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        const dup = dates.some(dd => dd.y === y && dd.mo === mo && dd.d === d);
        if (!dup) dates.push({ y, mo, d });
      }
    }
    // RN年M月D日(曜) 形式 (明和町など: R7年 4月24日(木))
    const rYearRe = /R(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
    while ((m = rYearRe.exec(nText)) !== null) {
      const y = 2018 + Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        const dup = dates.some(dd => dd.y === y && dd.mo === mo && dd.d === d);
        if (!dup) dates.push({ y, mo, d });
      }
    }
    // M D 曜日 形式 (テーブル由来: "4 24 木", "10 23 木")
    // 同一行に複数列がある場合（"4 24 木 ...  9 水 ...  11 金 ..."）、
    // 行頭の月を全列に適用
    const tableLines = nText.split(/\n/);
    for (const tLine of tableLines) {
      const lineStart = tLine.match(/^\s*(\d{1,2})\s+(\d{1,2})\s+[月火水木金土日]/);
      if (!lineStart) continue;
      const mo = Number(lineStart[1]);
      if (mo < 1 || mo > 12) continue;
      // 行頭の日を追加
      const firstDay = Number(lineStart[2]);
      if (firstDay >= 1 && firstDay <= 31) {
        const resolved = resolveMonthDay(mo, firstDay, fiscalYear);
        const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
        if (!dup) dates.push(resolved);
      }
      // 行中の追加列（2+スペースに続く "D 曜" パターン）
      const midRe = /\s{2,}(\d{1,2})\s+[月火水木金土日]/g;
      let mid;
      while ((mid = midRe.exec(tLine)) !== null) {
        const d = Number(mid[1]);
        if (d >= 1 && d <= 31) {
          const resolved = resolveMonthDay(mo, d, fiscalYear);
          const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
          if (!dup) dates.push(resolved);
        }
      }
    }
    // M/D 形式 (Excel PDF由来)
    const slashRe = /(?<!\d)(\d{1,2})\/(\d{1,2})(?!\d)/g;
    while ((m = slashRe.exec(nText)) !== null) {
      const mo = Number(m[1]);
      const d = Number(m[2]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        const resolved = resolveMonthDay(mo, d, fiscalYear);
        const dup = dates.some(dd => dd.y === resolved.y && dd.mo === resolved.mo && dd.d === resolved.d);
        if (!dup) dates.push(resolved);
      }
    }
    return dates;
  }

  return async function collectPdfScheduleEvents(maxDays) {
    const days = Math.min(Math.max(Number(maxDays) || 30, 1), 90);
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const today = new Date(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate());
    const rangeEnd = new Date(today.getTime() + days * 86400000);
    const results = [];
    const seen = new Set();
    const fy = currentFiscalYear();

    for (const page of pages) {
      try {
        const pdfText = await fetchChiyodaPdfMarkdown(page.url);
        if (!pdfText) continue;
        const pageYear = inferYear(pdfText) || fy;
        const dates = extractDatesFromPdfText(pdfText, pageYear);
        for (const dt of dates) {
          const d = new Date(dt.y, dt.mo - 1, dt.d);
          if (d < today || d >= rangeEnd) continue;
          const dateKey = `${dt.y}-${String(dt.mo).padStart(2, "0")}-${String(dt.d).padStart(2, "0")}`;
          const id = `${sourceObj.key}:${page.url}:${page.title}:${dateKey}`;
          if (seen.has(id)) continue;
          seen.add(id);
          const venue = page.defaultVenue || "";
          const fmAddr = getFacilityAddressFromMaster(sourceObj.key, venue);
          const addr = fmAddr ? (fmAddr.includes(prefecture) ? fmAddr : `${prefecture}${fmAddr}`) : `${prefecture}${cityName}`;
          const geoCandidates = [addr];
          if (venue) geoCandidates.push(`${prefecture}${cityName} ${venue}`);
          let point = await geocodeForWard(geoCandidates, sourceObj);
          point = resolveEventPoint(sourceObj, venue, point, addr);
          results.push({
            id,
            source: sourceObj.key,
            title: `${prefixLabel} ${page.title}`,
            starts_at: `${dateKey}T00:00:00+09:00`,
            ends_at: null,
            venue_name: venue,
            address: addr,
            lat: point ? point.lat : sourceObj.center.lat,
            lng: point ? point.lng : sourceObj.center.lng,
            url: page.url,
          });
        }
      } catch (err) {
        console.error(`[${cityName}] PDF fetch failed (${page.url}): ${err.message}`);
      }
    }
    console.log(`[${cityName}] ${results.length} events collected (PDF schedule)`);
    return { [sourceObj.key]: results };
  };

  function inferYear(text) {
    // 全角数字対応のためNFKC正規化
    const nt = text.normalize("NFKC");
    const reiwaFy = nt.match(/令和\s*(\d{1,2})\s*年度/);
    if (reiwaFy) return 2018 + Number(reiwaFy[1]);
    // RN年度 形式 (みなかみ町など: R7年度)
    const rShortFy = nt.match(/R(\d{1,2})年度/);
    if (rShortFy) return 2018 + Number(rShortFy[1]);
    const westernFy = nt.match(/(\d{4})\s*年度/);
    if (westernFy) return Number(westernFy[1]);
    // 年度がない場合は最大の令和N年を使う（対象者の生年月日を除外するため）
    const allReiwa = [...nt.matchAll(/令和\s*(\d{1,2})\s*年/g)];
    if (allReiwa.length > 0) {
      const maxReiwa = Math.max(...allReiwa.map(m => Number(m[1])));
      return 2018 + maxReiwa;
    }
    return null;
  }
}


// ---- 太田市 PDF スケジュールコレクター ----

function createCollectOtaGunmaPdfScheduleEvents(deps) {
  const { OTA_GUNMA_SOURCE } = require("../../config/wards");
  return createPdfScheduleCollector(OTA_GUNMA_SOURCE, {
    cityName: "太田市", prefixLabel: "太田市", prefecture: "群馬県",
    pages: [
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/30267.pdf", title: "マタニティセミナー", defaultVenue: "太田市保健センター" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/30205.pdf", title: "歯ぴもぐ教室", defaultVenue: "太田市保健センター" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/36246.pdf", title: "子育て相談", defaultVenue: "太田市保健センター" },
      // 児童館・こども館だより（月刊ニュースレター）
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37484.pdf", title: "児童センターだより", defaultVenue: "児童センター" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37485.pdf", title: "九合児童館だより", defaultVenue: "九合児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37486.pdf", title: "沢野児童館だより", defaultVenue: "沢野児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37487.pdf", title: "韮川児童館だより", defaultVenue: "韮川児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37488.pdf", title: "強戸児童館だより", defaultVenue: "強戸児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37489.pdf", title: "休泊児童館だより", defaultVenue: "休泊児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37490.pdf", title: "宝泉児童館だより", defaultVenue: "宝泉児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37491.pdf", title: "毛里田児童館だより", defaultVenue: "毛里田児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37492.pdf", title: "尾島児童館だより", defaultVenue: "尾島児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37493.pdf", title: "世良田児童館だより", defaultVenue: "世良田児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37494.pdf", title: "生品児童館だより", defaultVenue: "生品児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37496.pdf", title: "綿打児童館だより", defaultVenue: "綿打児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37497.pdf", title: "木崎児童館だより", defaultVenue: "木崎児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37498.pdf", title: "藪塚本町児童館だより", defaultVenue: "藪塚本町児童館" },
      { url: "https://www.city.ota.gunma.jp/uploaded/attachment/37499.pdf", title: "こども館だより", defaultVenue: "太田市こども館" },
    ],
  }, deps);
}


// ---- 渋川市 PDF スケジュールコレクター ----

function createCollectShibukawaPdfScheduleEvents(deps) {
  const { SHIBUKAWA_SOURCE } = require("../../config/wards");
  return createPdfScheduleCollector(SHIBUKAWA_SOURCE, {
    cityName: "渋川市", prefixLabel: "渋川市", prefecture: "群馬県",
    pages: [
      { url: "https://www.city.shibukawa.lg.jp/manage/contents/upload/68f6d9725207d.pdf", title: "乳幼児健康診査", defaultVenue: "渋川市保健センター" },
    ],
  }, deps);
}


// ---- 富岡市 PDF スケジュールコレクター ----

function createCollectTomiokaPdfScheduleEvents(deps) {
  const { TOMIOKA_SOURCE } = require("../../config/wards");
  return createPdfScheduleCollector(TOMIOKA_SOURCE, {
    cityName: "富岡市", prefixLabel: "富岡市", prefecture: "群馬県",
    pages: [
      { url: "https://www.city.tomioka.lg.jp/www/contents/1000000000507/files/R7nyuuyoujikenshin.pdf", title: "乳幼児健康診査", defaultVenue: "富岡市保健センター" },
    ],
  }, deps);
}


// ---- 安中市 PDF スケジュールコレクター ----

function createCollectAnnakaPdfScheduleEvents(deps) {
  const { ANNAKA_SOURCE } = require("../../config/wards");
  return createPdfScheduleCollector(ANNAKA_SOURCE, {
    cityName: "安中市", prefixLabel: "安中市", prefecture: "群馬県",
    pages: [
      { url: "https://www.city.annaka.lg.jp/uploaded/attachment/15711.pdf", title: "4か月児健康診査", defaultVenue: "安中市保健センター" },
      { url: "https://www.city.annaka.lg.jp/uploaded/attachment/15713.pdf", title: "8か月児健康診査", defaultVenue: "安中市保健センター" },
      { url: "https://www.city.annaka.lg.jp/uploaded/attachment/15737.pdf", title: "1歳すくすく相談", defaultVenue: "安中市保健センター" },
      { url: "https://www.city.annaka.lg.jp/uploaded/attachment/15738.pdf", title: "1歳6か月児健康診査", defaultVenue: "安中市保健センター" },
      { url: "https://www.city.annaka.lg.jp/uploaded/attachment/15739.pdf", title: "2歳児歯科健康診査", defaultVenue: "安中市保健センター" },
      { url: "https://www.city.annaka.lg.jp/uploaded/attachment/15740.pdf", title: "2歳6か月児歯科健康診査", defaultVenue: "安中市保健センター" },
      { url: "https://www.city.annaka.lg.jp/uploaded/attachment/15741.pdf", title: "3歳児健康診査", defaultVenue: "安中市保健センター" },
    ],
  }, deps);
}


// ---- みなかみ町 PDF スケジュールコレクター ----

function createCollectMinakamiPdfScheduleEvents(deps) {
  const { MINAKAMI_SOURCE } = require("../../config/wards");
  return createPdfScheduleCollector(MINAKAMI_SOURCE, {
    cityName: "みなかみ町", prefixLabel: "利根郡みなかみ町", prefecture: "群馬県",
    pages: [
      { url: "https://www.town.minakami.gunma.jp/life/07kenkou/files/R7kenkoukodomo10-3.pdf", title: "こどもの保健（後期）", defaultVenue: "みなかみ町保健福祉センター" },
    ],
  }, deps);
}


// ---- 明和町 PDF スケジュールコレクター ----

function createCollectMeiwaPdfScheduleEvents(deps) {
  const { MEIWA_SOURCE } = require("../../config/wards");
  return createPdfScheduleCollector(MEIWA_SOURCE, {
    cityName: "明和町", prefixLabel: "邑楽郡明和町", prefecture: "群馬県",
    pages: [
      { url: "https://www.town.meiwa.gunma.jp/material/files/group/6/R7nyuuyoujikennshinnnittei.pdf", title: "乳幼児健診", defaultVenue: "明和町保健センター" },
      { url: "https://www.town.meiwa.gunma.jp/material/files/group/6/R7kosodatekyoushituannnai.pdf", title: "子育て教室", defaultVenue: "明和町保健センター" },
    ],
  }, deps);
}


// ---- 榛東村 PDF スケジュールコレクター ----

function createCollectShintoPdfScheduleEvents(deps) {
  const { SHINTO_SOURCE } = require("../../config/wards");
  return createPdfScheduleCollector(SHINTO_SOURCE, {
    cityName: "榛東村", prefixLabel: "北群馬郡榛東村", prefecture: "群馬県",
    pages: [
      { url: "https://www.vill.shinto.gunma.jp/manage/contents/upload/%E4%BB%A4%E5%92%8C7%E5%B9%B4%E5%BA%A6%E6%A6%9B%E6%9D%B1%E6%9D%91%E5%81%A5%E5%BA%B7%E3%82%AB%E3%83%AC%E3%83%B3%E3%83%80%E3%83%BC.pdf", title: "健康カレンダー", defaultVenue: "榛東村保健相談センター" },
    ],
  }, deps);
}


// ---- 日光市リストベーススケジュールコレクター ----
// 日光市の健診ページは <table> ではなく <ul><li> に日付リストがある

function createCollectNikkoScheduleEvents(deps) {
  const { NIKKO_SOURCE } = require("../../config/wards");
  const KNOWN_NIKKO_FACILITIES = require("../../config/known-facilities").nikko;
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;

  const pages = [
    { url: "https://www.city.nikko.lg.jp/kosodate_kyoiku/kosodate/01/9519.html", title: "4か月児健康診査", defaultVenue: "今市保健福祉センター" },
    { url: "https://www.city.nikko.lg.jp/kosodate_kyoiku/kosodate/01/9714.html", title: "8か月児健康診査", defaultVenue: "今市保健福祉センター" },
    { url: "https://www.city.nikko.lg.jp/kosodate_kyoiku/kosodate/01/9520.html", title: "1歳6か月児健康診査", defaultVenue: "今市保健福祉センター" },
    { url: "https://www.city.nikko.lg.jp/kosodate_kyoiku/kosodate/01/9715.html", title: "2歳児歯科健康診査", defaultVenue: "今市保健福祉センター" },
    { url: "https://www.city.nikko.lg.jp/kosodate_kyoiku/kosodate/01/9716.html", title: "3歳児健康診査", defaultVenue: "今市保健福祉センター" },
    { url: "https://www.city.nikko.lg.jp/kosodate_kyoiku/kosodate/01/9717.html", title: "12か月児健康相談", defaultVenue: "今市保健福祉センター" },
    { url: "https://www.city.nikko.lg.jp/kosodate_kyoiku/kosodate/01/7100.html", title: "すくすく子育て相談", defaultVenue: "今市保健福祉センター" },
  ];

  return async function collector(maxDays) {
    const byId = new Map();
    for (const page of pages) {
      let html;
      try { html = await fetchText(page.url); } catch (e) {
        console.warn(`[日光市] schedule page fetch failed (${page.url}):`, e.message || e);
        continue;
      }
      const nHtml = html.normalize("NFKC");
      const text = stripTags(nHtml);

      // 年度推定
      const reiwaFy = text.match(/令和\s*(\d{1,2})\s*年度/);
      const now = new Date(Date.now() + 9 * 3600000);
      const fiscalYear = reiwaFy ? 2018 + Number(reiwaFy[1])
        : (now.getUTCMonth() + 1 >= 4 ? now.getUTCFullYear() : now.getUTCFullYear() - 1);

      // 会場: <h3>...会場...</h3> の後のテキストから
      let venue = page.defaultVenue;
      const venueMatch = text.match(/会場\s+(.{3,50})/u);
      if (venueMatch) {
        const v = sanitizeVenueText(venueMatch[1].split(/\s{2,}/)[0]);
        if (v && v.length >= 3 && !/での|について/.test(v)) venue = v;
      }

      // <li> から日付抽出: "4月17日（木曜日）" or "令和8年1月8日（木曜日）"
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let lm;
      while ((lm = liRe.exec(nHtml)) !== null) {
        const liText = stripTags(lm[1]).normalize("NFKC").trim();
        // 令和N年M月D日
        let dm = liText.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
        if (dm) {
          const y = 2018 + Number(dm[1]);
          const mo = Number(dm[2]);
          const d = Number(dm[3]);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && inRangeJst(y, mo, d, maxDays)) {
            await addEventRecord(byId, {
              sourceObj: NIKKO_SOURCE, eventDate: { y, mo, d }, title: page.title, url: page.url,
              venue: sanitizeVenueText(venue), rawAddress: "",
              timeRange: parseTimeRangeFromText(text),
              cityName: "日光市", prefixLabel: "日光市",
              geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
          continue;
        }
        // M月D日（曜日）
        dm = liText.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
        if (dm) {
          const mo = Number(dm[1]);
          const d = Number(dm[2]);
          if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
            const y = mo >= 4 ? fiscalYear : fiscalYear + 1;
            if (inRangeJst(y, mo, d, maxDays)) {
              await addEventRecord(byId, {
                sourceObj: NIKKO_SOURCE, eventDate: { y, mo, d }, title: page.title, url: page.url,
                venue: sanitizeVenueText(venue), rawAddress: "",
                timeRange: parseTimeRangeFromText(text),
                cityName: "日光市", prefixLabel: "日光市",
                geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
              });
            }
          }
        }
      }
    }
    const results = Array.from(byId.values());
    console.log(`[日光市] ${results.length} events collected (list schedule)`);
    return results;
  };
}


// ---- さくら市スケジュールコレクター ----
// 発達支援・発達相談ページ (p000563.html) に3種類の相談日程がテキスト形式で掲載

function createCollectTochigiSakuraScheduleEvents(deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = TOCHIGI_SAKURA_SOURCE;
  const cityName = "さくら市";
  const prefixLabel = "さくら市";

  const pages = [
    { url: "https://www.city.tochigi-sakura.lg.jp/education/000036/000220/p000563.html", title: "発達支援・発達相談", defaultVenue: "氏家保健センター" },
    { url: "https://www.city.tochigi-sakura.lg.jp/education/000036/000223/p003312.html", title: "乳幼児相談", defaultVenue: "氏家保健センター" },
    { url: "https://www.city.tochigi-sakura.lg.jp/education/000036/000223/p000566.html", title: "すくすく計測", defaultVenue: "氏家保健センター" },
  ];

  return async function collectTochigiSakuraScheduleEvents(maxDays) {
    const byId = new Map();
    const now = new Date(Date.now() + 9 * 3600000);
    const fiscalYear = (now.getUTCMonth() + 1) >= 4 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;

    for (const page of pages) {
      let html;
      try { html = await fetchText(page.url); } catch (e) {
        console.warn(`[${cityName}] fetch failed (${page.url}):`, e.message || e);
        continue;
      }
      const nHtml = html.normalize("NFKC");
      const text = stripTags(nHtml);

      // 年度推定
      const fyMatch = text.match(/令和\s*(\d{1,2})\s*年度/);
      const fy = fyMatch ? 2018 + Number(fyMatch[1]) : fiscalYear;

      // テキストベースでセクション分割
      // 相談名パターンを検索し、各出現位置の LAST を使う（TOCではなく本文）
      const sectionPatterns = [
        /ことばの相談/g,
        /こども発達相談/g,
        /うんどうの相談/g,
      ];
      const bodyPositions = []; // { name, idx }
      for (const re of sectionPatterns) {
        let m;
        let lastIdx = -1;
        let matchedName = "";
        while ((m = re.exec(text)) !== null) { lastIdx = m.index; matchedName = m[0]; }
        if (lastIdx >= 0) bodyPositions.push({ name: matchedName, idx: lastIdx });
      }
      bodyPositions.sort((a, b) => a.idx - b.idx);

      const sections = [];
      if (bodyPositions.length >= 2) {
        for (let i = 0; i < bodyPositions.length; i++) {
          const start = bodyPositions[i].idx;
          const end = i < bodyPositions.length - 1 ? bodyPositions[i + 1].idx : text.indexOf("場所", start);
          const body = text.substring(start, end > start ? end : start + 1000);
          sections.push({ title: bodyPositions[i].name, body });
        }
      }

      // セクションがなければページ全体を1セクションとして処理
      if (sections.length === 0) {
        sections.push({ title: page.title, body: text });
      }

      for (const section of sections) {
        // タイトルから括弧内の補足を除去
        const sectionTitle = section.title.replace(/[（(].+?[）)]/g, "").trim();

        // M月D日 形式の日付をすべて抽出
        const mdRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
        let md;
        const seen = new Set();
        const timeRange = parseTimeRangeFromText(section.body);
        const promises = [];

        while ((md = mdRe.exec(section.body)) !== null) {
          const mo = Number(md[1]);
          const d = Number(md[2]);
          if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
          const y = mo >= 4 ? fy : fy + 1;
          const key = `${y}-${mo}-${d}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (!inRangeJst(y, mo, d, maxDays)) continue;
          promises.push(addEventRecord(byId, {
            sourceObj, eventDate: { y, mo, d }, title: sectionTitle, url: page.url,
            venue: sanitizeVenueText(page.defaultVenue), rawAddress: "",
            timeRange,
            cityName, prefixLabel,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          }));
        }
        await Promise.all(promises.filter(Boolean));
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected (schedule)`);
    return results;
  };
}


// ---- 大田原市 PDF スケジュールコレクター ----
// 乳幼児健康診査PDF: グリッド形式（月行→日行のテーブル）

function createCollectOhtawaraPdfScheduleEvents(deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = OHTAWARA_SOURCE;
  const cityName = "大田原市";
  const prefixLabel = "大田原市";
  const pdfUrl = "https://www.city.ohtawara.tochigi.jp/docs/2013082779373/file_contents/R7kennsinn.pdf";
  const defaultVenue = "大田原市福祉センター";
  const checkupNames = [
    "4か月児健診", "10か月児相談", "1歳6か月児健診", "2歳児歯科健診", "3歳児健診",
  ];

  return async function collectOhtawaraPdfScheduleEvents(maxDays) {
    let pdfText;
    try { pdfText = await fetchChiyodaPdfMarkdown(pdfUrl); } catch (e) {
      console.error(`[${cityName}] PDF fetch failed: ${e.message}`);
      return { [sourceObj.key]: [] };
    }
    if (!pdfText) { console.log(`[${cityName}] 0 events collected (PDF schedule)`); return { [sourceObj.key]: [] }; }

    const nText = pdfText.normalize("NFKC");
    const months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
    const ryMatch = nText.match(/R(\d{1,2})年/);
    const baseReiwa = ryMatch ? Number(ryMatch[1]) : 7;
    const baseYear = 2018 + baseReiwa;

    // 12個の "N日" がスペース区切りで並ぶ行を全て抽出
    const dayLineRe = /(?:^|\n)\s*(\d{1,2})日\s+(\d{1,2})日\s+(\d{1,2})日\s+(\d{1,2})日\s+(\d{1,2})日\s+(\d{1,2})日\s+(\d{1,2})日\s+(\d{1,2})日\s+(\d{1,2})日\s+(\d{1,2})日\s+(\d{1,2})日\s+(\d{1,2})日/g;
    let dm;
    const dayLines = [];
    while ((dm = dayLineRe.exec(nText)) !== null) {
      dayLines.push(Array.from({ length: 12 }, (_, i) => Number(dm[i + 1])));
    }

    const results = [];
    const seen = new Set();
    const now = new Date(Date.now() + 9 * 3600000);
    const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const days = Math.min(Math.max(Number(maxDays) || 30, 1), 90);
    const rangeEnd = new Date(today.getTime() + days * 86400000);

    for (let lineIdx = 0; lineIdx < dayLines.length && lineIdx < checkupNames.length; lineIdx++) {
      const title = checkupNames[lineIdx];
      for (let i = 0; i < 12; i++) {
        const mo = months[i];
        const d = dayLines[lineIdx][i];
        const y = mo >= 4 ? baseYear : baseYear + 1;
        const dt = new Date(y, mo - 1, d);
        if (dt < today || dt >= rangeEnd) continue;
        const dateKey = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const id = `${sourceObj.key}:${pdfUrl}:${title}:${dateKey}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const fmAddr = getFacilityAddressFromMaster(sourceObj.key, defaultVenue);
        const addr = fmAddr ? (fmAddr.includes("栃木県") ? fmAddr : `栃木県${fmAddr}`) : `栃木県${cityName}`;
        const geoCandidates = [addr];
        if (defaultVenue) geoCandidates.push(`栃木県${cityName} ${defaultVenue}`);
        let point = await geocodeForWard(geoCandidates, sourceObj);
        point = resolveEventPoint(sourceObj, defaultVenue, point, addr);
        results.push({
          id, source: sourceObj.key,
          title: `${prefixLabel} ${title}`,
          starts_at: `${dateKey}T00:00:00+09:00`, ends_at: null,
          venue_name: defaultVenue, address: addr,
          lat: point ? point.lat : sourceObj.center.lat,
          lng: point ? point.lng : sourceObj.center.lng,
          url: pdfUrl,
        });
      }
    }
    console.log(`[${cityName}] ${results.length} events collected (PDF schedule)`);
    return { [sourceObj.key]: results };
  };
}


// ---- 那須塩原市スケジュールコレクター ----

function createCollectNasushiobaraScheduleEvents(deps) {
  const { NASUSHIOBARA_SOURCE } = require("../../config/wards");
  return createScheduleTableCollector(NASUSHIOBARA_SOURCE, {
    cityName: "那須塩原市", prefixLabel: "那須塩原市", prefecture: "栃木県",
    pages: [
      { url: "https://www.city.nasushiobara.tochigi.jp/soshikikarasagasu/kosodan/3/6229.html", title: "子育てサロン（サポートステーション）", defaultVenue: "子育てサポートステーション" },
      // 6230/4056 は複数施設のサロン一覧ページ（会場特定不可）→ 除外
      { url: "https://www.city.nasushiobara.tochigi.jp/soshikikarasagasu/kosodan/3/4054.html", title: "子育てサロン（サポートステーション）", defaultVenue: "子育てサポートステーション" },
      { url: "https://www.city.nasushiobara.tochigi.jp/soshikikarasagasu/kosodan/boshi_hoken/1/3/21643.html", title: "離乳食教室", defaultVenue: "なかよしひろば" },
    ],
  }, deps);
}


// ---- 鹿沼市 PDF スケジュールコレクター ----
// 鹿沼市サイトはHTTPSのみ対応のため、jina.aiのHTTPS URLを直接使用。
// PDFのテーブルは「N月 D日 (曜) [対象児生年月日]」形式の混在テキストのため、
// 「N月 D日」パターンのみを抽出する。
function createCollectKanumaPdfScheduleEvents(deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = KANUMA_SOURCE;
  const cityName = "鹿沼市";
  const prefixLabel = "鹿沼市";
  const pdfUrl = "https://www.city.kanuma.tochigi.jp/manage/contents/upload/67c8f003470ee.pdf";
  const defaultVenue = "市民情報センター";

  return async function collectKanumaPdfScheduleEvents(maxDays) {
    // jina.ai HTTPS proxy で取得
    const proxyUrl = `https://r.jina.ai/${pdfUrl}`;
    let pdfText;
    try {
      const res = await fetch(proxyUrl, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "text/plain" },
        signal: AbortSignal.timeout(50000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      pdfText = await res.text();
    } catch (e) {
      console.error(`[${cityName}] PDF fetch failed: ${e.message}`);
      return [];
    }
    if (!pdfText) { console.log(`[${cityName}] 0 events collected (PDF schedule)`); return []; }

    const nText = pdfText.normalize("NFKC");
    const now = new Date(Date.now() + 9 * 3600000);
    const fiscalYear = (now.getUTCMonth() + 1) >= 4 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const days = Math.min(Math.max(Number(maxDays) || 30, 1), 90);
    const rangeEnd = new Date(today.getTime() + days * 86400000);

    // 「N月 D日 (曜)」パターンのみ抽出（対象児の「N/D ～ N/D」を除外）
    const dateRe = /(\d{1,2})月\s+(\d{1,2})日\s*\([月火水木金土日]/g;
    const results = [];
    const seen = new Set();
    let dm;
    while ((dm = dateRe.exec(nText)) !== null) {
      const mo = Number(dm[1]);
      const d = Number(dm[2]);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
      const y = mo >= 4 ? fiscalYear : fiscalYear + 1;
      const dt = new Date(y, mo - 1, d);
      if (dt < today || dt >= rangeEnd) continue;
      const dateKey = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (seen.has(dateKey)) continue;
      seen.add(dateKey);
      const id = `${sourceObj.key}:${pdfUrl}:乳幼児健診:${dateKey}`;
      const fmAddr = getFacilityAddressFromMaster(sourceObj.key, defaultVenue);
      const addr = fmAddr ? (/栃木県/.test(fmAddr) ? fmAddr : `栃木県${fmAddr}`) : `栃木県${cityName}`;
      const geoCandidates = [addr];
      if (defaultVenue) geoCandidates.push(`栃木県${cityName} ${defaultVenue}`);
      let point = await geocodeForWard(geoCandidates, sourceObj);
      point = resolveEventPoint(sourceObj, defaultVenue, point, addr);
      results.push({
        id, source: sourceObj.key,
        title: `${prefixLabel} 乳幼児健診`,
        starts_at: `${dateKey}T00:00:00+09:00`, ends_at: null,
        venue_name: defaultVenue, address: addr,
        lat: point ? point.lat : sourceObj.center.lat,
        lng: point ? point.lng : sourceObj.center.lng,
        url: pdfUrl,
      });
    }

    console.log(`[${cityName}] ${results.length} events collected (PDF schedule)`);
    return results;
  };
}

// ---- 那須烏山市 PDF スケジュールコレクター ----
function createCollectNasukarasuyamaPdfScheduleEvents(deps) {
  return createPdfScheduleCollector(NASUKARASUYAMA_SOURCE, {
    cityName: "那須烏山市", prefixLabel: "那須烏山市", prefecture: "栃木県",
    pages: [
      { url: "https://www.city.nasukarasuyama.lg.jp/data/doc/1744088649_doc_92_0.pdf", title: "母子保健事業", defaultVenue: "那須烏山市保健福祉センター" },
    ],
  }, deps);
}


// ---- 益子町カレンダーコレクター ----
// cal.php のリスト表示をパースし、詳細ページから会場・時間を取得
function createCollectMashikoCalendarEvents(deps) {
  const { MASHIKO_SOURCE } = require("../../config/wards");
  const KNOWN_MASHIKO_FACILITIES = require("../../config/known-facilities").mashiko;
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = MASHIKO_SOURCE;
  const cityName = "益子町";
  const prefixLabel = "芳賀郡益子町";
  const defaultVenue = "益子町保健センター";

  return async function collectMashikoCalendarEvents(maxDays) {
    const byId = new Map();
    const now = new Date(Date.now() + 9 * 3600000);
    const thisY = now.getUTCFullYear();
    const thisM = now.getUTCMonth() + 1;
    // 今月＋来月の2ヶ月分
    const months = [
      { y: thisY, m: thisM },
      thisM === 12 ? { y: thisY + 1, m: 1 } : { y: thisY, m: thisM + 1 },
    ];

    for (const { y, m } of months) {
      const listUrl = `https://www.town.mashiko.lg.jp/cal.php?mode=list&lc=0&category=0&year=${y}&month=${m}`;
      let html;
      try { html = await fetchText(listUrl); } catch (e) {
        console.warn(`[${cityName}] calendar list fetch failed:`, e.message || e);
        continue;
      }
      const nHtml = html.normalize("NFKC");

      // <dl> 内の <dt>D日(曜)</dt> + <li class="list_default"><a href="...">タイトル</a>&nbsp;【カテゴリ】</li>
      const dlRe = /<dl[^>]*>([\s\S]*?)<\/dl>/gi;
      let dlm;
      while ((dlm = dlRe.exec(nHtml)) !== null) {
        const dlInner = dlm[1];
        const dtMatch = dlInner.match(/<dt[^>]*>([\s\S]*?)<\/dt>/i);
        if (!dtMatch) continue;
        const dayMatch = stripTags(dtMatch[1]).match(/(\d{1,2})\s*日/);
        if (!dayMatch) continue;
        const d = Number(dayMatch[1]);
        if (d < 1 || d > 31) continue;

        // イベントリンク抽出
        const liRe = /<li\s+class="list_default"[^>]*>([\s\S]*?)<\/li>/gi;
        let lim;
        while ((lim = liRe.exec(dlInner)) !== null) {
          const liHtml = lim[1];
          const aMatch = liHtml.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
          if (!aMatch) continue;
          const title = stripTags(aMatch[2]).trim();
          if (!title || !isChildEvent(title, "")) continue;
          // カテゴリ抽出（【健康カレンダー】等）
          const catMatch = stripTags(liHtml).match(/【(.+?)】/);
          const category = catMatch ? catMatch[1] : "";

          // 詳細ページURL
          const detailHref = aMatch[1].replace(/&amp;/g, "&");
          let detailUrl;
          try { detailUrl = new URL(detailHref, listUrl).href; } catch { continue; }

          if (!inRangeJst(y, m, d, maxDays)) continue;

          // 詳細ページからイベント個別情報を取得（バッチではなく逐次）
          let venue = defaultVenue;
          let timeRange = null;
          try {
            const detailHtml = await fetchText(detailUrl);
            const detailText = stripTags(detailHtml).normalize("NFKC");
            // 会場: 実施会場/実施場所/会場 + 全角スペース区切り
            const venueMatch = detailText.match(/(?:実施会場|実施場所|会場|場所)[\s\u3000]+([^\s\u3000]{3,30})/u);
            if (venueMatch) {
              const v = sanitizeVenueText(venueMatch[1]);
              if (v && v.length >= 3) venue = v;
            }
            // 時間: 時間/受付時間 + 値
            timeRange = parseTimeRangeFromText(detailText);
          } catch { /* detail fetch失敗 → デフォルト値使用 */ }

          await addEventRecord(byId, {
            sourceObj, eventDate: { y, mo: m, d }, title, url: detailUrl,
            venue, rawAddress: "",
            timeRange,
            cityName, prefixLabel,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected (calendar)`);
    return results;
  };
}


// ---- 日光市子育て支援センターイベントコレクター ----
// 9525.html: 3施設のイベント表（イベント名 | 日時 | 内容）
function createCollectNikkoSupportCenterEvents(deps) {
  const { NIKKO_SOURCE } = require("../../config/wards");
  const KNOWN_NIKKO_FACILITIES = require("../../config/known-facilities").nikko;
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = NIKKO_SOURCE;
  const pageUrl = "https://www.city.nikko.lg.jp/kosodate_kyoiku/kosodate/3/9525.html";

  return async function collectNikkoSupportCenterEvents(maxDays) {
    const byId = new Map();
    let html;
    try { html = await fetchText(pageUrl); } catch (e) {
      console.warn("[日光市] support center page fetch failed:", e.message || e);
      return [];
    }
    const nHtml = html.normalize("NFKC");
    const text = stripTags(nHtml);

    // 年度推定
    const now = new Date(Date.now() + 9 * 3600000);
    const fiscalYear = (now.getUTCMonth() + 1) >= 4 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;

    // <h2> で施設セクションを分割
    // 各セクション: <h2>施設名</h2> ... 場所：住所 ... <table>イベント表</table>
    const sections = nHtml.split(/<h2[^>]*>/i).slice(1); // 最初の空要素をスキップ

    for (const section of sections) {
      const h2End = section.indexOf("</h2>");
      if (h2End < 0) continue;
      const facilityName = stripTags(section.substring(0, h2End)).trim();
      if (!facilityName || facilityName.length > 40) continue;
      // 施設名に「ぽかぽか」「ふれあいひろば」等が含まれるセクションのみ処理
      if (!/ぽかぽか|ひろば|センター|支援/.test(facilityName)) continue;

      // 場所: 「場所：日光市...」 パターンから住所取得
      const addrMatch = stripTags(section).match(/場所[：:]\s*(.{5,40}?)(?:[（(]|電話)/u);
      const rawAddress = addrMatch ? addrMatch[1].trim() : "";

      // 施設名からvenueを推定（短縮名）
      let venue = facilityName.replace(/^地域子育て支援センター/, "").replace(/[「」]/g, "").trim();
      if (!venue || venue.length < 2) venue = facilityName;

      // テーブルからイベント抽出（イベント名 | 日時 | 内容）
      const tableMatch = section.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
      if (!tableMatch) continue;
      const tableHtml = tableMatch[1];

      const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trm;
      while ((trm = trRe.exec(tableHtml)) !== null) {
        const cells = [];
        const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let cm;
        while ((cm = cellRe.exec(trm[1])) !== null) {
          cells.push(stripTags(cm[1]).normalize("NFKC").trim());
        }
        if (cells.length < 2) continue;
        // ヘッダー行スキップ
        if (/^イベント名$/.test(cells[0])) continue;

        const eventTitle = cells[0];
        const dateTimeText = cells[1] || "";
        if (!eventTitle || eventTitle.length < 2) continue;
        // 曖昧な日付をスキップ（「2月の開館日」等）
        if (/の開館日|毎週|随時/.test(dateTimeText)) continue;

        // 日付抽出: "M月D日（曜日）" — 複数日カンマ区切り対応
        // "2月25日（水曜日）、26日（木曜日）" → [{m:2, d:25}, {m:2, d:26}]
        const dates = [];
        let currentMonth = null;
        const tokenRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日|(\d{1,2})\s*日\s*[（(]/g;
        let tm2;
        while ((tm2 = tokenRe.exec(dateTimeText)) !== null) {
          if (tm2[1] && tm2[2]) {
            // M月D日 形式
            currentMonth = Number(tm2[1]);
            dates.push({ mo: currentMonth, d: Number(tm2[2]) });
          } else if (tm2[3] && currentMonth) {
            // D日（曜日） — 前のM月を引き継ぐ
            dates.push({ mo: currentMonth, d: Number(tm2[3]) });
          }
        }

        // 時間抽出
        const timeRange = parseTimeRangeFromText(dateTimeText);

        for (const { mo, d } of dates) {
          if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
          const y = mo >= 4 ? fiscalYear : fiscalYear + 1;
          if (!inRangeJst(y, mo, d, maxDays)) continue;

          await addEventRecord(byId, {
            sourceObj, eventDate: { y, mo, d }, title: eventTitle, url: pageUrl,
            venue: sanitizeVenueText(venue), rawAddress,
            timeRange,
            cityName: "日光市", prefixLabel: "日光市",
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[日光市] ${results.length} events collected (support center)`);
    return results;
  };
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
  // calendar代替コレクター（カスタム）
  createCollectKanumaCalendarEvents,
  createCollectSanoScheduleEvents,
  createCollectMokaScheduleEvents,
  createCollectTochigiCityScheduleEvents,
  createCollectNasuScheduleEvents,
  createCollectTakanezawaScheduleEvents,
  createCollectNikkoScheduleEvents,
  createCollectNasushiobaraScheduleEvents,
  createCollectOyamaScheduleEvents,
  createCollectOhtawaraScheduleEvents,
  createCollectAshikagaScheduleEvents,
  createCollectShimotsukeScheduleEvents,
  createCollectTochigiSakuraScheduleEvents,
  createCollectOhtawaraPdfScheduleEvents,
  createCollectKanumaPdfScheduleEvents,
  createCollectNasukarasuyamaPdfScheduleEvents,
  createCollectMashikoCalendarEvents,
  createCollectNikkoSupportCenterEvents,
  // PDF schedule collectors
  createCollectOtaGunmaPdfScheduleEvents,
  createCollectShibukawaPdfScheduleEvents,
  createCollectTomiokaPdfScheduleEvents,
  createCollectAnnakaPdfScheduleEvents,
  createCollectMinakamiPdfScheduleEvents,
  createCollectMeiwaPdfScheduleEvents,
  createCollectShintoPdfScheduleEvents,
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
