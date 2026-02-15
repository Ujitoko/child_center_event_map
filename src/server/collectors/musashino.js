const vm = require("vm");
const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { parseTimeRangeFromText } = require("../date-utils");
const { MUSASHINO_SOURCE, KNOWN_MUSASHINO_FACILITIES } = require("../../config/wards");

/** place2 をパース: 施設名と住所候補を抽出 */
function parsePlace2(raw) {
  if (!raw) return { venue: "", address: "" };
  let text = String(raw)
    .replace(/&nbsp;/gi, " ")
    .replace(/\t+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\[[^\]]*\]/g, "")
    .trim();
  // 壊れたテーブルデータやスケジュール混入を除外
  if (/^日にち|令和\d+年\d+月\d+日/.test(text)) return { venue: "", address: "" };
  // 県外会場はスキップ (岩手県、新潟県、鳥取県 etc.)
  if (/^(岩手県|新潟県|鳥取県|YouTube)/.test(text)) return { venue: "", address: "" };
  // "(1)A (2)B" 形式 → 最初の会場のみ
  const numberedMatch = text.match(/[（(][12１２][）)]\s*([^（(]+)/);
  if (numberedMatch) text = numberedMatch[1].trim();
  // 複数会場がある場合は最初の会場のみ使用
  const parts = text.split(/[、,]/).filter(Boolean);
  if (parts.length > 1) text = parts[0].trim();
  // 注釈部分を除去
  const noteIdx = text.search(/雨天|（注意）|今年度は/);
  if (noteIdx > 0) text = text.slice(0, noteIdx).trim();
  // 括弧内の住所を抽出
  let address = "";
  const addrMatch = text.match(/[（(]([^）)]*\d+[-ー－]\d+[^）)]*)[）)]/);
  if (addrMatch) {
    address = addrMatch[1].trim();
    text = text.replace(/[（(][^）)]*[）)]/g, "").trim();
  } else {
    // ルビ括弧を除去 (例: 市民会館(しみんかいかん))
    text = text.replace(/[（(][ぁ-ん]+[）)]/g, "").trim();
  }
  // 部屋名・階数・フロア情報を除去してクリーンな施設名にする
  const venue = text
    .replace(/\s*地下?\d*階.*$/, "")
    .replace(/\s+(集会室|講座室|保育室|和室|会議室|多目的室|研修室|料理室|メインアリーナ|小ホール|大ホール|第二展示室|市民スペース).*$/, "")
    .replace(/\s+\d+階?\s*(集会室|講座室|保育室|和室|会議室|多目的室|視聴覚ホール).*$/, "")
    .replace(/\s+他$/, "")
    .trim();
  return { venue: venue || text, address };
}

/** 会場名からジオコーディング候補リストを構築 */
function buildGeoCandidates(venue, address) {
  const candidates = [];
  // 既知施設の住所引き当て (元の会場名でマッチ)
  const normalized = venue.replace(/[\s　・･]/g, "");
  for (const [name, addr] of Object.entries(KNOWN_MUSASHINO_FACILITIES)) {
    const normName = name.replace(/[\s　・･]/g, "");
    if (normalized.includes(normName)) {
      candidates.unshift(/東京都/.test(addr) ? addr : `東京都${addr}`);
      break;
    }
  }
  // 括弧内住所を武蔵野市付きで追加
  if (address) {
    const cityAddr = /武蔵野市/.test(address) ? address : `武蔵野市${address}`;
    candidates.push(/東京都/.test(cityAddr) ? cityAddr : `東京都${cityAddr}`);
  }
  // 施設名のみ (階数・部屋名を除去)
  if (venue) {
    candidates.push(`東京都武蔵野市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectMusashinoEvents(deps) {
  const { geocodeForWard, resolveEventPoint } = deps;

  return async function collectMusashinoEvents(maxDays) {
    const source = `ward_${MUSASHINO_SOURCE.key}`;
    const label = MUSASHINO_SOURCE.label;
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    let eventData;
    try {
      const jsText = await fetchText(`${MUSASHINO_SOURCE.baseUrl}/event_m.js`);
      const ctx = {};
      vm.runInNewContext(jsText, ctx);
      eventData = ctx.event_data;
    } catch (e) {
      console.warn(`[${label}] event_m.js fetch/parse failed:`, e.message || e);
      return [];
    }

    if (!eventData || !Array.isArray(eventData.events)) {
      console.warn(`[${label}] event_data.events is not an array`);
      return [];
    }

    // カテゴリ "7"(子育て) or "8"(キッズ) でフィルタ
    const childEvents = eventData.events.filter((ev) => {
      const cats = ev.category;
      if (!Array.isArray(cats)) return false;
      return cats.includes("7") || cats.includes("8");
    });

    // 各イベント × 各日程を展開
    const candidates = [];
    for (const item of childEvents) {
      if (!item.eventtitle || !Array.isArray(item.opendays)) continue;

      const { venue, address } = parsePlace2(item.place2 || "");

      // 時刻解析: times 配列 → time_texts フォールバック
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
        ? `${MUSASHINO_SOURCE.baseUrl}${item.url}`
        : MUSASHINO_SOURCE.baseUrl;

      for (const day of item.opendays) {
        // day format: "YYYY/MM/DD" → "YYYY-MM-DD"
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
        point = await geocodeForWard(geoCandidates, MUSASHINO_SOURCE);
        point = resolveEventPoint(MUSASHINO_SOURCE, ev.venue_name, point, `武蔵野市 ${ev.venue_name}`);
      }
      results.push({
        id: `${source}:${ev.url}:${ev.title}:${ev.dateKey}`,
        source,
        source_label: label,
        title: ev.title,
        starts_at: ev.starts_at,
        ends_at: ev.ends_at,
        venue_name: ev.venue_name,
        address: ev.venue_name ? `武蔵野市 ${ev.venue_name}` : "",
        url: ev.url,
        lat: point ? point.lat : MUSASHINO_SOURCE.center.lat,
        lng: point ? point.lng : MUSASHINO_SOURCE.center.lng,
        point: point || MUSASHINO_SOURCE.center,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectMusashinoEvents };
