const { fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { SAITAMA_CITY_SOURCE } = require("../../config/wards");

const TAYORI_BASE = "https://www.saicity-j.or.jp/tayori";

/**
 * さいたま市 18 児童センター施設一覧
 * slug: PDFファイル名に使うローマ字 (j_{slug}{RRMM}.pdf)
 */
const CENTERS = [
  { slug: "uemizu",    name: "植水児童センター",     address: "さいたま市西区中野林174-1" },
  { slug: "mamiya",    name: "馬宮児童センター",     address: "さいたま市西区西遊馬533-1" },
  { slug: "uetake",    name: "植竹児童センター",     address: "さいたま市北区盆栽町430" },
  { slug: "miyahara",  name: "宮原児童センター",     address: "さいたま市北区宮原町4-66-13" },
  { slug: "hongo",     name: "本郷児童センター",     address: "さいたま市北区本郷町1065-3" },
  { slug: "mihashi",   name: "三橋児童センター",     address: "さいたま市大宮区三橋2-59" },
  { slug: "amanuma",   name: "天沼児童センター",     address: "さいたま市大宮区天沼町1-194" },
  { slug: "haruno",    name: "春野児童センター",     address: "さいたま市見沼区春野1-7-1" },
  { slug: "yono",      name: "与野本町児童センター", address: "さいたま市中央区本町東5-17-25" },
  { slug: "mukaihara", name: "向原児童センター",     address: "さいたま市中央区下落合7-11-9" },
  { slug: "ooto",      name: "大戸児童センター",     address: "さいたま市中央区大戸6-2-19" },
  { slug: "okubo",     name: "大久保東児童センター", address: "さいたま市桜区大久保領家131-6" },
  { slug: "nakamoto",  name: "仲本児童センター",     address: "さいたま市浦和区東仲町28-15" },
  { slug: "buzo",      name: "文蔵児童センター",     address: "さいたま市南区文蔵4-19-3" },
  { slug: "iwatsuki",    name: "岩槻児童センター",     address: "さいたま市岩槻区本町1-11-11" },
  { slug: "katayanagi", name: "片柳児童センター",     address: "さいたま市見沼区東新井710-78" },
  { slug: "urawabessyo",name: "浦和別所児童センター", address: "さいたま市南区別所2-15-6" },
  { slug: "omagi",       name: "尾間木児童センター",   address: "さいたま市緑区大間木472" },
];

// 行レベルのスキップ（この行自体を無視）
const SKIP_RE = /休\s*館|閉\s*館|利用案内|お問い合わせ|電話|ＴＥＬ|TEL|FAX|アクセス|所在地|令和\d|発行|建国記念|天皇誕生|振替休|お休み|祝日|中\s*高\s*生\s*タイム延長|優先\s*タイム|交替制/;
// タイトルとして無効なパターン
const JUNK_TITLE_RE = /^[\d\s\-～〜:：（）()、。,.はの・＆&]+$|^.{0,2}$|申込|問合|持ち物|日\s*時|場\s*所|会\s*場|時\s*間\s*[：:]|定員|対象|費用|注意|詳細|毎週|毎月|お知らせ|カレンダー|^\d+\s*月|今月の|実施中|受付|内容[：:]|開\s*催|期間|HP|ホーム|ページ|インスタ|こちら|寄附|www\.|http|だより|月\s*号|センターだより|です[。！]$|ます[。！]$|ください|ましょう|※印|利用ができません|春分\s*の\s*日|遊戯室|午前\s*\d|午後\s*\d|^\d+歳\s*…$|他の事業|のお\s*知|^みやはら$|^はるの$|^うえたけ$|^うえみず$|^ぶぞう$|…$|社会福祉|事業団|行\s*事\s*名|幼児向|幼児さん|小学生|先\s*着|事務室|利用\s*登録|更新|年度|^キャラクター|登録制|保護者\s*同伴|^乳\s*幼\s*児|^さんとその|^どなた\s*でも|^ならどなた|が来ます|が必要|してみません|^保護者$|直接お越し|フォロー|お願いします|来館いただ|^ショー$|^ちょう$|中高生$|^タイム$|ゲーム\s*感覚|今月は\s*\d|^\d+\s*日$|^相談員|のおねがい|未就学児$|^0\s*歳児$|^1\s*歳児$|^レクゲーム|読み聞かせ\s*など$|^時間\d|パフォーマン\s*ス\s*Festa/;

/** 全角数字→半角数字 正規化 */
function normalizeFullWidth(str) {
  return str.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30));
}

/** タイトルを清掃 */
function cleanTitle(raw) {
  let t = raw
    .replace(/^#+\s*/, "")                // markdown ## prefix
    .replace(/^[●★◆◎☆■□▲△▼▽♪♫]\s*/, "")  // bullet prefix
    .replace(/[「」]/g, "")               // brackets
    .replace(/^[～〜~\-－]+\s*/, "")      // leading ～
    .replace(/^\d+\s+(?=[ぁ-ん])/, "")    // leading digit before hiragana (e.g. "1 プチ")
    .replace(/\s*[【\[（(][^】\]）)]*(?:対象|歳児|年生|以上|以下|限定|要予約|予約制|定員|申込)[^】\]）)]*[】\]）)]?\s*$/,"")
    .replace(/\s+は[、,]?\s*$/, "")       // trailing は、
    .replace(/\s+の\s*$/, "")             // trailing の
    .trim();
  // 数字区切りを除去 (e.g. "2・9・")
  t = t.replace(/^[\d・,、\s]+$/, "");
  return t;
}

/** タイトルが有効かチェック */
function isValidTitle(t) {
  if (!t || t.length < 3) return false;
  if (SKIP_RE.test(t)) return false;
  if (JUNK_TITLE_RE.test(t)) return false;
  // 数字と記号だけ
  if (/^[\d\s\-～〜:：（）()、。,.・＆&#/*]+$/.test(t)) return false;
  return true;
}

/**
 * PDFマークダウンからイベントを抽出
 *
 * 4つの抽出戦略:
 * A) "N日(曜)" or "M月N日(曜)" + currentTitle (宮原・春野型)
 * B) "N日 「タイトル」＆「タイトル」" (植水型)
 * C) "M/D(曜)" スラッシュ日付 + currentTitle (文蔵型)
 * D) "##" markdown見出し → タイトルとして記憶
 */
/** 日時テキスト中に普通の日本語タイトルを検出 (テーブル行の事業名列) */
const PLAIN_TITLE_RE = /^([ぁ-ヶー\u4E00-\u9FFF]{2,}[\p{L}\p{N}ー・\s]{0,30})/u;
/** body text (説明文) を除外 */
const BODY_TEXT_RE = /[。]$|です[。]?$|ます[。]?$|ました|ください|します$|ません$|いたします|のため|ご[利了参持]|づくり|情報交換|おうちで|楽しく|体を動か|みんなで|一緒に|しましょう|たりする|お待ちして|楽しい\s+\d+\s+分|てみてね|分間$|など\s+楽しい/;

function parseJidoukanPdf(text, defaultY, defaultMo) {
  const events = [];
  const lines = text.split(/\n/);

  let currentTitle = "";

  /** ふりがな行かどうか判定 (短いひらがな/カタカナのみの行) */
  function isFuriganaLine(s) {
    if (!s || s.length > 10) return false;
    return /^[\s\u3040-\u309Fー・]+$/.test(s);
  }

  /** 次の非空・非ルビ・非ふりがな行を正規化して取得 */
  function peekNextLine(fromIdx) {
    for (let j = fromIdx + 1; j < lines.length && j <= fromIdx + 6; j++) {
      const raw = lines[j].trim();
      if (!raw || /^>\s/.test(raw)) continue;
      if (isFuriganaLine(raw)) continue;
      return normalizeFullWidth(raw);
    }
    return "";
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // ルビ(ふりがな)ブロックをスキップ
    if (/^>\s/.test(rawLine)) continue;

    // ふりがな行をスキップ (短いひらがなのみの行)
    if (isFuriganaLine(rawLine)) continue;

    // 全角数字→半角数字に正規化
    const line = normalizeFullWidth(rawLine);

    // ノイズ行をスキップ
    if (SKIP_RE.test(line)) continue;
    // ヘッダー行: "2026年2月" 等
    if (/^\d{4}\s*年\s*\d{1,2}\s*月/.test(line)) continue;
    // カレンダーグリッドのヘッダー行
    if (/^日\s+月\s+火\s+水\s+木\s+金\s+土/.test(line)) continue;

    // タイトル候補: ## markdown見出し (文蔵型: "## 測定 の日", "## 赤ちゃんひろば")
    if (/^#+\s+/.test(line)) {
      const t = cleanTitle(line);
      if (isValidTitle(t)) {
        currentTitle = t;
      }
      continue;
    }

    // タイトル候補: ●★◆◎ で始まるイベント名
    const bulletMatch = line.match(/^[●★◆◎☆■□▲△▼▽♪♫]\s*(.{2,50})/);
    if (bulletMatch) {
      const t = cleanTitle(bulletMatch[1]);
      if (isValidTitle(t)) {
        currentTitle = t;
      }
    }

    // 戦略C: スラッシュ日付 "M/D(曜)" (文蔵型)
    // PDF変換で "2/25" → "2/2 5" や "2 17" に崩れるケースに対応
    // ★ 曜日が次行にある場合にも対応: "M/D （曜\n）"
    const slashDateRe = /(\d{1,2})\s*[\/]\s*(\d)\s*(\d)?\s*[（(]\s*([月火水木金土日])[）)]/;
    let dmC = line.match(slashDateRe);
    if (!dmC) {
      // 閉じ括弧が次行にある場合: "3/10 （火" → peek next for "）"
      const slashPartialRe = /(\d{1,2})\s*[\/]\s*(\d)\s*(\d)?\s*[（(]\s*([月火水木金土日])\s*$/;
      const partialM = line.match(slashPartialRe);
      if (partialM) {
        const nl = peekNextLine(i);
        if (/^[）)]/.test(nl)) {
          dmC = partialM;
        }
      }
    }
    if (dmC) {
      const evMo = Number(dmC[1]);
      const d = dmC[3] ? Number(dmC[2] + dmC[3]) : Number(dmC[2]);
      if (d < 1 || d > 31 || evMo < 1 || evMo > 12) { /* skip */ }
      else {
        // タイトル: 行のslash-date前のテキスト or currentTitle
        const dateIdx = line.indexOf(dmC[0]);
        let beforeDate = line.substring(0, dateIdx).trim()
          .replace(/^日\s*時\s*[：:．…]\s*/, "")
          .replace(/^[●★◆◎☆■□▲△▼▽♪♫#]+\s*/, "").trim();
        // "2 17(火).2 18(水)" → 複数日付がピリオド区切り → beforeDateは空
        beforeDate = cleanTitle(beforeDate);
        let title = isValidTitle(beforeDate) ? beforeDate : currentTitle;
        if (title) {
          const timeText = line.substring(dateIdx + dmC[0].length);
          const nextLine = peekNextLine(i);
          const timeRange = extractTime(timeText + " " + nextLine);
          events.push({ y: defaultY, mo: evMo, d, title, timeRange });
        }
        // ピリオド区切りの複数日付: "2 17(火).2 18(水)"
        const rest = line.substring(line.indexOf(dmC[0]) + dmC[0].length);
        const nextDateMatch = rest.match(/[.．]\s*(\d{1,2})\s*[\/\s]\s*(\d)\s*(\d)?\s*[（(]\s*([月火水木金土日])[）)]/);
        if (nextDateMatch && title) {
          const evMo2 = Number(nextDateMatch[1]);
          const d2 = nextDateMatch[3] ? Number(nextDateMatch[2] + nextDateMatch[3]) : Number(nextDateMatch[2]);
          if (d2 >= 1 && d2 <= 31 && evMo2 >= 1 && evMo2 <= 12) {
            events.push({ y: defaultY, mo: evMo2, d: d2, title, timeRange: null });
          }
        }
        continue;
      }
    }

    // 戦略C': スペース区切り日付 "M DD(曜)" (スラッシュなし版)
    const spaceDateRe = /^(\d{1,2})\s+(\d{1,2})\s*[（(]\s*([月火水木金土日])[）)]/;
    const dmC2 = line.match(spaceDateRe);
    if (dmC2) {
      const evMo = Number(dmC2[1]);
      const d = Number(dmC2[2]);
      if (d >= 1 && d <= 31 && evMo >= 1 && evMo <= 12 && currentTitle) {
        const timeText = line.substring(line.indexOf(dmC2[0]) + dmC2[0].length);
        const nextLine = peekNextLine(i);
        const timeRange = extractTime(timeText + " " + nextLine);
        events.push({ y: defaultY, mo: evMo, d, title: currentTitle, timeRange });
        continue;
      }
    }

    // 戦略A0: "D（曜）" (日なし, 与野本町型): "5（木）11：00～"
    const bareDigitDowRe = /^(\d{1,2})\s*[（(]\s*([月火水木金土日])\s*[）)]/;
    const dmA0 = line.match(bareDigitDowRe);
    if (dmA0 && currentTitle) {
      const d = Number(dmA0[1]);
      if (d >= 1 && d <= 31) {
        const afterDate = line.substring(line.indexOf(dmA0[0]) + dmA0[0].length);
        const quoteInLine = afterDate.match(/[「『]([^」』]+)[」』]/);
        let title;
        if (quoteInLine) {
          const qt = cleanTitle(quoteInLine[1]);
          title = isValidTitle(qt) ? qt : null;
        }
        if (!title) title = currentTitle;
        const nextLine = peekNextLine(i);
        const timeRange = extractTime(afterDate + " " + nextLine);
        events.push({ y: defaultY, mo: defaultMo, d, title, timeRange });
        continue;
      }
    }

    // 戦略A-multi: "2・9・16・23 日（月）" 複数日付パターン
    const multiDayRe = /(\d{1,2}(?:\s*[・,、]\s*\d{1,2})+)\s*日\s*[（(]\s*([月火水木金土日])\s*[）)]/;
    const dmMulti = line.match(multiDayRe);
    if (dmMulti && currentTitle) {
      const days = dmMulti[1].split(/[・,、]/).map(s => Number(s.trim())).filter(n => n >= 1 && n <= 31);
      if (days.length >= 2) {
        const afterDate = line.substring(line.indexOf(dmMulti[0]) + dmMulti[0].length);
        const nextLine = peekNextLine(i);
        const timeRange = extractTime(afterDate + " " + nextLine);
        for (const d of days) {
          events.push({ y: defaultY, mo: defaultMo, d, title: currentTitle, timeRange });
        }
        continue;
      }
    }

    // 戦略A: 日付+曜日パターン: "N日(曜)" or "M月N日(曜)"
    const dateWithDowRe = /(?:(\d{1,2})月\s*)?(\d{1,2})\s*日\s*[（(]\s*([月火水木金土日])[）)]/;
    let dmA = line.match(dateWithDowRe);

    // ★ 戦略A': 日付と曜日が行をまたぐ場合: "N日" (行末) + "（曜）" (次行)
    if (!dmA) {
      const dateTailRe = /(?:(\d{1,2})月\s*)?(\d{1,2})\s*日\s*$/;
      const dtm = line.match(dateTailRe);
      if (dtm) {
        const nl = peekNextLine(i);
        if (/^[（(]\s*([月火水木金土日])\s*[）)]/.test(nl)) {
          // 仮想マッチオブジェクトを構築
          dmA = dtm;
        }
      }
    }

    if (dmA) {
      const evMo = dmA[1] ? Number(dmA[1]) : defaultMo;
      const d = Number(dmA[2]);
      if (d < 1 || d > 31) continue;

      const dateIdx = line.indexOf(dmA[0]);
      const beforeDate = cleanTitle(line.substring(0, dateIdx));
      const afterDate = line.substring(dateIdx + dmA[0].length);

      // 行内の引用符タイトルを優先: 『ふれあいあそび』「足形アート」
      const quoteInLine = afterDate.match(/[「『]([^」』]+)[」』]/);
      let title;
      if (quoteInLine) {
        const qt = cleanTitle(quoteInLine[1]);
        title = isValidTitle(qt) ? qt : null;
      }
      if (!title) title = isValidTitle(beforeDate) ? beforeDate : currentTitle;
      if (!title) continue;

      const nextLine = peekNextLine(i);
      const timeRange = extractTime(afterDate + " " + nextLine);

      events.push({ y: defaultY, mo: evMo, d, title, timeRange });
      continue;
    }

    // 戦略B: 日付+「タイトル」パターン (植水型): "N日 「育児相談」＆「大型絵本」"
    const dateQuoteRe = /(\d{1,2})\s*日\s+(.+)/;
    const dmB = line.match(dateQuoteRe);
    if (dmB && /[「『]/.test(dmB[2])) {
      const d = Number(dmB[1]);
      if (d < 1 || d > 31) continue;

      const titles = [];
      const quoteRe = /[「『]([^」』]+)[」』]/g;
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

    // タイトル候補 (プレーン): テーブル形式の事業名 (大久保東型)
    // 厳格条件: カタカナor漢字で始まり、文中断片でない短い行のみ
    if (!bulletMatch && !line.match(/^\d/) && !line.match(/^[（(]/) && !line.match(/^午[前後]/)
        && !line.match(/^※/) && !line.match(/^[ごぜん|ごご]/)
        && !line.match(/組$/) && !line.match(/名$/)
        && line.length <= 40) {
      // カタカナ or 漢字で始まる行のみ (ひらがな開始は文中断片の可能性が高い)
      if (/^[\u30A0-\u30FF\u4E00-\u9FFF]/.test(line)) {
        const plainM = line.match(PLAIN_TITLE_RE);
        if (plainM && !BODY_TEXT_RE.test(line)) {
          const t = cleanTitle(plainM[1]);
          if (isValidTitle(t) && t.length >= 3 && t.length <= 25) {
            currentTitle = t;
          }
        }
      }
    }
  }

  // 戦略E: カレンダーグリッド型PDF (宮原・三橋・仲本型)
  // テキスト全体から「N・N・N日の曜日 イベント名」「イベント名は、N日（曜）」パターンを抽出
  if (events.length === 0) {
    const fullText = normalizeFullWidth(lines.join(" "));
    // E1: "N・N・N日の曜日" → イベント名は直前or直後
    const multiDateRe = /([\p{L}\p{N}ー・]{2,30})\s*(?:は\s*[、,]?\s*)?(\d{1,2}(?:\s*[・,、]\s*\d{1,2})+)\s*日\s*の?\s*([月火水木金土日])曜日/gu;
    let em;
    while ((em = multiDateRe.exec(fullText)) !== null) {
      const candidateTitle = cleanTitle(em[1]);
      if (!isValidTitle(candidateTitle)) continue;
      const days = em[2].split(/[・,、]/).map(s => Number(s.trim())).filter(n => n >= 1 && n <= 31);
      for (const d of days) {
        events.push({ y: defaultY, mo: defaultMo, d, title: candidateTitle, timeRange: null });
      }
    }

    // E2: "イベント名は、N日（曜）です" or "N日（曜）イベント名"
    const singleDateRe = /([\p{L}\p{N}ー・]{2,30})\s*(?:は\s*[、,]?\s*)(\d{1,2})\s*日\s*[（(]\s*([月火水木金土日])\s*[）)]/gu;
    while ((em = singleDateRe.exec(fullText)) !== null) {
      const candidateTitle = cleanTitle(em[1]);
      if (!isValidTitle(candidateTitle)) continue;
      const d = Number(em[2]);
      if (d < 1 || d > 31) continue;
      events.push({ y: defaultY, mo: defaultMo, d, title: candidateTitle, timeRange: null });
    }

    // E3: "M月N日（曜）" followed by event name (nearby text)
    const monthDateRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*[（(]\s*([月火水木金土日])\s*[）)]/g;
    while ((em = monthDateRe.exec(fullText)) !== null) {
      const evMo = Number(em[1]);
      const d = Number(em[2]);
      if (d < 1 || d > 31 || evMo < 1 || evMo > 12) continue;
      if (evMo !== defaultMo && evMo !== defaultMo + 1 && evMo !== defaultMo - 1) continue;
      // Use currentTitle or look at nearby text
      if (currentTitle) {
        events.push({ y: defaultY, mo: evMo, d, title: currentTitle, timeRange: null });
      }
    }
  }

  return events;
}

/** 時刻テキストから timeRange を抽出 */
function extractTime(text) {
  // HH：MM～HH：MM (colon/fullwidth colon)
  const rangeMatch = text.match(/(?:午前|午後)?\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~\-－]\s*(?:午前|午後)?\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
  if (rangeMatch) {
    return {
      startHour: Number(rangeMatch[1]), startMin: Number(rangeMatch[2]),
      endHour: Number(rangeMatch[3]), endMin: Number(rangeMatch[4]),
    };
  }
  // 日本語形式: 午前N時M分～午後N時M分
  const jaMatch = text.match(/午(前|後)\s*(\d{1,2})\s*時\s*(\d{1,2})?\s*分?\s*[～〜~\-－]\s*午(前|後)\s*(\d{1,2})\s*時\s*(\d{1,2})?\s*分?/);
  if (jaMatch) {
    let sh = Number(jaMatch[2]);
    if (jaMatch[1] === "後" && sh < 12) sh += 12;
    let eh = Number(jaMatch[5]);
    if (jaMatch[4] === "後" && eh < 12) eh += 12;
    return {
      startHour: sh, startMin: Number(jaMatch[3] || 0),
      endHour: eh, endMin: Number(jaMatch[6] || 0),
    };
  }
  // ごごN：MM～ (hiragana prefix)
  const gogoMatch = text.match(/(?:ごご|ごぜん)\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~\-－]\s*(?:ごご|ごぜん)?\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
  if (gogoMatch) {
    return {
      startHour: Number(gogoMatch[1]), startMin: Number(gogoMatch[2]),
      endHour: Number(gogoMatch[3]), endMin: Number(gogoMatch[4]),
    };
  }
  const startMatch = text.match(/(?:午前|午後|ごご|ごぜん)?\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
  if (startMatch) {
    return {
      startHour: Number(startMatch[1]), startMin: Number(startMatch[2]),
      endHour: null, endMin: null,
    };
  }
  return null;
}

function createCollectSaitamaJidoukanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectSaitamaJidoukanEvents(maxDays) {
    const source = SAITAMA_CITY_SOURCE;
    const srcKey = `ward_${source.key}`;
    const label = "さいたま市児童センター";

    // 対象月のPDF URLを生成
    const months = getMonthsForRange(maxDays);
    const pdfRequests = [];
    for (const center of CENTERS) {
      for (const { year, month } of months) {
        const reiwa = year - 2018;
        const rr = String(reiwa).padStart(2, "0");
        const mm = String(month).padStart(2, "0");
        const fileName = `j_${center.slug}${rr}${mm}.pdf`;
        pdfRequests.push({
          center,
          url: `${TAYORI_BASE}/${fileName}`,
          year,
          month,
        });
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
          // 404ページ検出 (jina.aiプロキシが返す短い非PDF応答)
          if (markdown.length < 500 && !/Markdown Content:/.test(markdown)) return [];
          if (/not found|404|ページが見つかりません/i.test(markdown.substring(0, 300))) return [];
          const events = parseJidoukanPdf(markdown, req.year, req.month);
          return events.map((ev) => ({ ...ev, center: req.center }));
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
        `埼玉県${venueAddress}`,
        `埼玉県さいたま市 ${venueName}`,
      ];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `さいたま市 ${venueName}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );
      const id = `${srcKey}:jidoukan:${ev.center.slug}:${ev.title}:${ev.dateKey}`;
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
        url: `https://www.saicity-j.or.jp/facility/${ev.center.slug.replace(/[a-z]$/, "")}/`,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from ${CENTERS.length} center PDFs)`);
    return results;
  };
}

module.exports = { createCollectSaitamaJidoukanEvents };
