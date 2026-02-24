const vm = require("vm");
const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst, parseTimeRangeFromText } = require("../date-utils");
const { TACHIKAWA_SOURCE } = require("../../config/wards");
const KNOWN_TACHIKAWA_FACILITIES = require("../../config/known-facilities").tachikawa;

/** place2 をパース: 施設名と住所候補を抽出 */
function parsePlace2(raw) {
  if (!raw) return { venue: "", address: "" };
  let text = String(raw)
    .replace(/&nbsp;/gi, " ")
    .replace(/\t+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\[[^\]]*\]/g, "")
    .trim();
  // オンラインイベントはスキップ
  if (/オンライン|Zoom/i.test(text)) return { venue: "", address: "" };
  // 「所在地」から住所を抽出、「電話番号」「ファクス」を除去
  let embedded = "";
  const locMatch = text.match(/所在地\s*(立川市[^\s電ファ]+)/);
  if (locMatch) embedded = locMatch[1].trim();
  text = text.replace(/所在地\s*[^\s]+/g, "").trim();
  text = text.replace(/電話番号\s*[\d-]+/g, "").trim();
  text = text.replace(/ファクス\s*[\d-]+/g, "").trim();
  // "(1)A (2)B" 形式 → 最初の会場のみ
  const numberedMatch = text.match(/[（(][12１２][）)]\s*([^（(]+)/);
  if (numberedMatch) text = numberedMatch[1].trim();
  // 注釈部分を除去
  const noteIdx = text.search(/[（(]正門|[（(]注意/);
  if (noteIdx > 0) text = text.slice(0, noteIdx).trim();
  // 括弧内の住所を抽出
  let address = "";
  const addrMatch = text.match(/[（(]([^）)]*\d+[-ー－]\d+[^）)]*)[）)]/);
  if (addrMatch) {
    address = addrMatch[1].trim();
    text = text.replace(/[（(][^）)]*[）)]/g, "").trim();
  } else {
    text = text.replace(/[（(][ぁ-ん]+[）)]/g, "").trim();
  }
  // 部屋名・階数・フロア情報を除去
  const venue = text
    .replace(/\s*\d+階.*$/, "")
    .replace(/\s+(健康増進室|集会室|講座室|保育室|和室|会議室|多目的室|研修室|料理室|講堂|学習室|作業室|健康サロン).*$/, "")
    .replace(/\s+\d+\s*(会議室|学習室|和室|講堂).*$/, "")
    .replace(/\s+他$/, "")
    .trim();
  return { venue: venue || text, address: address || embedded };
}

/** 会場名からジオコーディング候補リストを構築 */
function buildGeoCandidates(venue, address) {
  const candidates = [];
  const normalized = venue.replace(/[\s　・･]/g, "");
  for (const [name, addr] of Object.entries(KNOWN_TACHIKAWA_FACILITIES)) {
    const normName = name.replace(/[\s　・･]/g, "");
    if (normalized.includes(normName)) {
      candidates.unshift(/東京都/.test(addr) ? addr : `東京都${addr}`);
      break;
    }
  }
  if (address) {
    const cityAddr = /立川市/.test(address) ? address : `立川市${address}`;
    candidates.push(/東京都/.test(cityAddr) ? cityAddr : `東京都${cityAddr}`);
  }
  if (venue) {
    candidates.push(`東京都立川市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectTachikawaEvents(deps) {
  const { geocodeForWard, resolveEventPoint } = deps;

  return async function collectTachikawaEvents(maxDays) {
    const source = `ward_${TACHIKAWA_SOURCE.key}`;
    const label = TACHIKAWA_SOURCE.label;
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    let eventData;
    try {
      const jsText = await fetchText(`${TACHIKAWA_SOURCE.baseUrl}/event.js`);
      const ctx = {};
      vm.runInNewContext(jsText, ctx);
      eventData = ctx.event_data;
    } catch (e) {
      console.warn(`[${label}] event.js fetch/parse failed:`, e.message || e);
      return [];
    }

    if (!eventData || !Array.isArray(eventData.events)) {
      console.warn(`[${label}] event_data.events is not an array`);
      return [];
    }

    // カテゴリ "30"(子ども・子育て) でフィルタ
    const childEvents = eventData.events.filter((ev) => {
      const cats = Array.isArray(ev.category) ? ev.category : [];
      const tags = Array.isArray(ev.hashtag) ? ev.hashtag : [];
      return cats.includes("30") || tags.includes("30");
    });

    const candidates = [];
    for (const item of childEvents) {
      if (!item.eventtitle || !Array.isArray(item.opendays)) continue;

      const { venue, address } = parsePlace2(item.place2 || "");
      // 会場名がないイベント（オンライン等）はスキップ
      if (!venue) continue;

      let timeRange = null;
      if (Array.isArray(item.times) && item.times.length > 0) {
        for (const t of item.times) {
          timeRange = parseTimeRangeFromText(String(t));
          if (timeRange) break;
        }
      }
      if (!timeRange && item.time_texts) {
        timeRange = parseTimeRangeFromText(String(item.time_texts));
      }

      const eventUrl = item.url
        ? `${TACHIKAWA_SOURCE.baseUrl}${item.url}`
        : TACHIKAWA_SOURCE.baseUrl;

      for (const day of item.opendays) {
        const dateKey = String(day).replace(/\//g, "-");
        if (dateKey < todayStr || dateKey > endStr) continue;

        let startsAt, endsAt;
        if (timeRange && timeRange.startHour !== null) {
          const sh = String(timeRange.startHour).padStart(2, "0");
          const sm = String(timeRange.startMinute || 0).padStart(2, "0");
          startsAt = `${dateKey}T${sh}:${sm}:00+09:00`;
          if (timeRange.endHour !== null) {
            const eh = String(timeRange.endHour).padStart(2, "0");
            const em = String(timeRange.endMinute || 0).padStart(2, "0");
            endsAt = `${dateKey}T${eh}:${em}:00+09:00`;
          } else {
            endsAt = null;
          }
        } else {
          startsAt = `${dateKey}T00:00:00+09:00`;
          endsAt = null;
        }

        candidates.push({
          title: item.eventtitle,
          url: eventUrl,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue,
          address_hint: address,
          source,
          source_label: label,
          dateKey: dateKey.replace(/-/g, ""),
        });
      }
    }

    // 重複除去 (title + dateKey)
    const seen = new Set();
    const unique = [];
    for (const c of candidates) {
      const key = `${c.title}:${c.dateKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(c);
    }

    // ジオコーディング
    const results = [];
    for (const ev of unique) {
      let point = null;
      if (ev.venue_name) {
        const geoCandidates = buildGeoCandidates(ev.venue_name, ev.address_hint);
        point = await geocodeForWard(geoCandidates, TACHIKAWA_SOURCE);
        point = resolveEventPoint(TACHIKAWA_SOURCE, ev.venue_name, point, `立川市 ${ev.venue_name}`);
      }
      results.push({
        id: `${source}:${ev.url}:${ev.title}:${ev.dateKey}`,
        source,
        source_label: label,
        title: ev.title,
        starts_at: ev.starts_at,
        ends_at: ev.ends_at,
        venue_name: ev.venue_name,
        address: ev.venue_name ? `立川市 ${ev.venue_name}` : "",
        url: ev.url,
        lat: point ? point.lat : TACHIKAWA_SOURCE.center.lat,
        lng: point ? point.lng : TACHIKAWA_SOURCE.center.lng,
        point: point || TACHIKAWA_SOURCE.center,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectTachikawaEvents };
