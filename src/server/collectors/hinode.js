const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const HINODE_SOURCE_KEY = "hinode";
const BASE_URL = "https://www.town.hinode.tokyo.jp";

const CHILD_KEYWORDS_RE =
  /子育て|子ども|親子|乳幼児|幼児|赤ちゃん|ベビー|おはなし|リトミック|ママ|パパ|離乳食|健診|マタニティ|保育|児童|キッズ|読み聞かせ/;

/**
 * イベント一覧ページからリンクと日付を抽出
 * HTML構造: 日付テキスト + <a href="../NNNNN.html">タイトル</a> + [掲載日]
 */
function parseEventListPage(html) {
  const events = [];
  // <li> ごとに抽出: <p>日付</p>...<a href="URL">タイトル</a>
  const liRe = /<li>\s*<p>(\d{4})年(\d{1,2})月(\d{1,2})日[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const href = m[4].replace(/&amp;/g, "&").trim();
    const title = stripTags(m[5]).trim();
    if (!title || !href) continue;
    let absUrl;
    if (href.startsWith("http")) {
      absUrl = href;
    } else if (href.startsWith("../")) {
      absUrl = `${BASE_URL}/${href.replace(/^\.\.\//, "")}`;
    } else {
      absUrl = `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    }
    events.push({ y, mo, d, title, url: absUrl });
  }
  return events;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("日の出町") ? address : `西多摩郡日の出町${address}`;
    candidates.push(`東京都${full}`);
  }
  if (venue) {
    candidates.push(`東京都西多摩郡日の出町 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectHinodeEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const HINODE_SOURCE = require("../../config/wards").HINODE_SOURCE;

  return async function collectHinodeEvents(maxDays) {
    const source = `ward_${HINODE_SOURCE.key}`;
    const label = HINODE_SOURCE.label;

    // 当月と翌月のイベント一覧を取得
    const pages = ["event/curr_1.html", "event/next_1.html"];
    const rawEvents = [];
    for (const page of pages) {
      try {
        const html = await fetchText(`${BASE_URL}/${page}`);
        rawEvents.push(...parseEventListPage(html));
      } catch (e) {
        console.warn(`[${label}] ${page} fetch failed:`, e.message || e);
      }
    }

    // 子育て関連フィルタ
    const childEvents = rawEvents.filter((ev) => CHILD_KEYWORDS_RE.test(ev.title));

    // 重複除去
    const uniqueMap = new Map();
    for (const ev of childEvents) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, ev);
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map((e) => e.url))].slice(0, 30);
    const detailMap = new Map();
    for (const url of detailUrls) {
      try {
        const html = await fetchText(url);
        const meta = parseDetailMeta(html);
        const plainText = stripTags(html);
        const timeRange = parseTimeRangeFromText(plainText);
        if (!meta.venue) {
          const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
          if (placeMatch) {
            let v = placeMatch[1].trim();
            v = v.replace(/\s*(?:住所|駐車|対象|定員|電話|内容|持ち物|日時|費用|備考).*$/, "").trim();
            if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) meta.venue = v;
          }
        }
        detailMap.set(url, { meta, timeRange });
      } catch (e) { /* skip */ }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(HINODE_SOURCE.key, venue);
        if (fmAddr) {
          const full = /東京都/.test(fmAddr) ? fmAddr : `東京都${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), HINODE_SOURCE);
      point = resolveEventPoint(HINODE_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(HINODE_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const id = `${source}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source,
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

module.exports = { createCollectHinodeEvents };
