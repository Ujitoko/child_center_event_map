const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
  parseYmdFromJst,
} = require("../date-utils");
const {
  sanitizeVenueText,
  sanitizeAddressText,
} = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/**
 * list_calendarYYYYMM.html ページからイベントを抽出
 * <table id="calendarlist"> 内の <tr> を解析
 * 対象CMS: 我孫子市, 鎌ケ谷市, 松戸市, 四街道市 等
 */
function parseListCalendarPage(html, baseUrl, pageYear, pageMonth) {
  const events = [];
  const ymMatch = html.match(/(\d{4})年\s*(\d{1,2})月/);
  const y = ymMatch ? Number(ymMatch[1]) : pageYear;
  const mo = ymMatch ? Number(ymMatch[2]) : pageMonth;

  const trParts = html.split(/<tr\b[^>]*>/i);
  for (let i = 1; i < trParts.length; i++) {
    const tr = trParts[i];
    // 日付抽出: id="dayN" パターン or <a id="N"> パターン (八潮市)
    let dayMatch = tr.match(/id="day(\d{1,2})"[^>]*>\s*(\d{1,2})/);
    if (!dayMatch) {
      const altDay = tr.match(/class="calendar_day"[^>]*>\s*(\d{1,2})日/);
      if (altDay) dayMatch = [null, altDay[1]];
    }
    if (!dayMatch) continue;
    const d = Number(dayMatch[1]);
    if (!/<a\s+href=/i.test(tr)) continue;

    // <p><img alt="category"><span?><a href>title</a></span?></p> パターン
    const pRe = /<p>\s*(?:<img[^>]*alt="([^"]*)"[^>]*>\s*)?(?:<span>)?\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let pm;
    while ((pm = pRe.exec(tr)) !== null) {
      const category = (pm[1] || "").trim();
      const href = pm[2].replace(/&amp;/g, "&").trim();
      const title = stripTags(pm[3]).trim();
      if (!href || !title) continue;
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;

      const isChildCategory = /子ども|子育て|教育|キッズ/.test(category);
      const isChildTitle = WARD_CHILD_HINT_RE.test(title);
      if (!isChildCategory && !isChildTitle) continue;

      events.push({ title, url: absUrl, y, mo, d });
    }
  }
  return events;
}

function detectPrefecture(source) {
  if (/chiba\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "千葉県";
  if (/tokyo\.jp/.test(source.baseUrl || "")) return "東京都";
  if (/saitama\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "埼玉県";
  if (/gunma\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "群馬県";
  if (/tochigi\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "栃木県";
  if (/yashio|fujimi|sayama|tokorozawa|kumagaya/.test(source.key || "")) return "埼玉県";
  if (/katori|abiko|kamagaya/.test(source.key || "")) return "千葉県";
  return "神奈川県";
}

function buildGeoCandidates(venue, address, source) {
  const candidates = [];
  const pref = detectPrefecture(source);
  const city = source.label;
  if (address) {
    const full = address.includes(city) ? address : `${city}${address}`;
    candidates.push(`${pref}${full}`);
  }
  if (venue) {
    candidates.push(`${pref}${city} ${venue}`);
  }
  return [...new Set(candidates)];
}

/**
 * リストカレンダー型コレクターファクトリー
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {string} config.calendarPath - カレンダーパス (e.g. "/event/event/calendar/")
 * @param {string} [config.fallbackPath] - フォールバック全カテゴリパス
 * @param {boolean} [config.useQueryParam=false] - ?ym=YYYYMM形式を使用
 * @param {Object} deps
 */
function createListCalendarCollector(config, deps) {
  const { source, calendarPath, fallbackPath, useQueryParam = false } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectListCalendarEvents(maxDays) {
    const months = getMonthsForRange(maxDays);

    function buildCalUrl(basePath, ymParam) {
      if (useQueryParam) return `${source.baseUrl}${basePath}list_calendar.html?ym=${ymParam}`;
      return `${source.baseUrl}${basePath}list_calendar${ymParam}.html`;
    }

    // 当月判定: list_calendarYYYYMM.html が存在しない場合に list_calendar.html (bare) をフォールバック
    const now = parseYmdFromJst(new Date());
    const currentYm = `${now.y}${String(now.m).padStart(2, "0")}`;

    async function fetchCalPage(basePath, ym) {
      const ymParam = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      const url = buildCalUrl(basePath, ymParam);
      try {
        return await fetchText(url);
      } catch (e) {
        // 当月の場合 bare URL にフォールバック (CMSによってはYYYYMM付きが当月は404になる)
        if (!useQueryParam && ymParam === currentYm) {
          const bareUrl = `${source.baseUrl}${basePath}list_calendar.html`;
          return await fetchText(bareUrl);
        }
        throw e;
      }
    }

    const rawEvents = [];
    for (const ym of months) {
      try {
        const html = await fetchCalPage(calendarPath, ym);
        const pageEvents = parseListCalendarPage(html, source.baseUrl, ym.year, ym.month);
        rawEvents.push(...pageEvents);
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // フォールバック: 全カテゴリカレンダー
    if (rawEvents.length === 0 && fallbackPath) {
      for (const ym of months) {
        try {
          const html = await fetchCalPage(fallbackPath, ym);
          const pageEvents = parseListCalendarPage(html, source.baseUrl, ym.year, ym.month);
          rawEvents.push(...pageEvents);
        } catch (e) {
          console.warn(`[${label}] fallback ${ym.year}/${ym.month} failed:`, e.message || e);
        }
      }
    }

    // 重複除去
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 80);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          let venue = "";
          let address = "";
          const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
          let mm;
          while ((mm = metaRe.exec(html)) !== null) {
            const k = stripTags(mm[1]);
            const v = stripTags(mm[2]);
            if (!k || !v) continue;
            if (!venue && /(会場|開催場所|実施場所|場所|ところ)/.test(k)) venue = v;
            if (!address && /(住所|所在地)/.test(k)) address = v;
          }
          if (!venue || !address) {
            const trRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
            while ((mm = trRe.exec(html)) !== null) {
              const k = stripTags(mm[1]);
              const v = stripTags(mm[2]);
              if (!k || !v) continue;
              if (!venue && /(会場|開催場所|実施場所|場所|ところ)/.test(k)) venue = v;
              if (!address && /(住所|所在地)/.test(k)) address = v;
            }
          }
          // h2/h3/h4 見出しパターン: 「場所」「会場」「ところ」の直後テキスト (八潮市、富士見市、狭山市等)
          if (!venue) {
            const headingRe = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
            let hm;
            while ((hm = headingRe.exec(html)) !== null) {
              const heading = stripTags(hm[1]).trim();
              if (/(場所|会場|開催場所|ところ)/.test(heading)) {
                const afterHeading = html.slice(hm.index + hm[0].length, hm.index + hm[0].length + 500);
                const blockMatch = afterHeading.match(/<(?:p|div)[^>]*>([\s\S]*?)<\/(?:p|div)>/i);
                const nextText = blockMatch
                  ? stripTags(blockMatch[1]).trim()
                  : stripTags(afterHeading).trim().split(/\n/)[0].trim();
                if (nextText && nextText.length >= 2 && nextText.length <= 60) {
                  venue = nextText;
                  break;
                }
              }
            }
          }
          // テキストベースのフォールバック: 「場所：○○」「会場：○○」パターン
          if (!venue) {
            const plainText = stripTags(html);
            const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim();
              v = v.replace(/\s*(?:住所|駐車|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考).*$/, "").trim();
              if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) venue = v;
            }
          }
          const timeRange = parseTimeRangeFromText(stripTags(html));
          return { url, venue, address, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const pref = detectPrefecture(source);
    const byId = new Map();
    for (const ev of uniqueEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      let geoCandidates = buildGeoCandidates(venue, rawAddress, source);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const full = new RegExp(pref).test(fmAddr) ? fmAddr : `${pref}${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const id = `${srcKey}:${ev.url}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: address || "",
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createListCalendarCollector };
