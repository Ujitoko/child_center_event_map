const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseYmdFromJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { normalizeJaDigits } = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

/**
 * 藤沢市公民館・市民センターのイベントページから子育てイベントを収集
 *
 * 各センターのHTMLは構造が異なるため、複数のパーサーでベストエフォート抽出。
 * 日付がHTMLに含まれるセンターのみ対象。
 */

const CHILD_RE =
  /子育て|子ども|子供|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|おはなし|おはなし会|リトミック|ママ|パパ|保育|離乳食|未就園|未就学|家庭の日|読み聞かせ|絵本/;

// 公民館リスト (住所はジオコーディング用に固定)
const CENTERS = [
  { name: "御所見市民センター", path: "/gosho-c/goshomi_events.html", address: "藤沢市打戻1760-1" },
  { name: "村岡市民センター", path: "/mura-c/jigyou.html", address: "藤沢市弥勒寺1-3-7" },
  { name: "長後市民センター", path: "/chougo-c/jigyouannai.html", address: "藤沢市長後513" },
  { name: "辻堂市民センター", path: "/tsuji-c/kouminkannibento.html", address: "藤沢市辻堂東海岸1-1-41" },
  { name: "六会市民センター", path: "/mutsu-c/documents/kouminkannjigyou.html", address: "藤沢市亀井野4-8-1" },
  { name: "片瀬市民センター", path: "/kata-c/kouminkan/top.html", address: "藤沢市片瀬3-9-6" },
  { name: "善行市民センター", path: "/zengyo-c/jigyouannai.html", address: "藤沢市善行1-2-3" },
  { name: "湘南大庭市民センター", path: "/snooba-c/kyoiku/shogai/kominkan/kominkan/shonanoba/jigyouannai.html", address: "藤沢市大庭5406-4" },
  { name: "藤沢市民センター", path: "/fuji-c/kouminkanjigyo/kouza.html", address: "藤沢市朝日町10" },
  { name: "湘南台市民センター", path: "/sndai-c/sndaijigyouannnai.html", address: "藤沢市湘南台1-8" },
  { name: "鵠沼市民センター", path: "/kuge-c/kouminkan/kugenuma.html", address: "藤沢市鵠沼海岸2-10-34" },
  { name: "明治市民センター", path: "/meiji-c/kurashi/shimin/chiiki/meji/zigyouannai/kouminkan.html", address: "藤沢市辻堂新町1-11-23" },
  { name: "遠藤市民センター", path: "/endou-c/endo_kouminkan.html", address: "藤沢市遠藤2984-3" },
];

/**
 * HTMLから日付+イベント名のペアを抽出 (複数パターン対応)
 */
function extractEvents(html, baseUrl, centerName) {
  const text = normalizeJaDigits(stripTags(html));
  const events = [];
  const now = parseYmdFromJst(new Date());
  const defaultYear = now.y;

  // パターン1: テーブル行「YYYY年M月D日(曜日)」+ イベント名
  const fullDateRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let fm;
  while ((fm = fullDateRe.exec(text)) !== null) {
    const y = Number(fm[1]);
    const mo = Number(fm[2]);
    const d = Number(fm[3]);
    // 日付の前後100文字からイベント名を探す
    const ctx = text.slice(Math.max(0, fm.index - 100), fm.index + fm[0].length + 200);
    const titleMatch = findEventTitle(ctx, html, fm.index);
    if (titleMatch) {
      events.push({ y, mo, d, title: titleMatch, center: centerName });
    }
  }

  // パターン2: 「M月D日(曜日) 時刻」「日時：M月D日」など (年なし)
  const shortDateRe = /(?:日時[：:]?\s*)?(\d{1,2})月(\d{1,2})日\s*[(（][^)）]*[)）]/g;
  let sm;
  while ((sm = shortDateRe.exec(text)) !== null) {
    const mo = Number(sm[1]);
    const d = Number(sm[2]);
    // 年を推定: 現在月より2ヶ月以上前なら来年
    let y = defaultYear;
    if (mo < now.m - 2) y = defaultYear + 1;
    const ctx = text.slice(Math.max(0, sm.index - 150), sm.index + sm[0].length + 200);
    const titleMatch = findEventTitle(ctx, html, sm.index);
    if (titleMatch) {
      // 重複チェック (同じ日付+タイトル)
      const dup = events.find(e => e.y === y && e.mo === mo && e.d === d && e.title === titleMatch);
      if (!dup) {
        events.push({ y, mo, d, title: titleMatch, center: centerName });
      }
    }
  }

  // パターン3: HTMLリンク付きイベント + 近接する日付
  const linkEvents = extractLinkedEvents(html, baseUrl, centerName, defaultYear, now.m);
  for (const le of linkEvents) {
    const dup = events.find(e => e.y === le.y && e.mo === le.mo && e.d === le.d && e.title === le.title);
    if (!dup) events.push(le);
  }

  return events;
}

/**
 * コンテキスト文字列からイベントタイトルを推定
 */
function findEventTitle(contextText, fullHtml, dateIndex) {
  // 「事業名」列やリンクテキストを探す
  // まず近接するリンクテキストを探す
  const nearHtml = fullHtml.slice(Math.max(0, dateIndex - 500), dateIndex + 500);
  const linkRe = /<a\s+[^>]*>([^<]{3,80})<\/a>/gi;
  let lm;
  const links = [];
  while ((lm = linkRe.exec(nearHtml)) !== null) {
    const t = stripTags(lm[1]).trim().replace(/\(PDF[^)]*\)/gi, "").trim();
    if (t.length >= 3 && !/(一覧|トップ|ホーム|詳細|こちら)/.test(t)) {
      links.push(t);
    }
  }
  if (links.length > 0) return links[0];

  // テキストから「●タイトル」を探す
  const bulletMatch = contextText.match(/[●■▶]([^\n●■▶]{3,60})/);
  if (bulletMatch) return bulletMatch[1].trim();

  return null;
}

/**
 * HTML内のリンクと近接日付からイベントを抽出
 */
function extractLinkedEvents(html, baseUrl, centerName, defaultYear, currentMonth) {
  const events = [];
  // リンクと子育てキーワードのマッチ
  const linkRe = /<a\s+[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const title = stripTags(m[2]).trim().replace(/\(PDF[^)]*\)/gi, "").trim();
    if (title.length < 3) continue;
    if (!CHILD_RE.test(title) && !WARD_CHILD_HINT_RE.test(title)) continue;

    // このリンク周辺から日付を探す
    const ctx = html.slice(Math.max(0, m.index - 300), m.index + m[0].length + 500);
    const ctxText = normalizeJaDigits(stripTags(ctx));

    // 完全日付
    const fullMatch = ctxText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (fullMatch) {
      events.push({
        y: Number(fullMatch[1]),
        mo: Number(fullMatch[2]),
        d: Number(fullMatch[3]),
        title,
        center: centerName,
      });
      continue;
    }

    // 短い日付
    const shortMatch = ctxText.match(/(\d{1,2})月(\d{1,2})日/);
    if (shortMatch) {
      const mo = Number(shortMatch[1]);
      const d = Number(shortMatch[2]);
      let y = defaultYear;
      if (mo < currentMonth - 2) y = defaultYear + 1;
      events.push({ y, mo, d, title, center: centerName });
    }
  }
  return events;
}

// f-mirai.jp (藤沢市みらい創造財団) の施設住所
const FMIRAI_FACILITIES = {
  "辻堂青少年会館": "藤沢市辻堂東海岸1-1-25",
  "藤沢青少年会館": "藤沢市朝日町10-8",
  "少年の森": "藤沢市打戻2345",
  "大鋸児童館": "藤沢市大鋸976",
  "辻堂児童館": "藤沢市辻堂東海岸2-6-18",
  "鵠洋児童館": "藤沢市鵠沼桜が岡3-16-9",
  "辻堂砂山児童館": "藤沢市辻堂西海岸2-1-14",
  "石川児童館": "藤沢市石川1-1-21",
};

const FMIRAI_CHILD_RE =
  /親子|子育て|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|おはなし|リトミック|ママ|パパ|ぴーか・ぶー|ちびっこ|0歳|1歳|2歳|3歳|未就学|未就園|小学|青少年|こども|子ども|ファミリー|中学生|学童/;

/**
 * コンテンツの「日時」セクションのみから日付を抽出（申込/締切の日付を除外）
 */
function extractEventDatesFromContent(content, title, now) {
  const dates = [];
  const found = new Set();

  // 「日時」セクションを抽出（日時:〜 次のフィールドラベルまで）
  // Content is typically a single line with fields separated by spaces
  // Handle variants: 日時, 【日時】, 【大会日時】, 開催日・時間, ★開催日
  const dateSectionMatch = content.match(/(?:★?開催日[・時間]*|【[^】]*日時】|日\s*時)[：:・\s]*([\s\S]{5,300}?)(?=\s+(?:【[^】]*】|(?:場所|会場|内容|コンテンツ|対象|費用|持ち物|定員|申込|問い合わせ|チケット|講師|備考|注意|主催|主管|後援)\s))/);
  const dateText = dateSectionMatch ? dateSectionMatch[1] : "";

  if (dateText) {
    // YYYY年M月D日
    const fullRe = /(\d{4})\s*[年/]\s*(\d{1,2})\s*[月/]\s*(\d{1,2})\s*日?/g;
    let fm;
    while ((fm = fullRe.exec(dateText)) !== null) {
      const y = Number(fm[1]);
      const mo = Number(fm[2]);
      const d = Number(fm[3]);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
      const key = `${y}-${mo}-${d}`;
      if (!found.has(key)) { found.add(key); dates.push({ y, mo, d }); }
    }
    // M月D日 (年なし)
    const bareRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
    let dm;
    while ((dm = bareRe.exec(dateText)) !== null) {
      const before = dateText.substring(Math.max(0, dm.index - 6), dm.index);
      if (/\d年\s*$/.test(before)) continue; // already captured by fullRe
      const mo = Number(dm[1]);
      const d = Number(dm[2]);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
      let y = now.y;
      if (mo < now.m - 2) y = now.y + 1;
      const key = `${y}-${mo}-${d}`;
      if (!found.has(key)) { found.add(key); dates.push({ y, mo, d }); }
    }
  }

  // タイトルから日付抽出: "2/28（土）" パターン
  if (dates.length === 0) {
    const titleDateRe = /(\d{1,2})\s*[\/]\s*(\d{1,2})\s*[（(]/g;
    let tm;
    while ((tm = titleDateRe.exec(title)) !== null) {
      const mo = Number(tm[1]);
      const d = Number(tm[2]);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
      let y = now.y;
      if (mo < now.m - 2) y = now.y + 1;
      const key = `${y}-${mo}-${d}`;
      if (!found.has(key)) { found.add(key); dates.push({ y, mo, d }); }
    }
  }

  return dates;
}

/**
 * f-mirai.jp WordPress REST API からイベント記事を取得
 */
async function fetchFmiraiEvents(maxDays) {
  const events = [];
  try {
    const apiUrl = "https://f-mirai.jp/wp-json/wp/v2/posts?categories=34&per_page=50&_fields=id,title,content,link,date";
    const text = await fetchText(apiUrl);
    const posts = JSON.parse(text);
    if (!Array.isArray(posts)) return events;

    const now = parseYmdFromJst(new Date());

    for (const post of posts) {
      const title = stripTags((post.title && post.title.rendered) || "").trim();
      const content = stripTags((post.content && post.content.rendered) || "");
      const postUrl = post.link || "";
      if (!title || !FMIRAI_CHILD_RE.test(title + content)) continue;

      const dates = extractEventDatesFromContent(content, title, now);

      // Fallback: use post.date (ISO) if no dates extracted from content
      if (dates.length === 0 && post.date) {
        const pd = new Date(post.date + "+09:00");
        if (!isNaN(pd.getTime())) {
          const y = pd.getFullYear();
          const mo = pd.getMonth() + 1;
          const d = pd.getDate();
          dates.push({ y, mo, d });
        }
      }

      for (const dt of dates) {
        events.push({ y: dt.y, mo: dt.mo, d: dt.d, title, url: postUrl, content });
      }
    }
  } catch (e) {
    console.warn("[藤沢市] f-mirai.jp API failed:", e.message || e);
  }
  return events;
}

/**
 * コンテンツから施設名を推定
 */
function inferFmiraiFacility(content, title) {
  for (const name of Object.keys(FMIRAI_FACILITIES)) {
    if (content.includes(name) || title.includes(name)) return name;
  }
  // 部分マッチ: 青少年会館
  if (/辻堂.*青少年会館|辻堂青少年/.test(content + title)) return "辻堂青少年会館";
  if (/藤沢.*青少年会館|藤沢青少年/.test(content + title)) return "藤沢青少年会館";
  return "";
}

function createCollectFujisawaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;

  return async function collectFujisawaEvents(maxDays) {
    const srcKey = "ward_fujisawa";
    const label = "藤沢市";
    const baseUrl = "https://www.city.fujisawa.kanagawa.jp";
    const sourceObj = { key: "fujisawa", label, baseUrl, center: { lat: 35.3388, lng: 139.4900 } };

    // ソース1: 公民館ページ
    const allEvents = [];
    for (const center of CENTERS) {
      const url = `${baseUrl}${center.path}`;
      try {
        const html = await fetchText(url);
        const rawText = normalizeJaDigits(stripTags(html));
        const timeRange = parseTimeRangeFromText(rawText);
        const evts = extractEvents(html, baseUrl, center.name);
        for (const ev of evts) {
          allEvents.push({ ...ev, centerAddress: center.address, url, timeRange });
        }
      } catch (e) {
        console.warn(`[${label}] ${center.name} fetch failed:`, e.message || e);
      }
    }

    const childEvents = allEvents.filter(
      (ev) => CHILD_RE.test(ev.title) || WARD_CHILD_HINT_RE.test(ev.title)
    );

    const byId = new Map();
    for (const ev of childEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const geoCandidates = [`神奈川県${ev.centerAddress}`, `神奈川県藤沢市 ${ev.center}`];
      let point = await geocodeForWard(geoCandidates.slice(0, 7), sourceObj);
      point = resolveEventPoint(sourceObj, ev.center, point, `神奈川県${ev.centerAddress}`);
      const address = resolveEventAddress(sourceObj, ev.center, `神奈川県${ev.centerAddress}`, point);
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label, title: ev.title,
        starts_at: startsAt, ends_at: endsAt, venue_name: ev.center,
        address: address || `神奈川県${ev.centerAddress}`, url: ev.url,
        lat: point ? point.lat : null, lng: point ? point.lng : null,
      });
    }

    // ソース2: f-mirai.jp WordPress API (児童館・青少年会館)
    const fmiraiEvents = await fetchFmiraiEvents(maxDays);
    for (const ev of fmiraiEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const facility = inferFmiraiFacility(ev.content || "", ev.title);
      const facilityAddr = FMIRAI_FACILITIES[facility] || "";
      const geoCandidates = facilityAddr
        ? [`神奈川県${facilityAddr}`, `神奈川県藤沢市 ${facility}`]
        : [`神奈川県藤沢市 ${facility || ev.title}`];
      let point = await geocodeForWard(geoCandidates.slice(0, 7), sourceObj);
      point = resolveEventPoint(sourceObj, facility, point, facilityAddr ? `神奈川県${facilityAddr}` : `${label}`);
      const address = resolveEventAddress(sourceObj, facility, facilityAddr ? `神奈川県${facilityAddr}` : `${label}`, point);
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, null
      );
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label, title: ev.title,
        starts_at: startsAt, ends_at: endsAt, venue_name: facility || label,
        address: address || (facilityAddr ? `神奈川県${facilityAddr}` : ""), url: ev.url,
        lat: point ? point.lat : null, lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectFujisawaEvents };
