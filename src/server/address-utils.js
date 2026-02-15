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
  if (key === "arakawa" && /荒川[二2]丁目2番3号|荒川2-2-3/.test(addr)) return true;
  if (key === "sumida" && /吾妻橋[一1]丁目23番20号|吾妻橋1-23-20/.test(addr)) return true;
  if (key === "taito" && /東上野4丁目5番6号|東上野4-5-6/.test(addr)) return true;
  if (key === "koto" && /東陽4丁目11番28号|東陽4-11-28/.test(addr)) return true;
  if (key === "chiyoda" && /九段南1[丁-]2[番-]1号?|九段南一丁目2番1号/.test(addr)) return true;
  if (key === "minato" && /芝公園[一1]丁目5番25号|芝公園1-5-25/.test(addr)) return true;
  if (key === "toshima" && /南池袋2丁目45番1号|南池袋2-45-1/.test(addr)) return true;
  if (key === "shinagawa" && /広町2丁目1番36号|広町2-1-36/.test(addr)) return true;
  if (key === "meguro" && /上目黒[二2]丁目19番15号|上目黒2-19-15/.test(addr)) return true;
  if (key === "suginami" && /阿佐谷南1丁目15番1号|阿佐谷南1-15-1/.test(addr)) return true;
  if (key === "kita" && /王子本町1丁目15番22号|王子本町1-15-22/.test(addr)) return true;
  if (key === "itabashi" && /板橋2丁目66番1号|板橋2-66-1/.test(addr)) return true;
  if (key === "edogawa" && /中央[一1]丁目4番1号|中央1-4-1/.test(addr)) return true;
  if (key === "nakano" && /中野[四4]丁目(?:8番1号|11番19号)|中野4-(?:8-1|11-19)/.test(addr)) return true;
  if (key === "chofu" && /小島町2丁目35番(?:地)?1号?|小島町2-35-1/.test(addr)) return true;
  if (key === "musashino" && /緑町2丁目2番28号|緑町2-2-28/.test(addr)) return true;
  if (key === "tachikawa" && /泉町1156/.test(addr)) return true;
  if (key === "akishima" && /田中町1丁目17番1号|田中町1-17-1/.test(addr)) return true;
  if (key === "higashiyamato" && /中央3-930/.test(addr)) return true;
  if (key === "kiyose" && /中里5-842/.test(addr)) return true;
  if (key === "tama" && /関戸6丁目12番1号|関戸6-12-1/.test(addr)) return true;
  if (key === "inagi" && /東長沼2111/.test(addr)) return true;
  if (key === "hino" && /神明1丁目12番1号|神明1-12-1/.test(addr)) return true;
  if (key === "kokubunji" && /戸倉1丁目6番1号|戸倉1-6-1/.test(addr)) return true;
  if (key === "higashikurume" && /本町3丁目3番1号|本町3-3-1/.test(addr)) return true;
  if (key === "fuchu" && /宮西町2丁目24番地|宮西町2-24/.test(addr)) return true;
  if (key === "koganei" && /本町6丁目6番3号|本町6-6-3/.test(addr)) return true;
  if (key === "nishitokyo" && /南町[五5]丁目6番13号|南町5-6-13|田無町[四4]丁目15番11号|田無町4-15-11|中町[一1]丁目(?:5番1号|6番8号)|中町1-(?:5-1|6-8)/.test(addr)) return true;
  if (key === "machida" && /森野2丁目2番22号|森野2-2-22/.test(addr)) return true;
  if (key === "fussa" && /本町5/.test(addr)) return true;
  if (key === "musashimurayama" && /本町[一1]丁目1番(?:地の)?1号?|本町1-1-1/.test(addr)) return true;
  if (key === "akiruno" && /二宮350/.test(addr)) return true;
  if (key === "komae" && /和泉本町[一1]丁目1番5号|和泉本町1-1-5/.test(addr)) return true;
  if (key === "mitaka" && /野崎1丁目1番1号|野崎1-1-1/.test(addr)) return true;
  if (key === "kodaira" && /小川町2丁目1333|小川町2-1333/.test(addr)) return true;
  if (key === "higashimurayama" && /本町1丁目2番3号|本町1-2-3/.test(addr)) return true;
  if (key === "kunitachi" && /富士見台[二2]丁目47番1号|富士見台2-47-1/.test(addr)) return true;
  if (key === "ome" && /東青梅1丁目11番1号|東青梅1-11-1/.test(addr)) return true;
  if (key === "hamura" && /緑ヶ丘5丁目2番1号|緑ヶ丘5-2-1/.test(addr)) return true;
  return false;
}

module.exports = {
  extractTokyoAddress,
  extractWardAddressFromText,
  isLikelyWardOfficeAddress,
};
