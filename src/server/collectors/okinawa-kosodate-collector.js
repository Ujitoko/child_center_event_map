/**
 * おきなわ子育て応援パスポート イベントコレクター
 * https://www.kosodate.pref.okinawa.jp/events
 *
 * CakePHP。リストページからイベントURLを取得し、
 * 詳細ページの JSON-LD (Event schema) から日付・会場・住所を抽出。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const SITE_BASE = "https://www.kosodate.pref.okinawa.jp";
const LIST_URL = `${SITE_BASE}/events`;
const DETAIL_BATCH = 3;

/**
 * リストページからイベントリンクを抽出
 * <a href="/events/view/243">...</a>
 */
function parseListPage(html) {
  const events = [];
  // Each event is in a <li class="clearfix"> block
  const liRe = /<li\s+class="clearfix">([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const content = m[1];

    // Skip past events (have 終了しました badge)
    if (content.includes("終了しました")) continue;

    // Extract URL from href="/events/view/NNN"
    const hrefM = content.match(/href="(\/events\/view\/\d+)"/);
    if (!hrefM) continue;
    const href = hrefM[1];

    // Extract title from <h4><a>TITLE</a></h4>
    const titleM = content.match(/<h4[^>]*><a[^>]*>([\s\S]*?)<\/a><\/h4>/i);
    const title = titleM ? stripTags(titleM[1]).trim() : "";
    if (!title) continue;

    // Extract date from "YYYY-MM-DD ～ YYYY-MM-DD" pattern (fullwidth ～ or ASCII ~)
    const dateM = content.match(/(\d{4})-(\d{2})-(\d{2})\s*[~～]\s*(\d{4})-(\d{2})-(\d{2})/);
    let startDate = null;
    let endDate = null;
    if (dateM) {
      startDate = { y: Number(dateM[1]), mo: Number(dateM[2]), d: Number(dateM[3]) };
      endDate = { y: Number(dateM[4]), mo: Number(dateM[5]), d: Number(dateM[6]) };
    }

    // Extract venue+address from 開催場所 line
    let venue = "";
    let address = "";
    const placeM = content.match(/開催場所[：:]\s*([\s\S]*?)(?:<\/p>|<img)/i);
    if (placeM) {
      const placeText = stripTags(placeM[1]).trim();
      const parenM = placeText.match(/^(.+?)[（(](.*?)[）)]\s*$/);
      if (parenM) {
        venue = parenM[1].trim();
        address = parenM[2].trim();
      } else {
        venue = placeText;
      }
    }

    events.push({
      url: `${SITE_BASE}${href}`,
      title,
      startDate,
      endDate,
      venue,
      address,
    });
  }
  return events;
}

/**
 * 詳細ページの JSON-LD から情報を抽出
 */
function parseDetailJsonLd(html) {
  if (!html) return null;

  const ldRe = /<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(html)) !== null) {
    const block = m[1];
    if (!block.includes('"Event"')) continue;

    try {
      const data = JSON.parse(block);
      if (data["@type"] !== "Event") continue;

      // Parse startDate/endDate from ISO format
      const startM = (data.startDate || "").match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      const endM = (data.endDate || "").match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);

      const result = {
        startDate: startM ? { y: Number(startM[1]), mo: Number(startM[2]), d: Number(startM[3]) } : null,
        startHour: startM ? Number(startM[4]) : null,
        startMinute: startM ? Number(startM[5]) : null,
        endHour: endM ? Number(endM[4]) : null,
        endMinute: endM ? Number(endM[5]) : null,
      };

      // Location
      if (data.location) {
        const locAddr = data.location.address || "";
        // Parse "Venue（Address）" pattern
        const parenM = locAddr.match(/^(.+?)[（(](.*?)[）)]\s*$/);
        if (parenM) {
          result.venue = parenM[1].trim();
          result.address = parenM[2].trim();
        } else {
          result.venue = locAddr;
        }
        if (data.location.sameAs) result.sourceUrl = data.location.sameAs;
      }

      return result;
    } catch (_e) { /* JSON parse error, try next block */ }
  }
  return null;
}

function createOkinawaKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectOkinawaKosodateEvents(maxDays) {
    // Step 1: Fetch list page (page 1 only — has most recent events)
    let listEvents;
    try {
      const html = await fetchText(LIST_URL, { timeout: 30000 });
      if (!html) return [];
      listEvents = parseListPage(html);
    } catch (e) {
      console.warn(`[${label}] list fetch failed:`, e.message || e);
      return [];
    }

    if (listEvents.length === 0) return [];

    // Pre-filter to future events using endDate (period events: endDate >= today)
    const futureEvents = listEvents.filter(ev => {
      const d = ev.endDate || ev.startDate;
      return d && inRangeJst(d.y, d.mo, d.d, maxDays);
    });
    if (futureEvents.length === 0) return [];

    // Step 2: Fetch detail pages for JSON-LD
    const byId = new Map();

    for (let i = 0; i < futureEvents.length; i += DETAIL_BATCH) {
      const batch = futureEvents.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (ev) => {
          const html = await fetchText(ev.url, { timeout: 30000 });
          const jsonLd = parseDetailJsonLd(html);
          return { ev, jsonLd };
        })
      );

      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const { ev, jsonLd } = r.value;

        // Use JSON-LD date if available, else fallback to list date
        const dd = jsonLd?.startDate || ev.startDate;
        if (!dd || !inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        // Time from JSON-LD (UTC → JST: +9 hours)
        let startHour = jsonLd?.startHour ?? null;
        let startMinute = jsonLd?.startMinute ?? null;
        let endHour = jsonLd?.endHour ?? null;
        let endMinute = jsonLd?.endMinute ?? null;

        // Convert UTC to JST (+9)
        if (startHour !== null) {
          startHour += 9;
          if (startHour >= 24) startHour -= 24;
        }
        if (endHour !== null) {
          endHour += 9;
          if (endHour >= 24) endHour -= 24;
        }
        // Skip midnight times (no time info)
        if (startHour === 9 && startMinute === 0 && endHour === 9 && endMinute === 0) {
          startHour = null; startMinute = null; endHour = null; endMinute = null;
        }

        const timeRange = { startHour, startMinute, endHour, endMinute };

        // Venue & address
        const venue = sanitizeVenueText(jsonLd?.venue || ev.venue);
        const addr = sanitizeAddressText(jsonLd?.address || ev.address);

        // Geocoding
        const candidates = [];
        if (addr) {
          const full = addr.includes("沖縄") ? addr : `沖縄県${addr}`;
          candidates.push(full);
        }
        if (venue) candidates.push(`沖縄県 ${venue}`);

        let point = await geocodeForWard(candidates.slice(0, 3), source);
        const addrFallback = addr || (venue ? `沖縄県 ${venue}` : "沖縄県");
        point = resolveEventPoint(source, venue, point, addrFallback);
        const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue || "",
          address: resolvedAddress || addr || "",
          url: ev.url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          time_unknown: !timeRange || timeRange.startHour === null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createOkinawaKosodateCollector };
