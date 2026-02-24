const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseYmdFromJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText, normalizeJaDigits } = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

// 子育て関連キーワード (WARD_CHILD_HINT_RE を補完)
const CHILD_KEYWORDS_RE =
  /子育て|子ども|こども|子供|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|健診|健康診査|マタニティ|プレママ|ママ|パパ|おはなし会|家庭の日|読み聞かせ|絵本/;

/**
 * カレンダーページHTMLから年月コンテキストを抽出
 * ページヘッダー等から表示中の年月を推定
 * @param {string} html
 * @returns {{ y: number, mo: number }}
 */
function parsePageYearMonth(html) {
  // <title> や見出しから「YYYY年MM月」を探す
  const m = html.match(/(\d{4})年\s*(\d{1,2})月/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]) };
  // フォールバック: 現在の年月
  const now = parseYmdFromJst(new Date());
  return { y: now.y, mo: now.m };
}

/**
 * 開催期間テキストから日付範囲を展開
 * 例: "2026年2月7日（土曜日）から 2026年2月28日（土曜日）毎週土曜"
 * @param {string} text - 開催期間のテキスト
 * @returns {Array<{y: number, mo: number, d: number}>}
 */
function parseDateRangeText(text) {
  const normalized = normalizeJaDigits(text);
  const dates = [];

  // 範囲パターン: YYYY年M月D日...から...YYYY年M月D日
  const rangeMatch = normalized.match(
    /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日[\s\S]*?(?:から|～|〜|－|-)\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/
  );
  if (!rangeMatch) return dates;

  const startY = Number(rangeMatch[1]);
  const startMo = Number(rangeMatch[2]);
  const startD = Number(rangeMatch[3]);
  const endY = Number(rangeMatch[4]);
  const endMo = Number(rangeMatch[5]);
  const endD = Number(rangeMatch[6]);

  const start = new Date(Date.UTC(startY, startMo - 1, startD));
  const end = new Date(Date.UTC(endY, endMo - 1, endD));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return dates;

  const dayMs = 86400000;
  // 長期イベント（プラネタリウム等）でも今日以降の日付を生成するため、
  // 上限を365日に拡大。inRangeJstで後ほどフィルタされる。
  const diffDays = Math.min(Math.floor((end - start) / dayMs), 365);

  // 曜日フィルタ: "毎週X曜" があれば特定曜日のみ
  const weekdayMatch = normalized.match(/毎週([月火水木金土日])曜/);
  const weekdayMap = { "日": 0, "月": 1, "火": 2, "水": 3, "木": 4, "金": 5, "土": 6 };
  const targetWeekday = weekdayMatch ? weekdayMap[weekdayMatch[1]] : null;

  for (let i = 0; i <= diffDays; i++) {
    const d = new Date(start.getTime() + i * dayMs);
    if (targetWeekday !== null && d.getUTCDay() !== targetWeekday) continue;
    dates.push({ y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate() });
  }
  return dates;
}

/**
 * カレンダーページHTMLからイベントを抽出
 * @param {string} html - カレンダーページのHTML
 * @param {string} baseUrl - ベースURL
 * @param {number} pageYear - ページの年
 * @param {number} pageMonth - ページの月
 * @param {number|null} childCategoryIndex - 子育てカテゴリインデックス (例: 2)
 * @returns {Array<Object>}
 */
function parseCalendarPage(html, baseUrl, pageYear, pageMonth, childCategoryIndex) {
  const events = [];

  // 各日の <dl class="calendar_day"> を抽出
  // 内部に <dl> メタデータがネストされるため、split で分割する
  const dayParts = html.split(/<dl\s+class="calendar_day[^"]*">/i);
  for (let i = 1; i < dayParts.length; i++) {
    // 次の calendar_day の手前 or ページ末尾まで
    const dayBlock = dayParts[i];

    // 日付を抽出: <span class="t_day"><span>16</span>日</span>
    const dayNumMatch = dayBlock.match(/<span\s+class="t_day">\s*<span>(\d{1,2})<\/span>\s*日\s*<\/span>/);
    if (!dayNumMatch) continue;
    const dayNum = Number(dayNumMatch[1]);

    // 各イベントボックスを抽出 (ネストされた div があるため split で分割)
    const eventParts = dayBlock.split(/<div\s+class="cal_event_box">/i);
    for (let j = 1; j < eventParts.length; j++) {
      const eventBox = eventParts[j];
      const parsed = parseEventBox(eventBox, baseUrl, childCategoryIndex);
      if (!parsed) continue;

      // 開催期間がある場合は展開
      if (parsed.dateRangeText) {
        const expandedDates = parseDateRangeText(parsed.dateRangeText);
        if (expandedDates.length > 0) {
          for (const dd of expandedDates) {
            events.push({ ...parsed, y: dd.y, mo: dd.mo, d: dd.d, dateRangeText: undefined });
          }
          continue;
        }
      }

      events.push({ ...parsed, y: pageYear, mo: pageMonth, d: dayNum });
    }
  }

  return events;
}

/**
 * 個別イベントボックスをパース
 * @param {string} eventBox - cal_event_box の内容HTML
 * @param {string} baseUrl - ベースURL
 * @param {number|null} childCategoryIndex - 子育てカテゴリインデックス
 * @returns {Object|null}
 */
function parseEventBox(eventBox, baseUrl, childCategoryIndex) {
  // タイトルとURLを抽出 (リンクあり or リンクなし)
  let href = "";
  let title = "";
  const titleWithLink = eventBox.match(
    /<(?:span|div)\s+class="article_title">\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/(?:span|div)>/
  );
  if (titleWithLink) {
    href = titleWithLink[1].replace(/&amp;/g, "&").trim();
    title = stripTags(titleWithLink[2]).trim();
  } else {
    // リンクなしのarticle_title (大井町等)
    const titleNoLink = eventBox.match(
      /<(?:span|div)\s+class="article_title">([\s\S]*?)<\/(?:span|div)>/
    );
    if (titleNoLink) {
      title = stripTags(titleNoLink[1]).trim();
    }
  }
  if (!title) return null;
  const absUrl = href ? (href.startsWith("http") ? href : `${baseUrl}${href}`) : baseUrl;

  // カテゴリアイコンを抽出
  const categories = [];
  const catRe = /<span\s+class="icon_cat_(\d+)">([\s\S]*?)<\/span>/gi;
  let catMatch;
  while ((catMatch = catRe.exec(eventBox)) !== null) {
    categories.push({ index: Number(catMatch[1]), name: stripTags(catMatch[2]).trim() });
  }

  // 子育て関連フィルタ
  const hasChildCategory = childCategoryIndex !== null &&
    categories.some(c => c.index === childCategoryIndex);
  const hasChildKeyword = WARD_CHILD_HINT_RE.test(title) || CHILD_KEYWORDS_RE.test(title);
  const hasCategoryChildKeyword = categories.some(c =>
    CHILD_KEYWORDS_RE.test(c.name) || WARD_CHILD_HINT_RE.test(c.name)
  );
  if (!hasChildCategory && !hasChildKeyword && !hasCategoryChildKeyword) return null;

  // <dl><dt><img alt="..."></dt><dd>...</dd></dl> からメタ情報を抽出
  let timeText = "";
  let venue = "";
  let dateRangeText = "";
  const metaRe = /<dl>\s*<dt>\s*<img[^>]*alt="([^"]*)"[^>]*>\s*<\/dt>\s*<dd>([\s\S]*?)<\/dd>\s*<\/dl>/gi;
  let metaMatch;
  while ((metaMatch = metaRe.exec(eventBox)) !== null) {
    const altText = metaMatch[1].trim();
    const ddContent = stripTags(metaMatch[2]).trim();
    if (/開催時間/.test(altText)) {
      timeText = ddContent;
    } else if (/開催場所/.test(altText)) {
      venue = ddContent;
    } else if (/開催期間/.test(altText)) {
      dateRangeText = ddContent;
    }
  }

  return {
    title,
    url: absUrl,
    timeText,
    venue,
    dateRangeText: dateRangeText || "",
    categories,
  };
}

/**
 * ジオコーディング候補リストを構築
 * @param {string} venue - 施設名
 * @param {string} address - 住所
 * @param {Object} source - ソース定義
 * @returns {string[]}
 */
function detectPrefecture(source) {
  if (/chiba\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "千葉県";
  if (/tokyo\.jp/.test(source.baseUrl || "")) return "東京都";
  if (/saitama\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "埼玉県";
  if (/gunma\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "群馬県";
  if (/tochigi\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "栃木県";
  if (/ageo|niiza|asaka|shiki|sakado|sugito|higashimatsuyama|yorii|kounosu/.test(source.key || "")) return "埼玉県";
  if (/yachiyo|asahi|kamogawa|katsuura|kimitsu|kyonan|yokoshibahikari/.test(source.key || "")) return "千葉県";
  if (/takasaki|ota_gunma|annaka|nakanojo/.test(source.key || "")) return "群馬県";
  if (/tochigi_city|yaita/.test(source.key || "")) return "栃木県";
  if (/ibaraki\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "茨城県";
  if (/^ibaraki_/.test(source.key || "")) return "茨城県";
  if (/aomori\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "青森県";
  if (/^aomori_/.test(source.key || "")) return "青森県";
  if (/iwate\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "岩手県";
  if (/^iwate_/.test(source.key || "")) return "岩手県";
  if (/miyagi\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "宮城県";
  if (/^miyagi_/.test(source.key || "")) return "宮城県";
  if (/akita\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "秋田県";
  if (/^akita_/.test(source.key || "")) return "秋田県";
  if (/yamagata\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "山形県";
  if (/^yamagata_/.test(source.key || "")) return "山形県";
  if (/fukushima\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "福島県";
  if (/^fukushima_/.test(source.key || "")) return "福島県";
  return "神奈川県";
}

function extractEmbeddedAddressFromVenue(venue, cityName, pref) {
  if (!venue) return [];
  const results = [];
  const parenMatches = venue.match(/[（(]([^）)]{3,60})[）)]/g) || [];
  for (const m of parenMatches) {
    const inner = m.slice(1, -1);
    if (/[0-9０-９]+[-ー－][0-9０-９]+|[0-9０-９]+番地|[0-9０-９]+丁目/.test(inner)) {
      let addr = new RegExp(pref).test(inner) ? inner
        : inner.includes(cityName) ? `${pref}${inner}`
        : `${pref}${cityName}${inner}`;
      results.push(addr);
    }
  }
  return results;
}

function buildGeoCandidates(venue, address, source) {
  const candidates = [];
  const cityName = source.label;
  const pref = detectPrefecture(source);
  // 会場テキスト内の括弧住所を抽出（最優先）
  const embeddedAddrs = extractEmbeddedAddressFromVenue(venue, cityName, pref);
  for (const ea of embeddedAddrs) candidates.push(ea);
  if (address) {
    const full = address.includes(cityName) ? address : `${cityName}${address}`;
    candidates.push(`${pref}${full}`);
  }
  if (venue) {
    candidates.push(`${pref}${cityName} ${venue}`);
  }
  return [...new Set(candidates)];
}

/**
 * 汎用 municipal CMS カレンダーコレクターファクトリー
 * 対応自治体: 大井町, 湯河原町 (同一CMSを使用)
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {number} config.childCategoryIndex - 子育てカテゴリのインデックス (例: 2)
 * @param {Object} deps - { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster }
 */
function createMunicipalCalendarCollector(config, deps) {
  const { source, childCategoryIndex } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectMunicipalCalendarEvents(maxDays) {
    const months = getMonthsForRange(maxDays);

    // カレンダーページ取得 (月別)
    const rawEvents = [];
    for (const ym of months) {
      // ?ym=YYYYMM で月を指定
      const ymParam = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      // カテゴリフィルタ付きURL
      const url = `${source.baseUrl}/calendar/?ym=${ymParam}&s_d1%5B%5D=${childCategoryIndex}`;
      try {
        const html = await fetchText(url);
        const pageCtx = parsePageYearMonth(html);
        const pageEvents = parseCalendarPage(html, source.baseUrl, pageCtx.y, pageCtx.mo, childCategoryIndex);
        rawEvents.push(...pageEvents);
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // フォールバック: フィルタなしのカレンダーページも取得 (カテゴリパラメータが効かない場合)
    if (rawEvents.length === 0) {
      for (const ym of months) {
        const ymParam = `${ym.year}${String(ym.month).padStart(2, "0")}`;
        const url = `${source.baseUrl}/calendar/?ym=${ymParam}`;
        try {
          const html = await fetchText(url);
          const pageCtx = parsePageYearMonth(html);
          const pageEvents = parseCalendarPage(html, source.baseUrl, pageCtx.y, pageCtx.mo, childCategoryIndex);
          rawEvents.push(...pageEvents);
        } catch (e) {
          console.warn(`[${label}] month ${ym.year}/${ym.month} fallback fetch failed:`, e.message || e);
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

    // 詳細ページをバッチ取得 (URLごとに1回、会場・住所情報の補完)
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          // 詳細ページから会場・住所を <dl><dt>/<dd> パターンで抽出
          let detailVenue = "";
          let detailAddress = "";
          const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
          let mm;
          while ((mm = metaRe.exec(html)) !== null) {
            const k = stripTags(mm[1]);
            const v = stripTags(mm[2]);
            if (!k || !v) continue;
            if (!detailVenue && /(会場|開催場所|実施場所|場所|ところ)/.test(k)) detailVenue = v;
            if (!detailAddress && /(住所|所在地)/.test(k)) detailAddress = v;
          }
          // <table> の <th>/<td> パターンも確認
          if (!detailVenue || !detailAddress) {
            const trRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
            while ((mm = trRe.exec(html)) !== null) {
              const k = stripTags(mm[1]);
              const v = stripTags(mm[2]);
              if (!k || !v) continue;
              if (!detailVenue && /(会場|開催場所|実施場所|場所|ところ)/.test(k)) detailVenue = v;
              if (!detailAddress && /(住所|所在地)/.test(k)) detailAddress = v;
            }
          }
          // h2/h3/h4 見出しパターン: 「場所」「会場」「ところ」の直後テキスト (志木市、朝霞市等)
          if (!detailVenue) {
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
                  detailVenue = nextText;
                  break;
                }
              }
            }
          }
          // テキストベースのフォールバック: 「場所：○○」「会場：○○」パターン
          if (!detailVenue) {
            const plainText = stripTags(html);
            const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim();
              v = v.replace(/\s*(?:住所|駐車|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考).*$/, "").trim();
              if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) detailVenue = v;
            }
          }
          // CMS連絡先セクションのフォールバック: <span class="sf_name">部署名</span> / <span class="sf_address">住所</span>
          if (!detailVenue) {
            const sfName = html.match(/<span\s+class="sf_name">([\s\S]*?)<\/span>/);
            if (sfName) {
              const deptName = stripTags(sfName[1]).trim();
              if (deptName && deptName.length >= 2 && deptName.length <= 40) detailVenue = deptName;
            }
          }
          if (!detailAddress) {
            const sfAddr = html.match(/<span\s+class="sf_address">([\s\S]*?)<\/span>/);
            if (sfAddr) detailAddress = stripTags(sfAddr[1]).trim();
          }
          const timeRange = parseTimeRangeFromText(stripTags(html));
          return { url, venue: detailVenue, address: detailAddress, timeRange };
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

      // 会場: カレンダーページの開催場所を優先、なければ詳細ページから
      const calVenue = sanitizeVenueText(ev.venue || "");
      const detailVenue = sanitizeVenueText((detail && detail.venue) || "");
      let venue = calVenue || detailVenue;
      // タイトル括弧内の施設名をフォールバック (朝霞市等: 「講座名（施設名）」)
      if (!venue && ev.title) {
        const parenMatch = ev.title.match(/[（(]([^）)]{2,20})[）)]/);
        if (parenMatch) {
          const candidate = parenMatch[1].trim();
          if (/(館|センター|公園|学校|ホール|プラザ|公民館|図書館|体育館|保育園|幼稚園|こども園|ひろば)/.test(candidate)) {
            venue = candidate;
          }
        }
      }

      // venue内の括弧住所パターンを抽出 (例: "旭市保健センター（旭市横根3520番地）")
      let venueExtractedAddress = "";
      if (venue) {
        const parenAddr = venue.match(/[（(]([^）)]*(?:市|町|村|区)[^）)]*\d+[^）)]*)[）)]/);
        if (parenAddr) {
          venueExtractedAddress = parenAddr[1].replace(/番地/g, "").trim();
          venue = venue.replace(/[（(][^）)]*[）)]/, "").trim();
        }
      }

      const rawAddress = sanitizeAddressText((detail && detail.address) || venueExtractedAddress || "");

      // 時間: カレンダーページの開催時間を優先、なければ詳細ページから
      let timeRange = ev.timeText ? parseTimeRangeFromText(ev.timeText) : null;
      if (!timeRange && detail) timeRange = detail.timeRange;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress, source);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const fmPref = detectPrefecture(source);
          const full = new RegExp(fmPref).test(fmAddr) ? fmAddr : `${fmPref}${fmAddr}`;
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

module.exports = { createMunicipalCalendarCollector };
