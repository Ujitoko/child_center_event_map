const { normalizeText, sanitizeVenueText, hasConcreteAddressToken } = require("./text-utils");

function stripTags(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAnchors(html, baseUrl) {
  const out = [];
  const re = /<a([^>]*?)href=(["'])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = `${m[1] || ""} ${m[4] || ""}`;
    const hrefRaw = String(m[3] || "").replace(/&amp;/g, "&").trim();
    if (!hrefRaw || hrefRaw.startsWith("#") || /^javascript:/i.test(hrefRaw)) continue;
    let abs = "";
    try {
      abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, baseUrl).toString();
    } catch {
      continue;
    }
    const innerText = normalizeText(stripTags(m[5]));
    const titleAttr =
      normalizeText((attrs.match(/\btitle=(["'])(.*?)\1/i) || [])[2] || "") ||
      normalizeText((attrs.match(/\baria-label=(["'])(.*?)\1/i) || [])[2] || "");
    const text = innerText || titleAttr;
    out.push({ url: abs, text });
  }
  return out;
}

function parseDetailMeta(html) {
  let venue = "";
  let address = "";
  const venueKeyRe = /(会場|開催場所|実施場所|場所|会場名|施設名|名称)/;
  const looksLikeVenue = (textRaw) => {
    const text = sanitizeVenueText(textRaw);
    if (!text) return false;
    if (/(小学生|中学生|高校生|未就学|乳幼児|親子|どなたでも|区内在住|在勤|在学)/.test(text)) return false;
    if (/(児童館|児童センター|児童会館|子ども|こども|ひろば|プラザ|会館|センター|図書館|学習センター|学校|公園|ホール|未来館|館)/.test(text))
      return true;
    return hasConcreteAddressToken(text);
  };

  const rowRe = /<tr[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const k = stripTags(m[1]);
    const v = stripTags(m[2]);
    if (!k || !v) continue;
    if (!venue && venueKeyRe.test(k) && (k !== "名称" || looksLikeVenue(v))) venue = v;
    if (!address && /(住所|所在地)/.test(k)) address = v;
  }

  if (!venue || !address) {
    const dlRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    while ((m = dlRe.exec(html)) !== null) {
      const k = stripTags(m[1]);
      const v = stripTags(m[2]);
      if (!k || !v) continue;
      if (!venue && venueKeyRe.test(k) && (k !== "名称" || looksLikeVenue(v))) venue = v;
      if (!address && /(住所|所在地)/.test(k)) address = v;
    }
  }

  return { venue, address };
}

module.exports = {
  parseAnchors,
  parseDetailMeta,
  stripTags,
};
