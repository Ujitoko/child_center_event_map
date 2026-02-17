const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

// 子育て関連キーワード (WARD_CHILD_HINT_RE を補完)
const CHILD_KEYWORDS_RE =
  /子育て|子ども|子供|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|健診|健康診査|マタニティ|プレママ|ママ|パパ/;

/**
 * イベントが子育て関連かどうか判定
 * @param {Object} entry - calendar.json のエントリ
 * @returns {boolean}
 */
function isChildEvent(entry) {
  const title = entry.page_name || "";
  if (WARD_CHILD_HINT_RE.test(title)) return true;
  if (CHILD_KEYWORDS_RE.test(title)) return true;
  if (entry.event) {
    const typeName = entry.event.event_type_name || "";
    if (/子育て|子ども/.test(typeName)) return true;
    const fields = entry.event.event_fields;
    if (fields && typeof fields === "object" && !Array.isArray(fields)) {
      for (const val of Object.values(fields)) {
        if (/子育て|子ども/.test(val)) return true;
      }
    }
  }
  return false;
}

/**
 * 日付範囲を展開 (最大30日でキャップ)
 * @param {string} startStr - "YYYY-MM-DD"
 * @param {string} endStr - "YYYY-MM-DD"
 * @returns {Array<{y: number, mo: number, d: number}>}
 */
function expandDateRange(startStr, endStr) {
  const dates = [];
  const startParts = startStr.split("-").map(Number);
  const endParts = endStr.split("-").map(Number);
  const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
  const dayMs = 86400000;
  const diffDays = Math.min(Math.floor((end - start) / dayMs), 30);
  for (let i = 0; i <= diffDays; i++) {
    const d = new Date(start.getTime() + i * dayMs);
    dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
  }
  return dates;
}

/**
 * ジオコーディング候補リストを構築
 */
function detectPrefecture(source) {
  if (/tokyo\.jp/.test(source.baseUrl || "")) return "東京都";
  if (/chiba\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "千葉県";
  if (/saitama\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "埼玉県";
  if (/gunma\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "群馬県";
  if (/tochigi\.(jp|lg\.jp)/.test(source.baseUrl || "")) return "栃木県";
  if (/kawaguchi|kasukabe|misato|okegawa|kazo|hanno|gyoda|honjo|hidaka|shiraoka|satte|iruma|fukaya|ogose|ogawa|yoshimi|kamikawa|namegawa/.test(source.key || "")) return "埼玉県";
  if (/narashino|kisarazu|isumi|sakura|sosa|sammu|shiroi|tohnosho|otaki|ichihara|sakae_chiba/.test(source.key || "")) return "千葉県";
  if (/maebashi|isesaki|fujioka_gunma/.test(source.key || "")) return "群馬県";
  if (/sano|nikko|moka|nasushiobara/.test(source.key || "")) return "栃木県";
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
 * 汎用 calendar.json コレクターファクトリー
 * 対応自治体: 寒川町, 愛川町, 三浦市, 大磯町, 葉山町
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {string[]} [config.childKeywords] - 追加の子育てキーワード
 * @param {Object} deps - { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster }
 */
function createCalendarJsonCollector(config, deps) {
  const { source, childKeywords, jsonPath } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  // 追加キーワードがある場合は正規表現を拡張
  let extraKeywordsRe = null;
  if (childKeywords && childKeywords.length > 0) {
    extraKeywordsRe = new RegExp(childKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));
  }

  return async function collectCalendarJsonEvents(maxDays) {
    const calendarUrl = jsonPath ? `${source.baseUrl}${jsonPath}` : `${source.baseUrl}/calendar.json`;
    let entries;
    try {
      const jsonText = await fetchText(calendarUrl);
      entries = JSON.parse(jsonText);
    } catch (e) {
      console.warn(`[${label}] calendar.json fetch/parse failed:`, e.message || e);
      return [];
    }

    if (!Array.isArray(entries)) {
      console.warn(`[${label}] calendar.json is not an array`);
      return [];
    }

    // 子育て関連イベントをフィルタ
    const childEntries = entries.filter((entry) => {
      if (isChildEvent(entry)) return true;
      if (extraKeywordsRe && extraKeywordsRe.test(entry.page_name || "")) return true;
      return false;
    });

    // 日付展開 + 範囲フィルタ
    const rawItems = [];
    for (const entry of childEntries) {
      if (!entry.page_name || !entry.url) continue;
      const dateList = Array.isArray(entry.date_list) ? entry.date_list : [];
      if (dateList.length === 0) continue;

      const eventPlace = (entry.event && entry.event.event_place) || "";

      for (const pair of dateList) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        const startStr = pair[0];
        const endStr = pair[1];
        if (!startStr) continue;

        const dates = (startStr === endStr)
          ? (() => {
              const p = startStr.split("-").map(Number);
              return [{ y: p[0], mo: p[1], d: p[2] }];
            })()
          : expandDateRange(startStr, endStr);

        for (const dd of dates) {
          if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
          rawItems.push({
            title: entry.page_name,
            url: entry.url,
            eventPlace,
            y: dd.y,
            mo: dd.mo,
            d: dd.d,
          });
        }
      }
    }

    // URL + date で重複除去
    const uniqueMap = new Map();
    for (const item of rawItems) {
      const dateKey = `${item.y}${String(item.mo).padStart(2, "0")}${String(item.d).padStart(2, "0")}`;
      const key = `${item.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...item, dateKey });
    }
    const uniqueItems = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得 (URLごとに1回)
    const detailUrls = [...new Set(uniqueItems.map((e) => e.url))].slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseDetailMeta(html);
          const plainText = stripTags(html);
          const timeRange = parseTimeRangeFromText(plainText);
          // テキストベースの会場抽出 (parseDetailMeta が空の場合のフォールバック)
          if (!meta.venue) {
            const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim();
              // 余計な後続テキストを除去
              v = v.replace(/\s*(?:住所|郵便番号|駐車|大きな地図|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考|注意|詳細|についてのお知らせ).*$/, "").trim();
              v = v.replace(/[（(][^）)]*(?:駅|バス停|徒歩)[^）)]*[）)]$/g, "").trim();
              // 「場所にお越しの上」等のゴミ除外
              if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) meta.venue = v;
            }
          }
          return { url, meta, timeRange, plainText };
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
    for (const item of uniqueItems) {
      const detail = detailMap.get(item.url);

      // 会場: JSON の event_place を優先、なければ詳細ページから
      const jsonVenue = sanitizeVenueText(item.eventPlace || "");
      const detailVenue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      let venue = jsonVenue || detailVenue;
      // 部屋名・階数を除去
      venue = venue.replace(/\s*\d*階.*$/, "").replace(/[（(][^）)]*(?:衛生|教育室|会議室|和室|講堂|研修室)[^）)]*[）)]/g, "").trim();

      // venue空の場合、詳細ページテキストから再抽出 (parseDetailMetaがゴミを返した場合のフォールバック)
      if (!venue && detail && detail.plainText) {
        // 場所キーワード後のベニュー名を探す
        const reMatch = detail.plainText.match(/(?:場所|会場|ところ)\s+(.+?)(?=\s+(?:その他|内容|対象|日時|時間|問い合わせ|関連|申込|定員|費用|参加費|連絡|主催|企業|託児)|$)/u);
        if (reMatch) {
          const candidate = sanitizeVenueText(reMatch[1].trim());
          if (candidate) venue = candidate;
        }
      }

      // venue空の場合、タイトルから施設名パターンを抽出
      if (!venue && item.title) {
        const facilityMatch = item.title.match(/([\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}ー]+(?:公民館|センター|図書館|会館|児童館|体育館|ホール|こども園|保育園|幼稚園))/u);
        if (facilityMatch) venue = sanitizeVenueText(facilityMatch[1]);
      }

      // venue空の場合、URLパスから施設名を推定
      if (!venue && item.url) {
        const urlFacilityMap = [
          [/\/chuokominkan\//, "中央公民館"],
          [/\/kominkan\//, "公民館"],
          [/\/toshokan\//, "図書館"],
          [/\/jidoukan?\//, "児童館"],
          [/\/taiikukan\//, "体育館"],
        ];
        for (const [re, name] of urlFacilityMap) {
          if (re.test(item.url)) { venue = name; break; }
        }
      }

      const rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      const timeRange = detail ? detail.timeRange : null;

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
        { y: item.y, mo: item.mo, d: item.d },
        timeRange
      );
      const id = `${srcKey}:${item.url}:${item.title}:${item.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: item.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: address || "",
        url: item.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCalendarJsonCollector };
