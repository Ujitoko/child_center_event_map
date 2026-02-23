const vm = require("vm");
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
const { KOSHIGAYA_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;
const CALENDAR_URL = "https://www.city.koshigaya.saitama.jp/calendar.html";

/**
 * calendar.html 内の <script> タグから calendar_list_json と calendar_category を抽出
 * vm.runInNewContext で安全に評価
 */
function parseCalendarJson(html) {
  // calendar_list_json を含む script ブロックを検索
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptBlock = "";
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    if (m[1].includes("calendar_list_json")) {
      scriptBlock = m[1];
      break;
    }
  }
  if (!scriptBlock) return { calendarData: null, categories: [] };

  // calendar_list_json の抽出: const calendar_list_json = { ... };
  const jsonMatch = scriptBlock.match(
    /(?:const|let|var)\s+calendar_list_json\s*=\s*(\{[\s\S]*?\});/
  );
  // calendar_category の抽出: const calendar_category = [ ... ];
  const catMatch = scriptBlock.match(
    /(?:const|let|var)\s+calendar_category\s*=\s*(\[[\s\S]*?\]);/
  );

  let calendarData = null;
  let categories = [];

  if (jsonMatch) {
    try {
      const sandbox = {};
      vm.runInNewContext(`__result = (${jsonMatch[1]});`, sandbox);
      calendarData = sandbox.__result;
    } catch (e) {
      console.warn("[越谷市] calendar_list_json parse failed:", e.message || e);
    }
  }

  if (catMatch) {
    try {
      const sandbox = {};
      vm.runInNewContext(`__result = (${catMatch[1]});`, sandbox);
      categories = sandbox.__result || [];
    } catch (e) {
      console.warn("[越谷市] calendar_category parse failed:", e.message || e);
    }
  }

  return { calendarData, categories };
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("越谷市") ? address : `越谷市${address}`;
    candidates.push(`埼玉県${full}`);
  }
  if (venue) {
    candidates.push(`埼玉県越谷市 ${venue}`);
  }
  return [...new Set(candidates)];
}

/**
 * 子育て関連イベントかどうか判定
 * categories 配列にインデックスが含まれるか、タイトルに子育てキーワードがあるか
 */
function isChildEvent(event, categories) {
  // カテゴリ判定: categories 配列に "子ども" (通常 index 2) が含まれるか
  if (event.categories && event.categories.length > 0) {
    for (const catIdx of event.categories) {
      const catName = categories[catIdx] || "";
      if (/子ども|子供|子育て|キッズ/.test(catName)) return true;
    }
  }
  // タイトルキーワード判定 (categories が空のケースが多い)
  if (WARD_CHILD_HINT_RE.test(event.title)) return true;
  if (/子育て|子ども|こども|子供|親子|乳幼児|幼児|キッズ|児童|おはなし会|家庭の日|読み聞かせ|絵本|映画会|健診/.test(event.title)) return true;
  return false;
}

function createCollectKoshigayaEvents(deps) {
  const {
    geocodeForWard,
    resolveEventPoint,
    resolveEventAddress,
    getFacilityAddressFromMaster,
  } = deps;

  return async function collectKoshigayaEvents(maxDays) {
    const source = `ward_${KOSHIGAYA_SOURCE.key}`;
    const label = KOSHIGAYA_SOURCE.label;

    let html;
    try {
      html = await fetchText(CALENDAR_URL);
    } catch (e) {
      console.warn(`[${label}] calendar page fetch failed:`, e.message || e);
      return [];
    }

    const { calendarData, categories } = parseCalendarJson(html);
    if (!calendarData) {
      console.warn(`[${label}] calendar_list_json not found or parse failed`);
      return [];
    }

    // カレンダーデータからイベント抽出
    const rawEvents = [];
    for (const monthKey of Object.keys(calendarData)) {
      const days = calendarData[monthKey];
      if (!Array.isArray(days)) continue;
      for (const dayEntry of days) {
        const y = dayEntry.year;
        const mo = dayEntry.month;
        const d = dayEntry.date;
        if (!y || !mo || !d) continue;
        if (!inRangeJst(y, mo, d, maxDays)) continue;

        const events = dayEntry.events;
        if (!Array.isArray(events)) continue;
        for (const ev of events) {
          if (!ev.title || !ev.url) continue;
          if (!isChildEvent(ev, categories)) continue;

          const absUrl = ev.url.startsWith("http")
            ? ev.url
            : `${KOSHIGAYA_SOURCE.baseUrl}${ev.url.startsWith("/") ? "" : "/"}${ev.url}`;
          const dateKey = `${y}${String(mo).padStart(2, "0")}${String(d).padStart(2, "0")}`;

          rawEvents.push({
            title: ev.title.trim(),
            url: absUrl,
            y,
            mo,
            d,
            dateKey,
          });
        }
      }
    }

    // 重複除去
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const key = `${ev.url}:${ev.dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, ev);
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 40);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const detailHtml = await fetchText(url);
          const text = stripTags(detailHtml);
          let venue = "";
          let address = "";

          // dt/dd パターン
          const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
          let mm;
          while ((mm = metaRe.exec(detailHtml)) !== null) {
            const k = stripTags(mm[1]);
            const v = stripTags(mm[2]);
            if (!k || !v) continue;
            if (!venue && /(会場|開催場所|実施場所|場所)/.test(k)) venue = v;
            if (!address && /(住所|所在地)/.test(k)) address = v;
          }

          // th/td パターン
          if (!venue || !address) {
            const trRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
            while ((mm = trRe.exec(detailHtml)) !== null) {
              const k = stripTags(mm[1]);
              const v = stripTags(mm[2]);
              if (!k || !v) continue;
              if (!venue && /(会場|開催場所|実施場所|場所|ところ)/.test(k)) venue = v;
              if (!address && /(住所|所在地)/.test(k)) address = v;
            }
          }
          // td/td パターン (越谷市: <td>会場</td><td>施設名</td>)
          if (!venue) {
            const tdRe = /<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
            while ((mm = tdRe.exec(detailHtml)) !== null) {
              const k = stripTags(mm[1]).trim();
              const v = stripTags(mm[2]).trim();
              if (!k || !v) continue;
              if (!venue && /(会場|開催場所|場所|ところ)/.test(k) && v.length <= 60) venue = v;
              if (!address && /(住所|所在地)/.test(k)) address = v;
            }
          }
          // h2/h3/h4 見出しパターン (越谷市: <h2>会場</h2><p>施設名</p>)
          if (!venue) {
            const headingRe = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
            let hm;
            while ((hm = headingRe.exec(detailHtml)) !== null) {
              const heading = stripTags(hm[1]).trim();
              if (/(場所|会場|開催場所|ところ)/.test(heading)) {
                const afterHeading = detailHtml.slice(hm.index + hm[0].length, hm.index + hm[0].length + 500);
                const blockMatch = afterHeading.match(/<(?:p|div)[^>]*>([\s\S]*?)<\/(?:p|div)>/i);
                const nextText = blockMatch
                  ? stripTags(blockMatch[1]).trim()
                  : stripTags(afterHeading).trim().split(/\n/)[0].trim();
                if (nextText && nextText.length >= 2 && nextText.length <= 60) {
                  venue = nextText;
                  break;
                }
              }
            }
          }
          // テキストベースのフォールバック
          if (!venue) {
            const placeMatch = text.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim();
              v = v.replace(/\s*(?:住所|駐車|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考).*$/, "").trim();
              if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) venue = v;
            }
          }

          // 住所パターン: 越谷市の住所 or 〒 郵便番号
          if (!address) {
            const addrMatch = text.match(/越谷市[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FFa-zA-Z0-9\-\d]+/);
            if (addrMatch) address = addrMatch[0];
          }
          if (!address) {
            const postalMatch = text.match(/〒\d{3}-?\d{4}\s*([\s\S]{5,40})/);
            if (postalMatch) {
              const afterPostal = postalMatch[1].replace(/[\n\r]+/g, " ").trim();
              const cityMatch = afterPostal.match(/埼玉県?越谷市[\s\S]{2,30}/);
              if (cityMatch) address = cityMatch[0].trim();
            }
          }

          const timeRange = parseTimeRangeFromText(text);
          return { url, venue, address, timeRange };
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
        const fmAddr = getFacilityAddressFromMaster(KOSHIGAYA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /埼玉県/.test(fmAddr) ? fmAddr : `埼玉県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), KOSHIGAYA_SOURCE);
      point = resolveEventPoint(KOSHIGAYA_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const resolvedAddr = resolveEventAddress(KOSHIGAYA_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const id = `${source}:${ev.url}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: resolvedAddr || "",
        url: ev.url,
        lat: point ? point.lat : KOSHIGAYA_SOURCE.center.lat,
        lng: point ? point.lng : KOSHIGAYA_SOURCE.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

/**
 * 越谷市こそだてネット お知らせページコレクター
 * https://www.city.koshigaya.saitama.jp/kosodate-net/genres/oshirase/index.html
 * カレンダーが空のため、こそだてネットのお知らせ一覧から子育てイベントを収集
 */

/** 越谷市こそだて詳細ページ用の日付抽出 (令和/M月D日 対応) */
function parseKosodateDates(html) {
  const text = stripTags(html);
  const out = [];
  const seen = new Set();
  const push = (y, mo, d) => {
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return;
    const key = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ y, mo, d });
  };

  let m;
  // 1) YYYY年M月D日
  const jpRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  while ((m = jpRe.exec(text)) !== null) push(Number(m[1]), Number(m[2]), Number(m[3]));

  // 2) 令和N年M月D日
  const reRe = /令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  while ((m = reRe.exec(text)) !== null) push(2018 + Number(m[1]), Number(m[2]), Number(m[3]));

  // 3) ■日時 M月D日 (年なし) → 現在年から推定
  if (out.length === 0) {
    const now = new Date();
    const jstYear = new Date(now.getTime() + 9 * 3600000).getFullYear();
    const jstMonth = new Date(now.getTime() + 9 * 3600000).getMonth() + 1;
    const mdRe = /(\d{1,2})月\s*(\d{1,2})日/g;
    while ((m = mdRe.exec(text)) !== null) {
      const mo = Number(m[1]);
      const d = Number(m[2]);
      const y = (mo - jstMonth > 6) ? jstYear - 1 : jstYear;
      push(y, mo, d);
    }
  }

  return out;
}

/** ■会場 / ■場所 セクションからの施設名・住所抽出 */
function parseKosodateVenueAddress(html) {
  const text = stripTags(html);
  let venue = "";
  let address = "";

  // ■会場 / ■場所 パターン
  const venueMatch = text.match(/■(?:会場|場所)[：:\s]*([^\n■]{2,60})/);
  if (venueMatch) {
    venue = venueMatch[1].replace(/[（(].+$/, "").trim();
    // 括弧内に住所がある場合
    const parenMatch = venueMatch[1].match(/[（(]([^）)]*越谷市[^）)]*)[）)]/);
    if (parenMatch) address = parenMatch[1].trim();
  }

  // dt/dd, th/td パターン (フォールバック)
  if (!venue) {
    const metaRe = /<(?:dt|th)[^>]*>([\s\S]*?)<\/(?:dt|th)>\s*<(?:dd|td)[^>]*>([\s\S]*?)<\/(?:dd|td)>/gi;
    let mm;
    while ((mm = metaRe.exec(html)) !== null) {
      const k = stripTags(mm[1]);
      const v = stripTags(mm[2]);
      if (!k || !v) continue;
      if (!venue && /(会場|開催場所|実施場所|場所|ところ)/.test(k)) venue = v.trim();
      if (!address && /(住所|所在地)/.test(k)) address = v.trim();
    }
  }

  // テキスト内住所: 越谷市... or 住所:越谷市...
  if (!address) {
    const addrMatch = text.match(/住所[：:]\s*(越谷市[^\s\n]{2,30})/);
    if (addrMatch) address = addrMatch[1];
  }
  if (!address) {
    const addrMatch = text.match(/越谷市[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FFa-zA-Z0-9\-\d]+/);
    if (addrMatch) address = addrMatch[0];
  }

  return { venue: venue.substring(0, 60), address };
}

const KOSODATE_NET_BASE = "https://www.city.koshigaya.saitama.jp/kosodate-net";
const KOSODATE_NET_PAGES = [
  "/genres/oshirase/index.html",
  "/recent/index.html",
  "/calendar/index.html",
];

const KNOWN_KOSHIGAYA_VENUES = {
  "子育てサロン": "越谷市越ヶ谷4-1-1",
  "中央市民会館": "越谷市越ヶ谷4-1-1",
  "越谷市保健センター": "越谷市東越谷10-31",
  "保健センター": "越谷市東越谷10-31",
  "子育て世代包括支援センター": "越谷市越ヶ谷4-2-1",
  "サンシティ": "越谷市南越谷1-2876-1",
  "越谷市立図書館": "越谷市東越谷4-9-1",
  "児童館コスモス": "越谷市千間台東1-2-1",
  "児童館ヒマワリ": "越谷市船渡2-4",
  "あおいとり": "越谷市川柳町1-582-1",
  "にこにこ": "越谷市新方地区センター",
  "新方保育所": "越谷市大字弥十郎167-1",
  "緑の森公園保育所": "越谷市増林3-1-1",
  "蒲生第三保育所": "越谷市蒲生3-1-60",
  "七左保育所": "越谷市蒲生旭町7-20",
  "大相模保育所": "越谷市大成町7-289-1",
  "登戸保育所": "越谷市登戸町33-21",
  "ヴァリエ": "越谷市レイクタウン3-1-1",
};

function createCollectKoshigayaKosodateEvents(deps) {
  const {
    geocodeForWard,
    resolveEventPoint,
    resolveEventAddress,
    getFacilityAddressFromMaster,
  } = deps;

  return async function collectKoshigayaKosodateEvents(maxDays) {
    const source = `ward_${KOSHIGAYA_SOURCE.key}`;
    const label = `${KOSHIGAYA_SOURCE.label}子育てネット`;
    const byId = new Map();

    // お知らせ/遊ぶページからリンク一覧を取得
    const allLinks = [];
    for (const pagePath of KOSODATE_NET_PAGES) {
      const url = `${KOSODATE_NET_BASE}${pagePath}`;
      let html;
      try {
        html = await fetchText(url);
      } catch (e) {
        console.warn(`[${label}] ${pagePath} fetch failed:`, e.message || e);
        continue;
      }

      const linkRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let lm;
      while ((lm = linkRe.exec(html)) !== null) {
        const href = lm[1].replace(/&amp;/g, "&").trim();
        const text = stripTags(lm[2]).trim();
        if (!text || text.length < 3) continue;
        // kosodate-net 配下のリンクのみ
        if (!href.includes("kosodate-net") && !href.includes("kosodate")) continue;
        // 索引ページや画像リンクはスキップ
        if (/index\.html$|\.jpg$|\.png$|\.pdf$/i.test(href)) continue;
        const absUrl = href.startsWith("http") ? href : `${KOSHIGAYA_SOURCE.baseUrl}${href}`;
        allLinks.push({ url: absUrl, title: text });
      }
    }

    // 重複除去
    const uniqueLinks = [...new Map(allLinks.map(l => [l.url, l])).values()].slice(0, 80);

    // 詳細ページをバッチ取得
    for (let i = 0; i < uniqueLinks.length; i += DETAIL_BATCH_SIZE) {
      const batch = uniqueLinks.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (link) => {
          const html = await fetchText(link.url);
          const dates = parseKosodateDates(html);
          const va = parseKosodateVenueAddress(html);
          const timeRange = parseTimeRangeFromText(stripTags(html));
          return { ...link, dates, venue: va.venue, address: va.address, timeRange };
        })
      );
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const detail = r.value;
        if (!detail.dates || detail.dates.length === 0) continue;

        const title = detail.title;
        const venue = sanitizeVenueText(detail.venue || "");
        const rawAddress = sanitizeAddressText(detail.address || "");

        // 既知施設マッチ
        let knownAddr = "";
        for (const [name, addr] of Object.entries(KNOWN_KOSHIGAYA_VENUES)) {
          if (venue.includes(name) || title.includes(name)) {
            knownAddr = addr;
            break;
          }
        }

        // ジオコーディング (ページ単位)
        let geoCandidates = buildGeoCandidates(venue, rawAddress || knownAddr);
        if (getFacilityAddressFromMaster && venue) {
          const fmAddr = getFacilityAddressFromMaster(KOSHIGAYA_SOURCE.key, venue);
          if (fmAddr) {
            const full = /埼玉県/.test(fmAddr) ? fmAddr : `埼玉県${fmAddr}`;
            geoCandidates.unshift(full);
          }
        }
        let point = await geocodeForWard(geoCandidates.slice(0, 7), KOSHIGAYA_SOURCE);
        point = resolveEventPoint(KOSHIGAYA_SOURCE, venue, point, `${label} ${venue}`);
        const address = resolveEventAddress(KOSHIGAYA_SOURCE, venue, `${label} ${venue}`, point);

        for (const dd of detail.dates) {
          if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
          const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
          const { startsAt, endsAt } = buildStartsEndsForDate(dd, detail.timeRange);
          const id = `${source}:${detail.url}:${title}:${dateKey}`;
          if (byId.has(id)) continue;
          byId.set(id, {
            id,
            source,
            source_label: KOSHIGAYA_SOURCE.label,
            title,
            starts_at: startsAt,
            ends_at: endsAt,
            venue_name: venue,
            address: address || "",
            url: detail.url,
            lat: point ? point.lat : KOSHIGAYA_SOURCE.center.lat,
            lng: point ? point.lng : KOSHIGAYA_SOURCE.center.lng,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectKoshigayaEvents, createCollectKoshigayaKosodateEvents };
