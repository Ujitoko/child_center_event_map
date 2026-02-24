const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const DETAIL_BATCH_SIZE = 6;

/**
 * cal.php 一覧ページからイベントリンクを抽出
 * リンク形式: <a href="cal.php?mode=detail&lc=0&category=N&year=YYYY&month=MM&day=DD#evN">タイトル</a>
 * カテゴリラベルフィルタ: &nbsp;【子育て・教育】 等
 */
function parseCalPhpListPage(html, baseUrl, fallbackYear, fallbackMonth, childCategoryLabels) {
  const events = [];
  // <li class="list_default"> 内のリンクとカテゴリラベルを抽出
  const liRe = /<li\b[^>]*>\s*([\s\S]*?)<\/li>/gi;
  let liMatch;
  while ((liMatch = liRe.exec(html)) !== null) {
    const liContent = liMatch[1];
    const linkMatch = liContent.match(/<a\s+[^>]*href="(cal\.php\?mode=detail[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const href = linkMatch[1].replace(/&amp;/g, "&");
    const title = stripTags(linkMatch[2]).trim();
    if (!title) continue;

    // カテゴリラベルフィルタ (ある場合)
    if (childCategoryLabels && childCategoryLabels.length > 0) {
      const labelText = stripTags(liContent);
      const hasLabel = childCategoryLabels.some(l => labelText.includes(l));
      if (!hasLabel) continue;
    }

    // URL パラメータから年月日を抽出
    const yearMatch = href.match(/year=(\d{4})/);
    const monthMatch = href.match(/month=(\d{1,2})/);
    const dayMatch = href.match(/day=(\d{1,2})/);
    const evMatch = href.match(/#ev(\d+)/);

    const y = yearMatch ? Number(yearMatch[1]) : fallbackYear;
    const mo = monthMatch ? Number(monthMatch[1]) : fallbackMonth;
    const d = dayMatch ? Number(dayMatch[1]) : null;
    if (!y || !mo || !d) continue;

    const absUrl = href.startsWith("http") ? href : `${baseUrl}/cal.php${href.startsWith("?") ? href : `?${href.replace(/^cal\.php\?/, "")}`}`;
    const evIndex = evMatch ? Number(evMatch[1]) : 0;

    events.push({ title, url: absUrl, y, mo, d, evIndex });
  }

  // フォールバック: <a href="cal.php?mode=detail..."> を直接探す
  if (events.length === 0) {
    const linkRe = /<a\s+[^>]*href="(cal\.php\?mode=detail[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null) {
      const href = m[1].replace(/&amp;/g, "&");
      const title = stripTags(m[2]).trim();
      if (!title) continue;

      const yearMatch = href.match(/year=(\d{4})/);
      const monthMatch = href.match(/month=(\d{1,2})/);
      const dayMatch = href.match(/day=(\d{1,2})/);
      const evMatch = href.match(/#ev(\d+)/);

      const y = yearMatch ? Number(yearMatch[1]) : fallbackYear;
      const mo = monthMatch ? Number(monthMatch[1]) : fallbackMonth;
      const d = dayMatch ? Number(dayMatch[1]) : null;
      if (!y || !mo || !d) continue;

      const absUrl = `${baseUrl}/cal.php${href.startsWith("?") ? href : `?${href.replace(/^cal\.php\?/, "")}`}`;
      const evIndex = evMatch ? Number(evMatch[1]) : 0;

      events.push({ title, url: absUrl, y, mo, d, evIndex });
    }
  }

  return events;
}

/**
 * 詳細ページから h2 区切りのイベントブロックを分割し、
 * evIndex に対応するブロックからメタ情報を抽出
 */
function parseCalPhpDetailBlock(html, evIndex, cityLabel) {
  let venue = "";
  let address = "";

  // h2 でブロック分割
  const blocks = html.split(/<h2[^>]*>/i);
  const targetIdx = evIndex + 1;
  const block = targetIdx < blocks.length ? blocks[targetIdx] : blocks[blocks.length - 1] || "";

  // h3 + 直後の p からメタ情報抽出
  const sectionRe = /<h3[^>]*>([\s\S]*?)<\/h3>\s*(?:<p[^>]*>([\s\S]*?)<\/p>)?/gi;
  let sm;
  while ((sm = sectionRe.exec(block)) !== null) {
    const heading = stripTags(sm[1]).trim();
    const value = sm[2] ? stripTags(sm[2]).trim() : "";
    if (!value) continue;
    if (!venue && /^(?:会場|場所|開催場所|ところ)$/.test(heading)) {
      venue = value;
    }
  }

  // dt/dd フォールバック
  if (!venue) {
    const ddRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    let dm;
    while ((dm = ddRe.exec(block)) !== null) {
      const k = stripTags(dm[1]).trim();
      const v = stripTags(dm[2]).trim();
      if (!k || !v) continue;
      if (!venue && /^(?:会場|場所|開催場所|ところ)$/.test(k)) venue = v;
      if (!address && /^(?:住所|所在地)$/.test(k)) address = v;
    }
  }

  // th/td フォールバック
  if (!venue) {
    const trRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tm;
    while ((tm = trRe.exec(block)) !== null) {
      const k = stripTags(tm[1]).trim();
      const v = stripTags(tm[2]).trim();
      if (!k || !v) continue;
      if (!venue && /(?:会場|場所|開催場所|ところ)/.test(k)) venue = v;
      if (!address && /(?:住所|所在地)/.test(k)) address = v;
    }
  }

  // テキストベースのフォールバック
  if (!venue) {
    const blockPlain = stripTags(block);
    const placeMatch = blockPlain.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
    if (placeMatch) {
      let v = placeMatch[1].trim().replace(/\s*(?:住所|駐車|参加|申込|持ち物|対象|定員|電話|内容|問い合わせ|日時|費用|備考).*$/, "").trim();
      if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) venue = v;
    }
  }

  // 市名パターンの住所抽出
  if (!address && cityLabel) {
    const blockText = stripTags(block);
    const addrRe = new RegExp(cityLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[^\\s、。,）)]{2,30}");
    const addrMatch = blockText.match(addrRe);
    if (addrMatch) address = addrMatch[0];
  }

  return { venue, address };
}

/**
 * 汎用 cal.php コレクターファクトリー
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {number|string} config.category - cal.php カテゴリ番号
 * @param {string[]} [config.childCategoryLabels] - カテゴリラベルフィルタ (例: ["子育て", "教育"])
 * @param {boolean} [config.useKeywordFilter=false] - キーワードフィルタを使用
 * @param {string[]} [config.childKeywords] - 追加キーワード
 * @param {number} [config.maxDetailPages=60] - 詳細ページ取得上限
 * @param {string} [config.calPath="/cal.php"] - カレンダーパス
 * @param {Object} deps - { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster }
 */
function createCalPhpCollector(config, deps) {
  const { source, category, childCategoryLabels, useKeywordFilter, childKeywords, maxDetailPages, calPath } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;
  const baseUrl = source.baseUrl;
  const calBase = calPath || "/cal.php";

  let keywordRe = null;
  if (useKeywordFilter && childKeywords && childKeywords.length > 0) {
    keywordRe = new RegExp(childKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));
  }

  return async function collectCalPhpEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      const url = `${baseUrl}${calBase}?mode=list&lc=0&category=${category}&year=${year}&month=${month}`;
      try {
        const html = await fetchText(url);
        const parsed = parseCalPhpListPage(html, baseUrl, year, month, childCategoryLabels);
        rawEvents.push(...parsed);
      } catch (e) {
        console.warn(`[${label}] cal.php fetch failed (${year}/${month}):`, e.message || e);
      }
    }

    if (rawEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // キーワードフィルタ (オプション)
    let filtered = rawEvents;
    if (keywordRe) {
      filtered = rawEvents.filter(ev => keywordRe.test(ev.title));
    }

    // 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of filtered) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページバッチ取得
    const detailBaseUrls = [...new Set(uniqueEvents.map(e => e.url.replace(/#.*$/, "")))].slice(0, maxDetailPages || 60);
    const detailMap = new Map();
    for (let i = 0; i < detailBaseUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailBaseUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const text = stripTags(html);
          const timeRange = parseTimeRangeFromText(text);
          return { url, html, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const pref = "茨城県";
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const detailBaseUrl = ev.url.replace(/#.*$/, "");
      const detail = detailMap.get(detailBaseUrl);
      let detailMeta = { venue: "", address: "" };
      let timeRange = null;
      if (detail) {
        detailMeta = parseCalPhpDetailBlock(detail.html, ev.evIndex, label);
        timeRange = detail.timeRange;
      }

      const venue = sanitizeVenueText(detailMeta.venue);
      const rawAddress = sanitizeAddressText(detailMeta.address);

      // ジオコーディング候補
      const geoCandidates = [];
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          geoCandidates.push(new RegExp(pref).test(fmAddr) ? fmAddr : `${pref}${fmAddr}`);
        }
      }
      if (rawAddress) {
        const full = rawAddress.includes(label) ? rawAddress : `${label}${rawAddress}`;
        geoCandidates.push(full.includes(pref) ? full : `${pref}${full}`);
      }
      if (venue) {
        geoCandidates.push(`${pref}${label} ${venue}`);
      }

      let point = await geocodeForWard([...new Set(geoCandidates)].slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const resolvedAddr = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate({ y: ev.y, mo: ev.mo, d: ev.d }, timeRange);
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
        address: resolvedAddr || "",
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

module.exports = { createCalPhpCollector };
