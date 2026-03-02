/**
 * 佐野市 4児童館 PDFコレクター
 *
 * 佐野市公式サイトの児童館おたよりPDFから毎月のイベントを抽出する。
 * PDF URLは予測可能なパターン: https://www.city.sano.lg.jp/material/files/group/{groupId}/YYYYMM.pdf
 *
 * 対象施設:
 *   堀米児童館 (group 37), 吉水児童館 (group 38),
 *   田沼児童館 (group 39), 葛生児童館 (group 40)
 */
const { fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const { normalizeJaDigits } = require("../text-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { SANO_SOURCE } = require("../../config/wards");

const FACILITIES = [
  { key: "horigome",  groupId: 37, name: "堀米児童館", address: "佐野市堀米町597" },
  { key: "yoshimizu", groupId: 38, name: "吉水児童館", address: "佐野市吉水町866-7" },
  { key: "tanuma",    groupId: 39, name: "田沼児童館", address: "佐野市戸室町31-13" },
  { key: "kuzu",      groupId: 40, name: "葛生児童館", address: "佐野市葛生東1-11-34" },
];

const SKIP_RE = /休\s*館|閉\s*館|利用案内|お問い合わせ|電話|ＴＥＬ|TEL|FAX|アクセス|所在地|令和\d|発行|建国記念|天皇誕生|振替休|お休み|祝日/;
const JUNK_TITLE_RE = /^[\d\s\-～〜:：（）()、。,.はの・＆&]+$|^.{0,2}$|申込|問合|持ち物|日\s*時|場\s*所|会\s*場|時\s*間\s*[：:]|定員|対象|費用|注意|詳細|毎週|毎月|お知らせ|カレンダー|^\d+\s*月|今月の|実施中|受付|内容[：:]|開\s*催|期間|HP|ホーム|ページ|インスタ|こちら|www\.|http|だより|月\s*号|です[。！]$|ます[。！]$|ください|ましょう|※印|午前\s*\d|午後\s*\d/;

/** 全角数字→半角数字 正規化 */
function normalizeFullWidth(str) {
  return str.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30));
}

/** タイトルを清掃 */
function cleanTitle(raw) {
  let t = raw
    .replace(/^#+\s*/, "")
    .replace(/^[●★◆◎☆■□▲△▼▽♪♫◇]\s*/, "")
    .replace(/[「」]/g, "")
    .replace(/^[～〜~\-－]+\s*/, "")
    .replace(/\s*[【\[（(][^】\]）)]*(?:対象|歳児|年生|以上|以下|限定|要予約|予約制|定員|申込)[^】\]）)]*[】\]）)]?\s*$/, "")
    .replace(/\s+は[、,]?\s*$/, "")
    .replace(/\s+の\s*$/, "")
    .trim();
  t = t.replace(/^[\d・,、\s]+$/, "");
  return t;
}

/** タイトルが有効かチェック */
function isValidTitle(t) {
  if (!t || t.length < 3) return false;
  if (SKIP_RE.test(t)) return false;
  if (JUNK_TITLE_RE.test(t)) return false;
  if (/^[\d\s\-～〜:：（）()、。,.・＆&#/*]+$/.test(t)) return false;
  return true;
}

/** 時刻テキストから timeRange を抽出 */
function extractTime(text) {
  const rangeMatch = text.match(/(?:午前|午後)?\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~\-－]\s*(?:午前|午後)?\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
  if (rangeMatch) {
    return {
      startHour: Number(rangeMatch[1]), startMin: Number(rangeMatch[2]),
      endHour: Number(rangeMatch[3]), endMin: Number(rangeMatch[4]),
    };
  }
  const startMatch = text.match(/(?:午前|午後)?\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
  if (startMatch) {
    return {
      startHour: Number(startMatch[1]), startMin: Number(startMatch[2]),
      endHour: null, endMin: null,
    };
  }
  return null;
}

/**
 * PDFマークダウンからイベントを抽出
 *
 * 3つの抽出戦略:
 * A) "N日(曜)" or "M月N日(曜)" + currentTitle
 * B) "N日 「タイトル」" パターン
 * C) "M/D(曜)" スラッシュ日付 + currentTitle
 */
function parseSanoPdf(text, defaultY, defaultMo) {
  const events = [];
  const normalized = normalizeJaDigits(text.normalize("NFKC"))
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(日|月|時)/g, "$1$2")
    .replace(/(\d)\s*[：:]\s*(\d)/g, "$1:$2");

  const lines = normalized.split(/\n/);
  let currentTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // ルビブロックスキップ
    if (/^>\s/.test(rawLine)) continue;

    const line = normalizeFullWidth(rawLine);

    // ノイズ行スキップ
    if (SKIP_RE.test(line)) continue;
    if (/^\d{4}\s*年\s*\d{1,2}\s*月/.test(line)) continue;
    if (/^日\s+月\s+火\s+水\s+木\s+金\s+土/.test(line)) continue;

    // ## markdown見出し → タイトル候補
    if (/^#+\s+/.test(line)) {
      const t = cleanTitle(line);
      if (isValidTitle(t)) {
        currentTitle = t;
      }
      continue;
    }

    // ● ★ ◆ ◎ で始まるタイトル
    const bulletMatch = line.match(/^[●★◆◎☆■□▲△▼▽♪♫◇]\s*(.{2,50})/);
    if (bulletMatch) {
      const t = cleanTitle(bulletMatch[1]);
      if (isValidTitle(t)) {
        currentTitle = t;
      }
    }

    // 戦略C: スラッシュ日付 "M/D(曜)"
    const slashDateRe = /(\d{1,2})\s*[\/]\s*(\d)\s*(\d)?\s*[（(]\s*([月火水木金土日])[）)]/;
    const dmC = line.match(slashDateRe);
    if (dmC) {
      const evMo = Number(dmC[1]);
      const d = dmC[3] ? Number(dmC[2] + dmC[3]) : Number(dmC[2]);
      if (d >= 1 && d <= 31 && evMo >= 1 && evMo <= 12) {
        const dateIdx = line.indexOf(dmC[0]);
        let beforeDate = line.substring(0, dateIdx).trim()
          .replace(/^日\s*時\s*[：:．…]\s*/, "")
          .replace(/^[●★◆◎☆■□▲△▼▽♪♫#]+\s*/, "").trim();
        beforeDate = cleanTitle(beforeDate);
        let title = isValidTitle(beforeDate) ? beforeDate : currentTitle;
        if (title) {
          const timeText = line.substring(dateIdx + dmC[0].length);
          const nextLine = (i + 1 < lines.length) ? normalizeFullWidth(lines[i + 1]) : "";
          const timeRange = extractTime(timeText + " " + nextLine);
          events.push({ y: defaultY, mo: evMo, d, title, timeRange });
        }
        continue;
      }
    }

    // 戦略A: 日付+曜日パターン: "N日(曜)" or "M月N日(曜)"
    const dateWithDowRe = /(?:(\d{1,2})月\s*)?(\d{1,2})\s*日\s*[（(]\s*([月火水木金土日])[）)]/;
    const dmA = line.match(dateWithDowRe);
    if (dmA) {
      const evMo = dmA[1] ? Number(dmA[1]) : defaultMo;
      const d = Number(dmA[2]);
      if (d < 1 || d > 31) continue;

      const dateIdx = line.indexOf(dmA[0]);
      const beforeDate = cleanTitle(line.substring(0, dateIdx));

      let title = isValidTitle(beforeDate) ? beforeDate : currentTitle;
      if (!title) continue;

      const timeText = line.substring(dateIdx + dmA[0].length);
      const nextLine = (i + 1 < lines.length) ? normalizeFullWidth(lines[i + 1]) : "";
      const timeRange = extractTime(timeText + " " + nextLine);

      events.push({ y: defaultY, mo: evMo, d, title, timeRange });
      continue;
    }

    // 戦略B: 日付+「タイトル」パターン: "N日 「育児相談」"
    const dateQuoteRe = /(\d{1,2})\s*日\s+(.+)/;
    const dmB = line.match(dateQuoteRe);
    if (dmB && /[「]/.test(dmB[2])) {
      const d = Number(dmB[1]);
      if (d < 1 || d > 31) continue;

      const titles = [];
      const quoteRe = /[「]([^」]+)[」]/g;
      let qm;
      while ((qm = quoteRe.exec(dmB[2])) !== null) {
        const t = cleanTitle(qm[1]);
        if (isValidTitle(t)) titles.push(t);
      }
      if (titles.length === 0) continue;

      const combinedTitle = titles.join("・");
      events.push({ y: defaultY, mo: defaultMo, d, title: combinedTitle, timeRange: null });
      continue;
    }
  }

  return events;
}

function createCollectSanoJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectSanoJidokanEvents(maxDays) {
    const source = SANO_SOURCE;
    const srcKey = `ward_${source.key}`;
    const label = "佐野市児童館";

    // 対象月のPDF URLを生成
    const months = getMonthsForRange(maxDays);
    const pdfRequests = [];
    for (const facility of FACILITIES) {
      for (const { year, month } of months) {
        const ym = `${year}${String(month).padStart(2, "0")}`;
        const pdfUrl = `https://www.city.sano.lg.jp/material/files/group/${facility.groupId}/${ym}.pdf`;
        pdfRequests.push({ facility, url: pdfUrl, year, month });
      }
    }

    // PDF をバッチ取得 (3並列)
    const BATCH_SIZE = 3;
    const allEvents = [];

    for (let i = 0; i < pdfRequests.length; i += BATCH_SIZE) {
      const batch = pdfRequests.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (req) => {
          const markdown = await fetchChiyodaPdfMarkdown(req.url);
          if (!markdown || markdown.length < 100) return [];
          const events = parseSanoPdf(markdown, req.year, req.month);
          return events.map((ev) => ({ ...ev, facility: req.facility }));
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.length > 0) {
          allEvents.push(...r.value);
        }
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.facility.key}:${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = ev.facility.name;
      const venueAddress = ev.facility.address;

      let geoCandidates = [
        `栃木県${venueAddress}`,
        `栃木県佐野市 ${venueName}`,
      ];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("栃木県") ? fmAddr : `栃木県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `佐野市 ${venueName}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );
      const id = `${srcKey}:jidokan:${ev.facility.key}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: source.label,
        title: `${ev.title}（${venueName}）`,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venueName,
        address: address || "",
        url: `https://www.city.sano.lg.jp/kurashi_gyosei/kosodate_kyoiku/kosodate/1/7811.html`,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from ${FACILITIES.length} facility PDFs)`);
    return results;
  };
}

module.exports = { createCollectSanoJidokanEvents };
