/**
 * 習志野市 こどもセンター（9施設） PDFコレクター
 *
 * 各施設のHTMLページからPDFリンクを抽出し、
 * カレンダーPDFをパースしてイベントを抽出する。
 * だより・ひろば等のレトロスペクティブPDFはスキップ。
 *
 * 全イベントが子育て関連のため CHILD_RE フィルタ不要。
 */
const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { normalizeJaDigits } = require("../text-utils");
const { NARASHINO_SOURCE } = require("../../config/wards");

const FACILITIES = [
  { id: "saginuma",        pageUrl: "https://www.city.narashino.lg.jp/kosodate/otetudai/shisetsu/kodomo_centersaikai.html",
    name: "こどもセンター（鷺沼）", address: "習志野市鷺沼1-8-24" },
  { id: "higashinarashino", pageUrl: "https://www.city.narashino.lg.jp/soshiki/higashinarashino/gyomu/hoikugakko/codomoen/higashinarashino/kodomocenter_1.html",
    name: "東習志野こどもセンター", address: "習志野市東習志野3-4-1" },
  { id: "suginoko",        pageUrl: "https://www.city.narashino.lg.jp/soshiki/suginoko/gyomu/hoikugakko/codomoen/suginoko/kodomo_senta.html",
    name: "杉の子こどもセンター", address: "習志野市本大久保2-3-15" },
  { id: "sodegaura",       pageUrl: "https://www.city.narashino.lg.jp/soshiki/sodegaura/gyomu/hoikugakko/codomoen/sodegaura/470220140725160502927.html",
    name: "袖ケ浦こどもセンター", address: "習志野市袖ケ浦2-5-3" },
  { id: "shinnarashino",   pageUrl: "https://www.city.narashino.lg.jp/soshiki/shinnarashino/gyomu/hoikugakko/codomoen/shinnarashino/sinnarakodomosentaa.html",
    name: "新習志野こどもセンター", address: "習志野市香澄4-6-1" },
  { id: "okubo",           pageUrl: "https://www.city.narashino.lg.jp/soshiki/okubo/gyomu/hoikugakko/codomoen/okubo/city_cc4722_20190326163104245.html",
    name: "大久保こどもセンター", address: "習志野市泉町3-2-1" },
  { id: "mukouyama",       pageUrl: "https://www.city.narashino.lg.jp/soshiki/mukouyama/gyomu/hoikugakko/kodomo/mukouyama_kodomoen/kodomocenter.html",
    name: "向山こどもセンター", address: "習志野市谷津2-16-36" },
  { id: "fujisaki",        pageUrl: "https://www.city.narashino.lg.jp/kosodate/hoikugakko/kodomo/fuzisakikodomoen/26066.html",
    name: "藤崎こどもセンター", address: "習志野市藤崎4-20-3" },
  { id: "kirakko",         pageUrl: "https://www.city.narashino.lg.jp/soshiki/kosodate_shien/gyomu/shinkorona/kominkantosyo/kirakko.html",
    name: "きらっ子ルームやつ", address: "習志野市谷津5-5-3" },
];

/** 日常的な定期プログラム・施設運用（イベントではない） */
const SKIP_RE = /にこにこタイム|おひさまタイム|きらっ子タイム|ファンタイム|ハッピータイム|みんなで遊ぼう|赤ちゃんスペース|0歳ひろば|園庭開放|自由あそび|読み聞かせ|身体計測|環境\s*整備|避難\s*訓練|卒園式|健康\s*相談|修了証書|休館|閉館|お休み|利用案内|令和\d|月号|だより|発行|開館|カレンダー|振替休/;

/** PDFリンクテキストのスキップ判定（だより・ひろば等のレトロスペクティブPDF） */
const PDF_SKIP_RE = /だより|ひろば|悪天候|配置|案内|見取り図/;

const JUNK_RE = /^[\d\s\-～〜:：（）()、。,.✿★☆]+$|^.{0,2}$|日時|場所|対象|定員|持ち物|申込|受付|TEL|FAX|問い合わせ|http|www\.|^\d+月|令和|発行|開館|年度|案内|注意|お知らせ|利用|交通|^✿?実施日/;

/** ボディテキスト判定（タイトルではない） */
const BODY_TEXT_RE = /。$|です[。]?$|ます[。]?$|ました[。、]|ください[。]?$|します$|ません$|しましょう|いたします|を行い|をお|ご持参|ご参加|ご利用|ご了承|ご理解|お越し|お願い|お気軽|^[～~]|の予定/;

/** N月の予定 → 翌月以降のセクション（スキップ対象） */
const FUTURE_SECTION_RE = /\d+月\s*の?\s*予\s*定/;

/**
 * HTMLページから PDF リンクを抽出
 * カレンダーPDF: リンクテキストに「カレンダー」を含む、又はスキップワードを含まないもの
 * 最新2件まで（当月+先月）
 */
function extractCalendarPdfLinks(html, pageUrl) {
  const links = [];
  const re = /<a\s+[^>]*href="([^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/g, "&");
    // 相対パス解決
    if (href.startsWith("./")) {
      const base = pageUrl.substring(0, pageUrl.lastIndexOf("/") + 1);
      href = base + href.substring(2);
    } else if (href.startsWith("//")) {
      href = `https:${href}`;
    } else if (!href.startsWith("http")) {
      if (href.startsWith("/")) {
        const urlObj = new URL(pageUrl);
        href = `${urlObj.origin}${href}`;
      } else {
        const base = pageUrl.substring(0, pageUrl.lastIndexOf("/") + 1);
        href = base + href;
      }
    }
    const linkText = m[2].replace(/<[^>]+>/g, "").trim();
    // カレンダーPDFを優先、スキップワード含むものは除外
    const isCalendar = /カレンダー/.test(linkText);
    const isSkipped = PDF_SKIP_RE.test(linkText);
    if (isCalendar || !isSkipped) {
      links.push({ url: href, linkText, isCalendar });
    }
  }
  // カレンダーPDFがあればそれを優先、なければスキップされなかったもの
  const calendarLinks = links.filter(l => l.isCalendar);
  const otherLinks = links.filter(l => !l.isCalendar);
  const sorted = [...calendarLinks, ...otherLinks];
  return sorted.slice(0, 2);
}

/**
 * 日本語時刻テキストから時間情報を抽出
 * 「午前 9時15分～午前 11時15分」「10:30～11:00」等
 */
function extractTimeRange(text) {
  // HH:MM～HH:MM format
  const colonMatch = text.match(/(\d{1,2}):(\d{2})\s*[～〜~\-]\s*(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    return {
      startHour: Number(colonMatch[1]), startMin: Number(colonMatch[2]),
      endHour: Number(colonMatch[3]), endMin: Number(colonMatch[4]),
    };
  }
  // 午前/午後 N時M分～午前/午後 N時M分 format
  const jaMatch = text.match(/午(前|後)\s*(\d{1,2})時\s*(\d{1,2})?\s*分?\s*[～〜~\-]\s*午(前|後)\s*(\d{1,2})時\s*(\d{1,2})?\s*分?/);
  if (jaMatch) {
    let sh = Number(jaMatch[2]);
    let eh = Number(jaMatch[5]);
    if (jaMatch[1] === "後" && sh < 12) sh += 12;
    if (jaMatch[4] === "後" && eh < 12) eh += 12;
    return {
      startHour: sh, startMin: Number(jaMatch[3] || 0),
      endHour: eh, endMin: Number(jaMatch[6] || 0),
    };
  }
  // HH:MM only (start time)
  const startColon = text.match(/(\d{1,2}):(\d{2})/);
  if (startColon) {
    return {
      startHour: Number(startColon[1]), startMin: Number(startColon[2]),
      endHour: null, endMin: null,
    };
  }
  // 午前/午後 N時M分 only
  const jaStart = text.match(/午(前|後)\s*(\d{1,2})時\s*(\d{1,2})?\s*分?/);
  if (jaStart) {
    let sh = Number(jaStart[2]);
    if (jaStart[1] === "後" && sh < 12) sh += 12;
    return { startHour: sh, startMin: Number(jaStart[3] || 0), endHour: null, endMin: null };
  }
  return null;
}

/**
 * PDFマークダウンからイベントを抽出
 *
 * 3つのフォーマットに対応:
 *   1. 鷺沼型: タイトル行 → 日付行(複数)
 *   2. 東習志野型: 《 タイトル 》セクション → 日付行
 *   3. 杉の子型: タイトル+日付が同一行 (例: "演奏会 3日（火）10:45～11:15")
 */
function parseNarashinoPdf(text, defaultY, defaultMo) {
  const events = [];
  const normalized = normalizeJaDigits(text.normalize("NFKC"))
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(日|月|時)/g, "$1$2")
    .replace(/(\d)\s*[：:]\s*(\d)/g, "$1:$2");

  // 年月推定
  let y = defaultY;
  let mo = defaultMo;
  const reiwaMatch = normalized.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月/);
  const ymMatch = !reiwaMatch && normalized.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (reiwaMatch) {
    y = 2018 + Number(reiwaMatch[1]);
    mo = Number(reiwaMatch[2]);
  } else if (ymMatch) {
    y = Number(ymMatch[1]);
    mo = Number(ymMatch[2]);
  }

  const lines = normalized.split(/\n/);
  let currentTitle = "";
  let skipUntilNextTitle = false; // SKIP_RE'd section → skip dates until new title

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^>/.test(line)) continue;

    // 《 セクション 》 マーカー (東習志野型)
    const sectionMatch = line.match(/《\s*(.+?)\s*》/);
    if (sectionMatch) {
      const t = sectionMatch[1].trim();
      if (SKIP_RE.test(t)) {
        currentTitle = "";
        skipUntilNextTitle = true;
      } else if (t.length >= 2 && t.length <= 30) {
        currentTitle = t;
        skipUntilNextTitle = false;
      }
      continue;
    }

    // N月の予定 → 翌月以降は全てスキップ
    if (FUTURE_SECTION_RE.test(line)) {
      skipUntilNextTitle = true;
      currentTitle = "";
      continue;
    }

    // SKIP_RE check
    if (SKIP_RE.test(line)) {
      // タイトルらしい短い行ならスキップモード開始
      const stripped = line.replace(/\s*※.*$/, "").replace(/\s*＊.*$/, "").trim();
      if (stripped.length <= 20 && !stripped.includes("。")) {
        skipUntilNextTitle = true;
        currentTitle = "";
      }
      continue;
    }

    // ## 見出し → タイトル候補
    if (/^#+\s+/.test(line)) {
      const t = line.replace(/^#+\s+/, "").replace(/^[●★◆◎☆■♪♫♥♡◇]\s*/, "").trim();
      if (t.length >= 3 && t.length <= 40 && !JUNK_RE.test(t) && !SKIP_RE.test(t)) {
        currentTitle = t;
        skipUntilNextTitle = false;
      }
      continue;
    }

    // ● ★ ◎ 記号で始まるタイトル
    const bulletMatch = line.match(/^[●★◆◎☆■♪♫♥♡◇]\s*(.{3,40})/);
    if (bulletMatch) {
      const t = bulletMatch[1].replace(/[「」]/g, "").trim();
      if (!JUNK_RE.test(t) && !SKIP_RE.test(t)) {
        currentTitle = t;
        skipUntilNextTitle = false;
      }
    }

    // プレーンテキストのタイトル候補（body text除外を強化）
    if (!bulletMatch && !/^#+/.test(line)
        && !/^日\s*時|^場\s*所|^対\s*象|^定\s*員|^申\s*込|^持ち物|^受付|^講\s*師|^〒|^TEL|^FAX|^※|^＊/.test(line)
        && !BODY_TEXT_RE.test(line)) {
      const plainTitle = line
        .replace(/^[●★◆◎☆■♪♫♥♡◇#\s\d○]+/, "")
        .replace(/[「」『』]/g, "")
        .replace(/\s*※.*$/, "")
        .replace(/\s*＊.*$/, "")
        .replace(/\s*[（(].*$/, "")
        .trim();
      if (plainTitle.length >= 3 && plainTitle.length <= 25
          && !JUNK_RE.test(plainTitle) && !SKIP_RE.test(plainTitle)
          && !/\d+[日月時]/.test(plainTitle)
          && !/利用登録|行事カレンダー|年度|開室|開所|テーマ|午前|午後|毎日|毎週/.test(plainTitle)) {
        currentTitle = plainTitle;
        skipUntilNextTitle = false;
      }
    }

    // 日付パターン: M月D日(曜) or D日(曜)
    // skipUntilNextTitle中でも、行頭にタイトル+日付がある場合は復帰
    if (skipUntilNextTitle) {
      const quickDateCheck = /(?:\d{1,2}月\s*)?\d{1,2}\s*日\s*[（(]\s*[月火水木金土日]\s*[）)]/;
      const qm = quickDateCheck.exec(line);
      if (qm) {
        const bd = line.substring(0, qm.index).replace(/^[●★◆◎☆■♪♫♥♡◇#\s]+/, "").trim();
        if (bd.length >= 3 && bd.length <= 30 && !JUNK_RE.test(bd) && !SKIP_RE.test(bd) && !BODY_TEXT_RE.test(bd)) {
          currentTitle = bd.replace(/\s*※.*$/, "").replace(/\s*＊.*$/, "").trim();
          skipUntilNextTitle = false;
        }
      }
      if (skipUntilNextTitle) continue;
    }

    const dateRe = /(?:(\d{1,2})月\s*)?(\d{1,2})\s*日\s*[（(]\s*([月火水木金土日])\s*[）)]/g;
    let dm;
    while ((dm = dateRe.exec(line)) !== null) {
      const evMo = dm[1] ? Number(dm[1]) : mo;
      const d = Number(dm[2]);
      if (d < 1 || d > 31 || evMo < 1 || evMo > 12) continue;

      // 日付前のテキストからタイトルを推定（杉の子型: "演奏会 3日（火）"）
      let beforeDate = line.substring(0, dm.index).replace(/^[●★◆◎☆■♪♫♥♡◇#\s]+/, "").trim();
      // 先行する別の日付パターン・時刻を除去 (例: "18日(水)・19日(木)・21日(土)")
      beforeDate = beforeDate
        .replace(/\d{1,2}月?\s*\d{1,2}\s*日\s*[（(]\s*[月火水木金土日]\s*[）)]\s*[・～~\-]?\s*/g, "")
        .replace(/\d{1,2}:\d{2}\s*[～〜~\-]?\s*(?:\d{1,2}:\d{2})?\s*/g, "")
        .trim();
      const isMetaLabel = /^(日\s*時|場\s*所|対\s*象|定\s*員|申\s*込|申し込み|受付|持ち物|講\s*師)\s*[:：]?\s*$/.test(beforeDate);
      let title = (!isMetaLabel && beforeDate.length >= 3 && beforeDate.length <= 40 && !JUNK_RE.test(beforeDate) && !SKIP_RE.test(beforeDate))
        ? beforeDate.replace(/\s*※.*$/, "").replace(/\s*＊.*$/, "").trim()
        : currentTitle;
      if (!title) continue;
      if (SKIP_RE.test(title)) continue;

      // 時刻抽出
      const afterDate = line.substring(dm.index + dm[0].length);
      const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : "";
      const timeRange = extractTimeRange(afterDate + " " + nextLine);

      events.push({ y, mo: evMo, d, title, timeRange });
    }
  }
  return events;
}

function createCollectNarashinoKodomoEvents(deps) {
  const { resolveEventPoint, resolveEventAddress } = deps;

  return async function collectNarashinoKodomoEvents(maxDays) {
    const source = NARASHINO_SOURCE;
    const srcKey = `ward_${source.key}`;
    const label = "習志野市こどもセンター";

    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const currentYear = jst.getUTCFullYear();
    const currentMonth = jst.getUTCMonth() + 1;

    // 全施設のHTMLページをバッチ取得してPDFリンクを発見
    const pdfTargets = [];
    const HTML_BATCH = 3;
    for (let i = 0; i < FACILITIES.length; i += HTML_BATCH) {
      const batch = FACILITIES.slice(i, i + HTML_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (facility) => {
          const html = await fetchText(facility.pageUrl);
          const pdfs = extractCalendarPdfLinks(html, facility.pageUrl);
          return pdfs.map(pdf => ({ ...pdf, facility }));
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") pdfTargets.push(...r.value);
      }
    }

    if (pdfTargets.length === 0) {
      console.log(`[${label}] 0 PDF links found`);
      return [];
    }

    // PDFをバッチ取得してパース
    const allEvents = [];
    const PDF_BATCH = 3;
    for (let i = 0; i < pdfTargets.length; i += PDF_BATCH) {
      const batch = pdfTargets.slice(i, i + PDF_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (target) => {
          const markdown = await fetchChiyodaPdfMarkdown(target.url);
          if (!markdown || markdown.length < 50) return [];
          const parsed = parseNarashinoPdf(markdown, currentYear, currentMonth);
          return parsed.map(ev => ({
            ...ev,
            facility: target.facility,
            pdfUrl: target.url,
          }));
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.length > 0) {
          allEvents.push(...r.value);
        }
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected (${pdfTargets.length} PDFs fetched)`);
      return [];
    }

    // 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.facility.id}:${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = ev.facility.name;
      const venueAddress = ev.facility.address;

      const point = resolveEventPoint(source, venueName, null, `千葉県${venueAddress}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:kodomo:${ev.facility.id}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: source.label,
        title: `${ev.title}（${venueName}）`,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: ev.facility.pageUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from ${pdfTargets.length} PDFs)`);
    return results;
  };
}

module.exports = { createCollectNarashinoKodomoEvents };
