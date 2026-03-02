/**
 * 館林市 3児童館 PDFコレクター（児童館だより版）
 *
 * 館林市には3つの児童館があり、毎月の合同おたよりPDFを公開している:
 *   - 児童センター: 大手町10-55
 *   - 西児童館:     富士原町1241-80
 *   - 赤羽児童館:   赤生田町1964-1
 *
 * 児童館だよりPDF（2ページ、3施設合同）:
 *   https://www.city.tatebayashi.gunma.jp/s046/kenko/140/150/020/YYYYMM.pdf
 *   （ファイル名パターンは不規則: 202603.pdf, 202602A3.pdf, A3202511.pdf 等）
 *
 * おたよりPDFはHTMLの一覧ページからリンクを動的取得する。
 * 構造: ≪シリーズ名≫ + N日(曜) + イベント内容 + 時間、
 *       施設セクションは住所・電話番号で区切られる。
 *
 * 別途、施設別イベントカレンダーPDF (j-/n-/a-YYYYMM.pdf) も存在するが、
 * カレンダーグリッド形式でテキスト抽出が困難なため、おたよりPDFを使用。
 */
const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { normalizeJaDigits } = require("../text-utils");
const { TATEBAYASHI_SOURCE } = require("../../config/wards");

const TAYORI_LISTING_URL = "https://www.city.tatebayashi.gunma.jp/s046/kenko/140/150/020/20200105112000.html";
const TAYORI_BASE = "https://www.city.tatebayashi.gunma.jp/s046/kenko/140/150/020";
const CALENDAR_PAGE_URL = "https://www.city.tatebayashi.gunma.jp/s046/kenko/140/150/040/20200105110000.html";

const CENTERS = [
  { slug: "jidou",  name: "児童センター",   address: "館林市大手町10-55",       phone: "0276-73-1522" },
  { slug: "nishi",  name: "西児童館",       address: "館林市富士原町1241-80",    phone: "0276-75-4311" },
  { slug: "akabane", name: "赤羽児童館",    address: "館林市赤生田町1964-1",     phone: "0276-72-4155" },
];

// 施設識別パターン: 住所 or 電話番号で判定
const FACILITY_MARKERS = [
  { center: CENTERS[0], re: /大手町\s*10|73[－\-]1522/ },
  { center: CENTERS[1], re: /富士原\s*町\s*1241|75[－\-]4311/ },
  { center: CENTERS[2], re: /赤生田\s*町\s*1964|72[－\-]4155/ },
];

// ノイズ行をスキップ
const SKIP_RE = /休館|休所|閉館|利用案内|お問い合わせ|電話|ＴＥＬ|TEL|FAX|アクセス|開館時間|休館日|月曜日|国民の祝日|土曜・日曜|ゲーム機|ゴミ|受付\s*で名前|ホームページ|随時更新|都合により|定員をもうけ|ぜひご覧|掲載して|公式ホームページ/;

// タイトルとして無効なパターン
const JUNK_TITLE_RE = /^[\d\s\-～〜~:：（）()、。,.・＆&]+$|^.{0,2}$|申込|問合|持ち物|日\s*時|場\s*所|会\s*場|時\s*間\s*[：:]?\s*$|定員|対象|費用|参加費|注意|詳細|毎週|毎月|お知らせ|カレンダー|^\d+\s*月|今月の|実施中|内容[：:]|期間|HP|ホーム|ページ|だより|月\s*号|です[。！]$|ます[。！]$|ください|※|www\.|http|無料|当日|先着|事前|定例事業|一般事業|教室事業|自由参加|当日受付|事前申込|会員制|保険代|令和\d|と\s*き\s*[:：]|ところ\s*[:：]|にて受付/;

/** 全角数字→半角数字 正規化 + スペース結合 */
function normalizeTextForParse(str) {
  return normalizeJaDigits(str.normalize("NFKC"))
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(日|月|時)/g, "$1$2")
    .replace(/(\d)\s*[：:]\s*(\d)/g, "$1:$2");
}

/** タイトルを清掃 */
function cleanTitle(raw) {
  let t = raw
    .replace(/^#+\s*/, "")
    .replace(/^[●★◆◎☆■□▲△▼▽♪♫≪《「【]\s*/, "")
    .replace(/[≫》」】]\s*$/, "")
    .replace(/[「」]/g, "")
    .replace(/^[～〜~\-－]+\s*/, "")
    .replace(/\s*対象\s*[…\.]+.*$/, "")
    .replace(/\s*[（(][^）)]*(?:対象|歳児|年生|以上|以下|限定|要予約|予約制|定員|申込)[^）)]*[）)]?\s*$/, "")
    .replace(/^\s*・\s*/, "")
    .trim();
  return t;
}

/** タイトルが有効かチェック */
function isValidTitle(t) {
  if (!t || t.length < 2) return false;
  if (SKIP_RE.test(t)) return false;
  if (JUNK_TITLE_RE.test(t)) return false;
  if (/^[\d\s\-～〜~:：（）()、。,.・＆&#/*]+$/.test(t)) return false;
  return true;
}

/** 時刻テキストから timeRange を抽出 (PM補正あり) */
function extractTime(text) {
  const hasPM = /PM|ＰＭ/.test(text);
  const hasAM = /AM|ＡＭ/.test(text);
  const cleaned = text.replace(/[AＡ][MＭ]|[PＰ][MＭ]/g, "").trim();

  const rangeMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*[～〜~\-－]\s*(\d{1,2}):(\d{2})/);
  if (rangeMatch) {
    let sh = Number(rangeMatch[1]), sm = Number(rangeMatch[2]);
    let eh = Number(rangeMatch[3]), em = Number(rangeMatch[4]);
    if (hasPM && !hasAM) {
      if (sh >= 1 && sh <= 6) sh += 12;
      if (eh >= 1 && eh <= 6) eh += 12;
    }
    return { startHour: sh, startMin: sm, endHour: eh, endMin: em };
  }
  const startMatch = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (startMatch) {
    let sh = Number(startMatch[1]);
    if (hasPM && !hasAM && sh >= 1 && sh <= 6) sh += 12;
    return { startHour: sh, startMin: Number(startMatch[2]), endHour: null, endMin: null };
  }
  return null;
}

/**
 * 一覧ページからPDFリンクを抽出
 * @returns {Array<{url: string, linkText: string}>}
 */
function extractPdfLinksFromListing(html) {
  const pdfs = [];
  const re = /<a\s+[^>]*href="([^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    if (/kodomo_do_poster/.test(href)) continue; // ポスター除外
    if (href.startsWith("./")) href = `${TAYORI_BASE}/${href.substring(2)}`;
    else if (href.startsWith("/")) href = `https://www.city.tatebayashi.gunma.jp${href}`;
    else if (!href.startsWith("http")) href = `${TAYORI_BASE}/${href}`;
    const linkText = m[2].replace(/<[^>]+>/g, "").trim();
    pdfs.push({ url: href, linkText });
  }
  return pdfs;
}

/**
 * おたよりPDFマークダウンを施設セクションに分割
 *
 * PDFの構造: 施設ごとに住所+電話番号のマーカーがある。
 * ただし月によってレイアウトが異なる:
 *   - 2ページ版(2026年3月): ヘッダーに西+児童センターの住所が並び、
 *     児童センター→西→赤羽の順にコンテンツが続く
 *   - 1ページ版(2025年12月): 児童センター→赤羽→西の順
 *
 * ヘッダーに2施設の住所が並ぶ場合、「・参加費」行で
 * 児童センターと西児童館のセクションを分割する。
 */
function splitByFacility(text) {
  const lines = text.split("\n");

  // マーカー位置を検出 (各行を個別にチェック)
  const rawMarkers = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const fm of FACILITY_MARKERS) {
      if (fm.re.test(line)) {
        if (!rawMarkers.some(m => m.center.slug === fm.center.slug)) {
          rawMarkers.push({ center: fm.center, line: i });
        }
      }
    }
  }

  rawMarkers.sort((a, b) => a.line - b.line);

  if (rawMarkers.length === 0) {
    return [{ center: CENTERS[0], text }];
  }

  // ヘッダー統合チェック: 最初の2マーカーが5行以内
  const headerMerge = rawMarkers.length >= 2 && (rawMarkers[1].line - rawMarkers[0].line <= 5);
  let mergedHeaderCenters = null;

  const markers = [];
  if (headerMerge) {
    // ヘッダーに2施設が並んでいる → 最初のマーカーを児童センターに割当
    // (実際のコンテンツ順: 児童センター → もう一方の施設)
    // 児童センターマーカーを使用
    const jidouCenter = rawMarkers.find(m => m.center.slug === "jidou");
    const otherCenter = rawMarkers.find(m => m.center.slug !== "jidou" && rawMarkers.indexOf(m) <= 1);
    markers.push({ center: jidouCenter ? jidouCenter.center : rawMarkers[0].center, line: 0 });
    mergedHeaderCenters = otherCenter ? otherCenter.center : null;
    // 残りのマーカーを追加 (3番目以降)
    for (let i = 2; i < rawMarkers.length; i++) {
      markers.push(rawMarkers[i]);
    }
  } else {
    // 通常: 各マーカーがセクション区切り
    for (let i = 0; i < rawMarkers.length; i++) {
      markers.push({ ...rawMarkers[i], line: (i === 0) ? 0 : rawMarkers[i].line });
    }
  }

  // セクション分割
  const sections = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].line;
    const end = (i + 1 < markers.length) ? markers[i + 1].line : lines.length;
    sections.push({
      center: markers[i].center,
      text: lines.slice(start, end).join("\n"),
    });
  }

  // ヘッダー統合の場合: 最初のセクションを2分割
  // 特別事業 "ところ:" の後に来る ≪シリーズ名≫ を境界とする
  if (headerMerge && mergedHeaderCenters && sections.length > 0) {
    const firstSection = sections[0];
    const firstLines = firstSection.text.split("\n");
    // "ところ:" が出た後の最初の ≪シリーズ名≫ を探す
    let sawTokoro = false;
    let splitLine = -1;
    for (let i = 0; i < firstLines.length; i++) {
      const line = firstLines[i];
      if (/ところ\s*[:：]/.test(line)) {
        sawTokoro = true;
      }
      // "ところ" の後に ≪シリーズ名≫ が出現 → ここが次の施設の始まり
      if (sawTokoro && /≪/.test(line)) {
        splitLine = i;
        break;
      }
    }
    // フォールバック: "ところ" がなかった場合、
    // 2番目の ≪シリーズグループ≫ を探す (最初の ≪ から離れた位置の ≪)
    if (splitLine < 0) {
      let firstSeriesLine = -1;
      let lastSeriesOrDateLine = -1;
      for (let i = 0; i < firstLines.length; i++) {
        if (/≪/.test(firstLines[i])) {
          if (firstSeriesLine < 0) firstSeriesLine = i;
          lastSeriesOrDateLine = i;
        } else if (/\d{1,2}日\s*[（(]/.test(firstLines[i])) {
          lastSeriesOrDateLine = i;
        }
      }
      // 2番目の ・参加費 を境界として使用
      let sankaCount = 0;
      for (let i = 0; i < firstLines.length; i++) {
        if (/・参加費|・定\s*員/.test(firstLines[i])) {
          sankaCount++;
          // 3番目の ・参加費 / ・定員 以降にある最初の ≪ を探す
          if (sankaCount >= 3) {
            for (let j = i + 1; j < firstLines.length; j++) {
              if (/≪/.test(firstLines[j])) {
                splitLine = j;
                break;
              }
            }
            if (splitLine >= 0) break;
          }
        }
      }
    }
    if (splitLine > 0) {
      sections[0] = {
        center: firstSection.center,
        text: firstLines.slice(0, splitLine).join("\n"),
      };
      sections.splice(1, 0, {
        center: mergedHeaderCenters,
        text: firstLines.slice(splitLine).join("\n"),
      });
    }
  }

  return sections;
}

/**
 * おたよりPDFのセクションからイベントを抽出
 *
 * 構造パターン:
 * A) ≪シリーズ名≫ 対象…乳幼児と保護者
 *    N日(曜) イベント内容
 *    時 間 AM 11:00～11:30
 *
 * B) 「イベント名」
 *    と き：M月D日（曜）
 *    PM 2:00～
 *    ところ：施設名
 */
function parseSection(text, defaultY, defaultMo) {
  const events = [];
  const normalized = normalizeTextForParse(text);
  const lines = normalized.split("\n");

  let currentSeriesTitle = "";
  let currentTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;
    if (/^>/.test(rawLine)) continue;
    if (SKIP_RE.test(rawLine)) continue;
    // メタデータ行スキップ
    if (/^(Title|URL Source|Published Time|Number of Pages|Markdown Content):/.test(rawLine)) continue;

    // ≪シリーズ名≫ パターン
    const seriesMatch = rawLine.match(/≪\s*(.+?)\s*≫/);
    if (seriesMatch) {
      const seriesName = seriesMatch[1].replace(/\s+/g, "");
      if (isValidTitle(seriesName)) {
        currentSeriesTitle = seriesName;
      }
    }

    // 「イベント名」パターン (特別事業)
    const quotedMatch = rawLine.match(/「\s*([^」]{2,30})\s*」/);
    if (quotedMatch) {
      const t = cleanTitle(quotedMatch[1]);
      if (isValidTitle(t)) {
        currentTitle = t;
      }
    }

    // ## 見出し → タイトル候補
    if (/^#+\s+/.test(rawLine)) {
      const t = cleanTitle(rawLine);
      if (isValidTitle(t)) {
        currentTitle = t;
      }
      continue;
    }

    // 【今月のあそび】→ スキップ (これ自体はイベントではない)
    if (/【今月のあそび】/.test(rawLine)) continue;

    // 行レベルスキップ: 申込み行、休館日リスト行、参加費行等
    if (/申込み\s*[:：]|にて受付|を添えて|保険代|参加費\s*[:：]|持ち物\s*[:：]|対\s*象\s*[:：]|定\s*員\s*[:：]|内\s*容\s*[:：]/.test(rawLine)) continue;
    // 休館日リスト: "2日(月) ・ 9日(月) ・ 16日(月)"
    if (/\d{1,2}日\s*[（(]\s*月\s*[）)]\s*・\s*\d{1,2}日\s*[（(]\s*月\s*[）)]/.test(rawLine)) continue;
    // "【N月の休館日】"
    if (/休\s*館\s*日/.test(rawLine)) continue;
    // "と き：" で始まる行は特別事業の日付行 → 通常日付パターンではなく tokiパターンで処理
    if (/^と\s*き\s*[:：]/.test(rawLine)) {
      // tokiパターンで処理
      const tokiMatch = rawLine.match(/と\s*き\s*[:：]\s*(\d{1,2})月\s*(\d{1,2})日\s*[（(]\s*([月火水木金土日])[・・]?\s*[祝休]?\s*[）)]/);
      if (tokiMatch && currentTitle) {
        const evMo = Number(tokiMatch[1]);
        const d = Number(tokiMatch[2]);
        if (d >= 1 && d <= 31 && evMo >= 1 && evMo <= 12) {
          let timeRange = extractTime(rawLine);
          if (!timeRange) {
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
              const nextLine = normalizeTextForParse(lines[j]).trim();
              timeRange = extractTime(nextLine);
              if (timeRange) break;
            }
          }
          events.push({ y: defaultY, mo: evMo, d, title: currentTitle, timeRange });
        }
      }
      continue;
    }

    // 日付パターンA: N日(曜) イベント内容
    const dateRe = /(?:(\d{1,2})月\s*)?(\d{1,2})日\s*[（(]\s*([月火水木金土日])[・・]?\s*[祝休]?\s*[）)]/g;
    let dm;
    let foundDate = false;
    while ((dm = dateRe.exec(rawLine)) !== null) {
      foundDate = true;
      const evMo = dm[1] ? Number(dm[1]) : defaultMo;
      const d = Number(dm[2]);
      if (d < 1 || d > 31 || evMo < 1 || evMo > 12) continue;

      // 日付の前のテキスト
      const beforeDate = rawLine.substring(0, dm.index).trim()
        .replace(/^[●★◆◎☆■□▲△▼▽♪♫#≪《]+\s*/, "")
        .replace(/≫.*/, "")
        .replace(/対象\s*[…\.]+.*/, "")
        .replace(/時\s*間\s*/, "")
        .trim();
      const cleanedBefore = cleanTitle(beforeDate);

      // 日付の後のテキスト
      const afterDate = rawLine.substring(dm.index + dm[0].length).trim();
      const cleanedAfter = cleanTitle(afterDate
        .replace(/^[\s,、]+/, "")
        .replace(/時\s*間\s*.*$/, "")
        .replace(/~$/, "")
        .trim());

      // タイトル決定
      let eventName = "";
      if (isValidTitle(cleanedAfter) && cleanedAfter.length >= 2) {
        eventName = cleanedAfter;
      } else if (isValidTitle(cleanedBefore) && cleanedBefore.length >= 2) {
        eventName = cleanedBefore;
      }

      let title = "";
      if (currentSeriesTitle && eventName) {
        title = `${currentSeriesTitle}・${eventName}`;
      } else if (eventName) {
        title = eventName;
      } else if (currentSeriesTitle) {
        title = currentSeriesTitle;
      } else if (currentTitle) {
        title = currentTitle;
      }

      if (!title || !isValidTitle(title)) continue;

      // 時刻抽出: 同じ行の日付後テキスト → 次の行の「時 間」行
      let timeRange = extractTime(afterDate);
      if (!timeRange) {
        // 次の数行で「時 間」行を探す (空行をスキップ、最大6行先まで)
        let checked = 0;
        for (let j = i + 1; j < lines.length && checked < 5; j++) {
          const nextLine = normalizeTextForParse(lines[j]).trim();
          if (!nextLine) continue;
          checked++;
          if (/時\s*間/.test(nextLine) || /^[AP]M\s*\d/.test(nextLine) || /^\d{1,2}:\d{2}/.test(nextLine)) {
            timeRange = extractTime(nextLine);
            if (timeRange) break;
          }
          // 別のイベントシリーズ or 日付行が来たら中止
          if (/≪/.test(nextLine) || /「/.test(nextLine)) break;
        }
      }

      events.push({ y: defaultY, mo: evMo, d, title, timeRange });
    }

    // 日付パターンB: "と き：" はすでに上で処理済み（line-level skip + toki処理）
  }

  return events;
}

/**
 * PDF URLから年月を推測
 * パターン: 202603.pdf, 202602A3.pdf, A3202511.pdf, 202601a3.pdf
 */
function guessYearMonthFromUrl(url) {
  const filename = url.split("/").pop().replace(/\.pdf$/i, "");
  // YYYYMM を探す
  const m = filename.match(/(20\d{2})(\d{2})/);
  if (m) {
    return { year: Number(m[1]), month: Number(m[2]) };
  }
  return null;
}

function createCollectTatebayashiJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectTatebayashiJidokanEvents(maxDays) {
    const source = TATEBAYASHI_SOURCE;
    const srcKey = `ward_${source.key}`;
    const label = "館林市児童館";

    // 一覧ページからPDFリンクを取得
    let listingHtml;
    try {
      listingHtml = await fetchText(TAYORI_LISTING_URL);
    } catch (e) {
      console.warn(`[${label}] listing page fetch failed:`, e.message || e);
      return [];
    }

    const pdfLinks = extractPdfLinksFromListing(listingHtml);
    if (pdfLinks.length === 0) {
      console.warn(`[${label}] no PDF links found on listing page`);
      return [];
    }

    // 対象月フィルタ
    const targetMonths = getMonthsForRange(maxDays);
    const targetSet = new Set(targetMonths.map(m => `${m.year}${String(m.month).padStart(2, "0")}`));

    const pdfTargets = [];
    for (const pdf of pdfLinks) {
      const ym = guessYearMonthFromUrl(pdf.url);
      if (!ym) continue;
      const ymKey = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      if (!targetSet.has(ymKey)) continue;
      pdfTargets.push({ ...pdf, ...ym });
    }

    if (pdfTargets.length === 0) {
      console.log(`[${label}] no target-month PDFs found`);
      return [];
    }

    // PDF をバッチ取得 (2並列、各PDFが2ページで3施設分なので少なめ)
    const BATCH_SIZE = 2;
    const allEvents = [];

    for (let i = 0; i < pdfTargets.length; i += BATCH_SIZE) {
      const batch = pdfTargets.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (target) => {
          let markdown;
          try {
            markdown = await fetchChiyodaPdfMarkdown(target.url);
          } catch {
            return [];
          }
          if (!markdown || markdown.length < 80) return [];
          if (/お探しのページが見つかりません/.test(markdown)) return [];

          // 施設セクションに分割
          const sections = splitByFacility(markdown);
          const events = [];
          for (const section of sections) {
            const parsed = parseSection(section.text, target.year, target.month);
            for (const ev of parsed) {
              events.push({ ...ev, center: section.center });
            }
          }
          return events;
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
      const key = `${ev.center.slug}:${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = ev.center.name;
      const venueAddress = ev.center.address;

      let geoCandidates = [
        `群馬県${venueAddress}`,
        `群馬県館林市 ${venueName}`,
      ];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("群馬県") ? fmAddr : `群馬県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `館林市 ${venueName}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );
      const id = `${srcKey}:jidokan:${ev.center.slug}:${ev.title}:${ev.dateKey}`;
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
        url: CALENDAR_PAGE_URL,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from ${pdfTargets.length} newsletter PDFs)`);
    return results;
  };
}

module.exports = { createCollectTatebayashiJidokanEvents };
