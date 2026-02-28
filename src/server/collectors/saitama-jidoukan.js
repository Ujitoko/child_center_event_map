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
const JUNK_TITLE_RE = /^[\d\s\-～〜:：（）()、。,.はの・＆&]+$|^.{0,2}$|申込|問合|持ち物|日\s*時|場\s*所|会\s*場|時\s*間\s*[：:]|定員|対象|費用|注意|詳細|毎週|毎月|お知らせ|カレンダー|^\d+\s*月|今月の|実施中|受付|内容[：:]|開\s*催|期間|HP|ホーム|ページ|インスタ|こちら|寄附|www\.|http|だより|月\s*号|センターだより|です。$|ます。$|ください|ましょう/;

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
function parseJidoukanPdf(text, defaultY, defaultMo) {
  const events = [];
  const lines = text.split(/\n/);

  let currentTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // ルビ(ふりがな)ブロックをスキップ
    if (/^>\s/.test(rawLine)) continue;

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
    const slashDateRe = /(\d{1,2})\s*[\/]\s*(\d)\s*(\d)?\s*[（(]\s*([月火水木金土日])[）)]/;
    const dmC = line.match(slashDateRe);
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
          const nextLine = (i + 1 < lines.length) ? normalizeFullWidth(lines[i + 1]) : "";
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
        const nextLine = (i + 1 < lines.length) ? normalizeFullWidth(lines[i + 1]) : "";
        const timeRange = extractTime(timeText + " " + nextLine);
        events.push({ y: defaultY, mo: evMo, d, title: currentTitle, timeRange });
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

    // 戦略B: 日付+「タイトル」パターン (植水型): "N日 「育児相談」＆「大型絵本」"
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
