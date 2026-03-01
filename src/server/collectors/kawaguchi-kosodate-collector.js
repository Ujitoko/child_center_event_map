/**
 * 川口市 子育てサポートプラザ / 子育てひろばポッポ PDFコレクター
 *
 * WordPress サイト (kosodate-kwgc-saitama-ksp.jp) の
 * ニュース一覧ページからPDFリンクを抽出し、
 * 「だより」PDF（隔月発行の施設ニュースレター）をパースしてイベントを抽出する。
 */
const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { normalizeJaDigits } = require("../text-utils");
const { KAWAGUCHI_SOURCE } = require("../../config/wards");

const SITE_BASE = "https://kosodate-kwgc-saitama-ksp.jp";

const FACILITIES = [
  {
    id: "plaza",
    name: "子育てサポートプラザ",
    pageUrl: `${SITE_BASE}/plaza/`,
    address: "川口市本町3-6-30",
    dayoriKeyword: "プラザだより",
  },
  {
    id: "poppo",
    name: "子育てひろばポッポ",
    pageUrl: `${SITE_BASE}/poppo/`,
    address: "川口市里1650-1",
    dayoriKeyword: "ポッポだより",
  },
];

const SKIP_RE = /休館|お休み|閉館|駐車場|利用停止|空き状況|年末年始|ありました|ありません/;
const EVENT_TITLE_RE = /サロン|コンサート|講座|教室|相談|測定|カホン|リトミック|マッサージ|体操|ヨガ|遊ぼう|あそぼう|工作|製作|読み聞かせ|映画|お話|サークル|ひろば|広場|はっぴー|すまいる|タイム|パパ|ママ|お父さん|ベビー|赤ちゃん|離乳食|栄養|歯科|育児|手形|誕生|バースデー|おもちゃ|ふれあい|おはなし|絵本|クラブ|子育て|親子|音楽|ダンス/;
const JUNK_RE = /^[\d\s\-～〜:：（）()、。,.]+$|^.{0,2}$|お知らせ|ご案内|だより|月号|発行|ください|お問い合わせ|TEL|FAX|http|www\.|駐車場|年末年始|利用停止/;

/**
 * ニュースページからPDFリンクを抽出
 * HTMLパターン: <a href="*.pdf">タイトル</a>
 */
function extractPdfLinks(html, facility) {
  const links = [];
  const re = /<a\s+[^>]*href="([^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/g, "&");
    if (!href.startsWith("http")) {
      href = href.startsWith("/") ? `${SITE_BASE}${href}` : `${SITE_BASE}/${href}`;
    }
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    if (SKIP_RE.test(title)) continue;
    const isDayori = title.includes(facility.dayoriKeyword);
    links.push({ url: href, title, isDayori });
  }
  return links;
}

/**
 * PDFマークダウンからイベントを抽出
 * だよりPDF: カレンダー形式の月間スケジュール
 * イベントPDF: 単発イベントの詳細チラシ
 */
function parseDayoriPdf(text, defaultY, defaultMo) {
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
      const t = line.replace(/^#+\s+/, "").replace(/^[●★◆◎☆■♪]\s*/, "").trim();
      if (t.length >= 3 && t.length <= 40 && !JUNK_RE.test(t) && EVENT_TITLE_RE.test(t)) {
        currentTitle = t;
      }
      continue;
    }

    // ● ★ 記号で始まるタイトル
    const bulletMatch = line.match(/^[●★◆◎☆■♪]\s*(.{3,40})/);
    if (bulletMatch) {
      const t = bulletMatch[1].trim();
      if (!JUNK_RE.test(t) && EVENT_TITLE_RE.test(t)) {
        currentTitle = t;
      }
    }

    // プレーンテキストのタイトル候補（日時:等の行でなく、日付パターンを含まない行）
    if (!bulletMatch && !/^#+/.test(line)
        && !/^日\s*時|^場\s*所|^対\s*象|^定\s*員|^申\s*込|^持ち物|^受付|^講\s*師|^〒|^TEL|^FAX|^MAIL|^HP|^※|^✿|^✉/.test(line)) {
      const plainTitle = line.replace(/^[●★◆◎☆■♪#\s\d○✿]+/, "").replace(/[「」『』]/g, "").replace(/\s*[（(].*$/, "").trim();
      if (plainTitle.length >= 4 && plainTitle.length <= 30 && !JUNK_RE.test(plainTitle)
          && EVENT_TITLE_RE.test(plainTitle)
          && !/\d+[日月時]/.test(plainTitle) && !/社会福祉|法人|協議会|利用登録|行事カレンダー|年度|開室|開所|テーマ|ありました|ありません|おまちして/.test(plainTitle)) {
        currentTitle = plainTitle;
      }
    }

    // 日付パターン: M月D日(曜)
    const dateRe = /(?:(\d{1,2})月\s*)?(\d{1,2})\s*日\s*[（(]\s*([月火水木金土日])\s*[）)]/g;
    let dm;
    while ((dm = dateRe.exec(line)) !== null) {
      const evMo = dm[1] ? Number(dm[1]) : defaultMo;
      const d = Number(dm[2]);
      if (d < 1 || d > 31 || evMo < 1 || evMo > 12) continue;

      // タイトル: 日付前のテキスト or currentTitle
      const beforeDate = line.substring(0, dm.index).replace(/^[●★◆◎☆■♪#\s]+/, "").trim();
      const isMetaLabel = /^(日\s*時|場\s*所|対\s*象|定\s*員|申\s*込|申し込み|受付|持ち物|講\s*師)\s*[:：]?\s*$/.test(beforeDate);
      let title = (!isMetaLabel && beforeDate.length >= 3 && beforeDate.length <= 40 && !JUNK_RE.test(beforeDate))
        ? beforeDate : currentTitle;
      if (!title || !EVENT_TITLE_RE.test(title)) continue;

      // 時刻抽出
      const afterDate = line.substring(dm.index + dm[0].length);
      const timeMatch = afterDate.match(/(\d{1,2}):(\d{2})[～〜~\-](\d{1,2}):(\d{2})/);
      const timeRange = timeMatch ? {
        startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
        endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
      } : null;

      events.push({ y: defaultY, mo: evMo, d, title, timeRange });
    }

    // スラッシュ日付: M/D(曜)
    const slashRe = /(\d{1,2})\/(\d{1,2})\s*[（(]\s*([月火水木金土日])\s*[）)]/g;
    let sm;
    while ((sm = slashRe.exec(line)) !== null) {
      const evMo = Number(sm[1]);
      const d = Number(sm[2]);
      if (d < 1 || d > 31 || evMo < 1 || evMo > 12) continue;
      const beforeDate = line.substring(0, sm.index).replace(/^[●★◆◎☆■♪#\s]+/, "").trim();
      const isMetaLabel2 = /^(日\s*時|場\s*所|対\s*象|定\s*員|申\s*込|申し込み|受付|持ち物|講\s*師)\s*[:：]?\s*$/.test(beforeDate);
      let title = (!isMetaLabel2 && beforeDate.length >= 3 && beforeDate.length <= 40 && !JUNK_RE.test(beforeDate))
        ? beforeDate : currentTitle;
      if (!title || !EVENT_TITLE_RE.test(title)) continue;
      events.push({ y: defaultY, mo: evMo, d, title, timeRange: null });
    }
  }
  return events;
}

/**
 * 単発イベントPDFからイベントを抽出
 */
function parseEventPdf(text, linkTitle, defaultY) {
  const events = [];
  const normalized = normalizeJaDigits(text.normalize("NFKC"))
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+(日|月|時)/g, "$1$2")
    .replace(/(\d)\s*[：:]\s*(\d)/g, "$1:$2");

  // タイトル: linkTitleを使用（HTML実体参照を除去）
  const title = linkTitle
    .replace(/&#x[0-9a-fA-F]+;/g, "")
    .replace(/を開催します[★⭐♪♡]*$/, "")
    .replace(/[「」⭐★♪♡]/g, "")
    .trim();
  if (!title || title.length < 3) return events;

  // 日時行から日付抽出: M月D日(曜) or M月D日 曜
  const dateRe = /(\d{1,2})月\s*(\d{1,2})日\s*(?:[（(]\s*([月火水木金土日])\s*[）)]|([月火水木金土日])\s)/g;
  let dm;
  while ((dm = dateRe.exec(normalized)) !== null) {
    const mo = Number(dm[1]);
    const d = Number(dm[2]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;

    const afterDate = normalized.substring(dm.index + dm[0].length, dm.index + dm[0].length + 200);
    const timeMatch = afterDate.match(/(\d{1,2}):(\d{2})[～〜~\-](\d{1,2}):(\d{2})/);
    const startMatch = !timeMatch && afterDate.match(/(\d{1,2}):(\d{2})/);
    const timeRange = timeMatch ? {
      startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
      endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
    } : startMatch ? {
      startHour: Number(startMatch[1]), startMin: Number(startMatch[2]),
      endHour: null, endMin: null,
    } : null;

    events.push({ y: defaultY, mo, d, title, timeRange });
  }
  return events;
}

function createCollectKawaguchiKosodateEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectKawaguchiKosodateEvents(maxDays) {
    const source = KAWAGUCHI_SOURCE;
    const srcKey = `ward_${source.key}`;
    const label = "川口市子育てプラザ";

    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const currentYear = jst.getUTCFullYear();
    const currentMonth = jst.getUTCMonth() + 1;

    const allEvents = [];

    for (const facility of FACILITIES) {
      let html;
      try {
        html = await fetchText(facility.pageUrl);
      } catch (e) {
        console.warn(`[${label}] ${facility.name} page fetch failed:`, e.message || e);
        continue;
      }

      const pdfLinks = extractPdfLinks(html, facility);
      if (pdfLinks.length === 0) continue;

      // だよりPDFを優先（最新の1つ）
      const dayoriLink = pdfLinks.find(l => l.isDayori);
      // イベントPDF（最新5件まで）
      const eventLinks = pdfLinks.filter(l => !l.isDayori && EVENT_TITLE_RE.test(l.title)).slice(0, 5);

      const pdfTargets = [];
      if (dayoriLink) pdfTargets.push({ ...dayoriLink, type: "dayori" });
      for (const el of eventLinks) pdfTargets.push({ ...el, type: "event" });

      for (const target of pdfTargets) {
        try {
          const markdown = await fetchChiyodaPdfMarkdown(target.url);
          if (!markdown || markdown.length < 50) continue;

          let events;
          if (target.type === "dayori") {
            // だよりPDFから月推定
            const moMatch = markdown.match(/(\d{1,2})\s*[・&]\s*(\d{1,2})\s*月号/);
            const months = moMatch ? [Number(moMatch[1]), Number(moMatch[2])] : [currentMonth];
            for (const mo of months) {
              const y = mo >= 4 && currentMonth < 4 ? currentYear - 1 : currentYear;
              const parsed = parseDayoriPdf(markdown, y, mo);
              for (const ev of parsed) {
                ev.facility = facility;
                ev.pdfUrl = target.url;
              }
              events = parsed;
              allEvents.push(...events);
            }
          } else {
            events = parseEventPdf(markdown, target.title, currentYear);
            for (const ev of events) {
              ev.facility = facility;
              ev.pdfUrl = target.url;
            }
            allEvents.push(...events);
          }
        } catch (e) {
          console.warn(`[${label}] ${facility.name} PDF failed (${target.url}):`, e.message || e);
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
    const uniqueEvents = Array.from(uniqueMap.values());

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = ev.facility.name;
      const venueAddress = ev.facility.address;

      let geoCandidates = [`埼玉県${venueAddress}`, `埼玉県川口市 ${venueName}`];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `川口市 ${venueName}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:kosodate:${ev.facility.id}:${ev.title}:${ev.dateKey}`;
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
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectKawaguchiKosodateEvents };
