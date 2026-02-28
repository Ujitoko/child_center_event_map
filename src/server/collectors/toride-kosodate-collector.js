/**
 * 取手市 子育て支援センター スケジュールページコレクター
 *
 * 4施設（白山・戸頭・藤代・井野なないろ）の静的HTMLスケジュールページから
 * 子育てイベントを抽出する。
 *
 * HTML構造:
 * - <h2>令和8年3月</h2> 月ヘッダー
 * - <ul><li>日付（曜日）イベント名</li></ul>
 * - 「」内がイベント名、なければテキスト全体をタイトル化
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
} = require("../date-utils");
const { TORIDE_SOURCE } = require("../../config/wards");

const BASE = TORIDE_SOURCE.baseUrl;

/** 施設定義 */
const FACILITIES = [
  {
    id: "hakusan",
    name: "白山子育て支援センター",
    path: "/kosodate/kurashi/kosodate/ninshin/ichijihoiku/hakusan.html",
  },
  {
    id: "togashira",
    name: "戸頭子育て支援センター",
    path: "/kosodate/kurashi/kosodate/ninshin/ichijihoiku/togashira.html",
  },
  {
    id: "fujishiro",
    name: "藤代子育て支援センター",
    path: "/kosodate/kurashi/kosodate/ninshin/ichijihoiku/fujishiro.html",
  },
  {
    id: "tobu",
    name: "井野なないろ子育て支援センター",
    path: "/kosodate/kurashi/kosodate/ninshin/ichijihoiku/tobu.html",
  },
];

/** 令和年号→西暦変換 */
function reiwaNenToYear(nen) {
  return 2018 + Number(nen);
}

/** <h2>令和N年M月</h2> から { year, month } を取得 */
function parseReiwaHeader(text) {
  const m = text.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月/);
  if (!m) return null;
  return { year: reiwaNenToYear(m[1]), month: Number(m[2]) };
}

/** スキップ対象の判定（汎用的な時間枠のみ・祝日・休館） */
const SKIP_RE = /休館|休み|祝日|閉館|お休み/;
const GENERIC_SLOT_RE = /^(?:みんなの時間|0歳の時間|1歳の時間|2歳の時間|ひろば開放|自由来館|自由利用|開放日)$/;

/**
 * 1つの施設ページからイベントを抽出
 */
function parseTorideSchedulePage(html) {
  const events = [];
  const nHtml = html.normalize("NFKC");

  // h2ブロックごとに分割して年月を追跡
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h2Positions = [];
  let hm;
  while ((hm = h2Re.exec(nHtml)) !== null) {
    const text = stripTags(hm[1]).trim();
    const ym = parseReiwaHeader(text);
    if (ym) {
      h2Positions.push({ ...ym, endIndex: hm.index + hm[0].length });
    }
  }

  if (h2Positions.length === 0) return events;

  // 各月ブロック内の<li>を処理
  for (let i = 0; i < h2Positions.length; i++) {
    const { year, month, endIndex } = h2Positions[i];
    const nextStart = h2Positions[i + 1] ? h2Positions[i + 1].endIndex - 200 : nHtml.length;
    const section = nHtml.slice(endIndex, nextStart);

    // <li>要素を抽出
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let lm;
    while ((lm = liRe.exec(section)) !== null) {
      const liText = stripTags(lm[1]).normalize("NFKC").trim();
      if (!liText) continue;

      // 祝日・休館スキップ
      if (SKIP_RE.test(liText)) continue;

      // 日付抽出: "3月3日" or "3日"
      const dateMatch = liText.match(/(?:(\d{1,2})月)?(\d{1,2})日/);
      if (!dateMatch) continue;
      const eventMonth = dateMatch[1] ? Number(dateMatch[1]) : month;
      const day = Number(dateMatch[2]);
      if (day < 1 || day > 31) continue;

      // イベント名: 「」内を優先
      let title = "";
      const bracketMatch = liText.match(/「([^」]+)」/);
      if (bracketMatch) {
        title = bracketMatch[1].trim();
      } else {
        // 曜日より後のテキストをタイトルにする
        const afterDow = liText.replace(/.*?日[）\)]\s*/, "").trim();
        // 「（要申込）」等を除去
        title = afterDow.replace(/[（(]要申込[）)]/g, "").trim();
      }

      // 汎用スロットのみの行はスキップ
      if (!title || GENERIC_SLOT_RE.test(title)) continue;

      // 時間情報パース
      const timeRange = parseTimeRangeFromText(liText);

      events.push({ y: year, mo: eventMonth, d: day, title, timeRange });
    }
  }

  return events;
}

/**
 * Factory: 取手市子育て支援センターコレクター
 */
function createCollectTorideKosodateEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = TORIDE_SOURCE;
  const srcKey = source.key;
  const label = source.label;

  return async function collectTorideKosodateEvents(maxDays) {
    const byId = new Map();

    for (const facility of FACILITIES) {
      const pageUrl = `${BASE}${facility.path}`;
      let html;
      try {
        html = await fetchText(pageUrl);
      } catch (e) {
        console.warn(`[${label}] ${facility.name} fetch failed: ${e.message}`);
        continue;
      }
      if (!html) continue;

      const events = parseTorideSchedulePage(html);
      if (events.length === 0) continue;

      // 施設のジオコーディング（施設単位で1回）
      const geoCandidates = [];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(srcKey, facility.name);
        if (fmAddr) {
          geoCandidates.push(/[都道府県]/.test(fmAddr) ? fmAddr : `茨城県${fmAddr}`);
        }
      }
      geoCandidates.push(`茨城県${label} ${facility.name}`);

      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(source, facility.name, point, `${label} ${facility.name}`);
      const address = resolveEventAddress(source, facility.name, "", point);

      for (const ev of events) {
        if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
        const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
        const id = `${srcKey}:${facility.id}:${ev.title}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
        );

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: `${ev.title}（${facility.name}）`,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: facility.name,
          address: address || "",
          url: pageUrl,
          lat: point ? point.lat : source.center.lat,
          lng: point ? point.lng : source.center.lng,
        });
      }
    }

    console.log(`[${label}] ${byId.size} events collected (kosodate centers)`);
    return Array.from(byId.values());
  };
}

module.exports = { createCollectTorideKosodateEvents };
