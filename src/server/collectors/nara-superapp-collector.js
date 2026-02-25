/**
 * 奈良スーパーアプリ イベントコレクター
 * https://event.nsa.pref.nara.jp/list/?category=17
 *
 * Next.js SSR site。カテゴリ17（子育て・子ども向け）のリストページを
 * 1ページ20件で巡回し、タイトル・日付・住所・会場名を抽出。
 * 全データがリストに含まれるため詳細ページへの遷移不要。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const SITE_BASE = "https://event.nsa.pref.nara.jp";
const MAX_PAGES = 12; // 203 events / 20 per page ≈ 11 pages

/**
 * リストページHTMLからイベントカードを抽出
 * <a href="/events/ULID"> ... <h3>TITLE</h3> ... 期間 ... 場所 ... </a>
 */
function parseListCards(html) {
  const cards = [];
  // Match each event card link (h3 with MuiTypography-h6 = main cards, not sidebar)
  const cardRe = /<a[^>]+href="(\/events\/[A-Z0-9]{26})"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*MuiTypography-h6[^"]*"[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const eventPath = m[1];
    const title = stripTags(m[2]).trim();
    const body = m[3];
    if (!title) continue;

    // Extract date from 期間 cell
    let dateText = "";
    const dateM = body.match(/<td[^>]*>期間<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
    if (dateM) dateText = stripTags(dateM[1]).trim();

    // Extract address and venue from 場所 cell
    let address = "";
    let venue = "";
    const placeM = body.match(/<td[^>]*>場所<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
    if (placeM) {
      const placeHtml = placeM[1];
      // Address in first div after SVG icon
      const addrM = placeHtml.match(/class="css-70qvj9"[^>]*>([\s\S]*?)<\/div>/i);
      if (addrM) address = stripTags(addrM[1]).trim();
      // Venue name in second div
      const venueM = placeHtml.match(/class="css-1fhgjcy"[^>]*>([\s\S]*?)<\/div>/i);
      if (venueM) venue = stripTags(venueM[1]).trim();
    }

    cards.push({
      url: `${SITE_BASE}${eventPath}`,
      title,
      dateText,
      address,
      venue,
    });
  }
  return cards;
}

/**
 * 日付テキストから年月日を抽出
 * "2026年2月25日(水)" or "2026年2月18日(水)〜2026年2月25日(水)"
 * 範囲の場合は各日を展開せず始点・終点のみ返す
 */
function parseDatesFromText(text) {
  if (!text) return [];
  const dates = [];
  const re = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  return dates;
}

function createNaraSuperappCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectNaraSuperappEvents(maxDays) {
    const allCards = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const url = `${SITE_BASE}/list/?category=17&page=${page}`;
        const html = await fetchText(url);
        if (!html) break;
        const cards = parseListCards(html);
        if (cards.length === 0) break;
        allCards.push(...cards);
      } catch (e) {
        if (page === 1) {
          console.warn(`[${label}] list fetch failed:`, e.message || e);
          return [];
        }
        break;
      }
    }

    if (allCards.length === 0) return [];

    const byId = new Map();

    for (const card of allCards) {
      const dates = parseDatesFromText(card.dateText);
      if (dates.length === 0) continue;

      const venue = sanitizeVenueText(card.venue);
      const addr = sanitizeAddressText(card.address);

      // Geocoding
      const candidates = [];
      if (addr) {
        const full = addr.includes("奈良") ? addr : `奈良県${addr}`;
        candidates.push(full);
      }
      if (venue) candidates.push(`奈良県 ${venue}`);

      let point = await geocodeForWard(candidates.slice(0, 3), source);
      const addrFallback = addr || (venue ? `奈良県 ${venue}` : "奈良県");
      point = resolveEventPoint(source, venue, point, addrFallback);
      const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

      for (const dd of dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const id = `${srcKey}:${card.url}:${card.title}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(dd, {
          startHour: null, startMinute: null, endHour: null, endMinute: null,
        });

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: card.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue || "",
          address: resolvedAddress || addr || "",
          url: card.url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          time_unknown: true,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createNaraSuperappCollector };
