const { normalizeText, normalizeJaDigits, sanitizeVenueText } = require("../text-utils");
const { isJunkVenueName } = require("../venue-utils");
const { fetchText } = require("../fetch-utils");
const { stripTags, parseAnchors } = require("../html-utils");
const {
  parseYmdFromJst,
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
  parseOtaDatesFromText,
  parseYmdFromJpText,
} = require("../date-utils");
const { extractTokyoAddress } = require("../address-utils");
const { SHIBUYA_SOURCE, SHIBUYA_NEUVOLA_BASE, SHIBUYA_FRIENDS_BASE } = require("../../config/wards");

function parseShibuyaNeuvolaArchiveRows(html, pageUrl) {
  const out = [];
  const liRe = /<li>\s*<span class="label">([\s\S]*?)<\/span>\s*<a href="([^"]+)">[\s\S]*?<p class="ttl">([\s\S]*?)<\/p>[\s\S]*?<p class="pubDate">([\s\S]*?)<\/p>[\s\S]*?<div class="auther">[\s\S]*?<span>([\s\S]*?)<\/span>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const label = normalizeText(stripTags(m[1]));
    const hrefRaw = String(m[2] || "").trim();
    const title = normalizeText(stripTags(m[3]));
    const pubDate = normalizeText(stripTags(m[4]));
    const author = normalizeText(stripTags(m[5]));
    if (!hrefRaw || !title) continue;
    let absUrl = "";
    try { absUrl = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, pageUrl).toString(); } catch { continue; }
    out.push({ label, url: absUrl, title, pubDate, author });
  }
  return out;
}

function parseShibuyaNeuvolaDetailMeta(html) {
  const title = normalizeText(stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ""));
  const summary = (html.match(/<div class="eventSummary">([\s\S]*?)<\/div>/i) || [])[1] || "";
  const postHtml = (html.match(/<div class="postContent">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="entry">/i) || [])[1] || html;
  const postText = normalizeJaDigits(normalizeText(stripTags(postHtml)));
  const summaryText = normalizeJaDigits(normalizeText(stripTags(summary)));
  const bodyText = normalizeText(`${summaryText} ${postText}`);
  const fieldMap = new Map();
  const pRe = /<p>([\s\S]*?)<\/p>/gi;
  let p;
  while ((p = pRe.exec(summary)) !== null) {
    const line = normalizeJaDigits(normalizeText(stripTags(p[1])));
    const fm = line.match(/^([^:：・]{1,20})[:：・]\s*(.+)$/);
    if (!fm) continue;
    fieldMap.set(fm[1], fm[2]);
  }
  const dateHint = fieldMap.get("日時") || ((bodyText.match(/(?:開催日時|日時|Date)\s*[:：・]\s*([^\n]{1,120})/i) || [])[1] || "");
  const timeHint = fieldMap.get("時間") || ((bodyText.match(/(?:時間|Time)\s*[:：・]\s*([^\n]{1,80})/i) || [])[1] || "");
  const venueHint = fieldMap.get("開催場所") || fieldMap.get("場所") || ((bodyText.match(/(?:開催場所|場所)\s*[:：・]\s*([^\n]{1,80})/i) || [])[1] || "");
  const venueName = normalizeText(String(venueHint || "").split(/(?:締め切り|予約方法|対象|定員|費用)/)[0]).slice(0, 80);
  const now = parseYmdFromJst(new Date());
  const dates = parseOtaDatesFromText(`${dateHint} ${title} ${bodyText}`, now.y, now.m);
  const timeRange = parseTimeRangeFromText(`${timeHint} ${dateHint} ${title} ${bodyText}`);
  const address = extractTokyoAddress(bodyText);
  return { title, dates, timeRange, venue_name: venueName, address, bodyText };
}

function parseShibuyaFriendsArchiveRows(html, pageUrl) {
  const out = [];
  const blockRe = /<a[^>]+href="([^"]*\/friends_event\/[^"]*)"[^>]*>\s*<dl class="event_list">([\s\S]*?)<\/dl>\s*<\/a>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    const block = m[2] || "";
    if (!hrefRaw) continue;
    let url = "";
    try { url = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, pageUrl).toString(); } catch { continue; }
    const title = normalizeText(stripTags((block.match(/<div[^>]*class="event_name"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || ""));
    const desc = normalizeText(stripTags((block.match(/<div[^>]*class="event_date"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || ""));
    const isPast = /\/images\/event\/past\.png/i.test(block);
    if (!title) continue;
    out.push({ url, title, desc, isPast });
  }
  return out;
}

function parseShibuyaFriendsDetailMeta(html) {
  const title =
    normalizeText(stripTags((html.match(/<h2[^>]*class="news_ti_h2"[^>]*>([\s\S]*?)<\/h2>/i) || [])[1] || "")) ||
    normalizeText(stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").split("|")[0]);
  const topicPath = (html.match(/<div[^>]*class="container2 txt_left"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "";
  const bodyHtml = (html.match(/<div[^>]*class="main content_wp"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<div class="cleardiv">/i) || [])[1] || html;
  const bodyText = normalizeJaDigits(normalizeText(stripTags(bodyHtml)));
  const topicText = normalizeJaDigits(normalizeText(stripTags(topicPath)));
  const now = parseYmdFromJst(new Date());
  const topicDate = parseYmdFromJpText(topicText);
  let dates = parseOtaDatesFromText(`${title} ${bodyText}`, now.y, now.m);
  if (dates.length === 0 && topicDate) dates = [topicDate];
  const timeRange = parseTimeRangeFromText(`${title} ${bodyText}`);
  let venue_name = "渋谷区児童青少年センター フレンズ本町";
  const venueMatch = normalizeText(`${title} ${bodyText}`).match(/([^\s]{2,40}(?:児童館|児童センター|子育て支援センター|ひろば|フレンズ本町))/u);
  if (venueMatch) venue_name = venueMatch[1];
  const address = extractTokyoAddress(bodyText);
  return { title, dates, timeRange, venue_name, address, bodyText };
}

function buildShibuyaGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => { const t = normalizeText(x); if (!t) return; if (!cands.includes(t)) cands.push(t); };
  if (address) { if (!/(東京都|渋谷区)/.test(address)) add(`東京都渋谷区${address}`); add(address); }
  if (venue) add(`東京都渋谷区${venue}`);
  if (title) add(`東京都渋谷区${title}`);
  return cands;
}

function parseShibuyaBlocksFromKodomoHtml(html) {
  const mainHtml = (String(html || "").match(/<main[^>]*>([\s\S]*?)<\/main>/i) || [])[1] || String(html || "");
  const cleanedHtml = mainHtml.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = normalizeJaDigits(stripTags(cleanedHtml)).replace(/\s+/g, " ");
  const sentences = text
    .split(/[。！？]/)
    .map((x) => normalizeText(x))
    .filter(Boolean);
  const jidokanRe = /(児童館|子育てひろば)/u;
  const now = parseYmdFromJst(new Date());
  const out = [];

  for (let i = 0; i < sentences.length; i += 1) {
    const prev = i > 0 ? sentences[i - 1] : "";
    const cur = sentences[i];
    const next = i + 1 < sentences.length ? sentences[i + 1] : "";
    const block = normalizeText(`${prev} ${cur} ${next}`);
    if (!jidokanRe.test(block)) continue;
    const dates = parseOtaDatesFromText(block, now.y, now.m);
    if (dates.length === 0) continue;
    const timeRange = parseTimeRangeFromText(block);
    const vm = block.match(/([^\s]{2,60}(?:児童館|子育てひろば))/u);
    const venue = vm ? vm[1] : "渋谷区児童館";
    out.push({
      title: (cur || block).slice(0, 120),
      dates,
      timeRange,
      venue_name: venue,
      address: "",
    });
  }
  return out;
}

function createCollectShibuyaJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  async function collectShibuyaJidokanEvents(maxDays) {
    const rows = [];
    for (let page = 1; page <= 8; page += 1) {
      const listUrl = page === 1 ? `${SHIBUYA_NEUVOLA_BASE}/event/` : `${SHIBUYA_NEUVOLA_BASE}/event/page/${page}/`;
      let listHtml = "";
      try {
        listHtml = await fetchText(listUrl);
      } catch (e) {
        if (page === 1) {
          console.warn("[shibuya] neuvola list fetch failed:", e.message || e);
          return [];
        }
        break;
      }
      const parsed = parseShibuyaNeuvolaArchiveRows(listHtml, listUrl);
      if (parsed.length === 0) break;
      rows.push(...parsed);
    }

    const uniqRows = [];
    const seen = new Set();
    for (const row of rows) {
      if (seen.has(row.url)) continue;
      seen.add(row.url);
      uniqRows.push(row);
    }

    const byId = new Map();
    const neuvolaItems = uniqRows.slice(0, 220);
    const neuvolaConcurrency = 6;
    let neuvolaIdx = 0;
    async function neuvolaWorker() {
      while (neuvolaIdx < neuvolaItems.length) {
        const ni = neuvolaIdx; neuvolaIdx += 1;
        const row = neuvolaItems[ni];
      let detailHtml = "";
      try {
        detailHtml = await fetchText(row.url);
      } catch {
        continue;
      }

      const meta = parseShibuyaNeuvolaDetailMeta(detailHtml);
      const title = meta.title || row.title;
      const keepHint = /(児童|子育て|ひろば|親子|育児|赤ちゃん|ベビー|キッズ|乳幼児|プログラム|講座|教室|工作|読み聞かせ|co渋谷|co\s*shibuya|coしぶや|景丘|おたんじょう|保護者|ファミリー|マタニティ|プレママ|プレパパ|子連れ|ねんね|ハイハイ|よちよち|パパママ|子ども|こども|ペアレンツ|離乳食|絵本|小学生|中学生)/i;
      if (!keepHint.test(`${title} ${meta.bodyText || ""} ${row.author || ""}`)) continue;
      if (!meta.dates || meta.dates.length === 0) continue;

      let venueName = sanitizeVenueText(meta.venue_name) || row.author || "渋谷区子育てイベント";
      if (isJunkVenueName(venueName)) venueName = "渋谷区子育てイベント";
      let rawAddress = meta.address || extractTokyoAddress(meta.bodyText || "");
      if (!rawAddress && getFacilityAddressFromMaster) {
        rawAddress = getFacilityAddressFromMaster(SHIBUYA_SOURCE.key, venueName);
      }
      const geoCandidates = buildShibuyaGeoCandidates(title, venueName, rawAddress);
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(SHIBUYA_SOURCE.key, venueName);
        if (fmAddr && fmAddr !== rawAddress) {
          const fmCands = buildShibuyaGeoCandidates("", venueName, fmAddr);
          for (let ci = fmCands.length - 1; ci >= 0; ci--) {
            if (!geoCandidates.includes(fmCands[ci])) geoCandidates.unshift(fmCands[ci]);
          }
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), SHIBUYA_SOURCE);
      point = resolveEventPoint(SHIBUYA_SOURCE, venueName, point, rawAddress);
      const address = resolveEventAddress(SHIBUYA_SOURCE, venueName, rawAddress, point);

      for (const d of meta.dates) {
        if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
        const { startsAt, endsAt } = buildStartsEndsForDate(d, meta.timeRange, 10);
        const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
        const id = `ward:shibuya:${row.url}:${title}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: "ward_shibuya",
          source_label: SHIBUYA_SOURCE.label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          updated_at: startsAt,
          venue_name: venueName,
          address,
          url: row.url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          participants: null,
          waitlisted: null,
          recently_updated: true,
          query_hit: `${SHIBUYA_SOURCE.label} 児童館`,
          tags: ["shibuya_jidokan_event", "shibuya_neuvola"],
        });
      }
      }
    }
    await Promise.all(Array.from({ length: neuvolaConcurrency }, () => neuvolaWorker()));

    const friendsRows = [];
    for (let page = 1; page <= 4; page += 1) {
      const listUrl = page === 1 ? `${SHIBUYA_FRIENDS_BASE}/friends_event/` : `${SHIBUYA_FRIENDS_BASE}/friends_event/page/${page}`;
      let html = "";
      try {
        html = await fetchText(listUrl);
      } catch (e) {
        if (page === 1) {
          console.warn("[shibuya] friends list fetch failed:", e.message || e);
          break;
        }
        continue;
      }
      const parsed = parseShibuyaFriendsArchiveRows(html, listUrl);
      if (parsed.length === 0) break;
      friendsRows.push(...parsed.filter((r) => !r.isPast));
    }

    const seenFriends = new Set();
    const friendsDetailCache = new Map();
    const friendsItems = friendsRows.slice(0, 200);
    const friendsConcurrency = 6;
    let friendsIdx = 0;
    async function friendsWorker() {
      while (friendsIdx < friendsItems.length) {
        const fi = friendsIdx; friendsIdx += 1;
        const row = friendsItems[fi];
      if (seenFriends.has(row.url)) continue;
      seenFriends.add(row.url);

      let rootHtml = "";
      try {
        rootHtml = await fetchText(row.url);
        friendsDetailCache.set(row.url, rootHtml);
      } catch {
        continue;
      }

      const childDetailUrls = parseAnchors(rootHtml, row.url)
        .map((x) => x.url)
        .filter(
          (u) =>
            /^https:\/\/friends-shibuya\.com\/friends_event\//i.test(u) &&
            !/\/friends_event\/?$/i.test(u) &&
            !/\/friends_event\/page\/\d+/i.test(u) &&
            !/\/feed\/?$/i.test(u) &&
            u !== row.url
        )
        .slice(0, 20);
      const candidateUrls = [row.url, ...childDetailUrls];

      for (const detailUrl of candidateUrls) {
        if (seenFriends.has(detailUrl) && detailUrl !== row.url) continue;
        seenFriends.add(detailUrl);

        let detailHtml = friendsDetailCache.get(detailUrl) || "";
        if (!detailHtml) {
          try {
            detailHtml = await fetchText(detailUrl);
            friendsDetailCache.set(detailUrl, detailHtml);
          } catch {
            continue;
          }
        }

        const meta = parseShibuyaFriendsDetailMeta(detailHtml);
        if (!meta.title || !meta.dates || meta.dates.length === 0) continue;
        if (/^\s*イベント\s*$/.test(meta.title)) continue;

        const rawAddress = meta.address || extractTokyoAddress(meta.bodyText || "");
        const geoCandidates = buildShibuyaGeoCandidates(meta.title, meta.venue_name, rawAddress || "渋谷区本町");
        let point = await geocodeForWard(geoCandidates, SHIBUYA_SOURCE);
        point = resolveEventPoint(SHIBUYA_SOURCE, meta.venue_name, point, rawAddress);
        const address = resolveEventAddress(SHIBUYA_SOURCE, meta.venue_name, rawAddress, point);

        for (const d of meta.dates) {
          if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
          const { startsAt, endsAt } = buildStartsEndsForDate(d, meta.timeRange, 10);
          const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
          const id = `ward:shibuya:${detailUrl}:${meta.title}:${dateKey}`;
          if (byId.has(id)) continue;
          byId.set(id, {
            id,
            source: "ward_shibuya",
            source_label: SHIBUYA_SOURCE.label,
            title: meta.title,
            starts_at: startsAt,
            ends_at: endsAt,
            updated_at: startsAt,
            venue_name: meta.venue_name,
            address,
            url: detailUrl,
            lat: point ? point.lat : null,
            lng: point ? point.lng : null,
            participants: null,
            waitlisted: null,
            recently_updated: true,
            query_hit: `${SHIBUYA_SOURCE.label} 児童館`,
            tags: ["shibuya_jidokan_event", "shibuya_friends"],
          });
        }
      }
      }
    }
    await Promise.all(Array.from({ length: friendsConcurrency }, () => friendsWorker()));

    // Scrape ward's kodomo page for additional events
    try {
      const kodomoHtml = await fetchText(`${SHIBUYA_SOURCE.baseUrl}/kodomo/index.html`);
      const kodomoBlocks = parseShibuyaBlocksFromKodomoHtml(kodomoHtml);
      for (const block of kodomoBlocks) {
        const venueName = block.venue_name || "渋谷区児童館";
        const geoCandidates = buildShibuyaGeoCandidates(block.title, venueName, block.address || "");
        let point = await geocodeForWard(geoCandidates, SHIBUYA_SOURCE);
        point = resolveEventPoint(SHIBUYA_SOURCE, venueName, point, block.address || "");
        const address = resolveEventAddress(SHIBUYA_SOURCE, venueName, block.address || "", point);
        for (const d of block.dates) {
          if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
          const { startsAt, endsAt } = buildStartsEndsForDate(d, block.timeRange, 10);
          const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
          const id = `ward:shibuya:kodomo:${block.title}:${dateKey}`;
          if (byId.has(id)) continue;
          byId.set(id, {
            id,
            source: "ward_shibuya",
            source_label: SHIBUYA_SOURCE.label,
            title: block.title,
            starts_at: startsAt,
            ends_at: endsAt,
            updated_at: startsAt,
            venue_name: venueName,
            address,
            url: `${SHIBUYA_SOURCE.baseUrl}/kodomo/index.html`,
            lat: point ? point.lat : null,
            lng: point ? point.lng : null,
            participants: null,
            waitlisted: null,
            recently_updated: true,
            query_hit: `${SHIBUYA_SOURCE.label} 児童館`,
            tags: ["shibuya_jidokan_event", "shibuya_kodomo"],
          });
        }
      }
    } catch (e) {
      console.warn("[shibuya] kodomo page failed:", e.message || e);
    }

    return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  return collectShibuyaJidokanEvents;
}

module.exports = { createCollectShibuyaJidokanEvents };
