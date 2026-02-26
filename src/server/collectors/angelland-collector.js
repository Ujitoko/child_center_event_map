/**
 * エンゼルランドふくい (Angel Land Fukui) イベントコレクター
 * https://angelland.or.jp/modules/event/
 *
 * 福井県坂井市の県営児童科学館。NetCommons CMSのイベント検索ページから取得。
 * ページネーション(start=0,20,40)で最大3ページ取得。
 * 日付範囲形式: "2026年1月6日(火)〜2026年3月29日(日)" or 単日 "2026年2月28日(土)"
 * 時間は list-event__info の <dt>時間</dt> or <dt>日時</dt> から取得。
 * 固定施設。~50-80 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE = "https://angelland.or.jp";
const LIST_PATH = "/modules/event/index.php?action=PageSearch&s=17&perpage=20&start=";
const MAX_PAGES = 4;
const FACILITY = {
  name: "エンゼルランドふくい",
  address: "福井県坂井市春江町東太郎丸3-1",
  lat: 36.1208,
  lng: 136.2257,
};

/**
 * リストページHTMLから<li>ごとのイベントを抽出
 * 構造: <ul class="list-event"><li><a href="..."><h3>TITLE</h3><dl class="list-event__info">...</dl></a></li>
 */
function parseListPage(html) {
  const events = [];
  // <li>要素単位で抽出 (list-event の子)
  const liRe = /<li>\s*<a\s+href="([^"]*modules\/event\/index\.php\?action=PageView[^"]*)">([\s\S]*?)<\/a>\s*<\/li>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const rawHref = m[1].replace(/&amp;/g, "&");
    const block = m[2];

    // page_id抽出
    const pidM = rawHref.match(/page_id=(\d+)/);
    if (!pidM) continue;
    const pageId = pidM[1];

    // タイトル: <h3 class="list-event__title">...</h3>
    const titleM = block.match(/<h3[^>]*class="list-event__title"[^>]*>([\s\S]*?)<\/h3>/i);
    if (!titleM) continue;
    const title = stripTags(titleM[1]).replace(/\s+/g, " ").trim();
    if (!title) continue;

    // 日付: <dd class="date">2026年1月6日(火)〜2026年3月29日(日)</dd>
    const dateM = block.match(/<dd\s+class="date">\s*([\s\S]*?)\s*<\/dd>/i);
    const dateText = dateM ? stripTags(dateM[1]).replace(/\s+/g, " ").trim() : "";

    // 時間: <dt>時間</dt><dd>...</dd> or <dt>日時</dt><dd>...</dd>
    let timeText = "";
    const dtDdRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    let dm;
    while ((dm = dtDdRe.exec(block)) !== null) {
      const key = stripTags(dm[1]).trim();
      if (key === "時間" || key === "日時") {
        timeText = stripTags(dm[2]).replace(/\s+/g, " ").trim();
        break;
      }
    }

    // 場所: <dt>場所</dt><dd>...</dd>
    let venue = "";
    const dtDdRe2 = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    let dm2;
    while ((dm2 = dtDdRe2.exec(block)) !== null) {
      const key = stripTags(dm2[1]).trim();
      if (key === "場所") {
        venue = stripTags(dm2[2]).replace(/\s+/g, " ").trim();
        break;
      }
    }

    const href = `${BASE}/modules/event/index.php?action=PageView&page_id=${pageId}`;
    events.push({ pageId, title, dateText, timeText, venue, href });
  }
  return events;
}

/**
 * 日付テキストから年月日を抽出
 * "2026年1月6日(火)〜2026年3月29日(日)" → 開始日と終了日
 * "2026年2月28日(土)" → 単日
 * 長期(90日超)の範囲はスキップ
 */
function parseDateRange(text) {
  if (!text) return [];
  const dates = [];

  // パターン: "YYYY年M月D日(...)" で1つ or 2つ
  const allDates = [];
  const dateRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let dm;
  while ((dm = dateRe.exec(text)) !== null) {
    allDates.push({ y: Number(dm[1]), mo: Number(dm[2]), d: Number(dm[3]) });
  }

  if (allDates.length === 0) return dates;

  if (allDates.length === 1) {
    // 単日
    dates.push(allDates[0]);
  } else if (allDates.length >= 2) {
    // 範囲: 開始～終了
    const start = allDates[0];
    const end = allDates[allDates.length - 1];
    const startDate = new Date(start.y, start.mo - 1, start.d);
    const endDate = new Date(end.y, end.mo - 1, end.d);
    const diffDays = Math.round((endDate - startDate) / (24 * 60 * 60 * 1000));

    if (diffDays <= 14) {
      // 短い範囲なら全日展開
      for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
        dates.push({ y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() });
      }
    } else {
      // 長期範囲は開始日と終了日のみ（中間日は多すぎるため）
      // ただし30日以内であれば展開
      if (diffDays <= 30) {
        for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
          dates.push({ y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() });
        }
      } else {
        // 90日超の常設展示的イベントは開始日のみ
        dates.push(start);
      }
    }
  }

  return dates;
}

/**
 * 時間テキストから最初のHH:MM～HH:MMを抽出
 * "①10:15～11:30（受付終了11:15） ②13:30～15:30" → 10:15～11:30
 * "9:30～17:00" → 9:30～17:00
 * "18:30～21:00(受付/18:15～）" → 18:30～21:00
 */
function parseFirstTime(text) {
  if (!text) return null;
  const tm = text.match(/(\d{1,2}):(\d{2})\s*[～~ー-]\s*(\d{1,2}):(\d{2})/);
  if (tm) {
    return {
      startHour: Number(tm[1]), startMinute: Number(tm[2]),
      endHour: Number(tm[3]), endMinute: Number(tm[4]),
    };
  }
  // HH:MM のみ (開始時刻だけ)
  const tm2 = text.match(/(\d{1,2}):(\d{2})/);
  if (tm2) {
    return { startHour: Number(tm2[1]), startMinute: Number(tm2[2]) };
  }
  return null;
}

function createAngellandCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectAngellandEvents(maxDays) {
    const allRawEvents = [];

    // ページネーションで最大MAX_PAGESページ取得
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = `${BASE}${LIST_PATH}${page * 20}`;
      let html;
      try {
        html = await fetchText(url, { timeout: 35000 });
      } catch (e) {
        console.warn(`[${label}] page ${page} fetch failed:`, e.message || e);
        break;
      }
      if (!html) break;

      const pageEvents = parseListPage(html);
      if (pageEvents.length === 0) break;
      allRawEvents.push(...pageEvents);

      // ページネーション終了チェック: 次ページリンクがなければ終了
      const nextStart = (page + 1) * 20;
      if (!html.includes(`start=${nextStart}`)) break;
    }

    if (allRawEvents.length === 0) return [];

    const point = { lat: FACILITY.lat, lng: FACILITY.lng };
    const resolvedAddr = resolveEventAddress(source, FACILITY.name, FACILITY.address, point);
    const byId = new Map();

    for (const ev of allRawEvents) {
      const dates = parseDateRange(ev.dateText);
      if (dates.length === 0) continue;

      const timeRange = parseFirstTime(ev.timeText);
      const venueName = ev.venue ? `${FACILITY.name} ${ev.venue}` : FACILITY.name;

      let count = 0;
      for (const dd of dates) {
        if (count >= 60) break;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        count++;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${ev.href}:${ev.title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id, source: srcKey, source_label: label,
          title: ev.title,
          starts_at: startsAt, ends_at: endsAt,
          venue_name: venueName,
          address: resolvedAddr || FACILITY.address,
          url: ev.href,
          lat: point.lat, lng: point.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createAngellandCollector };
