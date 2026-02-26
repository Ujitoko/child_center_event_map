/**
 * 姫路市 子ども・子育てイベントコレクター
 * https://www.city.himeji.lg.jp/event2/YYYYMM.html
 *
 * <table class="calendar_month"> 縦型リスト (1行=1日)。
 * カテゴリ <ul class="cal_category"> で「子ども・子育て」をフィルタ。
 * リスト情報のみ使用 (詳細ページは構造が不統一)。~5-10 events/month
 */
const { fetchText } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { stripTags } = require("../html-utils");

const SITE_BASE = "https://www.city.himeji.lg.jp";

/** カレンダーページからイベントを抽出 */
function parseCalendarPage(html, year, month) {
  const events = [];

  // <table class="calendar_month"> を抽出 (複数ありうる: now.htmlは2テーブル)
  const tableRe = /<table\s+class="calendar_month">([\s\S]*?)<\/table>/gi;
  let tableMatch;
  while ((tableMatch = tableRe.exec(html)) !== null) {
    const table = tableMatch[1];

    // 各行を処理
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRe.exec(table)) !== null) {
      const row = rowMatch[1];

      // 日番号取得: <span>N<span class="cal_day_s">日</span>
      const dayMatch = row.match(/<span[^>]*>(\d{1,2})\s*<span\s+class="cal_day_s">/i);
      if (!dayMatch) continue;
      const day = Number(dayMatch[1]);
      if (day < 1 || day > 31) continue;

      // <td> 内のイベントリスト — <a> リンクごとに後続の cal_category を確認
      // ネストされた <li> があるため split ではなく <a> 位置ベースで解析
      const tdMatch = row.match(/<td>([\s\S]*?)<\/td>\s*$/i);
      if (!tdMatch) continue;
      const tdHtml = tdMatch[1];

      // 全 <a href> を位置付きで取得
      const linkRe = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      let linkMatch;
      const links = [];
      while ((linkMatch = linkRe.exec(tdHtml)) !== null) {
        links.push({ idx: linkMatch.index, href: linkMatch[1], rawTitle: linkMatch[2], endIdx: linkMatch.index + linkMatch[0].length });
      }

      for (let li = 0; li < links.length; li++) {
        const link = links[li];
        // このリンクからnextリンクまでの区間を取得してカテゴリチェック
        const nextIdx = li + 1 < links.length ? links[li + 1].idx : tdHtml.length;
        const block = tdHtml.substring(link.idx, nextIdx);

        // カテゴリチェック: <ul class="cal_category"> 内に「子ども・子育て」
        if (!/子ども・子育て/.test(block)) continue;

        const href = link.href.trim();
        // タイトルからステータスspan除去
        let title = link.rawTitle
          .replace(/<span\s+class="(?:application|closed)">[^<]*<\/span>/gi, "")
          .trim();
        title = stripTags(title).trim();
        if (!title) continue;

        // 絶対URL解決
        const absUrl = href.startsWith("http")
          ? href
          : new URL(href, `${SITE_BASE}/event2/${year}${String(month).padStart(2, "0")}.html`).href;

        events.push({ y: year, mo: month, d: day, title, url: absUrl });
      }
    }
  }

  return events;
}

function createHimejiKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectHimejiKosodateEvents(maxDays) {
    const months = getMonthsForRange(maxDays);

    const allEvents = [];
    for (const ym of months) {
      const ymStr = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      const url = `${SITE_BASE}/event2/${ymStr}.html`;
      try {
        const html = await fetchText(url);
        if (html) allEvents.push(...parseCalendarPage(html, ym.year, ym.month));
      } catch (e) {
        console.warn(`[${label}] event2 ${ymStr} failed:`, e.message || e);
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // URL重複除去 (同一イベントが複数日に出現)
    const byId = new Map();
    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const candidates = [`兵庫県姫路市 ${ev.title}`];
      candidates.push("兵庫県姫路市");

      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, "", point, "兵庫県姫路市");
      const address = resolveEventAddress(source, "", "兵庫県姫路市", point);

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, null
      );

      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: "",
        address: address || "兵庫県姫路市",
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createHimejiKosodateCollector };
