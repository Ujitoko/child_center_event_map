/**
 * 荒川区 ふれあい館（15施設）乳幼児・児童イベントコレクター
 *
 * 各ふれあい館のHTML活動予定ページから子育てイベントを抽出。
 * Format A: テーブル型（<table class="datatable">）
 * Format B: 見出し型（<h3> + <ul><li>）
 *
 * セクションフィルタリング: <h2> 見出しが「乳幼児」「児童」を含むセクションのみ対象。
 * 「成人」「高年者」「高齢者」セクションはスキップ。
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const { normalizeJaDigits } = require("../text-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { ARAKAWA_SOURCE } = require("../../config/wards");

const BASE_URL = "https://www.city.arakawa.tokyo.jp";

const FACILITIES = [
  { name: "石浜ふれあい館", address: "荒川区南千住三丁目28番2号", path: "/a011/isihama/202201ishihama.html", slug: "ishihama" },
  { name: "南千住ふれあい館", address: "荒川区南千住六丁目36番13号", path: "/a011/minamisenjyu/minamisenjyu202308.html", slug: "minamisenju" },
  { name: "南千住駅前ふれあい館", address: "荒川区南千住七丁目1番1号", path: "/a011/ekimae/2024.html", slug: "ekimae" },
  { name: "汐入ふれあい館", address: "荒川区南千住八丁目2番2号", path: "/a011/shioiri/shioiri202201.html", slug: "shioiri" },
  { name: "峡田ふれあい館", address: "荒川区荒川三丁目3番10号", path: "/a011/haketa/202112.html", slug: "haketa" },
  { name: "荒川山吹ふれあい館", address: "荒川区荒川七丁目6番8号", path: "/a011/arakawayamabuki/202206arakawayamabuki.html", slug: "yamabuki" },
  { name: "町屋ふれあい館", address: "荒川区町屋一丁目35番8号", path: "/a011/machiya/20230007machiya.html", slug: "machiya" },
  { name: "荒木田ふれあい館", address: "荒川区町屋六丁目13番2号", path: "/a011/arakida/2022-1gatukatudouyotei.html", slug: "arakida" },
  { name: "東尾久本町通りふれあい館", address: "荒川区東尾久二丁目37番14号", path: "/a011/higashiogu.html", slug: "higashiogu" },
  { name: "尾久ふれあい館", address: "荒川区西尾久二丁目25番13号", path: "/a011/ogu/ogufujidoukatudouyotei.html", slug: "ogu" },
  { name: "西尾久ふれあい館", address: "荒川区西尾久八丁目33番31号", path: "/a011/nishioku/202112.html", slug: "nishiogu" },
  { name: "東日暮里ふれあい館", address: "荒川区東日暮里一丁目17番13号", path: "/a011/higashinippori/2201higashinippori.html", slug: "higashinippori" },
  { name: "夕やけこやけふれあい館", address: "荒川区東日暮里三丁目11番19号", path: "/a011/yuuyake20237.html", slug: "yuyake" },
  { name: "ひぐらしふれあい館", address: "荒川区東日暮里六丁目28番15号", path: "/a011/higurashi/202307higurashi.html", slug: "higurashi" },
  { name: "西日暮里ふれあい館", address: "荒川区西日暮里六丁目24番4号", path: "/a011/nishinipporifureaikan/202201.html", slug: "nishinippori" },
];

/** 子ども関連セクション判定用正規表現 */
const CHILD_SECTION_RE = /乳幼児|児童|子ども|こども|キッズ|ベビー|親子|幼児|小学生/;
/** スキップするセクション */
const SKIP_SECTION_RE = /成人|高年者|高齢者|シニア/;
/** 定期開催のみ（具体日なし）をスキップ */
const RECURRING_ONLY_RE = /^毎週|登録制$/;

/** テーブルのヘッダーカラムインデックスを判定 */
const NAME_COL_RE = /事業|事業名|活動名|名称|イベント名/;
const DATE_COL_RE = /日時|活動日|日にち|実施日/;

/**
 * HTMLから <h2> セクションを分割し、子ども関連セクションのみ返す
 */
function extractChildSections(html) {
  const nHtml = html.normalize("NFKC");
  const sections = [];
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h2s = [];
  let hm;
  while ((hm = h2Re.exec(nHtml)) !== null) {
    h2s.push({
      text: stripTags(hm[1]).trim(),
      endIndex: hm.index + hm[0].length,
    });
  }

  // h2が見つからない場合はページ全体を対象（セクション分けなし）
  if (h2s.length === 0) {
    return [nHtml];
  }

  for (let i = 0; i < h2s.length; i++) {
    const heading = h2s[i].text;
    // スキップ判定
    if (SKIP_SECTION_RE.test(heading)) continue;
    // 子ども関連でなければスキップ
    if (!CHILD_SECTION_RE.test(heading)) continue;

    const start = h2s[i].endIndex;
    const end = i + 1 < h2s.length ? h2s[i + 1].endIndex - h2s[i + 1].text.length - 10 : nHtml.length;
    sections.push(nHtml.slice(start, end));
  }

  return sections;
}

/**
 * テキストから日付リストを抽出
 * 「3月14日（土曜）」「3月4日（水曜）、9日（月曜）」「3月2、9、16、23日（月曜）」
 */
function parseDatesFromText(text, defaultYear) {
  const nText = normalizeJaDigits(text).normalize("NFKC");
  const dates = [];
  const seen = new Set();

  const addDate = (mo, d) => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return;
    const key = `${mo}-${d}`;
    if (seen.has(key)) return;
    seen.add(key);
    let y = defaultYear;
    // 年度跨ぎ: 現在月が11-12月で対象月が1-3月なら翌年
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const currentMonth = jstNow.getUTCMonth() + 1;
    if (currentMonth >= 11 && mo <= 3) y = defaultYear + 1;
    dates.push({ y, mo, d });
  };

  // パターン1: 「3月2、9、16、23日」（カンマ区切り日リスト）
  const commaListRe = /(\d{1,2})月(\d{1,2})[、,\s]+(\d{1,2}(?:[、,\s]+\d{1,2})*)日/g;
  let cm;
  while ((cm = commaListRe.exec(nText)) !== null) {
    const mo = Number(cm[1]);
    addDate(mo, Number(cm[2]));
    const rest = cm[3].split(/[、,\s]+/);
    for (const ds of rest) {
      const d = Number(ds.trim());
      if (d >= 1 && d <= 31) addDate(mo, d);
    }
  }

  // パターン2: 「M月D日」通常パターン（カンマリストで既出の月日は seen で重複回避）
  const re = /(?:(\d{1,2})月)?(\d{1,2})日/g;
  let currentMonth = null;
  let m;
  while ((m = re.exec(nText)) !== null) {
    if (m[1]) currentMonth = Number(m[1]);
    const d = Number(m[2]);
    if (currentMonth && currentMonth >= 1 && currentMonth <= 12) {
      addDate(currentMonth, d);
    }
  }

  return dates;
}

/**
 * 時間テキストをパース（正午対応付き）
 * 「午前10時30分から11時30分まで」→ timeRange
 * 「午後3時から3時50分まで」→ timeRange
 * 「午前10時から正午まで」→ timeRange (10:00-12:00)
 */
function parseTimeFromText(text) {
  let nText = normalizeJaDigits(text).normalize("NFKC");
  // 「正午」→ 「午後0時00分」 に変換（parseTimeRangeFromText が処理できるように）
  nText = nText.replace(/正午/g, "午後0時00分");
  // 「まで」を除去（parseTimeRangeFromText は「から」を変換するが「まで」は不要文字）
  nText = nText.replace(/まで/g, "");
  return parseTimeRangeFromText(nText);
}

/**
 * Format A: テーブル型パーサー
 * <table class="datatable"> 内の行から事業名・日時を抽出
 */
function parseTableEvents(sectionHtml, defaultYear) {
  const events = [];
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tm;

  while ((tm = tableRe.exec(sectionHtml)) !== null) {
    const tableHtml = tm[1];

    // ヘッダー行からカラムインデックスを特定
    const headerRowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/i;
    const headerMatch = headerRowRe.exec(tableHtml);
    if (!headerMatch) continue;

    const headerCells = [];
    const thRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let thm;
    while ((thm = thRe.exec(headerMatch[1])) !== null) {
      headerCells.push(stripTags(thm[1]).trim());
    }

    let nameCol = -1;
    let dateCol = -1;
    for (let i = 0; i < headerCells.length; i++) {
      if (nameCol < 0 && NAME_COL_RE.test(headerCells[i])) nameCol = i;
      if (dateCol < 0 && DATE_COL_RE.test(headerCells[i])) dateCol = i;
    }
    // 最低限日時列が必要
    if (dateCol < 0) continue;

    // データ行をパース
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    // ヘッダー行をスキップ
    trRe.lastIndex = headerMatch.index + headerMatch[0].length;
    let tr;
    while ((tr = trRe.exec(tableHtml)) !== null) {
      const cells = [];
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdm;
      while ((tdm = tdRe.exec(tr[1])) !== null) {
        cells.push(stripTags(tdm[1]).trim());
      }
      if (cells.length === 0) continue;

      const title = nameCol >= 0 && cells[nameCol] ? cells[nameCol] : "";
      const dateText = cells[dateCol] || "";

      if (!title && !dateText) continue;

      // 定期開催のみスキップ
      if (RECURRING_ONLY_RE.test(dateText.trim())) continue;

      const dates = parseDatesFromText(dateText, defaultYear);
      if (dates.length === 0) continue;

      const timeRange = parseTimeFromText(dateText);

      events.push({ title, dates, timeRange });
    }
  }

  return events;
}

/**
 * Format B: 見出し型パーサー
 * <h3> タイトル + <ul><li> リストから日時・対象を抽出
 */
function parseHeadingEvents(sectionHtml, defaultYear) {
  const events = [];

  // テーブル範囲を特定して除外
  const tableRanges = [];
  const tblRe = /<table[^>]*>[\s\S]*?<\/table>/gi;
  let tblm;
  while ((tblm = tblRe.exec(sectionHtml)) !== null) {
    tableRanges.push({ start: tblm.index, end: tblm.index + tblm[0].length });
  }
  function inTable(pos) {
    return tableRanges.some((r) => pos >= r.start && pos < r.end);
  }

  // h3 見出しを収集（テーブル外のみ）
  const headings = [];
  const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  let hm;
  while ((hm = h3Re.exec(sectionHtml)) !== null) {
    if (inTable(hm.index)) continue;
    const title = stripTags(hm[1]).trim();
    if (title) {
      headings.push({ title, endIndex: hm.index + hm[0].length });
    }
  }

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    // 次の h3 までの範囲、または2000文字までを取得
    const nextBoundary = headings[i + 1] ? headings[i + 1].endIndex - 100 : sectionHtml.length;
    const section = sectionHtml.slice(h.endIndex, Math.min(nextBoundary, h.endIndex + 2000));
    const sectionText = stripTags(section);

    // 定期開催のみスキップ
    if (RECURRING_ONLY_RE.test(h.title.trim())) continue;

    const dates = parseDatesFromText(sectionText, defaultYear);
    if (dates.length === 0) continue;

    // 時間は li テキスト全体から抽出
    const timeRange = parseTimeFromText(sectionText);

    events.push({ title: h.title, dates, timeRange });
  }

  return events;
}

/**
 * ページHTMLから年を推定
 */
function inferPageYear(html) {
  const nText = normalizeJaDigits(stripTags(html)).normalize("NFKC");
  // 令和N年 パターン（年度は除外）
  const reiwa = nText.match(/令和\s*(\d{1,2})\s*年(?!度)/);
  if (reiwa) return 2018 + Number(reiwa[1]);
  // 西暦
  const western = nText.match(/(20\d{2})\s*年/);
  if (western) return Number(western[1]);
  // 令和N年度 パターン（フォールバック）
  const reiwaFy = nText.match(/令和\s*(\d{1,2})\s*年度/);
  if (reiwaFy) return 2018 + Number(reiwaFy[1]);
  // フォールバック: 現在の暦年
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.getUTCFullYear();
}

/**
 * Factory: 荒川区ふれあい館コレクター
 */
function createCollectArakawaFureaiEvents(deps) {
  const { resolveEventPoint, resolveEventAddress } = deps;
  const source = ARAKAWA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectArakawaFureaiEvents(maxDays) {
    const byId = new Map();

    // 全15施設を並列fetch
    const results = await Promise.allSettled(
      FACILITIES.map(async (facility) => {
        const url = `${BASE_URL}${facility.path}`;
        try {
          const html = await fetchText(url);
          if (!html) return null;
          return { facility, html, url };
        } catch (e) {
          console.warn(`[${label}/ふれあい館] ${facility.name} fetch failed: ${e.message}`);
          return null;
        }
      })
    );

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const { facility, html, url } = result.value;

      try {
        const defaultYear = inferPageYear(html);
        const sections = extractChildSections(html);

        for (const sectionHtml of sections) {
          // Format A: テーブル型
          const tableEvents = parseTableEvents(sectionHtml, defaultYear);
          // Format B: 見出し型
          const headingEvents = parseHeadingEvents(sectionHtml, defaultYear);
          const allEvents = [...tableEvents, ...headingEvents];

          for (const ev of allEvents) {
            const title = ev.title || facility.name;
            for (const date of ev.dates) {
              if (!inRangeJst(date.y, date.mo, date.d, maxDays)) continue;
              const dateKey = `${date.y}${String(date.mo).padStart(2, "0")}${String(date.d).padStart(2, "0")}`;
              const eventTitle = `${title}（${facility.name}）`;
              const id = `${srcKey}:fureai:${facility.slug}:${title}:${dateKey}`;
              if (byId.has(id)) continue;

              const { startsAt, endsAt } = buildStartsEndsForDate(
                { y: date.y, mo: date.mo, d: date.d },
                ev.timeRange
              );

              // ジオコーディング: 施設住所で解決
              const fullAddress = `東京都${facility.address}`;
              const point = resolveEventPoint(source, facility.name, null, fullAddress);
              const address = resolveEventAddress(source, facility.name, fullAddress, point);

              byId.set(id, {
                id,
                source: srcKey,
                source_label: label,
                title: eventTitle,
                starts_at: startsAt,
                ends_at: endsAt,
                venue_name: facility.name,
                address: address || fullAddress,
                url,
                lat: point ? point.lat : source.center.lat,
                lng: point ? point.lng : source.center.lng,
              });
            }
          }
        }
      } catch (e) {
        console.warn(`[${label}/ふれあい館] ${facility.name} parse failed: ${e.message}`);
      }
    }

    const eventList = Array.from(byId.values());
    console.log(`[${label}/ふれあい館] ${eventList.length} events collected from ${FACILITIES.length} facilities`);
    return eventList;
  };
}

module.exports = { createCollectArakawaFureaiEvents };
