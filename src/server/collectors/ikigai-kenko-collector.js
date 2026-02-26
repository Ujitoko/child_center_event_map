/**
 * 久留米市生きがい健康づくり財団 児童センター コレクタ
 * ikigai-kenko.jp の講座・イベント一覧から「児童センター」カテゴリの子育て関連イベントを収集
 * ~15-22件/月
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");

const LIST_BASE = "https://ikigai-kenko.jp/events/index/ym:";
const FACILITY_POINT = { lat: 33.3150, lng: 130.5094 };
const FACILITY_ADDRESS = "久留米市六ツ門町3-11";
const FACILITY_NAME = "久留米市児童センター";

/**
 * 令和年→西暦変換  令和N年 = 2018+N年
 * 全角数字にも対応
 */
function reiwaToYear(rStr) {
  const n = Number(rStr.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 48)));
  return isNaN(n) ? null : 2018 + n;
}

/** 全角数字→半角 */
function zenToHan(s) {
  return s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 48));
}

/**
 * 開催期間テキストから日付配列を抽出
 * 対応フォーマット:
 *   令和８年３月１日           → [2026-03-01]
 *   令和８年３月１日（木）       → [2026-03-01]
 *   令和８年２月１３日・２０日    → [2026-02-13, 2026-02-20]
 *   令和８年１月１１・２５日、２月８・２２日 → 複数月複数日
 *   令和８年１月１０日～令和８年３月２１日   → 範囲（開始日のみ）
 * 「毎月」「毎週」「開館日の」等の定型表現はスキップ
 */
function parseDatesFromReiwa(text, maxDays) {
  if (!text) return [];
  const t = zenToHan(text);

  // 定型的な繰り返し表現はスキップ
  if (/毎月|毎週|開館日の/.test(t)) return [];

  const now = new Date();
  const cutoff = new Date(now.getTime() + (maxDays || 30) * 86400000);
  const dates = [];

  // パターン1: 令和N年M月D日 (メインの年月日パターン)
  // "令和8年1月11・25日、2月8・22日、3月8・15日" のように、1つの令和年に複数の月・日が続く
  const yearMatch = t.match(/令和(\d+)年/);
  if (!yearMatch) return [];
  const year = reiwaToYear(yearMatch[1]);
  if (!year) return [];

  // 月ごとのブロックを抽出
  // "1月11・25日、2月8・22日" → ["1月11・25日", "2月8・22日"]
  const monthBlocks = t.match(/(\d{1,2})月[^月令]*/g);
  if (!monthBlocks) return [];

  for (const block of monthBlocks) {
    const monthMatch = block.match(/^(\d{1,2})月/);
    if (!monthMatch) continue;
    const month = Number(monthMatch[1]);
    if (month < 1 || month > 12) continue;

    // 日の抽出: "11・25日" or "11日" or "11日・25日"
    // "1日～3月21日" のような範囲の場合は最初の日だけ
    // ※や第以降の付加情報はカット ("19日※第3木曜日" → "19日")
    let dayPart = block.slice(monthMatch[0].length);
    dayPart = dayPart.replace(/[※(（].*$/, "");
    // "第N" パターン除去 (第3木曜日 etc.)
    dayPart = dayPart.replace(/第\d+[月火水木金土日曜]/g, "");
    const dayNums = dayPart.match(/\d{1,2}/g);
    if (!dayNums) continue;

    // 範囲パターンかチェック: "10日～"
    const isRange = /～|~/.test(dayPart);

    for (let i = 0; i < dayNums.length; i++) {
      const day = Number(dayNums[i]);
      if (day < 1 || day > 31) continue;

      const d = new Date(year, month - 1, day);
      if (d < now && d.getTime() < now.getTime() - 86400000) continue; // past
      if (d > cutoff) continue; // too far in future
      const ds = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      dates.push(ds);

      // 範囲パターンでは最初の日だけ使う
      if (isRange) break;
    }
  }

  return dates;
}

function createIkigaiKenkoCollector({ source }, { resolveEventPoint }) {
  return async function collectIkigaiKenkoEvents(maxDays) {
    const now = new Date();
    const events = [];
    const seen = new Set();

    // 当月 + 来月
    const months = [];
    months.push({ y: now.getFullYear(), m: now.getMonth() + 1 });
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    months.push({ y: next.getFullYear(), m: next.getMonth() + 1 });

    for (const { y, m } of months) {
      const url = `${LIST_BASE}${y}-${String(m).padStart(2, "0")}`;
      let html;
      try {
        html = await fetchText(url, 15000);
      } catch (e) {
        console.error(`[${source.label}] fetch error:`, e.message);
        continue;
      }
      if (!html) continue;

      // e-part カードを抽出 — zidou カテゴリのみ
      const cardRe = /<div class="e-part">([\s\S]*?)<\/div>\s*<!-- e-part -->/gi;
      let cm;
      while ((cm = cardRe.exec(html)) !== null) {
        const card = cm[1];

        // カテゴリフィルタ: zidou (児童センター) のみ
        if (!/category\s+zidou/.test(card)) continue;

        // URL
        const hrefMatch = card.match(/href="(\/events\/detail\/(\d+))"/);
        if (!hrefMatch) continue;
        const detailPath = hrefMatch[1];
        const eventId = hrefMatch[2];

        // タイトル
        const dtMatch = card.match(/<dt>([\s\S]*?)<\/dt>/);
        if (!dtMatch) continue;
        const title = stripTags(dtMatch[1]).trim();
        if (!title) continue;

        // 開催期間
        const dateMatch = card.match(/開催期間[：:]\s*([\s\S]*?)(?:<\/p>|<br\s*\/?>)/);
        if (!dateMatch) continue;
        const dateText = stripTags(dateMatch[1]).trim();

        const dates = parseDatesFromReiwa(dateText, maxDays || 30);
        if (dates.length === 0) continue;

        const fullUrl = `https://ikigai-kenko.jp${detailPath}`;

        for (const ds of dates) {
          const id = `${source.key}:${eventId}:${title}:${ds}`;
          if (seen.has(id)) continue;
          seen.add(id);

          const point = resolveEventPoint(
            { source: source.key, venue_name: FACILITY_NAME, address: FACILITY_ADDRESS },
            FACILITY_POINT
          );

          events.push({
            id,
            source: source.key,
            title,
            starts_at: `${ds}T00:00:00+09:00`,
            ends_at: null,
            venue_name: FACILITY_NAME,
            address: FACILITY_ADDRESS,
            point,
            url: fullUrl,
          });
        }
      }
    }

    return events;
  };
}

module.exports = { createIkigaiKenkoCollector };
