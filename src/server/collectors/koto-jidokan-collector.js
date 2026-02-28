const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const { parseYmdFromJst } = require("../date-utils");
const { KOTO_SOURCE } = require("../../config/wards");

const BASE = "https://www.city.koto.lg.jp";

// 区立児童館 kosodate.html ページ (乳幼児向けプログラム)
const JIDOKAN_PAGES = [
  { code: "281050", name: "森下児童館", path: "/281050/kodomo/hokago/jidokan/kosodate.html", address: "江東区森下3-14-6" },
  { code: "281053", name: "豊洲児童館", path: "/281053/kodomo/hokago/jidokan/kosodate.html", address: "江東区豊洲4-10-4" },
  { code: "281054", name: "辰巳児童館", path: "/281054/kodomo/hokago/jidokan/kosodate.html", address: "江東区辰巳1-1-36" },
  { code: "281055", name: "東陽児童館", path: "/281055/kosodate.html", address: "江東区東陽5-16-13" },
  { code: "281056", name: "亀戸第三児童館", path: "/281056/kosodate.html", address: "江東区亀戸7-39-9" },
  { code: "281057", name: "大島児童館", path: "/281057/kodomo/hokago/jidokan/kosodate.html", address: "江東区大島7-28-1" },
  { code: "281058", name: "大島第二児童館", path: "/281058/kodomo/hokago/jidokan/kosodate.html", address: "江東区大島4-5-1" },
  { code: "281061", name: "東砂第二児童館", path: "/281061/kodomo/hokago/jidokan/kosodate.html", address: "江東区東砂2-13-13" },
  { code: "281062", name: "南砂児童館", path: "/281062/kodomo/hokago/jidokan/kosodate.html", address: "江東区南砂2-3-17" },
];

/**
 * 江東区児童館 kosodate.html から乳幼児向けイベントを収集
 * HTML構造: h2/h3 見出しでプログラム区切り、【日時】【対象】【場所】ブラケット記法
 * 個別日付: "N日（曜日）「イベント名」" パターン
 */
function createCollectKotoJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, getFacilityAddressFromMaster } = deps;
  const source = KOTO_SOURCE;
  const label = "江東区児童館";
  const srcKey = `ward_${source.key}`;

  return async function collectKotoJidokanEvents(maxDays) {
    const nowJst = parseYmdFromJst(new Date());
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    const allEvents = [];

    // 全児童館ページを並列取得
    const pages = await Promise.allSettled(
      JIDOKAN_PAGES.map(async (jd) => {
        const url = `${BASE}${jd.path}`;
        try {
          const html = await fetchText(url);
          return { jd, html, url };
        } catch (e) {
          console.warn(`[${label}] ${jd.name} fetch failed:`, e.message || e);
          return null;
        }
      })
    );

    for (const p of pages) {
      if (p.status !== "fulfilled" || !p.value) continue;
      const { jd, html, url } = p.value;

      const events = parseKosodatePage(html, jd, url, todayStr, endStr);
      allEvents.push(...events);
    }

    // 重複除去
    const seen = new Set();
    const unique = [];
    for (const ev of allEvents) {
      const key = `${ev.venue}:${ev.title}:${ev.dateKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(ev);
    }

    // ジオコーディング
    const geocoded = [];
    for (const ev of unique) {
      let point = null;
      const candidates = [];
      if (ev.address) {
        candidates.push(`東京都${ev.address}`);
      }
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, ev.venue);
        if (fmAddr) candidates.unshift(/東京都/.test(fmAddr) ? fmAddr : `東京都${fmAddr}`);
      }
      candidates.push(`東京都江東区 ${ev.venue}`);
      point = await geocodeForWard(candidates.slice(0, 5), source);
      point = resolveEventPoint(source, ev.venue, point, ev.address || `${label} ${ev.venue}`);

      geocoded.push({
        id: `${srcKey}:${ev.url}:${ev.title}:${ev.dateKey.replace(/-/g, "")}`,
        source: srcKey,
        source_label: source.label,
        title: ev.title,
        starts_at: ev.startsAt,
        ends_at: ev.endsAt,
        venue_name: ev.venue,
        address: ev.address || "",
        url: ev.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    console.log(`[${label}] ${geocoded.length} events collected from ${JIDOKAN_PAGES.length} facilities`);
    return geocoded;
  };
}

/**
 * kosodate.html ページをパースしてイベントリストを返す
 */
function parseKosodatePage(html, jd, pageUrl, todayStr, endStr) {
  const now = parseYmdFromJst(new Date());
  let baseYear;
  const updateMatch = html.match(/更新日[：:]?\s*(\d{4})年(\d{1,2})月/);
  if (updateMatch) {
    baseYear = parseInt(updateMatch[1]);
  } else {
    baseYear = now.y;
  }

  // ページ全体から月コンテキストを検出
  // パターン1: "N月の乳幼児プログラム" → 単一月ページ
  const text = stripTags(html);
  const singleMonthMatch = text.match(/(\d{1,2})月の(?:乳幼児|にゅうようじ)/);
  // パターン2: 複数月混在ページ（南砂等） → 各ブロックで月を検出
  const pageMonth = singleMonthMatch ? parseInt(singleMonthMatch[1]) : null;

  const events = [];
  const blocks = splitByHeadings(html);

  for (const block of blocks) {
    const heading = stripTags(block.heading).replace(/\s+/g, " ").trim();
    if (!heading) continue;
    // 見出しからイベントカテゴリ名を抽出
    let baseName = heading
      .replace(/^\d{1,2}月\s*/, "") // 先頭の月を除去 ("3月 ママチャレンジ..." → "ママチャレンジ...")
      .replace(/^「|」$/g, "")
      .replace(/[（(][^）)]*[）)]/g, "")
      .trim();
    if (!baseName) continue;
    if (/^年齢別プログラム$|^お知らせ$|^アクセス$|^利用案内$|^利用方法$|^インターネット|連絡先|開館時間|休館日/.test(baseName)) continue;

    // ブロック内の月を検出: 見出し or 本文の "N月" パターン
    const bodyText = stripTags(block.body);
    const blockText = heading + " " + bodyText;
    let blockMonth = pageMonth;
    if (!blockMonth) {
      const headMonthMatch = heading.match(/^(\d{1,2})月/);
      if (headMonthMatch) {
        blockMonth = parseInt(headMonthMatch[1]);
      } else {
        // 本文中のN月N日パターンから月を推定
        const bodyMonthMatch = blockText.match(/(\d{1,2})月\s*\d{1,2}日/);
        if (bodyMonthMatch) blockMonth = parseInt(bodyMonthMatch[1]);
      }
    }
    if (!blockMonth) continue;
    let year = baseYear;
    if (blockMonth <= 2 && now.mo >= 11) year = baseYear + 1;
    const monthStr = `${year}-${String(blockMonth).padStart(2, "0")}`;

    // 個別日付行から日付+活動名を抽出
    const dayEvents = [];
    const paragraphs = bodyText.split(/\n/);
    for (const para of paragraphs) {
      const dayRe = /(\d{1,2})日[（(][^）)]+[）)]/g;
      const days = [];
      let dm;
      while ((dm = dayRe.exec(para)) !== null) {
        const d = parseInt(dm[1]);
        if (d >= 1 && d <= 31) days.push(d);
      }
      if (days.length === 0) continue;
      const actMatch = para.match(/[「『]([^」』]+)[」』]/);
      const activity = actMatch ? actMatch[1].trim() : "";
      for (const day of days) {
        const dateKey = `${monthStr}-${String(day).padStart(2, "0")}`;
        if (dateKey < todayStr || dateKey > endStr) continue;
        const title = activity ? `${baseName} ${activity}` : baseName;
        dayEvents.push({ day, dateKey, title });
      }
    }

    // 【日時】から単一日付を抽出 (パターンB)
    const jijiMatch = bodyText.match(/【日時】\s*(\d{1,2})日[（(][^）)]+[）)]\s*(\d{1,2})時(\d{0,2})分?[～〜~](\d{1,2})時(\d{0,2})分?/);
    if (jijiMatch && dayEvents.length === 0) {
      const day = parseInt(jijiMatch[1]);
      const dateKey = `${monthStr}-${String(day).padStart(2, "0")}`;
      if (dateKey >= todayStr && dateKey <= endStr) {
        const sh = parseInt(jijiMatch[2]);
        const sm = jijiMatch[3] ? parseInt(jijiMatch[3]) : 0;
        const eh = parseInt(jijiMatch[4]);
        const em = jijiMatch[5] ? parseInt(jijiMatch[5]) : 0;
        dayEvents.push({
          day, dateKey, title: baseName,
          startTime: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
          endTime: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`,
        });
      }
    }

    // 【日時】にN日のみ (パターンC)
    if (dayEvents.length === 0) {
      const jijiDayMatch = bodyText.match(/【日時】\s*(\d{1,2})日/);
      if (jijiDayMatch) {
        const day = parseInt(jijiDayMatch[1]);
        const dateKey = `${monthStr}-${String(day).padStart(2, "0")}`;
        if (dateKey >= todayStr && dateKey <= endStr) {
          dayEvents.push({ day, dateKey, title: baseName });
        }
      }
    }

    // 時間を抽出 (ブロック共通)
    const timeMatch = bodyText.match(/(\d{1,2})時(\d{0,2})分?\s*[～〜~]\s*(\d{1,2})時(\d{0,2})分?/);

    for (const de of dayEvents) {
      const startTime = de.startTime || (timeMatch ? `${String(parseInt(timeMatch[1])).padStart(2, "0")}:${timeMatch[2] ? String(parseInt(timeMatch[2])).padStart(2, "0") : "00"}` : null);
      const endTime = de.endTime || (timeMatch ? `${String(parseInt(timeMatch[3])).padStart(2, "0")}:${timeMatch[4] ? String(parseInt(timeMatch[4])).padStart(2, "0") : "00"}` : null);

      const startsAt = startTime
        ? `${de.dateKey}T${startTime}:00+09:00`
        : `${de.dateKey}T00:00:00+09:00`;
      const endsAt = endTime
        ? `${de.dateKey}T${endTime}:00+09:00`
        : null;

      events.push({
        title: de.title,
        venue: jd.name,
        address: jd.address,
        dateKey: de.dateKey,
        startsAt,
        endsAt,
        url: pageUrl,
      });
    }
  }

  return events;
}

/**
 * HTML を h2/h3 見出しで分割
 */
function splitByHeadings(html) {
  const blocks = [];
  const headingRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  const headings = [];
  let hm;
  while ((hm = headingRe.exec(html)) !== null) {
    headings.push({ pos: hm.index, end: hm.index + hm[0].length, heading: hm[1] });
  }

  for (let i = 0; i < headings.length; i++) {
    const bodyStart = headings[i].end;
    const bodyEnd = i + 1 < headings.length ? headings[i + 1].pos : html.length;
    blocks.push({
      heading: headings[i].heading,
      body: html.slice(bodyStart, bodyEnd),
    });
  }

  return blocks;
}

module.exports = { createCollectKotoJidokanEvents };
