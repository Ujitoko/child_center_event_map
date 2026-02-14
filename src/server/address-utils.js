const { normalizeText, normalizeJaDigits, sanitizeAddressText, hasConcreteAddressToken } = require("./text-utils");
const { stripTags } = require("./html-utils");

function extractTokyoAddress(textRaw) {
  const text = normalizeJaDigits(normalizeText(stripTags(textRaw)));
  if (!text) return "";
  const hasAddressToken = (s) => /([0-9０-９]{1,4}\s*[-ー－]\s*[0-9０-９]{1,4}|丁目|番地|号|[0-9０-９]{1,4})/.test(s);
  const tokyo = text.match(/(東京都[^\n。]{4,160})/);
  if (tokyo) {
    const addr = sanitizeAddressText(tokyo[1]);
    if (addr && hasAddressToken(addr)) return addr;
  }
  const ward = text.match(/([^\s\u3000]{2,8}区[^\n。]{4,120})/u);
  if (ward) {
    const addr = sanitizeAddressText(`東京都${ward[1]}`);
    if (addr && hasAddressToken(addr)) return addr;
  }
  return "";
}

function extractWardAddressFromText(source, textRaw) {
  const wardLabel = normalizeText(source?.label || "");
  const sourceKey = normalizeText(source?.key || "");
  const text = normalizeJaDigits(normalizeText(stripTags(textRaw)));
  if (!wardLabel || !text) return "";
  const out = [];
  const add = (raw) => {
    let normalized = String(raw || "")
      .replace(/〒\s*\d{3}\s*-\s*\d{4}/g, " ")
      .replace(/\s*0\d{1,4}-\d{1,4}-\d{3,4}.*/g, " ")
      .replace(
        /\s*(?:電話|TEL|お問い合わせ|問い合わせ|問合せ|法人番号|Copyright|copyright|&copy;|PC版を表示する|スマートフォン版を表示する|Map).*/i,
        " "
      );
    const cleaned = sanitizeAddressText(normalized);
    if (/(ページ番号|郵便番号|法人番号|copyright|&copy;|PC版|スマートフォン版)/i.test(cleaned)) return;
    if (!cleaned || !hasConcreteAddressToken(cleaned)) return;
    const addr = /東京都/.test(cleaned) ? cleaned : `東京都${cleaned}`;
    if (!addr.includes(wardLabel)) return;
    if (isLikelyWardOfficeAddress(sourceKey, addr)) return;
    if (!out.includes(addr)) out.push(addr);
  };

  const tokyoWardRe = new RegExp(`東京都\\s*${wardLabel}[^。\\n]{4,180}`, "g");
  let m;
  while ((m = tokyoWardRe.exec(text)) !== null) add(m[0]);

  const wardOnlyRe = new RegExp(`${wardLabel}[^。\\n]{4,160}`, "g");
  while ((m = wardOnlyRe.exec(text)) !== null) add(m[0]);

  const localAddrRe = /([^\s　]{1,20}(?:[0-9０-９一二三四五六七八九十]{1,3}丁目)?[0-9０-９一二三四五六七八九十]{1,4}番(?:地)?[0-9０-９一二三四五六七八九十]{1,4}号?)/g;
  while ((m = localAddrRe.exec(text)) !== null) add(`${wardLabel}${m[1]}`);

  const hyphenAddrRe = /([^\s　]{1,20}\d{1,4}\s*[-ー－]\s*\d{1,4}(?:\s*[-ー－]\s*\d{1,4})?)/g;
  while ((m = hyphenAddrRe.exec(text)) !== null) add(`${wardLabel}${m[1]}`);

  return out[0] || "";
}

function isLikelyWardOfficeAddress(sourceKey, addressRaw) {
  const addr = sanitizeAddressText(addressRaw);
  if (!addr) return false;
  const key = String(sourceKey || "");
  if (key === "setagaya" && /世田谷4丁目21番27号/.test(addr)) return true;
  if (key === "ota" && /蒲田五丁目13番14号/.test(addr)) return true;
  if (key === "nerima" && /豊玉北6丁目12番1号/.test(addr)) return true;
  if (key === "adachi" && /(中央本町1丁目17番1号|中央本町一丁目17番1号|120-8510)/.test(addr)) return true;
  if (key === "shinjuku" && /歌舞伎町1丁目4番1号|歌舞伎町1-4-1/.test(addr)) return true;
  if (key === "bunkyo" && /春日1丁目16番21号|春日1-16-21/.test(addr)) return true;
  if (key === "katsushika" && /立石5丁目13番1号|立石5-13-1/.test(addr)) return true;
  return false;
}

module.exports = {
  extractTokyoAddress,
  extractWardAddressFromText,
  isLikelyWardOfficeAddress,
};
