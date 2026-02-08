function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function clipByFieldDelimiter(textRaw) {
  const text = normalizeText(textRaw);
  if (!text) return "";
  const m = text.match(
    /\s*(?:\u7533\u3057\u8fbc\u307f|\u304a\u7533\u3057\u8fbc\u307f|\u7533\u8fbc|\u7533\u8fbc\u307f|\u554f\u3044\u5408\u308f\u305b|\u554f\u5408\u305b|\u96fb\u8a71|\u30e1\u30fc\u30eb|\u8cbb\u7528|\u6599\u91d1|\u6301\u3061\u7269|\u8b1b\u5e2b|\u5bfe\u8c61|\u5b9a\u54e1|\u30db\u30fc\u30e0\u30da\u30fc\u30b8|URL|https?:\/\/)/i
  );
  if (!m || m.index === undefined || m.index <= 0) return text;
  return normalizeText(text.slice(0, m.index));
}

function normalizeJaDigits(text) {
  return String(text || "")
    .replace(/[\uFF10-\uFF19]/g, (ch) => String(ch.charCodeAt(0) - 0xff10))
    .replace(/\uFF1A/g, ":");
}

module.exports = {
  clipByFieldDelimiter,
  normalizeJaDigits,
  normalizeText,
};
