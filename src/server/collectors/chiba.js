const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  getMonthsForRange,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { WARD_CHILD_HINT_RE, CHIBA_CITY_SOURCE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/**
 * CGI カレンダー一覧ページをパース
 * event_cal/calendar.cgi?type=2 のリスト表示形式
 */
function parseListPage(html, baseUrl) {
  const events = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html)) !== null) {
    const row = rm[1];
    const dateMatch = row.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) continue;
    const y = Number(dateMatch[1]);
    const mo = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);
    // 各 <li> からリンクを抽出
    const liRe = /<li>([\s\S]*?)<\/li>/gi;
    let lim;
    while ((lim = liRe.exec(row)) !== null) {
      const li = lim[1];
      const linkMatch = li.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (!linkMatch) continue;
      const href = linkMatch[1].replace(/&amp;/g, "&").trim();
      let title = stripTags(linkMatch[2]).trim();
      if (!href || !title) continue;
      // 子育てフィルタ: タイトルキーワード
      if (!WARD_CHILD_HINT_RE.test(title)) continue;
      title = title.replace(/\s*事前申込(あり|なし).*$/, "").trim();
      title = title.replace(/\s*【締切】.*$/, "").trim();
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
      events.push({ y, mo, d, title, url: absUrl });
    }
  }
  return events;
}

function createCollectChibaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = CHIBA_CITY_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectChibaEvents(maxDays) {
    const months = getMonthsForRange(maxDays);

    // 一覧ページ取得
    const rawEvents = [];
    for (const ym of months) {
      const url = `${source.baseUrl}/cgi-bin/event_cal/calendar.cgi?type=2&year=${ym.year}&mon=${ym.month}`;
      try {
        const html = await fetchText(url);
        rawEvents.push(...parseListPage(html, source.baseUrl));
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseDetailMeta(html);
          const plainText = stripTags(html);
          const timeRange = parseTimeRangeFromText(plainText);
          if (!meta.venue) {
            const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim();
              v = v.replace(/\s*(?:住所|郵便番号|駐車|大きな地図|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考|注意|詳細).*$/, "").trim();
              if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) meta.venue = v;
            }
          }
          return { url, meta, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.url, r.value);
        }
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const detail = detailMap.get(ev.url);
      let venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      venue = venue.replace(/\s*\d*階.*$/, "").trim();
      let rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      rawAddress = rawAddress.replace(/[（(][^）)]*(?:駅|バス停|徒歩)[^）)]*[）)]/g, "").trim();
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      const candidates = [];
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
          candidates.push(full);
        }
      }
      if (rawAddress) {
        const full = rawAddress.includes(label) ? rawAddress : `${label}${rawAddress}`;
        candidates.push(`千葉県${full}`);
      }
      if (venue) {
        candidates.push(`千葉県${label} ${venue}`);
      }
      let point = await geocodeForWard(candidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const dateKeyStr = ev.dateKey.replace(/-/g, "");
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKeyStr}`;
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
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

/**
 * 千葉市6区保健福祉センター行事ページからイベントを収集
 * 各区ページに子育て関連イベント(健診,教室,相談等)が掲載されている
 */
const CHIBA_WARD_PAGES = [
  {
    ward: "中央区", venue: "中央保健福祉センター",
    url: "https://www.city.chiba.jp/chuo/hokenfukushi/kenko/gyouji.html",
    address: "千葉市中央区中央4-5-1",
  },
  {
    ward: "花見川区", venue: "花見川保健福祉センター",
    url: "https://www.city.chiba.jp/hanamigawa/hokenfukushi/kenko/kuyakusyotop.html",
    address: "千葉市花見川区瑞穂1-1",
  },
  {
    ward: "稲毛区", venue: "稲毛保健福祉センター",
    url: "https://www.city.chiba.jp/inage/hokenfukushi/kenko/giyouji.html",
    address: "千葉市稲毛区穴川4-12-4",
  },
  {
    ward: "若葉区", venue: "若葉保健福祉センター",
    url: "https://www.city.chiba.jp/wakaba/hokenfukushi/kenko/tuki2.html",
    address: "千葉市若葉区貝塚2-19-1",
  },
  {
    ward: "緑区", venue: "緑保健福祉センター",
    url: "https://www.city.chiba.jp/midori/hokenfukushi/kenko/kodomonokouenkai.html",
    address: "千葉市緑区鎌取町226-1",
  },
  {
    ward: "美浜区", venue: "美浜保健福祉センター",
    url: "https://www.city.chiba.jp/mihama/hokenfukushi/kenko/gyouji-yotei/sukoyaka-gyouji.html",
    address: "千葉市美浜区真砂5-15-2",
  },
];

/** h2/h3/h4でHTML本文をセクションに分割 */
function splitSections(html) {
  // body部分のみ
  const bodyMatch = html.match(/<div[^>]*id="tmp_contents"[^>]*>([\s\S]*)/i) ||
                    html.match(/<div[^>]*class="article"[^>]*>([\s\S]*)/i) ||
                    [null, html];
  const body = bodyMatch[1];
  const sections = [];
  const hRe = /<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  let lastIdx = 0;
  let lastTitle = "";
  let lastLevel = 0;
  while ((m = hRe.exec(body)) !== null) {
    if (lastTitle) {
      sections.push({ title: lastTitle, level: lastLevel, content: body.substring(lastIdx, m.index) });
    }
    lastTitle = stripTags(m[2]).trim();
    lastLevel = Number(m[1]);
    lastIdx = m.index + m[0].length;
  }
  if (lastTitle) {
    sections.push({ title: lastTitle, level: lastLevel, content: body.substring(lastIdx) });
  }
  return sections;
}

/** セクション内から日付を抽出 (令和N年M月D日, YYYY年M月D日, M月D日) */
function extractDatesFromSection(sectionContent) {
  const text = stripTags(sectionContent).normalize("NFKC");
  const dates = [];
  const seen = new Set();
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;

  // 令和N年M月D日
  const reRe = /令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
  let dm;
  while ((dm = reRe.exec(text)) !== null) {
    const y = 2018 + Number(dm[1]);
    const mo = Number(dm[2]);
    const d = Number(dm[3]);
    const key = `${y}-${mo}-${d}`;
    if (!seen.has(key)) { seen.add(key); dates.push({ y, mo, d }); }
  }

  // Bare M月D日 — always try (skip if preceded by year marker)
  const bareRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
  while ((dm = bareRe.exec(text)) !== null) {
    const mo = Number(dm[1]);
    const d = Number(dm[2]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    // Skip if preceded by 令和X年 or YYYY年 (already captured above)
    const before = text.substring(Math.max(0, dm.index - 12), dm.index);
    if (/\d年\s*$/.test(before)) continue;
    const y = (mo < currentMonth - 1) ? currentYear + 1 : currentYear;
    const key = `${y}-${mo}-${d}`;
    if (!seen.has(key)) { seen.add(key); dates.push({ y, mo, d }); }
  }

  // M月D・D・D日 pattern (e.g., "2月2・6・10・19日")
  const multiDayRe = /(\d{1,2})\s*月\s*(\d{1,2}(?:\s*[・,、]\s*\d{1,2})+)\s*日/g;
  while ((dm = multiDayRe.exec(text)) !== null) {
    const mo = Number(dm[1]);
    const days = dm[2].split(/[・,、]/).map(s => Number(s.trim())).filter(n => n >= 1 && n <= 31);
    const y = (mo < currentMonth - 1) ? currentYear + 1 : currentYear;
    for (const dd of days) {
      const key = `${y}-${mo}-${dd}`;
      if (!seen.has(key)) { seen.add(key); dates.push({ y, mo, d: dd }); }
    }
  }

  return dates;
}

/** セクションのテキストから時間帯を抽出 */
function extractTimeFromSection(sectionContent) {
  const text = stripTags(sectionContent).normalize("NFKC");
  return parseTimeRangeFromText(text);
}

/** 子育て関連セクションかどうか判定 */
function isChildSection(title) {
  return /健診|健康診査|母親|父親|母乳|育児|子育て|離乳食|歯科相談|栄養相談|ぶどうちゃん|サークル|おしゃべり|パパ|ママ|教室|講演会|こころ|からだ|イヤイヤ|きょうだい|出産|食事セミナー|子どもの歯科/.test(title);
}

/** 終了済みイベントを除外 */
function isFinishedEvent(title) {
  return /終了しました/.test(title);
}

/** セクションHTMLからサブイベント(リンク付き子イベント)を抽出 */
function extractSubEvents(sectionHtml) {
  const subEvents = [];
  // テーブル行内のリンクをサブイベントとして抽出
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trm;
  while ((trm = trRe.exec(sectionHtml)) !== null) {
    const row = trm[1];
    const linkMatch = row.match(/<a\s+[^>]*href="[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    const linkText = stripTags(linkMatch[1]).trim();
    if (!linkText || linkText.length < 3) continue;
    if (!isChildSection(linkText)) continue;
    const dates = extractDatesFromSection(row);
    if (dates.length > 0) {
      subEvents.push({ title: linkText, dates });
    }
  }
  return subEvents;
}

/** セクションタイトルが汎用的すぎるか判定 */
function isGenericTitle(title) {
  return /^(教室|相談|講演会|その他|行事|日程)$/.test(title.replace(/\s/g, ""));
}

function createCollectChibaCityWardEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = CHIBA_CITY_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  async function addEvent(byId, wp, title, eventDate, timeRange, maxDays) {
    if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) return;
    const dateKey = `${eventDate.y}${String(eventDate.mo).padStart(2, "0")}${String(eventDate.d).padStart(2, "0")}`;
    const id = `${srcKey}:${wp.url}:${title}:${dateKey}`;
    if (byId.has(id)) return;

    const candidates = [];
    if (getFacilityAddressFromMaster) {
      const fmAddr = getFacilityAddressFromMaster(source.key, wp.venue);
      if (fmAddr) {
        candidates.push(/千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`);
      }
    }
    candidates.push(`千葉県${wp.address}`);
    candidates.push(`千葉県千葉市 ${wp.venue}`);
    let point = await geocodeForWard(candidates.slice(0, 5), source);
    point = resolveEventPoint(source, wp.venue, point, wp.address);
    const address = resolveEventAddress(source, wp.venue, wp.address, point);

    const { startsAt, endsAt } = buildStartsEndsForDate(eventDate, timeRange);
    byId.set(id, {
      id, source: srcKey, source_label: label,
      title: `${title}（${wp.ward}）`,
      starts_at: startsAt, ends_at: endsAt,
      venue_name: wp.venue, address: address || "",
      url: wp.url,
      lat: point ? point.lat : source.center.lat,
      lng: point ? point.lng : source.center.lng,
    });
  }

  return async function collectChibaCityWardEvents(maxDays) {
    const byId = new Map();

    for (const wp of CHIBA_WARD_PAGES) {
      let html;
      try {
        html = await fetchText(wp.url);
      } catch (e) {
        console.warn(`[${label}/${wp.ward}] fetch failed:`, e.message || e);
        continue;
      }

      const sections = splitSections(html);
      for (const sec of sections) {
        if (isFinishedEvent(sec.title)) continue;
        if (!isChildSection(sec.title)) continue;

        let title = sec.title.replace(/\s+/g, " ").trim();
        title = title.replace(/\s*[(（].*$/, "").trim();
        title = title.replace(/\s*［.*$/, "").trim();
        if (!title || title.length < 2) continue;

        // Generic titles: look for sub-events in table rows with links
        if (isGenericTitle(title)) {
          const subEvents = extractSubEvents(sec.content);
          if (subEvents.length > 0) {
            for (const sub of subEvents) {
              let subTitle = sub.title.replace(/\s+/g, " ").trim();
              subTitle = subTitle.replace(/[(（]PDF[^)）]*[)）]/gi, "").trim();
              const timeRange = extractTimeFromSection(sec.content);
              for (const eventDate of sub.dates) {
                await addEvent(byId, wp, subTitle, eventDate, timeRange, maxDays);
              }
            }
            continue;
          }
        }

        const dates = extractDatesFromSection(sec.content);
        const timeRange = extractTimeFromSection(sec.content);

        for (const eventDate of dates) {
          await addEvent(byId, wp, title, eventDate, timeRange, maxDays);
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}/区保健] ${results.length} ward health events collected`);
    return results;
  };
}

module.exports = { createCollectChibaEvents, createCollectChibaCityWardEvents };
