const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { SAITAMA_CITY_SOURCE } = require("../../config/wards");

/**
 * さいたま市 保健センター定期事業（離乳食教室・むし歯予防教室・育児相談）
 *
 * 各区役所保健センターで定期開催される子育て関連事業のスケジュールを
 * 市HPのHTMLテーブルから抽出する。
 */

const BASE = "https://www.city.saitama.lg.jp";

/**
 * 区別 保健センター情報
 * venue: 会場名, address: 住所
 */
const WARD_HOKEN = {
  "西区":   { venue: "西区役所保健センター",   address: "さいたま市西区高木598" },
  "北区":   { venue: "北区役所保健センター",   address: "さいたま市北区宮原町3-539-1" },
  "大宮区": { venue: "大宮区役所保健センター", address: "さいたま市大宮区大門町3-1" },
  "見沼区": { venue: "見沼区役所保健センター", address: "さいたま市見沼区中央1-1" },
  "中央区": { venue: "中央区役所保健センター", address: "さいたま市中央区下落合5-7-10" },
  "桜区":   { venue: "桜区役所保健センター",   address: "さいたま市桜区道場4-3-1" },
  "浦和区": { venue: "浦和区役所保健センター", address: "さいたま市浦和区常盤6-4-4" },
  "南区":   { venue: "南区役所保健センター",   address: "さいたま市南区別所4-2-1" },
  "緑区":   { venue: "緑区役所保健センター",   address: "さいたま市緑区中尾975-1" },
  "岩槻区": { venue: "岩槻区役所保健センター", address: "さいたま市岩槻区古ケ場2-19-1" },
};

/**
 * 事業一覧: 各index pageから区別リンクを取得し、詳細ページのテーブルから日付を抽出
 */
const PROGRAMS = [
  { name: "離乳食教室",   indexPath: "/002/001/014/008/001/004/" },
  { name: "むし歯予防教室", indexPath: "/002/001/014/008/001/005/" },
  { name: "育児相談",     indexPath: "/002/001/014/008/001/006/" },
  { name: "公民館等育児相談", indexPath: "/002/001/014/008/001/007/" },
];

/**
 * インデックスページから区別リンクを抽出
 * @returns {Array<{ward: string, href: string, title: string}>}
 */
function parseIndexPage(html) {
  const links = [];
  const linkRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const text = stripTags(m[2]).trim();
    // "離乳食教室 見沼区" or "育児相談（乳児期・幼児期） 北区" のようなパターン
    const wardMatch = text.match(/(西区|北区|大宮区|見沼区|中央区|桜区|浦和区|南区|緑区|岩槻区)/);
    if (wardMatch) {
      links.push({
        ward: wardMatch[1],
        href: m[1],
        title: text,
      });
    }
  }
  // 重複除去
  const seen = new Set();
  return links.filter(l => {
    const key = l.ward + ":" + l.href;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * ページのcaptionやh3から年度(令和N年度)を抽出
 * 年度: April of 令和N年 ～ March of 令和N+1年
 * @returns {{ aprilYear: number } | null}
 */
function extractFiscalYear(html) {
  const text = stripTags(html);
  const fyMatch = text.match(/令和\s*(\d{1,2})\s*年\s*度/);
  if (fyMatch) {
    return { aprilYear: 2018 + Number(fyMatch[1]) };
  }
  return null;
}

/**
 * 年度から月→年を推定
 */
function yearForMonth(mo, fy) {
  if (fy) {
    return mo >= 4 ? fy.aprilYear : fy.aprilYear + 1;
  }
  const now = new Date();
  return new Date(now.getTime() + 9 * 3600000).getFullYear();
}

/**
 * 詳細ページのテーブルから日付を全て抽出
 *
 * 3パターン対応:
 *   1) 令和N年M月D日 — 年付きフル日付
 *   2) M月D日 — 年なし、年度から推定
 *   3) 行ベース: 先頭セルに「令和N年M月」or「M月」、他セルに「D日」
 *      (南区育児相談等の分割テーブル形式)
 */
function parseDatesFromTable(html) {
  const dates = [];
  const fy = extractFiscalYear(html);

  // まず行ベースパーサーを試す (パターン3)
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  let currentMo = null;
  let currentY = null;
  let usedRowParser = false;

  while ((trMatch = trRe.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const cells = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cm;
    while ((cm = cellRe.exec(rowHtml)) !== null) {
      cells.push(stripTags(cm[1]).trim());
    }
    if (cells.length === 0) continue;

    // 先頭セルから月ラベルを抽出
    const firstCell = cells[0];
    // "令和N年M月" パターン
    const reiwaMonthMatch = firstCell.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月/);
    if (reiwaMonthMatch) {
      currentY = 2018 + Number(reiwaMonthMatch[1]);
      currentMo = Number(reiwaMonthMatch[2]);
    } else {
      // "M月" のみ（先頭セルがN月で始まる場合）
      const moOnlyMatch = firstCell.match(/^(\d{1,2})\s*月$/);
      if (moOnlyMatch) {
        currentMo = Number(moOnlyMatch[1]);
        if (!currentY) currentY = yearForMonth(currentMo, fy);
        // 1月に切り替わったらcurrentYを更新
        if (currentMo <= 3 && fy) currentY = fy.aprilYear + 1;
      }
    }

    // 他のセルから「D日」を抽出（月+日の完全パターンも含む）
    for (let ci = 0; ci < cells.length; ci++) {
      const cell = cells[ci];
      // 「D日（曜日）」のみ（月なし）→ currentMo/currentY を使用
      const dayOnlyMatch = cell.match(/^(\d{1,2})\s*日\s*[（(]/);
      if (dayOnlyMatch && currentMo && currentY) {
        const d = Number(dayOnlyMatch[1]);
        if (d >= 1 && d <= 31) {
          dates.push({ y: currentY, mo: currentMo, d });
          usedRowParser = true;
        }
        continue;
      }
    }
  }

  // パターン1,2: セル単位パーサー（行ベースで拾えなかった場合のみ）
  if (!usedRowParser) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let m;
    while ((m = tdRe.exec(html)) !== null) {
      const text = stripTags(m[1]).trim();

      // パターン1: 令和N年M月D日
      const fullMatch = text.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
      if (fullMatch) {
        const y = 2018 + Number(fullMatch[1]);
        const mo = Number(fullMatch[2]);
        const d = Number(fullMatch[3]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          dates.push({ y, mo, d });
        }
        continue;
      }

      // パターン2: M月D日（曜日） — 令和N年なし
      const shortMatch = text.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
      if (shortMatch) {
        const mo = Number(shortMatch[1]);
        const d = Number(shortMatch[2]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
          dates.push({ y: yearForMonth(mo, fy), mo, d });
        }
      }
    }
  }

  // 重複除去
  const seen = new Set();
  return dates.filter(dd => {
    const key = `${dd.y}-${dd.mo}-${dd.d}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createCollectSaitamaHokenEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;

  return async function collectSaitamaHokenEvents(maxDays) {
    const source = SAITAMA_CITY_SOURCE;
    const srcKey = `ward_${source.key}`;
    const label = "さいたま市保健センター";

    const allEvents = [];

    for (const program of PROGRAMS) {
      // インデックスページ取得
      let indexHtml;
      try {
        indexHtml = await fetchText(BASE + program.indexPath);
      } catch (e) {
        console.warn(`[${label}] index fetch failed (${program.name}):`, e.message);
        continue;
      }

      const wardLinks = parseIndexPage(indexHtml);

      // 区別ページを並列取得 (5並列)
      for (let i = 0; i < wardLinks.length; i += 5) {
        const batch = wardLinks.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map(async (link) => {
            const url = link.href.startsWith("http") ? link.href : BASE + link.href;
            const html = await fetchText(url);
            const dates = parseDatesFromTable(html);
            return { ward: link.ward, url, dates, programName: program.name };
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled") {
            allEvents.push(r.value);
          }
        }
      }
    }

    // イベントレコード生成
    const byId = new Map();

    for (const ev of allEvents) {
      const hoken = WARD_HOKEN[ev.ward];
      if (!hoken) continue;

      const venueName = hoken.venue;
      const venueAddress = hoken.address;
      const title = `${ev.programName}（${ev.ward}）`;

      // ジオコーディング (初回のみ、以後はキャッシュ)
      let point = null;
      const geoCandidates = [
        `埼玉県${venueAddress}`,
        `埼玉県さいたま市 ${venueName}`,
      ];
      point = await geocodeForWard(geoCandidates, source);
      point = resolveEventPoint(source, venueName, point, `さいたま市 ${venueName}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      for (const dd of ev.dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, null);
        const id = `${srcKey}:hoken:${ev.ward}:${ev.programName}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: srcKey,
          source_label: source.label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venueName,
          address: address || "",
          url: ev.url,
          lat: point ? point.lat : source.center.lat,
          lng: point ? point.lng : source.center.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectSaitamaHokenEvents };
