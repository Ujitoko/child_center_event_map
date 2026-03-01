/**
 * 船橋市 21児童ホーム PDFコレクター
 *
 * 各児童ホームの行事ページからPDFリンクを抽出し、
 * 月間ニュースレター（児童ホームだより）をパースしてイベントを抽出する。
 *
 * 行事ページURL: https://www.city.funabashi.lg.jp/shisetsu/kosodatesien/0005/{ID}/0002/{name}-gyoji.html
 * PDF: 行事ページ内の <a href="*.pdf"> リンクから発見
 */
const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { normalizeJaDigits } = require("../text-utils");
const { FUNABASHI_SOURCE } = require("../../config/wards");

const BASE_URL = "https://www.city.funabashi.lg.jp";

const FACILITIES = [
  { id: "0001", gyoji: "kaijin-gyoji",       name: "海神児童ホーム",     address: "船橋市海神3-7-12" },
  { id: "0002", gyoji: "kanasugidai-gyoji",   name: "金杉台児童ホーム",   address: "船橋市金杉台2-2-7" },
  { id: "0003", gyoji: "komuro-gyoji",        name: "小室児童ホーム",     address: "船橋市小室町3308" },
  { id: "0004", gyoji: "shintakane-gyoji",    name: "新高根児童ホーム",   address: "船橋市新高根1-11-4" },
  { id: "0005", gyoji: "takanedai-gyoji",     name: "高根台児童ホーム",   address: "船橋市高根台3-4-1" },
  { id: "0006", gyoji: "tsukada-gyoji",       name: "塚田児童ホーム",     address: "船橋市行田1-50-2" },
  { id: "0007", gyoji: "natsumi-gyoji",       name: "夏見児童ホーム",     address: "船橋市夏見3-15-13" },
  { id: "0008", gyoji: "narashinodai-gyoji",  name: "習志野台児童ホーム", address: "船橋市習志野台3-4-1" },
  { id: "0009", gyoji: "nishifuna-gyoji",     name: "西船児童ホーム",     address: "船橋市西船3-7-3" },
  { id: "0010", gyoji: "hasama-gyoji",        name: "飯山満児童ホーム",   address: "船橋市飯山満町2-519-1" },
  { id: "0011", gyoji: "houden-gyoji",        name: "法典児童ホーム",     address: "船橋市藤原3-2-11" },
  { id: "0012", gyoji: "maebara-jigyo",       name: "前原児童ホーム",     address: "船橋市前原東4-18-2" },
  { id: "0013", gyoji: "matsugaoka-gyoji",    name: "松が丘児童ホーム",   address: "船橋市松が丘3-31-5" },
  { id: "0014", gyoji: "misaki-gyoji",        name: "三咲児童ホーム",     address: "船橋市三咲1-8-1" },
  { id: "0015", gyoji: "miyama-gyoji",        name: "三山児童ホーム",     address: "船橋市三山6-22-1" },
  { id: "0016", gyoji: "miyamoto-gyoji",      name: "宮本児童ホーム",     address: "船橋市宮本6-18-1" },
  { id: "0017", gyoji: "motonakayama-gyoji",  name: "本中山児童ホーム",   address: "船橋市本中山2-16-2" },
  { id: "0018", gyoji: "yakigaya-gyoji",      name: "八木が谷児童ホーム", address: "船橋市八木が谷2-25-1" },
  { id: "0019", gyoji: "yakuendai-gyoji",     name: "薬円台児童ホーム",   address: "船橋市薬円台4-6-1" },
  { id: "0020", gyoji: "wakamatsu-gyoji",     name: "若松児童ホーム",     address: "船橋市若松1-2-1" },
  { id: "0021", gyoji: "tsuboi-gyoji",        name: "坪井児童ホーム",     address: "船橋市坪井東2-18-1" },
];

const CHILD_RE = /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|リトミック|ママ|パパ|マタニティ|ひろば|広場|誕生|バースデー|手形|ハイハイ|ベビーマッサージ|育児|栄養|サロン|工作|製作|ふれあい|読み聞かせ|お楽しみ|身体測定|遊ぼう|教室|交流|おはなし|絵本|紙芝居|パネルシアター|エプロンシアター|すくすく|産後|抱っこ|体操|測定|相談|講座|ペープサート|マジック|コンサート|人形劇|映画|よちよち|とことこ|にこにこ|ぺったん|おもちゃ|クラブ/;

const SKIP_RE = /休館|閉館|お休み|利用案内|令和\d|月号|だより|発行|開館|カレンダー|振替休|中\s*高\s*生|メディア利用|ランチタイム|自由来館|児童ホームのご案内/;
const JUNK_RE = /^[\d\s\-～〜:：（）()、。,.]+$|^.{0,2}$|日時|場所|対象|定員|持ち物|申込|受付|TEL|FAX|問い合わせ|http|www\.|^\d+月|令和|発行|開館|年度|案内|注意|お知らせ|利用|交通/;

/**
 * 行事ページからPDFリンクを抽出（最新2件まで）
 */
function extractPdfLinksFromGyoji(html, gyojiUrl) {
  const links = [];
  const re = /<a\s+[^>]*href="([^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    // 相対パス解決: "./kaijin-gyoji_d/fil/1803.pdf" → 絶対URL
    if (href.startsWith("./") && gyojiUrl) {
      const base = gyojiUrl.substring(0, gyojiUrl.lastIndexOf("/") + 1);
      href = base + href.substring(2);
    } else if (href.startsWith("//")) {
      href = `https:${href}`;
    } else if (!href.startsWith("http")) {
      href = `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    }
    const linkText = m[2].replace(/<[^>]+>/g, "").trim();
    links.push({ url: href, linkText });
  }
  return links.slice(0, 2); // 最新2件（当月+先月）
}

/**
 * PDFマークダウンからイベントを抽出
 */
function parseFunabashiPdf(text, defaultY, defaultMo) {
  const events = [];
  const normalized = normalizeJaDigits(text.normalize("NFKC"))
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(日|月|時)/g, "$1$2")
    .replace(/(\d)\s*[：:]\s*(\d)/g, "$1:$2");

  // 年月推定: "N月号" を優先（"N月発行" は発行月で内容月ではない）
  let y = defaultY;
  let mo = defaultMo;
  const gouMatch = normalized.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*号/);
  const ymMatch = !gouMatch && normalized.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  const reiwaMatch = !gouMatch && !ymMatch && normalized.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月/);
  if (gouMatch) {
    y = 2018 + Number(gouMatch[1]);
    mo = Number(gouMatch[2]);
  } else if (ymMatch) {
    y = Number(ymMatch[1]);
    mo = Number(ymMatch[2]);
  } else if (reiwaMatch) {
    y = 2018 + Number(reiwaMatch[1]);
    mo = Number(reiwaMatch[2]);
  }

  const lines = normalized.split(/\n/);
  let currentTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^>/.test(line)) continue;
    if (SKIP_RE.test(line)) continue;

    // ## 見出し → タイトル候補
    if (/^#+\s+/.test(line)) {
      const t = line.replace(/^#+\s+/, "").replace(/^[●★◆◎☆■♪♫♥♡申◇]\s*/, "").trim();
      if (t.length >= 3 && t.length <= 40 && !JUNK_RE.test(t)) {
        currentTitle = t;
      }
      continue;
    }

    // ● ★ ◎ 記号で始まるタイトル
    const bulletMatch = line.match(/^[●★◆◎☆■♪♫♥♡申◇]\s*(.{3,40})/);
    if (bulletMatch) {
      const t = bulletMatch[1].replace(/[「」]/g, "").trim();
      if (!JUNK_RE.test(t)) {
        currentTitle = t;
      }
    }

    // 日付パターン: M月D日(曜) or D日(曜)
    const dateRe = /(?:(\d{1,2})月\s*)?(\d{1,2})\s*日\s*[（(]\s*([月火水木金土日])\s*[）)]/g;
    let dm;
    while ((dm = dateRe.exec(line)) !== null) {
      const evMo = dm[1] ? Number(dm[1]) : mo;
      const d = Number(dm[2]);
      if (d < 1 || d > 31 || evMo < 1 || evMo > 12) continue;

      const beforeDate = line.substring(0, dm.index).replace(/^[●★◆◎☆■♪♫♥♡申◇#\s]+/, "").trim();
      const isMetaLabel = /^(日\s*時|場\s*所|対\s*象|定\s*員|申\s*込|申し込み|受付|持ち物|講\s*師)\s*[:：]?\s*$/.test(beforeDate);
      let title = (!isMetaLabel && beforeDate.length >= 3 && beforeDate.length <= 40 && !JUNK_RE.test(beforeDate))
        ? beforeDate : currentTitle;
      if (!title) continue;

      // 時刻抽出
      const afterDate = line.substring(dm.index + dm[0].length);
      const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : "";
      const combinedAfter = afterDate + " " + nextLine;
      const timeMatch = combinedAfter.match(/(\d{1,2}):(\d{2})[～〜~\-](\d{1,2}):(\d{2})/);
      const startMatch = !timeMatch && combinedAfter.match(/(\d{1,2}):(\d{2})/);
      const timeRange = timeMatch ? {
        startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
        endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
      } : startMatch ? {
        startHour: Number(startMatch[1]), startMin: Number(startMatch[2]),
        endHour: null, endMin: null,
      } : null;

      events.push({ y, mo: evMo, d, title, timeRange });
    }
  }
  return events;
}

function createCollectFunabashiJidohomeEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectFunabashiJidohomeEvents(maxDays) {
    const source = FUNABASHI_SOURCE;
    const srcKey = `ward_${source.key}`;
    const label = "船橋市児童ホーム";

    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const currentYear = jst.getUTCFullYear();
    const currentMonth = jst.getUTCMonth() + 1;

    // 全施設の行事ページをバッチ取得してPDFリンクを発見
    const gyojiTargets = [];
    const GYOJI_BATCH = 5;
    for (let i = 0; i < FACILITIES.length; i += GYOJI_BATCH) {
      const batch = FACILITIES.slice(i, i + GYOJI_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (facility) => {
          const gyojiUrl = `${BASE_URL}/shisetsu/kosodatesien/0005/${facility.id}/0002/${facility.gyoji}.html`;
          const html = await fetchText(gyojiUrl);
          const pdfs = extractPdfLinksFromGyoji(html, gyojiUrl);
          return pdfs.map(pdf => ({ ...pdf, facility, gyojiUrl }));
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") gyojiTargets.push(...r.value);
      }
    }

    if (gyojiTargets.length === 0) {
      console.log(`[${label}] 0 PDF links found`);
      return [];
    }

    // PDFをバッチ取得してパース
    const allEvents = [];
    const PDF_BATCH = 3;
    for (let i = 0; i < gyojiTargets.length; i += PDF_BATCH) {
      const batch = gyojiTargets.slice(i, i + PDF_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (target) => {
          const markdown = await fetchChiyodaPdfMarkdown(target.url);
          if (!markdown || markdown.length < 50) return [];
          const parsed = parseFunabashiPdf(markdown, currentYear, currentMonth);
          return parsed.map(ev => ({
            ...ev,
            facility: target.facility,
            pdfUrl: target.url,
            gyojiUrl: target.gyojiUrl,
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
      console.log(`[${label}] 0 events collected (${gyojiTargets.length} PDFs fetched)`);
      return [];
    }

    // 子育てフィルタ + 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!CHILD_RE.test(ev.title)) continue;
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

      let geoCandidates = [`千葉県${venueAddress}`, `千葉県船橋市 ${venueName}`];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("千葉県") ? fmAddr : `千葉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `船橋市 ${venueName}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:jidohome:${ev.facility.id}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: source.label,
        title: `${ev.title}（${venueName}）`,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: ev.gyojiUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from ${gyojiTargets.length} PDFs)`);
    return results;
  };
}

module.exports = { createCollectFunabashiJidohomeEvents };
