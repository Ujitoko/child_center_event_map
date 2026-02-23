const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  parseYmdFromJst,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { ODAWARA_SOURCE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const PER_PAGE = 20;
const MAX_PAGES = 5;
const DETAIL_BATCH_SIZE = 6;

/**
 * 一覧ページHTMLからイベントを抽出
 * - 日付: <p class="bCatListDate color11">開催日：2026年02月07日</p>
 * - タイトル+URL: <h5><a href="URL" target="_blank">Title</a></h5>
 */
function parseListPage(html, baseUrl) {
  const events = [];
  // 各イベントブロックを日付+タイトルのペアで抽出
  const blockRe = /<p\s+class="bCatListDate[^"]*">([\s\S]*?)<\/p>[\s\S]*?<h5>([\s\S]*?)<\/h5>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const dateText = stripTags(m[1]);
    const h5Html = m[2];
    // 日付抽出: 開催日：YYYY年MM月DD日 ～ YYYY年MM月DD日
    const dateMatch = dateText.match(/(\d{4})年(\d{2})月(\d{2})日/);
    if (!dateMatch) continue;
    let y = Number(dateMatch[1]);
    let mo = Number(dateMatch[2]);
    let d = Number(dateMatch[3]);
    // 期間イベント: 終了日があり、開始日が過去なら今日の日付を使用
    const rangeMatch = dateText.match(/(\d{4})年(\d{2})月(\d{2})日\s*～\s*(\d{4})年(\d{2})月(\d{2})日/);
    if (rangeMatch) {
      const endY = Number(rangeMatch[4]);
      const endMo = Number(rangeMatch[5]);
      const endD = Number(rangeMatch[6]);
      const now = new Date();
      const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const todayY = jstNow.getUTCFullYear();
      const todayMo = jstNow.getUTCMonth() + 1;
      const todayD = jstNow.getUTCDate();
      const startVal = y * 10000 + mo * 100 + d;
      const endVal = endY * 10000 + endMo * 100 + endD;
      const todayVal = todayY * 10000 + todayMo * 100 + todayD;
      if (startVal < todayVal && endVal >= todayVal) {
        y = todayY; mo = todayMo; d = todayD;
      }
    }
    // リンク抽出
    const linkMatch = h5Html.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    const href = linkMatch[1].replace(/&amp;/g, "&").trim();
    const title = stripTags(linkMatch[2]).trim();
    if (!href || !title) continue;
    const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    events.push({ y, mo, d, title, url: absUrl });
  }
  return events;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("小田原市") ? address : `小田原市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県小田原市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectOdawaraEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectOdawaraEvents(maxDays) {
    const source = `ward_${ODAWARA_SOURCE.key}`;
    const label = ODAWARA_SOURCE.label;
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);

    // 日付範囲パラメータを構築
    const startY = nowJst.y;
    const startM = nowJst.m;
    const startD = nowJst.d;
    const endY = endJst.y;
    const endM = endJst.m;
    const endD = endJst.d;

    // ページネーションで一覧取得
    const rawEvents = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url =
        `${ODAWARA_SOURCE.baseUrl}/event/index.php` +
        `?start_y=${startY}&start_m=${startM}&start_d=${startD}` +
        `&end_y=${endY}&end_m=${endM}&end_d=${endD}` +
        `&evt_genre_chk%5B4%5D=1&pager_num=${page}`;
      try {
        const html = await fetchText(url);
        const pageEvents = parseListPage(html, ODAWARA_SOURCE.baseUrl);
        if (pageEvents.length === 0) break;
        rawEvents.push(...pageEvents);
        if (pageEvents.length < PER_PAGE) break;
      } catch (e) {
        console.warn(`[${label}] page ${page} fetch failed:`, e.message || e);
        break;
      }
    }

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map((e) => e.url))].slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseDetailMeta(html);
          const plainText = stripTags(html);
          const timeRange = parseTimeRangeFromText(plainText);
          // テキストベースの会場抽出フォールバック
          if (!meta.venue) {
            const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
            if (placeMatch) {
              let v = placeMatch[1].trim();
              v = v.replace(/\s*(?:住所|郵便番号|駐車|大きな地図|参加|申込|持ち物|対象|定員|電話|内容|ファクス|問い合わせ|日時|費用|備考|注意|詳細|についてのお知らせ).*$/, "").trim();
              v = v.replace(/[（(][^）)]*(?:駅|バス停|徒歩)[^）)]*[）)]$/g, "").trim();
              if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) meta.venue = v;
            }
          }
          return { url, meta, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.url, r.value);
        }
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const detail = detailMap.get(ev.url);
      let venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      // ナビゲーション等のゴミテキストを除外
      if (/(かんたん|検索|メニュー|サイトマップ|ページの先頭|トップページ|ホーム)/.test(venue)) venue = "";
      // 部屋名・階数を除去
      venue = venue.replace(/\s*\d*階.*$/, "").replace(/\s*(ガイダンス室|会議室|和室|多目的室|研修室|講堂).*$/, "").trim();
      // タイトルから施設名を抽出 (フォールバック)
      if (!venue) {
        const facilityRe = /(図書館|記念館|公民館|センター|アリーナ|ホール|プラザ|美術館|博物館|給食センター)/;
        // 「施設名「イベント名」」形式
        const titleFacMatch = ev.title.match(/^(?:【[^】]*】)?([^「【（(]+(?:館|センター|アリーナ|ホール|プラザ))/);
        if (titleFacMatch) {
          venue = titleFacMatch[1].trim();
        } else if (facilityRe.test(ev.title)) {
          // タイトル内にある施設名キーワード
          const m2 = ev.title.match(/([^\s「」【】（）()]{2,}(?:図書館|記念館|公民館|センター|アリーナ|ホール|プラザ|美術館|博物館|給食センター))/);
          if (m2) venue = m2[1].trim();
        }
      }
      let rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      // サイト共通のフッター住所（市役所）を除外
      if (/荻窪300/.test(rawAddress) && !/市役所/.test(venue)) rawAddress = "";
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(ODAWARA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), ODAWARA_SOURCE);
      point = resolveEventPoint(ODAWARA_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(ODAWARA_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const dateKeyStr = ev.dateKey.replace(/-/g, "");
      const id = `${source}:${ev.url}:${ev.title}:${dateKeyStr}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: address || "",
        url: ev.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectOdawaraEvents };
