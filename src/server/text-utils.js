function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clipByFieldDelimiter(textRaw) {
  const text = normalizeText(textRaw);
  if (!text) return "";
  const m = text.match(
    /\s*(?:\u7533\u3057\u8fbc\u307f|\u304a\u7533\u3057\u8fbc\u307f|\u7533\u8fbc|\u7533\u8fbc\u307f|\u554f\u3044\u5408\u308f\u305b|\u554f\u5408\u305b|\u96fb\u8a71|\u30e1\u30fc\u30eb|\u8cbb\u7528|\u6599\u91d1|\u6301\u3061\u7269|\u8b1b\u5e2b|\u5bfe\u8c61|\u5b9a\u54e1|\u65e5\u6642|\u30db\u30fc\u30e0\u30da\u30fc\u30b8|URL|https?:\/\/)/i
  );
  if (!m || m.index === undefined || m.index <= 0) return text;
  return normalizeText(text.slice(0, m.index));
}

function normalizeJaDigits(text) {
  return String(text || "")
    .replace(/[\uFF10-\uFF19]/g, (ch) => String(ch.charCodeAt(0) - 0xff10))
    .replace(/\uFF1A/g, ":");
}

function sanitizeVenueText(value) {
  let text = clipByFieldDelimiter(value).replace(/https?:\/\/\S+/gi, "");
  text = text
    .replace(/\s*組織詳細へ\s*/g, " ")
    .replace(/\s*(?:ページ番号|法人番号)[:：]?\s*[0-9\-]+\s*/gi, " ")
    .replace(/\s*FAX[:：]?\s*0\d{1,4}[-ー－]\d{1,4}[-ー－]\d{3,4}.*/i, " ");
  text = normalizeText(text);
  // Reject "このページは X が担当しています" template (墨田区 etc.)
  if (/^このページは\s/.test(text)) return "";
  // Strip leading bracket wrappers: 【...】 → keep only inner content
  const bracketInner = text.match(/^【([^】]+)】/);
  if (bracketInner) text = bracketInner[1];
  // Strip lone leading bracket characters
  text = text.replace(/^[【「『]\s*/, "");
  // Truncate at postal code, phone, or navigation boilerplate
  text = text.replace(/\s*〒\d{3}[-ー－]\d{4}.*/, "");
  text = text.replace(/\s*〒\d{3}\s*[-ー－]\s*\d{4}.*/, "");
  text = text.replace(/\s*〒\d{3}\s+\d{4}.*/, "");
  text = text.replace(/\s*☎\d{3,4}.*/, "");
  text = text.replace(/\s*☎.*/, "");
  text = text.replace(/\s*PDF形式のファイルを開くには.*/, "");
  // Truncate at （注）/（注釈）/（注意） (江戸川区, 豊島区)
  text = text.replace(/\s*[（(]注[）)釈意].*/, "");
  // Truncate at （外部サイト）/（外部リンク） (台東区)
  text = text.replace(/\s*[（(]外部(?:サイト|リンク)[）)].*/, "");
  // Truncate at 【住所】 or parenthesized "住所:" content
  text = text.replace(/\s*【住所】.*/, "");
  text = text.replace(/\s*[（(]住所[:：].*/, "");
  // Truncate at parenthesized addresses: （東京都X区...） or （X区Y丁目...）
  text = text.replace(/\s*[（(](?:東京都)?[^\s（）()]{2,8}区[^\s（）()]{2,}[0-9０-９丁目番号][^）)]*[）)].*/, "");
  // Truncate at parenthesized date ranges: （令和N年...) or （20XX年...)
  text = text.replace(/\s*[（(](?:令和\d+年|20\d{2}年)\d{1,2}月.*/, "");
  // Truncate at parenthesized descriptions: （無料で...) etc.
  text = text.replace(/[（(](?:無料|有料|予約|申込|当日|詳細|参加)[^）)]{0,80}[）)].*/, "");
  // Truncate at schedule/activity info after facility name
  text = text.replace(/\s+(?:時間|活動期間|活動時間|開催日|内容|職員が)[:：].*/, "");
  // Truncate after "当日は" or descriptive content following venue
  text = text.replace(/\s+当日は[、,].*/, "");
  // Truncate at "大きなスクリーンで" etc. (description after room name)
  text = text.replace(/\s+大きな.*/, "");
  // Truncate at numbered venue sub-items: "1、集会室..." or "1．豊洲..."
  text = text.replace(/\s+\d+[、．.]\s*(?:集会室|.*(?:令和|20\d{2})).*/, "");
  // Truncate at "に変更となりました" after facility
  text = text.replace(/に変更となりました.*/, "");
  // Truncate "集合、" followed by more location/description (meeting point pattern)
  text = text.replace(/集合[、,]\s*[^\s]{1,}.*/, "集合");
  text = normalizeText(text);
  if (/厚生文化会館/.test(text)) text = "厚生文化会館";
  // Reject venue starting with ★
  if (/^★/.test(text)) return "";
  // Truncate "ホール N年生の部" schedule text (文京区 pattern)
  if (/^ホール\s+(?:\d+年生|職員|大きな)/.test(text)) text = "ホール";
  // Reject venue starting with year (performer bios like "1997年、新日本フィル...")
  if (/^\d{4}年[、,]/.test(text)) return "";
  // Reject venue starting with month+day (schedule text like "9月20日(土曜日)...")
  if (/^\d{1,2}月\d{1,2}日/.test(text)) return "";
  // Reject venue starting with ・ (list items like "・ゆいの森あらかわ ...")
  if (/^・/.test(text)) return "";
  // Reject descriptions/explanatory text mistaken as venue
  if (/^(?:協定を結んで|観察場所|集合場所|コース[:：]|令和\d+年\d+月\d+日|・20\d{2}年)/.test(text)) return "";
  // Reject text that looks like generic description, not a venue
  if (/^(?:子育ての「|演劇・|区内小・中|対象児童|当日は、|今回は、)/.test(text)) return "";
  if (/^(?:子\s*\(\s*こ\s*\)|文京区\s*\()/.test(text)) return "";
  // Reject ward policy/fund descriptions
  if (/^(?:[^\s]{2,6}区では)/.test(text)) return "";
  // Reject performer bios (starts with place + university/organization)
  if (/^(?:lixにて|の人財開発部|中野区出身)/.test(text)) return "";
  // Reject "現地集合現地解散" etc. with マイページ
  if (/くわしくは.*(?:マイページ|ページ)/.test(text)) return "";
  // Truncate at performer/artist info after venue name (中野区 pattern)
  text = text.replace(/\s+(?:ヴァイオリン|ピアノ|チェロ|フルート|ギター)\s+[^\s]{1,10}氏\s.*/, "");
  // If text starts with a facility name followed by address/admin content, extract just the facility
  const facilityPat = "(?:児童館|児童センター|児童会館|子ども交流館|交流館|子ども家庭支援センター|子育て支援センター|すこやか福祉センター|福祉センター|住区センター|区民センター|区民活動センター|文化センター|子育てひろば|子ども・子育てプラザ|子育てプラザ|こどもプラザ|わんぱくひろば|ひろば|プラザ|図書館|学習センター|コミュニティセンター|保育園|保健センター|ホール|体育館|会館|未来館|公園|スポーツセンター|キャンパス|小学校|ぼたん苑|公会堂|キッズパーク|区役所|推進センター)";
  const leadingFacility = text.match(new RegExp(`^([^\\s　]{1,40}${facilityPat})`, "u"));
  if (leadingFacility) {
    const after = text.slice(leadingFacility[0].length);
    if (/^(?:\s+(?:東京都|[^\s]{2,6}区|[0-9０-９]|〒|☎|TEL|FAX|★|※|住所|練馬|:03|ねりま|2階|3階|[0-9０-９]+階)|[（(](?:東京都|ホール|[^\s]{2,6}区))/.test(after)) {
      text = leadingFacility[1];
    }
  }
  // Remove duplicate facility names: "X X" → "X"
  const dupMatch = text.match(/^(.{4,40})\s+\1$/u);
  if (dupMatch) text = dupMatch[1];
  if (/(部|課|係|担当|組織)/.test(text)) {
    const facilityTail = text.match(
      /([^\s　]{1,40}(?:児童館|児童センター|児童会館|厚生文化会館|未来館|図書館|学習センター|プラザ|ひろば))/u
    );
    if (facilityTail) text = facilityTail[1];
  }
  // Reject audience/eligibility text used as venue
  if (/^(?:小学|小・中|中学|高校|未就学|乳幼児|[0-9０-９]+歳)/.test(text) && /(?:年生|以上|以下|対象|保護者|※)/.test(text)) return "";
  // Reject long descriptions that don't look like venue names (no facility keyword)
  if (text.length > 50 && !new RegExp(facilityPat).test(text)) return "";
  if (!text) return "";
  if (text.length > 90) text = normalizeText(text.slice(0, 90));
  return text;
}

function sanitizeGeoQueryText(value) {
  let text = normalizeJaDigits(normalizeText(value));
  if (!text) return "";
  text = text
    .replace(/〒\s*\d{3}\s*-\s*\d{4}/g, " ")
    .replace(/\s*(?:電話|tel|お問い合わせ|問い合わせ|問合せ|対象|定員|費用|料金|持ち物|URL|https?:\/\/).*/i, "")
    .replace(/[（(](?:注|※|対象|定員|費用|料金|持ち物|問い合わせ|問合せ)[^）)]{0,80}[）)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > 120) text = normalizeText(text.slice(0, 120));
  return text;
}

function sanitizeAddressText(value) {
  let text = clipByFieldDelimiter(value).replace(/https?:\/\/\S+/gi, "");
  text = normalizeText(text);
  if (!text) return "";
  text = text.replace(/郵便番号\s*/g, "");
  if (/(ページ番号|法人番号|copyright|&copy;|PC版を表示する|スマートフォン版を表示する)/i.test(text)) return "";
  if (text.length > 140) text = normalizeText(text.slice(0, 140));
  if (/^\d{3}\s*-\s*\d{4}$/.test(text)) return "";
  if (/^(?:東京都)?[^\s\u3000]{2,8}区\s*\d{3}\s*-\s*\d{4}$/u.test(text)) return "";
  if (!/(都|道|府|県|区|市|町|村|丁目|番地?|号|\d{1,4}-\d{1,4})/.test(text)) return "";
  return text;
}

function hasConcreteAddressToken(value) {
  const text = normalizeText(value);
  if (!text) return false;
  if (/(ページ番号|郵便番号|法人番号|copyright|&copy;|PC版|スマートフォン版)/i.test(text)) return false;
  return /([0-9０-９]{1,4}\s*[-ー－]\s*[0-9０-９]{1,4}(?:\s*[-ー－]\s*[0-9０-９]{1,4})?|丁目|番地|[0-9０-９]{1,4}番(?:[0-9０-９]{1,4})?号?)/.test(text);
}

function normalizeJapaneseEraYears(textRaw) {
  const text = String(textRaw || "");
  return text
    .replace(/令和\s*([0-9]{1,2})年/g, (_, n) => `${2018 + Number(n)}年`)
    .replace(/平成\s*([0-9]{1,2})年/g, (_, n) => `${1988 + Number(n)}年`);
}

function scoreJapaneseText(textRaw) {
  const text = String(textRaw || "");
  const jaChars = text.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.length || 0;
  const dateMarkers = text.match(/[年月日時分]/g)?.length || 0;
  const friendMarkers = (text.match(/フレンズ/g) || []).length;
  const brokenMarkers = (text.match(/[\uFFFD]/g) || []).length;
  return jaChars + dateMarkers * 3 + friendMarkers * 10 - brokenMarkers * 2;
}

module.exports = {
  clipByFieldDelimiter,
  hasConcreteAddressToken,
  normalizeJaDigits,
  normalizeJapaneseEraYears,
  normalizeText,
  sanitizeAddressText,
  sanitizeGeoQueryText,
  sanitizeVenueText,
  scoreJapaneseText,
};
