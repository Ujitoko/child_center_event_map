const vm = require("vm");
const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst, parseTimeRangeFromText } = require("../date-utils");

/**
 * place2 をパース: 施設名と住所候補を抽出 (汎用)
 * @param {string} raw - place2 フィールドの生テキスト
 * @param {string} cityLabel - 市名 (例: "昭島市")
 */
function parsePlace2(raw, cityLabel) {
  if (!raw) return { venue: "", address: "" };
  let text = String(raw)
    .replace(/&nbsp;/gi, " ")
    .replace(/\t+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\[[^\]]*\]/g, "")
    .trim();
  // オンライン/Zoom イベントはスキップ
  if (/オンライン|Zoom|zoom|YouTube|Teams/i.test(text)) return { venue: "", address: "" };
  // 壊れたデータ除外 (日付テキスト混入、令和表記)
  if (/^日にち|令和\d+年\d+月\d+日/.test(text)) return { venue: "", address: "" };
  if (/^\d{4}年\d{1,2}月\d{1,2}日/.test(text)) return { venue: "", address: "" };
  if (/^\d{1,2}月\d{1,2}日[（(]/.test(text)) return { venue: "", address: "" };
  // 「各〜」(不特定多数の場所)はスキップ
  if (/各(歯科|医院|施設|店舗|学校)/.test(text)) return { venue: "", address: "" };
  // 県外会場はスキップ
  if (/^(岩手県|新潟県|鳥取県|静岡県|福島県|神奈川県)/.test(text)) return { venue: "", address: "" };
  // 複数施設の列挙はスキップ
  if (/【クイズポイント】|【スタンプ/.test(text)) return { venue: "", address: "" };
  // "(1)A (2)B" 形式 → 最初の会場のみ
  const numberedMatch = text.match(/[（(][12１２][）)]\s*([^（(]+)/);
  if (numberedMatch) text = numberedMatch[1].trim();
  // "AまたはB" 形式 → 最初の会場のみ
  const orIdx = text.indexOf("または");
  if (orIdx > 2) text = text.slice(0, orIdx).trim();
  // 複数会場がある場合は最初の会場のみ
  const parts = text.split(/[、,]/).filter(Boolean);
  if (parts.length > 1 && parts[0].length > 2) text = parts[0].trim();
  // 付加情報を除去
  text = text.replace(/所在地\s*[^\s]+/g, "").trim();
  text = text.replace(/電話番号\s*[\d-]+/g, "").trim();
  text = text.replace(/ファクス\s*[\d-]+/g, "").trim();
  // 注釈部分を除去
  const noteIdx = text.search(/[（(]正門|[（(]注意|雨天|※|駐車場/);
  if (noteIdx > 0) text = text.slice(0, noteIdx).trim();
  // 括弧内の住所を抽出
  let address = "";
  const addrMatch = text.match(/[（(]([^）)]*\d+[-ー－]\d+[^）)]*)[）)]/);
  if (addrMatch) {
    address = addrMatch[1].trim();
    text = text.replace(/[（(][^）)]*[）)]/g, "").trim();
  } else {
    // ルビ括弧を除去
    text = text.replace(/[（(][ぁ-ん]+[）)]/g, "").trim();
    // 説明的括弧を除去
    text = text.replace(/[（(][^）)]{15,}[）)]/g, "").trim();
  }
  // 埋め込み住所の抽出 (例: "昭島市xxx町1-2-3" or "稲城市東長沼2112番地")
  const embeddedAddr = text.match(new RegExp(cityLabel + "[^\\s,、]{3,}(?:\\d+[-ー－]\\d+(?:[-ー－]\\d+)?|\\d+番地)"));
  if (embeddedAddr) {
    address = address || embeddedAddr[0];
  }
  // 括弧内の住所 (番地形式) も抽出
  if (!address) {
    const banchiMatch = text.match(/[（(]([^）)]*\d+番地[^）)]*)[）)]/);
    if (banchiMatch) {
      address = banchiMatch[1].trim();
      text = text.replace(/[（(][^）)]*[）)]/g, "").trim();
    }
  }
  // 部屋名・階数・フロア情報を除去
  const venue = text
    .replace(/\s*地下?\d*階.*$/, "")
    .replace(/\d+階.*$/, "")
    .replace(/\d+F.*$/i, "")
    .replace(/\s+(集会室|講座室|保育室|和室|会議室|多目的室|研修室|料理室|講堂|学習室|作業室|健康サロン|健康増進室|視聴覚ホール|小ホール|大ホール|メインアリーナ|第二展示室|市民スペース|音楽室|伝承スタジオ|ホール|活動室|活動交流室|フェアリールーム|ラウンジ|オープンスタジオ|サテライトカウンター|ラーニングコモンズ|子育て交流室|遊戯室|工作室|体育館|校庭|庭|前庭|屋上).*$/, "")
    .replace(/\s+\d+\s*(会議室|学習室|和室|講堂).*$/, "")
    .replace(/\s+他$/, "")
    .trim();
  // 部屋名のみ (施設名がない) はスキップ
  if (/^(遊戯室|工作室|会議室|集会室|講座室|保育室|和室|多目的室|研修室|体育館|校庭)$/.test(venue)) {
    return { venue: "", address };
  }
  return { venue: venue || text, address };
}

/**
 * 会場名からジオコーディング候補リストを構築 (汎用)
 * @param {string} venue - 施設名
 * @param {string} address - place2 から抽出した住所
 * @param {string} cityLabel - 市名
 * @param {Object} knownFacilities - 既知施設マップ
 */
function buildGeoCandidates(venue, address, cityLabel, knownFacilities) {
  const candidates = [];
  const normalized = venue.replace(/[\s　・･]/g, "");
  for (const [name, addr] of Object.entries(knownFacilities)) {
    const normName = name.replace(/[\s　・･]/g, "");
    if (normalized.includes(normName)) {
      candidates.unshift(/東京都/.test(addr) ? addr : `東京都${addr}`);
      break;
    }
  }
  if (address) {
    const cityAddr = address.includes(cityLabel) ? address : `${cityLabel}${address}`;
    candidates.push(/東京都/.test(cityAddr) ? cityAddr : `東京都${cityAddr}`);
  }
  if (venue) {
    candidates.push(`東京都${cityLabel} ${venue}`);
  }
  return [...new Set(candidates)];
}

/**
 * 汎用 event.js コレクターファクトリー
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {string} config.jsFile - JS ファイル名 (例: "event.js", "event_m.js")
 * @param {string[]} config.childCategoryIds - 子育てカテゴリID配列
 * @param {Object} config.knownFacilities - 既知施設マップ
 * @param {Object} deps - { geocodeForWard, resolveEventPoint }
 */
function createEventJsCollector(config, deps) {
  const { source, jsFile, childCategoryIds, knownFacilities } = config;
  const { geocodeForWard, resolveEventPoint } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectEvents(maxDays) {
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    let eventData;
    try {
      const jsText = await fetchText(`${source.baseUrl}/${jsFile}`);
      const ctx = {};
      vm.runInNewContext(jsText, ctx);
      eventData = ctx.event_data;
    } catch (e) {
      console.warn(`[${label}] ${jsFile} fetch/parse failed:`, e.message || e);
      return [];
    }

    if (!eventData || !Array.isArray(eventData.events)) {
      console.warn(`[${label}] event_data.events is not an array`);
      return [];
    }

    const childEvents = eventData.events.filter((ev) => {
      const cats = Array.isArray(ev.category) ? ev.category : [];
      const tags = Array.isArray(ev.hashtag) ? ev.hashtag : [];
      return childCategoryIds.some((id) => cats.includes(id) || tags.includes(id));
    });

    const candidates = [];
    for (const item of childEvents) {
      if (!item.eventtitle || !Array.isArray(item.opendays)) continue;

      let { venue, address } = parsePlace2(item.place2 || "", label);
      // place2 が空の場合、タイトルから施設名を抽出
      if (!venue) {
        // 【施設名】形式
        const bracketMatch = item.eventtitle.match(/【([^】]{2,20})】/);
        if (bracketMatch) {
          const candidate = bracketMatch[1].trim();
          // ステータス表記を除外
          if (!/満員|御礼|募集|終了|受付|中止|延期|変更|注意|重要|無料|有料|予約|申込|開催/.test(candidate)) {
            venue = candidate;
          }
        }
        // （施設名）形式 (タイトル末尾の括弧) ※施設っぽい名前のみ
        if (!venue) {
          const parenMatch = item.eventtitle.match(/[（(]([^）)]{2,20})[）)]$/);
          if (parenMatch) {
            const candidate = parenMatch[1].trim();
            // 施設を示唆するキーワードを含む場合のみ
            if (/(館|センター|公園|学校|ホール|プラザ|公民館|図書館|体育館|保育園|幼稚園|こども園|ひろば|スタジオ|ルーム)/.test(candidate)) {
              venue = candidate;
            }
          }
        }
      }
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
        ? `${source.baseUrl}${item.url}`
        : source.baseUrl;

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
        const geoCandidates = buildGeoCandidates(ev.venue_name, ev.address_hint, label, knownFacilities);
        point = await geocodeForWard(geoCandidates, source);
        point = resolveEventPoint(source, ev.venue_name, point, `${label} ${ev.venue_name}`);
      }
      results.push({
        id: `${srcKey}:${ev.url}:${ev.title}:${ev.dateKey}`,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: ev.starts_at,
        ends_at: ev.ends_at,
        venue_name: ev.venue_name,
        address: ev.venue_name ? `${label} ${ev.venue_name}` : "",
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
        point: point || source.center,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createEventJsCollector };
