/**
 * 茨城県 追加9自治体コレクター
 * 八千代町, 五霞町, 大洗町, 河内町, 茨城町, 北茨城市, 牛久市, 阿見町, 利根町
 */
const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const PREF = "茨城県";

// ---- 共通ヘルパー ----

function buildIbarakiGeoCandidates(cityName, venue, address, fmAddr) {
  const cands = [];
  if (fmAddr) cands.push(/茨城県/.test(fmAddr) ? fmAddr : `${PREF}${fmAddr}`);
  if (address) {
    const full = address.includes(cityName) ? address : `${cityName}${address}`;
    cands.push(full.includes(PREF) ? full : `${PREF}${full}`);
  }
  if (venue) cands.push(`${PREF}${cityName} ${venue}`);
  return [...new Set(cands)].slice(0, 7);
}

function currentFiscalYear() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = jst.getUTCMonth() + 1;
  return m >= 4 ? y : y - 1;
}

function jstNow() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return { y: jst.getUTCFullYear(), mo: jst.getUTCMonth() + 1 };
}

function extractPdfLinksFromHtml(html, pageUrl) {
  const links = [];
  const re = /<a\s+[^>]*href="([^"]*\.pdf[^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&");
    try {
      links.push(new URL(href, pageUrl).href);
    } catch { /* skip */ }
  }
  return [...new Set(links)];
}

function extractDatesFromPdfText(text) {
  const dates = [];
  const nText = text.normalize("NFKC");
  // 令和N年M月D日
  const reRe = /令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
  let m;
  while ((m = reRe.exec(nText)) !== null) {
    dates.push({ y: 2018 + Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  // M月D日
  const fy = currentFiscalYear();
  const lines = nText.split(/\n/);
  for (const line of lines) {
    if (/令和|年/.test(line)) continue;
    const mdRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
    let md;
    while ((md = mdRe.exec(line)) !== null) {
      const mo = Number(md[1]);
      const d = Number(md[2]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        const y = mo >= 4 ? fy : fy + 1;
        const dup = dates.some(dd => dd.y === y && dd.mo === mo && dd.d === d);
        if (!dup) dates.push({ y, mo, d });
      }
    }
  }
  // RN.M.D(曜) 形式
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
  return dates;
}

function parseDateFromCellText(text, fallbackYear) {
  const n = text.normalize("NFKC");
  const m = n.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!m) return null;
  const mo = Number(m[1]);
  const d = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const fy = fallbackYear || currentFiscalYear();
  return { y: mo >= 4 ? fy : fy + 1, mo, d };
}

async function makeEvent(byId, opts) {
  const {
    sourceObj, title, url, eventDate, venue, rawAddress, timeRange,
    cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = opts;
  const srcKey = `ward_${sourceObj.key}`;
  const dateKey = `${eventDate.y}${String(eventDate.mo).padStart(2, "0")}${String(eventDate.d).padStart(2, "0")}`;
  const id = `${srcKey}:${url}:${title}:${dateKey}`;
  if (byId.has(id)) return;

  const venueName = sanitizeVenueText(venue || "");
  const addr = sanitizeAddressText(rawAddress || "");
  const fmAddr = getFacilityAddressFromMaster ? getFacilityAddressFromMaster(sourceObj.key, venueName) : null;
  const cands = buildIbarakiGeoCandidates(cityName, venueName, addr, fmAddr);

  let point = await geocodeForWard(cands, sourceObj);
  point = resolveEventPoint(sourceObj, venueName, point, addr || `${cityName} ${venueName}`);
  const resolvedAddr = resolveEventAddress(sourceObj, venueName, addr || `${cityName} ${venueName}`, point);

  const { startsAt, endsAt } = buildStartsEndsForDate(eventDate, timeRange);
  byId.set(id, {
    id,
    source: srcKey,
    source_label: sourceObj.label,
    title,
    starts_at: startsAt,
    ends_at: endsAt,
    venue_name: venueName,
    address: resolvedAddr || "",
    url,
    lat: point ? point.lat : sourceObj.center.lat,
    lng: point ? point.lng : sourceObj.center.lng,
  });
}


// ---- 1. 八千代町 ----

function createCollectYachiyoIbEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const { YACHIYO_IB_SOURCE } = require("../../config/wards");
  const sourceObj = YACHIYO_IB_SOURCE;
  const cityName = "八千代町";
  const pages = [
    { url: "https://www.town.ibaraki-yachiyo.lg.jp/page/page009063.html", defaultVenue: "保健センター" },
    { url: "https://www.town.ibaraki-yachiyo.lg.jp/page/page009560.html", defaultVenue: "子育て交流サロン" },
  ];

  return async function collectYachiyoIbEvents(maxDays) {
    const byId = new Map();
    for (const page of pages) {
      try {
        const html = await fetchText(page.url);
        const text = stripTags(html).normalize("NFKC");
        // テーブル内の日付パース
        const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let tbl;
        while ((tbl = tableRe.exec(html)) !== null) {
          const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let row;
          while ((row = rowRe.exec(tbl[1])) !== null) {
            const cells = [];
            const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let cell;
            while ((cell = cellRe.exec(row[1])) !== null) {
              cells.push(stripTags(cell[1]).trim());
            }
            if (cells.length < 2) continue;
            // 日付セルを探す
            for (const c of cells) {
              const dt = parseDateFromCellText(c);
              if (!dt || !inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
              // イベント名: 他のセルからタイトルを取得
              const titleCell = cells.find(x => x !== c && x.length > 1 && !/^\d/.test(x));
              const title = titleCell || page.defaultVenue;
              const timeRange = parseTimeRangeFromText(cells.join(" "));
              await makeEvent(byId, {
                sourceObj, title, url: page.url, eventDate: dt,
                venue: page.defaultVenue, rawAddress: "", timeRange,
                cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
              });
            }
          }
        }
        // テーブルが見つからない場合、テキストから日付抽出
        if (byId.size === 0) {
          const mdRe = /(\d{1,2})月(\d{1,2})日/g;
          let md;
          while ((md = mdRe.exec(text)) !== null) {
            const dt = { y: 0, mo: Number(md[1]), d: Number(md[2]) };
            const fy = currentFiscalYear();
            dt.y = dt.mo >= 4 ? fy : fy + 1;
            if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
            // 周辺テキストからタイトル推定
            const ctx = text.substring(Math.max(0, md.index - 50), md.index).trim();
            const lastLine = ctx.split(/\n/).pop().trim();
            const title = lastLine.length > 2 ? lastLine : page.defaultVenue;
            await makeEvent(byId, {
              sourceObj, title, url: page.url, eventDate: dt,
              venue: page.defaultVenue, rawAddress: "", timeRange: null,
              cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
        }
      } catch (e) {
        console.warn(`[${cityName}] fetch failed: ${page.url}`, e.message);
      }
    }
    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected`);
    return results;
  };
}


// ---- 2. 五霞町 ----

function createCollectGokaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const { GOKA_SOURCE } = require("../../config/wards");
  const sourceObj = GOKA_SOURCE;
  const cityName = "五霞町";

  const jidoukanPages = [
    "https://www.town.goka.lg.jp/page/page001339.html",
    "https://www.town.goka.lg.jp/page/page001340.html",
  ];

  return async function collectGokaEvents(maxDays) {
    const byId = new Map();

    // 児童館HTMLテーブル
    for (const pageUrl of jidoukanPages) {
      try {
        const html = await fetchText(pageUrl);
        const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let tbl;
        while ((tbl = tableRe.exec(html)) !== null) {
          const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let row;
          while ((row = rowRe.exec(tbl[1])) !== null) {
            const cells = [];
            const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let cell;
            while ((cell = cellRe.exec(row[1])) !== null) {
              cells.push(stripTags(cell[1]).trim());
            }
            if (cells.length < 2) continue;
            for (let i = 0; i < cells.length; i++) {
              const dt = parseDateFromCellText(cells[i]);
              if (!dt || !inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
              const title = cells.find((x, j) => j !== i && x.length > 1 && !/^\d/.test(x)) || "児童館行事";
              const timeRange = parseTimeRangeFromText(cells.join(" "));
              await makeEvent(byId, {
                sourceObj, title, url: pageUrl, eventDate: dt,
                venue: "五霞町児童館", rawAddress: "", timeRange,
                cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
              });
            }
          }
        }
      } catch (e) {
        console.warn(`[${cityName}] jidoukan fetch failed: ${pageUrl}`, e.message);
      }
    }

    // 外部予約カレンダー
    const months = getMonthsForRange(maxDays);
    for (const { year, month } of months) {
      const ym = `${year}-${String(month).padStart(2, "0")}`;
      const url = `https://goka.ed.jp/preschool/reserve/pc.php?ym=${ym}`;
      try {
        const html = await fetchText(url);
        // <div class="scheduleComment">イベント名</div> inside calendar cells
        const dayBlockRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let dayBlock;
        while ((dayBlock = dayBlockRe.exec(html)) !== null) {
          const content = dayBlock[1];
          const dayNumMatch = content.match(/>(\d{1,2})</);
          if (!dayNumMatch) continue;
          const d = Number(dayNumMatch[1]);
          if (d < 1 || d > 31) continue;
          const commentRe = /class="scheduleComment"[^>]*>([\s\S]*?)<\/div>/gi;
          let cm;
          while ((cm = commentRe.exec(content)) !== null) {
            const title = stripTags(cm[1]).trim();
            if (!title || title.length < 2) continue;
            const dt = { y: year, mo: month, d };
            if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
            await makeEvent(byId, {
              sourceObj, title, url, eventDate: dt,
              venue: "五霞幼稚園", rawAddress: "", timeRange: null,
              cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
        }
      } catch (e) {
        console.warn(`[${cityName}] reserve calendar failed: ${ym}`, e.message);
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected`);
    return results;
  };
}


// ---- 3. 大洗町 ----

function createCollectOaraiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const { OARAI_SOURCE } = require("../../config/wards");
  const sourceObj = OARAI_SOURCE;
  const cityName = "大洗町";

  // WP REST API posts
  const wpPostIds = [432, 412, 426];
  // きらきらPDF source page
  const kirakiraPdfPage = "https://www.town.oarai.lg.jp/kosodate/page003942.html";

  return async function collectOaraiEvents(maxDays) {
    const byId = new Map();

    // WP REST posts
    for (const postId of wpPostIds) {
      const url = `https://www.town.oarai.lg.jp/wp-json/wp/v2/posts/${postId}`;
      try {
        const resp = await fetchText(url);
        const post = JSON.parse(resp);
        const content = post.content?.rendered || "";
        const title = stripTags(post.title?.rendered || "").trim() || "子育て支援";
        const text = stripTags(content).normalize("NFKC");
        const pageUrl = post.link || `https://www.town.oarai.lg.jp/?p=${postId}`;

        const mdRe = /(\d{1,2})月(\d{1,2})日/g;
        let md;
        while ((md = mdRe.exec(text)) !== null) {
          const mo = Number(md[1]);
          const d = Number(md[2]);
          if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
          const fy = currentFiscalYear();
          const dt = { y: mo >= 4 ? fy : fy + 1, mo, d };
          if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
          // 日付の前後テキストからイベント名推定
          const ctx = text.substring(Math.max(0, md.index - 80), md.index + md[0].length + 80);
          const timeRange = parseTimeRangeFromText(ctx);
          await makeEvent(byId, {
            sourceObj, title, url: pageUrl, eventDate: dt,
            venue: "大洗町子育て支援センター", rawAddress: "", timeRange,
            cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      } catch (e) {
        console.warn(`[${cityName}] WP post ${postId} failed:`, e.message);
      }
    }

    // きらきらPDF
    try {
      const html = await fetchText(kirakiraPdfPage);
      const pdfLinks = extractPdfLinksFromHtml(html, kirakiraPdfPage);
      for (const pdfUrl of pdfLinks.slice(0, 4)) {
        try {
          const pdfText = await fetchChiyodaPdfMarkdown(pdfUrl);
          if (!pdfText) continue;
          const dates = extractDatesFromPdfText(pdfText);
          const timeRange = parseTimeRangeFromText(pdfText);
          for (const dt of dates) {
            if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
            await makeEvent(byId, {
              sourceObj, title: "きらきらひろば", url: kirakiraPdfPage, eventDate: dt,
              venue: "大洗町子育て支援センター", rawAddress: "", timeRange,
              cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
        } catch (e) {
          console.warn(`[${cityName}] PDF failed: ${pdfUrl}`, e.message);
        }
      }
    } catch (e) {
      console.warn(`[${cityName}] kirakira page failed:`, e.message);
    }

    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected`);
    return results;
  };
}


// ---- 4. 河内町 ----

function createCollectKawachiIbEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const { KAWACHI_IB_SOURCE } = require("../../config/wards");
  const sourceObj = KAWACHI_IB_SOURCE;
  const cityName = "河内町";

  const indexUrl = "https://www.town.ibaraki-kawachi.lg.jp/page/dir003098.html";

  return async function collectKawachiIbEvents(maxDays) {
    const byId = new Map();
    try {
      const indexHtml = await fetchText(indexUrl);
      // リンク抽出
      const linkRe = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      const pageUrls = [];
      let lm;
      while ((lm = linkRe.exec(indexHtml)) !== null) {
        const title = stripTags(lm[2]).trim();
        if (!title) continue;
        // 子育て関連リンクのみ
        if (/子育て|親子|サロン|広場|教室|健診|相談/.test(title)) {
          try {
            pageUrls.push({ url: new URL(lm[1].replace(/&amp;/g, "&"), indexUrl).href, title });
          } catch { /* skip */ }
        }
      }

      // 各ページから日付抽出
      for (const page of pageUrls.slice(0, 10)) {
        try {
          const html = await fetchText(page.url);
          const text = stripTags(html).normalize("NFKC");
          const mdRe = /(\d{1,2})月(\d{1,2})日/g;
          let md;
          while ((md = mdRe.exec(text)) !== null) {
            const mo = Number(md[1]);
            const d = Number(md[2]);
            if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
            const fy = currentFiscalYear();
            const dt = { y: mo >= 4 ? fy : fy + 1, mo, d };
            if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
            const ctx = text.substring(Math.max(0, md.index - 60), md.index + md[0].length + 60);
            const timeRange = parseTimeRangeFromText(ctx);
            await makeEvent(byId, {
              sourceObj, title: page.title, url: page.url, eventDate: dt,
              venue: "河内町役場", rawAddress: "", timeRange,
              cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
        } catch (e) {
          console.warn(`[${cityName}] page failed: ${page.url}`, e.message);
        }
      }
    } catch (e) {
      console.warn(`[${cityName}] index failed:`, e.message);
    }

    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected`);
    return results;
  };
}


// ---- 5. 茨城町 ----

function createCollectIbarakimachiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const { IBARAKIMACHI_SOURCE } = require("../../config/wards");
  const sourceObj = IBARAKIMACHI_SOURCE;
  const cityName = "茨城町";

  const pages = [
    { url: "https://www.town.ibaraki.lg.jp/soshikikarasagasu/hokenfukushibu/kenkozoshin/bosikenko/kensinnitteihyo/003449.html", title: "乳幼児健診", venue: "茨城町保健センター" },
    { url: "https://www.town.ibaraki.lg.jp/soshikikarasagasu/hokenfukushibu/kenkozoshin/bosikenko/kensinnitteihyo/003450.html", title: "育児相談", venue: "茨城町保健センター" },
    { url: "https://www.town.ibaraki.lg.jp/soshikikarasagasu/hokenfukushibu/kenkozoshin/bosikenko/kensinnitteihyo/003507.html", title: "マタニティ教室", venue: "茨城町保健センター" },
    { url: "https://www.town.ibaraki.lg.jp/soshikikarasagasu/kyoikuiinkai/shakaigakushuka/jidou/002640.html", title: "ゆうゆう館行事", venue: "ゆうゆう館" },
  ];

  return async function collectIbarakimachiEvents(maxDays) {
    const byId = new Map();
    for (const page of pages) {
      try {
        const html = await fetchText(page.url);
        // テーブルからの日付パース
        const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let tbl;
        while ((tbl = tableRe.exec(html)) !== null) {
          const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let row;
          while ((row = rowRe.exec(tbl[1])) !== null) {
            const rowText = stripTags(row[1]).normalize("NFKC");
            const mdRe = /(\d{1,2})月(\d{1,2})日/g;
            let md;
            while ((md = mdRe.exec(rowText)) !== null) {
              const mo = Number(md[1]);
              const d = Number(md[2]);
              if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
              const fy = currentFiscalYear();
              const dt = { y: mo >= 4 ? fy : fy + 1, mo, d };
              if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
              const timeRange = parseTimeRangeFromText(rowText);
              await makeEvent(byId, {
                sourceObj, title: page.title, url: page.url, eventDate: dt,
                venue: page.venue, rawAddress: "", timeRange,
                cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
              });
            }
          }
        }
        // テーブル外テキストフォールバック
        const text = stripTags(html).normalize("NFKC");
        const mdRe2 = /(\d{1,2})月(\d{1,2})日/g;
        let md2;
        while ((md2 = mdRe2.exec(text)) !== null) {
          const mo = Number(md2[1]);
          const d = Number(md2[2]);
          if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
          const fy = currentFiscalYear();
          const dt = { y: mo >= 4 ? fy : fy + 1, mo, d };
          if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
          const dateKey = `${dt.y}${String(dt.mo).padStart(2, "0")}${String(dt.d).padStart(2, "0")}`;
          const id = `ward_${sourceObj.key}:${page.url}:${page.title}:${dateKey}`;
          if (byId.has(id)) continue;
          const ctx = text.substring(Math.max(0, md2.index - 50), md2.index + md2[0].length + 50);
          const timeRange = parseTimeRangeFromText(ctx);
          await makeEvent(byId, {
            sourceObj, title: page.title, url: page.url, eventDate: dt,
            venue: page.venue, rawAddress: "", timeRange,
            cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      } catch (e) {
        console.warn(`[${cityName}] page failed: ${page.url}`, e.message);
      }
    }
    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected`);
    return results;
  };
}


// ---- 6. 北茨城市 ----

function createCollectKitaibarakiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const { KITAIBARAKI_SOURCE } = require("../../config/wards");
  const sourceObj = KITAIBARAKI_SOURCE;
  const cityName = "北茨城市";
  const pageUrl = "http://isohara-hoikuen.com/kosodate.html";

  return async function collectKitaibarakiEvents(maxDays) {
    const byId = new Map();
    try {
      const html = await fetchText(pageUrl);
      const text = stripTags(html).normalize("NFKC");

      // テーブルカレンダーから日付+イベント抽出
      const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
      let tbl;
      while ((tbl = tableRe.exec(html)) !== null) {
        const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let row;
        while ((row = rowRe.exec(tbl[1])) !== null) {
          const rowText = stripTags(row[1]).normalize("NFKC");
          // 園庭開放/室内開放はフィルタ除外
          if (/^(?:園庭開放|室内開放)$/.test(rowText.trim())) continue;
          const mdRe = /(\d{1,2})月(\d{1,2})日/g;
          let md;
          while ((md = mdRe.exec(rowText)) !== null) {
            const mo = Number(md[1]);
            const d = Number(md[2]);
            if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
            const fy = currentFiscalYear();
            const dt = { y: mo >= 4 ? fy : fy + 1, mo, d };
            if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
            // イベント名抽出: 日付以降のテキスト
            const afterDate = rowText.substring(md.index + md[0].length).trim();
            const title = afterDate.replace(/^[（()）\s曜日月火水木金土]*/, "").split(/\s/)[0] || "子育て支援";
            if (/園庭開放|室内開放/.test(title)) continue;
            const timeRange = parseTimeRangeFromText(rowText);
            await makeEvent(byId, {
              sourceObj, title, url: pageUrl, eventDate: dt,
              venue: "磯原保育園", rawAddress: "", timeRange,
              cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
        }
      }

      // テキストベースフォールバック
      if (byId.size === 0) {
        const mdRe = /(\d{1,2})月(\d{1,2})日/g;
        let md;
        while ((md = mdRe.exec(text)) !== null) {
          const mo = Number(md[1]);
          const d = Number(md[2]);
          if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
          const fy = currentFiscalYear();
          const dt = { y: mo >= 4 ? fy : fy + 1, mo, d };
          if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
          const ctx = text.substring(md.index, md.index + 80).trim();
          const title = ctx.replace(/^\d{1,2}月\d{1,2}日[（()）\s曜日月火水木金土]*/, "").split(/\s/)[0] || "子育て支援";
          if (/園庭開放|室内開放/.test(title)) continue;
          await makeEvent(byId, {
            sourceObj, title, url: pageUrl, eventDate: dt,
            venue: "磯原保育園", rawAddress: "", timeRange: null,
            cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
          });
        }
      }
    } catch (e) {
      console.warn(`[${cityName}] fetch failed:`, e.message);
    }
    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected`);
    return results;
  };
}


// ---- 7. 牛久市 ----

function createCollectUshikuEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const { USHIKU_SOURCE } = require("../../config/wards");
  const sourceObj = USHIKU_SOURCE;
  const cityName = "牛久市";

  const htmlPages = [
    { url: "https://www.city.ushiku.lg.jp/page/page001427.html", title: "子育てサロン", venue: "牛久市保健センター" },
  ];
  const pdfSourcePage = "https://www.city.ushiku.lg.jp/page/page000364.html";

  return async function collectUshikuEvents(maxDays) {
    const byId = new Map();

    // HTMLテーブル: サロン年間日程
    for (const page of htmlPages) {
      try {
        const html = await fetchText(page.url);
        const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let tbl;
        while ((tbl = tableRe.exec(html)) !== null) {
          const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let row;
          while ((row = rowRe.exec(tbl[1])) !== null) {
            const rowText = stripTags(row[1]).normalize("NFKC");
            const mdRe = /(\d{1,2})月(\d{1,2})日/g;
            let md;
            while ((md = mdRe.exec(rowText)) !== null) {
              const mo = Number(md[1]);
              const d = Number(md[2]);
              if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
              const fy = currentFiscalYear();
              const dt = { y: mo >= 4 ? fy : fy + 1, mo, d };
              if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
              const timeRange = parseTimeRangeFromText(rowText);
              // 行からサロン名抽出
              const cells = [];
              const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
              let cell;
              const rowHtml = row[1];
              while ((cell = cellRe.exec(rowHtml)) !== null) {
                cells.push(stripTags(cell[1]).trim());
              }
              const salonName = cells.find(c => c.length > 1 && !/\d月/.test(c) && !/^\d/.test(c)) || page.title;
              await makeEvent(byId, {
                sourceObj, title: salonName, url: page.url, eventDate: dt,
                venue: page.venue, rawAddress: "", timeRange,
                cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
              });
            }
          }
        }
      } catch (e) {
        console.warn(`[${cityName}] HTML page failed: ${page.url}`, e.message);
      }
    }

    // PDF: 子育て支援ページからPDFリンク抽出
    try {
      const html = await fetchText(pdfSourcePage);
      const pdfLinks = extractPdfLinksFromHtml(html, pdfSourcePage);
      for (const pdfUrl of pdfLinks.slice(0, 4)) {
        try {
          const pdfText = await fetchChiyodaPdfMarkdown(pdfUrl);
          if (!pdfText) continue;
          const dates = extractDatesFromPdfText(pdfText);
          const timeRange = parseTimeRangeFromText(pdfText);
          // PDFテキストからイベント名推定
          const nText = pdfText.normalize("NFKC");
          const titleMatch = nText.match(/(?:おたより|たより|だより|通信|ニュース|予定|日程|スケジュール)/);
          const pdfTitle = titleMatch ? `牛久市子育て${titleMatch[0]}` : "子育て支援";

          for (const dt of dates) {
            if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
            // 日付周辺テキストからイベント名推定
            const dateStr = `${dt.mo}月${dt.d}日`;
            const idx = nText.indexOf(dateStr);
            let evTitle = pdfTitle;
            if (idx >= 0) {
              const before = nText.substring(Math.max(0, idx - 60), idx).trim();
              const lines = before.split(/\n/);
              const lastLine = lines[lines.length - 1].trim();
              if (lastLine.length >= 2 && lastLine.length <= 30 && !/^\d/.test(lastLine)) {
                evTitle = lastLine;
              }
            }
            await makeEvent(byId, {
              sourceObj, title: evTitle, url: pdfSourcePage, eventDate: dt,
              venue: "牛久市保健センター", rawAddress: "", timeRange,
              cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
        } catch (e) {
          console.warn(`[${cityName}] PDF failed: ${pdfUrl}`, e.message);
        }
      }
    } catch (e) {
      console.warn(`[${cityName}] PDF source page failed:`, e.message);
    }

    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected`);
    return results;
  };
}


// ---- 8. 阿見町 ----

function createCollectAmiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const { AMI_SOURCE } = require("../../config/wards");
  const sourceObj = AMI_SOURCE;
  const cityName = "阿見町";

  const pdfPages = [
    { url: "https://www.town.ami.lg.jp/0000010175.html", title: "つくしんぼ", venue: "阿見町保健センター" },
    { url: "https://www.town.ami.lg.jp/0000015865.html", title: "じどうかんしんぶん", venue: "阿見町保健センター" },
  ];

  return async function collectAmiEvents(maxDays) {
    const byId = new Map();

    for (const page of pdfPages) {
      try {
        const html = await fetchText(page.url);
        const pdfLinks = extractPdfLinksFromHtml(html, page.url);
        for (const pdfUrl of pdfLinks.slice(0, 3)) {
          try {
            const pdfText = await fetchChiyodaPdfMarkdown(pdfUrl);
            if (!pdfText) continue;
            const dates = extractDatesFromPdfText(pdfText);
            const timeRange = parseTimeRangeFromText(pdfText);
            const nText = pdfText.normalize("NFKC");

            for (const dt of dates) {
              if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
              // 日付周辺からイベント名推定
              const dateStr = `${dt.mo}月${dt.d}日`;
              const idx = nText.indexOf(dateStr);
              let evTitle = page.title;
              if (idx >= 0) {
                const before = nText.substring(Math.max(0, idx - 60), idx).trim();
                const lines = before.split(/\n/);
                const lastLine = lines[lines.length - 1].trim();
                if (lastLine.length >= 2 && lastLine.length <= 30 && !/^\d/.test(lastLine)) {
                  evTitle = lastLine;
                }
              }
              await makeEvent(byId, {
                sourceObj, title: evTitle, url: page.url, eventDate: dt,
                venue: page.venue, rawAddress: "", timeRange,
                cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
              });
            }
          } catch (e) {
            console.warn(`[${cityName}] PDF failed: ${pdfUrl}`, e.message);
          }
        }
      } catch (e) {
        console.warn(`[${cityName}] page failed: ${page.url}`, e.message);
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected`);
    return results;
  };
}


// ---- 9. 利根町 ----

function createCollectToneIbEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const { TONE_IB_SOURCE } = require("../../config/wards");
  const sourceObj = TONE_IB_SOURCE;
  const cityName = "利根町";

  const pdfSourcePage = "https://www.town.tone.ibaraki.jp/page/page002094.html";

  return async function collectToneIbEvents(maxDays) {
    const byId = new Map();

    try {
      const html = await fetchText(pdfSourcePage);
      const pdfLinks = extractPdfLinksFromHtml(html, pdfSourcePage);

      for (const pdfUrl of pdfLinks.slice(0, 4)) {
        try {
          const pdfText = await fetchChiyodaPdfMarkdown(pdfUrl);
          if (!pdfText) continue;
          const dates = extractDatesFromPdfText(pdfText);
          const timeRange = parseTimeRangeFromText(pdfText);
          const nText = pdfText.normalize("NFKC");

          for (const dt of dates) {
            if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;
            const dateStr = `${dt.mo}月${dt.d}日`;
            const idx = nText.indexOf(dateStr);
            let evTitle = "子育て支援";
            if (idx >= 0) {
              const before = nText.substring(Math.max(0, idx - 60), idx).trim();
              const lines = before.split(/\n/);
              const lastLine = lines[lines.length - 1].trim();
              if (lastLine.length >= 2 && lastLine.length <= 30 && !/^\d/.test(lastLine)) {
                evTitle = lastLine;
              }
            }
            await makeEvent(byId, {
              sourceObj, title: evTitle, url: pdfSourcePage, eventDate: dt,
              venue: "利根町保健福祉センター", rawAddress: "", timeRange,
              cityName, geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
            });
          }
        } catch (e) {
          console.warn(`[${cityName}] PDF failed: ${pdfUrl}`, e.message);
        }
      }
    } catch (e) {
      console.warn(`[${cityName}] source page failed:`, e.message);
    }

    const results = Array.from(byId.values());
    console.log(`[${cityName}] ${results.length} events collected`);
    return results;
  };
}


module.exports = {
  createCollectYachiyoIbEvents,
  createCollectGokaEvents,
  createCollectOaraiEvents,
  createCollectKawachiIbEvents,
  createCollectIbarakimachiEvents,
  createCollectKitaibarakiEvents,
  createCollectUshikuEvents,
  createCollectAmiEvents,
  createCollectToneIbEvents,
};
