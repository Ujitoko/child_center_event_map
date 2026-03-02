/**
 * 小山市 お出かけカレンダー (oyama.city-hc.jp) イベントコレクター
 *
 * おやまっ子子育てナビの「お出かけカレンダー」ページから子育てイベントを抽出。
 * ページはopen_announcement/family_facility/のカテゴリ一覧から動的にURLを検出する。
 *
 * 構造:
 *   <div class="announcement-article"><p>
 *     【子育て支援センター】
 *     〇施設名　℡　XX-XXXX
 *     3月　２日（月）イベント名
 *     ４日（水）・９日（月）イベント名       ← 複数日(中点区切り)
 *     ５日（木）～１3日（金）イベント名      ← 日付範囲
 *     【子育てひろば】
 *     〇施設名
 *     3月N日（曜）イベント名
 *     【子育てサロン】
 *     ...
 *   </p></div>
 *
 * 全角数字・半角数字混在。月は「3月」で始まり以降省略される。
 */
const { fetchText } = require("../fetch-utils");
const { normalizeJaDigits } = require("../text-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { OYAMA_SOURCE } = require("../../config/wards");

const SITE_BASE = "https://oyama.city-hc.jp";
const LISTING_URL = `${SITE_BASE}/open_announcement/family_facility/`;

/**
 * 施設名→住所マッピング (KNOWN_FACILITIESと併用)
 * 子育て支援センターは保育園内に併設
 */
const FACILITY_ADDRESS = {
  "小山西保育園": "小山市神鳥谷1-4-23",
  "黒田保育園": "小山市東黒田297-1",
  "こばと保育園": "小山市大行寺1117-2",
  "さくら保育園": "小山市城北3-1-10",
  "こぐま保育園": "小山市犬塚5-20-3",
  // 子育てひろば (公民館等に併設)
  "しらさぎ": "小山市外城371-1",
  "うさぎっこ": "小山市間々田1960-1",
  "かるがも": "小山市大本785",
  "おおやっこ": "小山市大谷北900",
  "つむぎっこ": "小山市粟宮1-2-1",
  // 子育てサロン
  "こどもふれあい教室": "小山市中央町2-5-42",
  "子育てサロン": "小山市中央町2-5-42",
};

/**
 * カテゴリ一覧ページからお出かけカレンダーのURLを検出
 */
async function discoverCalendarUrl() {
  const html = await fetchText(LISTING_URL);
  // <a class="list-item-link" href="/open_announcement/family_facility/HASH">
  //   <div>お出かけカレンダー(N月)</div>
  const re = /<a[^>]*href="(\/open_announcement\/family_facility\/[^"]+)"[^>]*>[\s\S]*?<div>([^<]*お出かけカレンダー[^<]*)<\/div>/gi;
  const urls = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    urls.push({ path: m[1], title: m[2].trim() });
  }
  return urls;
}

/**
 * お出かけカレンダーのHTMLテキストからイベントを抽出
 *
 * @param {string} html - ページHTML全体
 * @returns {Array<{facility: string, y: number, mo: number, d: number, title: string, section: string}>}
 */
function parseOdekakeCalendar(html) {
  // announcement-article内の<p>コンテンツを抽出
  const artMatch = html.match(/class="announcement-article">([\s\S]*?)<\/div>/);
  if (!artMatch) return [];

  // <br/>で行分割し、全角数字を半角に正規化
  const raw = artMatch[1].replace(/<\/?p>/g, "");
  const lines = raw.split(/<br\s*\/?>/).map((l) =>
    normalizeJaDigits(l.replace(/<[^>]+>/g, "").trim())
  );

  const events = [];
  let currentSection = "";
  let currentFacility = "";
  let currentMonth = 0;
  let currentYear = 0;

  // タイトルから年月を推定
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (titleMatch) {
    const ym = normalizeJaDigits(titleMatch[1]).match(/(\d{1,2})月/);
    if (ym) currentMonth = Number(ym[1]);
  }
  // H1からも
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  if (h1Match) {
    const ym = normalizeJaDigits(h1Match[1]).match(/(\d{1,2})月/);
    if (ym) currentMonth = Number(ym[1]);
  }

  // 年推定: 現在の日付ベース
  const now = new Date(Date.now() + 9 * 3600_000); // JST
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth() + 1;
  currentYear = thisYear;
  // 1月のカレンダーを12月に見ている場合は翌年
  if (currentMonth > 0 && currentMonth < thisMonth - 6) {
    currentYear = thisYear + 1;
  }

  for (const line of lines) {
    if (!line) continue;

    // セクション見出し検出: 【子育て支援センター】, 【子育てひろば】, 【子育てサロン】
    const sectionMatch = line.match(/【([^】]+)】/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      // 子育てサロンの場合、同行に場所情報があることがある
      if (/子育てサロン/.test(currentSection)) {
        currentFacility = "子育てサロン";
      }
      continue;
    }

    // 施設名検出: 〇施設名　℡　XX-XXXX or 〇施設名
    const facilityMatch = line.match(/^[〇○◯●](.+?)(?:[\s　]+℡|$)/);
    if (facilityMatch) {
      currentFacility = facilityMatch[1].replace(/[\s　]+$/g, "").trim();
      continue;
    }

    // 場所行: "　場所：..." をスキップ
    if (/^[\s　]*場所[:：]/.test(line)) continue;

    // 注記行スキップ
    if (/^※/.test(line) || /^≪/.test(line)) continue;
    // "随時", "毎週", "日程未定" などスキップ
    if (/^随時|毎週|日程未定/.test(line)) continue;
    // "→N日に変更" 行はスキップ（前のイベントの変更通知）
    if (/^→/.test(line)) continue;
    // "絵本の読み聞かせ　毎週" などの定期イベントスキップ
    if (/毎週/.test(line) && !/\d{1,2}日/.test(line)) continue;

    // 月情報の更新: "3月 " or "3月N日" で始まる場合
    const monthPrefix = line.match(/^(\d{1,2})月[\s　]*/);
    let lineText = line;
    if (monthPrefix) {
      currentMonth = Number(monthPrefix[1]);
      // "3月3日..." → "3日...", "3月 2日..." → "2日..."
      lineText = line.slice(monthPrefix[0].length).trim();
      // もし月の後に直接日が続く場合: "3月3日（火）" → monthPrefix="3月" lineText="3日（火）"
      // 月のみの行 "3月の予定" のような行はスキップ
      if (!lineText && !monthPrefix[0].match(/\d{1,2}日/)) continue;
    }

    if (!currentMonth || !currentFacility) continue;

    // 日付パターンの抽出
    // パターン1: "N日（曜）イベント名"
    // パターン2: "N日（曜）・N日（曜）イベント名" (複数日)
    // パターン3: "N日（曜）～N日（曜）イベント名" (日付範囲)
    const parsed = parseDateLineEvents(lineText, currentYear, currentMonth, currentFacility, currentSection);
    events.push(...parsed);
  }

  return events;
}

/**
 * 1行のテキストから日付+イベント名を抽出
 * 複数日パターン: "4日（水）・9日（月）・11日（水）手型・足型製作"
 * 範囲パターン: "5日（木）～13日（金）春の製作"
 * 単独パターン: "2日（月）おひなさま製作"
 */
function parseDateLineEvents(lineText, year, month, facility, section) {
  const results = [];

  // 日付部分とイベント名部分を分離
  // 日付: N日（曜）が1つ以上、中点(・)やチルダ(～〜~)で繋がる
  const dateBlockRe = /^((?:\d{1,2}日(?:[（(][^）)]*[）)])?(?:\s*[・～〜~\-ー－]\s*)?)+)\s*/;
  const dateBlockMatch = lineText.match(dateBlockRe);
  if (!dateBlockMatch) return results;

  const dateBlock = dateBlockMatch[1];
  const eventTitle = lineText.slice(dateBlockMatch[0].length).trim();
  if (!eventTitle) return results;

  // "観劇会（日程未定）" のような日付なし行が誤マッチしないかチェック
  if (!/\d{1,2}日/.test(dateBlock)) return results;

  // 範囲パターン: "N日（曜）～M日（曜）"
  const rangeMatch = dateBlock.match(
    /(\d{1,2})日(?:[（(][^）)]*[）)])?\s*[～〜~\-ー－]\s*(\d{1,2})日/
  );
  if (rangeMatch) {
    const startDay = Number(rangeMatch[1]);
    const endDay = Number(rangeMatch[2]);
    // 範囲内の各日を生成
    for (let d = startDay; d <= endDay; d++) {
      results.push({
        facility,
        section,
        y: year,
        mo: month,
        d,
        title: eventTitle,
      });
    }
    return results;
  }

  // 複数日パターン: "N日（曜）・M日（曜）" or 単独
  const dayRe = /(\d{1,2})日/g;
  let dm;
  while ((dm = dayRe.exec(dateBlock)) !== null) {
    const d = Number(dm[1]);
    if (d >= 1 && d <= 31) {
      results.push({
        facility,
        section,
        y: year,
        mo: month,
        d,
        title: eventTitle,
      });
    }
  }

  return results;
}

function createCollectOyamaOdekakeEvents(deps) {
  const { resolveEventPoint, resolveEventAddress } = deps;
  const source = OYAMA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectOyamaOdekakeEvents(maxDays) {
    let calendarUrls;
    try {
      calendarUrls = await discoverCalendarUrl();
    } catch (e) {
      console.warn(`[${label}/お出かけ] listing fetch failed:`, e.message || e);
      return [];
    }

    if (calendarUrls.length === 0) {
      console.warn(`[${label}/お出かけ] no calendar URL found on listing page`);
      return [];
    }

    const allEvents = [];

    for (const cal of calendarUrls) {
      const url = `${SITE_BASE}${cal.path}`;
      try {
        const html = await fetchText(url);
        const parsed = parseOdekakeCalendar(html);
        for (const ev of parsed) {
          ev.pageUrl = url;
        }
        allEvents.push(...parsed);
      } catch (e) {
        console.warn(`[${label}/お出かけ] ${cal.title} fetch failed:`, e.message || e);
      }
    }

    // 範囲フィルタ + 重複除去
    const byId = new Map();
    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:odekake:${ev.facility}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const facilityAddr = FACILITY_ADDRESS[ev.facility] || "";
      const geoQuery = facilityAddr
        ? `栃木県${facilityAddr}`
        : `栃木県小山市 ${ev.facility}`;

      const point = resolveEventPoint(
        source,
        ev.facility,
        null,
        geoQuery
      );
      const address = resolveEventAddress(
        source,
        ev.facility,
        facilityAddr,
        point
      );

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        null
      );

      // セクション名をプレフィックスに付加
      const displayTitle = ev.section
        ? `[${ev.section}] ${ev.facility}「${ev.title}」`
        : `${ev.facility}「${ev.title}」`;

      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: displayTitle,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: ev.facility,
        address: address || facilityAddr,
        url: ev.pageUrl || LISTING_URL,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(
      `[${label}/お出かけ] ${results.length} events collected`
    );
    return results;
  };
}

module.exports = { createCollectOyamaOdekakeEvents };
