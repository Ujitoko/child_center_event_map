/**
 * 相模原市 子育て広場イベントカレンダー PDFコレクター
 *
 * 3区(緑区/中央区/南区)の月次PDFを解析してイベントを抽出。
 * URL: /_res/projects/default_project/_page_/001/026/974/{YYYY}/{MM}/{ward}.pdf
 * 当月+前月のみ存在（それ以前は404）。
 */
const { fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  getMonthsForRange,
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { SAGAMIHARA_SOURCE } = require("../../config/wards");

const BASE_PDF_URL =
  "https://www.city.sagamihara.kanagawa.jp/_res/projects/default_project/_page_/001/026/974";

const WARDS = [
  { slug: "midori", name: "緑区" },
  { slug: "chuou", name: "中央区" },
  { slug: "minami", name: "南区" },
];

const SOURCE_PAGE_URL =
  "https://www.city.sagamihara.kanagawa.jp/kosodate/1026602/kosodate/1026604/1018528/1026974.html";

/**
 * PDF markdown テキストからイベントを抽出
 *
 * 各イベントのパターン:
 *   3/2 月 相模湖こども園 042-684-3025 緑区 与瀬 10:00 〜 10:45 要予約 駐車場有 イベント名...
 *
 * 正規表現で日付行ごとに分割し、各フィールドを抽出する。
 */
function parseSagamiharaKosodatePdf(text, defaultYear, wardName) {
  const events = [];

  // ページヘッダーやフッター等のノイズを除去
  const cleaned = text
    .replace(/\d+\s*\/\s*\d+\s*ページ/g, "")
    .replace(/日・曜日\s+主催施設\s+TEL[^\n]*/g, "")
    .replace(/※[^\n]*/g, "")
    .replace(/^#+\s*[^\n]*$/gm, "");

  // 各イベントエントリを分割: "M/D 曜" パターンで開始
  const entryRe =
    /(\d{1,2})\/(\d{1,2})\s+[月火水木金土日]\s+([\s\S]*?)(?=\d{1,2}\/\d{1,2}\s+[月火水木金土日]\s|$)/g;
  let m;
  while ((m = entryRe.exec(cleaned)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    const body = m[3].trim();
    if (!body) continue;

    // 施設名 + TEL + 所在地 + 時間 + 予約情報 + イベント内容
    // パターン: "施設名 TEL 区名 地名 HH:MM 〜 HH:MM 予約/駐車場 タイトル..."
    const fieldRe =
      /^(.+?)\s+([\d-]{10,14})\s+(\S+区)\s+(\S+)\s+(\d{1,2}:\d{2})\s*[〜～~]\s*(\d{1,2}:\d{2})?\s*(要予約|予約不要)?\s*(駐車場[有無])?\s*([\s\S]*)$/;
    const fm = body.match(fieldRe);

    let facility, tel, area, neighborhood, startTime, endTime, title;
    if (fm) {
      facility = fm[1].trim();
      tel = fm[2];
      area = fm[3];
      neighborhood = fm[4];
      startTime = fm[5];
      endTime = fm[6] || "";
      title = fm[9].trim();
    } else {
      // フォールバック: 時間を直接探す
      const timeM = body.match(/(\d{1,2}:\d{2})\s*[〜～~]\s*(\d{1,2}:\d{2})?/);
      startTime = timeM ? timeM[1] : "";
      endTime = timeM ? timeM[2] || "" : "";

      // 施設名: TELの前のテキスト
      const telM = body.match(/^(.+?)\s+[\d-]{10,14}/);
      facility = telM ? telM[1].trim() : "";

      // 区 + 地名
      const areaM = body.match(/(緑区|中央区|南区)\s+(\S+)/);
      area = areaM ? areaM[1] : wardName;
      neighborhood = areaM ? areaM[2] : "";

      // タイトル: 時間+予約情報の後のテキスト
      const afterTime = body.replace(
        /^[\s\S]*?\d{1,2}:\d{2}\s*[〜～~]\s*\d{0,2}:?\d{0,2}\s*(要予約|予約不要)?\s*(駐車場[有無])?\s*/,
        ""
      );
      title = afterTime.trim() || facility;
    }

    if (!title || title.length < 3) title = facility || "子育て広場イベント";

    // タイトルの最初の文（改行/句点まで）を使用
    const firstLine = title.split(/[\n。]/)[0].trim();
    const displayTitle =
      firstLine.length > 60 ? firstLine.slice(0, 60) + "…" : firstLine;

    // 時間パース
    let timeRange = null;
    if (startTime) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime
        ? endTime.split(":").map(Number)
        : [sh + 1, sm];
      timeRange = {
        startHour: sh,
        startMinute: sm,
        endHour: eh,
        endMinute: em,
      };
    }

    events.push({
      y: defaultYear,
      mo,
      d,
      title: displayTitle,
      facility: facility || "",
      area: area || wardName,
      neighborhood: neighborhood || "",
      timeRange,
    });
  }
  return events;
}

function createCollectSagamiharaKosodateEvents(deps) {
  const {
    geocodeForWard,
    resolveEventPoint,
    resolveEventAddress,
    getFacilityAddressFromMaster,
  } = deps;
  const source = SAGAMIHARA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectSagamiharaKosodateEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const ward of WARDS) {
      for (const { year, month } of months) {
        const mm = String(month).padStart(2, "0");
        const pdfUrl = `${BASE_PDF_URL}/${year}/${mm}/${ward.slug}.pdf`;
        try {
          const text = await fetchChiyodaPdfMarkdown(pdfUrl);
          if (!text || text.length < 100) continue;
          const evts = parseSagamiharaKosodatePdf(text, year, ward.name);
          rawEvents.push(...evts);
        } catch (e) {
          // 当月+前月以外は404になるので警告のみ
          if (!/404|Not Found/i.test(String(e.message || e))) {
            console.warn(
              `[${label}/子育て広場${ward.name}] ${year}/${mm} failed:`,
              e.message || e
            );
          }
        }
      }
    }

    // 重複除去
    const byId = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;

      const venueName = ev.facility || `相模原市${ev.area}`;
      const candidates = [];
      if (getFacilityAddressFromMaster && ev.facility) {
        const fmAddr = getFacilityAddressFromMaster(source.key, ev.facility);
        if (fmAddr)
          candidates.push(
            /神奈川県/.test(fmAddr)
              ? fmAddr
              : `神奈川県相模原市${fmAddr}`
          );
      }
      if (ev.neighborhood) {
        candidates.push(
          `神奈川県相模原市${ev.area}${ev.neighborhood}`
        );
      }
      candidates.push(`神奈川県相模原市${ev.area} ${venueName}`);

      let point = await geocodeForWard(candidates.slice(0, 5), source);
      point = resolveEventPoint(
        source,
        venueName,
        point,
        `相模原市${ev.area} ${venueName}`
      );
      const address = resolveEventAddress(
        source,
        venueName,
        `相模原市${ev.area} ${ev.neighborhood || ""}`.trim(),
        point
      );

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );
      const id = `${srcKey}:kosodate_hiroba:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venueName,
        address: address || "",
        url: SOURCE_PAGE_URL,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}/子育て広場] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectSagamiharaKosodateEvents };
