const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

/**
 * 羽生市 子育て支援センター「ぷちToNe」 WordPress REST API からイベントを抽出
 *
 * APIエンドポイント:
 * GET https://tonenokai.com/wp-json/my-calendar/v1/events?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * レスポンス: 日付キーのオブジェクト
 * { "2026-02-02": [{ event_title, event_begin, event_desc, event_time, event_endtime, ... }] }
 */
function parseApiEvents(data) {
  const events = [];

  for (const [dateStr, dayEvents] of Object.entries(data)) {
    if (!Array.isArray(dayEvents)) continue;
    const [yStr, mStr, dStr] = dateStr.split("-");
    const y = Number(yStr);
    const mo = Number(mStr);
    const d = Number(dStr);
    if (!y || !mo || !d) continue;

    for (const ev of dayEvents) {
      const title = ev.event_title || "";
      if (!title) continue;

      // 時刻の抽出
      let timeRange = null;

      // event_time / event_endtime から取得
      if (ev.event_time && ev.event_time !== "00:00:00") {
        const [sh, sm] = ev.event_time.split(":").map(Number);
        let eh = null, em = null;
        if (ev.event_endtime && ev.event_endtime !== "23:59:59") {
          [eh, em] = ev.event_endtime.split(":").map(Number);
        }
        timeRange = { startHour: sh, startMin: sm, endHour: eh, endMin: em };
      }

      // event_desc (HTML) から時刻を抽出（フォールバック）
      if (!timeRange && ev.event_desc) {
        const desc = stripTags(ev.event_desc)
          .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));
        const tm = desc.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
        if (tm) {
          timeRange = {
            startHour: Number(tm[1]), startMin: Number(tm[2]),
            endHour: Number(tm[3]), endMin: Number(tm[4]),
          };
        }
      }

      events.push({ y, mo, d, title, timeRange });
    }
  }

  return events;
}

function createCollectHanyuEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectHanyuEvents(maxDays) {
    const source = deps.source || {
      key: "hanyu", label: "羽生市",
      baseUrl: "https://www.city.hanyu.lg.jp",
      center: { lat: 36.1717, lng: 139.5483 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;

    // 日付範囲を計算
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const end = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
    const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

    const apiUrl = `https://tonenokai.com/wp-json/my-calendar/v1/events?from=${from}&to=${to}`;
    let json;
    try {
      const text = await fetchText(apiUrl);
      json = JSON.parse(text);
    } catch (e) {
      console.warn(`[${label}] API fetch failed:`, e.message || e);
      return [];
    }

    const allEvents = parseApiEvents(json);

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

    const defaultVenue = "ぷちToNe（とねの会こども園）";
    const defaultAddress = "羽生市大字上川俣87";

    const byId = new Map();
    for (const ev of uniqueEvents) {
      let geoCandidates = [`埼玉県${defaultAddress}`, `埼玉県羽生市 ${defaultVenue}`];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, defaultVenue);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, defaultVenue, point, `${label} ${defaultVenue}`);
      const address = resolveEventAddress(source, defaultVenue, defaultAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:api:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: defaultVenue, address: address || "",
        url: "https://tonenokai.com/pre/",
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from API)`);
    return results;
  };
}

module.exports = { createCollectHanyuEvents };
