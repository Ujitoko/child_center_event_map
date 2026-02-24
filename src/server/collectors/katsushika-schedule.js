/**
 * 葛飾区 児童館・子ども未来プラザ 月間スケジュールページパーサー
 *
 * CGI cate=21 が返す25以上の児童館月間スケジュールページから
 * 個別イベント（のびのび広場、おはなし会等）を抽出する専用コレクター。
 *
 * ward-generic.js は「1ページ=1イベント」設計のため、
 * スケジュールページ（1ページ=多数イベント）を扱えない。
 *
 * Pattern A: テーブル型（実施日・時間行）
 * Pattern B: 見出し型（H2/H3 + テキスト中の日付パターン）
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  getMonthsForRange,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");
const { KATSUSHIKA_SOURCE } = require("../../config/wards");

const BASE = KATSUSHIKA_SOURCE.baseUrl;

/** 施設インデックスURL（児童館、子ども未来プラザ、金町子どもセンター） */
const INDEX_PAGES = [
  `${BASE}/event/1000114/index.html`,
  `${BASE}/event/1022292/index.html`,
  `${BASE}/event/1000115/index.html`,
];

/** スケジュールページ判定: /event/1000114/ or /event/1022292/ or /event/1000115/ */
const SCHEDULE_PATH_RE = /\/event\/(?:1000114|1022292|1000115)\/(?!index\.html$)/;

/** テーブルの実施日セルから日リストを抽出
 *  「2月2日・3日・4日」→ [2/2, 2/3, 2/4] のように月コンテキストを追跡
 */
function parseDateCells(text, pageMonth, pageYear) {
  const dates = [];
  const nText = text.normalize("NFKC");

  // 単一パスで「M月D日」と「D日」の両方を検出し、月コンテキストを追跡
  const re = /(?:(\d{1,2})月)?(\d{1,2})日/g;
  let currentMonth = pageMonth;
  const seen = new Set();
  let m;
  while ((m = re.exec(nText)) !== null) {
    if (m[1]) currentMonth = Number(m[1]);
    const d = Number(m[2]);
    if (currentMonth && currentMonth >= 1 && currentMonth <= 12 && d >= 1 && d <= 31) {
      const key = `${currentMonth}-${d}`;
      if (!seen.has(key)) {
        seen.add(key);
        dates.push({ y: resolveYear(currentMonth, pageYear), mo: currentMonth, d });
      }
    }
  }

  return dates;
}

/** 月から年を決定（年度コンテキスト: 4月以降は今年度、1-3月は翌年） */
function resolveYear(month, baseYear) {
  if (!baseYear) {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    baseYear = jst.getUTCFullYear();
  }
  return baseYear;
}

/** 現在の暦年を返す（スケジュールページは常に当月or翌月なので暦年が正しい） */
function currentCalendarYear() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.getUTCFullYear();
}

/** テキストから年度/年を推定 */
function inferYear(text) {
  const reiwaFy = text.match(/令和\s*(\d{1,2})\s*年度/);
  if (reiwaFy) return 2018 + Number(reiwaFy[1]);
  const westernFy = text.match(/(\d{4})\s*年度/);
  if (westernFy) return Number(westernFy[1]);
  const reiwa = text.match(/令和\s*(\d{1,2})\s*年/);
  if (reiwa) return 2018 + Number(reiwa[1]);
  return null;
}

/** H1テキストから施設名を抽出: "新水元児童館　令和8年2月の行事予定" → "新水元児童館" */
function extractFacilityName(h1Text) {
  const t = h1Text.normalize("NFKC").trim();
  // Pattern: 「令和N年M月 施設名...」（日付が先頭）
  const datePrefixM = t.match(/^(?:令和\s*\d{1,2}\s*年度?\s*\d{0,2}\s*月?\s*|平成\s*\d{1,2}\s*年度?\s*\d{0,2}\s*月?\s*|\d{4}年度?\s*\d{0,2}\s*月?\s*)\s*(.+?)(?:の行事予定|のおしらせ|のイベント|$)/);
  if (datePrefixM && datePrefixM[1].trim()) return sanitizeVenueText(datePrefixM[1].trim());
  // Pattern: 「施設名　令和N年...」or「施設名 N月の行事予定」(スペース有無両対応)
  const m = t.match(/^(.+?)\s*(?:令和|平成|\d{4}年|\d{1,2}月)/);
  if (m && m[1].trim()) return sanitizeVenueText(m[1]);
  // 「施設名の行事予定」
  const m2 = t.match(/^(.+?)(?:の行事予定|のおしらせ|のイベント)/);
  if (m2 && m2[1].trim()) return sanitizeVenueText(m2[1]);
  return sanitizeVenueText(t);
}

