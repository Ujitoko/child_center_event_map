const { fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { normalizeJaDigits } = require("../text-utils");

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|おはなし|絵本|紙芝居|リトミック|ママ|パパ|マタニティ|ひろば|誕生|手形|ハイハイ|読み語り|お祝い|ツインズ|デビュー|発育|救命|座談|講座|講習|測定|相談|プレママ|プレパパ|避難訓練|0歳児/;

const FACILITIES = {
  sole: { name: "子育て支援センター ソーレ", address: "東松山市松本町1-7-37" },
  mare: { name: "子育て支援センター マーレ", address: "東松山市元宿2-24-4" },
};

/**
 * PDF数字・記号周りの空白を正規化
 */
function normalizePdfSpaces(text) {
  return text
    .replace(/(\d)\s*[：:]\s*(\d)/g, "$1:$2")
    .replace(/(\d)\s*[～〜~-]\s*(\d)/g, "$1~$2");
}

/**
 * 行事予定表PDFをパース
 * 形式: "D 曜日 EVENT HH:MM~HH:MM [EVENT2 HH:MM~HH:MM]"
 * 継続行（日付なし）: "EVENT HH:MM~HH:MM"
 */
function parseGyoujiPdf(text, y, mo) {
  const events = [];
  const lines = text.split(/\n/);
  let currentDay = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // ヘッダー行・メタデータ行をスキップ
    if (/^日\s+曜日|^Title:|^URL |^Published|^Number|^Markdown/.test(line)) continue;
    // 詳細セクション（2ページ目）に入ったら終了
    if (/^##\s+東松山市|^##\s+20\d{2}|^#\s+\d+\s*月/.test(line)) break;

    // 日付行: "D 曜日 ..." (1-2桁数字 + スペース + 曜日)
    const dayMatch = line.match(/^(\d{1,2})\s+([日月火水木金土])\s+(.*)/);
    if (dayMatch) {
      currentDay = Number(dayMatch[1]);
      const rest = dayMatch[3];
      extractEventsFromText(rest, y, mo, currentDay, events);
      continue;
    }

    // 継続行（日付なし、前の日と同じ日）
    if (currentDay > 0 && /\d{1,2}:\d{2}/.test(line)) {
      extractEventsFromText(line, y, mo, currentDay, events);
    }
  }
  return events;
}

/**
 * テキストからイベント名+時刻ペアを抽出
 * "EVENT1 HH:MM~HH:MM  EVENT2 HH:MM~HH:MM"
 */
function extractEventsFromText(text, y, mo, d, events) {
  // 時刻パターンの位置をすべて特定（"10:30~11:00" or "10:30 ~" or "10:30~"）
  const timeRe = /(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})?/g;
  const timeMatches = [];
  let m;
  while ((m = timeRe.exec(text)) !== null) {
    timeMatches.push({ index: m.index, end: timeRe.lastIndex, start: m[1], endTime: m[2] || null });
  }
  if (timeMatches.length === 0) return;

  // 各時刻パターンの前のテキストがイベント名
  for (let i = 0; i < timeMatches.length; i++) {
    const prevEnd = i > 0 ? timeMatches[i - 1].end : 0;
    const titleText = text.substring(prevEnd, timeMatches[i].index)
      .replace(/^[☆★＊*◎●\s]+/, "")
      .trim();
    if (!titleText || titleText.length < 2) continue;
    const [sh, sm] = timeMatches[i].start.split(":").map(Number);
    const endParts = timeMatches[i].endTime ? timeMatches[i].endTime.split(":").map(Number) : [null, null];
    events.push({
      y, mo, d, title: titleText,
      timeRange: { startHour: sh, startMin: sm, endHour: endParts[0], endMin: endParts[1] },
    });
  }
}

function createCollectHigashimatsuyamaKosodateEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectHigashimatsuyamaKosodateEvents(maxDays) {
    const source = deps.source || {
      key: "higashimatsuyama", label: "東松山市",
      baseUrl: "https://comaam.jp",
      center: { lat: 36.0424, lng: 139.3990 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 当月 + 来月のPDFを取得
    const months = [
      { y: currentYear, mo: currentMonth },
    ];
    if (currentMonth < 12) {
      months.push({ y: currentYear, mo: currentMonth + 1 });
    } else {
      months.push({ y: currentYear + 1, mo: 1 });
    }

    const allEvents = [];
    for (const { y, mo } of months) {
      const ym = `${y}${String(mo).padStart(2, "0")}`;
      const pdfUrl = `https://comaam.jp/solemare/${ym}gyoujiyotei.pdf`;

      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 50) continue;
        // 404検出
        if (/not found|404|page not found/i.test(markdown.substring(0, 200))) continue;

        const normalized = normalizePdfSpaces(normalizeJaDigits(markdown.normalize("NFKC")));
        const events = parseGyoujiPdf(normalized, y, mo);
        allEvents.push(...events);
      } catch (e) {
        console.warn(`[${label}] PDF ${ym} failed:`, e.message || e);
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 子育てフィルタ + 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!CHILD_RE.test(ev.title)) continue;
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 施設判定: ソーレとマーレの判定が難しいため、デフォルトでソーレ
    const defaultFacility = FACILITIES.sole;

    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = defaultFacility.name;
      const venueAddress = defaultFacility.address;

      let geoCandidates = [`埼玉県${venueAddress}`, `埼玉県東松山市 ${venueName}`];
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
      const id = `${srcKey}:pdf:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: "https://comaam.jp/solemare/",
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (PDF)`);
    return results;
  };
}

module.exports = { createCollectHigashimatsuyamaKosodateEvents };
