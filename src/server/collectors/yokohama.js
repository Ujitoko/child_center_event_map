const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { decodeHtmlEntities } = require("../html-utils");
const { YOKOHAMA_SOURCE } = require("../../config/wards");

const YOKOHAMA_WARD_CENTERS = {
  "鶴見区":     { lat: 35.5102, lng: 139.6830 },
  "神奈川区":   { lat: 35.4804, lng: 139.6316 },
  "西区":       { lat: 35.4561, lng: 139.6192 },
  "中区":       { lat: 35.4437, lng: 139.6424 },
  "南区":       { lat: 35.4326, lng: 139.6082 },
  "港南区":     { lat: 35.4035, lng: 139.5921 },
  "保土ケ谷区": { lat: 35.4445, lng: 139.5953 },
  "旭区":       { lat: 35.4645, lng: 139.5432 },
  "磯子区":     { lat: 35.3990, lng: 139.6178 },
  "金沢区":     { lat: 35.3461, lng: 139.6222 },
  "港北区":     { lat: 35.5224, lng: 139.6345 },
  "緑区":       { lat: 35.5078, lng: 139.5516 },
  "青葉区":     { lat: 35.5527, lng: 139.5267 },
  "都筑区":     { lat: 35.5400, lng: 139.5700 },
  "戸塚区":     { lat: 35.3928, lng: 139.5348 },
  "栄区":       { lat: 35.3632, lng: 139.5592 },
  "泉区":       { lat: 35.4009, lng: 139.5004 },
  "瀬谷区":     { lat: 35.4612, lng: 139.4952 },
};

const LIST_BASE = `${YOKOHAMA_SOURCE.baseUrl}/kodomo/event_list.html`;
const DETAIL_BASE = `${YOKOHAMA_SOURCE.baseUrl}/kodomo/event_detail.html`;
const PER_PAGE = 20;
const DETAIL_BATCH_SIZE = 10;

// 一覧ページから各イベントの id, title, subtitle, ward, venue, dateRange を抽出
function parseListPage(html) {
  const events = [];
  // イベントごとのブロックを抽出 (<a class="event" ...> を起点)
  const eventRe = /<a\s+class="event"\s+href="[^"]*event_detail\.html\?id=(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = eventRe.exec(html)) !== null) {
    const id = m[1];
    const title = decodeHtmlEntities(m[2].replace(/<[^>]+>/g, "")).trim();

    // この <a> 以降の次の <a class="event"> までの範囲を取得
    const startIdx = m.index;
    const nextMatch = html.indexOf('<a class="event"', startIdx + m[0].length);
    const block = html.slice(startIdx, nextMatch === -1 ? undefined : nextMatch);

    // サブタイトル
    const subRe = /<p\s+class="name_sub">([\s\S]*?)<\/p>/;
    const subM = block.match(subRe);
    const subtitle = subM ? decodeHtmlEntities(subM[1].replace(/<[^>]+>/g, "")).trim() : "";

    // 場所・区名
    const placeRe = /<p\s+class="place">([\s\S]*?)<\/p>/;
    const placeM = block.match(placeRe);
    let venue = "";
    let ward = "";
    if (placeM) {
      const placeHtml = placeM[1];
      // 施設名: 最初の <a> タグ内テキスト
      const venueRe = /<a[^>]*>([^<]+)<\/a>/g;
      const links = [];
      let lm;
      while ((lm = venueRe.exec(placeHtml)) !== null) {
        links.push(lm[1].trim());
      }
      if (links.length >= 1) venue = links[0];
      // 区名: "(...区)" パターンまたは最後のリンク
      const wardRe = /([^\s]+区)/;
      if (links.length >= 2) {
        const wm = links[links.length - 1].match(wardRe);
        if (wm) ward = wm[1];
      }
      if (!ward) {
        const plainText = placeHtml.replace(/<[^>]+>/g, "");
        const wm2 = plainText.match(wardRe);
        if (wm2) ward = wm2[1];
      }
    }

    events.push({ id, title, subtitle, venue, ward });
  }
  return events;
}

// 一覧ページの総件数からページ数を判定
function parseTotalPages(html) {
  // "181件ヒットしました" から総件数を取得
  const countRe = /(\d+)件ヒット/;
  const cm = html.match(countRe);
  if (cm) {
    const total = parseInt(cm[1], 10);
    return Math.ceil(total / PER_PAGE);
  }
  // フォールバック: pos= リンクの最大値から推定
  const posRe = /pos=(\d+)/g;
  let maxPos = 0;
  let pm;
  while ((pm = posRe.exec(html)) !== null) {
    const pos = parseInt(pm[1], 10);
    if (pos > maxPos) maxPos = pos;
  }
  return maxPos > 0 ? Math.ceil((maxPos + PER_PAGE) / PER_PAGE) : 1;
}

// 詳細ページから個別日程と住所を抽出
function parseDetailPage(html) {
  const schedules = [];
  // 日程パターン: 2026年2月10日(火) 10時00分 から 11時30分 まで
  const dateRe = /(\d{4})年(\d{1,2})月(\d{1,2})日\([^)]+\)(?:\s*(\d{1,2})時(\d{2})分\s*から\s*(\d{1,2})時(\d{2})分\s*まで)?/g;
  let dm;
  while ((dm = dateRe.exec(html)) !== null) {
    const y = dm[1];
    const mo = dm[2].padStart(2, "0");
    const d = dm[3].padStart(2, "0");
    const dateKey = `${y}-${mo}-${d}`;
    let timeFrom = null;
    let timeTo = null;
    if (dm[4] !== undefined) {
      timeFrom = `${dm[4].padStart(2, "0")}:${dm[5]}:00`;
      timeTo = `${dm[6].padStart(2, "0")}:${dm[7]}:00`;
    }
    schedules.push({ dateKey, timeFrom, timeTo });
  }

  // 住所: <th>問合せ・申込み先住所</th> の次の <td>
  let address = "";
  const addrRe = /<th>[^<]*住所[^<]*<\/th>\s*<td>([\s\S]*?)<\/td>/;
  const addrM = html.match(addrRe);
  if (addrM) {
    address = addrM[1]
      .replace(/<[^>]+>/g, "")
      .replace(/〒\d{3}-?\d{4}\s*/, "")
      .trim();
  }

  return { schedules, address };
}

function createCollectYokohamaEvents() {
  return async function collectYokohamaEvents(maxDays) {
    const source = `ward_${YOKOHAMA_SOURCE.key}`;
    const label = YOKOHAMA_SOURCE.label;
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    // 一覧ページを取得（ページング）
    const listItems = [];
    let totalPages = 1;

    for (let page = 0; page < totalPages; page++) {
      try {
        const pos = page * PER_PAGE;
        const url = `${LIST_BASE}?term_after=${todayStr}&term_before=${endStr}&num=${PER_PAGE}&pos=${pos}`;
        const html = await fetchText(url);
        if (page === 0) {
          totalPages = parseTotalPages(html);
        }
        const items = parseListPage(html);
        listItems.push(...items);
      } catch (e) {
        console.warn(`[${label}] list page ${page} fetch failed:`, e.message || e);
        break;
      }
    }

    // 重複IDを除去
    const uniqueMap = new Map();
    for (const item of listItems) {
      if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
    }
    const uniqueItems = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailResults = new Map();
    for (let i = 0; i < uniqueItems.length; i += DETAIL_BATCH_SIZE) {
      const batch = uniqueItems.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const url = `${DETAIL_BASE}?id=${item.id}`;
          const html = await fetchText(url);
          return { id: item.id, detail: parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailResults.set(r.value.id, r.value.detail);
        }
      }
    }

    // イベントレコード生成
    const candidates = [];
    for (const item of uniqueItems) {
      const detail = detailResults.get(item.id);
      const schedules = detail ? detail.schedules : [];
      const address = detail ? detail.address : "";
      const eventUrl = `${DETAIL_BASE}?id=${item.id}`;
      const displayTitle = item.subtitle
        ? `${item.title}｜${item.subtitle}`
        : item.title;
      const wardCenter = YOKOHAMA_WARD_CENTERS[item.ward] || YOKOHAMA_SOURCE.center;

      if (schedules.length === 0) continue;

      for (const sched of schedules) {
        if (sched.dateKey < todayStr || sched.dateKey > endStr) continue;

        let startsAt = `${sched.dateKey}T00:00:00+09:00`;
        let endsAt = null;
        if (sched.timeFrom) {
          startsAt = `${sched.dateKey}T${sched.timeFrom}+09:00`;
        }
        if (sched.timeTo) {
          endsAt = `${sched.dateKey}T${sched.timeTo}+09:00`;
        }

        candidates.push({
          id: `${source}:${eventUrl}:${displayTitle}:${sched.dateKey}`,
          source,
          source_label: label,
          title: displayTitle,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: item.venue || "",
          address: address || "",
          url: eventUrl,
          lat: wardCenter.lat,
          lng: wardCenter.lng,
          point: wardCenter,
        });
      }
    }

    // 重複除去
    const seen = new Set();
    const results = [];
    for (const c of candidates) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      results.push(c);
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectYokohamaEvents };
