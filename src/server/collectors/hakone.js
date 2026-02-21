/**
 * 箱根町イベントコレクター
 * CMS形式: /www/genre/1001200000001/YYYYMM.html
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseYmdFromJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const CHILD_RE = /子育て|子ども|子供|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|健診|マタニティ|ママ|パパ|おはなし会|家庭の日|読み聞かせ|絵本/;
const CALENDAR_GENRE = "1001200000001";

function createCollectHakoneEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  async function collectHakoneEvents(maxDays) {
    const source = { key: "hakone", label: "箱根町", baseUrl: "https://www.town.hakone.kanagawa.jp", center: { lat: 35.2326, lng: 139.1069 } };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const ym of months) {
      const ymStr = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      const url = `${source.baseUrl}/www/genre/${CALENDAR_GENRE}/${ymStr}.html`;
      try {
        const html = await fetchText(url);
        // カレンダーセル内のイベントリンクを抽出
        // パターン: <a href="/www/contents/XXXXX/index.html">タイトル</a>
        const linkRe = /<a\s+href="(\/www\/contents\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = linkRe.exec(html)) !== null) {
          const eventUrl = source.baseUrl + m[1];
          const title = stripTags(m[2]).trim();
          if (!title) continue;
          if (!CHILD_RE.test(title) && !WARD_CHILD_HINT_RE.test(title)) continue;
          rawEvents.push({ title, url: eventUrl, year: ym.year, month: ym.month });
        }
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 重複除去
    const seen = new Set();
    const unique = [];
    for (const ev of rawEvents) {
      const key = `${ev.url}:${ev.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(ev);
    }

    const results = [];
    for (const ev of unique) {
      // 詳細ページからイベント日時を取得
      let detailHtml = "";
      try {
        detailHtml = await fetchText(ev.url);
      } catch (e) {
        continue;
      }

      // 日付抽出
      const dateMatches = detailHtml.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g) || [];
      const dates = [];
      for (const dm of dateMatches) {
        const dp = dm.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
        if (dp) dates.push({ y: Number(dp[1]), mo: Number(dp[2]), d: Number(dp[3]) });
      }
      if (dates.length === 0) {
        // フォールバック: 月の1日として登録
        dates.push({ y: ev.year, mo: ev.month, d: 1 });
      }

      const timeRange = parseTimeRangeFromText(stripTags(detailHtml).slice(0, 2000));
      const venueMatch = stripTags(detailHtml).match(/(?:場所|会場|ところ)[：:\s]*([^\n]{2,40})/);
      const venueName = venueMatch ? sanitizeVenueText(venueMatch[1]) : "";
      const addrMatch = stripTags(detailHtml).match(/神奈川県[^\n]{5,50}/);
      let rawAddr = addrMatch ? sanitizeAddressText(addrMatch[0]) : "";
      if (!rawAddr && venueName && getFacilityAddressFromMaster) {
        rawAddr = getFacilityAddressFromMaster(source.key, venueName);
      }

      const geoCands = [];
      if (rawAddr) geoCands.push(rawAddr);
      if (venueName) geoCands.push(`神奈川県足柄下郡箱根町${venueName}`);
      geoCands.push("神奈川県足柄下郡箱根町湯本256");

      let point = await geocodeForWard(geoCands, source);
      point = resolveEventPoint(source, venueName, point, rawAddr);
      const address = resolveEventAddress(source, venueName, rawAddr, point);

      for (const d of dates) {
        if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
        const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange, 10);
        const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
        results.push({
          id: `ward:hakone:${ev.url}:${dateKey}`,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          updated_at: startsAt,
          venue_name: venueName,
          address,
          url: ev.url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
        });
      }
    }

    return results;
  }

  return collectHakoneEvents;
}

module.exports = { createCollectHakoneEvents };
