const vm = require("vm");
const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst, parseTimeRangeFromText } = require("../date-utils");
const { isJunkVenueName } = require("../venue-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

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
  if (/^(岩手県|新潟県|鳥取県|静岡県|福島県)/.test(text)) return { venue: "", address: "" };
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
    .replace(/\s+(集会室|講座室|保育室|和室|会議室|多目的室|研修室|料理室|講堂|学習室|作業室|健康サロン|健康増進室|視聴覚ホール|小ホール|大ホール|メインアリーナ|第二展示室|市民スペース|音楽室|伝承スタジオ|ホール|活動室|活動交流室|フェアリールーム|ラウンジ|オープンスタジオ|サテライトカウンター|ラーニングコモンズ|子育て交流室|遊戯室|工作室|体育館|校庭|庭|前庭|屋上|おはなしの部屋|おはなしコーナー|おはなしのへや|児童室|児童コーナー|創作室|体験学習室|軽体育室|プレイルーム|ヤングアダルトコーナー|休養室|談話室).*$/, "")
    .replace(/\s+\d+\s*(会議室|学習室|和室|講堂|多目的室|講座室).*$/, "")
    .replace(/\s+他$/, "")
    // 「住所：」埋め込みテキストを除去
    .replace(/住所[：:].*$/, "")
    // アクセス案内テキストを除去（「駅東口から徒歩5分です。」等）
    .replace(/(?:駅[東西南北]?口)?から(?:徒歩|バス)\d+分.*$/, "")
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
function detectPrefecture(cityLabel) {
  if (/^(横浜市|川崎市|相模原市|海老名市|鎌倉市|横須賀市|茅ヶ崎市|座間市|逗子市|大和市|平塚市|小田原市|秦野市|綾瀬市|厚木市|伊勢原市|南足柄市)/.test(cityLabel)) return "神奈川県";
  if (/^(千葉市|船橋市|松戸市|市川市|柏市|市原市|八千代市|流山市|習志野市|浦安市|野田市|成田市|木更津市|白井市|四街道市|袖ケ浦市|鎌ケ谷市|我孫子市|印西市|富津市|君津市|佐倉市|東金市|旭市|銚子市|香取市|匝瑳市|山武市|勝浦市|鴨川市|南房総市|富里市|大網白里市|いすみ市|茂原市)/.test(cityLabel)) return "千葉県";
  if (/^(東庄町|大多喜町|酒々井町|栄町|神崎町|多古町|九十九里町|芝山町|横芝光町|一宮町|白子町|長柄町|長南町|長生村|睦沢町|御宿町)/.test(cityLabel)) return "千葉県";
  if (/^(さいたま市|川口市|所沢市|越谷市|川越市|草加市|春日部市|上尾市|新座市|朝霞市|戸田市|和光市|志木市|富士見市|ふじみ野市|三郷市|八潮市|蕨市|狭山市|入間市)/.test(cityLabel)) return "埼玉県";
  return "東京都";
}

function buildGeoCandidates(venue, address, cityLabel, knownFacilities) {
  const pref = detectPrefecture(cityLabel);
  const candidates = [];
  const normalized = venue.replace(/[\s　・･]/g, "");
  for (const [name, addr] of Object.entries(knownFacilities)) {
    const normName = name.replace(/[\s　・･]/g, "");
    if (normalized.includes(normName)) {
      candidates.unshift(new RegExp(pref).test(addr) ? addr : `${pref}${addr}`);
      break;
    }
  }
  if (address) {
    const cityAddr = address.includes(cityLabel) ? address : `${cityLabel}${address}`;
    candidates.push(new RegExp(pref).test(cityAddr) ? cityAddr : `${pref}${cityAddr}`);
  }
  if (venue) {
    candidates.push(`${pref}${cityLabel} ${venue}`);
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
 * @param {Object} deps - { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster }
 */
function createEventJsCollector(config, deps) {
  const { source, jsFile, childCategoryIds, childCategory2Ids, knownFacilities, placeIdMap, useKeywordFilter } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
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
      if (childCategoryIds.length > 0 && childCategoryIds.some((id) => cats.includes(id) || tags.includes(id))) return true;
      if (childCategory2Ids && childCategory2Ids.length > 0 && childCategory2Ids.includes(ev.category2)) return true;
      if (useKeywordFilter && ev.eventtitle && WARD_CHILD_HINT_RE.test(ev.eventtitle)) return true;
      return false;
    });

    const candidates = [];
    for (const item of childEvents) {
      if (!item.eventtitle || !Array.isArray(item.opendays)) continue;

      let { venue, address } = parsePlace2(item.place2 || "", label);
      // placeIdMap がある場合、place フィールドのIDから施設名を取得（部屋名のみの場合も上書き）
      if (placeIdMap && item.place) {
        const mapped = placeIdMap[String(item.place)];
        if (mapped && (!venue || /^(大?会議室|第?\d*会議室|講義室|実習室|集会室|講座室|保育室|和室|多目的室|研修室|美工室|学習室|子ども室)$/.test(venue))) {
          venue = mapped;
        }
      }
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
      if (!venue || isJunkVenueName(venue)) continue;

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
        if (getFacilityAddressFromMaster) {
          const fmAddr = getFacilityAddressFromMaster(source.key, ev.venue_name);
          if (fmAddr && !geoCandidates.some(c => c.includes(fmAddr))) {
            const pref = detectPrefecture(label);
            const fullAddr = new RegExp(pref).test(fmAddr) ? fmAddr : `${pref}${fmAddr}`;
            geoCandidates.unshift(fullAddr);
          }
        }
        point = await geocodeForWard(geoCandidates.slice(0, 7), source);
        point = resolveEventPoint(source, ev.venue_name, point, `${label} ${ev.venue_name}`);
      }
      let address = ev.address_hint || "";
      if (!address && getFacilityAddressFromMaster && ev.venue_name) {
        address = getFacilityAddressFromMaster(source.key, ev.venue_name);
      }
      if (resolveEventAddress) {
        address = resolveEventAddress(source, ev.venue_name, address || `${label} ${ev.venue_name}`, point);
      }
      if (!address) address = ev.venue_name ? `${label} ${ev.venue_name}` : "";
      results.push({
        id: `${srcKey}:${ev.url}:${ev.title}:${ev.dateKey}`,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: ev.starts_at,
        ends_at: ev.ends_at,
        venue_name: ev.venue_name,
        address,
        url: ev.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createEventJsCollector };
