/**
 * アクア・トト ぎふ イベントコレクター
 * https://aquatotto.com/
 *
 * 岐阜県各務原市の世界淡水魚園水族館。WP REST API + 詳細ページ解析。
 * 固定施設。~10-20 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");

const API_BASE = "https://aquatotto.com/wp-json/wp/v2";
const DETAIL_BATCH = 5;
const PER_PAGE = 30;
const FACILITY = {
  name: "アクア・トト ぎふ",
  address: "岐阜県各務原市川島笠田町1564-1",
  lat: 35.3782,
  lng: 136.8325,
};

/** REST API からイベントリスト取得 */
async function fetchInfoList() {
  const url = `${API_BASE}/info_list?per_page=${PER_PAGE}&orderby=date&order=desc&_fields=id,title,link,date`;
  const text = await fetchText(url);
  if (!text) return [];
  try {
    const items = JSON.parse(text);
    return items.map(item => ({
      id: item.id,
      title: item.title?.rendered || "",
      link: item.link || "",
      postDate: item.date || "",
    }));
  } catch {
    return [];
  }
}

/** 詳細ページからセクション(h3見出し+table)を抽出 */
function parseDetailSections(html) {
  if (!html) return [];
  const sections = [];

  // テーブルを全て抽出
  const tableRe = /<table\s+class="Detail-part5">([\s\S]*?)<\/table>/gi;
  let tm;
  const tables = [];
  while ((tm = tableRe.exec(html)) !== null) {
    tables.push({ index: tm.index, body: tm[1] });
  }

  // 各テーブル前のh2見出しを探す
  for (const tbl of tables) {
    const section = { dateTimeText: null, subTitle: null, venue: null };

    // テーブル前のh2を探す (テーブル開始位置の前2000文字以内)
    const before = html.substring(Math.max(0, tbl.index - 2000), tbl.index);
    const h2s = before.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
    if (h2s && h2s.length > 0) {
      section.subTitle = stripTags(h2s[h2s.length - 1]).trim();
    }

    // テーブル行を解析
    const rowRe = /<th\s+class="Detail-part5__item-title">([\s\S]*?)<\/th>\s*<td\s+class="Detail-part5__item-body">([\s\S]*?)<\/td>/gi;
    let rm;
    while ((rm = rowRe.exec(tbl.body)) !== null) {
      const key = stripTags(rm[1]).trim();
      const val = stripTags(rm[2]).replace(/\s+/g, " ").trim();
      if (key === "日時" || key === "開催日") section.dateTimeText = val;
      if (key === "時間" && !section.timeText) section.timeText = val;
      if (key === "場所") section.venue = val;
    }

    // 開催日 + 時間 が分離されている場合を結合
    if (section.dateTimeText && section.timeText) {
      section.dateTimeText += " " + section.timeText;
    }

    if (section.dateTimeText) sections.push(section);
  }

  return sections;
}

/** 日時テキストから日付配列と時間範囲を抽出 */
function parseDateTimeText(text) {
  if (!text) return { dates: [], timeRange: null };

  const now = new Date();
  const year = now.getFullYear();
  const dates = [];

  // 全てのM月D日を抽出 (年付き/年なし両対応)
  // "2026年2月17日（火）～3月18日（水）" → 年付き1個 + 年なし1個
  const allDateRe = /(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/g;
  let fm;
  let lastYear = year;
  let lastMonth = 0;
  while ((fm = allDateRe.exec(text)) !== null) {
    const y = fm[1] ? Number(fm[1]) : lastYear;
    if (fm[1]) lastYear = y;
    lastMonth = Number(fm[2]);
    dates.push({ y, mo: lastMonth, d: Number(fm[3]) });
  }

  // "M月D日、DD日" パターン: 月が省略された日のみの記述を補完
  // 例: "3月5日（木）、10日（火）" → 10日は3月
  if (lastMonth > 0) {
    const bareDay = text.replace(/\d{1,2}月\d{1,2}日/g, "");
    const bareDayRe = /(?:、|・)\s*(\d{1,2})日/g;
    let bm;
    while ((bm = bareDayRe.exec(bareDay)) !== null) {
      dates.push({ y: lastYear, mo: lastMonth, d: Number(bm[1]) });
    }
  }

  // 日付間に "～" がある場合のみ期間展開 (時間の "～" と区別)
  const hasDateRange = /\d日[^～]*～[^～]*\d日/.test(text) || /\d日\s*[（(][^)）]*[)）]\s*～/.test(text);
  if (dates.length === 2 && hasDateRange) {
    const expanded = expandDateRange(dates[0], dates[1]);
    if (expanded.length > 0 && expanded.length <= 14) {
      const timeRange = parseTimeRangeFromText(text);
      return { dates: expanded, timeRange };
    }
    // 長期展示/企画は開始日と終了日のみ
  }

  const timeRange = parseTimeRangeFromText(text);
  return { dates: dates.length > 0 ? dates : [], timeRange };
}

/** 日付範囲を展開 (最大60日) */
function expandDateRange(start, end) {
  const s = new Date(start.y, start.mo - 1, start.d);
  const e = new Date(end.y, end.mo - 1, end.d);
  if (isNaN(s) || isNaN(e) || e < s) return [start, end];
  const dates = [];
  const cur = new Date(s);
  while (cur <= e && dates.length < 60) {
    dates.push({ y: cur.getFullYear(), mo: cur.getMonth() + 1, d: cur.getDate() });
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function createAquatotoCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectAquatotoEvents(maxDays) {
    const items = await fetchInfoList();
    if (items.length === 0) return [];

    // 詳細ページバッチ取得
    const detailMap = new Map();
    for (let i = 0; i < items.length; i += DETAIL_BATCH) {
      const batch = items.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const html = await fetchText(item.link);
          return { id: item.id, sections: parseDetailSections(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.id, r.value.sections);
      }
    }

    const point = { lat: FACILITY.lat, lng: FACILITY.lng };
    const resolvedAddr = resolveEventAddress(source, FACILITY.name, FACILITY.address, point);
    const byId = new Map();

    for (const item of items) {
      const sections = detailMap.get(item.id) || [];

      for (const sec of sections) {
        const { dates, timeRange } = parseDateTimeText(sec.dateTimeText);
        // サブタイトルがあれば結合 (冗長・汎用的なものは除外)
        const GENERIC_SUBS = ["内容", "概要", "詳細", "お知らせ", "スケジュール一覧", "ご来館される方へ", "年間パスポート のご案内"];
        // タイトルの正規化 (全角スペース・記号除去)
        const normTitle = item.title.replace(/[『』「」\s　]/g, "").trim();
        const normSub = (sec.subTitle || "").replace(/[『』「」\s　]/g, "").trim();
        const useSub = sec.subTitle
          && normSub !== normTitle
          && !normTitle.includes(normSub)
          && !normSub.includes(normTitle)
          && !GENERIC_SUBS.includes(sec.subTitle);
        const title = useSub
          ? `${item.title}：${sec.subTitle}`
          : item.title;

        for (const dd of dates) {
          if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
          const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
          const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
          const id = `${srcKey}:${item.id}:${title}:${dateKey}`;
          if (byId.has(id)) continue;
          byId.set(id, {
            id, source: srcKey, source_label: label,
            title,
            starts_at: startsAt, ends_at: endsAt,
            venue_name: FACILITY.name,
            address: resolvedAddr || FACILITY.address,
            url: item.link,
            lat: point.lat, lng: point.lng,
          });
        }
      }

      // セクションなし → postDate をフォールバック
      if (sections.length === 0 && item.postDate) {
        const pd = new Date(item.postDate);
        if (!isNaN(pd)) {
          const dd = { y: pd.getFullYear(), mo: pd.getMonth() + 1, d: pd.getDate() };
          if (inRangeJst(dd.y, dd.mo, dd.d, maxDays)) {
            const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
            const { startsAt, endsAt } = buildStartsEndsForDate(dd, null);
            const id = `${srcKey}:${item.id}:${item.title}:${dateKey}`;
            if (!byId.has(id)) {
              byId.set(id, {
                id, source: srcKey, source_label: label,
                title: item.title,
                starts_at: startsAt, ends_at: endsAt,
                venue_name: FACILITY.name,
                address: resolvedAddr || FACILITY.address,
                url: item.link,
                lat: point.lat, lng: point.lng,
              });
            }
          }
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createAquatotoCollector };
