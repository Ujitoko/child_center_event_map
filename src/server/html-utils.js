const { normalizeText, sanitizeVenueText, hasConcreteAddressToken } = require("./text-utils");

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&rsquo;/gi, "\u2019")
    .replace(/&lsquo;/gi, "\u2018")
    .replace(/&rdquo;/gi, "\u201D")
    .replace(/&ldquo;/gi, "\u201C")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const cp = parseInt(hex, 16);
      return cp > 0 && cp <= 0x10FFFF ? String.fromCodePoint(cp) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const cp = parseInt(dec, 10);
      return cp > 0 && cp <= 0x10FFFF ? String.fromCodePoint(cp) : "";
    });
}

function stripTags(html) {
  return decodeHtmlEntities(
    String(html || "")
      .replace(/<script[\s>][\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s>][\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
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
  const venueKeyRe = /(会場|開催場所|実施場所|場所|ところ|会場名|施設名|名称)/;
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

  // h2/h3/h4 見出しパターン: 「場所」「会場」「ところ」の直後テキスト
  if (!venue) {
    const headingRe = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
    while ((m = headingRe.exec(html)) !== null) {
      const heading = stripTags(m[1]).trim();
      if (/(場所|会場|開催場所|ところ)/.test(heading)) {
        const afterHeading = html.slice(m.index + m[0].length, m.index + m[0].length + 500);
        const blockMatch = afterHeading.match(/<(?:p|div)[^>]*>([\s\S]*?)<\/(?:p|div)>/i);
        const nextText = blockMatch
          ? stripTags(blockMatch[1]).trim()
          : stripTags(afterHeading).trim().split(/\n/)[0].trim();
        if (nextText && nextText.length >= 2 && nextText.length <= 60) {
          venue = nextText;
          break;
        }
      }
    }
  }

  return { venue, address };
}

module.exports = {
  decodeHtmlEntities,
  parseAnchors,
  parseDetailMeta,
  stripTags,
};
