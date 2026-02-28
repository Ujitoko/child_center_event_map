const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { normalizeJaDigits } = require("../text-utils");

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|おはなし|絵本|紙芝居|リトミック|ママ|パパ|マタニティ|ひろば|誕生|手形|ハイハイ|ねんねこ|よちよち|てくてく|ぐんぐん|わんぱく|ベビーマッサージ|育児|栄養相談|サロン|フレンドパーク|わくわく|ちびっこ|アイアイ|にこちゃん|ドラちゃん|ハッピータイム|工作|製作|ふれあい|読み聞かせ|お楽しみ|プラバン|身体測定|小学生タイム|ちょこっと|エンジョイ|遊ぼう|プラネタリウム|ドームシアター|星空|観望|記録会/;

const FACILITIES = [
  {
    name: "坂戸児童センター",
    pageUrl: "https://www.city.sakado.lg.jp/site/sakado-kosodate/507.html",
    address: "坂戸市芦山町23",
  },
  {
    name: "千代田児童センター",
    pageUrl: "https://www.city.sakado.lg.jp/site/sakado-kosodate/4568.html",
    address: "坂戸市千代田4-12-17",
  },
  {
    name: "大家児童センター",
    pageUrl: "https://www.city.sakado.lg.jp/site/sakado-kosodate/4566.html",
    address: "坂戸市厚川238-1",
  },
  {
    name: "三芳野児童センター",
    pageUrl: "https://www.city.sakado.lg.jp/site/sakado-kosodate/13951.html",
    address: "坂戸市紺屋150-5",
  },
];

/**
 * PDF数字周りの空白を除去
 * jina.ai変換時に「1 8」→「18」「10  日」→「10日」等のスペースが入る
 */
function normalizePdfSpaces(text) {
  return text
    // 「日 時」「対 象」「場 所」等の漢字間スペース除去
    .replace(/日\s+時/g, "日時")
    .replace(/対\s+象/g, "対象")
    .replace(/場\s+所/g, "場所")
    .replace(/定\s+員/g, "定員")
    // 数字間の空白除去: "1 8" → "18" (繰り返し適用)
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(\d)/g, "$1$2")
    // 数字と日/月/時の間の空白除去: "10 日" → "10日"
    .replace(/(\d)\s+(日|月|時)/g, "$1$2")
    // コロン周りの空白除去: "10 :30" → "10:30", "15: 00" → "15:00"
    .replace(/(\d)\s*[：:]\s*(\d)/g, "$1:$2")
    // チルダ周りの空白除去: "10:30 ~11:30" → "10:30~11:30"
    .replace(/(\d)\s*[～〜~-]\s*(\d)/g, "$1~$2");
}

/**
 * PDFテキストからイベントを抽出
 * パターン1: ## Heading + 日時 D日(曜) HH:MM~HH:MM
 * パターン2: title行 + 日時 D日・D日(曜) HH:MM~
 * パターン3: 日時 D日(曜)・D日(曜) (異なる曜日の複数日)
 */
// タイトル候補として不適切な行（説明文・注意書き等）
const DESC_RE = /日時|場所|対象|定員|持物|申込|受付|^\d+$|^[（(]|^※|^・|^>|^~|開館|令和|月号|TEL|QR|http|在住|市内|市外|未満|歳~|幼児と|保護者|乳児と|同年齢|おしゃべり|情報交換|しましょう|ください|お気軽|お友だち|参加した|声かけ|帰宅|夕焼け|放送|協議会|レインボー|利用支援|^内容|記入|自転車|貴重品|飲み物|タオル|^\d+:\d+$|材料費|先着順|曜日$|^申込み|お誕生会です|お知らせ|巡回型|\d+-\d+-\d+|千代田\d|芦山|無料$/;

function isGoodTitle(text) {
  if (!text || text.length < 2 || text.length > 40) return false;
  if (DESC_RE.test(text)) return false;
  return true;
}

function cleanTitle(text) {
  return text
    .replace(/^[★☆◆●◎♦☀♣『「]\s*/, "")
    .replace(/[』」]\s*$/, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[～〜~].+$/, "")
    .trim();
}

function parseSakadoPdf(text, y, mo) {
  const normalized = normalizePdfSpaces(text);
  const events = [];
  const lines = normalized.split(/\n/);
  let headingTitle = "";  // ##/#見出しからのタイトル（sticky）
  let lineTitle = "";     // 通常行からのタイトル（weak）

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // ## ヘディング行 → 強いタイトル
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      const t = cleanTitle(headingMatch[1].replace(/[★☆◆●◎♦☀♣]\s*/g, ""));
      if (isGoodTitle(t)) {
        headingTitle = t;
        lineTitle = "";
      }
      continue;
    }

    // # ヘディング行 → 強いタイトル
    const h1Match = line.match(/^#\s+(.+)/);
    if (h1Match) {
      const t = cleanTitle(h1Match[1].replace(/[★☆◆●◎♦☀♣]\s*/g, ""));
      if (isGoodTitle(t) && !/だより|カレンダー/.test(t)) {
        headingTitle = t;
        lineTitle = "";
      }
      continue;
    }

    // 日時行を検出して日付を抽出
    if (/日時/.test(line)) {
      const extracted = extractDatesFromLine(line, mo);
      if (extracted.length > 0) {
        // 使用するタイトル: lineTitle > headingTitle > 後方検索
        let title = lineTitle || headingTitle;
        if (!title) {
          title = findTitleBackward(lines, i);
        }
        let timeRange = extractTimeRange(line, lines, i);
        if (title) {
          for (const { evMo, d } of extracted) {
            events.push({ y, mo: evMo, d, title, timeRange });
          }
        }
        // 日時行の後はlineTitleをリセット（次のイベントに備える）
        lineTitle = "";
        continue;
      }
    }

    // blockquote(>)・装飾(~)行はスキップ
    if (/^>|^~/.test(line)) continue;

    // タイトル候補行（短くてイベント名っぽい行のみ）
    if (line.length >= 2 && line.length <= 30) {
      const t = cleanTitle(line);
      if (isGoodTitle(t)) {
        lineTitle = t;
      }
    }
  }
  return events;
}

// 曜日括弧パターン（空白許容）: (月) or （火） etc.
const DOW_PAREN_SRC = "\\s*[（(]\\s*[月火水木金土日]\\s*[）)]";

/**
 * 日時行から日付を抽出（複数パターン対応）
 * 複数の日時セグメントがある場合(「日時 23日(月) 日時 9日(月)」)も対応
 */
function extractDatesFromLine(line, defaultMo) {
  const results = [];

  // 「日時」で分割して各セグメントを処理
  const segments = line.split(/日時[：:.\s]*/);
  for (let si = 1; si < segments.length; si++) {
    const seg = segments[si].trim();
    if (!seg) continue;
    extractDatesFromSegment(seg, defaultMo, results);
  }

  return results;
}

function extractDatesFromSegment(seg, defaultMo, results) {
  let m;

  // パターンA: M月D日(曜)・M月D日(曜) or M月D日(曜) — 月あり
  const withMonthRe = new RegExp("(\\d{1,2})月(\\d{1,2})日" + DOW_PAREN_SRC, "g");
  let found = false;
  while ((m = withMonthRe.exec(seg)) !== null) {
    results.push({ evMo: Number(m[1]), d: Number(m[2]) });
    found = true;
  }
  if (found) return;

  // パターンB: D日(曜)・D日(曜) — 各日に曜日つき
  const eachDayRe = new RegExp("(\\d{1,2})日" + DOW_PAREN_SRC, "g");
  const eachMatches = [];
  while ((m = eachDayRe.exec(seg)) !== null) {
    eachMatches.push(Number(m[1]));
  }

  // パターンC: D日・D日・D日 (曜) — 最後にだけ曜日
  // "5日・12日・19日 (木)" → 5, 12, 19
  const multiDayRe = new RegExp("((\\d{1,2})日[・、]?)+" + DOW_PAREN_SRC);
  const multiDayMatch = seg.match(multiDayRe);
  if (multiDayMatch) {
    const allDays = multiDayMatch[0].match(/\d{1,2}(?=日)/g);
    if (allDays && allDays.length > eachMatches.length) {
      for (const ds of allDays) {
        results.push({ evMo: defaultMo, d: Number(ds) });
      }
      return;
    }
  }

  // パターンD: D・D日(曜) — "3・17日(火)" = days 3 and 17
  const compactMultiRe = new RegExp("([\\d・]+)日" + DOW_PAREN_SRC);
  const compactMatch = seg.match(compactMultiRe);
  if (compactMatch) {
    const nums = compactMatch[1].split("・").map(Number).filter(n => n > 0 && n <= 31);
    if (nums.length > eachMatches.length) {
      for (const d of nums) {
        results.push({ evMo: defaultMo, d });
      }
      return;
    }
  }

  // パターンB結果を使用
  if (eachMatches.length > 0) {
    for (const d of eachMatches) {
      results.push({ evMo: defaultMo, d });
    }
  }
}

function findTitleBackward(lines, fromIdx) {
  for (let k = fromIdx - 1; k >= Math.max(0, fromIdx - 8); k--) {
    const prev = lines[k].trim();
    if (!prev) continue;
    // # heading
    const hm = prev.match(/^##?\s+(.+)/);
    if (hm) {
      const t = cleanTitle(hm[1].replace(/[★☆◆●◎♦☀♣]\s*/g, ""));
      if (isGoodTitle(t) && !/だより|カレンダー/.test(t)) return t;
      continue;
    }
    // Short title-like lines
    if (prev.length <= 30) {
      const t = cleanTitle(prev);
      if (isGoodTitle(t)) return t;
    }
  }
  return "";
}

function extractTimeRange(line, lines, i) {
  // 同行から時刻を探す
  const timeInLine = line.match(/(\d{1,2}):(\d{2})~(\d{1,2}):(\d{2})/);
  if (timeInLine) {
    return {
      startHour: Number(timeInLine[1]), startMin: Number(timeInLine[2]),
      endHour: Number(timeInLine[3]), endMin: Number(timeInLine[4]),
    };
  }
  // 開始時刻のみ
  const startOnly = line.match(/(\d{1,2}):(\d{2})~/);
  if (startOnly) {
    return {
      startHour: Number(startOnly[1]), startMin: Number(startOnly[2]),
      endHour: null, endMin: null,
    };
  }
  // 次の数行から探す
  for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
    const next = lines[j];
    const nextFull = next.match(/(\d{1,2}):(\d{2})~(\d{1,2}):(\d{2})/);
    if (nextFull) {
      return {
        startHour: Number(nextFull[1]), startMin: Number(nextFull[2]),
        endHour: Number(nextFull[3]), endMin: Number(nextFull[4]),
      };
    }
    const nextStart = next.match(/(\d{1,2}):(\d{2})~/);
    if (nextStart) {
      return {
        startHour: Number(nextStart[1]), startMin: Number(nextStart[2]),
        endHour: null, endMin: null,
      };
    }
  }
  return null;
}

function detectYearMonth(text) {
  let y = null;
  let mo = null;
  const ymMatch = text.match(/(\d{4})\s*[年（(]|令和\s*(\d+)\s*年/);
  if (ymMatch) {
    if (ymMatch[1]) y = Number(ymMatch[1]);
    else if (ymMatch[2]) y = 2018 + Number(ymMatch[2]);
  }
  const moMatch = text.match(/(\d{1,2})\s*月\s*号/);
  if (moMatch) mo = Number(moMatch[1]);
  return { y, mo };
}

function createCollectSakadoJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectSakadoJidokanEvents(maxDays) {
    const source = deps.source || {
      key: "sakado", label: "坂戸市",
      baseUrl: "https://www.city.sakado.lg.jp",
      center: { lat: 35.9575, lng: 139.3905 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const allEvents = [];

    for (const facility of FACILITIES) {
      let html;
      try {
        html = await fetchText(facility.pageUrl);
      } catch (e) {
        console.warn(`[${label}] ${facility.name} page fetch failed:`, e.message || e);
        continue;
      }

      // PDFリンク抽出（最新のみ = 最初のPDF）
      const pdfRe = /<a\s+[^>]*?href="([^"]*\.pdf)"[^>]*>/gi;
      const pdfUrls = [];
      let pm;
      while ((pm = pdfRe.exec(html)) !== null) {
        const href = pm[1];
        const absUrl = href.startsWith("http") ? href
          : `https://www.city.sakado.lg.jp${href.startsWith("/") ? "" : "/"}${href}`;
        if (!pdfUrls.includes(absUrl)) pdfUrls.push(absUrl);
      }

      // 最新の1件だけ取得（2件目は先月分）
      const targetPdf = pdfUrls[0];
      if (!targetPdf) continue;

      try {
        const markdown = await fetchChiyodaPdfMarkdown(targetPdf);
        if (!markdown || markdown.length < 50) continue;

        const normalized = normalizeJaDigits(markdown.normalize("NFKC"));
        const detected = detectYearMonth(normalized);
        const y = detected.y || currentYear;
        const mo = detected.mo || currentMonth;

        const events = parseSakadoPdf(normalized, y, mo);
        for (const ev of events) {
          ev.facility = facility;
          ev.pdfUrl = targetPdf;
        }
        allEvents.push(...events);
      } catch (e) {
        console.warn(`[${label}] ${facility.name} PDF failed:`, e.message || e);
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected (児童センター)`);
      return [];
    }

    // 子育てフィルタ + 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!CHILD_RE.test(ev.title)) continue;
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.title}:${dateKey}:${ev.facility.name}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = ev.facility.name;
      const venueAddress = ev.facility.address;

      let geoCandidates = [`埼玉県${venueAddress}`, `埼玉県坂戸市 ${venueName}`];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `${label} ${venueName}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:pdf:${ev.title}:${ev.dateKey}:${venueName}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: ev.facility.pageUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (児童センター PDF)`);
    return results;
  };
}

module.exports = { createCollectSakadoJidokanEvents };
