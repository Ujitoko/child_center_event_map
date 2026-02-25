/**
 * 大阪市子ども・子育てプラザ (Events Manager) コレクター
 *
 * 大阪市17区のプラザ施設。WP Events Manager AJAX APIから取得。
 * 既存osaka-kosodate-plaza-collector (6区/HTML) とは別サイト群。
 * ~300-400 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");

const WARDS = [
  // Standard /wp-admin/admin-ajax.php
  { base: "https://osaka-kosodate-fukushima.net", ajax: "/wp-admin/admin-ajax.php", name: "福島区子ども・子育てプラザ", address: "大阪府大阪市福島区大開1-1-1", lat: 34.6930, lng: 135.4717 },
  { base: "https://osaka-kosodate-nishi.net", ajax: "/wp-admin/admin-ajax.php", name: "西区子ども・子育てプラザ", address: "大阪府大阪市西区本田3-7-13", lat: 34.6793, lng: 135.4781 },
  { base: "https://osaka-kosodate-chuo.net", ajax: "/wp-admin/admin-ajax.php", name: "中央区子ども・子育てプラザ", address: "大阪府大阪市中央区森ノ宮中央1-17-5", lat: 34.6807, lng: 135.5264 },
  { base: "https://osaka-kosodate-taisho.net", ajax: "/wp-admin/admin-ajax.php", name: "大正区子ども・子育てプラザ", address: "大阪府大阪市大正区小林東3-3-25", lat: 34.6458, lng: 135.4658 },
  { base: "https://osaka-kosodate-asahi.net", ajax: "/wp-admin/admin-ajax.php", name: "旭区子ども・子育てプラザ", address: "大阪府大阪市旭区高殿5-3-38", lat: 34.7218, lng: 135.5393 },
  { base: "https://osaka-kosodate-joto.net", ajax: "/wp-admin/admin-ajax.php", name: "城東区子ども・子育てプラザ", address: "大阪府大阪市城東区鴫野西2-1-21", lat: 34.6950, lng: 135.5496 },
  { base: "https://osaka-kosodate-suminoe.net", ajax: "/wp-admin/admin-ajax.php", name: "住之江区子ども・子育てプラザ", address: "大阪府大阪市住之江区浜口東3-5-16", lat: 34.6172, lng: 135.4882 },
  // Konohana (此花区)
  { base: "https://plaza.tenshi-jesus.com", ajax: "/wp-admin/admin-ajax.php", name: "此花区子ども・子育てプラザ", address: "大阪府大阪市此花区伝法6-4-4", lat: 34.6835, lng: 135.4443 },
  // Custom AJAX paths
  { base: "https://nishiyodo-kosodate.com", ajax: "/cms/wp-admin/admin-ajax.php", name: "西淀川区子ども・子育てプラザ", address: "大阪府大阪市西淀川区野里1-3-11", lat: 34.7178, lng: 135.4483 },
  { base: "https://higashiyodogawa-kosodateplaza.net", ajax: "/plwp/wp-admin/admin-ajax.php", name: "東淀川区子ども・子育てプラザ", address: "大阪府大阪市東淀川区東淡路1-4-53", lat: 34.7420, lng: 135.5277 },
  // miokoko-net subpath sites
  { base: "https://miokoko-net.miotsukushi.or.jp/miyakojima", ajax: "/miyakojima/wp-admin/admin-ajax.php", name: "都島区子ども・子育てプラザ", address: "大阪府大阪市都島区都島本通3-19-18", lat: 34.7112, lng: 135.5221 },
  { base: "https://miokoko-net.miotsukushi.or.jp/tennouji", ajax: "/tennouji/wp-admin/admin-ajax.php", name: "天王寺区子ども・子育てプラザ", address: "大阪府大阪市天王寺区細工谷1-1-20", lat: 34.6633, lng: 135.5277 },
  { base: "https://miokoko-net.miotsukushi.or.jp/naniwa", ajax: "/naniwa/wp-admin/admin-ajax.php", name: "浪速区子ども・子育てプラザ", address: "大阪府大阪市浪速区稲荷2-4-3", lat: 34.6586, lng: 135.4960 },
  { base: "https://miokoko-net.miotsukushi.or.jp/yodogawa", ajax: "/yodogawa/wp-admin/admin-ajax.php", name: "淀川区子ども・子育てプラザ", address: "大阪府大阪市淀川区三国本町2-14-3", lat: 34.7388, lng: 135.4847 },
  { base: "https://miokoko-net.miotsukushi.or.jp/ikuno", ajax: "/ikuno/wp-admin/admin-ajax.php", name: "生野区子ども・子育てプラザ", address: "大阪府大阪市生野区勝山北3-13-30", lat: 34.6615, lng: 135.5369 },
  { base: "https://miokoko-net.miotsukushi.or.jp/sumiyoshi", ajax: "/sumiyoshi/wp-admin/admin-ajax.php", name: "住吉区子ども・子育てプラザ", address: "大阪府大阪市住吉区山之内2-18-27", lat: 34.6135, lng: 135.4977 },
  { base: "https://miokoko-net.miotsukushi.or.jp/higashisumiyoshi", ajax: "/higashisumiyoshi/wp-admin/admin-ajax.php", name: "東住吉区子ども・子育てプラザ", address: "大阪府大阪市東住吉区東田辺2-11-28", lat: 34.6187, lng: 135.5283 },
];

/** AJAX JSONからイベントを抽出 */
function parseAjaxEvents(json, ward) {
  const events = [];
  let arr;
  try {
    arr = JSON.parse(json);
  } catch (_) {
    return events;
  }
  if (!Array.isArray(arr)) return events;

  for (const ev of arr) {
    // "more ..." エントリをスキップ
    if (!ev.title || ev.event_id === 0) continue;
    if (ev.className === "wpfc-more" || /^more\s*\.\.\.$/i.test(ev.title)) continue;

    // タイトル (HTMLエンティティをデコード)
    const title = ev.title
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&#\d+;/g, "").replace(/&[a-z]+;/gi, "")
      .replace(/<[^>]+>/g, "").trim();
    if (!title) continue;

    // 日付パース: "2026-03-01T10:30:00" or "2026-03-01T10:30:00+09:00"
    if (!ev.start) continue;
    const startM = ev.start.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!startM) continue;

    const startY = Number(startM[1]), startMo = Number(startM[2]), startD = Number(startM[3]);
    const startH = Number(startM[4]), startMin = Number(startM[5]);

    let endH = null, endMin = null;
    if (ev.end) {
      const endM = ev.end.match(/T(\d{2}):(\d{2})/);
      if (endM) { endH = Number(endM[1]); endMin = Number(endM[2]); }
    }

    // allDay イベントの midnight 処理
    const isAllDay = ev.allDay === true;
    let timeRange = null;
    if (!isAllDay && !(startH === 0 && startMin === 0)) {
      timeRange = { startHour: startH, startMinute: startMin };
      if (endH !== null && !(endH === 0 && endMin === 0)) {
        timeRange.endHour = endH;
        timeRange.endMinute = endMin;
      }
    }

    // allDay 複数日イベントの場合、end は翌日 00:00 なので1日引く
    let endY = startY, endMo = startMo, endD = startD;
    if (ev.end) {
      const endDateM = ev.end.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (endDateM) {
        endY = Number(endDateM[1]); endMo = Number(endDateM[2]); endD = Number(endDateM[3]);
        if (isAllDay && endD > startD) {
          // allDay: end は翌日0時 → 1日戻す
          const dt = new Date(endY, endMo - 1, endD - 1);
          endY = dt.getFullYear(); endMo = dt.getMonth() + 1; endD = dt.getDate();
        }
      }
    }

    // 日付範囲展開
    const dates = [];
    const start = new Date(startY, startMo - 1, startD);
    const end = new Date(endY, endMo - 1, endD);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
    }

    events.push({
      title,
      dates,
      timeRange,
      url: ev.url || "",
      eventId: ev.event_id || ev.post_id || 0,
    });
  }
  return events;
}

function createOsakaPlazaEmCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectOsakaPlazaEmEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    const byId = new Map();

    for (const ward of WARDS) {
      // miokoko-net の AJAX パスはドメインルートから
      const ajaxBase = ward.ajax.startsWith("/") && ward.base.includes("miokoko-net")
        ? "https://miokoko-net.miotsukushi.or.jp"
        : ward.base;

      // 今月+来月+再来月
      for (let i = 0; i < 3; i++) {
        let mm = mo + i;
        let yy = y;
        if (mm > 12) { mm -= 12; yy++; }

        try {
          const url = `${ajaxBase}${ward.ajax}?action=WP_FullCalendar&type=event&month=${mm}&year=${yy}`;
          const json = await fetchText(url);
          if (!json || json.startsWith("<!") || json.startsWith("<html")) continue;

          const events = parseAjaxEvents(json, ward);
          const point = { lat: ward.lat, lng: ward.lng };

          for (const ev of events) {
            const resolvedAddr = resolveEventAddress(source, ward.name, ward.address, point);
            let count = 0;
            for (const dd of ev.dates) {
              if (count >= 30) break;
              if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
              count++;

              const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
              const { startsAt, endsAt } = buildStartsEndsForDate(dd, ev.timeRange);
              const id = `${srcKey}:${ward.name}:${ev.title}:${dateKey}`;

              if (byId.has(id)) continue;
              byId.set(id, {
                id, source: srcKey, source_label: label,
                title: ev.title,
                starts_at: startsAt, ends_at: endsAt,
                venue_name: ward.name,
                address: resolvedAddr || ward.address,
                url: ev.url || ward.base,
                lat: point.lat, lng: point.lng,
              });
            }
          }
        } catch (e) {
          // Skip ward/month on error
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createOsakaPlazaEmCollector };
