/**
 * 春日部市 児童センターPDFコレクター
 *
 * 2施設（グーかすかべ・スマイルしょうわ）の月間予定表PDFから
 * jina.ai proxy経由でテキスト化し、イベントを抽出する。
 *
 * PDF URL パターン:
 *   g-gekkan{令和年}{MM}.pdf (グーかすかべ)
 *   s-gekkan{令和年}{MM}.pdf (スマイルしょうわ)
 */
const { fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { KASUKABE_SOURCE } = require("../../config/wards");

const PDF_BASE = "https://www.city.kasukabe.lg.jp/material/files/group/25";

/** 施設定義 */
const FACILITIES = [
  {
    id: "goo",
    name: "グーかすかべ",
    fullName: "春日部第2児童センター グーかすかべ",
    prefix: "g-gekkan",
    pageUrl: "https://www.city.kasukabe.lg.jp/soshikikarasagasu/kodomoseisakuka/gyomuannai/7/1/1/3/2980.html",
    address: "春日部市粕壁3丁目8番1号",
    lat: 35.983497,
    lng: 139.751262,
  },
  {
    id: "smile",
    name: "スマイルしょうわ",
    fullName: "庄和児童センター スマイルしょうわ",
    prefix: "s-gekkan",
    pageUrl: "https://www.city.kasukabe.lg.jp/kosodate_kyoiku_bunka/kasukabecosodateoensite/oyakodeodekake/14657.html",
    address: "春日部市金崎839-1",
    lat: 35.9918184,
    lng: 139.8029016,
  },
];

/** スキップ対象 */
const SKIP_RE = /^(?:自由来館|自由利用|開放日|開館|休館|お休み|閉館|祝日)$/;

/**
 * PDFテキストから年月を推定
 */
function detectYearMonth(text) {
  const nText = text.normalize("NFKC");

  // 「令和N年M月」
  const reiwa = nText.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月/);
  if (reiwa) return { year: 2018 + Number(reiwa[1]), month: Number(reiwa[2]) };

  // 「2026年3月」
  const western = nText.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (western) return { year: Number(western[1]), month: Number(western[2]) };

  // 「3月号」
  const monthOnly = nText.match(/(\d{1,2})\s*月\s*号/);
  if (monthOnly) {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return { year: jst.getUTCFullYear(), month: Number(monthOnly[1]) };
  }

  return null;
}

/**
 * 時刻文字列をパース
 * 「10:00〜12:00」「(1)10:00〜12:00 (2)13:00〜15:00」→ 最初の時間帯を返す
 */
function parseTimeFromText(text) {
  const m = text.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~\-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
  if (!m) return null;
  return {
    startHour: Number(m[1]),
    startMin: Number(m[2]),
    endHour: Number(m[3]),
    endMin: Number(m[4]),
  };
}

/** 場所名パターン (除去対象) */
const ROOM_RE = /(?:集会室|多目的室|体育室|屋上ひろば|プレイルーム|遊戯室|音楽スタジオ)/;

/**
 * PDFテキストからイベントを抽出
 *
 * jina.ai のPDF→テキスト変換結果:
 *   > N日
 *   曜日 場所  イベント名  HH:MM~HH:MM  説明...  対象  定員  申込
 *
 * 「> N日」独立行 → 直後1行がイベント詳細
 */
function parseKasubakePdfEvents(text, fallbackYm) {
  const events = [];
  const nText = text.normalize("NFKC");

  const ym = detectYearMonth(nText) || fallbackYm;
  if (!ym) return events;
  const { year, month } = ym;

  const lines = nText.split(/\n/);
  const seen = new Set();

  let pendingDay = null; // 次の非空行をイベントとして処理する

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // 「> N日」パターン: 日付行
    const dayLineMatch = trimmed.match(/^>\s*(\d{1,2})\s*日\s*$/);
    if (dayLineMatch) {
      const d = Number(dayLineMatch[1]);
      pendingDay = (d >= 1 && d <= 31) ? d : null;
      continue;
    }

    // pendingDayがセットされている → この行がイベント詳細行
    if (pendingDay !== null) {
      const day = pendingDay;
      pendingDay = null; // 1行だけ処理

      // 曜日で始まる行をパース: 曜日 場所  イベント名  時間  説明...
      const ev = extractEventFromDetailLine(trimmed, year, month, day, seen);
      if (ev) events.push(ev);
    }
  }

  return events;
}

/**
 * 詳細行からイベント情報を抽出
 * 形式: 「曜日 場所  イベント名  HH:MM~HH:MM  説明...」
 */
function extractEventFromDetailLine(line, year, month, day, seen) {
  // 曜日を除去
  let text = line.replace(/^[日月火水木金土祝]\s*/, "").trim();
  if (!text) return null;

  // 時刻を抽出
  const timeRange = parseTimeFromText(text);

  // 2+スペース区切りでフィールド分割を試みる
  const fields = text.split(/\s{2,}/);

  let title = null;

  if (fields.length >= 3) {
    // fields[0] = 場所, fields[1] = イベント名, fields[2] = 時間, fields[3+] = 説明等
    // 場所名を確認してスキップ
    const startIdx = ROOM_RE.test(fields[0]) ? 1 : 0;
    // 時間フィールドの位置を特定
    let timeIdx = -1;
    for (let j = startIdx; j < fields.length; j++) {
      if (/\d{1,2}:\d{2}[~～\-]/.test(fields[j])) {
        timeIdx = j;
        break;
      }
    }
    // イベント名 = startIdx から timeIdx までのフィールドを結合
    if (timeIdx > startIdx) {
      title = fields.slice(startIdx, timeIdx).join(" ").trim();
    } else if (timeIdx === -1) {
      // 時間がない場合は場所以降の最初のフィールド
      title = fields[startIdx];
    }
  }

  // フィールド分割で取れなかった場合のフォールバック
  if (!title) {
    title = text
      .replace(/\d{1,2}\s*:\s*\d{2}\s*[~～\-]\s*\d{1,2}\s*:\s*\d{2}/g, "")
      .replace(ROOM_RE, "")
      .replace(/\s+/g, " ")
      .trim();
    // 説明部分を除去（最初の句読点や長い記述以降）
    title = title.replace(/\s{2,}.*/, "").trim();
  }

  if (!title) return null;
  if (SKIP_RE.test(title)) return null;
  if (title.length < 2) return null;
  // ヘッダー行
  if (/講座.*イベント名|場所.*時間/.test(title)) return null;

  // 重複排除
  const key = `${day}:${title}`;
  if (seen.has(key)) return null;
  seen.add(key);

  return { y: year, mo: month, d: day, title, timeRange };
}

/**
 * スマイルしょうわ形式のPDFテキストからイベントを抽出
 *
 * イベント名が【】括弧内 or ## ヘッダーにあり、
 * 日時情報はテキスト内の「N日(曜)」「N/N(曜)」パターン
 */
function parseSmilePdfEvents(text, fallbackYm) {
  const events = [];
  const nText = text.normalize("NFKC");

  const ym = detectYearMonth(nText) || fallbackYm;
  if (!ym) return events;
  const { year, month } = ym;

  const seen = new Set();

  // 全ブロック境界 (【】 and ##) の位置を収集
  const boundaries = [];
  const bracketRe = /【([^】]+)】/g;
  const headerRe = /^##\s+(.+)/gm;
  let bm;
  while ((bm = bracketRe.exec(nText)) !== null) {
    boundaries.push({ title: bm[1].trim(), startIdx: bm.index, endIdx: bm.index + bm[0].length });
  }
  while ((bm = headerRe.exec(nText)) !== null) {
    boundaries.push({ title: bm[1].trim(), startIdx: bm.index, endIdx: bm.index + bm[0].length });
  }
  // 位置順にソート
  boundaries.sort((a, b) => a.startIdx - b.startIdx);

  // 各ブロックのtextAfterを次のブロック境界まで (最大500文字) に制限
  const blocks = boundaries.map((b, idx) => {
    const nextStart = idx + 1 < boundaries.length ? boundaries[idx + 1].startIdx : b.endIdx + 500;
    const endPos = Math.min(nextStart, b.endIdx + 500);
    return { title: b.title, startIdx: b.startIdx, textAfter: nText.slice(b.endIdx, endPos) };
  });

  for (const block of blocks) {
    let title = block.title;

    // スキップ対象
    if (SKIP_RE.test(title)) continue;
    if (/家庭児童相談|入退館|友達登録|カード登録/.test(title)) continue;
    // 一般的な枠・施設名をスキップ
    if (/^つどいの広場$|^ランチタイム$|児童センター|スマイルしょうわ/.test(title)) continue;
    // 定期開催（毎週）のものはスキップ（日付特定困難）
    if (/^くるまであそぼう$/.test(title)) continue;

    const after = block.textAfter;

    // 申込行を除外した本文テキスト（申込日付の誤抽出を防ぐ）
    const afterNoApply = after.replace(/申込[：:]?.*$/gm, "");

    // 日付を抽出: 「N日(曜)」パターン（曜日括弧内にスペース許容）
    const dayRe = /(\d{1,2})\s*日\s*[（(]\s*[日月火水木金土祝・]+\s*[）)]/g;
    let dm;
    const days = [];
    while ((dm = dayRe.exec(afterNoApply)) !== null) {
      const d = Number(dm[1]);
      if (d >= 1 && d <= 31 && !days.includes(d)) days.push(d);
    }

    // 「M/D(曜)」パターン（日時:行のみ対象、申込日を除外）
    const slashDayRe = /日時[：:]\s*\d{1,2}\s*[/／]\s*(\d{1,2})\s*[（(][日月火水木金土祝・]+[）)]/g;
    while ((dm = slashDayRe.exec(afterNoApply)) !== null) {
      const d = Number(dm[1]);
      if (d >= 1 && d <= 31 && !days.includes(d)) days.push(d);
    }

    // 「N日・」(・区切り、曜日括弧なし)
    const dotDayRe = /(\d{1,2})\s*日\s*[・・]/g;
    while ((dm = dotDayRe.exec(afterNoApply)) !== null) {
      const d = Number(dm[1]);
      if (d >= 1 && d <= 31 && !days.includes(d)) days.push(d);
    }

    if (days.length === 0) continue;

    // 時刻を抽出
    const timeRange = parseTimeFromText(after);

    // タイトルから講師名の余分な部分を除去
    title = title.replace(/.*先生の/, "").trim();

    for (const day of days) {
      const key = `${day}:${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ y: year, mo: month, d: day, title, timeRange });
    }
  }

  return events;
}

/**
 * 令和年+月 から PDF ファイル名を構築
 * 令和8年2月 → "802"
 */
function buildPdfSuffix(year, month) {
  const reiwaYear = year - 2018;
  return `${reiwaYear}${String(month).padStart(2, "0")}`;
}

/**
 * Factory: 春日部市児童センターPDFコレクター
 */
function createCollectKasukabeJidokanEvents(deps) {
  const { resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = KASUKABE_SOURCE;
  const srcKey = source.key;
  const label = source.label;

  return async function collectKasukabeJidokanEvents(maxDays) {
    const byId = new Map();

    // 当月+来月の2ヶ月分
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const months = [
      { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1 },
    ];
    const nextMonth = jst.getUTCMonth() + 2;
    if (nextMonth <= 12) {
      months.push({ year: jst.getUTCFullYear(), month: nextMonth });
    } else {
      months.push({ year: jst.getUTCFullYear() + 1, month: 1 });
    }

    for (const fac of FACILITIES) {
      // 固定座標を使用（Google Maps情報あり）
      let point = { lat: fac.lat, lng: fac.lng };
      point = resolveEventPoint(source, fac.name, point, `埼玉県${fac.address}`);
      const address = resolveEventAddress(source, fac.name, `埼玉県${fac.address}`, point);

      for (const ym of months) {
        const suffix = buildPdfSuffix(ym.year, ym.month);
        const pdfUrl = `${PDF_BASE}/${fac.prefix}${suffix}.pdf`;

        let markdown;
        try {
          markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        } catch (e) {
          console.warn(`[${label}] ${fac.name} PDF fetch failed (${suffix}): ${e.message}`);
          continue;
        }
        if (!markdown || markdown.length < 50) continue;
        // jina.ai returns 404 HTML page as text - detect and skip
        if (/returned error 404|お探しのページが見つかりません/.test(markdown)) continue;

        const fallbackYm = { year: ym.year, month: ym.month };
        const parseFn = fac.id === "smile" ? parseSmilePdfEvents : parseKasubakePdfEvents;
        const events = parseFn(markdown, fallbackYm);

        for (const ev of events) {
          if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
          const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
          const id = `${srcKey}:${fac.id}:${ev.title}:${dateKey}`;
          if (byId.has(id)) continue;

          const { startsAt, endsAt } = buildStartsEndsForDate(
            { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
          );

          byId.set(id, {
            id,
            source: srcKey,
            source_label: label,
            title: `${ev.title}（${fac.name}）`,
            starts_at: startsAt,
            ends_at: endsAt,
            venue_name: fac.name,
            address: address || `埼玉県${fac.address}`,
            url: fac.pageUrl,
            lat: point ? point.lat : source.center.lat,
            lng: point ? point.lng : source.center.lng,
          });
        }
      }
    }

    console.log(`[${label}] ${byId.size} events collected (児童センター PDF)`);
    return Array.from(byId.values());
  };
}

module.exports = { createCollectKasukabeJidokanEvents };
