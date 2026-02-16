const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const {
  sanitizeVenueText,
  sanitizeAddressText,
} = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

// 子育て関連キーワード (WARD_CHILD_HINT_RE を補完)
const CHILD_KEYWORDS_RE =
  /子育て|子ども|親子|乳幼児|幼児|離乳食|保育|キッズ/;

/**
 * event2/YYYYMM.html ページからイベントリンクを抽出
 * CMS パターン: 富津市, 印西市
 *
 * HTML 構造:
 * <li>
 *   <img src="../cmsfiles/top_icon/[number].jpg" alt="[category]">
 *   <a href="../[10-digit-id].html">[Event Title]</a>
 * </li>
 *
 * @param {string} html - カレンダーページ HTML
 * @param {string} baseUrl - ベース URL (例: "https://www.city.futtsu.lg.jp")
 * @param {string[]} childIconAlts - 子育てカテゴリの img alt 値 (例: ["子育て"])
 * @returns {Array<{title: string, url: string, category: string}>}
 */
function parseEvent2CalendarPage(html, baseUrl, childIconAlts) {
  const events = [];

  // <li> ブロックを分割して解析
  const liParts = html.split(/<li\b[^>]*>/i);
  for (let i = 1; i < liParts.length; i++) {
    const li = liParts[i].split(/<\/li>/i)[0] || liParts[i];

    // <a href="../XXXXXXXXXX.html"> リンクを抽出
    const linkMatch = li.match(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const href = linkMatch[1].replace(/&amp;/g, "&").trim();
    const title = stripTags(linkMatch[2]).trim();
    if (!href || !title) continue;

    // 10桁IDのHTMLリンクパターンにマッチするか確認
    if (!/\.\.\/\d{10,}\.html/.test(href) && !/\/\d{10,}\.html/.test(href)) continue;

    // <img alt="..."> からカテゴリを取得
    const imgMatch = li.match(/<img[^>]*alt="([^"]*)"[^>]*>/i);
    const category = imgMatch ? imgMatch[1].trim() : "";

    // 子育て関連フィルタ: カテゴリまたはタイトル
    const isChildCategory = childIconAlts.some(alt => category.includes(alt));
    const isChildTitle = WARD_CHILD_HINT_RE.test(title) || CHILD_KEYWORDS_RE.test(title);
    if (!isChildCategory && !isChildTitle) continue;

    // 絶対URLに変換
    // href は "../XXXXXXXXXX.html" 形式 → event2/ の親ディレクトリからの相対パス
    let absUrl;
    if (href.startsWith("http")) {
      absUrl = href;
    } else {
      // "../XXXXXXXXXX.html" → baseUrl + "/XXXXXXXXXX.html"
      const cleanHref = href.replace(/^\.\.\//, "");
      absUrl = `${baseUrl}/${cleanHref}`;
    }

    events.push({ title, url: absUrl, category });
  }

  return events;
}

/**
 * 詳細ページから日付・会場・住所・時間を抽出
 * @param {string} html - 詳細ページ HTML
 * @returns {Object} { dates: Array<{y,mo,d}>, venue, address, timeRange }
 */
function parseDetailPage(html) {
  const text = stripTags(html);
  let venue = "";
  let address = "";
  const dates = [];

  // 日付抽出: "YYYY年M月D日" パターン
  const dateRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  let dm;
  while ((dm = dateRe.exec(text)) !== null) {
    const y = Number(dm[1]);
    const mo = Number(dm[2]);
    const d = Number(dm[3]);
    if (y >= 2020 && y <= 2030 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      // 重複チェック
      if (!dates.some(dd => dd.y === y && dd.mo === mo && dd.d === d)) {
        dates.push({ y, mo, d });
      }
    }
  }

  // 令和N年M月D日 パターン
  const reiwaRe = /令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  let rm;
  while ((rm = reiwaRe.exec(text)) !== null) {
    const y = 2018 + Number(rm[1]);
    const mo = Number(rm[2]);
    const d = Number(rm[3]);
    if (y >= 2020 && y <= 2030 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      if (!dates.some(dd => dd.y === y && dd.mo === mo && dd.d === d)) {
        dates.push({ y, mo, d });
      }
    }
  }

  // dt/dd パターンで会場・住所を抽出
  const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let mm;
  while ((mm = metaRe.exec(html)) !== null) {
    const k = stripTags(mm[1]);
    const v = stripTags(mm[2]);
    if (!k || !v) continue;
    if (!venue && /(会場|開催場所|実施場所|場所|ところ)/.test(k)) venue = v;
    if (!address && /(住所|所在地)/.test(k)) address = v;
  }

  // th/td パターン
  if (!venue || !address) {
    const trRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
    while ((mm = trRe.exec(html)) !== null) {
      const k = stripTags(mm[1]);
      const v = stripTags(mm[2]);
      if (!k || !v) continue;
      if (!venue && /(会場|開催場所|実施場所|場所|ところ)/.test(k)) venue = v;
      if (!address && /(住所|所在地)/.test(k)) address = v;
    }
  }

  // h2/h3/h4 見出しパターン: 「場所」「会場」の後のテキスト
  if (!venue) {
    const headingRe = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
    let hm;
    while ((hm = headingRe.exec(html)) !== null) {
      const heading = stripTags(hm[1]).trim();
      if (/(場所|会場|開催場所)/.test(heading)) {
        // 見出しの直後のテキストを取得
        const afterHeading = html.slice(hm.index + hm[0].length, hm.index + hm[0].length + 500);
        const nextText = stripTags(afterHeading).trim().split(/\n/)[0].trim();
        if (nextText && nextText.length >= 2 && nextText.length <= 60) {
          venue = nextText;
          break;
        }
      }
    }
  }

  // テキストベースの会場抽出 (フォールバック)
  if (!venue) {
    const placeMatch = text.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
    if (placeMatch) {
      let v = placeMatch[1].trim();
      v = v.replace(/\s*(?:住所|郵便番号|駐車|大きな地図|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考|注意|詳細).*$/, "").trim();
      if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) venue = v;
    }
  }

  // 【住所】text パターン
  if (!address) {
    const addrMatch = text.match(/【住所】\s*([^\n【]{2,80})/);
    if (addrMatch) address = addrMatch[1].trim();
  }

  const timeRange = parseTimeRangeFromText(text);

  return { dates, venue, address, timeRange };
}

function buildGeoCandidates(venue, address, source) {
  const candidates = [];
  const city = source.label;
  const pref = "千葉県";
  if (address) {
    const full = address.includes(city) ? address : `${city}${address}`;
    candidates.push(`${pref}${full}`);
  }
  if (venue) {
    candidates.push(`${pref}${city} ${venue}`);
  }
  return [...new Set(candidates)];
}

/**
 * event2/YYYYMM.html CMS パターン用コレクターファクトリー
 * 対応自治体: 富津市, 印西市
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {string[]} [config.childIconAlts=["子育て"]] - img alt で子育てカテゴリ判定に使う値
 * @param {Object} deps - { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster }
 */
function createEvent2CalendarCollector(config, deps) {
  const { source, childIconAlts = ["子育て"] } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectEvent2CalendarEvents(maxDays) {
    const months = getMonthsForRange(maxDays);

    // event2/YYYYMM.html を月ごとに取得
    const rawEvents = [];
    for (const ym of months) {
      const ymParam = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      const url = `${source.baseUrl}/event2/${ymParam}.html`;
      try {
        const html = await fetchText(url);
        const pageEvents = parseEvent2CalendarPage(html, source.baseUrl, childIconAlts);
        rawEvents.push(...pageEvents);
      } catch (e) {
        console.warn(`[${label}] event2 month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // URL で重複除去 (同じイベントが複数月に出現する可能性)
    const uniqueLinks = new Map();
    for (const ev of rawEvents) {
      if (!uniqueLinks.has(ev.url)) {
        uniqueLinks.set(ev.url, ev);
      }
    }
    const eventLinks = Array.from(uniqueLinks.values());

    if (eventLinks.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 詳細ページバッチ取得
    const detailUrls = eventLinks.map(e => e.url).slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          return { url, ...parseDetailPage(html) };
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
    for (const ev of eventLinks) {
      const detail = detailMap.get(ev.url);
      if (!detail || detail.dates.length === 0) continue;

      const venue = sanitizeVenueText(detail.venue || "");
      const rawAddress = sanitizeAddressText(detail.address || "");
      const timeRange = detail.timeRange;

      // ジオコーディング (イベントリンクごとに1回)
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

      // 各日付分のレコードを生成
      for (const dd of detail.dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: dd.y, mo: dd.mo, d: dd.d },
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
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createEvent2CalendarCollector };