/** H1テキストから月を推定 */
function extractMonthFromTitle(text) {
  const m = text.match(/(\d{1,2})\s*月/);
  return m ? Number(m[1]) : null;
}

/**
 * Pattern A: テーブル型パーサー
 * H2/H3見出しの直後のテーブルから「実施日」「時間」行を抽出
 */
function parseTablesFromHtml(html, pageMonth, pageYear) {
  const events = [];
  const nHtml = html.normalize("NFKC");

  // 見出しとテーブルのペアを検出
  // まず全ての見出しを取得
  const headingPositions = [];
  const hRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let hm;
  while ((hm = hRe.exec(nHtml)) !== null) {
    const title = stripTags(hm[1]).trim();
    if (title) {
      headingPositions.push({ title, index: hm.index, endIndex: hm.index + hm[0].length });
    }
  }

  // テーブルを見出しに紐付ける
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tm;
  while ((tm = tableRe.exec(nHtml)) !== null) {
    const tableStart = tm.index;
    const tableHtml = tm[1];

    // このテーブルの直前にある見出しを探す
    let eventTitle = "";
    for (let i = headingPositions.length - 1; i >= 0; i--) {
      if (headingPositions[i].endIndex <= tableStart) {
        eventTitle = headingPositions[i].title;
        break;
      }
    }
    // 【】で囲まれた部分を取る or そのまま
    const bracketMatch = eventTitle.match(/【([^】]+)】/);
    if (bracketMatch) eventTitle = bracketMatch[1];

    if (!eventTitle) continue;

    // テーブル行をパース: 実施日、時間、内容、対象
    const dates = [];
    let timeRange = null;

    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr;
    while ((tr = trRe.exec(tableHtml)) !== null) {
      const rowHtml = tr[1];
      const rowText = stripTags(rowHtml).trim();

      // 実施日行
      if (/実施日|日にち|開催日|日時|日程/.test(rowText)) {
        // th/td のペアから td のテキストを取得
        const tdMatch = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
        if (tdMatch) {
          const cellText = stripTags(tdMatch[1]).trim();
          const parsed = parseDateCells(cellText, pageMonth, pageYear);
          dates.push(...parsed);
        }
        // 「日時」行はtime rangeも含む場合がある
        if (/日時/.test(rowText) && !timeRange) {
          const tdm = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
          if (tdm) timeRange = parseTimeRangeFromText(stripTags(tdm[1]));
        }
      }
      // 時間行
      if (/^時間|^開催時間|^実施時間/.test(rowText.replace(/\s/g, "")) && !timeRange) {
        const tdMatch = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
        if (tdMatch) {
          timeRange = parseTimeRangeFromText(stripTags(tdMatch[1]));
        }
      }
    }

    if (dates.length > 0) {
      events.push({ title: eventTitle, dates, timeRange });
    }
  }

  return events;
}

/**
 * Pattern B: 見出し型パーサー
 * テーブルに含まれない見出し＋テキストから日付を抽出
 */
function parseHeadingsFromHtml(html, pageMonth, pageYear) {
  const events = [];
  const nHtml = html.normalize("NFKC");

  // テーブル範囲を特定（テーブル内の見出しは除外）
  const tableRanges = [];
  const tblRe = /<table[^>]*>[\s\S]*?<\/table>/gi;
  let tblm;
  while ((tblm = tblRe.exec(nHtml)) !== null) {
    tableRanges.push({ start: tblm.index, end: tblm.index + tblm[0].length });
  }
  function inTable(pos) {
    return tableRanges.some(r => pos >= r.start && pos < r.end);
  }

  // 見出し（テーブル外）を収集
  const headings = [];
  const hRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let hm;
  while ((hm = hRe.exec(nHtml)) !== null) {
    if (inTable(hm.index)) continue;
    const title = stripTags(hm[1]).trim();
    if (title) {
      headings.push({ title, endIndex: hm.index + hm[0].length });
    }
  }

  // ボイラープレート見出しを除外
  const SKIP_HEADINGS = /^(?:関連リンク|このページに関する|お問い合わせ|葛飾区役所|コールセンター|イベント情報|イベントカレンダー|イベント一覧|よくある質問|.*の利用について$|.*の皆さんの利用について$)/;

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (SKIP_HEADINGS.test(h.title)) continue;
    // 次の見出しまで or 次のテーブル or ページ末尾の間のテキスト
    const nextBoundary = headings[i + 1] ? headings[i + 1].endIndex - 100 : nHtml.length;
    const section = nHtml.slice(h.endIndex, Math.min(nextBoundary, h.endIndex + 2000));
    const sectionText = stripTags(section);

    // 日付抽出
    const dates = parseDateCells(sectionText, pageMonth, pageYear);
    if (dates.length === 0) continue;

    // 時間抽出
    const timeRange = parseTimeRangeFromText(sectionText);

    let eventTitle = h.title;
    const bracketMatch = eventTitle.match(/【([^】]+)】/);
    if (bracketMatch) eventTitle = bracketMatch[1];

    events.push({ title: eventTitle, dates, timeRange });
  }

  return events;
}

/**
 * スケジュールページを解析してイベント一覧を返す
 */
function parseKatsushikaSchedulePage(html, pageMonth, pageYear) {
  const tableEvents = parseTablesFromHtml(html, pageMonth, pageYear);
  const headingEvents = parseHeadingsFromHtml(html, pageMonth, pageYear);
  return [...tableEvents, ...headingEvents];
}

/**
 * Factory: 葛飾区スケジュールページコレクター
 */
function createCollectKatsushikaScheduleEvents(deps) {
  const {
    geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster,
  } = deps;
  const sourceObj = KATSUSHIKA_SOURCE;

  return async function collectKatsushikaScheduleEvents(maxDays) {
    const byId = new Map();
    const venueGeoCache = new Map(); // facility → { point, address }
    const months = getMonthsForRange(maxDays);

    // 1. CGI cate=21 からスケジュールページリンクを収集
    const scheduleUrls = new Set();

    const fetchPromises = [];
    for (const m of months) {
      const cgiUrl = `${BASE}/cgi-bins/event/event.cgi?year=${m.year}&month=${m.month}&cate=21`;
      fetchPromises.push(
        fetchText(cgiUrl).then(html => {
          if (!html) return;
          extractLinksFromList(html, cgiUrl, scheduleUrls);
        }).catch(() => {})
      );
    }

    // 施設インデックスからも収集
    for (const indexUrl of INDEX_PAGES) {
      fetchPromises.push(
        fetchText(indexUrl).then(html => {
          if (!html) return;
          extractLinksFromList(html, indexUrl, scheduleUrls);
        }).catch(() => {})
      );
    }

    await Promise.all(fetchPromises);

    console.log(`[katsushika-schedule] found ${scheduleUrls.size} schedule page URLs`);

    // 2. スケジュールページを順次fetch＋パース
    const urls = [...scheduleUrls];
    const BATCH = 5;
    for (let i = 0; i < urls.length; i += BATCH) {
      const batch = urls.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(async (pageUrl) => {
        try {
          const html = await fetchText(pageUrl);
          if (!html) return;

          const nHtml = html.normalize("NFKC");

          // H1 から施設名 & 月を抽出
          const h1Match = nHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const h1Text = h1Match ? stripTags(h1Match[1]).trim() : "";
          const facilityName = h1Text ? extractFacilityName(h1Text) : "";

          // 年と月を推定（H1タイトルを優先、本文の"令和N年度生まれ"等は誤マッチするため使わない）
          const pageYear = inferYear(h1Text) || inferYearFromUrl(pageUrl) || currentCalendarYear();
          const pageMonth = extractMonthFromTitle(h1Text) || extractMonthFromUrl(pageUrl);

          // パース
          const events = parseKatsushikaSchedulePage(nHtml, pageMonth, pageYear);

          if (events.length === 0) return;

          // 施設ジオコーディング（施設単位でキャッシュ）
          const venue = facilityName || "";
          let geoResult = venueGeoCache.get(venue);
          if (!geoResult && venue) {
            geoResult = await geocodeFacility(venue);
            venueGeoCache.set(venue, geoResult);
          }
          if (!geoResult) geoResult = { point: null, address: "" };

          // イベントレコード作成
          const promises = [];
          for (const ev of events) {
            const title = ev.title || facilityName || "行事";
            for (const date of ev.dates) {
              if (!inRangeJst(date.y, date.mo, date.d, maxDays)) continue;
              const dateKey = `${date.y}${String(date.mo).padStart(2, "0")}${String(date.d).padStart(2, "0")}`;
              const eventTitle = venue ? `${title}（${venue}）` : title;
              const id = `ward_katsushika:${pageUrl}:${title}:${dateKey}`;
              if (byId.has(id)) continue;

              promises.push((async () => {
                const { startsAt, endsAt } = buildStartsEndsForDate(
                  { y: date.y, mo: date.mo, d: date.d },
                  ev.timeRange
                );
                byId.set(id, {
                  id,
                  source: "ward_katsushika",
                  source_label: "葛飾区",
                  title: eventTitle,
                  starts_at: startsAt,
                  ends_at: endsAt,
                  venue_name: venue,
                  address: geoResult.address || "",
                  url: pageUrl,
                  lat: geoResult.point ? geoResult.point.lat : sourceObj.center.lat,
                  lng: geoResult.point ? geoResult.point.lng : sourceObj.center.lng,
                });
              })());
            }
          }
          await Promise.all(promises);
        } catch (e) {
          console.warn(`[katsushika-schedule] failed to parse ${pageUrl}: ${e.message}`);
        }
      }));
    }

    console.log(`[katsushika-schedule] collected ${byId.size} events`);
    return Array.from(byId.values());

    /** ジオコーディングヘルパー */
    async function geocodeFacility(venue) {
      const candidates = [];
      // ファシリティマスターを優先
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(sourceObj.key, venue);
        if (fmAddr) {
          const full = /[都道府県]/.test(fmAddr) ? fmAddr : `東京都葛飾区${fmAddr}`;
          candidates.push(full);
        }
      }
      candidates.push(`東京都葛飾区 ${venue}`);

      let point = await geocodeForWard(candidates.slice(0, 5), sourceObj);
      point = resolveEventPoint(sourceObj, venue, point, "");
      const address = resolveEventAddress(sourceObj, venue, "", point);
      return { point, address };
    }
  };
}

/** CGIリスト/インデックスページからスケジュールページURLを抽出 */
function extractLinksFromList(html, pageUrl, urlSet) {
  // <ul class="listlink"> ブロック内の <a href="...">
  const blockRe = /<ul[^>]*class="listlink"[^>]*>([\s\S]*?)<\/ul>/gi;
  let bm;
  while ((bm = blockRe.exec(html)) !== null) {
    extractAnchors(bm[1], pageUrl, urlSet);
  }
  // フォールバック: ページ全体のリンクも確認
  extractAnchors(html, pageUrl, urlSet);
}

function extractAnchors(html, pageUrl, urlSet) {
  const aRe = /<a[^>]+href="([^"]+)"[^>]*>/gi;
  let am;
  while ((am = aRe.exec(html)) !== null) {
    const href = am[1];
    try {
      const absUrl = new URL(href, pageUrl).href;
      if (SCHEDULE_PATH_RE.test(absUrl) && absUrl.endsWith(".html")) {
        urlSet.add(absUrl);
      }
    } catch {}
  }
}

/** URLから年を推定 */
function inferYearFromUrl(url) {
  const m = url.match(/year=(\d{4})/);
  return m ? Number(m[1]) : null;
}

/** URLから月を推定 */
function extractMonthFromUrl(url) {
  const m = url.match(/month=(\d{1,2})/);
  return m ? Number(m[1]) : null;
}

module.exports = { createCollectKatsushikaScheduleEvents };
