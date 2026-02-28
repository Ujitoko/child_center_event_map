/**
 * 古河市 子育て支援センター カレンダーコレクター
 *
 * koga-kids.com の11施設の月カレンダーページからイベントを抽出する。
 * カレンダーの<a>テキストにイベント名が含まれるため、日別ページfetch不要。
 *
 * URL形式:
 * - カレンダー: http://www.koga-kids.com/html/{center}/calendar/YYYYMM/
 * - <a href="/html/{center}/calendar/YYYYMM/{M}m{D}.html">D日 イベント名</a>
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
} = require("../date-utils");
const { KOGA_IB_SOURCE } = require("../../config/wards");

const SITE_BASE = "http://www.koga-kids.com";

/** 11施設定義 */
const CENTERS = [
  { id: "daisan",  name: "なかよし子育て支援センター" },
  { id: "daiyon",  name: "にっこり子育て支援センター" },
  { id: "wanpaku", name: "わんぱく子育て支援センター" },
  { id: "kobato",  name: "こばと子育て支援センター" },
  { id: "asahi",   name: "あさひ子育て支援センター" },
  { id: "genkids", name: "げんきっず子育て支援センター" },
  { id: "ekimae",  name: "駅前子育て支援センター" },
  { id: "poco",    name: "ポコ・ア・ポコ子育て支援センター" },
  { id: "hanamomo", name: "はなももカフェ子育て支援センター" },
  { id: "koyo",    name: "あかちゃんの里子育て支援センター" },
  { id: "smile",   name: "スマイル子育て支援センター" },
];

/** スキップ対象 */
const SKIP_RE = /(?:センター|ルーム)?(?:開放|休み|お休み|休館|閉館|祝日)|自由(?:開放|来館)|ひろば開放/;

/**
 * カレンダーHTMLからイベントを抽出
 * <a href=".../{M}m{D}.html">D日 イベント名</a>
 */
function parseCalendarPage(html, year, month) {
  const events = [];
  const nHtml = html.normalize("NFKC");

  const aRe = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = aRe.exec(nHtml)) !== null) {
    const href = m[1];
    // カレンダー日別ページリンクのみ対象
    if (!/\/\d{1,2}m\d{1,2}\.html/.test(href)) continue;

    const text = stripTags(m[2]).normalize("NFKC").trim();
    if (!text) continue;

    // 日付を抽出: "D日 イベント名"
    const dayMatch = text.match(/^(\d{1,2})日\s*/);
    if (!dayMatch) continue;
    const day = Number(dayMatch[1]);
    if (day < 1 || day > 31) continue;

    // 日付以降のテキストをイベント名とする
    const afterDay = text.slice(dayMatch[0].length).trim();
    if (!afterDay) continue;

    // 複数イベントが「、」「,」で区切られている場合分割
    const titles = afterDay.split(/[、,]\s*/).filter(t => t.trim());

    for (const rawTitle of titles) {
      const title = rawTitle.replace(/[（(][^）)]*[）)]/g, "").trim();
      if (!title) continue;
      if (SKIP_RE.test(title)) continue;

      const timeRange = parseTimeRangeFromText(rawTitle);
      events.push({ y: year, mo: month, d: day, title, timeRange });
    }
  }

  return events;
}

/**
 * Factory: 古河市子育て支援センターコレクター
 */
function createCollectKogaKosodateEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = KOGA_IB_SOURCE;
  const srcKey = source.key;
  const label = source.label;

  return async function collectKogaKosodateEvents(maxDays) {
    const byId = new Map();

    // 当月+来月の2ヶ月分
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const months = [];
    for (let offset = 0; offset < 2; offset++) {
      const d = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() + offset, 1));
      months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
    }

    for (const center of CENTERS) {
      // 施設のジオコーディング（施設単位で1回）
      const geoCandidates = [];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(srcKey, center.name);
        if (fmAddr) {
          geoCandidates.push(/[都道府県]/.test(fmAddr) ? fmAddr : `茨城県${fmAddr}`);
        }
      }
      geoCandidates.push(`茨城県${label} ${center.name}`);

      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(source, center.name, point, `${label} ${center.name}`);
      const address = resolveEventAddress(source, center.name, "", point);

      for (const { year, month } of months) {
        const ym = `${year}${String(month).padStart(2, "0")}`;
        const calUrl = `${SITE_BASE}/html/${center.id}/calendar/${ym}/`;
        let html;
        try {
          html = await fetchText(calUrl);
        } catch (e) {
          // 404等は静かにスキップ
          continue;
        }
        if (!html) continue;

        const events = parseCalendarPage(html, year, month);

        for (const ev of events) {
          if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
          const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
          const id = `${srcKey}:${center.id}:${ev.title}:${dateKey}`;
          if (byId.has(id)) continue;

          const { startsAt, endsAt } = buildStartsEndsForDate(
            { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
          );

          byId.set(id, {
            id,
            source: srcKey,
            source_label: label,
            title: `${ev.title}（${center.name}）`,
            starts_at: startsAt,
            ends_at: endsAt,
            venue_name: center.name,
            address: address || "",
            url: calUrl,
            lat: point ? point.lat : source.center.lat,
            lng: point ? point.lng : source.center.lng,
          });
        }
      }
    }

    console.log(`[${label}] ${byId.size} events collected (子育て支援センター)`);
    return Array.from(byId.values());
  };
}

module.exports = { createCollectKogaKosodateEvents };
