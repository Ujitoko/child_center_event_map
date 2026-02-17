const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

/**
 * 鳩山町 イベントカレンダーからイベントを抽出
 *
 * 一覧HTML構造:
 * <dl><dt>D日(曜日)</dt><dd>
 *   <ul><li class="list_default">
 *     <a href="cal.php?mode=detail&...&day=D#evN">タイトル</a> 【カテゴリ】
 *   </li></ul>
 * </dd></dl>
 *
 * 詳細HTML構造:
 * <h1 id="evN"><span class="innerTitle">タイトル</span></h1>
 * <h3>日時</h3><p>令和N年M月D日（曜日）</p><p>午前N時から</p>
 * <h3>会場</h3><p>会場名</p>
 */
function parseCalendarListHtml(html, year, month) {
  const events = [];

  // <dl>ごとに日付とイベントを抽出
  const dlRe = /<dl[^>]*>\s*<dt>(\d{1,2})日[^<]*<\/dt>\s*<dd>([\s\S]*?)<\/dd>\s*<\/dl>/g;
  let dlm;
  while ((dlm = dlRe.exec(html)) !== null) {
    const day = Number(dlm[1]);
    const ddContent = dlm[2];

    // <li>内のリンクを抽出
    const liRe = /<li[^>]*>\s*<a\s+href="([^"]*)"[^>]*>([^<]+)<\/a>\s*(?:&nbsp;)?\s*(?:【([^】]*)】)?/g;
    let lim;
    while ((lim = liRe.exec(ddContent)) !== null) {
      const detailUrl = lim[1].replace(/&amp;/g, "&");
      const title = lim[2].trim();
      const category = (lim[3] || "").trim();

      // 子育てイベントのみ
      if (!category.includes("子育て")) continue;

      events.push({ y: year, mo: month, d: day, title, detailUrl });
    }
  }
  return events;
}

/**
 * 詳細ページから時刻と会場を抽出
 */
function parseDetailInfo(html, evId) {
  let time = null;
  let venue = null;

  // evIdのセクションを探す
  const evStart = html.indexOf(`id="${evId}"`);
  const nextEvIdx = html.indexOf('class="newsTitle"', evStart + 10);
  const section = nextEvIdx >= 0
    ? html.substring(evStart, nextEvIdx)
    : html.substring(evStart, evStart + 3000);

  // 会場
  const venueMatch = section.match(/<h3>\s*会場\s*<\/h3>\s*<p>([^<]+)<\/p>/);
  if (venueMatch) {
    venue = stripTags(venueMatch[1]).trim();
  }

  // 時刻: "午前N時M分から午後N時M分" or "午前N時から"
  const timeSection = section.match(/<h3>\s*日時\s*<\/h3>([\s\S]*?)(?:<h3>|<\/div>)/);
  if (timeSection) {
    const timeText = stripTags(timeSection[1]);
    // "午前10時00分から11時30分" or "午前10時から"
    const fullTime = timeText.match(/(午前|午後)\s*(\d{1,2})\s*時\s*(\d{1,2})?\s*分?\s*(?:から|～)\s*(?:(午前|午後)\s*)?(\d{1,2})\s*時\s*(\d{1,2})?\s*分?/);
    if (fullTime) {
      let startH = Number(fullTime[2]);
      if (fullTime[1] === "午後" && startH < 12) startH += 12;
      const startM = fullTime[3] ? Number(fullTime[3]) : 0;
      let endH = Number(fullTime[5]);
      const endAmpm = fullTime[4] || fullTime[1];
      if (endAmpm === "午後" && endH < 12) endH += 12;
      const endM = fullTime[6] ? Number(fullTime[6]) : 0;
      time = { startHour: startH, startMin: startM, endHour: endH, endMin: endM };
    } else {
      // 開始時刻のみ
      const startOnly = timeText.match(/(午前|午後)\s*(\d{1,2})\s*時\s*(\d{1,2})?\s*分?\s*から/);
      if (startOnly) {
        let startH = Number(startOnly[2]);
        if (startOnly[1] === "午後" && startH < 12) startH += 12;
        const startM = startOnly[3] ? Number(startOnly[3]) : 0;
        time = { startHour: startH, startMin: startM, endHour: null, endMin: null };
      }
    }
  }

  return { time, venue };
}

function createCollectHatoyamaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectHatoyamaEvents(maxDays) {
    const source = deps.source || {
      key: "hatoyama", label: "鳩山町",
      baseUrl: "https://www.town.hatoyama.saitama.jp",
      center: { lat: 35.9500, lng: 139.3350 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    const now = new Date();
    const allEvents = [];

    // 当月と来月の2ヶ月分
    for (let offset = 0; offset < 2; offset++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + offset);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      const calUrl = `${baseUrl}/cal.php?category=0&year=${year}&month=${month}`;
      try {
        const html = await fetchText(calUrl);
        if (!html || html.length < 100) continue;
        const events = parseCalendarListHtml(html, year, month);
        allEvents.push(...events);
      } catch (e) {
        console.warn(`[${label}] calendar fetch failed (${year}/${month}):`, e.message || e);
      }
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

    // 詳細ページを日ごとにまとめて取得
    const detailsByDay = new Map();
    for (const ev of uniqueEvents) {
      if (!detailsByDay.has(ev.dateKey)) {
        detailsByDay.set(ev.dateKey, ev);
      }
    }

    // 詳細ページから時刻と会場を取得（同じ日は1回のフェッチ）
    const detailCache = new Map();
    for (const ev of uniqueEvents) {
      const dayKey = `${ev.y}-${ev.mo}-${ev.d}`;
      if (!detailCache.has(dayKey)) {
        const detUrl = `${baseUrl}/cal.php?mode=detail&lc=0&category=0&year=${ev.y}&month=${ev.mo}&day=${ev.d}`;
        try {
          const detHtml = await fetchText(detUrl);
          detailCache.set(dayKey, detHtml);
        } catch (e) {
          detailCache.set(dayKey, "");
        }
      }
    }

    const byId = new Map();
    for (const ev of uniqueEvents) {
      const dayKey = `${ev.y}-${ev.mo}-${ev.d}`;
      const detHtml = detailCache.get(dayKey) || "";

      // 詳細から時間と会場を抽出
      let timeRange = null;
      let venueName = null;
      if (detHtml && ev.detailUrl) {
        const evIdMatch = ev.detailUrl.match(/#(ev\d+)/);
        if (evIdMatch) {
          const info = parseDetailInfo(detHtml, evIdMatch[1]);
          timeRange = info.time;
          venueName = info.venue;
        }
      }
      if (!venueName) venueName = "鳩山町子育て支援施設";

      let geoCandidates = [`埼玉県比企郡鳩山町 ${venueName}`, `埼玉県鳩山町 ${venueName}`];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `${label} ${venueName}`);
      const address = resolveEventAddress(source, venueName, null, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, timeRange
      );
      const id = `${srcKey}:cal:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: `${baseUrl}/cal.php?mode=detail&lc=0&category=0&year=${ev.y}&month=${ev.mo}&day=${ev.d}`,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (calendar)`);
    return results;
  };
}

module.exports = { createCollectHatoyamaEvents };
