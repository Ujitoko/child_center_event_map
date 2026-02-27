/**
 * 飯塚市 子育て支援センター イベントコレクター
 * https://www.city.iizuka.lg.jp/hoiku/kenko/kosodate/shien/calendar/top.html
 *
 * 5支援センター（街なか子育てひろば, 筑穂, 庄内, 頴田, 穂波）の月間スケジュール。
 * トップページから月別ページリンクを取得し、HTMLテーブルをパースする。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE = "https://www.city.iizuka.lg.jp";
const TOP_PATH = "/hoiku/kenko/kosodate/shien/calendar/top.html";

const KNOWN_FACILITIES = {
  "街なか子育てひろば": "福岡県飯塚市吉原町6-1 よかもん通り",
  "筑穂子育て支援センター": "福岡県飯塚市長尾1456-1 筑穂保健福祉総合センター",
  "庄内子育て支援センター": "福岡県飯塚市綱分1181-2 庄内保健福祉総合センター",
  "頴田子育て支援センター": "福岡県飯塚市鹿毛馬1667-1 頴田保健福祉センター",
  "穂波子育て支援センター": "福岡県飯塚市忠隈523 穂波福祉総合センター",
};

function createIizukaKosodateCollector({ source }, geoDeps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = geoDeps;

  /** トップページから月別ページURLを抽出 */
  function parseTopPage(html) {
    const links = [];
    const re = /href="(\/hoiku\/kenko\/kosodate\/shien\/calendar\/\d{4}\.html)"/g;
    let m;
    while ((m = re.exec(html)) !== null) links.push(BASE + m[1]);
    return links;
  }

  /** <h1> から月を、<p id="tmp_update"> から年を抽出 */
  function parseYearMonth(html) {
    const moM = html.match(/子育て支援センター(\d{1,2})月のイベント/);
    const mo = moM ? parseInt(moM[1], 10) : null;
    // tmp_update: "更新日：2026年2月20日"
    const yrM = html.match(/更新日：(\d{4})年/);
    let y = yrM ? parseInt(yrM[1], 10) : new Date().getFullYear();
    // 年度境界: 更新年が12月で月が1-3月なら翌年
    if (mo && mo <= 3 && yrM) {
      const updateMo = html.match(/更新日：\d{4}年(\d{1,2})月/);
      if (updateMo && parseInt(updateMo[1], 10) >= 10) y += 1;
    }
    return { y, mo };
  }

  /** 月別ページからイベントを抽出 */
  function parseMonthPage(html, y, mo) {
    const events = [];
    // コンテンツ部分を取得
    const contentM = html.match(/<div id="tmp_contents">([\s\S]*?)(?:<div id="tmp_|<\/body)/i);
    if (!contentM) return events;
    const content = contentM[1];

    // h2/h3/table をトークン化
    const tokens = [];
    const tokenRe = /<(h2|h3)[^>]*>([\s\S]*?)<\/\1>|<table[^>]*class="datatable"[^>]*>([\s\S]*?)<\/table>/gi;
    let tm;
    while ((tm = tokenRe.exec(content)) !== null) {
      if (tm[1]) {
        tokens.push({ type: tm[1].toLowerCase(), text: stripTags(tm[2]).trim() });
      } else if (tm[3] !== undefined) {
        tokens.push({ type: "table", raw: tm[3] });
      }
    }

    let currentCenter = "";
    let currentEventName = "";
    let currentVenue = "";

    for (const tok of tokens) {
      if (tok.type === "h2") {
        currentCenter = tok.text.replace(/\s+/g, "");
        continue;
      }
      if (tok.type === "h3") {
        // "イベント名：場所[会場名]" or "イベント名：[会場名]"
        const raw = tok.text;
        const sepIdx = raw.search(/[：:]/);
        if (sepIdx >= 0) {
          currentEventName = raw.slice(0, sepIdx).trim();
          // 会場: [...] or ［...］ の中身
          const venueM = raw.match(/[[\[［](.*?)[]\]］]/);
          currentVenue = venueM ? stripTags(venueM[1]).replace(/[・]/g, " ").trim().split(/\s+/)[0] : "";
        } else {
          currentEventName = raw.trim();
          currentVenue = "";
        }
        continue;
      }
      if (tok.type === "table") {
        // ヘッダーチェック: 支援センター名を含む連絡先テーブルはスキップ
        if (/支援センター名/.test(tok.raw)) continue;
        // ヘッダーチェック: 日にち/時間/内容 のテーブルのみ処理
        if (!/日にち/.test(tok.raw)) continue;

        const rows = [];
        const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let tr;
        while ((tr = trRe.exec(tok.raw)) !== null) rows.push(tr[1]);

        let pendingTime = null;
        let pendingContent = null;
        let pendingRowspan = 0;

        for (let ri = 0; ri < rows.length; ri++) {
          const row = rows[ri];
          // ヘッダー行をスキップ
          if (/<th[\s>]/i.test(row) || /class="bg_red"/i.test(row)) continue;

          const cells = [];
          const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
          let td;
          while ((td = tdRe.exec(row)) !== null) cells.push(td);

          if (cells.length === 0) continue;

          let dayNum = null;
          let timeText = null;
          let contentText = null;

          if (cells.length >= 3) {
            // 通常行: 日にち, 時間, 内容
            dayNum = parseDay(cells[0][1]);
            timeText = stripTags(cells[1][1]).trim();
            contentText = stripTags(cells[2][1]).trim();
            // rowspan チェック
            const rsM = cells[1][0].match(/rowspan="(\d+)"/i);
            if (rsM) {
              pendingRowspan = parseInt(rsM[1], 10) - 1;
              pendingTime = timeText;
              pendingContent = contentText;
            } else {
              pendingRowspan = 0;
            }
          } else if (cells.length === 1 && pendingRowspan > 0) {
            // rowspan 継続行: 日にちのみ
            dayNum = parseDay(cells[0][1]);
            timeText = pendingTime;
            contentText = pendingContent;
            pendingRowspan--;
          } else {
            continue;
          }

          if (!dayNum || !mo) continue;

          const title = currentEventName || contentText || "";
          const timeRange = parseTimeRangeFromText(timeText || "");
          const { startsAt, endsAt, timeUnknown } = buildStartsEndsForDate({ y, mo, d: dayNum }, timeRange);
          const venueName = currentVenue || currentCenter;

          events.push({
            title: title.replace(/\s+/g, " ").slice(0, 200),
            starts_at: startsAt,
            ends_at: endsAt,
            time_unknown: timeUnknown,
            venue_name: venueName,
            center: currentCenter,
            description: contentText || "",
          });
        }
      }
    }
    return events;
  }

  function parseDay(html) {
    const m = stripTags(html).match(/(\d{1,2})日/);
    return m ? parseInt(m[1], 10) : null;
  }

  return async function collectIizukaKosodateEvents(days) {
    const results = [];
    try {
      const topHtml = await fetchText(BASE + TOP_PATH);
      if (!topHtml) return results;
      const monthUrls = parseTopPage(topHtml);
      if (monthUrls.length === 0) return results;

      for (const url of monthUrls) {
        let html;
        try { html = await fetchText(url); } catch { continue; }
        if (!html) continue;

        const { y, mo } = parseYearMonth(html);
        if (!y || !mo) continue;

        const rawEvents = parseMonthPage(html, y, mo);
        for (const ev of rawEvents) {
          if (!inRangeJst(y, mo, null, days)) {
            // 月単位の範囲チェック (大まかに)
            const evDate = new Date(ev.starts_at);
            const now = new Date();
            const diffDays = (evDate - now) / 86400000;
            if (diffDays < -1 || diffDays > days) continue;
          }

          const dateKey = ev.starts_at.slice(0, 10);
          const id = `${source.key}:${url}:${ev.title}:${dateKey}`;
          const venueName = ev.venue_name;

          // アドレス解決
          let address = KNOWN_FACILITIES[ev.center] || KNOWN_FACILITIES[venueName] || "";
          if (!address) {
            address = await resolveEventAddress(source.key, venueName, null) || "";
          }

          // ジオコード
          let point = null;
          if (address) {
            point = await resolveEventPoint(source.key, venueName, address, null);
            if (!point) {
              const geo = await geocodeForWard(address, source);
              point = geo || null;
            }
          }

          results.push({
            id,
            source: source.key,
            title: ev.title,
            starts_at: ev.starts_at,
            ends_at: ev.ends_at,
            time_unknown: ev.time_unknown,
            venue_name: venueName,
            address,
            point,
            url,
          });
        }
      }
    } catch (e) {
      console.error(`[${source.key}] error:`, e.message);
    }
    console.log(`[${source.key}] collected ${results.length} events`);
    return results;
  };
}

module.exports = { createIizukaKosodateCollector };
