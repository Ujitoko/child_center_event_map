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
  parseYmdFromJst,
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
  // li パターン (印西, 佐倉等)
  if (!venue) {
    const liRe2 = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let lm2;
    while ((lm2 = liRe2.exec(html)) !== null) {
      const v = stripTags(lm2[1]).trim();
      if (!venue && /^(?:【)?(?:場所|会場|開催場所)(?:】|[：:])/.test(v)) {
        venue = v.replace(/^(?:【)?(?:場所|会場|開催場所)(?:】|[：:])\s*/, "").trim();
      }
      if (!address && /^(?:【)?(?:住所|所在地)(?:】|[：:])/.test(v)) {
        address = v.replace(/^(?:【)?(?:住所|所在地)(?:】|[：:])\s*/, "").trim();
      }
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


// ---- 館山市 子育て親子の交流の場ページ型コレクター ----

/** 曜日文字 → JS dayOfWeek (0=日,1=月,...,6=土) */
const DAY_OF_WEEK_MAP = { "日": 0, "月": 1, "火": 2, "水": 3, "木": 4, "金": 5, "土": 6 };

/**
 * 「毎週X曜日」→ maxDays 以内の全該当日を列挙。
 * 祝日はスキップしない（ページ内の休日注記は無視）。
 */
function expandWeekly(dow, maxDays) {
  const dates = [];
  const jstNow = new Date(Date.now() + 9 * 3600000);
  for (let offset = 0; offset <= maxDays; offset++) {
    const d = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate() + offset);
    if (d.getDay() === dow) {
      dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
    }
  }
  return dates;
}

/**
 * 「毎月第N X曜日」→ maxDays 以内の全該当日を列挙。
 */
function expandNthWeekday(nth, dow, maxDays) {
  const dates = [];
  const jstNow = new Date(Date.now() + 9 * 3600000);
  const endDate = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate() + maxDays);
  let cursor = new Date(jstNow.getFullYear(), jstNow.getMonth(), 1);
  while (cursor <= endDate) {
    const y = cursor.getFullYear(), mo = cursor.getMonth();
    // 第N X曜日を算出
    let first = new Date(y, mo, 1);
    let firstDow = first.getDay();
    let dayNum = 1 + ((dow - firstDow + 7) % 7) + (nth - 1) * 7;
    const target = new Date(y, mo, dayNum);
    if (target.getMonth() === mo && target >= jstNow && target <= endDate) {
      dates.push({ y, mo: mo + 1, d: dayNum });
    }
    cursor = new Date(y, mo + 1, 1);
  }
  return dates;
}

const TATEYAMA_KNOWN_FACILITIES = {
  "船形地区公民館": "館山市船形405-2",
  "那古地区公民館": "館山市那古1125-1",
  "館山市図書館": "館山市北条1740",
  "館山市元気な広場": "館山市北条1145-1",
};

function createTateyamaCollector(sourceObj, deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;

  return async function collectTateyamaEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();
    const pageUrl = `${sourceObj.baseUrl}/kodomo/page100032.html`;

    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${label}] page fetch failed:`, e.message || e);
      return [];
    }

    const now = parseYmdFromJst(new Date());

    // h3 セクションに分割
    const h3Parts = html.split(/<h3>/i);
    for (let si = 1; si < h3Parts.length; si++) {
      const section = h3Parts[si];
      const titleM = section.match(/<span>([\s\S]*?)<\/span>/);
      const sectionTitle = titleM ? stripTags(titleM[1]).trim() : "";
      if (!sectionTitle) continue;
      // ちびっ子デーは「令和8年度の日程は決定次第」なのでスキップ
      if (/日程.*決定次第/.test(stripTags(section))) continue;

      const plainText = stripTags(section);

      // セクション内の施設・住所を特定
      let sectionVenue = "";
      let sectionAddress = "";
      for (const [name, addr] of Object.entries(TATEYAMA_KNOWN_FACILITIES)) {
        if (section.includes(name)) {
          if (!sectionVenue) { sectionVenue = name; sectionAddress = addr; }
        }
      }
      // 場所[：/] パターン
      if (!sectionVenue) {
        const placeM = plainText.match(/場所[：:／/]\s*([^\n]{2,40})/);
        if (placeM) sectionVenue = placeM[1].trim();
      }

      // 1) 特定日付: N月D日（X曜日）
      const specificRe = /(\d{1,2})月(\d{1,2})日（[月火水木金土日]曜日）/g;
      let sm;
      while ((sm = specificRe.exec(plainText)) !== null) {
        const mo = Number(sm[1]);
        const d = Number(sm[2]);
        let y = now.y;
        const diff = mo - now.m;
        if (diff > 6) y = now.y - 1;
        else if (diff < -6) y = now.y + 1;
        if (!inRangeJst(y, mo, d, maxDays)) continue;

        // 近傍の時間を取得
        const nearby = plainText.substring(sm.index, sm.index + 100);
        const timeRange = parseTimeRangeFromText(nearby);

        // 近傍の場所をチェック (同じ段落内)
        let venue = sectionVenue;
        let address = sectionAddress;
        const nearbyBefore = plainText.substring(Math.max(0, sm.index - 200), sm.index + sm[0].length + 200);
        for (const [name, addr] of Object.entries(TATEYAMA_KNOWN_FACILITIES)) {
          if (nearbyBefore.includes(name)) { venue = name; address = addr; break; }
        }

        // タイトル: 近傍の小見出し（○図書館まつり 等）から取得、なければセクションタイトル
        let eventTitle = sectionTitle;
        const subHeadM = plainText.substring(Math.max(0, sm.index - 80), sm.index).match(/[○❍◆●■]\s*(.+?)(?:\s|$)/);
        if (subHeadM && !/^(?:場所|日時|住所|対象|費用|申込)/.test(subHeadM[1].trim())) {
          eventTitle = subHeadM[1].trim();
        }

        await addEventRecord(byId, {
          sourceObj, eventDate: { y, mo, d }, title: eventTitle, url: pageUrl,
          venue: sanitizeVenueText(venue), rawAddress: sanitizeAddressText(address),
          timeRange, cityName: "館山市", prefixLabel: "館山市",
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }

      // 2) 毎週X曜日
      const weeklyRe = /毎週([月火水木金土日])曜日/g;
      let wm;
      while ((wm = weeklyRe.exec(plainText)) !== null) {
        const dow = DAY_OF_WEEK_MAP[wm[1]];
        if (dow === undefined) continue;
        const nearby = plainText.substring(wm.index, wm.index + 100);
        const timeRange = parseTimeRangeFromText(nearby);
        // 近傍の場所
        let venue = sectionVenue;
        let address = sectionAddress;
        const nearbyCtx = plainText.substring(Math.max(0, wm.index - 200), wm.index + wm[0].length + 200);
        for (const [name, addr] of Object.entries(TATEYAMA_KNOWN_FACILITIES)) {
          if (nearbyCtx.includes(name)) { venue = name; address = addr; break; }
        }
        const dates = expandWeekly(dow, maxDays);
        for (const ed of dates) {
          if (!inRangeJst(ed.y, ed.mo, ed.d, maxDays)) continue;
          await addEventRecord(byId, {
            sourceObj, eventDate: ed, title: sectionTitle, url: pageUrl,
            venue: sanitizeVenueText(venue), rawAddress: sanitizeAddressText(address),
            timeRange, cityName: "館山市", prefixLabel: "館山市",
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }

      // 3) 毎月第N X曜日
      const monthlyRe = /毎月第(\d)([月火水木金土日])曜日/g;
      let mm;
      while ((mm = monthlyRe.exec(plainText)) !== null) {
        const nth = Number(mm[1]);
        const dow = DAY_OF_WEEK_MAP[mm[2]];
        if (dow === undefined) continue;
        const nearby = plainText.substring(mm.index, mm.index + 100);
        const timeRange = parseTimeRangeFromText(nearby);
        // 月例イベントのタイトル: 直前のテキストブロックから取得
        // テーブル構造: "おはなし会（幼児） 毎月第1金曜日" のパターン
        let eventTitle = sectionTitle;
        const before = plainText.substring(Math.max(0, mm.index - 60), mm.index);
        const nameM = before.match(/\s([\u3000-\u9FFF\uFF00-\uFFEFa-zA-Z（）ー〜・\d]{2,30})\s*$/);
        if (nameM && !/場所|日時|対象|毎月|午前|午後|\d+時/.test(nameM[1].trim())) {
          eventTitle = nameM[1].trim();
        }
        const dates = expandNthWeekday(nth, dow, maxDays);
        for (const ed of dates) {
          if (!inRangeJst(ed.y, ed.mo, ed.d, maxDays)) continue;
          await addEventRecord(byId, {
            sourceObj, eventDate: ed, title: eventTitle, url: pageUrl,
            venue: sanitizeVenueText(sectionVenue), rawAddress: sanitizeAddressText(sectionAddress),
            timeRange, cityName: "館山市", prefixLabel: "館山市",
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

function createCollectMobaraEvents(deps) {
  const { MOBARA_SOURCE } = require("../../config/wards");
  return createKosodatePageCollector(MOBARA_SOURCE, {
    cityName: "茂原市", prefixLabel: "茂原市",
    urls: [
      "https://www.city.mobara.chiba.jp/category/12-2-3-0-0-0-0-0-0-0.html",
      "https://www.city.mobara.chiba.jp/category/12-2-6-0-0-0-0-0-0-0.html",
      "https://www.city.mobara.chiba.jp/category/12-2-7-0-0-0-0-0-0-0.html",
    ],
  }, deps);
}

function createCollectTateyamaEvents(deps) {
  const { TATEYAMA_SOURCE } = require("../../config/wards");
  return createTateyamaCollector(TATEYAMA_SOURCE, deps);
}

// ---- 鴨川市 のびのびカモッコ + 図書館コレクター ----

const KAMOGAWA_KNOWN_FACILITIES = {
  "ふれあいセンター": "鴨川市横渚1301-7",
  "子ども家庭センター": "鴨川市横渚1301-7",
  "鴨川市立図書館": "鴨川市横渚1506",
  "市立図書館": "鴨川市横渚1506",
  "鴨川市30記念公園": "鴨川市横渚808",
  "長狭子育て支援室": "鴨川市松尾寺417",
  "江見子育て支援室": "鴨川市宮1455",
  "天津小湊子育て支援室": "鴨川市天津1208-1",
};

/**
 * h3メタデータ型の詳細ページを解析。
 * <h3>日時</h3><p>3月11日（水曜日）午前9時30分から...</p>
 * <h3>場所</h3><p>ふれあいセンター1階...</p>
 */
function parseKamogawaDetail(html) {
  const h3Parts = html.split(/<h3[^>]*>/i);
  const meta = {};
  for (let i = 1; i < h3Parts.length; i++) {
    const endH3 = h3Parts[i].indexOf("</h3>");
    if (endH3 < 0) continue;
    const key = stripTags(h3Parts[i].substring(0, endH3)).trim();
    const content = h3Parts[i].substring(endH3 + 5);
    const nextH = content.search(/<h[23]/i);
    const block = nextH > 0 ? content.substring(0, nextH) : content.substring(0, 500);
    const value = stripTags(block).trim();
    if (key && value) meta[key] = value;
  }

  // 日時からの日付抽出
  let eventDate = null;
  let timeRange = null;
  const dateText = meta["日時"] || meta["とき"] || "";
  if (dateText) {
    const dm = dateText.match(/(\d{1,2})月(\d{1,2})日/);
    if (dm) eventDate = { mo: Number(dm[1]), d: Number(dm[2]) };
    timeRange = parseTimeRangeFromText(dateText);
  }

  // 場所
  const venue = meta["場所"] || meta["ところ"] || meta["会場"] || "";

  return { eventDate, timeRange, venue, meta };
}

/**
 * p要素ベースの詳細ページを解析（図書館ページ等）。
 */
function parseKamogawaPlainDetail(html) {
  let eventDate = null;
  let timeRange = null;
  let venue = "";

  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm;
  while ((pm = pRe.exec(html)) !== null) {
    const t = stripTags(pm[1]).trim();
    if (!t || t.length < 3) continue;
    // 日付
    if (!eventDate) {
      const dm = t.match(/(\d{1,2})月(\d{1,2})日/);
      if (dm && /[（(].*曜日[)）]/.test(t)) {
        eventDate = { mo: Number(dm[1]), d: Number(dm[2]) };
        timeRange = parseTimeRangeFromText(t);
      }
    }
    // 場所: 施設名を含む短い段落
    if (!venue) {
      for (const name of Object.keys(KAMOGAWA_KNOWN_FACILITIES)) {
        if (t.includes(name) && t.length < 80) { venue = t; break; }
      }
    }
  }

  return { eventDate, timeRange, venue };
}

function createCollectKamogawaEvents(deps) {
  const { KAMOGAWA_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;

  return async function collectKamogawaEvents(maxDays) {
    const sourceObj = KAMOGAWA_SOURCE;
    const label = sourceObj.label;
    const byId = new Map();
    const now = parseYmdFromJst(new Date());
    const baseUrl = sourceObj.baseUrl;

    // イベントリンク収集元ページ
    const listPages = [
      `${baseUrl}/site/nobinobi-kamokko/`,
      `${baseUrl}/site/library/`,
    ];

    const seen = new Set();
    const eventLinks = [];

    for (const pageUrl of listPages) {
      let html;
      try { html = await fetchText(pageUrl); } catch { continue; }

      const linkRe = /<a\b[^>]*href="(\/site\/[^"]*\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
      let lm;
      while ((lm = linkRe.exec(html)) !== null) {
        const title = stripTags(lm[2]).trim();
        const href = lm[1];
        if (seen.has(href) || title.length < 4 || title.length > 100) continue;
        seen.add(href);

        // のびのびカモッコ(子育てサイト)は全リンクを対象、図書館は子育て関連のみ
        const isKosodateSite = pageUrl.includes("nobinobi-kamokko");
        const hasDate = /【\d{1,2}月\d{1,2}日】/.test(title);
        const isChild = isChildEvent(title, "");
        if (!isKosodateSite && !hasDate && !isChild) continue;
        // 施設情報ページ・一覧ページは除外
        if (/遊びにおいでよ|支援室$|page100|list\d+-/.test(title + href)) continue;

        eventLinks.push({ href: `${baseUrl}${href}`, title });
      }
    }

    // 詳細ページ取得
    for (let i = 0; i < eventLinks.length; i += DETAIL_BATCH_SIZE) {
      const batch = eventLinks.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async ({ href, title }) => {
          const dhtml = await fetchText(href);

          // h3メタデータ型を優先、なければp要素型
          let detail = parseKamogawaDetail(dhtml);
          if (!detail.eventDate) {
            const plain = parseKamogawaPlainDetail(dhtml);
            if (plain.eventDate) detail = plain;
          }

          // タイトルから日付抽出（フォールバック）
          if (!detail.eventDate) {
            const titleDm = title.match(/(\d{1,2})月(\d{1,2})日/);
            if (titleDm) detail.eventDate = { mo: Number(titleDm[1]), d: Number(titleDm[2]) };
          }
          if (!detail.eventDate) return null;

          // 年推定
          let y = now.y;
          const diff = detail.eventDate.mo - now.m;
          if (diff > 6) y = now.y - 1;
          else if (diff < -6) y = now.y + 1;
          const eventDate = { y, mo: detail.eventDate.mo, d: detail.eventDate.d };

          if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) return null;

          // 施設名・住所特定
          let venue = sanitizeVenueText(detail.venue || "");
          let address = "";
          for (const [name, addr] of Object.entries(KAMOGAWA_KNOWN_FACILITIES)) {
            if (venue.includes(name) || title.includes(name)) {
              venue = venue || name;
              address = addr;
              break;
            }
          }

          return { href, title, eventDate, venue, address, timeRange: detail.timeRange };
        })
      );

      for (const r of results) {
        if (r.status !== "fulfilled" || !r.value) continue;
        const { href, title, eventDate, venue, address, timeRange } = r.value;

        await addEventRecord(byId, {
          sourceObj, eventDate, title, url: href,
          venue, rawAddress: sanitizeAddressText(address),
          timeRange, cityName: "鴨川市", prefixLabel: "鴨川市",
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
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

/**
 * 長南町: RSS フィード → 月間予定ページ → テーブル解析
 *
 * RSS: /yotei/feed/ → 「2026年3月の予定」等のページURLを取得
 * テーブル: <tr><td>N日（X）</td><td>【event（venue）time】...</td></tr>
 * 全角数字の日付、【】で区切られた複数イベント、（venue）time パターン
 */
const CHONAN_KNOWN_FACILITIES = {
  "長南保育所": "長生郡長南町長南759",
  "中央公民館": "長生郡長南町長南2125",
  "保健センター": "長生郡長南町長南2110",
  "長生学園幼稚園": "長生郡長南町長南2064-3",
};
const CHONAN_CHILD_KW = /園庭|園舎|ぴよぴよ|乳児|健康診査|歯科|保育|子育て|親子|児童|おはなし|読み聞かせ|ベビー|幼児|卒園|入園/;

function createCollectChonanEvents(deps) {
  const { CHONAN_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = CHONAN_SOURCE;

  return async function collectChonanEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    // 1) RSS フィードから月間ページURLを取得
    let rssItems;
    try {
      const rssXml = await fetchText(`${sourceObj.baseUrl}/yotei/feed/`);
      rssItems = parseRssFeed(rssXml);
    } catch (e) {
      console.warn(`[${label}] RSS fetch failed:`, e.message || e);
      return [];
    }

    // 月間ページURLを抽出（最新2ヶ月分）
    const monthPages = rssItems
      .filter(item => /\d+年\s*\d+月の予定/.test(item.title))
      .slice(0, 2);

    for (const page of monthPages) {
      // タイトルから年月を抽出
      const ymMatch = page.title.match(/(\d{4})年\s*(\d{1,2})月/);
      if (!ymMatch) continue;
      const pageYear = Number(ymMatch[1]);
      const pageMonth = Number(ymMatch[2]);

      let html;
      try {
        html = await fetchText(page.url);
      } catch (e) {
        console.warn(`[${label}] page fetch failed (${page.url}):`, e.message || e);
        continue;
      }

      // テーブル行を解析
      const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let tr;
      while ((tr = trRe.exec(html)) !== null) {
        const row = tr[1];
        const tds = row.split(/<td[^>]*>/i);
        if (tds.length < 3) continue;

        // 日付: 全角・半角数字 + 日（曜日）
        const dayText = stripTags(tds[1]).trim().normalize("NFKC");
        const dayMatch = dayText.match(/^(\d{1,2})日/);
        if (!dayMatch) continue;
        const d = Number(dayMatch[1]);

        // イベント列
        const evText = stripTags(tds[2]).trim().normalize("NFKC");
        if (!evText) continue;

        // 【...】で区切られた個別イベントを抽出
        const eventRe = /【([^】]+)】/g;
        let em;
        while ((em = eventRe.exec(evText)) !== null) {
          const raw = em[1].trim();
          if (!CHONAN_CHILD_KW.test(raw)) continue;
          if (!inRangeJst(pageYear, pageMonth, d, maxDays)) continue;

          // イベント名・会場・時間を分解
          // パターン: "イベント名（会場）H:MM～H:MM" or "イベント名（会場）"
          let title = raw;
          let venue = "";
          let timeRange = null;

          // 会場抽出: （...）パターン
          const venueMatch = raw.match(/（([^）]{2,20})）/);
          if (venueMatch) {
            venue = venueMatch[1].trim();
            title = raw.replace(/（[^）]+）/, "").trim();
          }

          // 時間抽出: H:MM～H:MM or H：MM～
          const timeMatch = raw.match(/(\d{1,2})[：:](\d{2})\s*[～~ー-]\s*(?:(\d{1,2})[：:](\d{2}))?/);
          if (timeMatch) {
            timeRange = {
              startH: Number(timeMatch[1]),
              startM: Number(timeMatch[2]),
              endH: timeMatch[3] ? Number(timeMatch[3]) : null,
              endM: timeMatch[4] ? Number(timeMatch[4]) : null,
            };
            // 時間部分をタイトルから除去
            title = title.replace(/\d{1,2}[：:]\d{2}\s*[～~ー-]\s*(?:\d{1,2}[：:]\d{2})?/, "").trim();
          }

          // タイトルクリーンアップ
          title = title.replace(/[[\]「」『』]/g, "").trim();
          if (!title || title.length < 2) continue;

          // 既知施設のアドレス解決
          let rawAddress = "";
          for (const [name, addr] of Object.entries(CHONAN_KNOWN_FACILITIES)) {
            if (venue.includes(name) || raw.includes(name)) {
              rawAddress = addr;
              if (!venue) venue = name;
              break;
            }
          }

          await addEventRecord(byId, {
            sourceObj, eventDate: { y: pageYear, mo: pageMonth, d },
            title, url: page.url,
            venue, rawAddress, timeRange,
            cityName: "長南町", prefixLabel: "長生郡長南町",
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

/**
 * 香取市: 山田児童館 定期教室・行事
 *
 * ページ: /kosodate/shien_sodan/yamadajidokan/index.html
 * h3/h4 構造: プログラム名(h3) → 対象/日時/内容(h4)
 * 日時パターン: 「毎月第N X曜日」「月N回 X曜日」→ expandNthWeekday/expandWeekly
 * 全イベント単一施設: 山田児童館（香取市長岡1307-1）
 */
const KATORI_KNOWN_FACILITIES = {
  "山田児童館": "香取市長岡1307番地1",
  "子育て支援センターにこにこ": "香取市長岡1307番地1",
};

function createCollectKatoriEvents(deps) {
  const { KATORI_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = KATORI_SOURCE;

  return async function collectKatoriEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();
    const pageUrl = `${sourceObj.baseUrl}/kosodate/shien_sodan/yamadajidokan/index.html`;

    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${label}] page fetch failed:`, e.message || e);
      return [];
    }

    const defaultVenue = "山田児童館";
    const rawAddress = "香取市長岡1307番地1";

    // h3 セクションに分割し、各プログラムの日時を取得
    const h3Parts = html.split(/<h3[^>]*>/i);
    let inSection = false;
    for (let si = 1; si < h3Parts.length; si++) {
      const section = h3Parts[si];
      const titleEnd = section.indexOf("</h3>");
      if (titleEnd < 0) continue;
      const sectionTitle = stripTags(section.substring(0, titleEnd)).trim();

      // 「行事・教室案内」以降のセクションのみ処理
      if (/行事・教室案内/.test(sectionTitle)) { inSection = true; continue; }
      if (/子育て支援センター/.test(sectionTitle)) { inSection = true; continue; }
      if (/関連情報|香取市役所/.test(sectionTitle)) break;
      if (!inSection) continue;
      // 利用案内/開館時間/休館日 等はスキップ
      if (/利用案内|開館時間|休館日|利用対象|利用方法|山田児童館公式/.test(sectionTitle)) continue;

      const title = sectionTitle.replace(/（要申し込み）/, "").trim();
      if (!title || title.length < 2) continue;

      // セクション内の h4 "日時" を探す
      const h4Parts = section.split(/<h4[^>]*>/i);
      let schedText = "";
      for (let hi = 1; hi < h4Parts.length; hi++) {
        const h4End = h4Parts[hi].indexOf("</h4>");
        if (h4End < 0) continue;
        const h4Title = stripTags(h4Parts[hi].substring(0, h4End)).trim();
        if (h4Title !== "日時") continue;
        // h4 本文: </h4> 直後から次の h4 まで
        const bodyStart = h4End + 5;
        const bodyHtml = h4Parts[hi].substring(bodyStart);
        schedText = stripTags(bodyHtml).trim().normalize("NFKC");
        break;
      }
      if (!schedText) continue;

      // 会場判定: 子育て支援センター系
      const currentVenue = /バブちゃんサロン|からだであそぼう|にこにこクラブ/.test(title)
        ? "子育て支援センターにこにこ" : defaultVenue;

      // 時間抽出
      let timeRange = null;
      const tMatch = schedText.match(/(?:午前|午後)?(\d{1,2})時(\d{0,2})分?\s*(?:から|～)/);
      if (tMatch) {
        let startH = Number(tMatch[1]);
        const startM = Number(tMatch[2] || 0);
        if (/午後/.test(schedText.substring(0, schedText.indexOf(tMatch[0]) + 5)) && startH < 12) startH += 12;

        const endMatch = schedText.match(/(?:から|～)\s*(?:午前|午後)?(\d{1,2})時(\d{0,2})分?/);
        let endH = null, endM = null;
        if (endMatch) {
          endH = Number(endMatch[1]);
          endM = Number(endMatch[2] || 0);
          if (/午後/.test(schedText.substring(schedText.indexOf(endMatch[0]) - 5, schedText.indexOf(endMatch[0]) + 3)) && endH < 12) endH += 12;
        }
        timeRange = { startH, startM, endH, endM };
      }

      // 1) 毎月第N・第M X曜日
      const nthMatch = schedText.match(/毎月第(\d)[・・]?(?:第(\d))?\s*([月火水木金土日])曜日/);
      if (nthMatch) {
        const dow = DAY_OF_WEEK_MAP[nthMatch[3]];
        if (dow !== undefined) {
          const nth1 = Number(nthMatch[1]);
          const dates1 = expandNthWeekday(nth1, dow, maxDays);
          for (const ed of dates1) {
            await addEventRecord(byId, {
              sourceObj, eventDate: ed, title, url: pageUrl,
              venue: currentVenue, rawAddress, timeRange,
              cityName: "香取市", prefixLabel: "香取市",
              geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
          if (nthMatch[2]) {
            const nth2 = Number(nthMatch[2]);
            const dates2 = expandNthWeekday(nth2, dow, maxDays);
            for (const ed of dates2) {
              await addEventRecord(byId, {
                sourceObj, eventDate: ed, title, url: pageUrl,
                venue: currentVenue, rawAddress, timeRange,
                cityName: "香取市", prefixLabel: "香取市",
                geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
              });
            }
          }
          continue;
        }
      }

      // 2) 毎月N回 X曜日 (expandWeekly で近似)
      const monthlyMatch = schedText.match(/月\d+回\s*([月火水木金土日])曜日/);
      if (monthlyMatch) {
        const dow = DAY_OF_WEEK_MAP[monthlyMatch[1]];
        if (dow !== undefined) {
          const dates = expandWeekly(dow, maxDays);
          for (const ed of dates) {
            await addEventRecord(byId, {
              sourceObj, eventDate: ed, title, url: pageUrl,
              venue: currentVenue, rawAddress, timeRange,
              cityName: "香取市", prefixLabel: "香取市",
              geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
          continue;
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}


/**
 * 君津市: みふねの里子育て支援センター月間カレンダー + ハローベビークラス
 * リストページからリンクを辿り、☆イベント名 (D日 時間) パターンを抽出
 */
function createCollectKimitsuKosodateEvents(deps) {
  const { KIMITSU_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = KIMITSU_SOURCE;
  const cityName = "君津市";

  return async function collectKimitsuKosodateEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    // 1) みふねの里 — リストページからカレンダーリンクを探す
    const listUrl = "https://www.city.kimitsu.lg.jp/site/kosodate/list8-15.html";
    let listHtml;
    try {
      listHtml = await fetchText(listUrl);
    } catch (e) {
      console.warn(`[${label}] list page fetch failed:`, e.message || e);
      return [];
    }

    const calLinks = [];
    const linkRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(listHtml)) !== null) {
      const href = lm[1].trim();
      const text = stripTags(lm[2]).trim();
      if (/みふねの里.*カレンダー/.test(text) && /\d+月/.test(text)) {
        const absUrl = href.startsWith("http") ? href : `https://www.city.kimitsu.lg.jp${href}`;
        calLinks.push({ url: absUrl, text });
      }
    }
    // Take latest 2 monthly calendars
    const calPages = calLinks.slice(0, 2);

    // Also include ハローベビークラス
    const extraPages = [
      { url: "https://www.city.kimitsu.lg.jp/site/kosodate/28995.html", title: "ハローベビークラス" },
      { url: "https://www.city.kimitsu.lg.jp/site/kosodate/5082.html", title: "ピカピカはみがき教室" },
    ];

    // Parse みふねの里 calendar pages
    const mifuneVenue = "みふねの里子育て支援センター";
    const mifuneAddress = "君津市久保2丁目13番1号";
    for (const cp of calPages) {
      let html;
      try {
        html = await fetchText(cp.url);
      } catch (e) { continue; }
      const text = stripTags(html).normalize("NFKC");

      // Extract month context from title: "3月のカレンダー"
      const monthMatch = cp.text.match(/(\d{1,2})月/);
      if (!monthMatch) continue;
      const calMonth = Number(monthMatch[1]);
      const now = new Date(Date.now() + 9 * 3600 * 1000);
      const calYear = (calMonth < now.getUTCMonth()) ? now.getUTCFullYear() + 1 : now.getUTCFullYear();

      // Find ☆ event entries: "☆「タイトル」 (D日 午前H時からH時)" or "☆タイトル （D日 午前H時からH時）"
      const eventRe = /[☆★]\s*(?:[「「]([^」」\n]{2,40})[」」]|([^（(\n☆★]{2,40}?))\s*[（(]\s*(\d{1,2})日\s*(午前|午後)?\s*(\d{1,2})時(\d{0,2})分?から\s*(\d{1,2})時?/g;
      let em;
      while ((em = eventRe.exec(text)) !== null) {
        let title = (em[1] || em[2] || "").trim();
        const d = Number(em[3]);
        const ampm = em[4] || "";
        let startH = Number(em[5]);
        const startM = Number(em[6] || 0);
        const endH = Number(em[7]);
        if (ampm === "午後" && startH < 12) startH += 12;

        if (!inRangeJst(calYear, calMonth, d, maxDays)) continue;

        const eventDate = { y: calYear, mo: calMonth, d };
        const timeRange = { startH, startM, endH, endM: 0 };
        await addEventRecord(byId, {
          sourceObj, eventDate, title, url: cp.url,
          venue: mifuneVenue, rawAddress: mifuneAddress, timeRange,
          cityName, prefixLabel: cityName,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }

      // Also pick "誕生会" pattern: "☆誕生会 （19日 午前10時から30分程度）"
      const bdayRe = /[☆★]\s*(誕生会)\s*[（(]\s*(\d{1,2})日\s*(午前|午後)?\s*(\d{1,2})時/g;
      while ((em = bdayRe.exec(text)) !== null) {
        const title = em[1];
        const d = Number(em[2]);
        let startH = Number(em[4]);
        if (em[3] === "午後" && startH < 12) startH += 12;
        if (!inRangeJst(calYear, calMonth, d, maxDays)) continue;
        await addEventRecord(byId, {
          sourceObj, eventDate: { y: calYear, mo: calMonth, d },
          title, url: cp.url,
          venue: mifuneVenue, rawAddress: mifuneAddress,
          timeRange: { startH, startM: 0, endH: startH, endM: 30 },
          cityName, prefixLabel: cityName,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    // Parse extra pages (ハローベビー, はみがき教室)
    for (const ep of extraPages) {
      let detail;
      try {
        detail = await fetchDetailInfo(ep.url);
      } catch (e) { continue; }
      if (detail.allDates.length === 0) continue;
      const venue = detail.venue || "君津市保健福祉センター";
      const rawAddr = detail.address || "君津市久保2丁目13番1号";
      for (const dt of detail.allDates) {
        if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
        await addEventRecord(byId, {
          sourceObj, eventDate: dt, title: ep.title, url: ep.url,
          venue, rawAddress: rawAddr, timeRange: detail.timeRange,
          cityName, prefixLabel: cityName,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} kosodate events collected`);
    return results;
  };
}

/**
 * 松戸市: 松戸子育てネットワーク (matsudo-kosodate.com) 各支援センター月間スケジュール
 * 8つの子育て支援センターの月間カレンダーページからイベントを抽出
 */
function createCollectMatsudoKosodateEvents(deps) {
  const { MATSUDO_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = MATSUDO_SOURCE;
  const cityName = "松戸市";

  const CENTERS = [
    { slug: "cms", name: "CMS子育て支援センター" },
    { slug: "aoba", name: "あおば子育て支援センター" },
    { slug: "cherish", name: "チェリッシュ・サポート・システム" },
    { slug: "kosuzume", name: "子すずめ子育て支援センター" },
    { slug: "dream", name: "ドリーム子育て支援センター" },
    { slug: "hanamizuki", name: "はなみずき子育て支援センター" },
    { slug: "grace", name: "グレイス子育て支援センター" },
    { slug: "oka", name: "風の丘子育て支援センター" },
  ];

  /** Convert HTML to structured lines (preserve <br>, <p>, <h4> boundaries) */
  function htmlToLines(html) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|h[1-6]|div|li|tr|td|th)>/gi, "\n")
      .replace(/<(?:p|h[1-6]|div|li|tr|td|th)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .normalize("NFKC")
      .split(/\n+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
  }

  /** Extract time range from text */
  function extractTime(text) {
    const colonMatch = text.match(/(\d{1,2})\s*[:：]\s*(\d{2})\s*[～~ー―-]\s*(\d{1,2})\s*[:：]\s*(\d{2})/);
    if (colonMatch) return {
      startH: Number(colonMatch[1]), startM: Number(colonMatch[2]),
      endH: Number(colonMatch[3]), endM: Number(colonMatch[4]),
    };
    const ampmMatch = text.match(/(午前|午後)?\s*(\d{1,2})時(\d{0,2})分?\s*[～~ー―-]\s*(\d{1,2})時/);
    if (ampmMatch) {
      let sh = Number(ampmMatch[2]);
      if (ampmMatch[1] === "午後" && sh < 12) sh += 12;
      return { startH: sh, startM: Number(ampmMatch[3] || 0), endH: Number(ampmMatch[4]), endM: 0 };
    }
    return null;
  }

  /** Extract day numbers from text, given month context */
  function extractDays(text, calMonth) {
    const days = new Set();
    let dm;
    // M月D日(曜)
    const mdRe = /(\d{1,2})月(\d{1,2})日/g;
    while ((dm = mdRe.exec(text)) !== null) {
      if (Number(dm[1]) === calMonth) days.add(Number(dm[2]));
    }
    // D日(曜)
    const dayWdRe = /(\d{1,2})日\s*[（(]([月火水木金土日])[)）]/g;
    while ((dm = dayWdRe.exec(text)) !== null) {
      const d = Number(dm[1]);
      if (d >= 1 && d <= 31) days.add(d);
    }
    // M/D or M/D(曜)
    const slashRe = /(\d{1,2})\/(\d{1,2})/g;
    while ((dm = slashRe.exec(text)) !== null) {
      if (Number(dm[1]) === calMonth) days.add(Number(dm[2]));
    }
    // bare D日 (no weekday)
    if (days.size === 0) {
      const bareDayRe = /(\d{1,2})日/g;
      while ((dm = bareDayRe.exec(text)) !== null) {
        const d = Number(dm[1]);
        if (d >= 1 && d <= 31) days.add(d);
      }
    }
    // D~D日 or D、D、D日
    if (days.size === 0) {
      const rangeMatch = text.match(/(\d{1,2})\s*[～~ー―-]\s*(\d{1,2})日/);
      if (rangeMatch) {
        const s = Number(rangeMatch[1]), e = Number(rangeMatch[2]);
        if (s >= 1 && e <= 31 && s <= e) for (let d = s; d <= e; d++) days.add(d);
      }
    }
    return days;
  }

  /** Check if line is an event header (not navigation/address/phone) */
  function isEventLine(line) {
    if (/住\s*所|交\s*通|TEL|FAX|^\d{3}-\d{4}|電話|アクセス|駐車場/.test(line)) return false;
    if (/バス.*行き|徒歩\d+分|下車/.test(line)) return false;
    return true;
  }

  /** Check if original line can provide an event title */
  function isValidHeaderLine(origLine) {
    if (!origLine || origLine.length < 3 || origLine.length > 60) return false;
    // Skip marker lines (handled by Strategy 1)
    if (/^[★◆☆●■◎※*～~]/.test(origLine)) return false;
    // Skip metadata headers: 【担 当】, 【講 師】, 【フロア】, 【日 時】, etc.
    if (/^【(?:担|講|テーマ|フロア|対|日)/.test(origLine)) return false;
    // Skip descriptions/qualifiers
    if (/^対\s*象|^場\s*所|^申\s*[込し]|^持ち物|^定\s*員|^費\s*用|^内容|^募集|^限定/.test(origLine)) return false;
    if (/^日\s*時|^\d{1,2}[月\/]/.test(origLine)) return false;
    if (/予約\s*[〆締]切|受付[はをで開]|^\d{1,2}日[（(]|QRコード/.test(origLine)) return false;
    // Skip descriptive/instructional text
    if (/だより|号\s*$|ください|しましょう|ております|ご持参|します。|ます。|です。/.test(origLine)) return false;
    // Skip center names and facility names
    if (/子育て支援|サポート・システム|こどもセンター/.test(origLine)) return false;
    // Skip date fragments, broken text, social media
    if (/^\d{4}年\d{1,2}月\s*$|^マーク|[』】]\s*\.{2,}/.test(origLine)) return false;
    if (/^[（(]|フォロー|で検索|[a-z]{5,}\d/.test(origLine)) return false;
    return true;
  }

  /** Clean raw line into event title */
  function cleanTitle(line) {
    return line
      .replace(/^[『「「【]/g, "").replace(/[』」」】]$/g, "")
      .replace(/[（(][^)）]{0,20}[)）]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 40);
  }

  return async function collectMatsudoKosodateEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    for (const center of CENTERS) {
      const pageUrl = `https://www.matsudo-kosodate.com/${center.slug}.html`;
      let html;
      try {
        html = await fetchText(pageUrl, { timeout: 35000 });
      } catch (e) {
        console.warn(`[${label}] ${center.name} fetch failed:`, e.message);
        continue;
      }

      const lines = htmlToLines(html);
      const fullText = lines.join(" ");

      // Determine month context
      const now = new Date(Date.now() + 9 * 3600 * 1000);
      const monthMatch = fullText.match(/(\d{1,2})月の(?:カレンダー|予定|スケジュール|おたより|お知らせ)/);
      let calMonth, calYear;
      if (monthMatch) {
        calMonth = Number(monthMatch[1]);
        calYear = now.getUTCFullYear();
        if (calMonth < now.getUTCMonth()) calYear++;
      } else {
        const anyMonth = fullText.match(/(\d{1,2})月/);
        calMonth = anyMonth ? Number(anyMonth[1]) : now.getUTCMonth() + 1;
        calYear = now.getUTCFullYear();
      }

      // Strategy 1: Marker-delimited blocks (★/◆/☆/●/■) in joined text
      const markerBlocks = fullText.split(/(?=[★◆☆●■])/).filter(b => /^[★◆☆●■]/.test(b) && b.length > 5);
      for (const block of markerBlocks) {
        if (!isEventLine(block)) continue;

        let eventTitle = "";
        const bm = block.match(/^[★◆☆●■]\s*(?:【([^】]+)】|[「「]([^」」]+)[」」]|([^\d\n（(★◆☆●■]{2,30}))/);
        if (bm) eventTitle = (bm[1] || bm[2] || bm[3] || "").trim();
        // Some markers have dates first, title after: "★ 2/17(火)13:00~15:30 EVENT_NAME"
        if (!eventTitle || eventTitle.length < 2) {
          const afterDate = block.match(/\d{1,2}:\d{2}\s+([^\d（(]{2,30})/);
          if (afterDate) eventTitle = afterDate[1].trim();
        }
        if (!eventTitle || eventTitle.length < 2) continue;
        eventTitle = eventTitle.replace(/日\s*時\s*[:：].*$/, "").replace(/\s+/g, " ").trim();
        if (eventTitle.length > 40) eventTitle = eventTitle.substring(0, 40);

        const days = extractDays(block, calMonth);
        if (days.size === 0) continue;
        const timeRange = extractTime(block);

        for (const day of days) {
          if (!inRangeJst(calYear, calMonth, day, maxDays)) continue;
          await addEventRecord(byId, {
            sourceObj, eventDate: { y: calYear, mo: calMonth, d: day },
            title: eventTitle, url: pageUrl,
            venue: center.name, rawAddress: "",
            timeRange, cityName, prefixLabel: cityName,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }

      // Strategy 2: Line-based event extraction for non-marker pages
      // Patterns: header line → date line (grace, dream, oka, kosuzume)
      // "EVENT_NAME (予約制)" then "日 時:M月D日(曜) H:MM~H:MM"
      // or 『EVENT_NAME』 then 【日 時】D日(曜) H:MM~H:MM
      let currentHeader = "";
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!isEventLine(line)) { currentHeader = ""; continue; }

        // Check if this line contains a date
        const days = extractDays(line, calMonth);
        if (days.size === 0) {
          // Potential event header
          if (isValidHeaderLine(line)) {
            currentHeader = cleanTitle(line);
          }
          continue;
        }

        // Find event title: text before date on same line, or current header
        let eventTitle = "";
        // Skip marker-prefixed lines (already handled by Strategy 1)
        if (/^[★◆☆●■]/.test(line)) continue;
        // On-line title: "EVENT_NAME 日 時:..." or "EVENT_NAME M月D日..."
        const beforeDate = line.match(/^([^\d◎※*～]{2,30}?)(?:\s*[（(][^)）]*[)）])?\s*(?:日\s*時|[\d])/);
        if (beforeDate) {
          const candidate = beforeDate[1].replace(/日\s*時.*$/, "").replace(/\s+/g, " ").trim();
          if (candidate.length >= 2 && isValidHeaderLine(candidate)) eventTitle = candidate;
        }
        if (!eventTitle || eventTitle.length < 2) eventTitle = currentHeader;
        if (!eventTitle || eventTitle.length < 2) continue;
        if (eventTitle.length > 40) eventTitle = eventTitle.substring(0, 40);

        // Also try time from next line if not on current line
        let timeRange = extractTime(line);
        if (!timeRange && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (/\d{1,2}\s*[:：]\s*\d{2}/.test(nextLine) && !/\d{1,2}月\d{1,2}日/.test(nextLine)) {
            timeRange = extractTime(nextLine);
          }
        }

        for (const day of days) {
          if (!inRangeJst(calYear, calMonth, day, maxDays)) continue;
          await addEventRecord(byId, {
            sourceObj, eventDate: { y: calYear, mo: calMonth, d: day },
            title: eventTitle, url: pageUrl,
            venue: center.name, rawAddress: "",
            timeRange, cityName, prefixLabel: cityName,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} kosodate center events collected`);
    return results;
  };
}


/**
 * 市原市: いちはら子ども未来館 (we-hall.jp) WordPress Tribe Events REST API
 * カテゴリ227 (今日の未来館 = 全カテゴリ統合) のイベントを取得
 */
function createCollectIchiharaKodomomiraiEvents(deps) {
  const { ICHIHARA_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = ICHIHARA_SOURCE;
  const cityName = "市原市";

  return async function collectIchiharaKodomomiraiEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();

    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const startDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

    // Fetch events with pagination
    let allEvents = [];
    for (let page = 1; page <= 4; page++) {
      const apiUrl = `https://www.we-hall.jp/wp-json/tribe/events/v1/events?per_page=50&page=${page}&categories=227&start_date=${startDate}`;
      let json;
      try {
        const text = await fetchText(apiUrl);
        json = JSON.parse(text);
      } catch (e) {
        if (page === 1) console.warn(`[${label}] we-hall API fetch failed:`, e.message);
        break;
      }
      const pageEvents = json.events || [];
      allEvents.push(...pageEvents);
      if (allEvents.length >= (json.total || 0) || pageEvents.length < 50) break;
    }

    const venue = "いちはら子ども未来館";
    const rawAddress = "市原市更級5丁目1-18";

    for (const ev of allEvents) {
      const dateMatch = (ev.start_date || "").match(/(\d{4})-(\d{2})-(\d{2})\s*(\d{2}):(\d{2})/);
      if (!dateMatch) continue;

      const eventDate = {
        y: Number(dateMatch[1]),
        mo: Number(dateMatch[2]),
        d: Number(dateMatch[3]),
      };
      if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;

      const startH = Number(dateMatch[4]);
      const startM = Number(dateMatch[5]);
      let endH = startH + 1, endM = 0;
      const endMatch = (ev.end_date || "").match(/(\d{2}):(\d{2})/);
      if (endMatch) {
        endH = Number(endMatch[1]);
        endM = Number(endMatch[2]);
      }
      const timeRange = { startH, startM, endH, endM };

      const title = stripTags(ev.title || "").trim();
      if (!title) continue;

      const eventUrl = ev.url || `https://www.we-hall.jp/`;
      await addEventRecord(byId, {
        sourceObj, eventDate, title, url: eventUrl,
        venue, rawAddress, timeRange,
        cityName, prefixLabel: cityName,
        geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} we-hall events collected`);
    return results;
  };
}


/**
 * 松戸市: 図書館おはなし会スケジュール
 * https://www.city.matsudo.chiba.jp/library/kodomo/ohanasi.html
 * テーブル7セクション + テキストリスト1セクション
 */
function createCollectMatsudoLibraryEvents(deps) {
  const { MATSUDO_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = MATSUDO_SOURCE;
  const cityName = "松戸市";
  const pageUrl = "https://www.city.matsudo.chiba.jp/library/kodomo/ohanasi.html";

  function parseTimeText(text) {
    const m = text.match(/(\d{1,2})時(\d{1,2})?分?\s*から\s*(\d{1,2})時(\d{1,2})?分?/);
    if (!m) return null;
    return { startH: Number(m[1]), startM: Number(m[2] || 0), endH: Number(m[3]), endM: Number(m[4] || 0) };
  }

  function parseDateCell(text) {
    const m = text.match(/(\d{1,2})月\s*(\d{1,2})日/);
    return m ? { mo: Number(m[1]), d: Number(m[2]) } : null;
  }

  function stripRoom(venue) {
    return venue.replace(/[（(][^）)]*[）)]/g, "").trim();
  }

  return async function collectMatsudoLibraryEvents(maxDays) {
    const byId = new Map();
    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${sourceObj.label}] library page fetch failed:`, e.message);
      return [];
    }

    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const curYear = now.getUTCFullYear();
    const curMonth = now.getUTCMonth() + 1;

    function resolveYear(mo) {
      return mo < curMonth ? curYear + 1 : curYear;
    }

    // --- Parse tables ---
    const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];

    // For each table, find the section title by looking backwards for the nearest h2
    const sectionHeaders = [];
    const headerRe = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    let hm;
    const skipRe = /^(お問い合わせ|この情報|こどものページ|このページ|お気に立|松戸市立|お気に入り|図書館のおはなし会)/;
    while ((hm = headerRe.exec(html)) !== null) {
      const text = hm[1].replace(/<[^>]+>/g, "").trim();
      if (!skipRe.test(text)) sectionHeaders.push({ pos: hm.index, text });
    }

    function findSectionTitle(tablePos) {
      let best = null;
      for (const h of sectionHeaders) {
        if (h.pos < tablePos) best = h.text;
      }
      return best || "";
    }

    for (let ti = 0; ti < tables.length; ti++) {
      const tableHtml = tables[ti];
      const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      if (rows.length < 2) continue;

      const headerCells = (rows[0].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
        .map(c => c.replace(/<[^>]+>/g, "").trim());
      const colCount = headerCells.length;
      if (colCount < 2) continue;

      const hasTimeCol = headerCells.some(h => h === "時間");
      const hasVenueCol = headerCells.some(h => h === "会場");
      const hasGroupCol = headerCells.some(h => h === "団体名");

      // Determine section info
      const tablePos = html.indexOf(tableHtml);
      const sectionTitle = findSectionTitle(tablePos);

      // For group tables, extract venue from section title
      let fixedVenue = null;
      if (hasGroupCol) {
        const vm = sectionTitle.match(/[（(]([^）)]+)[）)]/);
        if (vm) fixedVenue = vm[1];
      }

      // For tables without time column, look for time after the table
      let fixedTime = null;
      if (!hasTimeCol) {
        const afterTable = html.substring(tablePos + tableHtml.length, tablePos + tableHtml.length + 500);
        const tm = afterTable.match(/(\d{1,2})時(\d{1,2})?分?\s*から\s*(\d{1,2})時(\d{1,2})?分?/);
        if (tm) fixedTime = { startH: Number(tm[1]), startM: Number(tm[2] || 0), endH: Number(tm[3]), endM: Number(tm[4] || 0) };
      }

      // Determine event title from section
      let eventTitle = sectionTitle.replace(/[（(][^）)]*[）)]/g, "").trim();
      if (!eventTitle || /グループ/.test(eventTitle)) eventTitle = "おはなし会";

      for (let ri = 1; ri < rows.length; ri++) {
        const cells = (rows[ri].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
          .map(c => c.replace(/<[^>]+>/g, "").trim());
        if (cells.length < 2) continue;

        const dateInfo = parseDateCell(cells[0]);
        if (!dateInfo) continue;

        const y = resolveYear(dateInfo.mo);
        if (!inRangeJst(y, dateInfo.mo, dateInfo.d, maxDays)) continue;

        let timeRange = fixedTime;
        let venue = fixedVenue;
        let groupName = null;

        if (hasTimeCol && hasVenueCol && cells.length >= 3) {
          timeRange = parseTimeText(cells[1]) || fixedTime;
          venue = cells[2];
        } else if (hasTimeCol && hasGroupCol && cells.length >= 3) {
          timeRange = parseTimeText(cells[1]) || fixedTime;
          groupName = cells[2];
        } else if (!hasTimeCol && hasVenueCol && cells.length >= 2) {
          venue = cells[1];
        }

        if (!venue) continue;

        const displayVenue = venue;
        const lookupVenue = stripRoom(venue);
        const title = groupName ? `${eventTitle}（${groupName}）` : eventTitle;

        const rawAddress = lookupVenue;
        const eventDate = { y, mo: dateInfo.mo, d: dateInfo.d };
        await addEventRecord(byId, {
          sourceObj, eventDate, title, url: pageUrl,
          venue: displayVenue, rawAddress, timeRange,
          cityName, prefixLabel: cityName,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    // --- Parse 小さい子のためのおはなし会 (text list, not a table) ---
    const chiisaiMatch = html.match(/<h2[^>]*>[^<]*小さい子のためのおはなし会[^<]*<\/h2>([\s\S]*?)<h2/);
    if (chiisaiMatch) {
      const block = chiisaiMatch[1].replace(/<[^>]+>/g, "\n");
      const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      let listMonth = 0;
      let amTime = { startH: 10, startM: 30, endH: 11, endM: 0 };
      let pmTime = { startH: 14, startM: 30, endH: 15, endM: 0 };
      const venue = "子ども読書推進センター";

      // Extract actual times from section text (午前の部/午後の部)
      const amMatch = block.match(/午前の部[：:]?\s*(\d{1,2})時(\d{1,2})?分?\s*から\s*(\d{1,2})時(\d{1,2})?分?/);
      if (amMatch) amTime = { startH: Number(amMatch[1]), startM: Number(amMatch[2] || 0), endH: Number(amMatch[3]), endM: Number(amMatch[4] || 0) };
      const pmMatch = block.match(/午後の部[：:]?\s*(\d{1,2})時(\d{1,2})?分?\s*から\s*(\d{1,2})時(\d{1,2})?分?/);
      if (pmMatch) pmTime = { startH: Number(pmMatch[1]), startM: Number(pmMatch[2] || 0), endH: Number(pmMatch[3]), endM: Number(pmMatch[4] || 0) };

      let chiisaiCount = 0;
      for (const line of lines) {
        const monthMatch = line.match(/^(\d{1,2})月$/);
        if (monthMatch) { listMonth = Number(monthMatch[1]); continue; }
        if (listMonth === 0) continue;

        const dayMatch = line.match(/^(\d{1,2})日[（(]/);
        if (!dayMatch) continue;
        const day = Number(dayMatch[1]);
        const y = resolveYear(listMonth);
        if (!inRangeJst(y, listMonth, day, maxDays)) continue;

        const hasAm = /午前/.test(line);
        const hasPm = /午後/.test(line);

        if (hasAm) {
          await addEventRecord(byId, {
            sourceObj, eventDate: { y, mo: listMonth, d: day },
            title: "小さい子のためのおはなし会（午前の部）", url: pageUrl,
            venue, rawAddress: venue, timeRange: amTime,
            cityName, prefixLabel: cityName,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
          chiisaiCount++;
        }
        if (hasPm) {
          await addEventRecord(byId, {
            sourceObj, eventDate: { y, mo: listMonth, d: day },
            title: "小さい子のためのおはなし会（午後の部）", url: pageUrl,
            venue, rawAddress: venue, timeRange: pmTime,
            cityName, prefixLabel: cityName,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
          chiisaiCount++;
        }
      }
      if (chiisaiCount > 0) console.log(`[${sourceObj.label}] +${chiisaiCount} chiisai events`);
    }

    const results = Array.from(byId.values());
    console.log(`[${sourceObj.label}] ${results.length} library events collected`);
    return results;
  };
}

/**
 * 市原市: 社協子育てサロン (ichihara-shakyo.or.jp)
 * 定期開催スケジュールから日付を生成
 */
function createCollectIchiharaSalonEvents(deps) {
  const { ICHIHARA_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = ICHIHARA_SOURCE;
  const cityName = "市原市";
  const pageUrl = "https://www.ichihara-shakyo.or.jp/m03_p01.html";

  const DOW_MAP = { "日": 0, "月": 1, "火": 2, "水": 3, "木": 4, "金": 5, "土": 6 };
  const NTH_MAP = { "１": 1, "1": 1, "２": 2, "2": 2, "３": 3, "3": 3, "４": 4, "4": 4 };

  function nthWeekdayOfMonth(year, month, dow, nth) {
    const first = new Date(Date.UTC(year, month - 1, 1));
    let d = 1 + ((dow - first.getUTCDay() + 7) % 7);
    d += (nth - 1) * 7;
    if (d > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
    return d;
  }

  function generateDates(scheduleText, maxDays) {
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endDate = new Date(startDate.getTime() + maxDays * 86400000);
    const dates = [];

    // Parse 毎週X・Y曜日 or 毎週X曜日
    const weeklyMatch = scheduleText.match(/毎週\s*([日月火水木金土])(?:[・,]([日月火水木金土]))?曜/);
    if (weeklyMatch) {
      const dows = [DOW_MAP[weeklyMatch[1]]];
      if (weeklyMatch[2]) dows.push(DOW_MAP[weeklyMatch[2]]);
      for (let d = new Date(startDate); d < endDate; d.setUTCDate(d.getUTCDate() + 1)) {
        if (dows.includes(d.getUTCDay())) {
          dates.push({ y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate() });
        }
      }
      return dates;
    }

    // Parse 毎月第N X曜日 or 第N・第M X曜日
    const monthlyMatches = [...scheduleText.matchAll(/第([１-４1-4])(?:[・,]第?([１-４1-4]))?[  ]*([日月火水木金土])曜/g)];
    if (monthlyMatches.length > 0) {
      for (let m = new Date(startDate); m < endDate; m.setUTCMonth(m.getUTCMonth() + 1)) {
        const year = m.getUTCFullYear();
        const month = m.getUTCMonth() + 1;
        for (const mm of monthlyMatches) {
          const dow = DOW_MAP[mm[3]];
          const nths = [NTH_MAP[mm[1]]];
          if (mm[2]) nths.push(NTH_MAP[mm[2]]);
          for (const nth of nths) {
            const day = nthWeekdayOfMonth(year, month, dow, nth);
            if (!day) continue;
            const dt = new Date(Date.UTC(year, month - 1, day));
            if (dt >= startDate && dt < endDate) {
              dates.push({ y: year, mo: month, d: day });
            }
          }
        }
      }
      return dates;
    }

    // 年N回(M,M,M月) with specific months
    const yearlyMatch = scheduleText.match(/年[０-９\d]+回[（(]([^）)]+)[）)]/);
    if (yearlyMatch) {
      const monthsStr = yearlyMatch[1].replace(/[月,、]/g, " ").trim();
      const months = monthsStr.split(/\s+/).map(Number).filter(n => n >= 1 && n <= 12);
      for (const mo of months) {
        const y = mo < (now.getUTCMonth() + 1) ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
        const mid = 15;
        const dt = new Date(Date.UTC(y, mo - 1, mid));
        if (dt >= startDate && dt < endDate) {
          dates.push({ y, mo, d: mid });
        }
      }
      return dates;
    }

    return dates;
  }

  function parseTime(text) {
    const m = text.match(/(\d{1,2}):(\d{2})[〜~～-](\d{1,2}):(\d{2})/);
    if (m) return { startH: Number(m[1]), startM: Number(m[2]), endH: Number(m[3]), endM: Number(m[4]) };
    return null;
  }

  return async function collectIchiharaSalonEvents(maxDays) {
    const byId = new Map();
    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${sourceObj.label}] salon page fetch failed:`, e.message);
      return [];
    }

    const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
    // Find the salon table (has header row with 地区名/会場/実施日/時間)
    let salonTable = null;
    for (const t of tables) {
      if (/実施日/.test(t) && /会　*場/.test(t)) { salonTable = t; break; }
    }
    if (!salonTable) {
      console.warn(`[${sourceObj.label}] salon table not found`);
      return [];
    }

    const rows = salonTable.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (let i = 2; i < rows.length; i++) {
      const cells = (rows[i].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
        .map(c => c.replace(/<[^>]+>/g, "").trim());

      let venue, schedule, timeText;
      if (cells.length >= 4) {
        venue = cells[1]; schedule = cells[2]; timeText = cells[3];
      } else if (cells.length >= 3) {
        venue = cells[0]; schedule = cells[1]; timeText = cells[2];
      } else continue;

      venue = venue.replace(/（地図はこちら）/g, "").trim();
      if (!venue || !schedule) continue;

      const timeRange = parseTime(timeText);
      const dates = generateDates(schedule, maxDays);

      const displayVenue = venue;
      const lookupVenue = venue.replace(/[（(][^）)]*[）)]/g, "").trim();

      const salonTitle = `子育てサロン（${lookupVenue}）`;
      for (const eventDate of dates) {
        await addEventRecord(byId, {
          sourceObj, eventDate,
          title: salonTitle,
          url: pageUrl,
          venue: displayVenue, rawAddress: lookupVenue, timeRange,
          cityName, prefixLabel: cityName,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${sourceObj.label}] ${results.length} salon events collected`);
    return results;
  };
}

/**
 * 成田市: narita-kosodate.jp (SHIRASAGI CMS)
 * ICSフィードから全イベントURL取得 → 詳細ページで日時・会場・座標を抽出
 */
function createCollectNaritaKosodateEvents(deps) {
  const { NARITA_SOURCE } = require("../../config/wards");
  const KNOWN_NARITA_FACILITIES = require("../../config/known-facilities").narita;
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = NARITA_SOURCE;
  const cityName = "成田市";
  const baseUrl = "https://narita-kosodate.jp";

  /** ICS VEVENT → { url, title, dateStr } */
  function parseIcs(icsText) {
    const events = [];
    const blocks = icsText.split("BEGIN:VEVENT");
    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      const url = (b.match(/URL:(https?:\/\/[^\r\n]+)/) || [])[1] || "";
      const summary = (b.match(/SUMMARY:([^\r\n]+)/) || [])[1] || "";
      const dtstart = (b.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/) || [])[1] || "";
      if (!url || !dtstart) continue;
      events.push({
        url: url.trim(),
        title: summary.trim(),
        dateStr: dtstart,
      });
    }
    return events;
  }

  /** 詳細ページからdt/dd + 埋め込み座標を抽出 */
  async function fetchNaritaDetail(url) {
    const html = await fetchText(url);
    const result = { venue: "", time: null, lat: 0, lng: 0 };

    // dt/dd パターンで会場/日時を取得
    const dlRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    let dm;
    while ((dm = dlRe.exec(html)) !== null) {
      const k = stripTags(dm[1]).trim();
      const v = stripTags(dm[2]).trim();
      if (/イベント名称/.test(k) && !result.title) result.title = v;
      if (/日時/.test(k)) {
        // 午前10時30分～11時00分 or 10時30分～11時00分
        const tm = v.match(/(午前|午後)?\s*(\d{1,2})時(\d{0,2})分?\s*[～~ー―-]\s*(\d{1,2})時(\d{0,2})分?/);
        if (tm) {
          let sh = Number(tm[2]);
          if (tm[1] === "午後" && sh < 12) sh += 12;
          result.time = { startH: sh, startM: Number(tm[3] || 0), endH: Number(tm[4]), endM: Number(tm[5] || 0) };
        }
      }
    }

    // 座標: {"name":"会場名","loc":[lng,lat]}
    const locMatch = html.match(/"name"\s*:\s*"([^"]+)"\s*,\s*"loc"\s*:\s*\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/);
    if (locMatch) {
      result.venue = locMatch[1];
      result.lng = Number(locMatch[2]);
      result.lat = Number(locMatch[3]);
    }

    // 会場名が座標から取れない場合、タイトルの括弧内から
    if (!result.venue) {
      const paren = (result.title || "").match(/[（(]([^）)]+)[）)]/);
      if (paren) result.venue = paren[1];
    }

    return result;
  }

  return async function collectNaritaKosodateEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();
    const now = new Date(Date.now() + 9 * 3600 * 1000);

    // 今月〜2ヶ月先のICSフィードを取得
    const months = [];
    for (let offset = 0; offset <= 2; offset++) {
      const d = new Date(now.getUTCFullYear(), now.getUTCMonth() + offset, 1);
      months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const allIcsEvents = [];
    for (const ym of months) {
      const icsUrl = `${baseUrl}/calendar/${ym}/list.ics`;
      try {
        const icsText = await fetchText(icsUrl);
        allIcsEvents.push(...parseIcs(icsText));
      } catch (e) {
        console.warn(`[${label}] ICS fetch failed (${ym}):`, e.message);
      }
    }

    // URLで重複除去
    const uniqueByUrl = new Map();
    for (const ev of allIcsEvents) {
      const key = `${ev.url}:${ev.dateStr}`;
      if (!uniqueByUrl.has(key)) uniqueByUrl.set(key, ev);
    }

    // 日付フィルタ
    const filtered = [];
    for (const ev of uniqueByUrl.values()) {
      const y = Number(ev.dateStr.substring(0, 4));
      const mo = Number(ev.dateStr.substring(4, 6));
      const d = Number(ev.dateStr.substring(6, 8));
      if (inRangeJst(y, mo, d, maxDays)) {
        filtered.push({ ...ev, y, mo, d });
      }
    }

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(filtered.map(e => e.url))];
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(u => fetchNaritaDetail(u)));
      for (let j = 0; j < batch.length; j++) {
        if (results[j].status === "fulfilled") detailMap.set(batch[j], results[j].value);
      }
    }

    for (const ev of filtered) {
      const detail = detailMap.get(ev.url) || {};
      const title = ev.title.replace(/[（(][^）)]*[）)]/, "").trim() || ev.title;
      const venue = detail.venue || "";
      const eventDate = { y: ev.y, mo: ev.mo, d: ev.d };

      // 座標が詳細ページにあればそれを使う
      let point = null;
      if (detail.lat && detail.lng && detail.lat > 35 && detail.lng > 139) {
        point = { lat: detail.lat, lng: detail.lng };
      }

      if (!point) {
        // ジオコーディングフォールバック
        const geoCandidates = buildGeoCandidatesForCity(cityName, venue, "", cityName);
        if (getFacilityAddressFromMaster && venue) {
          const fmAddr = getFacilityAddressFromMaster(sourceObj.key, venue);
          if (fmAddr) {
            const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
            geoCandidates.unshift(full);
          }
        }
        point = await geocodeForWard(geoCandidates.slice(0, 7), sourceObj);
      }

      point = resolveEventPoint(sourceObj, venue, point, `${cityName} ${venue}`);
      const resolvedAddr = resolveEventAddress(sourceObj, venue, `${cityName} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(eventDate, detail.time || null);
      const source = `ward_${sourceObj.key}`;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${source}:${ev.url}:${title}:${dateKey}`;
      if (byId.has(id)) continue;

      byId.set(id, {
        id, source,
        source_label: label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: resolvedAddr || "",
        url: ev.url,
        lat: point ? point.lat : sourceObj.center.lat,
        lng: point ? point.lng : sourceObj.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} narita-kosodate events collected`);
    return results;
  };
}


/**
 * 我孫子市: 子育てイベントカレンダー (list_calendar形式)
 * カレンダーページから日付→イベントリンクを取得 → 詳細ページで会場・時間を抽出
 */
function createCollectAbikoKosodateEvents(deps) {
  const { ABIKO_SOURCE } = require("../../config/wards");
  const KNOWN_ABIKO_FACILITIES = require("../../config/known-facilities").abiko;
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = ABIKO_SOURCE;
  const cityName = "我孫子市";
  const calBase = "https://www.city.abiko.chiba.jp/kosodate/children/kosodate_event/calendar/";

  return async function collectAbikoKosodateEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();
    const now = new Date(Date.now() + 9 * 3600 * 1000);

    // 今月〜2ヶ月先のカレンダーを取得
    const calUrls = [];
    for (let offset = 0; offset <= 2; offset++) {
      const d = new Date(now.getUTCFullYear(), now.getUTCMonth() + offset, 1);
      const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (offset === 0) {
        calUrls.push({ url: `${calBase}list_calendar.html`, y: d.getFullYear(), mo: d.getMonth() + 1 });
      } else {
        calUrls.push({ url: `${calBase}list_calendar${ym}.html`, y: d.getFullYear(), mo: d.getMonth() + 1 });
      }
    }

    // カレンダーから日付→イベントリンクを収集
    const eventLinks = [];
    for (const cal of calUrls) {
      let html;
      try {
        html = await fetchText(cal.url);
      } catch (e) {
        console.warn(`[${label}] calendar fetch failed (${cal.url}):`, e.message);
        continue;
      }

      // All <tr> rows (event/sun/sat/holiday etc.) can have events
      // Look for <td class="date" id="dayN">N日</td> + <td class="einfo"> with <a> links
      const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rm;
      while ((rm = rowRe.exec(html)) !== null) {
        const row = rm[1];
        // Skip header row
        if (/<th\b/.test(row)) continue;
        // Extract day from <td class="date" id="dayN">
        const dayMatch = row.match(/class="date"[^>]*>\s*(\d{1,2})日/);
        if (!dayMatch) continue;
        const day = Number(dayMatch[1]);

        // Check for "no events" spacer
        if (/alt="イベントはありません"/.test(row)) continue;

        const linkRe2 = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let lm2;
        while ((lm2 = linkRe2.exec(row)) !== null) {
          const href = lm2[1].replace(/&amp;/g, "&").trim();
          const title = stripTags(lm2[2]).trim();
          if (!href || !title || title.length < 2) continue;
          // Skip calendar navigation links
          if (/cal_icon/.test(lm2[0]) || /calendar/.test(href)) continue;
          let absUrl = href.startsWith("http") ? href :
            href.startsWith("/") ? `${sourceObj.baseUrl}${href}` :
            new URL(href, cal.url).href;
          eventLinks.push({ url: absUrl, title, y: cal.y, mo: cal.mo, d: day });
        }
      }
    }

    // 日付フィルタ
    const filtered = eventLinks.filter(e => inRangeJst(e.y, e.mo, e.d, maxDays));

    // 詳細ページバッチ取得 — Abiko uses h2bg/wysiwyg_wp format, not dt/dd
    const detailUrls = [...new Set(filtered.map(e => e.url))].slice(0, 50);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(async (url) => {
        const html = await fetchText(url);
        let venue = "";
        let timeRange = null;
        // Parse h2bg sections: <h2>LABEL</h2> ... <div class="wysiwyg_wp"><p>VALUE</p>
        const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
        let hm;
        while ((hm = h2Re.exec(html)) !== null) {
          const label = stripTags(hm[1]).trim();
          // Get text after this h2 up to next h2bg
          const afterPos = hm.index + hm[0].length;
          const after = html.substring(afterPos, afterPos + 500);
          const pMatch = after.match(/<p[^>]*>([\s\S]*?)<\/p>/);
          if (!pMatch) continue;
          const value = stripTags(pMatch[1]).trim();
          if (/^場所$|^会場$/.test(label)) venue = value;
          if (/^日時$|^時間$/.test(label) && !timeRange) {
            const tm = value.match(/(午前|午後)?\s*(\d{1,2})時(\d{0,2})分?\s*から\s*(\d{1,2})時(\d{0,2})分?/);
            if (tm) {
              let sh = Number(tm[2]);
              if (tm[1] === "午後" && sh < 12) sh += 12;
              timeRange = { startH: sh, startM: Number(tm[3] || 0), endH: Number(tm[4]), endM: Number(tm[5] || 0) };
            }
          }
        }
        // Also try dt/dd (for some other pages)
        if (!venue) {
          const ddRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
          let ddm;
          while ((ddm = ddRe.exec(html)) !== null) {
            const k = stripTags(ddm[1]).trim();
            const v = stripTags(ddm[2]).trim();
            if (!venue && /(会場|場所)/.test(k)) venue = v;
          }
        }
        // Also try <li>場所：... and text-level patterns
        if (!venue) {
          const liRe3 = /<li[^>]*>([\s\S]*?)<\/li>/gi;
          let lm3;
          while ((lm3 = liRe3.exec(html)) !== null) {
            const v = stripTags(lm3[1]).trim();
            if (/^(?:【)?(?:場所|会場)(?:】|[：:])/.test(v)) {
              venue = v.replace(/^(?:【)?(?:場所|会場)(?:】|[：:])\s*/, "").trim();
              break;
            }
          }
        }
        if (!venue) {
          const textVenue = stripTags(html).match(/(?:場所|会場)\s*[：:]\s*([^\n]{3,30})/);
          if (textVenue) venue = textVenue[1].trim();
        }
        return { url, venue, timeRange };
      }));
      for (let j = 0; j < batch.length; j++) {
        if (results[j].status === "fulfilled") detailMap.set(batch[j], results[j].value);
      }
    }

    for (const ev of filtered) {
      const detail = detailMap.get(ev.url) || {};
      // Extract venue from title parentheses as fallback: "おはなし会（図書館アビスタ本館）"
      let venue = detail.venue || "";
      if (!venue) {
        const titleVenue = ev.title.match(/[（(]([^）)]+)[）)]/);
        if (titleVenue) venue = titleVenue[1];
      }
      venue = sanitizeVenueText(venue);
      const timeRange = detail.timeRange || null;

      await addEventRecord(byId, {
        sourceObj, eventDate: { y: ev.y, mo: ev.mo, d: ev.d },
        title: ev.title, url: ev.url,
        venue, rawAddress: venue, timeRange,
        cityName, prefixLabel: cityName,
        geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} abiko kosodate events collected`);
    return results;
  };
}


/**
 * 鎌ケ谷市: kamakko.info 児童センター + 市立図書館
 * 6児童センターの個別ページからイベント情報を抽出
 */
function createCollectKamagayaKosodateEvents(deps) {
  const { KAMAGAYA_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = KAMAGAYA_SOURCE;
  const cityName = "鎌ケ谷市";

  const CENTERS = [
    { url: "https://kamakko.info/asobiba/jido-center/chuo-2/", name: "中央児童センター" },
    { url: "https://kamakko.info/asobiba/jido-center/minami-2/", name: "南児童センター" },
    { url: "https://kamakko.info/asobiba/jido-center/kunugiyama-2/", name: "くぬぎ山児童センター" },
    { url: "https://kamakko.info/asobiba/jido-center/kitanakazawa/", name: "北中沢児童センター" },
    { url: "https://kamakko.info/asobiba/jido-center/awano/", name: "粟野児童センター" },
    { url: "https://kamakko.info/asobiba/jido-center/toubu/", name: "東部児童センター" },
  ];

  return async function collectKamagayaKosodateEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();
    const now = new Date(Date.now() + 9 * 3600 * 1000);

    for (const center of CENTERS) {
      let html;
      try {
        html = await fetchText(center.url);
      } catch (e) {
        console.warn(`[${label}] ${center.name} fetch failed:`, e.message);
        continue;
      }

      // ☆日時テーブルからイベント抽出
      // Structure: <table> with <td>☆日　時</td><td>令和8年M月D日(曜)時間</td>
      const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
      for (const table of tables) {
        const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        let dateText = "";
        let venueText = "";
        for (const row of rows) {
          const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [])
            .map(c => c.replace(/<[^>]+>/g, "").trim());
          if (cells.length < 2) continue;
          const k = cells[0].replace(/\s+/g, "");
          if (/☆?日\s*時/.test(k)) dateText = cells[1];
          if (/☆?場\s*所/.test(k)) venueText = cells[1];
        }
        if (!dateText) continue;

        // Find event title from preceding heading
        const tablePos = html.indexOf(table);
        const before = html.substring(Math.max(0, tablePos - 1000), tablePos);
        let eventTitle = "";
        // Try <h3>title</h3> or <strong><mark>【title】</mark></strong>
        const h3Match = before.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/gi);
        if (h3Match) {
          const last = h3Match[h3Match.length - 1];
          eventTitle = last.replace(/<[^>]+>/g, "").trim();
        }
        if (!eventTitle) {
          const markMatch = before.match(/【([^】]{2,30})】/g);
          if (markMatch) eventTitle = markMatch[markMatch.length - 1].replace(/[【】]/g, "");
        }
        if (!eventTitle || eventTitle.length < 2) continue;

        // Parse dates from dateText (令和N年M月D日 or M月D日)
        const dates = parseDatesFromText(dateText);
        if (dates.length === 0) {
          // Try M月D日 without year
          const mdRe = /(\d{1,2})月(\d{1,2})日/g;
          let mdm;
          while ((mdm = mdRe.exec(dateText)) !== null) {
            const mo = Number(mdm[1]);
            const d = Number(mdm[2]);
            const y = mo < (now.getUTCMonth() + 1) ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
            dates.push({ y, mo, d });
          }
        }

        // Parse time
        const timeMatch = dateText.match(/(午前|午後)?\s*(\d{1,2})時(\d{0,2})分?\s*[～~ー―-]\s*(\d{1,2})時(\d{0,2})分?/);
        let timeRange = null;
        if (timeMatch) {
          let sh = Number(timeMatch[2]);
          if (timeMatch[1] === "午後" && sh < 12) sh += 12;
          timeRange = { startH: sh, startM: Number(timeMatch[3] || 0), endH: Number(timeMatch[4]), endM: Number(timeMatch[5] || 0) };
        }

        const venue = venueText || center.name;
        for (const dt of dates) {
          if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
          await addEventRecord(byId, {
            sourceObj, eventDate: dt,
            title: eventTitle, url: center.url,
            venue, rawAddress: "", timeRange,
            cityName, prefixLabel: cityName,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} kamagaya kosodate events collected`);
    return results;
  };
}


/**
 * 佐倉市: 市立図書館イベント
 * library.city.sakura.lg.jp のイベント一覧 + おはなし会スケジュール
 */
function createCollectSakuraLibraryEvents(deps) {
  const { SAKURA_SOURCE } = require("../../config/wards");
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = SAKURA_SOURCE;
  const cityName = "佐倉市";
  const libBase = "https://www.library.city.sakura.lg.jp";

  return async function collectSakuraLibraryEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const curYear = now.getUTCFullYear();
    const curMonth = now.getUTCMonth() + 1;

    function resolveYear(mo) {
      if (mo < curMonth - 1) return curYear + 1;
      return curYear;
    }

    // 1) おはなしきゃらばん定期公演 — table schedule
    for (const pageId of ["626", "565"]) {
      const pageUrl = `${libBase}/viewer/info.html?id=${pageId}&g=8`;
      let html;
      try { html = await fetchText(pageUrl); } catch { continue; }

      const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trm;
      while ((trm = trRe.exec(html)) !== null) {
        const row = trm[1];
        if (/<th[\s>]/i.test(row)) continue;
        const tds = [];
        const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdm;
        while ((tdm = tdRe.exec(row)) !== null) tds.push(stripTags(tdm[1]).trim());
        if (tds.length < 3) continue;

        const dateMatch = tds[0].match(/(\d{1,2})月(\d{1,2})日/);
        if (!dateMatch) continue;
        const mo = Number(dateMatch[1]);
        const d = Number(dateMatch[2]);
        const y = resolveYear(mo);
        if (!inRangeJst(y, mo, d, maxDays)) continue;

        const tMatch = tds[1].match(/(午前|午後)\s*(\d{1,2})時(\d{1,2})?分?/);
        let timeRange = null;
        if (tMatch) {
          let h = Number(tMatch[2]);
          const m = tMatch[3] ? Number(tMatch[3]) : 0;
          if (tMatch[1] === "午後" && h < 12) h += 12;
          timeRange = { startH: h, startM: m, endH: h + 1, endM: 0 };
        }

        const venue = tds[tds.length - 1];
        if (!venue || venue.length < 2) continue;

        await addEventRecord(byId, {
          sourceObj, eventDate: { y, mo, d },
          title: "おはなしきゃらばん定期公演", url: pageUrl,
          venue, rawAddress: "", timeRange,
          cityName, prefixLabel: cityName,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    }

    // 2) 佐倉南図書館おはなし会 (baby story time) — ol/li format
    try {
      const babyUrl = `${libBase}/viewer/info.html?id=892&g=4`;
      const html = await fetchText(babyUrl);
      const text = stripTags(html).normalize("NFKC");

      // Handle spaces in CMS output (e.g., "2 月12 日")
      const mMatch = text.match(/(\d{1,2})\s*月\s*\d{1,2}\s*日/);
      const babyMonth = mMatch ? Number(mMatch[1]) : curMonth;
      const babyYear = resolveYear(babyMonth);

      const dateSection = text.match(/【日時】([\s\S]*?)(?:\d+\.)?【場所】/);
      const dateText = dateSection ? dateSection[1] : "";
      const days = new Set();
      // Handle spaces between digits and 日 (CMS artifact: "12 日")
      const dayRe = /(\d{1,2})\s*日/g;
      let dm;
      while ((dm = dayRe.exec(dateText)) !== null) {
        const d = Number(dm[1]);
        if (d >= 1 && d <= 31) days.add(d);
      }

      const tMatch = dateText.match(/(\d{1,2})時[～~ー-](\d{1,2})時(\d{1,2})?分?/);
      let timeRange = null;
      if (tMatch) {
        timeRange = {
          startH: Number(tMatch[1]), startM: 0,
          endH: Number(tMatch[2]), endM: tMatch[3] ? Number(tMatch[3]) : 0,
        };
      }

      const venueSection = text.match(/【場所】\s*([^\n【]{2,30})/);
      // Trim trailing list numbering artifact (e.g., "佐倉南図書館 3.")
      const venue = venueSection ? venueSection[1].trim().replace(/\s*\d+\.\s*$/, "") : "佐倉南図書館";

      const titleMatch = text.match(/「([^」]{3,40})」/);
      const title = titleMatch ? titleMatch[1] : "おはなし会";

      for (const day of days) {
        if (!inRangeJst(babyYear, babyMonth, day, maxDays)) continue;
        await addEventRecord(byId, {
          sourceObj, eventDate: { y: babyYear, mo: babyMonth, d: day },
          title, url: babyUrl, venue, rawAddress: "", timeRange,
          cityName, prefixLabel: cityName,
          geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
        });
      }
    } catch (e) {
      console.warn(`[${label}] baby story time error: ${e.message}`);
    }

    // 3) 文庫連おはなし会 (recurring monthly dates)
    try {
      const bunkoUrl = `${libBase}/viewer/info.html?id=720&g=8`;
      const html = await fetchText(bunkoUrl);
      const text = stripTags(html).normalize("NFKC");
      const bunkoVenue = "夢咲くら館（佐倉図書館）";

      // Use section markers to extract date ranges (actual text has 日程(予定) not 日程：)
      const schedSections = [
        { startMarker: "こんぴらおはなし会", endMarker: "ポコアポコ",
          title: "こんぴらおはなし会",
          time: { startH: 10, startM: 30, endH: 11, endM: 0 } },
        { startMarker: "ポコアポコおはなし会", endMarker: null,
          title: "ポコアポコおはなし会",
          time: { startH: 11, startM: 0, endH: 11, endM: 30 } },
      ];

      for (const s of schedSections) {
        const si = text.indexOf(s.startMarker);
        if (si < 0) continue;
        const afterStart = si + s.startMarker.length;
        const ei = s.endMarker ? text.indexOf(s.endMarker, afterStart) : -1;
        const section = text.substring(si, ei >= 0 ? ei : si + 500);
        const dateRe = /(\d{1,2})月(\d{1,2})日/g;
        let dm;
        while ((dm = dateRe.exec(section)) !== null) {
          const mo = Number(dm[1]);
          const d = Number(dm[2]);
          const y = resolveYear(mo);
          if (!inRangeJst(y, mo, d, maxDays)) continue;
          await addEventRecord(byId, {
            sourceObj, eventDate: { y, mo, d },
            title: s.title, url: bunkoUrl,
            venue: bunkoVenue, rawAddress: "", timeRange: s.time,
            cityName, prefixLabel: cityName,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    } catch (e) {
      console.warn(`[${label}] bunko fetch error: ${e.message}`);
    }

    // 4) イベント一覧 — additional child events
    const knownIds = /id=892|id=626|id=565|id=720/;
    try {
      const childLinks = [];
      for (let p = 1; p <= 2; p++) {
        const listUrl = `${libBase}/viewer/genre1.html?id=4${p > 1 ? `&Page=${p}` : ""}`;
        let listHtml;
        try { listHtml = await fetchText(listUrl); } catch { break; }
        const linkRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let lm;
        while ((lm = linkRe.exec(listHtml)) !== null) {
          const href = lm[1].replace(/&amp;/g, "&").trim();
          const text = stripTags(lm[2]).trim();
          if (!href || !text || text.length < 3) continue;
          if (!/viewer\/info\.html/.test(href)) continue;
          if (!isChildEvent(text, "")) continue;
          const absUrl = href.startsWith("http") ? href : `${libBase}/${href.replace(/^\.\.\//, "")}`;
          if (knownIds.test(absUrl)) continue;
          childLinks.push({ title: text, url: absUrl });
        }
      }
      const uniqueUrls = [...new Set(childLinks.map(l => l.url))].slice(0, 15);
      for (let i = 0; i < uniqueUrls.length; i += DETAIL_BATCH_SIZE) {
        const batch = uniqueUrls.slice(i, i + DETAIL_BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(u => fetchDetailInfo(u)));
        for (let j = 0; j < batch.length; j++) {
          if (results[j].status !== "fulfilled") continue;
          const detail = results[j].value;
          const link = childLinks.find(l => l.url === batch[j]);
          if (!link) continue;
          let dates = (detail.allDates && detail.allDates.length > 0)
            ? detail.allDates : detail.eventDate ? [detail.eventDate] : [];
          if (dates.length === 0 && detail.text) {
            const mdRe = /(\d{1,2})月(\d{1,2})日/g;
            let mdm;
            while ((mdm = mdRe.exec(detail.text)) !== null) {
              dates.push({ y: resolveYear(Number(mdm[1])), mo: Number(mdm[1]), d: Number(mdm[2]) });
            }
          }
          for (const eventDate of dates) {
            if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;
            const venue = sanitizeVenueText(detail.venue || "");
            const rawAddress = sanitizeAddressText(detail.address || "");
            await addEventRecord(byId, {
              sourceObj, eventDate, title: link.title, url: link.url,
              venue, rawAddress, timeRange: detail.timeRange,
              cityName, prefixLabel: cityName,
              geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
        }
      }
    } catch (e) {
      console.warn(`[${label}] event list error: ${e.message}`);
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} sakura library events collected`);
    return results;
  };
}


/**
 * 印西市: 市立図書館おはなし会 + イベント
 * library.city.inzai.lg.jp のイベント一覧 + 月次おはなし会ページ
 */
function createCollectInzaiLibraryEvents(deps) {
  const { INZAI_SOURCE } = require("../../config/wards");
  const KNOWN_INZAI_FACILITIES = require("../../config/known-facilities").inzai;
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = INZAI_SOURCE;
  const cityName = "印西市";
  const libBase = "https://www.library.city.inzai.lg.jp";

  return async function collectInzaiLibraryEvents(maxDays) {
    const label = sourceObj.label;
    const byId = new Map();
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const curMonth = now.getUTCMonth() + 1;
    const curYear = now.getUTCFullYear();

    // 1) イベントカテゴリページからリンク収集
    const eventPageUrl = `${libBase}/category/event/`;
    let eventHtml;
    try {
      eventHtml = await fetchText(eventPageUrl);
    } catch (e) {
      console.warn(`[${label}] event page fetch failed:`, e.message);
      eventHtml = "";
    }

    // イベントリンクを収集 (WordPress numeric slugs)
    const linkRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const links = [];
    let lm;
    if (eventHtml) {
      while ((lm = linkRe.exec(eventHtml)) !== null) {
        const href = lm[1].replace(/&amp;/g, "&").trim();
        const text = stripTags(lm[2]).trim();
        if (!href || !text || text.length < 3) continue;
        if (/\.(pdf|jpg|png)$/i.test(href)) continue;
        const absUrl = href.startsWith("http") ? href :
          href.startsWith("/") ? `${libBase}${href}` : new URL(href, eventPageUrl).href;
        if (!absUrl.startsWith(libBase)) continue;
        // Strip leading publish date from link text (WordPress date+h3 inside <a>)
        const cleanText = text.replace(/^\d{4}年\d{1,2}月\d{1,2}日\s*/, "");
        // Filter for child/story time events
        if (!isChildEvent(cleanText, "") && !/おはなし|えほん|よみ/.test(cleanText)) continue;
        links.push({ title: cleanText, url: absUrl });
      }
    }

    // 詳細ページから日付・会場を取得 (skip story time monthly posts — parsed below)
    const detailUrls = [...new Set(links.filter(l => !/月のおはなし会/.test(l.title)).map(l => l.url))].slice(0, 15);
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(u => fetchDetailInfo(u)));
      for (let j = 0; j < batch.length; j++) {
        if (results[j].status !== "fulfilled") continue;
        const detail = results[j].value;
        const link = links.find(l => l.url === batch[j]);
        if (!link) continue;
        let dates = (detail.allDates && detail.allDates.length > 0)
          ? detail.allDates : detail.eventDate ? [detail.eventDate] : [];
        // Fallback: M月D日 without year (common on Inzai detail pages)
        if (dates.length === 0 && detail.text) {
          const mdRe = /(\d{1,2})月(\d{1,2})日/g;
          let mdm;
          while ((mdm = mdRe.exec(detail.text)) !== null) {
            const mo = Number(mdm[1]);
            const d = Number(mdm[2]);
            const y = mo < curMonth - 1 ? curYear + 1 : curYear;
            dates.push({ y, mo, d });
          }
        }
        for (const eventDate of dates) {
          if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;
          const venue = sanitizeVenueText(detail.venue || "");
          const rawAddress = sanitizeAddressText(detail.address || "");
          await addEventRecord(byId, {
            sourceObj, eventDate, title: link.title, url: link.url,
            venue, rawAddress, timeRange: detail.timeRange,
            cityName, prefixLabel: cityName,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    }

    // 2) 月次おはなし会ページを直接パース — <li> format
    // Find story time links from event listing, or use known URL
    const storyLinks = links.filter(l => /月のおはなし会/.test(l.title));
    if (storyLinks.length === 0) {
      // Try well-known recent post IDs
      for (const pid of ["7994", "7500", "7000"]) {
        try {
          const testUrl = `${libBase}/${pid}/`;
          const testHtml = await fetchText(testUrl);
          if (/月のおはなし会/.test(testHtml)) {
            storyLinks.push({ title: "おはなし会", url: testUrl });
            break;
          }
        } catch { /* skip */ }
      }
    }

    for (const sl of storyLinks) {
      let html;
      try { html = await fetchText(sl.url); } catch { continue; }

      // Get month from title: "<h1>M月のおはなし会</h1>"
      const monthMatch = html.match(/(\d{1,2})月のおはなし会/);
      if (!monthMatch) continue;
      const storyMonth = Number(monthMatch[1]);
      const storyYear = storyMonth < curMonth - 1 ? curYear + 1 : curYear;

      // Parse <li> elements directly from HTML
      const liRe = /<li>([\s\S]*?)<\/li>/gi;
      let lim;
      while ((lim = liRe.exec(html)) !== null) {
        const liContent = lim[1];
        if (/休館/.test(liContent)) continue;

        const text = stripTags(liContent).normalize("NFKC").trim();

        // Branch: text before （場所：
        const branchMatch = text.match(/^(.+?)(?:[（(]場所[：:])/);
        if (!branchMatch) continue;
        const branch = branchMatch[1].trim();

        // Dates: all D日 matches (after branch/venue line)
        const afterBr = text.replace(/^.*?[）)]/, ""); // text after the venue paren
        const dayRe = /(\d{1,2})日/g;
        let dm;
        const days = new Set();
        while ((dm = dayRe.exec(afterBr)) !== null) {
          const d = Number(dm[1]);
          if (d >= 1 && d <= 31) days.add(d);
        }
        if (days.size === 0) continue;

        // Time: HH:MM pattern
        const timeMatch = afterBr.match(/(\d{1,2}):(\d{2})/);
        let timeRange = null;
        if (timeMatch) {
          const sh = Number(timeMatch[1]);
          const sm = Number(timeMatch[2]);
          timeRange = { startH: sh, startM: sm, endH: sh, endM: sm + 30 };
        }

        for (const day of days) {
          if (!inRangeJst(storyYear, storyMonth, day, maxDays)) continue;
          await addEventRecord(byId, {
            sourceObj, eventDate: { y: storyYear, mo: storyMonth, d: day },
            title: `おはなし会（${branch}）`, url: sl.url,
            venue: branch, rawAddress: "", timeRange,
            cityName, prefixLabel: cityName,
            geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} inzai library events collected`);
    return results;
  };
}


module.exports = {
  createCollectMobaraEvents,
  createCollectTateyamaEvents,
  createCollectKamogawaEvents,
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
  createCollectKatoriEvents,
  createCollectKimitsuKosodateEvents,
  createCollectMatsudoKosodateEvents,
  createCollectIchiharaKodomomiraiEvents,
  createCollectMatsudoLibraryEvents,
  createCollectIchiharaSalonEvents,
  createCollectNaritaKosodateEvents,
  createCollectAbikoKosodateEvents,
  createCollectKamagayaKosodateEvents,
  createCollectSakuraLibraryEvents,
  createCollectInzaiLibraryEvents,
};
