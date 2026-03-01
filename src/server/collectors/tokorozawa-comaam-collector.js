/**
 * 所沢市 comaam.jp 児童館・子育て支援センター PDFコレクター
 *
 * 5施設の月刊PDFだよりをパースしてイベントを抽出:
 * - ルピナス（子育て支援センター）
 * - トコハピひかり（児童館）
 * - トコハピつばめ（児童館）
 * - トコハピみどり（児童館）
 * - トコハピわかば（児童館）
 */
const { fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const { normalizeJaDigits } = require("../text-utils");
const {
  getMonthsForRange,
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { TOKOROZAWA_SOURCE } = require("../../config/wards");

const FACILITIES = [
  {
    id: "rupinasu",
    name: "ルピナス",
    fullName: "所沢市こども支援センタールピナス",
    address: "所沢市泉町1861-1",
    siteUrl: "https://www.comaam.jp/t_shien/",
    buildPdfUrl: (year, month) => {
      const mm = String(month).padStart(2, "0");
      return `https://www.comaam.jp/t_shien/zigyouyotei/${year}${mm}.pdf`;
    },
  },
  {
    id: "hikari",
    name: "トコハピひかり",
    fullName: "所沢市立ひかり児童館",
    address: "所沢市中新井4-3",
    siteUrl: "https://comaam.jp/hikari/",
    buildPdfUrl: (year, month) => {
      const reiwa = year - 2018;
      const nendo = month >= 4 ? reiwa : reiwa - 1;
      return `https://comaam.jp/hikari/R${nendo}jidoukanndayori/${month}jidoukanndayori.pdf`;
    },
  },
  {
    id: "tsubame",
    name: "トコハピつばめ",
    fullName: "所沢市立つばめ児童館",
    address: "所沢市久米783-1",
    siteUrl: "https://comaam.jp/tsubame/",
    buildPdfUrl: (year, month) => {
      const rr = String(year - 2018).padStart(2, "0");
      const mm = String(month).padStart(2, "0");
      return `https://comaam.jp/tsubame/${rr}${mm}kandayori.pdf`;
    },
  },
  {
    id: "midori",
    name: "トコハピみどり",
    fullName: "所沢市立みどり児童館",
    address: "所沢市緑町1-8-3",
    siteUrl: "https://www.comaam.jp/midori/",
    buildPdfUrl: (year, month) => {
      const rr = String(year - 2018).padStart(2, "0");
      const mm = String(month).padStart(2, "0");
      return `https://www.comaam.jp/midori/${rr}${mm}kandayori.pdf`;
    },
  },
  {
    id: "wakaba",
    name: "トコハピわかば",
    fullName: "所沢市立わかば児童館",
    address: "所沢市和ケ原3-266-2",
    siteUrl: "https://www.comaam.jp/wakaba/",
    buildPdfUrl: (year, month) => {
      const r = year - 2018;
      const mm = String(month).padStart(2, "0");
      return `https://www.comaam.jp/wakaba/kandayori${r}${mm}.pdf`;
    },
  },
];

// 非イベント行をスキップ
const SKIP_LINE_RE = /^>|休館日|中高生タイム$|^卓球\s|^バスケット\s|^ドッジボール\s|^♪卓球|^♪バスケ|^♪ドッジ|^■中高生|TEL\s|FAX\s|^http|^www\.|HP\s*[》」]|Instagram|ホームページ|開館時間|利用時間|指定管理|回覧|公開予定|利用について/;

// スキップするタイトル
const SKIP_TITLE_RE = /^中高生タイム$|^卓球$|^バスケット$|^ドッジボール$|^避難訓練$|^ランチタイム$/;

// メタラベル行（タイトルではない）
const META_RE = /^(場\s*所|対\s*象|定\s*員|申\s*込|受\s*付|持ち物|講\s*師|内\s*容|費\s*用|参\s*加|活\s*動|注意|備考|問|〒|※|✿|✉|>[^])/;

// タイトルらしくない行
const NOT_TITLE_RE = /^\d+[:\s]|^\d{1,2}月|^\d{1,2}\/|^日時|^時間|利用できません|お休み|開催時間|^令和|^R\d|^202\d|月号|発行|修繕|工事|愛称|午前\d|午後\d|^第\d日曜|乳幼児とその保護者|小学生以上$|概ね\d歳|歳児とその保護者|窓口|お電話|代理申込|お越しください|お友だちの|お待ちし|お知らせ|お問い合わせ|ご利用|^No\.|第\d+号|日発行|ランチタイムを|を集めています|遊びに来て|ぜひ.*来て|集まれ!.*申込|新記録を目指|お子様の所在|衣類.*絵本|どのコーナー|参加費無料$|対応しておりません|所在確認/;

/**
 * PDFテキストを正規化
 */
function normalizeText(text) {
  return normalizeJaDigits(text.normalize("NFKC"))
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(日|月|時|分)/g, "$1$2")
    .replace(/(\d)\s*[：:]\s*(\d)/g, "$1:$2")
    .replace(/(\d)\s*\/\s*(\d)/g, "$1/$2")
    .replace(/[～〜~]/g, "～")
    .replace(/\s*～\s*/g, "～");
}

/**
 * 時刻を抽出: "10:00～11:30" or "午前10時～11時30分"
 */
function extractTime(text) {
  // HH:MM～HH:MM
  const m1 = text.match(/(\d{1,2}):(\d{2})～(\d{1,2}):(\d{2})/);
  if (m1) return {
    startHour: Number(m1[1]), startMinute: Number(m1[2]),
    endHour: Number(m1[3]), endMinute: Number(m1[4]),
  };
  // HH:MM のみ
  const m2 = text.match(/(\d{1,2}):(\d{2})/);
  if (m2) return {
    startHour: Number(m2[1]), startMinute: Number(m2[2]),
    endHour: null, endMinute: null,
  };
  // 午前/午後N時
  const m3 = text.match(/(午前|午後)(\d{1,2})時(\d{1,2}分)?～(午前|午後)?(\d{1,2})時(\d{1,2}分)?/);
  if (m3) {
    let sh = Number(m3[2]);
    if (m3[1] === "午後" && sh < 12) sh += 12;
    const sm = m3[3] ? Number(m3[3].replace("分", "")) : 0;
    let eh = Number(m3[5]);
    const ep = m3[4] || m3[1];
    if (ep === "午後" && eh < 12) eh += 12;
    const em = m3[6] ? Number(m3[6].replace("分", "")) : 0;
    return { startHour: sh, startMinute: sm, endHour: eh, endMinute: em };
  }
  return null;
}

/**
 * テキストに時刻パターンが含まれるか（タイトル判定用）
 */
function hasTimePattern(text) {
  return /\d{1,2}:\d{2}/.test(text) || /午前\d|午後\d/.test(text);
}

/**
 * タイトルとして有効か判定
 */
function isValidTitle(title) {
  if (!title || title.length < 2 || title.length > 60) return false;
  if (SKIP_TITLE_RE.test(title)) return false;
  // 日付文字列自体はタイトルではない
  if (/^\d{1,2}\/\d{1,2}/.test(title)) return false;
  if (/^\d{1,2}月\d{1,2}日/.test(title)) return false;
  return true;
}

/**
 * PDFテキストからイベントを抽出
 */
function parseComaamPdf(text, defaultYear, defaultMonth) {
  const events = [];
  const norm = normalizeText(text);
  const lines = norm.split("\n").map(l => l.trim()).filter(Boolean);

  let currentTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (SKIP_LINE_RE.test(line)) continue;

    // Strategy A: "日時：M月D日（曜）..." or "日時：M/D（曜）..."
    const nichijiMatch = line.match(/日時\s*[:：]\s*(.*)/);
    if (nichijiMatch) {
      const dateStr = nichijiMatch[1];
      const dates = extractDatesFromString(dateStr, defaultMonth);
      const timeRange = extractTime(dateStr);
      const trFinal = timeRange || extractTimeFromNearby(lines, i);
      for (const { mo, d } of dates) {
        if (isValidTitle(currentTitle)) {
          events.push({ y: defaultYear, mo, d, title: currentTitle, timeRange: trFinal });
        }
      }
      continue;
    }

    // Strategy B2 (before B): Multi-date "D日(曜)・D日(曜)..." with title on same/next line
    const multiDateLine = line.match(/^(\d{1,2})日\s*[（(][月火水木金土日][）)]\s*[・&]\s*(\d{1,2})日\s*[（(][月火水木金土日][）)]/);
    if (multiDateLine) {
      const days = [];
      const dayRe = /(\d{1,2})日\s*[（(][月火水木金土日][）)]/g;
      let dm;
      while ((dm = dayRe.exec(line)) !== null) {
        days.push(Number(dm[1]));
      }
      let title = line.replace(/\d{1,2}日\s*[（(][月火水木金土日][）)]\s*[・&]?\s*/g, "").trim();
      if (title.length < 2 && i + 1 < lines.length) {
        title = lines[i + 1].replace(/^[●★◆◎☆■♪✱#\s]+/, "").trim();
      }
      if (isValidTitle(title)) {
        const timeRange = extractTimeFromNearby(lines, i);
        for (const d of days) {
          if (d >= 1 && d <= 31) {
            events.push({ y: defaultYear, mo: defaultMonth, d, title, timeRange });
          }
        }
      }
      continue;
    }

    // Strategy B: "D日(曜) Title" (ルピナス style) — single date with title
    const dayFirstMatch = line.match(/^(\d{1,2})日\s*[（(]\s*[月火水木金土日]\s*[）)]\s*(.+)/);
    if (dayFirstMatch) {
      const d = Number(dayFirstMatch[1]);
      let title = dayFirstMatch[2].replace(/^[・\s]+/, "").trim();
      // Skip if "title" is actually more dates (handled by B2)
      if (/^\d{1,2}日\s*[（(]/.test(title)) { continue; }
      if (d >= 1 && d <= 31 && title.length >= 2 && !SKIP_TITLE_RE.test(title)) {
        const timeRange = extractTime(line) || extractTimeFromNearby(lines, i);
        events.push({ y: defaultYear, mo: defaultMonth, d, title, timeRange });
      }
      continue;
    }

    // Strategy C: Inline "M月D日（曜）" or "M/D（曜）" with currentTitle
    const inlineDates = extractDatesFromString(line, defaultMonth);
    if (inlineDates.length > 0 && currentTitle && !META_RE.test(line)) {
      const isDateLine = /^\d{1,2}[月/]/.test(line) || /^[●★◆◎☆■♪✱]\s*\d/.test(line);
      if (isDateLine) {
        const timeRange = extractTime(line) || extractTimeFromNearby(lines, i);
        for (const { mo, d } of inlineDates) {
          if (!SKIP_TITLE_RE.test(currentTitle)) {
            events.push({ y: defaultYear, mo, d, title: currentTitle, timeRange });
          }
        }
        continue;
      }
    }

    // Title detection: update currentTitle
    if (META_RE.test(line) || NOT_TITLE_RE.test(line)) continue;

    // Markdown heading
    const headingMatch = line.match(/^#+\s+(.+)/);
    if (headingMatch) {
      const t = cleanTitle(headingMatch[1]);
      if (t.length >= 2 && t.length <= 50 && !hasTimePattern(t)) currentTitle = t;
      continue;
    }

    // Bullet/symbol prefix
    const bulletMatch = line.match(/^[●★◆◎☆■♪✱]\s*(.+)/);
    if (bulletMatch) {
      const t = cleanTitle(bulletMatch[1]);
      if (t.length >= 2 && t.length <= 50 && !hasTimePattern(t)) currentTitle = t;
      continue;
    }

    // Plain text title candidate
    const plain = cleanTitle(line);
    if (plain.length >= 3 && plain.length <= 40
        && !/\d{1,2}[月日時分]/.test(plain)
        && !hasTimePattern(plain)) {
      currentTitle = plain;
    }
  }

  return events;
}

/**
 * 文字列から日付パターンを抽出
 */
function extractDatesFromString(str, defaultMonth) {
  const dates = [];
  // M月D日（曜） or M月D日
  const mdRe = /(\d{1,2})月\s*(\d{1,2})日(?:\s*[（(]\s*[月火水木金土日]\s*[）)])?/g;
  let m;
  while ((m = mdRe.exec(str)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) dates.push({ mo, d });
  }
  if (dates.length > 0) {
    // Handle "M月D日、D日（曜）" — additional bare days
    const bareDayRe = /、\s*(\d{1,2})日(?:\s*[（(]\s*[月火水木金土日]\s*[）)])?/g;
    let bd;
    while ((bd = bareDayRe.exec(str)) !== null) {
      const d = Number(bd[1]);
      if (d >= 1 && d <= 31) {
        const mo = dates[0].mo;
        if (!dates.some(x => x.mo === mo && x.d === d)) dates.push({ mo, d });
      }
    }
    return dates;
  }
  // M/D（曜） or M/D
  const slashRe = /(\d{1,2})\/(\d{1,2})(?:\s*[（(]\s*[月火水木金土日]\s*[）)])?/g;
  while ((m = slashRe.exec(str)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) dates.push({ mo, d });
  }
  return dates;
}

/**
 * 近隣行から時刻を検索
 */
function extractTimeFromNearby(lines, startIdx) {
  for (let j = startIdx + 1; j < Math.min(startIdx + 4, lines.length); j++) {
    const line = lines[j].trim();
    // Stop at next event/heading
    if (/^[●★◆◎☆■♪✱#]/.test(line)) break;
    if (/^\d{1,2}日\s*[（(]/.test(line)) break;
    if (/^日時/.test(line)) break;
    const tr = extractTime(line);
    if (tr) return tr;
  }
  return null;
}

/**
 * タイトル文字列をクリーン
 */
function cleanTitle(text) {
  return text
    .replace(/^[●★◆◎☆■♪✱#\s]+/, "")
    .replace(/【[^】]*】/g, "")
    .replace(/\s*[（(]申込[^）)]*[）)]/g, "")
    .replace(/\s*[（(]予約[^）)]*[）)]/g, "")
    .replace(/\s*要申込み?\s*$/g, "")
    .replace(/\s*※.*$/g, "")
    .trim();
}

function createCollectTokorozawaComaamEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const source = TOKOROZAWA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = "所沢市comaam";

  return async function collectTokorozawaComaamEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const allEvents = [];

    for (const facility of FACILITIES) {
      for (const { year, month } of months) {
        const pdfUrl = facility.buildPdfUrl(year, month);
        try {
          const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
          if (!markdown || markdown.length < 100) continue;
          const parsed = parseComaamPdf(markdown, year, month);
          for (const ev of parsed) {
            ev.facility = facility;
            ev.pdfUrl = pdfUrl;
          }
          allEvents.push(...parsed);
        } catch (e) {
          console.warn(`[${label}] ${facility.name} ${year}/${month} PDF failed:`, e.message || e);
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
      const key = `${ev.facility.id}:${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }

    // Geocode per facility (one-time since addresses are fixed)
    const facilityPoints = new Map();
    for (const f of FACILITIES) {
      const candidates = [`埼玉県${f.address}`, `埼玉県所沢市 ${f.name}`];
      let point = await geocodeForWard(candidates, source);
      point = resolveEventPoint(source, f.name, point, `所沢市 ${f.name}`);
      const address = resolveEventAddress(source, f.name, f.address, point);
      facilityPoints.set(f.id, { point, address });
    }

    // 最終タイトル品質チェック
    const JUNK_TITLE_RE = /。$|した$|ます$|ません$|ください$|^○|^・|^[\d/（）()\s、]+$|成長して|使用しなく|となります|コーナー\s+○/;

    const byId = new Map();
    for (const ev of uniqueMap.values()) {
      if (JUNK_TITLE_RE.test(ev.title)) continue;
      const f = ev.facility;
      const geo = facilityPoints.get(f.id) || {};
      const point = geo.point;
      const address = geo.address || f.address;

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:comaam:${f.id}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: source.label,
        title: `${ev.title}（${f.name}）`,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: f.fullName,
        address: address || "",
        url: f.siteUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectTokorozawaComaamEvents };
