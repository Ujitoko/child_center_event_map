const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|おはなし|絵本|紙芝居|リトミック|ママ|パパ|マタニティ|ひろば|誕生|手形|ハイハイ|えほん|じかん|工作|製作|遊び|ふれあい|ワークショップ|健康づくり/;

/**
 * 宮代町 子育てポータルサイト「みやしろで育てよっ」からイベントを抽出
 *
 * 一覧HTML構造:
 * <li class="no">
 *   <div class="thumbnail"><a href="/kosodate/eventdetail/ID"><img .../></a></div>
 *   <div class="meta"><span class="date">M月D日(曜) HH時MM分～HH時MM分</span></div>
 *   <h3><a href="/kosodate/eventdetail/ID">タイトル</a></h3>
 * </li>
 */
function parseEventListHtml(html) {
  const events = [];

  const liRe = /<li\s+class="no">([\s\S]*?)<\/li>/g;
  let lim;
  while ((lim = liRe.exec(html)) !== null) {
    const liContent = lim[1];

    // URL
    const urlMatch = liContent.match(/<a\s+href="(\/kosodate\/eventdetail\/\d+)"/);
    if (!urlMatch) continue;
    const detailPath = urlMatch[1];

    // タイトル
    const titleMatch = liContent.match(/<h3>\s*<a[^>]*>([^<]+)<\/a>\s*<\/h3>/);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();

    // 日付と時間: "M月D日(曜) HH時MM分～HH時MM分" or "M月D日(曜)"
    const dateMatch = liContent.match(/<span\s+class="date">([^<]+)<\/span>/);
    if (!dateMatch) continue;
    const dateText = dateMatch[1].trim();

    const dm = dateText.match(/(\d{1,2})月(\d{1,2})日\s*[（(]([月火水木金土日])[）)]/);
    if (!dm) continue;
    const mo = Number(dm[1]);
    const d = Number(dm[2]);

    // 年は現在年で推定（来年の場合もある）
    const now = new Date();
    let y = now.getFullYear();
    if (mo < now.getMonth() + 1 - 2) y++; // 2ヶ月以上前の月なら来年

    // 時刻
    let timeRange = null;
    const timeMatch = dateText.match(/(\d{1,2})時(\d{2})分\s*[～〜~-]\s*(\d{1,2})時(\d{2})分/);
    if (timeMatch) {
      timeRange = {
        startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
        endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
      };
    } else {
      const startOnly = dateText.match(/(\d{1,2})時(\d{2})分/);
      if (startOnly) {
        timeRange = {
          startHour: Number(startOnly[1]), startMin: Number(startOnly[2]),
          endHour: null, endMin: null,
        };
      }
    }

    events.push({ y, mo, d, title, timeRange, detailPath });
  }

  return events;
}

function createCollectMiyashiroEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectMiyashiroEvents(maxDays) {
    const source = deps.source || {
      key: "miyashiro", label: "宮代町",
      baseUrl: "https://www.town.miyashiro.lg.jp",
      center: { lat: 36.0238, lng: 139.7253 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const portalBase = "https://www.kuraso-miyashiro.com";

    // イベント一覧ページを取得
    const listUrl = `${portalBase}/kosodate/eventdetail`;
    let html;
    try {
      html = await fetchText(listUrl);
    } catch (e) {
      console.warn(`[${label}] event list fetch failed:`, e.message || e);
      return [];
    }

    const allEvents = parseEventListHtml(html);

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 子育てフィルタ + 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!CHILD_RE.test(ev.title)) continue;
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページから会場を取得
    const byId = new Map();
    for (const ev of uniqueEvents) {
      let venueName = "宮代町子育てひろば";
      let venueAddress = null;

      // 詳細ページをフェッチ
      if (ev.detailPath) {
        try {
          const detHtml = await fetchText(`${portalBase}${ev.detailPath}`);
          // 場所の抽出: "場所：XXX（住所）" or <p>場所：XXX</p>
          const venueMatch = detHtml.match(/場所\s*[：:]\s*([^<（]+)/);
          if (venueMatch) {
            venueName = stripTags(venueMatch[1]).trim();
          }
          const addrMatch = detHtml.match(/場所\s*[：:].*?[（(]([^）)]+)[）)]/);
          if (addrMatch) {
            venueAddress = addrMatch[1].trim();
          }
        } catch (e) {
          // 詳細フェッチ失敗はスキップ
        }
      }

      let geoCandidates = [`埼玉県南埼玉郡宮代町 ${venueName}`, `埼玉県宮代町 ${venueName}`];
      if (venueAddress) {
        geoCandidates.unshift(`埼玉県南埼玉郡${venueAddress}`);
      }
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `${label} ${venueName}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:portal:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: ev.detailPath ? `${portalBase}${ev.detailPath}` : listUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (portal)`);
    return results;
  };
}

module.exports = { createCollectMiyashiroEvents };
