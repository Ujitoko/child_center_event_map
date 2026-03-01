const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
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
 * CGI カレンダー月間グリッド (type=2) からイベントのある日を抽出
 */
function parseGridDays(html, year, month) {
  const days = new Set();
  const dayRe = /calendar\.cgi\?type=3&(?:amp;)?year=\d+&(?:amp;)?month=\d+&(?:amp;)?day=(\d+)/g;
  let m;
  while ((m = dayRe.exec(html)) !== null) {
    const d = Number(m[1]);
    if (d >= 1 && d <= 31) days.add(d);
  }
  return Array.from(days).sort((a, b) => a - b);
}

/**
 * CGI カレンダー日別ページ (type=3) からイベントを抽出
 * 形式: <li><a href="/path/event.html">YYYY年M月D日（曜日） [時刻] TITLE</a></li>
 */
function parseDayPage(html, baseUrl, year, month, day) {
  const events = [];
  const liRe = /<li>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/li>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&").trim();
    const rawText = stripTags(m[2]).trim();
    if (!rawText || rawText.length < 10) continue;
    // 日付パターンを含むもののみ（ナビリンク除外）
    if (!/\d{4}年\d{1,2}月\d{1,2}日/.test(rawText)) continue;
    // タイトル抽出: 日付+時刻部分を除去
    let title = rawText
      .replace(/\d{4}年\d{1,2}月\d{1,2}日[（(][^）)]*[）)]/g, "")
      .replace(/\s*から\s*/g, " ")
      .replace(/\d{1,2}時\d{0,2}分?\s*/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || title.length < 2) continue;
    // 子育てフィルタ
    if (!WARD_CHILD_HINT_RE.test(title)) continue;
    title = title.replace(/\s*事前申込(あり|なし).*$/, "").trim();
    title = title.replace(/\s*【締切】.*$/, "").trim();
    const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    events.push({ y: year, mo: month, d: day, title, url: absUrl });
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
    const DAY_BATCH = 6;

    // グリッド (type=2) → 日別ページ (type=3) の2段階取得
    const rawEvents = [];
    for (const ym of months) {
      const gridUrl = `${source.baseUrl}/cgi-bin/event_cal/calendar.cgi?type=2&year=${ym.year}&month=${ym.month}`;
      let gridHtml;
      try {
        gridHtml = await fetchText(gridUrl);
      } catch (e) {
        console.warn(`[${label}] grid ${ym.year}/${ym.month} fetch failed:`, e.message || e);
        continue;
      }
      const eventDays = parseGridDays(gridHtml, ym.year, ym.month);
      // 日別ページをバッチ取得
      for (let i = 0; i < eventDays.length; i += DAY_BATCH) {
        const batch = eventDays.slice(i, i + DAY_BATCH);
        const results = await Promise.allSettled(
          batch.map(async (day) => {
            const dayUrl = `${source.baseUrl}/cgi-bin/event_cal/calendar.cgi?type=3&year=${ym.year}&month=${ym.month}&day=${day}`;
            const html = await fetchText(dayUrl);
            return parseDayPage(html, source.baseUrl, ym.year, ym.month, day);
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled") rawEvents.push(...r.value);
        }
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
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 200);
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
  return /健診|健康診査|母親|父親|母乳|育児|子育て|離乳食|歯科相談|栄養相談|ぶどうちゃん|サークル|おしゃべり|パパ|ママ|教室|講演会|こころ|からだ|イヤイヤ|きょうだい|出産|食事セミナー|子どもの歯科|相談|予防接種|BCG|親子|幼児|乳幼児|赤ちゃん|妊婦/.test(title);
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

/**
 * 千葉市こどもイベント情報PDF (月刊) からイベントを抽出
 * URL: kodomoevent{RRMM}.pdf (RR=令和年, MM=月)
 */
const PDF_BASE = "https://www.city.chiba.jp/kodomomirai/kodomomirai/kikaku/documents/kodomoevent";
// 行単位のスキップ
const PDF_SKIP_LINE_RE = /^[>～―\-#]+|こどもに関わるイベント情報|月\s*日\s*曜|どこで|参加できる|イベント名|当日参加|どんなこと|いつ|TEL[：:]|FAX[：:]|\d+人\s*$|必要\s|不要\s|不可$|可能$|先着|抽選|\d{1,2}[\/]\d{1,2}|^まで|^から$|https?:[/]|フェイスブック|ブログ|\d{4}年[/]|電子申請|申し込み[：:]|必要事項を明記/;
// 対象者行
const PDF_TARGET_RE = /^(?:どなたでも|小学|中学|高校|\d歳|未就|就学前|保護者[同伴]*$|親子$|幼児$|乳幼児|と保護者|の方$|の親子$|A[：:]|B[：:])/;
// 場所候補
const PDF_VENUE_RE = /(?:公園|センター|ホール|広場|館|プラザ|スクエア|自然の家|図書館|公民館|区役所|体育|アリーナ|競技場|きぼーる|調理室)/;
// タイトルに不適切
const PDF_TITLE_SKIP_RE = /^(?:※|TEL|FAX|http|問い合わせ|こども企画課|スポーツ振興|文化振興|生涯学習|動きやすい|詳細は|白い靴下)/;

function parseChibaKodomoEventPdf(text, defaultYear) {
  const events = [];
  const lines = text.split("\n");
  const dateLineRe = /^(\d{1,2})\s+(\d{1,2})\s+([月火水木金土日])/;

  // セクション分割
  const sections = [];
  let currentSection = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const dm = line.match(dateLineRe);
    if (dm) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        mo: Number(dm[1]), d: Number(dm[2]),
        restOfDateLine: line.substring(dm[0].length).trim(),
        bodyLines: [],
      };
    } else if (currentSection) {
      currentSection.bodyLines.push(line);
    }
  }
  if (currentSection) sections.push(currentSection);

  for (const sec of sections) {
    // 時間抽出
    const rest = sec.restOfDateLine;
    const timeMatch = rest.match(/(\d{1,2}):(\d{2})\s+(\d{1,2}):(\d{2})/);
    let timeRange = null;
    if (timeMatch) {
      timeRange = {
        startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
        endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
      };
    }

    // 日付行の時間を除去してパーツ分割
    const afterTime = rest.replace(/\d{1,2}:\d{2}/g, "").trim();
    const inlineParts = afterTime.split(/\s{2,}/).map(p => p.trim()).filter(p => p);

    let venue = "";
    let title = "";

    // インライン形式: venue | target | title が1行に収まるケース
    if (inlineParts.length >= 3) {
      venue = inlineParts[0].replace(/\s+/g, "");
      // inlineParts[1] は対象者（スキップ）
      // inlineParts[2] 以降がタイトル候補
      for (let k = 2; k < inlineParts.length; k++) {
        const candidate = inlineParts[k].replace(/\s+/g, "");
        if (PDF_SKIP_LINE_RE.test(candidate)) continue;
        if (PDF_TARGET_RE.test(candidate)) continue;
        if (candidate.length >= 3 && candidate.length < 60) {
          title = candidate;
          break;
        }
      }
    }

    // インラインで見つからない場合: 場所は日付行末尾、タイトルは本文行
    if (!title) {
      // 場所候補: 日付行の最初の場所っぽい語
      for (const p of inlineParts) {
        if (PDF_VENUE_RE.test(p)) { venue = p.replace(/\s+/g, ""); break; }
      }
      // 本文行からタイトルを探す
      for (const bodyLine of sec.bodyLines) {
        const l = bodyLine.trim();
        if (!l || l.length < 3 || /^>\s/.test(l)) continue;
        if (PDF_SKIP_LINE_RE.test(l)) continue;
        if (PDF_TARGET_RE.test(l)) continue;
        if (PDF_TITLE_SKIP_RE.test(l)) continue;
        // 場所行をスキップ
        if (!venue && PDF_VENUE_RE.test(l) && l.length < 30) {
          venue = l.replace(/\s+/g, "").replace(/[（(][^）)]*[）)]/g, "");
          continue;
        }
        if (PDF_TARGET_RE.test(l)) continue;
        const cleaned = l.replace(/\s+/g, "");
        if (cleaned.length >= 3 && cleaned.length < 60) {
          title = cleaned;
          break;
        }
      }
    }

    if (!title) continue;
    // タイトル品質フィルタ
    title = title.replace(/^[（(][^）)]*[）)]\s*/, ""); // 先頭の括弧を除去
    title = title.replace(/どなたでも|小学生以?上?|中学生以?上?/g, "").trim(); // 対象者混入を除去
    if (title.length < 4) continue;
    if (/^\d{1,2}:\d{2}$/.test(title)) continue; // 時刻だけ
    if (/^[もの可）)]+$/.test(title)) continue; // ゴミ
    const y = (sec.mo < 3) ? defaultYear + 1 : defaultYear;
    events.push({ y, mo: sec.mo, d: sec.d, title, venue, timeRange });
  }

  return events;
}

function createCollectChibaKodomoEventPdf(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = CHIBA_CITY_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectChibaKodomoEventPdf(maxDays) {
    const now = new Date(Date.now() + 9 * 3600 * 1000);
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    // 当月と来月のPDFを取得
    const pdfMonths = [{ y: currentYear, m: currentMonth }];
    if (currentMonth < 12) {
      pdfMonths.push({ y: currentYear, m: currentMonth + 1 });
    } else {
      pdfMonths.push({ y: currentYear + 1, m: 1 });
    }

    const allEvents = [];
    for (const { y, m } of pdfMonths) {
      const rr = String(y - 2018).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const pdfUrl = `${PDF_BASE}${rr}${mm}.pdf`;
      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 200) continue;
        const evts = parseChibaKodomoEventPdf(markdown, y);
        allEvents.push(...evts);
      } catch (e) {
        console.warn(`[${label}/こどもイベントPDF] ${rr}${mm} failed:`, e.message || e);
      }
    }

    // 重複除去 + 範囲フィルタ
    const byId = new Map();
    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:kodomoevpdf:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const venueName = sanitizeVenueText(ev.venue || "");
      const candidates = [];
      if (getFacilityAddressFromMaster && venueName) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) candidates.push(/千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`);
      }
      if (venueName) candidates.push(`千葉県千葉市 ${venueName}`);
      candidates.push(`千葉県千葉市`);
      let point = await geocodeForWard(candidates.slice(0, 5), source);
      point = resolveEventPoint(source, venueName, point, `千葉市 ${venueName}`);
      const address = resolveEventAddress(source, venueName, `千葉市 ${venueName}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venueName || label,
        address: address || "",
        url: `${PDF_BASE}${String(ev.y - 2018).padStart(2, "0")}${String(ev.mo).padStart(2, "0")}.pdf`,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}/こどもイベントPDF] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectChibaEvents, createCollectChibaCityWardEvents, createCollectChibaKodomoEventPdf };
