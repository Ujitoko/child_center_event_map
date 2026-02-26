/**
 * いこーよ (iko-yo.net) コレクター
 * 全国の子育てイベントポータルサイトからJSON-LDを抽出してイベントを収集
 *
 * Listing: https://iko-yo.net/events?page=N&prefecture_ids[]=P
 * JSON-LD: <script type="application/ld+json"> に Event 構造データが埋め込まれている
 * 15件/ページ、robots.txt: Crawl-delay: 1
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseYmdFromJst } = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");

/**
 * JIS都道府県IDとキー/名のマッピング (1=北海道, 47=沖縄)
 */
const PREF_BY_ID = {
  1:  { key: "hokkaido",  name: "北海道" },
  2:  { key: "aomori",    name: "青森県" },
  3:  { key: "iwate",     name: "岩手県" },
  4:  { key: "miyagi",    name: "宮城県" },
  5:  { key: "akita",     name: "秋田県" },
  6:  { key: "yamagata",  name: "山形県" },
  7:  { key: "fukushima", name: "福島県" },
  8:  { key: "ibaraki",   name: "茨城県" },
  9:  { key: "tochigi",   name: "栃木県" },
  10: { key: "gunma",     name: "群馬県" },
  11: { key: "saitama",   name: "埼玉県" },
  12: { key: "chiba",     name: "千葉県" },
  13: { key: "tokyo",     name: "東京都" },
  14: { key: "kanagawa",  name: "神奈川県" },
  15: { key: "niigata",   name: "新潟県" },
  16: { key: "toyama",    name: "富山県" },
  17: { key: "ishikawa",  name: "石川県" },
  18: { key: "fukui",     name: "福井県" },
  19: { key: "yamanashi", name: "山梨県" },
  20: { key: "nagano",    name: "長野県" },
  21: { key: "gifu",      name: "岐阜県" },
  22: { key: "shizuoka",  name: "静岡県" },
  23: { key: "aichi",     name: "愛知県" },
  24: { key: "mie",       name: "三重県" },
  25: { key: "shiga",     name: "滋賀県" },
  26: { key: "kyoto",     name: "京都府" },
  27: { key: "osaka",     name: "大阪府" },
  28: { key: "hyogo",     name: "兵庫県" },
  29: { key: "nara",      name: "奈良県" },
  30: { key: "wakayama",  name: "和歌山県" },
  31: { key: "tottori",   name: "鳥取県" },
  32: { key: "shimane",   name: "島根県" },
  33: { key: "okayama",   name: "岡山県" },
  34: { key: "hiroshima", name: "広島県" },
  35: { key: "yamaguchi", name: "山口県" },
  36: { key: "tokushima", name: "徳島県" },
  37: { key: "kagawa",    name: "香川県" },
  38: { key: "ehime",     name: "愛媛県" },
  39: { key: "kochi",     name: "高知県" },
  40: { key: "fukuoka",   name: "福岡県" },
  41: { key: "saga",      name: "佐賀県" },
  42: { key: "nagasaki",  name: "長崎県" },
  43: { key: "kumamoto",  name: "熊本県" },
  44: { key: "oita",      name: "大分県" },
  45: { key: "miyazaki",  name: "宮崎県" },
  46: { key: "kagoshima", name: "鹿児島県" },
  47: { key: "okinawa",   name: "沖縄県" },
};

/** 都道府県名 → PREF_BY_ID エントリの逆引き */
const PREF_BY_NAME = {};
for (const [id, p] of Object.entries(PREF_BY_ID)) {
  PREF_BY_NAME[p.name] = { id: Number(id), ...p };
}

/**
 * 住所テキストから都道府県を検出
 * @param {string} address
 * @returns {{ prefKey: string, prefName: string } | null}
 */
function detectPrefFromAddress(address) {
  if (!address) return null;
  for (const entry of Object.values(PREF_BY_ID)) {
    if (address.includes(entry.name)) {
      return { prefKey: entry.key, prefName: entry.name };
    }
  }
  return null;
}

/**
 * HTMLからJSON-LDブロックを全て抽出しパースする
 * @param {string} html
 * @returns {Object[]} パース済みJSON-LDオブジェクトの配列
 */
function extractJsonLd(html) {
  const results = [];
  const re = /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    } catch {
      // JSON parse 失敗はスキップ
    }
  }
  return results;
}

/**
 * JSON-LDオブジェクトからEventタイプのものを抽出
 * @param {Object[]} jsonLdItems
 * @returns {Object[]} @type === "Event" のオブジェクトのみ
 */
function filterEvents(jsonLdItems) {
  const events = [];
  for (const item of jsonLdItems) {
    if (!item || typeof item !== "object") continue;
    const type = item["@type"];
    if (type === "Event") {
      events.push(item);
    } else if (Array.isArray(item["@graph"])) {
      // @graph 内にEvent が含まれる場合
      for (const sub of item["@graph"]) {
        if (sub && sub["@type"] === "Event") events.push(sub);
      }
    }
  }
  return events;
}

/**
 * "2026-02-24" 形式の日付文字列をパース
 * @param {string} dateStr
 * @returns {{ y: number, mo: number, d: number } | null}
 */
function parseIsoDate(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, mo, d };
}

/**
 * キーワードフィルタ: タイトル or 説明文に子育て関連キーワードが含まれるか
 * @param {string} title
 * @param {string} description
 * @param {string[]} keywords
 * @returns {boolean}
 */
function matchesChildKeywords(title, description, keywords) {
  if (!keywords || keywords.length === 0) return true;
  const text = `${title} ${description}`;
  for (const kw of keywords) {
    if (text.includes(kw)) return true;
  }
  return false;
}

/**
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {number[]} config.prefectureIds - JIS都道府県ID配列 (例: [1, 2, 3, ...])
 * @param {string[]} [config.childKeywords] - 子育てキーワードフィルタ
 * @param {Object} deps - { geocodeForWard, resolveEventPoint, resolveEventAddress }
 */
function createIkoyoCollector(config, deps) {
  const { source, prefectureIds, childKeywords } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const label = source.label || "いこーよ";

  return async function collectIkoyoEvents(maxDays) {
    const byUrl = new Map(); // URL で重複排除

    for (const prefId of prefectureIds) {
      const pref = PREF_BY_ID[prefId];
      if (!pref) {
        console.warn(`[${label}] unknown prefecture ID: ${prefId}`);
        continue;
      }

      let page = 1;
      let emptyPages = 0;
      const MAX_PAGES = 2; // 30件/県 上限 (4県×2ページ×~3s=24s — ペア実行時も45s内)

      while (page <= MAX_PAGES) {
        // Rate limit: 1秒間隔
        if (page > 1) {
          await new Promise(r => setTimeout(r, 1000));
        }

        const url = `https://iko-yo.net/events?page=${page}&prefecture_ids[]=${prefId}`;
        let html;
        try {
          html = await fetchText(url);
        } catch (e) {
          console.warn(`[${label}] fetch failed ${pref.name} page=${page}:`, e.message || e);
          break;
        }

        // JSON-LDを抽出
        const jsonLdItems = extractJsonLd(html);
        const events = filterEvents(jsonLdItems);

        if (events.length === 0) {
          emptyPages++;
          // 2ページ連続空なら終了 (ネットワーク一時エラー対策)
          if (emptyPages >= 2) break;
          page++;
          continue;
        }
        emptyPages = 0;

        let addedThisPage = 0;
        for (const ev of events) {
          const title = (ev.name || "").trim();
          if (!title) continue;

          // URL: JSON-LDに無い場合はスキップ (ページHTMLからの抽出は困難)
          const eventUrl = (ev.url || "").trim();
          if (!eventUrl) continue;

          // URL重複排除
          if (byUrl.has(eventUrl)) continue;

          const description = (ev.description || "").trim();

          // キーワードフィルタ
          if (!matchesChildKeywords(title, description, childKeywords)) continue;

          // 日付パース
          const startDate = parseIsoDate(ev.startDate);
          const endDate = parseIsoDate(ev.endDate);
          if (!startDate && !endDate) continue;

          // 範囲チェック: いこーよは期間イベント (startDate=開始日, endDate=終了日)
          // endDate が今日以降 かつ startDate が maxDays 以内なら範囲内
          const checkDate = endDate || startDate;
          if (!inRangeJst(checkDate.y, checkDate.mo, checkDate.d, maxDays)) continue;

          // Location 情報
          const location = ev.location || {};
          const venueName = sanitizeVenueText(typeof location.name === "string" ? location.name.trim() : "");
          // address は PostalAddress オブジェクト or 文字列
          let rawAddress = "";
          if (typeof location.address === "string") {
            rawAddress = location.address.trim();
          } else if (location.address && typeof location.address === "object") {
            rawAddress = (location.address.addressLocality || location.address.addressRegion || "").trim();
          }

          // 都道府県をアドレスから検出してソースキーを決定
          const prefInfo = detectPrefFromAddress(rawAddress) || { prefKey: pref.key, prefName: pref.name };
          const srcKey = `ikoyo_${prefInfo.prefKey}`;

          // ジオコーディングはスキップ (45sタイムアウト対策)
          // facilityMaster 経由で座標が取れる場合のみ使用
          const geoSource = { ...source, key: srcKey, label: venueName || label };
          let point = resolveEventPoint(geoSource, venueName, null, rawAddress);
          const resolvedAddress = resolveEventAddress(geoSource, venueName, rawAddress, point);

          // 時刻情報なし → timeUnknown
          // starts_at は today (期間開始が過去の場合) or startDate
          const effectiveStart = startDate || checkDate;
          const { startsAt, endsAt } = buildStartsEndsForDate(effectiveStart, null);

          // endDate が startDate と異なる場合、ends_at を endDate の終日に設定
          let finalEndsAt = endsAt;
          if (endDate && (endDate.y !== startDate.y || endDate.mo !== startDate.mo || endDate.d !== startDate.d)) {
            const { startsAt: endDayStart } = buildStartsEndsForDate(endDate, null);
            finalEndsAt = endDayStart;
          }

          const dateKey = `${effectiveStart.y}${String(effectiveStart.mo).padStart(2, "0")}${String(effectiveStart.d).padStart(2, "0")}`;
          const id = `${srcKey}:${eventUrl}:${title}:${dateKey}`;

          byUrl.set(eventUrl, {
            id,
            source: srcKey,
            source_label: `いこーよ(${prefInfo.prefName})`,
            title,
            starts_at: startsAt,
            ends_at: finalEndsAt,
            venue_name: venueName || "",
            address: resolvedAddress || rawAddress || "",
            url: eventUrl,
            lat: point ? point.lat : null,
            lng: point ? point.lng : null,
          });
          addedThisPage++;
        }

        // このページで追加候補が0件 (全部重複 or フィルタ除外) でも次のページに進む
        // ただし JSON-LD にイベントが15件未満なら最終ページ
        if (events.length < 15) break;

        page++;
      }

      // 都道府県間でも Rate limit
      await new Promise(r => setTimeout(r, 1000));
    }

    const results = Array.from(byUrl.values());
    console.log(`[${label}] ${results.length} events collected from ${prefectureIds.length} prefectures`);
    return results;
  };
}

module.exports = { createIkoyoCollector, PREF_BY_ID };
