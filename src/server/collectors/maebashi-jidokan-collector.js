/**
 * 前橋市 7児童館 PDFコレクター
 *
 * 前橋市公式サイトの児童館一覧ページから毎月のおたよりPDFリンクを抽出し、
 * PDFをパースしてイベントを抽出する。
 *
 * PDF URL例: https://www.city.maebashi.gunma.jp/material/files/group/187/hiyoshi83.pdf
 * ファイル名は施設ごとに不規則（hujimi/fujimi混在等）→ HTML発見方式
 */
const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { normalizeJaDigits } = require("../text-utils");
const { MAEBASHI_SOURCE } = require("../../config/wards");

const LISTING_URL = "https://www.city.maebashi.gunma.jp/soshiki/kodomomiraibu/kodomoshisetsu/gyomu/3/2/3803.html";
const BASE_URL = "https://www.city.maebashi.gunma.jp";

const FACILITIES = [
  { key: "hiyoshi",   name: "日吉児童館",         address: "前橋市日吉町3-20-1" },
  { key: "asakura",   name: "朝倉児童館",         address: "前橋市朝倉町170-3" },
  { key: "oodomo",    name: "大友児童館",         address: "前橋市大友町1-8" },
  { key: "shimokoide",name: "下小出児童館",       address: "前橋市下小出町2-15" },
  { key: "kasukawa",  name: "粕川児童館",         address: "前橋市粕川町込皆戸526" },
  { key: "fujimi",    name: "ふじみじどうかん",   address: "前橋市富士見町小暮814" },
  { key: "alice",     name: "ふじみじどうかんアリス", address: "前橋市富士見町原之郷1758" },
];

// 施設名キーワード→施設マッチ
const FACILITY_KEYWORDS = {
  "日吉": "hiyoshi", "hiyoshi": "hiyoshi",
  "朝倉": "asakura", "asakura": "asakura",
  "大友": "oodomo", "oodomo": "oodomo",
  "下小出": "shimokoide", "shimokoide": "shimokoide", "shimokoifr": "shimokoide",
  "粕川": "kasukawa", "kasukawa": "kasukawa",
  "ふじみ": "fujimi", "fujimi": "fujimi", "hujimi": "fujimi",
  "アリス": "alice", "alice": "alice",
};

const CHILD_RE = /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|リトミック|ママ|パパ|マタニティ|ひろば|誕生|手形|ハイハイ|ベビーマッサージ|育児|栄養相談|サロン|工作|製作|ふれあい|読み聞かせ|お楽しみ|身体測定|遊ぼう|教室|交流会|おはなし|絵本|紙芝居|すくすく|産後|抱っこ|エクササイズ|体操|測定|相談|講座/;

const SKIP_RE = /休館|閉館|お休み|利用案内|お知らせ|月号|だより|発行|カレンダー|令和\d|中\s*高\s*生/;
const JUNK_RE = /^[\d\s\-～〜:：（）()、。,.]+$|^.{0,2}$|日時|場所|対象|定員|持ち物|申込|受付|TEL|FAX|問い合わせ|http|www\.|^\d+月|令和|発行|開館|年度/;

/**
 * 一覧ページからPDFリンクを施設別に抽出
 */
function extractPdfLinksFromListing(html) {
  const pdfsByFacility = new Map();

  // HTMLをセクション分割（h3/h4等の見出しで施設名が変わる）
  // パターン: <a href="//...pdf">N月のおたより</a>
  const re = /<a\s+[^>]*href="([^"]*\.pdf)"[^>]*>([^<]*)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    if (href.startsWith("//")) href = `https:${href}`;
    else if (href.startsWith("/")) href = `${BASE_URL}${href}`;
    const linkText = m[2].trim();

    // ファイル名から施設キーを推定
    const filename = href.split("/").pop().replace(/\.pdf$/, "");
    let facilityKey = null;
    for (const [kw, key] of Object.entries(FACILITY_KEYWORDS)) {
      if (filename.toLowerCase().includes(kw.toLowerCase())) {
        facilityKey = key;
        break;
      }
    }
    if (!facilityKey) continue;

    // 月番号抽出: filename末尾の2桁 (hiyoshi83 → 83 → 令和8年3月)
    const moMatch = filename.match(/(\d{2})$/);
    if (!moMatch) continue;
    const reiwaYear = Math.floor(Number(moMatch[1].charAt(0)));
    const month = Number(moMatch[1].charAt(1)) || Number(moMatch[1].slice(-1));

    if (!pdfsByFacility.has(facilityKey)) pdfsByFacility.set(facilityKey, []);
    pdfsByFacility.get(facilityKey).push({
      url: href,
      month,
      reiwaYear,
      linkText,
    });
  }
  return pdfsByFacility;
}

/**
 * PDFマークダウンからイベントを抽出
 */
function parseMaebashiPdf(text, defaultY, defaultMo) {
  const events = [];
  const normalized = normalizeJaDigits(text.normalize("NFKC"))
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(日|月|時)/g, "$1$2")
    .replace(/(\d)\s*[：:]\s*(\d)/g, "$1:$2");

  const lines = normalized.split(/\n/);
  let currentTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^>/.test(line)) continue;
    if (SKIP_RE.test(line)) continue;

    // ## 見出し → タイトル候補
    if (/^#+\s+/.test(line)) {
      const t = line.replace(/^#+\s+/, "").replace(/^[●★◆◎☆■♪申◇]\s*/, "").trim();
      if (t.length >= 3 && t.length <= 40 && !JUNK_RE.test(t)) {
        currentTitle = t;
      }
      continue;
    }

    // ● ★ ◎ 記号で始まるタイトル
    const bulletMatch = line.match(/^[●★◆◎☆■♪申◇]\s*(.{3,40})/);
    if (bulletMatch) {
      const t = bulletMatch[1].replace(/[「」]/g, "").trim();
      if (!JUNK_RE.test(t)) {
        currentTitle = t;
      }
    }

    // 日付パターン: M月D日(曜)
    const dateRe = /(?:(\d{1,2})月\s*)?(\d{1,2})\s*日\s*[（(]\s*([月火水木金土日])\s*[）)]/g;
    let dm;
    while ((dm = dateRe.exec(line)) !== null) {
      const evMo = dm[1] ? Number(dm[1]) : defaultMo;
      const d = Number(dm[2]);
      if (d < 1 || d > 31 || evMo < 1 || evMo > 12) continue;

      const beforeDate = line.substring(0, dm.index).replace(/^[●★◆◎☆■♪申◇#\s]+/, "").trim();
      let title = (beforeDate.length >= 3 && beforeDate.length <= 40 && !JUNK_RE.test(beforeDate))
        ? beforeDate : currentTitle;
      if (!title) continue;
      if (!CHILD_RE.test(title)) continue;

      // 時刻抽出
      const afterDate = line.substring(dm.index + dm[0].length);
      const timeMatch = afterDate.match(/(\d{1,2}):(\d{2})[～〜~\-](\d{1,2}):(\d{2})/);
      const startMatch = !timeMatch && afterDate.match(/(\d{1,2}):(\d{2})/);
      const timeRange = timeMatch ? {
        startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
        endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
      } : startMatch ? {
        startHour: Number(startMatch[1]), startMin: Number(startMatch[2]),
        endHour: null, endMin: null,
      } : null;

      events.push({ y: defaultY, mo: evMo, d, title, timeRange });
    }
  }
  return events;
}

function createCollectMaebashiJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectMaebashiJidokanEvents(maxDays) {
    const source = MAEBASHI_SOURCE;
    const srcKey = `ward_${source.key}`;
    const label = "前橋市児童館";

    // 一覧ページからPDFリンク取得
    let listingHtml;
    try {
      listingHtml = await fetchText(LISTING_URL);
    } catch (e) {
      console.warn(`[${label}] listing page fetch failed:`, e.message || e);
      return [];
    }

    const pdfsByFacility = extractPdfLinksFromListing(listingHtml);
    const facilityMap = new Map(FACILITIES.map(f => [f.key, f]));

    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const currentYear = jst.getUTCFullYear();

    const allEvents = [];
    const pdfTargets = [];

    for (const [key, pdfs] of pdfsByFacility.entries()) {
      const facility = facilityMap.get(key);
      if (!facility) continue;
      for (const pdf of pdfs) {
        pdfTargets.push({ ...pdf, facility });
      }
    }

    // バッチPDF取得 (3並列)
    const BATCH_SIZE = 3;
    for (let i = 0; i < pdfTargets.length; i += BATCH_SIZE) {
      const batch = pdfTargets.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (target) => {
          const markdown = await fetchChiyodaPdfMarkdown(target.url);
          if (!markdown || markdown.length < 50) return [];

          const y = 2018 + target.reiwaYear;
          const mo = target.month;
          const parsed = parseMaebashiPdf(markdown, y || currentYear, mo);
          return parsed.map(ev => ({ ...ev, facility: target.facility, pdfUrl: target.url }));
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

      let geoCandidates = [`群馬県${venueAddress}`, `群馬県前橋市 ${venueName}`];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("群馬県") ? fmAddr : `群馬県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `前橋市 ${venueName}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:jidokan:${ev.facility.key}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: source.label,
        title: `${ev.title}（${venueName}）`,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: LISTING_URL,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from ${pdfTargets.length} PDFs)`);
    return results;
  };
}

module.exports = { createCollectMaebashiJidokanEvents };
