const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

/**
 * 美里町 子育て関連PDFとHTMLページからイベントを抽出
 *
 * データソース:
 * 1. ことばの相談予定表 (PDF) - 年間日程
 * 2. カンガルー・かるがも教室予定表 (PDF) - 年間日程
 * 3. 健幸スマイルスタジオ (HTML) - 年間日程
 */

// "M月 D日 （曜）" or "M / D （曜）" パターンで日付を抽出
function extractDatesFromText(text, fiscalYear) {
  const dates = [];
  // 令和8年 の切替検出
  let currentYear = fiscalYear;
  const lines = text.split(/\n/);

  for (const line of lines) {
    // 年の切替 "令和N年" or "令和８年"
    const yearSwitch = line.match(/令和\s*([０-９\d]+)\s*年/);
    if (yearSwitch) {
      const n = yearSwitch[1].replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));
      currentYear = 2018 + Number(n);
    }

    // 全角数字を半角に
    const normalized = line.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));

    // "M月 D日 （曜）" or "M / D （曜）"
    const dateRe = /(\d{1,2})\s*[月\/]\s*(\d{1,2})\s*日?\s*[（(]\s*([月火水木金土日])\s*[）)]/g;
    let dm;
    while ((dm = dateRe.exec(normalized)) !== null) {
      const mo = Number(dm[1]);
      const d = Number(dm[2]);
      // 年度判定: 4月以降はfiscalYear、1-3月はfiscalYear+1
      const y = mo >= 4 ? fiscalYear : fiscalYear + 1;
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        dates.push({ y, mo, d });
      }
    }
  }

  return dates;
}

function createCollectMisatoSaitamaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectMisatoSaitamaEvents(maxDays) {
    const source = deps.source || {
      key: "misato_saitama", label: "美里町",
      baseUrl: "https://www.town.saitama-misato.lg.jp",
      center: { lat: 36.1267, lng: 139.2000 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    const allEvents = [];

    // 現在の年度を判定 (4月始まり)
    const now = new Date();
    const jstMonth = now.getMonth() + 1; // 1-12
    const jstYear = now.getFullYear();
    const fiscalYear = jstMonth >= 4 ? jstYear : jstYear - 1;

    // 1. ことばの相談 PDF
    try {
      const kotobaUrl = `${baseUrl}/cmsfiles/contents/0000000/978/kotoba.pdf`;
      const markdown = await fetchChiyodaPdfMarkdown(kotobaUrl);
      if (markdown && markdown.length > 50) {
        const dates = extractDatesFromText(markdown, fiscalYear);
        for (const { y, mo, d } of dates) {
          allEvents.push({
            y, mo, d, title: "ことばの相談",
            timeRange: { startHour: 9, startMin: 30, endHour: 14, endMin: 10 },
            venue: "保健センター",
          });
        }
      }
    } catch (e) {
      console.warn(`[${label}] kotoba PDF failed:`, e.message || e);
    }

    // 2. カンガルー・かるがも教室 PDF
    try {
      const kangaruUrl = `${baseUrl}/cmsfiles/contents/0000000/978/kangaru-karugamo.pdf`;
      const markdown = await fetchChiyodaPdfMarkdown(kangaruUrl);
      if (markdown && markdown.length > 50) {
        // カンガルー教室とかるがも教室を分離
        const parts = markdown.split(/かるがも教室/i);
        if (parts.length >= 2) {
          // カンガルー教室
          const kangaruDates = extractDatesFromText(parts[0], fiscalYear);
          for (const { y, mo, d } of kangaruDates) {
            allEvents.push({
              y, mo, d, title: "カンガルー教室",
              timeRange: { startHour: 9, startMin: 50, endHour: 11, endMin: 0 },
              venue: "保健センター",
            });
          }
          // かるがも教室
          const karugamoDates = extractDatesFromText(parts.slice(1).join(""), fiscalYear);
          for (const { y, mo, d } of karugamoDates) {
            allEvents.push({
              y, mo, d, title: "かるがも教室",
              timeRange: { startHour: 9, startMin: 50, endHour: 11, endMin: 0 },
              venue: "保健センター",
            });
          }
        } else {
          // 分離できない場合は全体をカンガルー・かるがも教室として
          const dates = extractDatesFromText(markdown, fiscalYear);
          for (const { y, mo, d } of dates) {
            allEvents.push({
              y, mo, d, title: "カンガルー・かるがも教室",
              timeRange: { startHour: 9, startMin: 50, endHour: 11, endMin: 0 },
              venue: "保健センター",
            });
          }
        }
      }
    } catch (e) {
      console.warn(`[${label}] kangaru PDF failed:`, e.message || e);
    }

    // 3. 健幸スマイルスタジオ (HTML)
    try {
      const smileUrl = `${baseUrl}/0000001856.html`;
      const html = await fetchText(smileUrl);
      // 全角数字を半角に
      const normalized = html.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));
      // 日程を抽出: "R7/M/D(曜)" or "M月D日" or "M/D(曜)"
      const dateRe = /(\d{1,2})\s*[\/月]\s*(\d{1,2})\s*日?\s*[（(]\s*([月火水木金土日])\s*[）)]/g;
      let dm;
      while ((dm = dateRe.exec(normalized)) !== null) {
        const mo = Number(dm[1]);
        const d = Number(dm[2]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          const y = mo >= 4 ? fiscalYear : fiscalYear + 1;
          allEvents.push({
            y, mo, d, title: "健幸スマイルスタジオ",
            timeRange: { startHour: 10, startMin: 0, endHour: 11, endMin: 30 },
            venue: "保健センター",
          });
        }
      }
    } catch (e) {
      console.warn(`[${label}] smile HTML failed:`, e.message || e);
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    const defaultVenue = "美里町保健センター";
    const defaultAddress = "美里町大字木部538-5";

    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = ev.venue === "保健センター" ? defaultVenue : ev.venue;

      let geoCandidates = [`埼玉県児玉郡${defaultAddress}`, `埼玉県児玉郡美里町 ${venueName}`];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `${label} ${venueName}`);
      const address = resolveEventAddress(source, venueName, defaultAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: `${baseUrl}/0000000978.html`,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (PDF+HTML)`);
    return results;
  };
}

module.exports = { createCollectMisatoSaitamaEvents };
