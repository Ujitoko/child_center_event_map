const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");

/**
 * 上里町 子育てポータル「むぎゅっと」EventCal_Standard カレンダー
 * URL: /dd.aspx?moduleid=3253
 *
 * HTML構造:
 * <div class="EventCal_Standard">
 *   <div class="Term"><h2>2026年2月</h2></div>
 *   <div class="Next"><a href="/dd.aspx?moduleid=3253&pfromdate=957200">翌月へ</a></div>
 *   <div class="Contents"> or <div class="Contents alter">
 *     <div class="LineLeft">
 *       <span class="Date WeekD_D"> 2日</span>
 *     </div>
 *     <div class="LineRight">
 *       <ul><li><a class="HolidayOther">子育て支援ルーム ...(神保原児童館)10:30</a></li></ul>
 *     </div>
 *   </div>
 * </div>
 */

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|おはなし|すくすく|のびのび|ママ|パパ|マタニティ|にこにこ|ちびっこ|こむぎ|幼児教室|支援ルーム/;

/**
 * EventCal_Standard ページから年月とイベントを抽出
 */
function parseEventCalPage(html, baseUrl) {
  // 年月抽出: <h2>2026年2月</h2> (ニュース日付ではなくカレンダー見出しを狙う)
  const ymMatch = html.match(/<h2>\s*(\d{4})年\s*(\d{1,2})月/);
  if (!ymMatch) return { events: [], nextUrl: null, y: 0, mo: 0 };
  const y = Number(ymMatch[1]);
  const mo = Number(ymMatch[2]);

  // 翌月リンク
  const nextMatch = html.match(/<div\s+class="Next"[^>]*>\s*<a\s+href="([^"]+)"/i);
  const nextUrl = nextMatch ? `${baseUrl}${nextMatch[1].replace(/&amp;/g, "&")}` : null;

  const events = [];

  // Contents ブロックを分割
  const contentBlocks = html.split(/class=['"]Contents(?:\s+alter)?['"]/i);
  for (let i = 1; i < contentBlocks.length; i++) {
    const block = contentBlocks[i];

    // 日付: <span class='Date ...'> N日</span>
    const dayMatch = block.match(/class=['"]Date\s+[^'"]*['"][^>]*>\s*(\d{1,2})日/);
    if (!dayMatch) continue;
    const d = Number(dayMatch[1]);

    // イベント: <a class="HolidayOther" ...>text</a> or plain <li> text
    const eventTexts = [];
    // a タグからイベントテキスト抽出
    const aRe = /<a\s+[^>]*class="HolidayOther"[^>]*>([\s\S]*?)<\/a>/gi;
    let am;
    while ((am = aRe.exec(block)) !== null) {
      const text = stripTags(am[1]).trim();
      if (text) eventTexts.push(text);
    }
    // a タグが無い場合、li テキストをフォールバック
    if (eventTexts.length === 0) {
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let lm;
      while ((lm = liRe.exec(block)) !== null) {
        const text = stripTags(lm[1]).trim();
        if (text) eventTexts.push(text);
      }
    }

    for (const text of eventTexts) {
      events.push({ y, mo, d, text });
    }
  }

  return { events, nextUrl, y, mo };
}

/**
 * イベントテキストから会場名と時刻を抽出
 * 例: "子育て支援ルーム ハートのスタンプアート(神保原児童館)10:30"
 *     "小学生対象 節分ゲーム（長幡児童館）15:30要予約"
 *     "子育て支援ルーム 「まめまき」 賀美児童館 10:30"
 */
function parseEventText(text) {
  let venue = "";
  let title = text;

  // 括弧内の会場名を抽出: (○○児童館) or （○○児童館）
  const parenMatch = text.match(/[（(]([^）)]*(?:児童館|公民館|センター|ホール|学校|体育館|広場|ひろば)[^）)]*)[）)]/);
  if (parenMatch) {
    venue = parenMatch[1].trim();
  }

  // 括弧なしの場合: "賀美児童館" 等のキーワードを直接抽出
  if (!venue) {
    const directMatch = text.match(/(神保原児童館|長幡児童館|賀美児童館|上里町役場|[^\s]+(?:児童館|公民館|センター|ホール))/);
    if (directMatch) {
      venue = directMatch[1].trim();
    }
  }

  // 時刻抽出: "10:30" or "10：30" or "16時"
  let startHour = null;
  let startMin = null;
  let endHour = null;
  let endMin = null;

  // HH:MM～HH:MM パターン
  const rangeMatch = text.match(/(\d{1,2})[：:](\d{2})\s*[～〜-]\s*(\d{1,2})[：:](\d{2})/);
  if (rangeMatch) {
    startHour = Number(rangeMatch[1]);
    startMin = Number(rangeMatch[2]);
    endHour = Number(rangeMatch[3]);
    endMin = Number(rangeMatch[4]);
  } else {
    // HH:MM パターン
    const timeMatch = text.match(/(\d{1,2})[：:](\d{2})/);
    if (timeMatch) {
      startHour = Number(timeMatch[1]);
      startMin = Number(timeMatch[2]);
    } else {
      // N時 パターン
      const hourMatch = text.match(/(\d{1,2})時/);
      if (hourMatch) {
        startHour = Number(hourMatch[1]);
        startMin = 0;
      }
    }
  }

  const timeRange = (startHour !== null)
    ? { startHour, startMin: startMin || 0, endHour, endMin }
    : null;

  return { title, venue, timeRange };
}

function buildGeoCandidates(venue) {
  const candidates = [];
  if (venue) {
    candidates.push(`埼玉県児玉郡上里町 ${venue}`);
    candidates.push(`埼玉県上里町 ${venue}`);
  }
  return candidates;
}

function createCollectKamisatoEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectKamisatoEvents(maxDays) {
    const source = deps.source || {
      key: "kamisato", label: "上里町",
      baseUrl: "https://www.town.kamisato.saitama.jp",
      center: { lat: 36.2460, lng: 139.1477 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    const monthCount = getMonthsForRange(maxDays).length;
    const allEvents = [];

    // 最初のページ (現在の月) から開始し、Nextリンクを辿る
    let currentUrl = `${baseUrl}/dd.aspx?moduleid=3253`;
    for (let mi = 0; mi < monthCount; mi++) {
      try {
        const html = await fetchText(currentUrl);
        const { events, nextUrl } = parseEventCalPage(html, baseUrl);
        allEvents.push(...events);
        if (!nextUrl) break;
        currentUrl = nextUrl;
      } catch (e) {
        console.warn(`[${label}] EventCal page fetch failed:`, e.message || e);
        break;
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 子育てフィルタ + 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!CHILD_RE.test(ev.text)) continue;
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.text}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const { title, venue, timeRange } = parseEventText(ev.text);

      let geoCandidates = buildGeoCandidates(venue);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const calendarUrl = `${baseUrl}/dd.aspx?moduleid=3253`;
      const id = `${srcKey}:${calendarUrl}:${title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: address || "",
        url: calendarUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectKamisatoEvents };
