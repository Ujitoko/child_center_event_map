/**
 * 川口市 児童センター Google Calendar iCalコレクター
 *
 * 3施設（戸塚児童センターあすぱる・鳩ヶ谷こども館・芝児童センター）の
 * Google Calendar iCal (.ics) フィードからイベントを抽出する。
 *
 * iCal構造:
 * BEGIN:VEVENT
 * DTSTART:20260301T010000Z (UTC)
 * DTEND:20260301T023000Z
 * SUMMARY:イベント名
 * DESCRIPTION:対象：乳幼児と保護者\n申込：...
 * END:VEVENT
 */
const { fetchText } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { KAWAGUCHI_SOURCE } = require("../../config/wards");

const ICAL_BASE = "https://calendar.google.com/calendar/ical";

/** 施設定義 + Google Calendar ID */
const FACILITIES = [
  {
    id: "uspal",
    name: "戸塚児童センターあすぱる",
    calId: "uspalcomaam@gmail.com",
    address: "川口市戸塚南4-10-2",
  },
  {
    id: "kodomokan",
    name: "鳩ヶ谷こども館",
    calId: "hatogayakdomokan@gmail.com",
    address: "川口市鳩ヶ谷本町1-12-19",
  },
  {
    id: "shiba",
    name: "芝児童センター",
    calId: "kawaguchi.shibazi@gmail.com",
    address: "川口市芝下2-16-18",
  },
];

/**
 * iCalテキストからVEVENTブロックをパースして配列に変換
 */
function parseIcalEvents(icsText) {
  const events = [];
  const blocks = icsText.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    if (!block) continue;

    const ev = {};
    // 折り返し行を結合 (RFC 5545: 行頭のスペース/タブは前行の続き)
    const unfolded = block.replace(/\r?\n[ \t]/g, "");
    const lines = unfolded.split(/\r?\n/);

    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx < 0) continue;
      let key = line.slice(0, colonIdx);
      const val = line.slice(colonIdx + 1);
      // パラメータを除去 (e.g., DTSTART;VALUE=DATE:20260301)
      const semiIdx = key.indexOf(";");
      if (semiIdx >= 0) key = key.slice(0, semiIdx);

      switch (key) {
        case "SUMMARY": ev.summary = val.replace(/\\,/g, ",").replace(/\\n/g, " ").trim(); break;
        case "DTSTART": ev.dtstart = val; break;
        case "DTEND": ev.dtend = val; break;
        case "DESCRIPTION": ev.description = val.replace(/\\n/g, "\n").replace(/\\,/g, ",").trim(); break;
      }
    }

    if (ev.summary && ev.dtstart) {
      events.push(ev);
    }
  }
  return events;
}

/**
 * DTSTART文字列 (UTC or DATE) をJST年月日時分に変換
 * 形式: 20260301T010000Z (UTC) or 20260301 (終日)
 */
function parseDtToJst(dt) {
  if (!dt) return null;
  // 終日イベント: 20260301
  const dateOnly = dt.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return {
      y: Number(dateOnly[1]), mo: Number(dateOnly[2]), d: Number(dateOnly[3]),
      h: 0, m: 0, allDay: true,
    };
  }
  // タイムスタンプ: 20260301T010000Z
  const full = dt.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!full) return null;
  const utc = new Date(Date.UTC(
    Number(full[1]), Number(full[2]) - 1, Number(full[3]),
    Number(full[4]), Number(full[5]), Number(full[6])
  ));
  // UTC→JST (+9h)
  const jst = new Date(utc.getTime() + 9 * 60 * 60 * 1000);
  return {
    y: jst.getUTCFullYear(), mo: jst.getUTCMonth() + 1, d: jst.getUTCDate(),
    h: jst.getUTCHours(), m: jst.getUTCMinutes(), allDay: false,
  };
}

/** スキップイベント */
const SKIP_RE = /^(?:休館|休み|閉館|臨時休館|祝日)$/;

/**
 * Factory: 川口市児童センター iCalコレクター
 */
function createCollectKawaguchiJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = KAWAGUCHI_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKawaguchiJidokanEvents(maxDays) {
    const byId = new Map();

    // 3施設のiCalフィードを並列取得
    const results = await Promise.allSettled(
      FACILITIES.map(async (fac) => {
        const url = `${ICAL_BASE}/${encodeURIComponent(fac.calId)}/public/basic.ics`;
        const icsText = await fetchText(url, { timeout: 30000 });
        return { fac, icsText };
      })
    );

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value.icsText) continue;
      const { fac, icsText } = r.value;

      // ジオコーディング (施設単位で1回)
      const geoCandidates = [];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, fac.name);
        if (fmAddr) geoCandidates.push(/埼玉県/.test(fmAddr) ? fmAddr : `埼玉県${fmAddr}`);
      }
      geoCandidates.push(`埼玉県${fac.address}`);
      geoCandidates.push(`埼玉県川口市 ${fac.name}`);

      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(source, fac.name, point, `埼玉県${fac.address}`);
      const address = resolveEventAddress(source, fac.name, `埼玉県${fac.address}`, point);

      // iCalイベントをパース
      const icalEvents = parseIcalEvents(icsText);

      for (const ev of icalEvents) {
        const start = parseDtToJst(ev.dtstart);
        if (!start) continue;
        if (!inRangeJst(start.y, start.mo, start.d, maxDays)) continue;
        const title = ev.summary;
        if (!title || SKIP_RE.test(title)) continue;

        const dateKey = `${start.y}${String(start.mo).padStart(2, "0")}${String(start.d).padStart(2, "0")}`;
        const id = `${srcKey}:${fac.id}:${title}:${dateKey}`;
        if (byId.has(id)) continue;

        // 時間情報
        let timeRange = null;
        if (!start.allDay) {
          const end = parseDtToJst(ev.dtend);
          timeRange = {
            startH: start.h, startM: start.m,
            endH: end ? end.h : start.h + 1,
            endM: end ? end.m : start.m,
          };
        }

        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: start.y, mo: start.mo, d: start.d }, timeRange
        );

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: fac.name,
          address: address || `埼玉県${fac.address}`,
          url: `http://www.comaam.jp/${fac.id === "kodomokan" ? "kodomokan" : fac.id === "uspal" ? "uspal" : "shiba"}/page/event.html`,
          lat: point ? point.lat : source.center.lat,
          lng: point ? point.lng : source.center.lng,
        });
      }
    }

    console.log(`[${label}] ${byId.size} events collected (児童センター iCal)`);
    return Array.from(byId.values());
  };
}

module.exports = { createCollectKawaguchiJidokanEvents };
