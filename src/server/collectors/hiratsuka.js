const { HIRATSUKA_SOURCE } = require("../../config/wards");
const { parseYmdFromJst, getMonthsForRange, inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { fetchText } = require("../fetch-utils");

const CHILD_RE = /(子ども|こども|子育て|親子|育児|乳幼児|幼児|児童|キッズ|ベビー|赤ちゃん|読み聞かせ|絵本|離乳食|妊娠|出産|おはなし|ブックスタート|0歳|1歳|2歳|3歳)/;

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("平塚市") ? address : `平塚市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県平塚市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectHiratsukaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectHiratsukaEvents(maxDays) {
    const source = `ward_${HIRATSUKA_SOURCE.key}`;
    const label = HIRATSUKA_SOURCE.label;
    const baseUrl = HIRATSUKA_SOURCE.baseUrl;
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    const months = getMonthsForRange(maxDays);

    // 月ごとに API 取得
    const allEvents = [];
    for (let i = 0; i < months.length; i++) {
      const ym = months[i];
      const apiUrl = `${baseUrl}/htbin/event/api.cgi?Y=${ym.year}&M=${ym.month}&m=0&o=asc`;
      try {
        const res = await fetch(apiUrl, {
          headers: {
            "Referer": "https://www.city.hiratsuka.kanagawa.jp/events/index.html",
          },
        });
        if (!res.ok) {
          console.warn(`[${label}] API ${ym.year}/${ym.month} returned ${res.status}`);
          continue;
        }
        const json = await res.json();
        if (Array.isArray(json.events)) {
          allEvents.push(...json.events);
        }
      } catch (e) {
        console.warn(`[${label}] API ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
      // レート制限: 最後のリクエスト以外は 500ms 待機
      if (i < months.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // 子育て関連イベントをフィルタ
    const childEvents = allEvents.filter((ev) => {
      const title = ev.event_name || "";
      const desc = ev.description || "";
      return CHILD_RE.test(title) || CHILD_RE.test(desc);
    });

    // イベントレコード生成
    const byId = new Map();
    for (const item of childEvents) {
      if (!item.event_name || !item.begin_date) continue;

      const title = stripTags(item.event_name).replace(/[\r\n]+/g, " ").trim();
      if (!title) continue;

      // begin_date: "YYYY/MM/DD" 形式
      const beginParts = String(item.begin_date).split("/");
      if (beginParts.length !== 3) continue;
      const beginKey = `${beginParts[0]}-${beginParts[1].padStart(2, "0")}-${beginParts[2].padStart(2, "0")}`;

      // end_date があれば日程を展開、なければ begin_date のみ
      let endKey = beginKey;
      if (item.end_date) {
        const endParts = String(item.end_date).split("/");
        if (endParts.length === 3) {
          endKey = `${endParts[0]}-${endParts[1].padStart(2, "0")}-${endParts[2].padStart(2, "0")}`;
        }
      }

      // 日ごとに展開 (UTC 正午基準で日付をインクリメント)
      const dates = [];
      if (beginKey === endKey) {
        dates.push(beginKey);
      } else {
        const [sy, sm, sd] = beginKey.split("-").map(Number);
        const [ey, em, ed] = endKey.split("-").map(Number);
        const cur = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
        const fin = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));
        while (cur <= fin && dates.length < 30) {
          const y = cur.getUTCFullYear();
          const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
          const d = String(cur.getUTCDate()).padStart(2, "0");
          dates.push(`${y}-${m}-${d}`);
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
      }

      // URL 構築
      let eventUrl = "";
      if (item.url) {
        eventUrl = item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`;
      } else {
        eventUrl = `${baseUrl}/events/index.html`;
      }

      // 会場: venue+address が連結されている場合がある
      let rawPlace = stripTags(item.place || "").trim();
      // 余分な注釈を除去
      rawPlace = rawPlace.replace(/【[^】]*】.*$/, "").trim();
      // "施設名 平塚市XXX" の形式 → 施設名と住所に分離
      let venue = rawPlace;
      let placeAddress = "";
      const addrMatch = rawPlace.match(/平塚市[^\s（(]+\d+[^\s]*/);
      if (addrMatch) {
        placeAddress = addrMatch[0];
        venue = rawPlace.slice(0, addrMatch.index).replace(/[（(][^）)]*[）)]$/g, "").trim();
        if (!venue) venue = rawPlace;
      }
      // 括弧内の部屋名を除去
      venue = venue.replace(/[（(][^）)]*(?:階|会議室|和室|講堂|ホール|プレイルーム)[^）)]*[）)]/g, "").trim();
      // 括弧外の階数・部屋名を除去
      venue = venue.replace(/\s*\d*階.*$/, "").trim();
      venue = venue.replace(/\s+(大ホール|小ホール|会議室|講堂|和室|調理室|多目的室|視聴覚室).*$/, "").trim();

      // 会場から住所候補を構築
      let geoCandidates = buildGeoCandidates(venue, placeAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(HIRATSUKA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }

      let point = null;
      if (geoCandidates.length > 0) {
        point = await geocodeForWard(geoCandidates.slice(0, 7), HIRATSUKA_SOURCE);
      }
      point = resolveEventPoint(HIRATSUKA_SOURCE, venue, point, `${label} ${venue}`);
      const address = resolveEventAddress(HIRATSUKA_SOURCE, venue, `${label} ${venue}`, point);

      for (const dateKey of dates) {
        if (dateKey < todayStr || dateKey > endStr) continue;

        const startsAt = `${dateKey}T00:00:00+09:00`;
        const endsAt = null;
        const dateKeyStr = dateKey.replace(/-/g, "");
        const id = `${source}:${eventUrl}:${title}:${dateKeyStr}`;
        if (byId.has(id)) continue;

        byId.set(id, {
          id,
          source,
          source_label: label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue,
          address: address || "",
          url: eventUrl,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

/**
 * 平塚市図書館カレンダーコレクター
 * https://www.lib.city.hiratsuka.kanagawa.jp/viewer/calendar-monthly.html
 * リスト表示から子育て関連イベント(おはなし会, ブックスタート等)を収集
 */
const LIB_BASE = "https://www.lib.city.hiratsuka.kanagawa.jp";

const LIB_CHILD_RE = /(おはなし|おはなし会|ブックスタート|読み聞かせ|こども|子ども|映画会|人形劇|赤ちゃん|乳幼児|幼児|絵本|キッズ)/;

const LIB_BRANCHES = {
  "中央図書館": "平塚市浅間町12-41",
  "北図書館": "平塚市田村3-12-5",
  "西図書館": "平塚市山下3-29-1",
  "南図書館": "平塚市袖ヶ浜20-1",
};

function createCollectHiratsukaLibraryEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectHiratsukaLibraryEvents(maxDays) {
    const source = `ward_${HIRATSUKA_SOURCE.key}`;
    const label = `${HIRATSUKA_SOURCE.label}図書館`;
    const months = getMonthsForRange(maxDays);
    const byId = new Map();

    // 月ごとにカレンダーリスト表示を取得
    for (const ym of months) {
      const url = `${LIB_BASE}/viewer/calendar-monthly.html?date=${ym.year}/${ym.month}/1&T_Display_Type=display_type_list`;
      let html;
      try {
        html = await fetchText(url);
      } catch (e) {
        console.warn(`[${label}] ${ym.year}/${ym.month} fetch failed:`, e.message || e);
        continue;
      }

      const plainText = stripTags(html);

      // リスト表示のイベント行をパース
      // パターン: M月D日 ... <a href="../viewer/info.html?id=NNN">Title</a>
      // テーブル行から日付とリンクを抽出
      const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rm;
      let currentDate = null;
      while ((rm = rowRe.exec(html)) !== null) {
        const row = rm[1];
        // 日付セル: M月D日
        const dateMatch = row.match(/(\d{1,2})月(\d{1,2})日/);
        if (dateMatch) {
          currentDate = { y: ym.year, mo: Number(dateMatch[1]), d: Number(dateMatch[2]) };
        }
        if (!currentDate) continue;

        // イベントリンク: info.html?id=NNN
        const linkRe = /<a\s+[^>]*href="([^"]*info\.html\?id=\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let lm;
        while ((lm = linkRe.exec(row)) !== null) {
          const href = lm[1].replace(/&amp;/g, "&").trim();
          const title = stripTags(lm[2]).trim();
          if (!title) continue;
          if (!LIB_CHILD_RE.test(title)) continue;

          const absUrl = href.startsWith("http") ? href : `${LIB_BASE}/viewer/${href.replace(/^\.\.\/viewer\//, "")}`;

          if (!inRangeJst(currentDate.y, currentDate.mo, currentDate.d, maxDays)) continue;

          // 図書館ブランチ推定
          let branch = "";
          let branchAddr = "";
          for (const [name, addr] of Object.entries(LIB_BRANCHES)) {
            if (title.includes(name)) {
              branch = `平塚市${name}`;
              branchAddr = addr;
              break;
            }
          }

          // ジオコーディング
          let geoCandidates = [];
          if (branchAddr) {
            geoCandidates.push(`神奈川県${branchAddr}`);
          }
          if (getFacilityAddressFromMaster && branch) {
            const fmAddr = getFacilityAddressFromMaster(HIRATSUKA_SOURCE.key, branch);
            if (fmAddr) {
              const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
              geoCandidates.unshift(full);
            }
          }
          if (branch) geoCandidates.push(`神奈川県平塚市 ${branch}`);
          let point = await geocodeForWard(geoCandidates.slice(0, 7), HIRATSUKA_SOURCE);
          point = resolveEventPoint(HIRATSUKA_SOURCE, branch, point, branchAddr ? `神奈川県${branchAddr}` : `平塚市 ${branch}`);
          const address = resolveEventAddress(HIRATSUKA_SOURCE, branch, branchAddr ? `神奈川県${branchAddr}` : `平塚市 ${branch}`, point);

          const dateKey = `${currentDate.y}${String(currentDate.mo).padStart(2, "0")}${String(currentDate.d).padStart(2, "0")}`;
          const { startsAt, endsAt } = buildStartsEndsForDate(currentDate, null);
          const id = `${source}:${absUrl}:${title}:${dateKey}`;
          if (byId.has(id)) continue;
          byId.set(id, {
            id,
            source,
            source_label: HIRATSUKA_SOURCE.label,
            title,
            starts_at: startsAt,
            ends_at: endsAt,
            venue_name: branch || "平塚市図書館",
            address: address || "",
            url: absUrl,
            lat: point ? point.lat : null,
            lng: point ? point.lng : null,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectHiratsukaEvents, createCollectHiratsukaLibraryEvents };
