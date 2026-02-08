const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8787;
const PUBLIC_DIR = path.join(__dirname, "public");

const SETAGAYA_SOURCE = {
  key: "setagaya",
  label: "\u4e16\u7530\u8c37\u533a",
  baseUrl: "https://www.city.setagaya.lg.jp",
  listPath: "/cgi-bin/event_cal_multi/calendar.cgi",
  center: { lat: 35.6466, lng: 139.6531 },
};
const OTA_SOURCE = {
  key: "ota",
  label: "\u5927\u7530\u533a",
  baseUrl: "https://www.city.ota.tokyo.jp",
  center: { lat: 35.5613, lng: 139.716 },
};
const SHINAGAWA_SOURCE = {
  key: "shinagawa",
  label: "\u54c1\u5ddd\u533a",
  baseUrl: "https://www.city.shinagawa.tokyo.jp",
  center: { lat: 35.6092, lng: 139.7302 },
};
const SHIBUYA_SOURCE = {
  key: "shibuya",
  label: "\u6e0b\u8c37\u533a",
  baseUrl: "https://www.city.shibuya.tokyo.jp",
  center: { lat: 35.6618, lng: 139.7041 },
};
const SHIBUYA_NEUVOLA_BASE = "https://shibuya-city-neuvola.tokyo";
const SHIBUYA_FRIENDS_BASE = "https://friends-shibuya.com";
const MINATO_SOURCE = {
  key: "minato",
  label: "\u6e2f\u533a",
  baseUrl: "https://www.city.minato.tokyo.jp",
  center: { lat: 35.6581, lng: 139.7516 },
};
const CHIYODA_SOURCE = {
  key: "chiyoda",
  label: "\u5343\u4ee3\u7530\u533a",
  baseUrl: "https://www.city.chiyoda.lg.jp",
  center: { lat: 35.6938, lng: 139.7535 },
};
const CHUO_SOURCE = {
  key: "chuo",
  label: "\u4e2d\u592e\u533a",
  baseUrl: "https://www.city.chuo.lg.jp",
  center: { lat: 35.6664, lng: 139.772 },
};
const BUNKYO_SOURCE = {
  key: "bunkyo",
  label: "\u6587\u4eac\u533a",
  baseUrl: "https://www.city.bunkyo.lg.jp",
  center: { lat: 35.7081, lng: 139.7528 },
};
const TAITO_SOURCE = {
  key: "taito",
  label: "\u53f0\u6771\u533a",
  baseUrl: "https://www.city.taito.lg.jp",
  center: { lat: 35.7128, lng: 139.7806 },
};
const SUMIDA_SOURCE = {
  key: "sumida",
  label: "\u58a8\u7530\u533a",
  baseUrl: "https://www.city.sumida.lg.jp",
  center: { lat: 35.7107, lng: 139.8015 },
};
const KOTO_SOURCE = {
  key: "koto",
  label: "\u6c5f\u6771\u533a",
  baseUrl: "https://www.city.koto.lg.jp",
  center: { lat: 35.6731, lng: 139.817 },
};
const NAKANO_SOURCE = {
  key: "nakano",
  label: "\u4e2d\u91ce\u533a",
  baseUrl: "https://www.city.tokyo-nakano.lg.jp",
  center: { lat: 35.7074, lng: 139.6638 },
};
const SUGINAMI_SOURCE = {
  key: "suginami",
  label: "\u6749\u4e26\u533a",
  baseUrl: "https://www.city.suginami.tokyo.jp",
  center: { lat: 35.6994, lng: 139.6364 },
};
const TOSHIMA_SOURCE = {
  key: "toshima",
  label: "\u8c4a\u5cf6\u533a",
  baseUrl: "https://www.city.toshima.lg.jp",
  center: { lat: 35.7261, lng: 139.716 },
};
const KITA_SOURCE = {
  key: "kita",
  label: "\u5317\u533a",
  baseUrl: "https://www.city.kita.lg.jp",
  center: { lat: 35.752, lng: 139.7336 },
};
const ARAKAWA_SOURCE = {
  key: "arakawa",
  label: "\u8352\u5ddd\u533a",
  baseUrl: "https://www.city.arakawa.tokyo.jp",
  center: { lat: 35.7361, lng: 139.7835 },
};
const ITABASHI_SOURCE = {
  key: "itabashi",
  label: "\u677f\u6a4b\u533a",
  baseUrl: "https://www.city.itabashi.tokyo.jp",
  center: { lat: 35.7512, lng: 139.7094 },
};
const NERIMA_SOURCE = {
  key: "nerima",
  label: "\u7df4\u99ac\u533a",
  baseUrl: "https://www.city.nerima.tokyo.jp",
  center: { lat: 35.7356, lng: 139.6517 },
};
const ADACHI_SOURCE = {
  key: "adachi",
  label: "\u8db3\u7acb\u533a",
  baseUrl: "https://www.city.adachi.tokyo.jp",
  center: { lat: 35.7758, lng: 139.8045 },
};
const KATSUSHIKA_SOURCE = {
  key: "katsushika",
  label: "\u845b\u98fe\u533a",
  baseUrl: "https://www.city.katsushika.lg.jp",
  center: { lat: 35.7436, lng: 139.8472 },
};
const EDOGAWA_SOURCE = {
  key: "edogawa",
  label: "\u6c5f\u6238\u5ddd\u533a",
  baseUrl: "https://www.city.edogawa.tokyo.jp",
  center: { lat: 35.7069, lng: 139.8683 },
};
const SHINJUKU_SOURCE = {
  key: "shinjuku",
  label: "\u65b0\u5bbf\u533a",
  baseUrl: "https://www.city.shinjuku.lg.jp",
  center: { lat: 35.6938, lng: 139.7034 },
};
const MINATO_APII_URL = "https://www.city.minato.tokyo.jp/kodomo/kodomo/kodomo/shienshisetsu/apii.html";
const MINATO_ASSOCIE_FUREAI_URL = "https://associe-international.co.jp/%e6%96%bd%e8%a8%ad%e7%b4%b9%e4%bb%8b/nishiazabu_fureairoom/";
const MEGURO_SOURCE = {
  key: "meguro",
  label: "\u76ee\u9ed2\u533a",
  baseUrl: "https://www.city.meguro.tokyo.jp",
  center: { lat: 35.6415, lng: 139.6982 },
};
const SHINAGAWA_POCKET_BASE = "https://shinagawa-pocket.city-hc.jp";

const JIDOKAN_HINTS = [
  "\u5150\u7ae5",
  "\u5150\u7ae5\u9928",
  "\u5150\u7ae5\u30bb\u30f3\u30bf\u30fc",
  "\u5150\u7ae5\u4f1a\u9928",
  "\u3053\u3069\u3082\u30bb\u30f3\u30bf\u30fc",
  "\u5b50\u3069\u3082\u30bb\u30f3\u30bf\u30fc",
  "\u3053\u3069\u3082\u4f1a\u9928",
  "\u5b50\u3069\u3082\u4f1a\u9928",
  "\u5b50\u80b2\u3066\u5150\u7ae5\u3072\u308d\u3070",
  "\u5965\u6ca2\u5b50\u80b2\u3066\u5150\u7ae5\u3072\u308d\u3070",
];
const WARD_CHILD_HINT_RE =
  /(\u5150\u7ae5|\u5150\u7ae5\u9928|\u5150\u7ae5\u30bb\u30f3\u30bf\u30fc|\u5150\u7ae5\u4f1a\u9928|\u5b50\u3069\u3082|\u3053\u3069\u3082|\u5b50\u80b2\u3066|\u89aa\u5b50|\u80b2\u5150|\u4e73\u5e7c\u5150|\u4e73\u5150|\u5e7c\u5150|\u672a\u5c31\u5712|\u672a\u5c31\u5b66|\u5e7c\u7a1a\u5712|\u4fdd\u80b2\u5712|\u3053\u3069\u3082\u5712|\u5b66\u7ae5|\u5c0f\u5b66\u751f|\u4e2d\u5b66\u751f|\u8d64\u3061\u3083\u3093|\u3042\u304b\u3061\u3083\u3093|\u30d9\u30d3\u30fc|\u96e2\u4e73\u98df|\u59ca\u5a20|\u51fa\u7523|\u6bcd\u5b50|\u30d7\u30ec\u30de\u30de|\u30d1\u30d1\u30de\u30de|\u30ad\u30c3\u30ba|\u30d5\u30a1\u30df\u30ea\u30fc|\u3072\u308d\u3070|\u8aad\u307f\u805e\u304b\u305b|\u7d75\u672c|\u3042\u3063\u3074\u3043)/i;
const WARD_CHILD_URL_HINT_RE = /(kodomo|kosodate|jidokan|jido|gakudo|akachan|baby|kids|oyako|ikuji|kyoiku|hoiku|hiroba|hirobakan|fureai|family|teens|nikoniko|nerijiten)/i;

// Setagaya section IDs for children/youth facility pages.
const SETAGAYA_JIDOKAN_URL_RE = /city\.setagaya\.lg\.jp\/03(?:06[1-9]|07\d|08[0-5])\//i;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = {
  key: "",
  data: null,
  savedAt: 0,
};
const geoCache = new Map();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
    };
    res.writeHead(200, { "Content-Type": typeMap[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeJapaneseEraYears(textRaw) {
  const text = String(textRaw || "");
  return text
    .replace(/\u4ee4\u548c\s*([0-9]{1,2})\u5e74/g, (_, n) => `${2018 + Number(n)}\u5e74`)
    .replace(/\u5e73\u6210\s*([0-9]{1,2})\u5e74/g, (_, n) => `${1988 + Number(n)}\u5e74`);
}

function hasJidokanHint(text) {
  const t = normalizeText(text);
  return JIDOKAN_HINTS.some((x) => t.includes(x));
}

function toJstDate(y, m, d, hour = 10, minute = 0) {
  return new Date(Date.UTC(y, m - 1, d, hour - 9, minute, 0, 0));
}

function parseYmdFromJst(dateObj) {
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dateObj);
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d, key: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

function getMonthsForRange(maxDays) {
  const monthCount = Math.min(Math.max(Math.ceil(maxDays / 30) + 1, 1), 6);
  const now = parseYmdFromJst(new Date());
  const base = new Date(Date.UTC(now.y, now.m - 1, 1));
  const out = [];
  for (let i = 0; i < monthCount; i += 1) {
    const d = new Date(base.getTime());
    d.setUTCMonth(d.getUTCMonth() + i);
    out.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }
  return out;
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
}

function extractVenueFromTitle(title) {
  const t = String(title || "");
  const hiroba = t.match(/([^\s]{1,40}\u5b50\u80b2\u3066\u5150\u7ae5\u3072\u308d\u3070)/u);
  if (hiroba) return hiroba[1];
  const m = t.match(/([^\s]{1,40}\u5150\u7ae5\u9928)/u);
  return m ? m[1] : "\u4e16\u7530\u8c37\u533a\u5150\u7ae5\u9928";
}

function inRangeJst(y, m, d, maxDays) {
  const now = parseYmdFromJst(new Date());
  const start = toJstDate(now.y, now.m, now.d, 0, 0);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + Math.min(Math.max(maxDays, 1), 90));
  const target = toJstDate(y, m, d, 0, 0);
  return target >= start && target <= end;
}

function parseDateSpans(textRaw) {
  const text = normalizeText(textRaw).replace(/\uff0c/g, "\u3001");
  if (!text) return [];
  const spans = [];

  // yyyy蟷ｴm譛・譌･・框yyy蟷ｴm譛・譌･
  const rangeRe = /(\d{4})\u5e74\s*(\d{1,2})\u6708\s*(\d{1,2})\u65e5\s*[\uff5e\u301c\-\uff0d]\s*(\d{4})\u5e74\s*(\d{1,2})\u6708\s*(\d{1,2})\u65e5/g;
  let m;
  while ((m = rangeRe.exec(text)) !== null) {
    spans.push({
      start: { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) },
      end: { y: Number(m[4]), mo: Number(m[5]), d: Number(m[6]) },
    });
  }

  // yyyy蟷ｴm譛・譌･ (single)
  const singleRe = /(\d{4})\u5e74\s*(\d{1,2})\u6708\s*(\d{1,2})\u65e5/g;
  while ((m = singleRe.exec(text)) !== null) {
    spans.push({
      start: { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) },
      end: { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) },
    });
  }

  return spans;
}

function explodeSpanToDates(span, maxExpandDays = 180) {
  const out = [];
  const start = toJstDate(span.start.y, span.start.mo, span.start.d, 0, 0);
  const end = toJstDate(span.end.y, span.end.mo, span.end.d, 0, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return out;
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000);
  if (days > maxExpandDays) {
    out.push({ y: span.start.y, mo: span.start.mo, d: span.start.d });
    return out;
  }
  for (let i = 0; i <= days; i += 1) {
    const d = new Date(start.getTime() + i * 86400000);
    out.push({ y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate() });
  }
  return out;
}

function parseDatesFromHtml(html) {
  const out = [];
  const seen = new Set();
  const push = (y, mo, d) => {
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return;
    const key = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ y, mo, d });
  };

  let m;
  const jpRe = /(\d{4})\u5e74\s*(\d{1,2})\u6708\s*(\d{1,2})\u65e5/g;
  while ((m = jpRe.exec(html)) !== null) push(Number(m[1]), Number(m[2]), Number(m[3]));

  const slashRe = /(\d{4})\/(\d{1,2})\/(\d{1,2})/g;
  while ((m = slashRe.exec(html)) !== null) push(Number(m[1]), Number(m[2]), Number(m[3]));

  return out;
}

function stripTags(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDetailMeta(html) {
  let venue = "";
  let address = "";

  const rowRe = /<tr[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const k = stripTags(m[1]);
    const v = stripTags(m[2]);
    if (!k || !v) continue;
    if (!venue && /(\u4f1a\u5834|\u958b\u50ac\u5834\u6240|\u5b9f\u65bd\u5834\u6240|\u5834\u6240)/.test(k)) venue = v;
    if (!address && /(\u4f4f\u6240|\u6240\u5728\u5730)/.test(k)) address = v;
  }

  if (!venue || !address) {
    const dlRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
    while ((m = dlRe.exec(html)) !== null) {
      const k = stripTags(m[1]);
      const v = stripTags(m[2]);
      if (!k || !v) continue;
      if (!venue && /(\u4f1a\u5834|\u958b\u50ac\u5834\u6240|\u5b9f\u65bd\u5834\u6240|\u5834\u6240)/.test(k)) venue = v;
      if (!address && /(\u4f4f\u6240|\u6240\u5728\u5730)/.test(k)) address = v;
    }
  }

  return { venue, address };
}

async function geocodeQuery(query) {
  const q = normalizeText(query);
  if (!q) return null;
  if (geoCache.has(q)) return geoCache.get(q);
  try {
    const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      geoCache.set(q, null);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      geoCache.set(q, null);
      return null;
    }
    const c = data[0]?.geometry?.coordinates;
    if (!Array.isArray(c) || c.length < 2) {
      geoCache.set(q, null);
      return null;
    }
    const point = { lat: Number(c[1]), lng: Number(c[0]) };
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
      geoCache.set(q, null);
      return null;
    }
    geoCache.set(q, point);
    return point;
  } catch {
    geoCache.set(q, null);
    return null;
  }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function isLikelyTokyoPoint(point) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
  return point.lat >= 35.45 && point.lat <= 35.9 && point.lng >= 139.5 && point.lng <= 140.0;
}

function isNearWardCenter(point, wardCenter, maxKm) {
  if (!point || !wardCenter) return false;
  return haversineKm(point.lat, point.lng, wardCenter.lat, wardCenter.lng) <= Number(maxKm || 30);
}

function getWardGeoMaxKm(sourceKey) {
  const key = String(sourceKey || "");
  const overrides = {
    chiyoda: 8,
    chuo: 8,
    minato: 9,
    shinjuku: 9,
    bunkyo: 8,
    taito: 8,
    sumida: 9,
    koto: 10,
    shinagawa: 10,
    meguro: 9,
    ota: 12,
    setagaya: 12,
    shibuya: 9,
    nakano: 9,
    suginami: 11,
    toshima: 9,
    kita: 9,
    arakawa: 8,
    itabashi: 11,
    nerima: 12,
    adachi: 12,
    katsushika: 12,
    edogawa: 12,
  };
  return overrides[key] || 10;
}

function sanitizeWardPoint(point, sourceOrCenter, maxKmOverride) {
  if (!point) return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const normalized = { lat, lng };
  if (!isLikelyTokyoPoint(normalized)) return null;
  const center = sourceOrCenter?.center || sourceOrCenter || null;
  if (center) {
    const maxKm = Number(maxKmOverride || getWardGeoMaxKm(sourceOrCenter?.key));
    if (!isNearWardCenter(normalized, center, maxKm)) return null;
  }
  return normalized;
}

async function geocodeForWard(candidates, sourceOrCenter, maxKmOverride) {
  for (const q of candidates || []) {
    const point = await geocodeQuery(q);
    const ok = sanitizeWardPoint(point, sourceOrCenter, maxKmOverride);
    if (ok) return ok;
  }
  return null;
}

function buildGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => {
    const t = normalizeText(x);
    if (!t) return;
    if (!cands.includes(t)) cands.push(t);
  };
  if (address) {
    if (!/(\u6771\u4eac\u90fd|\u4e16\u7530\u8c37\u533a)/.test(address)) add(`\u6771\u4eac\u90fd\u4e16\u7530\u8c37\u533a${address}`);
    add(address);
  }
  if (venue) add(`\u6771\u4eac\u90fd\u4e16\u7530\u8c37\u533a${venue}`);
  if (title) add(`\u6771\u4eac\u90fd\u4e16\u7530\u8c37\u533a${extractVenueFromTitle(title)}`);
  return cands;
}

function buildOtaGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => {
    const t = normalizeText(x);
    if (!t) return;
    if (!cands.includes(t)) cands.push(t);
  };
  if (address) {
    if (!/(\u6771\u4eac\u90fd|\u5927\u7530\u533a)/.test(address)) add(`\u6771\u4eac\u90fd\u5927\u7530\u533a${address}`);
    add(address);
  }
  if (venue) add(`\u6771\u4eac\u90fd\u5927\u7530\u533a${venue}`);
  if (title) add(`\u6771\u4eac\u90fd\u5927\u7530\u533a${title}`);
  return cands;
}

function buildShinagawaGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => {
    const t = normalizeText(x);
    if (!t) return;
    if (!cands.includes(t)) cands.push(t);
  };
  if (address) {
    if (!/(\u6771\u4eac\u90fd|\u54c1\u5ddd\u533a)/.test(address)) add(`\u6771\u4eac\u90fd\u54c1\u5ddd\u533a${address}`);
    add(address);
  }
  if (venue) add(`\u6771\u4eac\u90fd\u54c1\u5ddd\u533a${venue}`);
  if (title) add(`\u6771\u4eac\u90fd\u54c1\u5ddd\u533a${title}`);
  return cands;
}

function buildMeguroGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => {
    const t = normalizeText(x);
    if (!t) return;
    if (!cands.includes(t)) cands.push(t);
  };
  if (address) {
    if (!/(\u6771\u4eac\u90fd|\u76ee\u9ed2\u533a)/.test(address)) add(`\u6771\u4eac\u90fd\u76ee\u9ed2\u533a${address}`);
    add(address);
  }
  if (venue) add(`\u6771\u4eac\u90fd\u76ee\u9ed2\u533a${venue}`);
  if (title) add(`\u6771\u4eac\u90fd\u76ee\u9ed2\u533a${title}`);
  return cands;
}

function buildShibuyaGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => {
    const t = normalizeText(x);
    if (!t) return;
    if (!cands.includes(t)) cands.push(t);
  };
  if (address) {
    if (!/(\u6771\u4eac\u90fd|\u6e0b\u8c37\u533a)/.test(address)) add(`\u6771\u4eac\u90fd\u6e0b\u8c37\u533a${address}`);
    add(address);
  }
  if (venue) add(`\u6771\u4eac\u90fd\u6e0b\u8c37\u533a${venue}`);
  if (title) add(`\u6771\u4eac\u90fd\u6e0b\u8c37\u533a${title}`);
  return cands;
}

function buildMinatoGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => {
    const t = normalizeText(x);
    if (!t) return;
    if (!cands.includes(t)) cands.push(t);
  };
  if (address) {
    if (!/\u6771\u4eac\u90fd\s*\u6e2f\u533a/.test(address)) add(`\u6771\u4eac\u90fd\u6e2f\u533a${address.replace(/^\s*\u6e2f\u533a/, "")}`);
    add(address);
  }
  if (venue) add(`\u6771\u4eac\u90fd\u6e2f\u533a${venue}`);
  if (title) add(`\u6771\u4eac\u90fd\u6e2f\u533a${title}`);
  return cands;
}

function buildOtaTags(facilityUrl, venueName, title) {
  const base = ["ota_jidokan_event"];
  const hay = `${facilityUrl || ""} ${venueName || ""} ${title || ""}`;
  if (/otakohiroba|縺翫♀縺溘▲蟄舌・繧阪・/u.test(hay)) {
    base.push("ota_otakko_hiroba");
  } else {
    base.push("ota_jidokan");
  }
  return base;
}

function parseAnchors(html, baseUrl) {
  const out = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    if (!hrefRaw || hrefRaw.startsWith("#") || /^javascript:/i.test(hrefRaw)) continue;
    let abs = "";
    try {
      abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, baseUrl).toString();
    } catch {
      continue;
    }
    out.push({ url: abs, text: normalizeText(stripTags(m[2])) });
  }
  return out;
}

function parseJpYearMonth(textRaw) {
  const text = normalizeText(textRaw);
  let m = text.match(/(\d{4})\u5e74\s*(\d{1,2})\u6708/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]) };
  m = text.match(/\u4ee4\u548c\s*(\d{1,2})\u5e74\s*(\d{1,2})\u6708/u);
  if (m) return { y: 2018 + Number(m[1]), mo: Number(m[2]) };
  const now = parseYmdFromJst(new Date());
  return { y: now.y, mo: now.m };
}

function parseShinagawaDatesFromHtml(html) {
  const dates = parseDatesFromHtml(html).slice();
  const ym = parseJpYearMonth(html);
  const add = (y, mo, d) => {
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return;
    const key = `${y}-${mo}-${d}`;
    if (!dates.some((x) => `${x.y}-${x.mo}-${x.d}` === key)) dates.push({ y, mo, d });
  };

  let m;
  const mdRe = /(\d{1,2})\u6708\s*(\d{1,2})\u65e5/g;
  while ((m = mdRe.exec(html)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    let y = ym.y;
    if (mo < ym.mo - 6) y += 1;
    add(y, mo, d);
  }
  return dates;
}

function extractShinagawaVenue(title, fallback) {
  const t = normalizeText(title);
  let m = t.match(/([^\s]{1,40}(?:\u5150\u7ae5\u30bb\u30f3\u30bf\u30fc|\u5150\u7ae5\u9928|\u5b50\u80b2\u3066\u5150\u7ae5\u3072\u308d\u3070|\u3072\u308d\u3070))/u);
  if (m) return m[1];
  m = normalizeText(fallback).match(/([^\s]{1,40}(?:\u5150\u7ae5\u30bb\u30f3\u30bf\u30fc|\u5150\u7ae5\u9928|\u3072\u308d\u3070))/u);
  if (m) return m[1];
  return "\u54c1\u5ddd\u533a\u5150\u7ae5\u30bb\u30f3\u30bf\u30fc";
}

function parseShinagawaPocketDate(textRaw) {
  const text = normalizeText(textRaw);
  const m = text.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

function normalizeJaDigits(text) {
  return String(text || "")
    .replace(/[\uFF10-\uFF19]/g, (ch) => String(ch.charCodeAt(0) - 0xff10))
    .replace(/\uFF1A/g, ":");
}

function parseTimeRangeFromText(textRaw) {
  const text = normalizeJaDigits(normalizeText(textRaw))
    .replace(/\u5348\u524D/g, "AM ")
    .replace(/\u5348\u5f8c/g, "PM ")
    .replace(/\u6642\u534a/g, ":30")
    .replace(/[\u301c\uFF5E\u30FC\uFF0D\u2212]/g, "~")
    .replace(/\u304B\u3089/g, "~");
  const to24h = (meridiem, hRaw) => {
    let h = Number(hRaw);
    if (!Number.isFinite(h)) return null;
    if (meridiem === "PM" && h < 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    if (h < 0 || h > 23) return null;
    return h;
  };
  const toMinute = (mRaw) => {
    const m = Number(mRaw || "0");
    if (!Number.isFinite(m) || m < 0 || m > 59) return null;
    return m;
  };
  const rangeRe =
    /(?:\b(AM|PM)\s*)?(\d{1,2})(\s*(?::|\u6642)\s*(\d{1,2}))?\s*(?:\u5206)?\s*(?:~|-)\s*(?:\b(AM|PM)\s*)?(\d{1,2})(\s*(?::|\u6642)\s*(\d{1,2}))?\s*(?:\u5206)?/i;
  let m = text.match(rangeRe);
  if (m) {
    const mer1 = (m[1] || "").toUpperCase();
    const mer2 = ((m[5] || "").toUpperCase()) || mer1;
    const hasTimeHint = Boolean(mer1 || mer2 || m[3] || m[7]);
    if (!hasTimeHint) return null;
    const startHour = to24h(mer1, m[2]);
    const startMinute = toMinute(m[4]);
    const endHour = to24h(mer2, m[6]);
    const endMinute = toMinute(m[8]);
    if (startHour !== null && startMinute !== null && endHour !== null && endMinute !== null) {
      return { startHour, startMinute, endHour, endMinute };
    }
  }
  const singleRe = /(?:\b(AM|PM)\s*)?(\d{1,2})(\s*(?::|\u6642)\s*(\d{1,2}))?\s*(?:\u5206)?/i;
  m = text.match(singleRe);
  if (m) {
    const mer = (m[1] || "").toUpperCase();
    const hasTimeHint = Boolean(mer || m[3]);
    if (!hasTimeHint) return null;
    const startHour = to24h(mer, m[2]);
    const startMinute = toMinute(m[4]);
    if (startHour !== null && startMinute !== null) {
      return { startHour, startMinute, endHour: null, endMinute: null };
    }
  }
  return null;
}

function buildStartsEndsForDate(d, timeRange, defaultStartHour = 10) {
  const startHour =
    timeRange && Number.isFinite(timeRange.startHour) ? Number(timeRange.startHour) : defaultStartHour;
  const startMinute =
    timeRange && Number.isFinite(timeRange.startMinute) ? Number(timeRange.startMinute) : 0;
  const startDate = toJstDate(d.y, d.mo, d.d, startHour, startMinute);
  let endIso = null;
  if (timeRange && Number.isFinite(timeRange.endHour)) {
    const endHour = Number(timeRange.endHour);
    const endMinute = Number.isFinite(timeRange.endMinute) ? Number(timeRange.endMinute) : 0;
    let endDate = toJstDate(d.y, d.mo, d.d, endHour, endMinute);
    if (endDate.getTime() < startDate.getTime()) endDate = new Date(endDate.getTime() + 86400000);
    endIso = endDate.toISOString();
  }
  return { startsAt: startDate.toISOString(), endsAt: endIso };
}

function parseShinagawaPocketDetailMeta(html) {
  const dateText = normalizeText(stripTags((html.match(/<p[^>]*class="right-align"[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || ""));
  const date = parseYmdFromJpText(dateText);
  const bodyText = normalizeJaDigits(normalizeText(stripTags((html.match(/<div[^>]*class="announcement-article"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "")));
  const text = bodyText
    .replace(/\u5348\u524D/g, "AM ")
    .replace(/\u5348\u5F8C/g, "PM ")
    .replace(/\u6642/g, ":")
    .replace(/\u5206/g, "")
    .replace(/[\u301C\uFF5E\u30FC\uFF0D\u2212]/g, "~")
    .replace(/\u304B\u3089/g, "~");
  const to24h = (meridiem, hRaw) => {
    let h = Number(hRaw);
    if (!Number.isFinite(h)) return null;
    if (meridiem === "PM" && h < 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    return h;
  };
  const rangeRe = /(?:\b(AM|PM)\s*)?(\d{1,2})(?::\s*(\d{1,2}))?\s*(?:~|-)\s*(?:\b(AM|PM)\s*)?(\d{1,2})(?::\s*(\d{1,2}))?/gi;
  let m;
  while ((m = rangeRe.exec(text)) !== null) {
    const mer1 = m[1] ? m[1].toUpperCase() : "";
    const mer2 = (m[4] ? m[4].toUpperCase() : "") || mer1;
    const startHour = to24h(mer1, m[2]);
    const startMinute = Number(m[3] || "0");
    const endHour = to24h(mer2, m[5]);
    const endMinute = Number(m[6] || "0");
    if (
      !Number.isFinite(startHour) ||
      !Number.isFinite(endHour) ||
      startHour < 0 ||
      startHour > 23 ||
      endHour < 0 ||
      endHour > 23 ||
      startMinute < 0 ||
      startMinute > 59 ||
      endMinute < 0 ||
      endMinute > 59
    ) {
      continue;
    }
    return { date, startHour, startMinute, endHour, endMinute };
  }
  return { date, startHour: null, startMinute: null, endHour: null, endMinute: null };
}

function parseYmdFromJpText(textRaw) {
  const text = normalizeJaDigits(normalizeText(textRaw));
  let m = text.match(/(\d{4})\s*\u5E74\s*(\d{1,2})\s*\u6708\s*(\d{1,2})\s*\u65E5/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  m = text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  return null;
}

function parseMonthDayFromTextWithBase(textRaw, baseY, baseMo) {
  const text = normalizeJaDigits(normalizeText(textRaw));
  const out = [];
  const re = /(\d{1,2})\s*\u6708\s*(\d{1,2})\s*\u65e5/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    if (!Number.isFinite(mo) || !Number.isFinite(d) || mo < 1 || mo > 12 || d < 1 || d > 31) continue;
    let y = baseY;
    if (mo < baseMo - 6) y += 1;
    out.push({ y, mo, d });
  }
  return out;
}

function extractSectionByH2(html, headingRegexSource) {
  const re = new RegExp(`<h2[^>]*>\\s*(?:${headingRegexSource})\\s*<\\/h2>([\\s\\S]*?)(?=<h2[^>]*>|$)`, "i");
  const m = html.match(re);
  return m ? m[1] : "";
}

function parseMeguroEventLinks(indexHtml) {
  const out = [];
  const re = /<a[^>]+href="([^"]*\/event\/[^"]+\.html[^"]*)"/gi;
  let m;
  while ((m = re.exec(indexHtml)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    if (!hrefRaw) continue;
    let abs = "";
    try {
      abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, `${MEGURO_SOURCE.baseUrl}/`).toString();
    } catch {
      continue;
    }
    if (/\/event\/index(?:\.html)?(?:\?|$)/i.test(abs)) continue;
    if (!/city\.meguro\.tokyo\.jp/i.test(abs)) continue;
    if (!out.includes(abs)) out.push(abs);
  }
  return out;
}

function extractMeguroVenueFromTitle(title) {
  const t = normalizeText(title);
  let m = t.match(/([^\s]{1,60}(?:\u5150\u7ae5\u9928|\u5150\u7ae5\u30bb\u30f3\u30bf\u30fc|\u5b50\u80b2\u3066\u5150\u7ae5\u3072\u308d\u3070))/u);
  if (m) return m[1];
  m = t.match(/([^\s]{1,60}(?:\u3072\u308d\u3070|\u4f1a\u9928))/u);
  if (m) return m[1];
  return "\u76ee\u9ed2\u533a\u5150\u7ae5\u9928";
}

function parseShibuyaIssueIdsFromYearPage(html) {
  const out = [];
  const re = /\/contents\/koho-news\/(\d{3,6})\//g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = String(m[1]);
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

function parseShibuyaKodomoPageLinks(issueHtml, issueId) {
  const out = [];
  const re = new RegExp(`/contents/koho-news/${issueId}/[^"'\\s<>]*_kodomo\\.html`, "gi");
  let m;
  while ((m = re.exec(issueHtml)) !== null) {
    const rel = String(m[0]);
    const abs = rel.startsWith("http") ? rel : `${SHIBUYA_SOURCE.baseUrl}${rel}`;
    if (!out.includes(abs)) out.push(abs);
  }
  return out;
}

function parseShibuyaBlocksFromKodomoHtml(html) {
  const mainHtml = (String(html || "").match(/<main[^>]*>([\s\S]*?)<\/main>/i) || [])[1] || String(html || "");
  const cleanedHtml = mainHtml.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = normalizeJaDigits(stripTags(cleanedHtml)).replace(/\s+/g, " ");
  const sentences = text
    .split(/[。！？]/)
    .map((x) => normalizeText(x))
    .filter(Boolean);
  const jidokanRe = /(\u5150\u7ae5\u9928|\u5b50\u80b2\u3066\u3072\u308d\u3070)/u;
  const now = parseYmdFromJst(new Date());
  const out = [];

  for (let i = 0; i < sentences.length; i += 1) {
    const prev = i > 0 ? sentences[i - 1] : "";
    const cur = sentences[i];
    const next = i + 1 < sentences.length ? sentences[i + 1] : "";
    const block = normalizeText(`${prev} ${cur} ${next}`);
    if (!jidokanRe.test(block)) continue;
    const dates = parseOtaDatesFromText(block, now.y, now.m);
    if (dates.length === 0) continue;
    const timeRange = parseTimeRangeFromText(block);
    const vm = block.match(/([^\s]{2,60}(?:\u5150\u7ae5\u9928|\u5b50\u80b2\u3066\u3072\u308d\u3070))/u);
    const venue = vm ? vm[1] : "\u6e0b\u8c37\u533a\u5150\u7ae5\u9928";
    out.push({
      title: (cur || block).slice(0, 120),
      dates,
      timeRange,
      venue_name: venue,
      address: "",
    });
  }
  return out;
}

function parseShibuyaNeuvolaArchiveRows(html, pageUrl) {
  const out = [];
  const liRe =
    /<li>\s*<span class="label">([\s\S]*?)<\/span>\s*<a href="([^"]+)">[\s\S]*?<p class="ttl">([\s\S]*?)<\/p>[\s\S]*?<p class="pubDate">([\s\S]*?)<\/p>[\s\S]*?<div class="auther">[\s\S]*?<span>([\s\S]*?)<\/span>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const label = normalizeText(stripTags(m[1]));
    const hrefRaw = String(m[2] || "").trim();
    const title = normalizeText(stripTags(m[3]));
    const pubDate = normalizeText(stripTags(m[4]));
    const author = normalizeText(stripTags(m[5]));
    if (!hrefRaw || !title) continue;
    let absUrl = "";
    try {
      absUrl = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, pageUrl).toString();
    } catch {
      continue;
    }
    out.push({ label, url: absUrl, title, pubDate, author });
  }
  return out;
}

function parseShibuyaNeuvolaDetailMeta(html) {
  const title = normalizeText(stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ""));
  const summary = (html.match(/<div class="eventSummary">([\s\S]*?)<\/div>/i) || [])[1] || "";
  const postHtml = (html.match(/<div class="postContent">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="entry">/i) || [])[1] || html;
  const postText = normalizeJaDigits(normalizeText(stripTags(postHtml)));
  const summaryText = normalizeJaDigits(normalizeText(stripTags(summary)));
  const bodyText = normalizeText(`${summaryText} ${postText}`);

  const fieldMap = new Map();
  const pRe = /<p>([\s\S]*?)<\/p>/gi;
  let p;
  while ((p = pRe.exec(summary)) !== null) {
    const line = normalizeJaDigits(normalizeText(stripTags(p[1])));
    const fm = line.match(/^([^:：・]{1,20})[:：・]\s*(.+)$/);
    if (!fm) continue;
    fieldMap.set(fm[1], fm[2]);
  }

  const dateHint =
    fieldMap.get("\u65e5\u6642") ||
    ((bodyText.match(/(?:\u958b\u50ac\u65e5\u6642|\u65e5\u6642|Date)\s*[:：・]\s*([^\n]{1,120})/i) || [])[1] || "");
  const timeHint =
    fieldMap.get("\u6642\u9593") ||
    ((bodyText.match(/(?:\u6642\u9593|Time)\s*[:：・]\s*([^\n]{1,80})/i) || [])[1] || "");
  const venueHint =
    fieldMap.get("\u958b\u50ac\u5834\u6240") ||
    fieldMap.get("\u5834\u6240") ||
    ((bodyText.match(/(?:\u958b\u50ac\u5834\u6240|\u5834\u6240)\s*[:：・]\s*([^\n]{1,80})/i) || [])[1] || "");
  const venueName = normalizeText(
    String(venueHint || "").split(/(?:\u7de0\u3081\u5207\u308a|\u4e88\u7d04\u65b9\u6cd5|\u5bfe\u8c61|\u5b9a\u54e1|\u8cbb\u7528)/)[0]
  ).slice(0, 80);

  const now = parseYmdFromJst(new Date());
  const dates = parseOtaDatesFromText(`${dateHint} ${title} ${bodyText}`, now.y, now.m);
  const timeRange = parseTimeRangeFromText(`${timeHint} ${dateHint} ${title} ${bodyText}`);
  return {
    title,
    dates,
    timeRange,
    venue_name: venueName,
    bodyText,
  };
}

function parseShibuyaFriendsArchiveRows(html, pageUrl) {
  const out = [];
  const blockRe = /<a[^>]+href="([^"]*\/friends_event\/[^"]*)"[^>]*>\s*<dl class="event_list">([\s\S]*?)<\/dl>\s*<\/a>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    const block = m[2] || "";
    if (!hrefRaw) continue;
    let url = "";
    try {
      url = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, pageUrl).toString();
    } catch {
      continue;
    }
    const title = normalizeText(
      stripTags((block.match(/<div[^>]*class="event_name"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "")
    );
    const desc = normalizeText(
      stripTags((block.match(/<div[^>]*class="event_date"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "")
    );
    const isPast = /\/images\/event\/past\.png/i.test(block);
    if (!title) continue;
    out.push({ url, title, desc, isPast });
  }
  return out;
}

function parseShibuyaFriendsDetailMeta(html) {
  const title =
    normalizeText(stripTags((html.match(/<h2[^>]*class="news_ti_h2"[^>]*>([\s\S]*?)<\/h2>/i) || [])[1] || "")) ||
    normalizeText(stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").split("|")[0]);
  const topicPath = (html.match(/<div[^>]*class="container2 txt_left"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "";
  const bodyHtml =
    (html.match(/<div[^>]*class="main content_wp"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<div class="cleardiv">/i) || [])[1] ||
    html;
  const bodyText = normalizeJaDigits(normalizeText(stripTags(bodyHtml)));
  const topicText = normalizeJaDigits(normalizeText(stripTags(topicPath)));
  const now = parseYmdFromJst(new Date());

  const topicDate = parseYmdFromJpText(topicText);
  let dates = parseOtaDatesFromText(`${title} ${bodyText}`, now.y, now.m);
  if (dates.length === 0 && topicDate) dates = [topicDate];
  const timeRange = parseTimeRangeFromText(`${title} ${bodyText}`);

  let venue_name = "\u6e0b\u8c37\u533a\u5150\u7ae5\u9752\u5c11\u5e74\u30bb\u30f3\u30bf\u30fc \u30d5\u30ec\u30f3\u30ba\u672c\u753a";
  const venueMatch = normalizeText(`${title} ${bodyText}`).match(
    /([^\s]{2,40}(?:\u5150\u7ae5\u9928|\u5150\u7ae5\u30bb\u30f3\u30bf\u30fc|\u5b50\u80b2\u3066\u652f\u63f4\u30bb\u30f3\u30bf\u30fc|\u3072\u308d\u3070|\u30d5\u30ec\u30f3\u30ba\u672c\u753a))/u
  );
  if (venueMatch) venue_name = venueMatch[1];

  return { title, dates, timeRange, venue_name, bodyText };
}

function parseMinatoListEventLinks(html, pageUrl) {
  const out = [];
  const re = /<p[^>]*class="event_item_cnt[^"]*"[^>]*>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/p>/gi;
  const listHint = WARD_CHILD_HINT_RE;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    const title = normalizeText(stripTags(m[2]));
    if (!hrefRaw || !title) continue;
    let abs = "";
    try {
      abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, pageUrl).toString();
    } catch {
      continue;
    }
    if (!/city\.minato\.tokyo\.jp/i.test(abs)) continue;
    if (!/\/(kouhou\/event|event|kodomo|kosodate|kyoiku|shienshisetsu|akasakashisetsuunei)\//i.test(abs) && !listHint.test(title))
      continue;
    out.push({ url: abs, title });
  }
  return out;
}

function parseMinatoSectionText(html, headingJa) {
  const heading = headingJa.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<h2[^>]*>\\s*${heading}\\s*<\\/h2>\\s*([\\s\\S]*?)(?=<h2[^>]*>|<div class="event_contents not_print"|<div class="box_link"|<\\/div>\\s*<\\/div>)`, "i");
  const m = html.match(re);
  return normalizeJaDigits(normalizeText(stripTags((m && m[1]) || "")));
}

function parseMinatoDetailMeta(html) {
  const title = normalizeText(stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ""));
  const dateHtml = (html.match(/<div[^>]*class="kaisai_date"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "";
  const dateText = normalizeJaDigits(normalizeText(stripTags(dateHtml)));
  const placeText = parseMinatoSectionText(html, "\u958b\u50ac\u5834\u6240");
  const detailText = parseMinatoSectionText(html, "\u30a4\u30d9\u30f3\u30c8\u8a73\u7d30");
  const targetText = parseMinatoSectionText(html, "\u5bfe\u8c61");
  const bodyText = normalizeText(`${dateText} ${placeText} ${detailText} ${targetText}`);
  const normalizedDatePayload = normalizeJapaneseEraYears(`${dateText} ${title} ${bodyText}`);
  const now = parseYmdFromJst(new Date());
  const dates = parseOtaDatesFromText(normalizedDatePayload, now.y, now.m);
  const timeRange = parseTimeRangeFromText(`${dateText} ${bodyText}`);
  const venue_name = placeText || "\u6e2f\u533a\u5150\u7ae5\u9928";
  return { title, dates, timeRange, venue_name, bodyText };
}

function parseNextDataJson(html) {
  const raw = (html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i) || [])[1] || "";
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseMinatoAssocieEvents(html, pageUrl) {
  const out = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*([\d]{4})\.([\d]{2})\.([\d]{2})<br>\s*([^<]{1,160})/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    const title = normalizeText(stripTags(m[5]));
    const y = Number(m[2]);
    const mo = Number(m[3]);
    const d = Number(m[4]);
    if (!title || !Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) continue;
    let url = pageUrl;
    try {
      url = hrefRaw ? (hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, pageUrl).toString()) : pageUrl;
    } catch {
      url = pageUrl;
    }
    out.push({
      title,
      dates: [{ y, mo, d }],
      timeRange: null,
      venue_name: "\u5b50\u3069\u3082\u3075\u308c\u3042\u3044\u30eb\u30fc\u30e0(\u897f\u9ebb\u5e03)",
      address: "",
      url,
      lat: null,
      lng: null,
      bodyText: title,
      tags: ["minato_jidokan_event", "minato_fureairoom"],
    });
  }
  return out;
}

function parseMinatoAppiiFacilityLinks(html, pageUrl) {
  const anchors = parseAnchors(html, pageUrl);
  const out = [];
  for (const a of anchors) {
    if (!/city\.minato\.tokyo\.jp/i.test(a.url)) continue;
    if (!/(shienshisetsu|appy|apii|fureairoom)/i.test(a.url)) continue;
    if (!/(\u3042\u3063\u3074\u3043|\u5b50\u3069\u3082\u3075\u308c\u3042\u3044\u30eb\u30fc\u30e0)/.test(a.text)) continue;
    if (!out.includes(a.url)) out.push(a.url);
  }
  return out.slice(0, 24);
}

function parseMinatoExternalFacilityLinks(html, pageUrl) {
  const anchors = parseAnchors(html, pageUrl);
  const out = [];
  for (const a of anchors) {
    if (/city\.minato\.tokyo\.jp/i.test(a.url)) continue;
    if (!/(nihonhoiku|associe|fureairoom|appy)/i.test(a.url)) continue;
    if (!out.includes(a.url)) out.push(a.url);
  }
  return out.slice(0, 4);
}

function parseMinatoNihonhoikuEvents(html, pageUrl) {
  const data = parseNextDataJson(html);
  const pageProps = data?.props?.pageProps || {};
  const storeName = normalizeText(
    pageProps?.content?.baseInfo?.baseInfo?.storeNameKanji?.text ||
      stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").split(/[|｜]/)[0]
  );
  const lat = Number(pageProps?.content?.baseInfo?.baseInfo?.latlng?.latitude);
  const lng = Number(pageProps?.content?.baseInfo?.baseInfo?.latlng?.longitude);

  const out = [];
  const groups = Array.isArray(pageProps?.posttypesWithPosts) ? pageProps.posttypesWithPosts : [];
  for (const g of groups) {
    const posts = Array.isArray(g?.posts) ? g.posts : [];
    for (const p of posts) {
      const title = normalizeText(p?.title || "");
      const iso = String(p?.period?.start || "").trim();
      if (!title || !iso) continue;
      const dt = new Date(iso);
      if (Number.isNaN(dt.getTime())) continue;
      const d = parseYmdFromJst(dt);
      const bodyText = normalizeText(p?.text || "");
      const timeRange = parseTimeRangeFromText(`${title} ${bodyText}`);
      const dateText = `${title} ${bodyText}`;
      const inferredDates = parseOtaDatesFromText(dateText, d.y, d.m);
      const monthHint = dateText.match(/(\d{1,2})\s*\u6708/);
      const hintedMonth = monthHint ? Number(monthHint[1]) : d.m;
      const inferredWithDayOnly = [...inferredDates];
      const dayOnlyRe = /(^|[^\d\u6708])([0-3]?\d)\s*\u65e5/g;
      let md;
      while ((md = dayOnlyRe.exec(dateText)) !== null) {
        const day = Number(md[2]);
        if (!Number.isFinite(day) || day < 1 || day > 31) continue;
        let y = d.y;
        if (hintedMonth < d.m - 6) y += 1;
        inferredWithDayOnly.push({ y, mo: hintedMonth, d: day });
      }
      const uniqDates = new Map();
      for (const x of inferredWithDayOnly) {
        const k = `${x.y}-${x.mo}-${x.d}`;
        if (!uniqDates.has(k)) uniqDates.set(k, x);
      }
      const dates = uniqDates.size ? Array.from(uniqDates.values()) : [{ y: d.y, mo: d.m, d: d.d }];
      let url = pageUrl;
      try {
        url = p?.detailLink ? (String(p.detailLink).startsWith("http") ? String(p.detailLink) : new URL(String(p.detailLink), pageUrl).toString()) : pageUrl;
      } catch {
        url = pageUrl;
      }
      out.push({
        title,
        dates,
        timeRange,
        venue_name: storeName || "\u5b50\u80b2\u3066\u3072\u308d\u3070 \u3042\u3063\u3074\u3043",
        address: "",
        url,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        bodyText,
        tags: ["minato_jidokan_event", "minato_appii"],
      });
    }
  }
  return out;
}

async function collectMinatoFacilityLinkedEvents(maxDays) {
  const raw = [];

  try {
    const associeHtml = await fetchText(MINATO_ASSOCIE_FUREAI_URL);
    raw.push(...parseMinatoAssocieEvents(associeHtml, MINATO_ASSOCIE_FUREAI_URL));
  } catch {
    // ignore
  }

  const externalLinks = new Set();
  try {
    const apiiHtml = await fetchText(MINATO_APII_URL);
    const facilityPages = parseMinatoAppiiFacilityLinks(apiiHtml, MINATO_APII_URL);
    for (const fp of facilityPages) {
      try {
        const fHtml = await fetchText(fp);
        for (const ext of parseMinatoExternalFacilityLinks(fHtml, fp)) externalLinks.add(ext);
      } catch {
        // ignore facility page failure
      }
    }
  } catch {
    // ignore
  }

  for (const ext of Array.from(externalLinks).slice(0, 24)) {
    let html = "";
    try {
      html = await fetchText(ext);
    } catch {
      continue;
    }
    if (/__NEXT_DATA__/.test(html) || /list\.nihonhoiku\.co\.jp/i.test(ext)) {
      raw.push(...parseMinatoNihonhoikuEvents(html, ext));
    } else if (/associe-international\.co\.jp/i.test(ext)) {
      raw.push(...parseMinatoAssocieEvents(html, ext));
    }
  }

  const byId = new Map();
  for (const ev of raw) {
    for (const d of ev.dates || []) {
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, ev.timeRange, 10);
      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `ward:minato:linked:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      let point = null;
      if (Number.isFinite(ev.lat) && Number.isFinite(ev.lng)) {
        point = sanitizeWardPoint({ lat: Number(ev.lat), lng: Number(ev.lng) }, MINATO_SOURCE);
      } else {
        const cands = buildMinatoGeoCandidates(ev.title, ev.venue_name, ev.address || "");
        point = await geocodeForWard(cands, MINATO_SOURCE);
      }
      if (!point) point = { ...MINATO_SOURCE.center };

      byId.set(id, {
        id,
        source: "ward_minato",
        source_label: MINATO_SOURCE.label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name: ev.venue_name || "\u6e2f\u533a\u5b50\u80b2\u3066\u652f\u63f4\u65bd\u8a2d",
        address: ev.address || "",
        url: ev.url,
        lat: point.lat,
        lng: point.lng,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${MINATO_SOURCE.label} \u5150\u7ae5\u9928`,
        tags: Array.isArray(ev.tags) && ev.tags.length ? ev.tags : ["minato_jidokan_event", "minato_facility"],
      });
    }
  }

  return Array.from(byId.values());
}

function scoreJapaneseText(textRaw) {
  const text = String(textRaw || "");
  const jaChars = text.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.length || 0;
  const dateMarkers = text.match(/[\u5E74\u6708\u65E5\u6642\u5206]/g)?.length || 0;
  const friendMarkers = (text.match(/\u30d5\u30ec\u30f3\u30ba/g) || []).length;
  const brokenMarkers = (text.match(/[\uFFFD]/g) || []).length;
  return jaChars + dateMarkers * 3 + friendMarkers * 10 - brokenMarkers * 2;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const utf8 = buf.toString("utf8");
  const utf8Score = scoreJapaneseText(utf8);
  let sjis = "";
  let sjisScore = -Infinity;
  if (typeof TextDecoder !== "undefined") {
    try {
      sjis = new TextDecoder("shift_jis").decode(buf);
      sjisScore = scoreJapaneseText(sjis);
    } catch {
      sjis = "";
      sjisScore = -Infinity;
    }
  }
  const isShinagawaPocket = /shinagawa-pocket\.city-hc\.jp/i.test(url);
  if (isShinagawaPocket) return utf8;
  const isFriendsShibuya = /friends-shibuya\.com/i.test(url);
  if (isFriendsShibuya && sjis && sjisScore > utf8Score) return sjis;
  const hasSjisMeta = /charset\s*=\s*["']?\s*(shift[_-]?jis|x-sjis)/i.test(utf8);
  const hasJapanese = /[\u3040-\u30ff\u3400-\u9fff]/u.test(utf8);
  const mojibakeHint = /・ｽ|�/.test(utf8) || (!hasJapanese && /ﾃ[｣ｦ･ｧｯ]/.test(utf8));
  const preferSjisByMeta = hasSjisMeta && sjisScore >= utf8Score - 8;
  const preferSjisByMojibake = mojibakeHint && sjisScore >= utf8Score;
  if (sjis && (preferSjisByMeta || preferSjisByMojibake || sjisScore >= utf8Score + 6)) return sjis;
  return utf8;
}

function parseSetagayaMonth(html) {
  const out = [];
  const re =
    /<div class="event_item">[\s\S]*?<p class="event_item_ttl">\s*<a href="([^"]+\.html[^"]*)">([\s\S]*?)<\/a>\s*<\/p>[\s\S]*?(?:<p class="event_item_date">([\s\S]*?)<\/p>)?[\s\S]*?<\/div>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    const title = normalizeText(String(m[2] || "").replace(/<[^>]+>/g, ""));
    const dateText = normalizeText(String(m[3] || "").replace(/<[^>]+>/g, ""));
    if (!hrefRaw || !title) continue;
    const absUrl = hrefRaw.startsWith("http") ? hrefRaw : `${SETAGAYA_SOURCE.baseUrl}${hrefRaw}`;
    if (!hasJidokanHint(title) && !SETAGAYA_JIDOKAN_URL_RE.test(absUrl)) continue;
    out.push({ title, url: absUrl, dateText });
  }
  return out;
}

function parseOtaFacilityLinks(indexHtml) {
  const out = [];
  const re = /<a href="([^"]*\/event\/jidoukan\/[^"]*\/index\.html[^"]*)">([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(indexHtml)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    if (!hrefRaw || /\/event\/jidoukan\/index\.html/i.test(hrefRaw)) continue;
    const abs = hrefRaw.startsWith("http") ? hrefRaw : `${OTA_SOURCE.baseUrl}${hrefRaw}`;
    const title = normalizeText(stripTags(m[2]));
    if (!out.some((x) => x.url === abs)) out.push({ url: abs, title });
  }
  return out;
}

function parseOtaMonthPageLinks(facilityUrl, html) {
  const out = [];
  const baseDir = facilityUrl.replace(/\/index\.html(?:\?.*)?$/i, "/");
  const re = /<a href="([^"]+\.html[^"]*)">([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    if (!hrefRaw || /index\.html(?:\?|$)/i.test(hrefRaw)) continue;
    const abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, facilityUrl).toString();
    if (!abs.startsWith(baseDir)) continue;
    if (!out.includes(abs)) out.push(abs);
  }
  return out.slice(0, 8);
}

function parseOtaBaseYearMonth(html) {
  const t = `${stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "")} ${stripTags(
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ""
  )}`;
  let m = t.match(/\u4ee4\u548c\s*([0-9]{1,2})\u5e74\s*([0-9]{1,2})\u6708/u);
  if (m) {
    return { y: 2018 + Number(m[1]), mo: Number(m[2]) };
  }
  m = t.match(/(\d{4})\u5e74\s*(\d{1,2})\u6708/u);
  if (m) return { y: Number(m[1]), mo: Number(m[2]) };
  const now = parseYmdFromJst(new Date());
  return { y: now.y, mo: now.m };
}

function parseOtaDatesFromText(textRaw, baseY, baseMo) {
  const text = normalizeText(textRaw);
  const out = [];
  const push = (y, mo, d) => {
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return;
    out.push({ y, mo, d });
  };
  let m;

  const ymdRe = /(\d{4})\u5e74\s*(\d{1,2})\u6708\s*(\d{1,2})\u65e5/g;
  while ((m = ymdRe.exec(text)) !== null) push(Number(m[1]), Number(m[2]), Number(m[3]));

  const mdRangeRe = /(\d{1,2})\u6708\s*(\d{1,2})\u65e5\s*[\uff5e\u301c\-\uff0d]\s*(\d{1,2})\u6708\s*(\d{1,2})\u65e5/g;
  while ((m = mdRangeRe.exec(text)) !== null) {
    const sMo = Number(m[1]);
    const sD = Number(m[2]);
    const eMo = Number(m[3]);
    const eD = Number(m[4]);
    let y = baseY;
    if (sMo < baseMo - 6) y += 1;
    const start = toJstDate(y, sMo, sD, 0, 0);
    let endYear = y;
    if (eMo < sMo) endYear += 1;
    const end = toJstDate(endYear, eMo, eD, 0, 0);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) continue;
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000);
    if (days > 120) {
      push(y, sMo, sD);
      continue;
    }
    for (let i = 0; i <= days; i += 1) {
      const d = new Date(start.getTime() + i * 86400000);
      push(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }

  const mdRe = /(\d{1,2})\u6708\s*(\d{1,2})\u65e5/g;
  while ((m = mdRe.exec(text)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    let y = baseY;
    if (mo < baseMo - 6) y += 1;
    push(y, mo, d);
  }

  const uniq = new Map();
  for (const d of out) {
    const key = `${d.y}-${d.mo}-${d.d}`;
    if (!uniq.has(key)) uniq.set(key, d);
  }
  return Array.from(uniq.values());
}

function parseOtaEventsFromDetail(detailHtml, monthUrl, facilityName) {
  const { y: baseY, mo: baseMo } = parseOtaBaseYearMonth(detailHtml);
  const out = [];
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  let row;
  while ((row = rowRe.exec(detailHtml)) !== null) {
    const tds = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td;
    while ((td = tdRe.exec(row[0])) !== null) tds.push(stripTags(td[1]));
    if (tds.length < 2) continue;
    const title = normalizeText(tds[0]);
    if (!title || /(\u884c\u4e8b\u540d|\u5bfe\u8c61|\u5185\u5bb9|\u6642\u9593)/.test(title)) continue;
    const bodyText = normalizeText(tds[1] || "");
    const dateCell = tds[Math.min(2, tds.length - 1)];
    const dates = parseOtaDatesFromText(dateCell, baseY, baseMo);
    if (dates.length === 0) continue;
    let venue = facilityName || "\u5927\u7530\u533a\u5150\u7ae5\u9928";
    const vm = bodyText.match(/([^\s]{2,50}(?:\u5150\u7ae5\u9928|\u3072\u308d\u3070|\u30bb\u30f3\u30bf\u30fc|\u4f1a\u9928))/u);
    if (vm) venue = vm[1];
    const timeRange = parseTimeRangeFromText(`${title} ${bodyText} ${dateCell} ${tds.join(" ")}`);
    out.push({
      title,
      dates,
      timeRange,
      venue_name: venue,
      address: "",
      url: monthUrl,
    });
  }
  return out;
}

async function collectDetailMetaMap(rows, maxDays) {
  const map = new Map();
  const urls = Array.from(new Set(rows.map((x) => x.url))).slice(0, 180);
  const concurrency = 6;
  let idx = 0;

  async function worker() {
    while (idx < urls.length) {
      const i = idx;
      idx += 1;
      const url = urls[i];
      try {
        const html = await fetchText(url);
        const dates = parseDatesFromHtml(html).filter((d) => inRangeJst(d.y, d.mo, d.d, maxDays));
        const detail = parseDetailMeta(html);
        const timeRange = parseTimeRangeFromText(stripTags(html));
        map.set(url, {
          dates,
          timeRange,
          venue: detail.venue || "",
          address: detail.address || "",
        });
      } catch {
        // ignore per-page error
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return map;
}

async function collectSetagayaJidokanEvents(maxDays) {
  const months = getMonthsForRange(maxDays);
  const rowsAll = [];
  for (const ym of months) {
    const url = `${SETAGAYA_SOURCE.baseUrl}${SETAGAYA_SOURCE.listPath}?type=2&year=${ym.year}&month=${ym.month}`;
    try {
      const html = await fetchText(url);
      rowsAll.push(...parseSetagayaMonth(html));
    } catch {
      // ignore month fetch error
    }
  }

  const detailMetaMap = await collectDetailMetaMap(rowsAll, maxDays);
  const byId = new Map();

  for (const row of rowsAll) {
    const candidates = [];

    for (const span of parseDateSpans(row.dateText)) {
      candidates.push(...explodeSpanToDates(span));
    }

    const detailMeta = detailMetaMap.get(row.url) || { dates: [], timeRange: null, venue: "", address: "" };
    candidates.push(...detailMeta.dates);

    if (candidates.length === 0) continue;

    const uniq = new Map();
    for (const d of candidates) {
      const key = `${d.y}-${d.mo}-${d.d}`;
      if (!uniq.has(key)) uniq.set(key, d);
    }

    const venueName = detailMeta.venue || extractVenueFromTitle(row.title);
    const addressText = detailMeta.address || "";
    const rowTimeRange = detailMeta.timeRange || parseTimeRangeFromText(`${row.title} ${row.dateText}`);
    const geoCandidates = buildGeoCandidates(row.title, venueName, addressText);
    let point = await geocodeForWard(geoCandidates, SETAGAYA_SOURCE);
    if (!point) point = { ...SETAGAYA_SOURCE.center };

    for (const d of uniq.values()) {
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, rowTimeRange, 10);
      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `ward:setagaya:${row.url}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: "ward_setagaya",
        source_label: SETAGAYA_SOURCE.label,
        title: row.title,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name: venueName,
        address: addressText,
        url: row.url,
        lat: point.lat,
        lng: point.lng,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${SETAGAYA_SOURCE.label} \u5150\u7ae5\u9928`,
        tags: ["setagaya_jidokan_event", "setagaya_jidokan"],
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

async function collectOtaJidokanEvents(maxDays) {
  let indexHtml = "";
  try {
    indexHtml = await fetchText(`${OTA_SOURCE.baseUrl}/event/jidoukan/index.html`);
  } catch {
    return [];
  }

  const facilities = parseOtaFacilityLinks(indexHtml).slice(0, 80);
  const byId = new Map();

  for (const facility of facilities) {
    let facilityHtml = "";
    try {
      facilityHtml = await fetchText(facility.url);
    } catch {
      continue;
    }
    const monthLinks = parseOtaMonthPageLinks(facility.url, facilityHtml);
    for (const monthUrl of monthLinks) {
      let detailHtml = "";
      try {
        detailHtml = await fetchText(monthUrl);
      } catch {
        continue;
      }
      const rows = parseOtaEventsFromDetail(detailHtml, monthUrl, facility.title);
      for (const row of rows) {
        const tags = buildOtaTags(monthUrl, row.venue_name || facility.title, row.title);
        const geoCandidates = buildOtaGeoCandidates(row.title, row.venue_name || facility.title, row.address || "");
        let point = await geocodeForWard(geoCandidates, OTA_SOURCE);
        if (!point) point = { ...OTA_SOURCE.center };
        for (const d of row.dates) {
          if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
          const { startsAt, endsAt } = buildStartsEndsForDate(d, row.timeRange, 10);
          const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
          const id = `ward:ota:${monthUrl}:${row.title}:${dateKey}`;
          if (byId.has(id)) continue;
          byId.set(id, {
            id,
            source: "ward_ota",
            source_label: OTA_SOURCE.label,
            title: row.title,
            starts_at: startsAt,
            ends_at: endsAt,
            updated_at: startsAt,
            venue_name: row.venue_name || "\u5927\u7530\u533a\u5150\u7ae5\u9928",
            address: row.address || "",
            url: row.url,
            lat: point.lat,
            lng: point.lng,
            participants: null,
            waitlisted: null,
            recently_updated: true,
            query_hit: `${OTA_SOURCE.label} \u5150\u7ae5\u9928`,
            tags,
          });
        }
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

async function collectShinagawaJidokanEvents(maxDays) {
  let centerRootHtml = "";
  try {
    centerRootHtml = await fetchText(`${SHINAGAWA_POCKET_BASE}/open_announcement/center/`);
  } catch {
    return [];
  }

  const centerLinks = parseAnchors(centerRootHtml, `${SHINAGAWA_POCKET_BASE}/open_announcement/center/`)
    .map((x) => x.url)
    .filter((u) => /\/nursery\/detail\/S\d+/.test(u))
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 80);

  const byId = new Map();
  const detailMetaCache = new Map();

  async function getDetailMeta(absUrl) {
    if (detailMetaCache.has(absUrl)) return detailMetaCache.get(absUrl);
    let meta = { date: null, startHour: null, startMinute: null, endHour: null, endMinute: null };
    try {
      const detailHtml = await fetchText(absUrl);
      meta = parseShinagawaPocketDetailMeta(detailHtml);
    } catch {
      // ignore detail fetch error
    }
    detailMetaCache.set(absUrl, meta);
    return meta;
  }

  for (const centerUrl of centerLinks) {
    let centerHtml = "";
    try {
      centerHtml = await fetchText(centerUrl);
    } catch {
      continue;
    }

    const centerName = normalizeText(stripTags((centerHtml.match(/<h1 class="caption page-title">([\s\S]*?)<\/h1>/i) || [])[1] || ""));
    const rowRe = /<tr>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
    let addressText = "";
    let rm;
    while ((rm = rowRe.exec(centerHtml)) !== null) {
      const k = normalizeText(stripTags(rm[1]));
      const v = normalizeText(stripTags(rm[2]));
      if (!addressText && /(\u4f4f\u6240|\u6240\u5728\u5730)/.test(k)) addressText = v;
    }

    const eventSearchLink = parseAnchors(centerHtml, centerUrl).find((x) => /\/event-calendar\/result\?/.test(x.url));
    const eventSearchUrl =
      eventSearchLink?.url ||
      `${SHINAGAWA_POCKET_BASE}/event-calendar/result?year_from=&month_from=&day_from=&year_to=&month_to=&day_to=&tags%5B%5D=${encodeURIComponent(
        centerName
      )}`;

    let eventListHtml = "";
    try {
      eventListHtml = await fetchText(eventSearchUrl);
    } catch {
      continue;
    }

    const geoCandidates = buildShinagawaGeoCandidates(centerName, centerName, addressText);
    let point = await geocodeForWard(geoCandidates, SHINAGAWA_SOURCE);
    if (!point) point = { ...SHINAGAWA_SOURCE.center };

    const itemRe = /<li class="list-item">([\s\S]*?)<\/li>/gi;
    let im;
    while ((im = itemRe.exec(eventListHtml)) !== null) {
      const block = im[1];
      const href = (block.match(/<a class="list-item-link" href="([^"]+)"/i) || [])[1] || "";
      const dateText = normalizeText(stripTags((block.match(/<div[^>]*class="text-smaller"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || ""));
      const rawTitle = (block.match(/<div[^>]*class="text-smaller"[^>]*>[\s\S]*?<\/div>\s*<div>([\s\S]*?)<\/div>/i) || [])[1] || "";
      const titleText = normalizeText(stripTags(rawTitle));
      if (!href || !titleText) continue;
      const d = parseShinagawaPocketDate(dateText);
      if (!d) continue;
      const absUrl = href.startsWith("http") ? href : new URL(href, SHINAGAWA_POCKET_BASE).toString();
      const meta = await getDetailMeta(absUrl);
      const baseDate = meta.date || d;
      if (!inRangeJst(baseDate.y, baseDate.mo, baseDate.d, maxDays)) continue;
      const sh = Number.isFinite(meta.startHour) ? meta.startHour : 10;
      const sm = Number.isFinite(meta.startMinute) ? meta.startMinute : 0;
      const startsAtDate = toJstDate(baseDate.y, baseDate.mo, baseDate.d, sh, sm);
      const startsAt = startsAtDate.toISOString();
      let endsAt = null;
      if (Number.isFinite(meta.endHour) && Number.isFinite(meta.endMinute)) {
        let endDate = toJstDate(baseDate.y, baseDate.mo, baseDate.d, meta.endHour, meta.endMinute);
        if (endDate < startsAtDate) endDate = new Date(endDate.getTime() + 86400000);
        endsAt = endDate.toISOString();
      }
      const dateKey = `${baseDate.y}${String(baseDate.mo).padStart(2, "0")}${String(baseDate.d).padStart(2, "0")}`;
      const id = `ward:shinagawa:${centerName}:${absUrl}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: "ward_shinagawa",
        source_label: SHINAGAWA_SOURCE.label,
        title: titleText,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name: centerName || "\u54c1\u5ddd\u533a\u5150\u7ae5\u30bb\u30f3\u30bf\u30fc",
        address: addressText,
        url: absUrl,
        lat: point.lat,
        lng: point.lng,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${SHINAGAWA_SOURCE.label} \u5150\u7ae5\u9928`,
        tags: ["shinagawa_jidokan_event", "shinagawa_jidokan", "shinagawa_pocket"],
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

async function collectMeguroJidokanEvents(maxDays) {
  let indexHtml = "";
  try {
    indexHtml = await fetchText(`${MEGURO_SOURCE.baseUrl}/event/index.html`);
  } catch {
    return [];
  }

  const detailUrls = parseMeguroEventLinks(indexHtml).slice(0, 240);
  const byId = new Map();

  for (const detailUrl of detailUrls) {
    let html = "";
    try {
      html = await fetchText(detailUrl);
    } catch {
      continue;
    }

    const h1 = normalizeText(stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ""));
    if (!h1 || !hasJidokanHint(h1)) continue;

    const dateSection = extractSectionByH2(html, "\\u65e5\\u6642|\\u65e5\\u306b\\u3061|\\u65e5\\u7a0b");
    const placeSection = extractSectionByH2(html, "\\u5834\\u6240|\\u4f1a\\u5834");
    const dateText = normalizeText(stripTags(dateSection));
    const placeText = normalizeText(stripTags(placeSection));
    const timeRange = parseTimeRangeFromText(`${dateText} ${h1}`);

    const now = parseYmdFromJst(new Date());
    const candidates = [];
    candidates.push(...parseDatesFromHtml(dateSection || html));
    candidates.push(...parseOtaDatesFromText(dateText, now.y, now.m));
    candidates.push(...parseMonthDayFromTextWithBase(h1, now.y, now.m));

    const uniq = new Map();
    for (const d of candidates) {
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      const key = `${d.y}-${d.mo}-${d.d}`;
      if (!uniq.has(key)) uniq.set(key, d);
    }
    if (uniq.size === 0) continue;

    const venueName = placeText || extractMeguroVenueFromTitle(h1);
    const geoCandidates = buildMeguroGeoCandidates(h1, venueName, "");
    let point = await geocodeForWard(geoCandidates, MEGURO_SOURCE);
    if (!point) point = { ...MEGURO_SOURCE.center };

    for (const d of uniq.values()) {
      const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange, 10);
      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `ward:meguro:${detailUrl}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: "ward_meguro",
        source_label: MEGURO_SOURCE.label,
        title: h1,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name: venueName,
        address: "",
        url: detailUrl,
        lat: point.lat,
        lng: point.lng,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${MEGURO_SOURCE.label} \u5150\u7ae5\u9928`,
        tags: ["meguro_jidokan_event", "meguro_jidokan"],
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

async function collectShibuyaJidokanEvents(maxDays) {
  const rows = [];
  for (let page = 1; page <= 8; page += 1) {
    const listUrl = page === 1 ? `${SHIBUYA_NEUVOLA_BASE}/event/` : `${SHIBUYA_NEUVOLA_BASE}/event/page/${page}/`;
    let listHtml = "";
    try {
      listHtml = await fetchText(listUrl);
    } catch {
      if (page === 1) return [];
      break;
    }
    const parsed = parseShibuyaNeuvolaArchiveRows(listHtml, listUrl);
    if (parsed.length === 0) break;
    rows.push(...parsed);
  }

  const uniqRows = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.url)) continue;
    seen.add(row.url);
    uniqRows.push(row);
  }

  const byId = new Map();
  for (const row of uniqRows.slice(0, 220)) {
    let detailHtml = "";
    try {
      detailHtml = await fetchText(row.url);
    } catch {
      continue;
    }

    const meta = parseShibuyaNeuvolaDetailMeta(detailHtml);
    const title = meta.title || row.title;
    const keepHint = /(\u5150\u7ae5|\u5b50\u80b2\u3066|\u3072\u308d\u3070|co\u3057\u3076\u3084|co\s*shibuya)/i;
    if (!keepHint.test(`${title} ${meta.bodyText || ""} ${row.author || ""}`)) continue;
    if (!meta.dates || meta.dates.length === 0) continue;

    const venueName = meta.venue_name || row.author || "\u6e0b\u8c37\u533a\u5b50\u80b2\u3066\u30a4\u30d9\u30f3\u30c8";
    const geoCandidates = buildShibuyaGeoCandidates(title, venueName, "");
    let point = await geocodeForWard(geoCandidates, SHIBUYA_SOURCE);
    if (!point) point = { ...SHIBUYA_SOURCE.center };

    for (const d of meta.dates) {
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, meta.timeRange, 10);
      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `ward:shibuya:${row.url}:${title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: "ward_shibuya",
        source_label: SHIBUYA_SOURCE.label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name: venueName,
        address: "",
        url: row.url,
        lat: point.lat,
        lng: point.lng,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${SHIBUYA_SOURCE.label} \u5150\u7ae5\u9928`,
        tags: ["shibuya_jidokan_event", "shibuya_neuvola"],
      });
    }
  }

  const friendsRows = [];
  for (let page = 1; page <= 4; page += 1) {
    const listUrl = page === 1 ? `${SHIBUYA_FRIENDS_BASE}/friends_event/` : `${SHIBUYA_FRIENDS_BASE}/friends_event/page/${page}`;
    let html = "";
    try {
      html = await fetchText(listUrl);
    } catch {
      if (page === 1) break;
      continue;
    }
    const parsed = parseShibuyaFriendsArchiveRows(html, listUrl);
    if (parsed.length === 0) break;
    friendsRows.push(...parsed.filter((r) => !r.isPast));
  }

  const seenFriends = new Set();
  const friendsDetailCache = new Map();
  for (const row of friendsRows.slice(0, 200)) {
    if (seenFriends.has(row.url)) continue;
    seenFriends.add(row.url);

    let rootHtml = "";
    try {
      rootHtml = await fetchText(row.url);
      friendsDetailCache.set(row.url, rootHtml);
    } catch {
      continue;
    }

    const childDetailUrls = parseAnchors(rootHtml, row.url)
      .map((x) => x.url)
      .filter(
        (u) =>
          /^https:\/\/friends-shibuya\.com\/friends_event\//i.test(u) &&
          !/\/friends_event\/?$/i.test(u) &&
          !/\/friends_event\/page\/\d+/i.test(u) &&
          !/\/feed\/?$/i.test(u) &&
          u !== row.url
      )
      .slice(0, 20);
    const candidateUrls = [row.url, ...childDetailUrls];

    for (const detailUrl of candidateUrls) {
      if (seenFriends.has(detailUrl) && detailUrl !== row.url) continue;
      seenFriends.add(detailUrl);

      let detailHtml = friendsDetailCache.get(detailUrl) || "";
      if (!detailHtml) {
        try {
          detailHtml = await fetchText(detailUrl);
          friendsDetailCache.set(detailUrl, detailHtml);
        } catch {
          continue;
        }
      }

      const meta = parseShibuyaFriendsDetailMeta(detailHtml);
      if (!meta.title || !meta.dates || meta.dates.length === 0) continue;
      if (/^\s*\u30a4\u30d9\u30f3\u30c8\s*$/.test(meta.title)) continue;

      const geoCandidates = buildShibuyaGeoCandidates(meta.title, meta.venue_name, "\u6e0b\u8c37\u533a\u672c\u753a");
      let point = await geocodeForWard(geoCandidates, SHIBUYA_SOURCE);
      if (!point) point = { ...SHIBUYA_SOURCE.center };

      for (const d of meta.dates) {
        if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
        const { startsAt, endsAt } = buildStartsEndsForDate(d, meta.timeRange, 10);
        const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
        const id = `ward:shibuya:${detailUrl}:${meta.title}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: "ward_shibuya",
          source_label: SHIBUYA_SOURCE.label,
          title: meta.title,
          starts_at: startsAt,
          ends_at: endsAt,
          updated_at: startsAt,
          venue_name: meta.venue_name,
          address: "",
          url: detailUrl,
          lat: point.lat,
          lng: point.lng,
          participants: null,
          waitlisted: null,
          recently_updated: true,
          query_hit: `${SHIBUYA_SOURCE.label} \u5150\u7ae5\u9928`,
          tags: ["shibuya_jidokan_event", "shibuya_friends"],
        });
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

async function collectMinatoJidokanEvents(maxDays) {
  const months = getMonthsForRange(maxDays);
  const rows = [];
  for (const m of months) {
    const listUrls = [
      `${MINATO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_target=2&siteid=1`,
      `${MINATO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&siteid=1`,
      `${MINATO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=1&year=${m.year}&month=${m.month}&siteid=1`,
    ];
    for (const listUrl of listUrls) {
      let html = "";
      try {
        html = await fetchText(listUrl);
      } catch {
        continue;
      }
      rows.push(...parseMinatoListEventLinks(html, listUrl));
    }
  }

  const uniqRows = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.url)) continue;
    seen.add(row.url);
    uniqRows.push(row);
  }

  const byId = new Map();
  const facilityHint = /(\u5150\u7ae5\u9928|\u5150\u7ae5\u30bb\u30f3\u30bf\u30fc|\u5b50\u3069\u3082\u4e2d\u9ad8\u751f\u30d7\u30e9\u30b6|\u5b50\u3069\u3082\u5bb6\u5ead\u652f\u63f4\u30bb\u30f3\u30bf\u30fc|\u5b50\u80b2\u3066\u3072\u308d\u3070|\u5b66\u7ae5\u30af\u30e9\u30d6)/i;
  const titleHint = WARD_CHILD_HINT_RE;
  const appiiHint = /(\u3042\u3063\u3074\u3043|\u3075\u308c\u3042\u3044\u30eb\u30fc\u30e0|appy|apii)/i;
  for (const row of uniqRows.slice(0, 300)) {
    let detailHtml = "";
    try {
      detailHtml = await fetchText(row.url);
    } catch {
      continue;
    }

    const meta = parseMinatoDetailMeta(detailHtml);
    const title = meta.title || row.title;
    if (!title || !meta.dates || meta.dates.length === 0) continue;
    const hay = `${title} ${meta.venue_name || ""} ${meta.bodyText || ""} ${row.url} ${row.title}`;
    if (!facilityHint.test(hay) && !titleHint.test(hay) && !appiiHint.test(hay) && !WARD_CHILD_URL_HINT_RE.test(row.url) && !/\/kouhou\/event\//i.test(row.url))
      continue;

    const geoCandidates = buildMinatoGeoCandidates(title, meta.venue_name, "");
    let point = await geocodeForWard(geoCandidates, MINATO_SOURCE);
    if (!point) point = { ...MINATO_SOURCE.center };

    for (const d of meta.dates) {
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, meta.timeRange, 10);
      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `ward:minato:${row.url}:${title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: "ward_minato",
        source_label: MINATO_SOURCE.label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name: meta.venue_name || "\u6e2f\u533a\u5150\u7ae5\u9928",
        address: "",
        url: row.url,
        lat: point.lat,
        lng: point.lng,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${MINATO_SOURCE.label} \u5150\u7ae5\u9928`,
        tags: ["minato_jidokan_event", "minato_kids"],
      });
    }
  }

  const linked = await collectMinatoFacilityLinkedEvents(maxDays);
  for (const ev of linked) {
    if (!byId.has(ev.id)) byId.set(ev.id, ev);
  }

  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

function parseChiyodaListRows(html, pageUrl, year, month) {
  const out = [];
  const block = (html.match(/<div id="tmp_event_cal_list">([\s\S]*?)<div id="event_cal_list_end_position">/i) || [])[1] || "";
  if (!block) return out;

  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let tr;
  while ((tr = trRe.exec(block)) !== null) {
    const row = tr[0];
    const dayMatch = row.match(/cal_day_(\d{1,2})/i);
    if (!dayMatch) continue;
    const day = Number(dayMatch[1]);
    if (!Number.isFinite(day) || day < 1 || day > 31) continue;

    const linkRe = /<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = linkRe.exec(row)) !== null) {
      const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
      const title = normalizeText(stripTags(m[2]));
      if (!hrefRaw || !title) continue;
      let abs = "";
      try {
        abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, pageUrl).toString();
      } catch {
        continue;
      }
      if (!/city\.chiyoda\.lg\.jp\/(?:koho\/event|koho\/kosodate|kurashi\/kosodate|kosodate|shisetsu\/jidokan|shisetsu\/gakko)\//i.test(abs))
        continue;
      out.push({
        url: abs,
        title,
        date: { y: Number(year), mo: Number(month), d: day },
      });
    }
  }
  return out;
}

function parseChiyodaDetailMeta(html, fallbackDate) {
  const title = normalizeText(stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ""));
  const allText = normalizeJaDigits(normalizeText(stripTags(html)));
  const sections = [];
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = h2Re.exec(html)) !== null) {
    const heading = normalizeText(stripTags(m[1]));
    const value = normalizeJaDigits(normalizeText(stripTags(m[2])));
    if (!heading || !value) continue;
    sections.push({ heading, value });
  }

  const dateText = sections
    .filter((x) => /\u65e5\u6642|\u958b\u50ac\u65e5|\u65e5\u7a0b|\u958b\u50ac\u671f\u9593/i.test(x.heading))
    .map((x) => x.value)
    .join(" ");
  const timeRange = parseTimeRangeFromText(`${dateText} ${allText}`);
  const normalized = normalizeJapaneseEraYears(dateText || allText);
  const dates = parseOtaDatesFromText(normalized, fallbackDate.y, fallbackDate.mo);

  let venue_name = "";
  for (const sec of sections) {
    const heading = sec.heading;
    const value = sec.value;
    if (/\u4f1a\u5834|\u5834\u6240|\u958b\u50ac\u5834\u6240|\u5b9f\u65bd\u5834\u6240/i.test(heading)) {
      venue_name = value;
      break;
    }
  }
  if (!venue_name) {
    const v = normalized.match(/(?:\u4f1a\u5834|\u5834\u6240|[\u540d\u79f0]{2})\s*[:\uff1a]\s*([^\n]{2,100})/);
    if (v) venue_name = normalizeText(v[1]);
  }
  if (!venue_name) venue_name = "\u5343\u4ee3\u7530\u533a\u5b50\u80b2\u3066\u95a2\u9023\u65bd\u8a2d";

  return {
    title,
    dates: dates.length ? dates : [fallbackDate],
    timeRange,
    venue_name,
    bodyText: allText,
  };
}

function buildChiyodaGeoCandidates(title, venue_name) {
  const out = [];
  const push = (s) => {
    const t = normalizeText(s);
    if (!t) return;
    if (!out.includes(t)) out.push(t);
  };
  const venue = normalizeText(venue_name);
  const noisyVenueRe =
    /(\u7121\u6599|\u3069\u306a\u305f\u3067\u3082|\u5728\u4f4f|\u5728\u52e4|\u5728\u5b66|\u533a\u6c11|\u5bfe\u8c61|\u5b9a\u54e1|\u7533\u8fbc|\u53c2\u52a0|\u8b1b\u5ea7|\u8aac\u660e\u4f1a|\u30aa\u30f3\u30e9\u30a4\u30f3|Zoom|Web|WEB)/i;
  if (venue && !noisyVenueRe.test(venue)) push(`${venue} \u5343\u4ee3\u7530\u533a`);
  push(`${title} ${venue_name} \u5343\u4ee3\u7530\u533a`);
  push(`${title} \u5343\u4ee3\u7530\u533a`);
  push("\u5343\u4ee3\u7530\u533a\u5f79\u6240");
  return out;
}

function parseChiyodaOshiraseRows(html, pageUrl) {
  const out = [];
  const sectionRe =
    /<h2[^>]*>\s*(?:<a[^>]*>)?([\s\S]*?)(?:<\/a>)?\s*<\/h2>\s*([\s\S]*?)(?=<h2[^>]*>|<div class="child_contents_page_bottom">|<\/article>|$)/gi;
  let m;
  while ((m = sectionRe.exec(html)) !== null) {
    const facility = normalizeText(stripTags(m[1] || ""));
    const block = m[2] || "";
    if (!facility || !/(\u5150\u7ae5|\u3053\u3069\u3082|\u308f\u3093\u3071\u304f|\u3072\u308d\u3070|\u30d7\u30e9\u30b6)/.test(facility)) continue;
    for (const a of parseAnchors(block, pageUrl)) {
      const title = normalizeText(
        String(a.text || "")
          .replace(/\s*[（(]\s*PDF[^）)]*[）)]\s*/gi, " ")
          .replace(/\s*PDF\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:KB|MB)\s*/gi, " ")
      );
      if (!title) continue;
      const isPdf = /\.pdf(?:\?|$)/i.test(a.url);
      if (!isPdf && !/\/shisetsu\/gakko\//i.test(a.url)) continue;
      out.push({
        facility,
        title,
        url: a.url,
        isPdf,
      });
    }
  }
  const uniq = [];
  const seen = new Set();
  for (const row of out) {
    const key = `${row.url}|${row.title}|${row.facility}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(row);
  }
  return uniq;
}

function buildChiyodaPdfProxyUrl(pdfUrl) {
  const normalized = String(pdfUrl || "").replace(/^https?:\/\//i, "");
  return `https://r.jina.ai/http://${normalized}`;
}

async function fetchChiyodaPdfMarkdown(pdfUrl) {
  const proxyUrl = buildChiyodaPdfProxyUrl(pdfUrl);
  const res = await fetch(proxyUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Accept: "text/plain,text/markdown;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(50000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${proxyUrl}`);
  return await res.text();
}

function parseChiyodaSlashDates(textRaw, baseY, baseMo) {
  const text = normalizeText(normalizeJaDigits(normalizeJapaneseEraYears(textRaw)));
  const out = [];
  const push = (y, mo, d) => {
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return;
    out.push({ y, mo, d });
  };
  let m;
  const ymdSlashRe = /(20\d{2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/g;
  while ((m = ymdSlashRe.exec(text)) !== null) push(Number(m[1]), Number(m[2]), Number(m[3]));

  const mdSlashRe = /(\d{1,2})\s*\/\s*(\d{1,2})/g;
  while ((m = mdSlashRe.exec(text)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    let y = Number(baseY);
    if (mo < Number(baseMo) - 6) y += 1;
    push(y, mo, d);
  }
  const uniq = new Map();
  for (const d of out) {
    const key = `${d.y}-${d.mo}-${d.d}`;
    if (!uniq.has(key)) uniq.set(key, d);
  }
  return Array.from(uniq.values());
}

function inferChiyodaMonthlyFallbackDate(title, baseY, baseMo) {
  const text = normalizeText(normalizeJaDigits(normalizeJapaneseEraYears(title)));
  const m = text.match(/(\d{1,2})\s*\u6708/);
  if (!m) return null;
  const mo = Number(m[1]);
  if (!Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  let y = Number(baseY);
  if (mo < Number(baseMo) - 6) y += 1;
  return { y, mo, d: 1 };
}

function alignMonthlyFallbackDate(dateObj, now) {
  if (!dateObj) return null;
  if (dateObj.y === now.y && dateObj.mo === now.m && dateObj.d < now.d) {
    return { y: dateObj.y, mo: dateObj.mo, d: now.d };
  }
  return dateObj;
}

async function collectChiyodaJidokanEvents(maxDays) {
  const months = getMonthsForRange(maxDays);
  const rows = [];
  for (const m of months) {
    const listUrls = [
      `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_category=2`,
      `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_target=1`,
      `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_target=2`,
      `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5150\u7ae5")}`,
      `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5b50\u3069\u3082")}`,
      `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5b50\u80b2\u3066")}`,
      `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=1&year=${m.year}&month=${m.month}`,
    ];
    for (const listUrl of listUrls) {
      let html = "";
      try {
        html = await fetchText(listUrl);
      } catch {
        continue;
      }
      rows.push(...parseChiyodaListRows(html, listUrl, m.year, m.month));
    }
  }

  const uniqRows = [];
  const seen = new Set();
  for (const row of rows) {
    const k = `${row.url}:${row.date.y}-${row.date.mo}-${row.date.d}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniqRows.push(row);
  }

  const byId = new Map();
  const childHint = WARD_CHILD_HINT_RE;
  for (const row of uniqRows.slice(0, 420)) {
    let meta = null;
    try {
      const detailHtml = await fetchText(row.url);
      meta = parseChiyodaDetailMeta(detailHtml, row.date);
    } catch {
      meta = {
        title: row.title || "",
        dates: [row.date],
        timeRange: null,
        venue_name: "",
        bodyText: row.title || "",
      };
    }
    const title = meta.title || row.title;
    if (!title || !meta.dates || meta.dates.length === 0) continue;

    const hay = `${title} ${meta.venue_name || ""} ${meta.bodyText || ""} ${row.title}`;
    const strictChildRe = /(\u5150\u7ae5|\u5b50\u3069\u3082|\u3053\u3069\u3082|\u4e73\u5e7c\u5150|\u89aa\u5b50|\u5b50\u80b2\u3066|\u3042\u304b\u3061\u3083\u3093|\u8d64\u3061\u3083\u3093|\u3072\u308d\u3070|\u308f\u3093\u3071\u304f|\u30d7\u30e9\u30b6)/;
    if (/\/koho\/event\//i.test(row.url || "") && !strictChildRe.test(hay)) continue;
    if (!childHint.test(hay)) continue;

    const geoCandidates = buildChiyodaGeoCandidates(title, meta.venue_name);
    let point = await geocodeForWard(geoCandidates, CHIYODA_SOURCE);
    if (!point) point = { ...CHIYODA_SOURCE.center };

    for (const d of meta.dates) {
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, meta.timeRange, 10);
      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `ward:chiyoda:${row.url}:${title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: "ward_chiyoda",
        source_label: CHIYODA_SOURCE.label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name: meta.venue_name || "\u5343\u4ee3\u7530\u533a\u5b50\u80b2\u3066\u95a2\u9023\u65bd\u8a2d",
        address: "",
        url: row.url,
        lat: point.lat,
        lng: point.lng,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${CHIYODA_SOURCE.label} \u5150\u7ae5\u9928`,
        tags: ["chiyoda_jidokan_event", "chiyoda_kosodate"],
      });
    }
  }

  // Supplement chiyoda data by following the official jidokan notice page and parsing linked PDFs.
  const now = parseYmdFromJst(new Date());
  const oshiraseUrl = `${CHIYODA_SOURCE.baseUrl}/koho/kosodate/jidocenter/oshirase.html`;
  let oshiraseHtml = "";
  try {
    oshiraseHtml = await fetchText(oshiraseUrl);
  } catch {
    oshiraseHtml = "";
  }
  if (oshiraseHtml) {
    const baseOshiraseRows = parseChiyodaOshiraseRows(oshiraseHtml, oshiraseUrl)
      .filter((r) => r.isPdf || /(\u5150\u7ae5|\u3053\u3069\u3082|\u3072\u308d\u3070|\u30d7\u30ed\u30b0\u30e9\u30e0|\u305f\u3088\u308a)/.test(`${r.facility} ${r.title}`))
      .slice(0, 120);
    const facilityPdfRows = [];
    for (const row of baseOshiraseRows.filter((r) => !r.isPdf && /\/shisetsu\/gakko\//i.test(r.url))) {
      let facilityHtml = "";
      try {
        facilityHtml = await fetchText(row.url);
      } catch {
        continue;
      }
      for (const a of parseAnchors(facilityHtml, row.url)) {
        if (!/\/documents\/1830\/.+\.pdf(?:\?|$)/i.test(a.url)) continue;
        const title = normalizeText(a.text || `${row.facility} \u304a\u305f\u3088\u308a`);
        const hay = `${row.facility} ${title} ${a.url}`;
        if (!/(\u5150\u7ae5|\u3053\u3069\u3082|\u3072\u308d\u3070|\u30d7\u30ed\u30b0\u30e9\u30e0|\u305f\u3088\u308a|\u6848\u5185)/.test(hay)) continue;
        facilityPdfRows.push({
          facility: row.facility,
          title,
          url: a.url,
          isPdf: true,
        });
      }
    }
    const oshiraseRows = [];
    const seenOshirase = new Set();
    for (const row of [...baseOshiraseRows, ...facilityPdfRows]) {
      const key = `${row.url}|${row.title}|${row.facility}`;
      if (seenOshirase.has(key)) continue;
      seenOshirase.add(key);
      oshiraseRows.push(row);
    }
    const pdfCache = new Map();
    for (const row of oshiraseRows) {
      const fallbackDate =
        alignMonthlyFallbackDate(inferChiyodaMonthlyFallbackDate(`${row.title} ${row.facility}`, now.y, now.m), now) || {
        y: now.y,
        mo: now.m,
        d: now.d,
      };
      let detailText = "";
      if (row.isPdf) {
        try {
          if (pdfCache.has(row.url)) {
            detailText = pdfCache.get(row.url);
          } else {
            detailText = await fetchChiyodaPdfMarkdown(row.url);
            pdfCache.set(row.url, detailText);
          }
        } catch {
          detailText = `${row.facility} ${row.title}`;
        }
      } else {
        try {
          detailText = await fetchText(row.url);
        } catch {
          detailText = `${row.facility} ${row.title}`;
        }
      }

      const normalized = normalizeJapaneseEraYears(normalizeJaDigits(normalizeText(`${detailText} ${row.facility} ${row.title}`)));
      const dateCandidates = [
        ...parseOtaDatesFromText(normalized, fallbackDate.y, fallbackDate.mo),
        ...parseChiyodaSlashDates(normalized, fallbackDate.y, fallbackDate.mo),
      ];
      const uniqDates = [];
      const seenDate = new Set();
      for (const d of dateCandidates) {
        const k = `${d.y}-${d.mo}-${d.d}`;
        if (seenDate.has(k)) continue;
        seenDate.add(k);
        uniqDates.push(d);
      }
      const inferredMonthlyDate = alignMonthlyFallbackDate(
        inferChiyodaMonthlyFallbackDate(`${row.title} ${row.facility}`, now.y, now.m),
        now
      );
      const dates = uniqDates.length ? uniqDates.slice(0, 80) : inferredMonthlyDate ? [inferredMonthlyDate] : [fallbackDate];
      if (dates.length === 0) continue;
      const venue = row.facility || "\u5343\u4ee3\u7530\u533a\u5150\u7ae5\u9928";
      const title = row.title.includes(row.facility) ? row.title : `${row.facility} ${row.title}`;
      const timeRange = parseTimeRangeFromText(normalized);

      let point = await geocodeForWard(buildChiyodaGeoCandidates(title, venue), CHIYODA_SOURCE);
      if (!point) point = { ...CHIYODA_SOURCE.center };

      for (const d of dates) {
        if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
        const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange, 10);
        const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
        const id = `ward:chiyoda:pdf:${row.url}:${title}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: "ward_chiyoda",
          source_label: CHIYODA_SOURCE.label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          updated_at: startsAt,
          venue_name: venue,
          address: "",
          url: row.url,
          lat: point.lat,
          lng: point.lng,
          participants: null,
          waitlisted: null,
          recently_updated: true,
          query_hit: `${CHIYODA_SOURCE.label} \u5150\u7ae5\u9928 \u304a\u305f\u3088\u308a`,
          tags: ["chiyoda_jidokan_event", "chiyoda_kosodate", "chiyoda_jidokan_pdf_notice"],
        });
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

function extractDateFromUrl(url, baseY, baseMo) {
  const u = String(url || "");
  let m = u.match(/(20\d{2})(\d{2})(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return { y, mo, d };
  }
  m = u.match(/(?:[?&](?:year|Y)=)(20\d{2}).*?(?:[?&](?:month|M)=)(\d{1,2}).*?(?:[?&]day=)(\d{1,2})/i);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return { y, mo, d };
  }
  if (Number.isFinite(baseY) && Number.isFinite(baseMo)) {
    m = u.match(/(?:^|[^\d])(\d{1,2})(?:[^\d]|$)/);
    if (m) {
      const d = Number(m[1]);
      if (d >= 1 && d <= 31) return { y: Number(baseY), mo: Number(baseMo), d };
    }
  }
  return null;
}

function buildWardGeoCandidates(wardLabel, title, venue, address) {
  const out = [];
  const add = (s) => {
    const t = normalizeText(s);
    if (!t) return;
    if (!out.includes(t)) out.push(t);
  };
  const tokyoWard = `\u6771\u4eac\u90fd${wardLabel}`;
  if (address) {
    if (!/\u6771\u4eac\u90fd/.test(address)) add(`${tokyoWard}${address}`);
    add(address);
  }
  if (venue) add(`${tokyoWard}${venue}`);
  if (title && venue) add(`${title} ${venue} ${tokyoWard}`);
  if (title) add(`${title} ${tokyoWard}`);
  add(`${tokyoWard}\u5f79\u6240`);
  add(`${wardLabel}\u5f79\u6240`);
  return out;
}

function parseGenericWardDetailMeta(source, html, fallbackDate, fallbackTitle) {
  const title = normalizeText(stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "")) || normalizeText(fallbackTitle);
  const allText = normalizeJaDigits(normalizeText(stripTags(html)));
  const sections = [];
  const pushSection = (heading, value) => {
    const h = normalizeText(stripTags(heading));
    const v = normalizeJaDigits(normalizeText(stripTags(value)));
    if (!h || !v) return;
    sections.push({ heading: h, value: v });
  };
  let m;
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((m = h2Re.exec(html)) !== null) pushSection(m[1], m[2]);
  const dtRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  while ((m = dtRe.exec(html)) !== null) pushSection(m[1], m[2]);
  const thRe = /<tr[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  while ((m = thRe.exec(html)) !== null) pushSection(m[1], m[2]);

  const basic = parseDetailMeta(html);
  let venue_name = normalizeText(basic.venue || "");
  let address = normalizeText(basic.address || "");
  for (const sec of sections) {
    if (!venue_name && /\u4f1a\u5834|\u5834\u6240|\u958b\u50ac\u5834\u6240|\u5b9f\u65bd\u5834\u6240/i.test(sec.heading)) venue_name = sec.value;
    if (!address && /\u4f4f\u6240|\u6240\u5728\u5730|\u4f4f\u6240\u5730/i.test(sec.heading)) address = sec.value;
  }
  if (!venue_name) venue_name = `${source.label}\u5b50\u3069\u3082\u95a2\u9023\u65bd\u8a2d`;

  const dateText = sections
    .filter((x) => /\u65e5\u6642|\u958b\u50ac\u65e5|\u65e5\u7a0b|\u671f\u9593|\u5bfe\u8c61\u65e5/i.test(x.heading))
    .map((x) => x.value)
    .join(" ");
  let datePayload = dateText;
  if (!datePayload) {
    const mm = allText.match(/(?:\u958b\u50ac\u65e5|\u65e5\u6642|\u65e5\u7a0b|\u671f\u9593)[\s\S]{0,260}/);
    datePayload = mm ? mm[0] : allText.slice(0, 480);
  }
  const normalizedDatePayload = normalizeJapaneseEraYears(`${datePayload} ${title}`);
  let dates = parseOtaDatesFromText(normalizedDatePayload, fallbackDate.y, fallbackDate.mo);
  if (dates.length === 0 && fallbackDate) dates = [fallbackDate];

  const timeRange = parseTimeRangeFromText(`${dateText} ${allText}`);
  return { title, dates, timeRange, venue_name, address, bodyText: allText };
}

async function parseGenericWardPdfMeta(source, pdfUrl, fallbackDate, fallbackTitle) {
  const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
  const normalized = normalizeJapaneseEraYears(normalizeJaDigits(normalizeText(markdown)));
  const title = normalizeText(fallbackTitle) || normalizeText((markdown.match(/Title:\s*(.+)/i) || [])[1] || "");
  const venueMatch =
    normalized.match(/譚ｿ讖句玄遶欺s*([^\s]{1,30}蜈千ｫ･鬢ｨ)/) ||
    normalized.match(/(CAP['窶兢S[^\s]{0,20}蜈千ｫ･鬢ｨ)/i) ||
    title.match(/(CAP['窶兢S[^\s]{0,20}蜈千ｫ･鬢ｨ)/i);
  const venue_name = normalizeText((venueMatch && venueMatch[1]) || "");
  const dateCandidates = [
    ...parseOtaDatesFromText(`${normalized} ${title}`, fallbackDate.y, fallbackDate.mo),
    ...parseChiyodaSlashDates(normalized, fallbackDate.y, fallbackDate.mo),
  ];
  const uniqDates = [];
  const seenDate = new Set();
  for (const d of dateCandidates) {
    const k = `${d.y}-${d.mo}-${d.d}`;
    if (seenDate.has(k)) continue;
    seenDate.add(k);
    uniqDates.push(d);
  }
  const dates = uniqDates.length ? uniqDates.slice(0, 180) : fallbackDate ? [fallbackDate] : [];
  const timeRange = parseTimeRangeFromText(normalized);
  return {
    title,
    dates,
    timeRange,
    venue_name: venue_name || `${source.label}蟄舌←繧る未騾｣譁ｽ險ｭ`,
    address: "",
    bodyText: normalized,
  };
}

function parseWardListRows(html, pageUrl, year, month, opts = {}) {
  const block = opts.blockRe ? (html.match(opts.blockRe)?.[1] || html) : html;
  const out = [];
  const accept = (url, text) => {
    if (!url) return false;
    if (!normalizeText(text)) return false;
    if (opts.urlAllow && !opts.urlAllow.test(url)) return false;
    if (opts.urlDeny && opts.urlDeny.test(url)) return false;
    if (/\/(list_)?calendar(?:\d+)?\.html/i.test(url) && (/^\d{1,2}$/.test(text) || /\u6708/.test(text))) return false;
    if (/calendar\.cgi\?type=[123]/i.test(url) && /^\d{1,2}$/.test(text)) return false;
    return true;
  };

  if (opts.dayBlockRe instanceof RegExp) {
    const flags = opts.dayBlockRe.flags.includes("g") ? opts.dayBlockRe.flags : `${opts.dayBlockRe.flags}g`;
    const dayBlockRe = new RegExp(opts.dayBlockRe.source, flags);
    let dm;
    while ((dm = dayBlockRe.exec(block)) !== null) {
      const day = Number(dm[1]);
      const section = dm[2] || dm[0];
      const date =
        Number.isFinite(day) && day >= 1 && day <= 31 ? { y: Number(year), mo: Number(month), d: Number(day) } : null;
      for (const a of parseAnchors(section, pageUrl)) {
        if (!accept(a.url, a.text)) continue;
        out.push({ url: a.url, title: a.text, date });
      }
    }
  }

  if (!opts.skipTr) {
    const trRe = /<tr[\s\S]*?<\/tr>/gi;
    let tr;
    while ((tr = trRe.exec(block)) !== null) {
      const row = tr[0];
      const dayMatch =
        row.match(/cal_day_(\d{1,2})/i) ||
        row.match(/id="day(\d{1,2})"/i) ||
        row.match(/<th[^>]*class="[^"]*(?:day|sat|sun)[^"]*"[^>]*>[\s\S]*?<span[^>]*class="em"[^>]*>\s*(\d{1,2})\s*<\/span>/i) ||
        row.match(/calendar_day[^>]*>\s*(\d{1,2})\s*\u65e5/i) ||
        row.match(/class="[^"]*date[^"]*"[^>]*>\s*([\s\S]*?)<\/td>/i);
      let day = null;
      if (dayMatch) {
        const raw = dayMatch[1];
        const n = Number(String(raw).replace(/[^\d]/g, ""));
        if (Number.isFinite(n) && n >= 1 && n <= 31) day = n;
      }
      for (const a of parseAnchors(row, pageUrl)) {
        if (!accept(a.url, a.text)) continue;
        out.push({
          url: a.url,
          title: a.text,
          date: day ? { y: Number(year), mo: Number(month), d: day } : null,
        });
      }
    }
  }

  const runFallback = opts.useAnchorFallback === true && (out.length === 0 || opts.fallbackWhenRowsExist === true);
  if (runFallback) {
    for (const a of parseAnchors(block, pageUrl)) {
      if (!accept(a.url, a.text)) continue;
      const date = extractDateFromUrl(a.url, year, month);
      out.push({ url: a.url, title: a.text, date });
    }
  }

  return out;
}

function buildListCalendarUrl(baseDir, m, now) {
  const suffix = m.year === now.y && m.month === now.m ? "" : `${m.year}${String(m.month).padStart(2, "0")}`;
  return `${baseDir}/list_calendar${suffix}.html`;
}

function parseChuoAkachanTengokuRows(html, pageUrl) {
  const monthHint = parseJpYearMonth(html);
  const out = [];
  const sectionRe =
    /<h4[^>]*>\s*(?:<a[^>]*>\s*&nbsp;\s*<\/a>\s*)?([\s\S]*?)<\/h4>\s*([\s\S]*?)(?=<h4[^>]*>|<p><strong>|<h2>|<div id="cms_hidden_page_event_group"|$)/gi;
  let s;
  while ((s = sectionRe.exec(html)) !== null) {
    const facility = normalizeText(stripTags(s[1]));
    const block = s[2] || "";
    if (!facility) continue;
    const pdfLink = parseAnchors(block, pageUrl).find((a) => /\.pdf(?:\?|$)/i.test(a.url));
    const defaultUrl = (pdfLink && pdfLink.url) || pageUrl;

    const eventRe = /<h5[^>]*>([\s\S]*?)<\/h5>\s*<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    let e;
    while ((e = eventRe.exec(block)) !== null) {
      const title = normalizeText(stripTags(e[1]));
      const ul = e[2] || "";
      if (!title) continue;
      const liTexts = [];
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let li;
      while ((li = liRe.exec(ul)) !== null) {
        const t = normalizeText(stripTags(li[1]));
        if (t) liTexts.push(t);
      }
      if (liTexts.length === 0) continue;
      const dateLine = liTexts.find((t) => /(\u958b\u50ac\u65e5\u6642|\u65e5\u6642|\u958b\u50ac\u65e5|\u65e5\u7a0b)/.test(t)) || liTexts[0];
      const normalized = normalizeJapaneseEraYears(normalizeJaDigits(`${title} ${dateLine} ${liTexts.join(" ")}`));
      let dates = parseOtaDatesFromText(normalized, monthHint.y, monthHint.mo);
      if (dates.length === 0) {
        const fallback = inferChiyodaMonthlyFallbackDate(dateLine, monthHint.y, monthHint.mo);
        if (fallback) dates = [fallback];
      }
      if (dates.length === 0) continue;

      const linkInEvent = parseAnchors(ul, pageUrl).find((a) => /\.pdf(?:\?|$)|city\.chuo\.lg\.jp\/.+\.html/i.test(a.url));
      out.push({
        facility,
        title,
        dates,
        timeRange: parseTimeRangeFromText(normalized),
        bodyText: liTexts.join(" "),
        url: (linkInEvent && linkInEvent.url) || defaultUrl,
      });
    }
  }
  return out;
}

async function collectChuoAkachanTengokuEvents(maxDays) {
  const pageUrl = `${CHUO_SOURCE.baseUrl}/a0025/kosodate/kosodate/shien/akachantengoku/akachantengokuevent.html`;
  let html = "";
  try {
    html = await fetchText(pageUrl);
  } catch {
    return [];
  }
  const rows = parseChuoAkachanTengokuRows(html, pageUrl);
  const byId = new Map();
  for (const row of rows) {
    let point = await geocodeForWard(buildWardGeoCandidates(CHUO_SOURCE.label, row.title, row.facility, "").slice(0, 3), CHUO_SOURCE);
    if (!point) point = { ...CHUO_SOURCE.center };

    for (const d of row.dates) {
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, row.timeRange, 10);
      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `ward:chuo:akachan:${row.url}:${row.facility}:${row.title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: "ward_chuo",
        source_label: CHUO_SOURCE.label,
        title: row.title,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name: row.facility || `${CHUO_SOURCE.label}\u5150\u7ae5\u9928`,
        address: "",
        url: row.url,
        lat: point.lat,
        lng: point.lng,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${CHUO_SOURCE.label} \u3042\u304b\u3061\u3083\u3093\u5929\u56fd`,
        tags: ["chuo_jidokan_event", "chuo_akachan_tengoku"],
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

async function collectWardGenericEvents(source, maxDays, cfg) {
  const months = getMonthsForRange(maxDays);
  const now = parseYmdFromJst(new Date());
  const rows = [];
  for (const m of months) {
    const listUrls = (cfg.listUrls ? cfg.listUrls(m, now, maxDays) : []) || [];
    for (const listUrl of listUrls) {
      let html = "";
      try {
        html = await fetchText(listUrl);
      } catch {
        continue;
      }
      rows.push(...parseWardListRows(html, listUrl, m.year, m.month, cfg.parseOpts || {}));
    }
  }

  const uniqRows = [];
  const seenRows = new Set();
  for (const row of rows) {
    const d = row.date ? `${row.date.y}-${row.date.mo}-${row.date.d}` : "";
    const k = `${row.url}|${d}`;
    if (seenRows.has(k)) continue;
    seenRows.add(k);
    uniqRows.push(row);
  }

  const byId = new Map();
  const preHintRe = cfg.preHintRe || WARD_CHILD_HINT_RE;
  const childHintRe = cfg.childHintRe || WARD_CHILD_HINT_RE;
  const relaxChildFilter = cfg.relaxChildFilter === true;
  for (const row of uniqRows.slice(0, cfg.maxRows || 260)) {
    const preHay = `${row.title || ""} ${row.url || ""}`;
    const urlHintMatched = WARD_CHILD_URL_HINT_RE.test(row.url || "");
    if (cfg.requirePreHint === true && !preHintRe.test(preHay) && !urlHintMatched) continue;

    const fallbackDate = row.date || extractDateFromUrl(row.url, now.y, now.m) || { y: now.y, mo: now.m, d: now.d };
    const isPdfRow = /\.pdf(?:\?|$)/i.test(row.url || "");
    let meta = null;
    if (isPdfRow && cfg.allowPdfDetail === true) {
      try {
        meta = await parseGenericWardPdfMeta(source, row.url, fallbackDate, row.title);
      } catch {
        if (cfg.allowRowFallbackOnDetailError === true) {
          meta = {
            title: row.title || "",
            dates: [fallbackDate],
            timeRange: null,
            venue_name: "",
            address: "",
            bodyText: row.title || "",
          };
        } else {
          continue;
        }
      }
    } else {
      let detailHtml = "";
      let useRowFallback = false;
      try {
        detailHtml = await fetchText(row.url);
      } catch {
        if (cfg.allowRowFallbackOnDetailError === true) {
          useRowFallback = true;
        } else {
          continue;
        }
      }
      meta = useRowFallback
        ? {
            title: row.title || "",
            dates: [fallbackDate],
            timeRange: null,
            venue_name: "",
            address: "",
            bodyText: row.title || "",
          }
        : parseGenericWardDetailMeta(source, detailHtml, fallbackDate, row.title);
    }
    const title = meta.title || row.title;
    if (!title) continue;

    const hay = `${title} ${meta.venue_name || ""} ${meta.address || ""} ${meta.bodyText || ""} ${row.title || ""}`;
    if (!relaxChildFilter && !childHintRe.test(hay) && !urlHintMatched) continue;

    const dates = Array.isArray(meta.dates) && meta.dates.length ? meta.dates.slice() : [fallbackDate];
    if (cfg.appendFallbackDate === true && fallbackDate) {
      const fk = `${fallbackDate.y}-${fallbackDate.mo}-${fallbackDate.d}`;
      if (!dates.some((d) => `${d.y}-${d.mo}-${d.d}` === fk)) dates.push(fallbackDate);
    }
    let point = await geocodeForWard(buildWardGeoCandidates(source.label, title, meta.venue_name, meta.address).slice(0, 3), source);
    if (!point) point = { ...source.center };

    for (const d of dates) {
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, meta.timeRange, 10);
      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `ward:${source.key}:${row.url}:${title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: `ward_${source.key}`,
        source_label: source.label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name: meta.venue_name || `${source.label}\u5b50\u3069\u3082\u95a2\u9023\u65bd\u8a2d`,
        address: meta.address || "",
        url: row.url,
        lat: point.lat,
        lng: point.lng,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${source.label} \u5150\u7ae5\u9928`,
        tags: [`${source.key}_jidokan_event`, `${source.key}_kids`],
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

async function collectKitaJidokanEvents(maxDays) {
  let js = "";
  try {
    js = await fetchText(`${KITA_SOURCE.baseUrl}/education/event_edu.js`);
  } catch {
    return [];
  }
  const raw = (js.match(/events:\s*(\[[\s\S]*?\])\s*,\s*categories:/i) || [])[1] || "";
  if (!raw) return [];

  let events = [];
  try {
    events = JSON.parse(raw);
  } catch {
    try {
      events = new Function(`return (${raw});`)();
    } catch {
      events = [];
    }
  }
  if (!Array.isArray(events)) return [];

  const byId = new Map();
  for (const ev of events.slice(0, 1200)) {
    const title = normalizeText(ev?.eventtitle || "");
    if (!title) continue;
    const bodyText = normalizeText(ev?.description || "");
    const venue_name = normalizeText(ev?.place2 || "\u5317\u533a\u5150\u7ae5\u9928");
    const hay = `${title} ${venue_name} ${bodyText}`;
    if (!WARD_CHILD_HINT_RE.test(hay)) continue;

    let url = "";
    try {
      url = ev?.url ? new URL(String(ev.url), `${KITA_SOURCE.baseUrl}/`).toString() : "";
    } catch {
      url = "";
    }
    if (!url) continue;

    const opendays = Array.isArray(ev?.opendays) ? ev.opendays : [];
    if (opendays.length === 0) continue;
    const timeRange = parseTimeRangeFromText(`${(Array.isArray(ev?.times) ? ev.times.join(" ") : "")} ${ev?.time_texts || ""}`);

    let point = await geocodeForWard(buildWardGeoCandidates(KITA_SOURCE.label, title, venue_name, "").slice(0, 2), KITA_SOURCE);
    if (!point) point = { ...KITA_SOURCE.center };

    for (const dayText of opendays) {
      const m = String(dayText || "").match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/);
      if (!m) continue;
      const d = { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange, 10);
      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `ward:kita:${url}:${title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: "ward_kita",
        source_label: KITA_SOURCE.label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name,
        address: "",
        url,
        lat: point.lat,
        lng: point.lng,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${KITA_SOURCE.label} \u5150\u7ae5\u9928`,
        tags: ["kita_jidokan_event", "kita_kids_js"],
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

async function collectAdditionalWardsEvents(maxDays) {
  const configs = {
    chuo: {
      source: CHUO_SOURCE,
      listUrls: (m) => [`${CHUO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_target=1`],
      parseOpts: {
        blockRe: /<div id="tmp_event_cal_list">([\s\S]*?)<div id="event_cal_list_end_position">/i,
        urlAllow: /city\.chuo\.lg\.jp\/.+\.(?:html?|php)(?:\?|$)/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
    },
    bunkyo: {
      source: BUNKYO_SOURCE,
      listUrls: (m) => [
        `${BUNKYO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_target=1`,
        `${BUNKYO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_target=2`,
        `${BUNKYO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}`,
      ],
      parseOpts: {
        blockRe: /<div id="tmp_event_cal_list">([\s\S]*?)<div id="event_cal_list_end_position">/i,
        urlAllow: /city\.bunkyo\.lg\.jp\/.+\.(?:html?|php)(?:\?|$)/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
      relaxChildFilter: true,
      appendFallbackDate: true,
      allowRowFallbackOnDetailError: true,
      maxRows: 420,
    },
    taito: {
      source: TAITO_SOURCE,
      listUrls: (m, now) => [
        buildListCalendarUrl(`${TAITO_SOURCE.baseUrl}/event`, m, now),
        buildListCalendarUrl(`${TAITO_SOURCE.baseUrl}/event/kosodate/calendar`, m, now),
        buildListCalendarUrl(`${TAITO_SOURCE.baseUrl}/library/news/event_news/calendar`, m, now),
        `${TAITO_SOURCE.baseUrl}/library/news/event_news/calendar/list_calendar.html`,
        `${TAITO_SOURCE.baseUrl}/event/kosodate/index.html`,
        `${TAITO_SOURCE.baseUrl}/library/kodomo/index.html`,
        `${TAITO_SOURCE.baseUrl}/library/kodomo/allNewsList.html`,
        `${TAITO_SOURCE.baseUrl}/library/kodomo/kodomo_news/chuojidoshinchaku.html`,
      ],
      parseOpts: {
        blockRe: /<table[^>]*id="calendarlist"[^>]*>([\s\S]*?)<\/table>/i,
        urlAllow:
          /city\.taito\.lg\.jp\/(?:event\/(?:kosodate|kosodatekyouiku)|library\/kodomo|library\/news\/event_news|kosodate|kodomo|jidokan|jido)\/.+\.(?:html?|php)(?:\?|$)/i,
        urlDeny: /\/index\.html$/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
      relaxChildFilter: true,
      appendFallbackDate: true,
      allowRowFallbackOnDetailError: true,
      maxRows: 420,
    },
    sumida: {
      source: SUMIDA_SOURCE,
      listUrls: (m, now) => [
        buildListCalendarUrl(`${SUMIDA_SOURCE.baseUrl}/eventcalendar/kodomo_kosodate/calendar`, m, now),
        buildListCalendarUrl(`${SUMIDA_SOURCE.baseUrl}/eventcalendar/calendar`, m, now),
      ],
      parseOpts: {
        blockRe: /<table[^>]*id="calendarlist"[^>]*>([\s\S]*?)<\/table>/i,
        urlAllow: /city\.sumida\.lg\.jp\/.+\.(?:html?|php)(?:\?|$)/i,
        urlDeny: /\/(?:index|sitemap)\.html$/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
      relaxChildFilter: true,
      appendFallbackDate: true,
      allowRowFallbackOnDetailError: true,
      maxRows: 520,
    },
    koto: {
      source: KOTO_SOURCE,
      listUrls: (m, now) => [
        `${KOTO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_category=2`,
        `${KOTO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}`,
        `${KOTO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=1&year=${m.year}&month=${m.month}`,
        buildListCalendarUrl(`${KOTO_SOURCE.baseUrl}/event/kosodate/calendar`, m, now),
        `${KOTO_SOURCE.baseUrl}/kodomo/index.html`,
      ],
      parseOpts: {
        blockRe: /<table[^>]*class="event_cal_list"[^>]*>([\s\S]*?)<\/table>/i,
        urlAllow: /city\.koto\.lg\.jp\/.+\.(?:html?|php)(?:\?|$)/i,
        urlDeny: /\/(?:index|sitemap)\.html$/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
      maxRows: 420,
    },
    nakano: {
      source: NAKANO_SOURCE,
      listUrls: (m, now) => [
        buildListCalendarUrl(`${NAKANO_SOURCE.baseUrl}/event/kosodate/calendar`, m, now),
        buildListCalendarUrl(`${NAKANO_SOURCE.baseUrl}/event/calendar`, m, now),
      ],
      parseOpts: {
        blockRe: /<table[^>]*id="calendarlist"[^>]*>([\s\S]*?)<\/table>/i,
        urlAllow: /city\.tokyo-nakano\.lg\.jp\/(?:event|kosodate|kurashi\/bunka\/bunka\/kodomowakamono_bunka)\/.+\.(?:html?|php)(?:\?|$)/i,
        urlDeny: /\/index\.html$/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
    },
    suginami: {
      source: SUGINAMI_SOURCE,
      listUrls: (m) => [
        `${SUGINAMI_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5b50\u3069\u3082")}`,
        `${SUGINAMI_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5150\u7ae5")}`,
        `${SUGINAMI_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u89aa\u5b50")}`,
        `${SUGINAMI_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5b50\u80b2\u3066")}`,
        `${SUGINAMI_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}`,
        `${SUGINAMI_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=1&year=${m.year}&month=${m.month}`,
      ],
      parseOpts: {
        blockRe: /<div id="tmp_event_cal_list">([\s\S]*?)<div id="event_cal_list_end_position">/i,
        urlAllow: /city\.suginami\.tokyo\.jp\/.+\.(?:html?|php)(?:\?|$)/i,
        urlDeny: /\/(?:index|sitemap)\.html$/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
      relaxChildFilter: true,
      appendFallbackDate: true,
      allowRowFallbackOnDetailError: true,
      maxRows: 520,
    },
    toshima: {
      source: TOSHIMA_SOURCE,
      listUrls: (m) => {
        const base = [
          `${TOSHIMA_SOURCE.baseUrl}/cgi-bin/event_cal/calendar.cgi?type=2&year=${m.year}&month=${m.month}&page_target=1`,
          `${TOSHIMA_SOURCE.baseUrl}/cgi-bin/event_cal/calendar.cgi?type=2&year=${m.year}&month=${m.month}&page_target=0`,
          `${TOSHIMA_SOURCE.baseUrl}/cgi-bin/event_cal/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5b50\u3069\u3082")}`,
          `${TOSHIMA_SOURCE.baseUrl}/cgi-bin/event_cal/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5150\u7ae5")}`,
        ];
        const dayUrls = [];
        const days = getDaysInMonth(m.year, m.month);
        for (let d = 1; d <= days; d += 1) {
          dayUrls.push(`${TOSHIMA_SOURCE.baseUrl}/cgi-bin/event_cal/calendar.cgi?type=3&year=${m.year}&month=${m.month}&day=${d}`);
        }
        return [...base, ...dayUrls];
      },
      parseOpts: {
        blockRe: /<div id="tmp_event_cal_list">([\s\S]*?)<div id="event_cal_list_end_position">/i,
        urlAllow: /city\.toshima\.lg\.jp\/.+\.(?:html?|php)(?:\?|$)/i,
        urlDeny: /\/(?:index|sitemap)\.html$|\/(?:search_result|privacy|link|idkensaku)\.html$|\/012\/kuse\/koho\/|\/chosha\//i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
      relaxChildFilter: true,
      appendFallbackDate: true,
      allowRowFallbackOnDetailError: true,
    },
    arakawa: {
      source: ARAKAWA_SOURCE,
      listUrls: (m) => [
        `${ARAKAWA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_category=2&event_target=1`,
        `${ARAKAWA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=1&year=${m.year}&month=${m.month}`,
      ],
      parseOpts: {
        blockRe: /<ul class="event_item_list">([\s\S]*?)<\/ul>/i,
        urlAllow: /city\.arakawa\.tokyo\.jp\/.+\.html/i,
        urlDeny: /\/(?:index|sitemap)\.html$/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
      childHintRe: WARD_CHILD_HINT_RE,
    },
    itabashi: {
      source: ITABASHI_SOURCE,
      listUrls: (m) => [
        `${ITABASHI_SOURCE.baseUrl}/kosodate/1000930/index.html`,
        `${ITABASHI_SOURCE.baseUrl}/kosodate/1000930/etc/`,
        `${ITABASHI_SOURCE.baseUrl}/kosodate/1000930/etc/index.html`,
        `${ITABASHI_SOURCE.baseUrl}/kosodate/asobiba/jidoukan/index.html`,
        `${ITABASHI_SOURCE.baseUrl}/kosodate/asobiba/jidoukan/1047271.html`,
        `${ITABASHI_SOURCE.baseUrl}/kosodate/asobiba/jidoukan/1053207.html`,
        `${ITABASHI_SOURCE.baseUrl}/cgi-bin/event/event.cgi?year=${m.year}&month=${m.month}&day=1&mode_link=1&prev=1&c50=50`,
        `${ITABASHI_SOURCE.baseUrl}/cgi-bin/event/event.cgi?year=${m.year}&month=${m.month}&day=1&mode_link=2&prev=1&c50=50`,
        `${ITABASHI_SOURCE.baseUrl}/cgi-bin/event/event.cgi?year=${m.year}&month=${m.month}&day=1&mode_link=2&prev=2&c50=50`,
        `${ITABASHI_SOURCE.baseUrl}/cgi-bin/event/event.cgi?&prev=2&c50=50`,
      ],
      parseOpts: {
        urlAllow:
          /city\.itabashi\.tokyo\.jp\/(?:kosodate\/(?:1000930|asobiba\/jidoukan)|_res\/projects\/default_project\/_page_)\/.+\.(?:html?|pdf)(?:\?|$)/i,
        urlDeny: /\/(?:index|sitemap)\.html$|\/cgi-crm\//i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
      relaxChildFilter: true,
      appendFallbackDate: true,
      allowRowFallbackOnDetailError: true,
      allowPdfDetail: true,
      maxRows: 900,
    },
    nerima: {
      source: NERIMA_SOURCE,
      listUrls: (m, now) => [
        `${NERIMA_SOURCE.baseUrl}/kosodatekyoiku/kodomo/jidokan/index.html`,
        `${NERIMA_SOURCE.baseUrl}/kosodatekyoiku/kodomo/jidokan/nikoniko/nerima.html`,
        `${NERIMA_SOURCE.baseUrl}/kosodatekyoiku/kodomo/jidokan/nikoniko/shakuiji.html`,
        `${NERIMA_SOURCE.baseUrl}/kosodatekyoiku/kodomo/jidokan/nikoniko/oizumi.html`,
        `${NERIMA_SOURCE.baseUrl}/kosodatekyoiku/kodomo/jidokan/nikoniko/hikarigaoka.html`,
        `${NERIMA_SOURCE.baseUrl}/shisetsu/hokenfuku/fukushi/koseibunka/jido/club_gyouji.html`,
        `${NERIMA_SOURCE.baseUrl}/kosodatekyoiku/kodomo/index.html`,
        buildListCalendarUrl(`${NERIMA_SOURCE.baseUrl}/kankomoyoshi/event/kodomo/calendar`, m, now),
        buildListCalendarUrl(`${NERIMA_SOURCE.baseUrl}/kankomoyoshi/event/calendar`, m, now),
        buildListCalendarUrl(`${NERIMA_SOURCE.baseUrl}/kankomoyoshi/event/bunka/calendar`, m, now),
        buildListCalendarUrl(`${NERIMA_SOURCE.baseUrl}/kankomoyoshi/event/chiiki/calendar`, m, now),
        buildListCalendarUrl(`${NERIMA_SOURCE.baseUrl}/kankomoyoshi/event/sports/calendar`, m, now),
        buildListCalendarUrl(`${NERIMA_SOURCE.baseUrl}/kankomoyoshi/event/sonota/calendar`, m, now),
        `${NERIMA_SOURCE.baseUrl}/kankomoyoshi/event/kodomo/index.html`,
        `${NERIMA_SOURCE.baseUrl}/kankomoyoshi/event/index.html`,
      ],
      parseOpts: {
        urlAllow: /city\.nerima\.tokyo\.jp\/(?:kosodatekyoiku\/kodomo|shisetsu\/hokenfuku\/fukushi\/koseibunka\/jido|kankomoyoshi\/event|event)\/.+\.(?:html?|php)(?:\?|$)/i,
        urlDeny: /\/(?:index|sitemap)\.html$|\/aboutweb\/|\/photo\.html$|\/riyou-annai\.html$/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
      childHintRe: WARD_CHILD_HINT_RE,
      appendFallbackDate: true,
      allowRowFallbackOnDetailError: true,
      maxRows: 420,
    },
    adachi: {
      source: ADACHI_SOURCE,
      listUrls: (m) => [`${ADACHI_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=1&year=${m.year}&month=${m.month}`],
      parseOpts: {
        blockRe: /<table[^>]*class="event_cal_7w"[^>]*>([\s\S]*?)<\/table>/i,
        urlAllow: /city\.adachi\.tokyo\.jp\/.+\.(?:html?|php)(?:\?|$)/i,
        urlDeny: /\/(?:index|sitemap|search_index)\.html/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
    },
    katsushika: {
      source: KATSUSHIKA_SOURCE,
      listUrls: (m) => [`${KATSUSHIKA_SOURCE.baseUrl}/cgi-bins/event/event.cgi?year=${m.year}&month=${m.month}&cate=21`],
      parseOpts: {
        blockRe: /<ul class="listlink">([\s\S]*?)<\/ul>/i,
        urlAllow: /city\.katsushika\.lg\.jp\/(?:event|kosodate)\/.+\.html/i,
        urlDeny: /\/event\/index\.html$/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
    },
    edogawa: {
      source: EDOGAWA_SOURCE,
      listUrls: (m) => [
        `${EDOGAWA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&siteid=6&event_target=1`,
      ],
      parseOpts: {
        urlAllow: /city\.edogawa\.tokyo\.jp\/(?:event|kosodate|shisetsu)\/.+\.html/i,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
    },
    shinjuku: {
      source: SHINJUKU_SOURCE,
      listUrls: (m) => [`${SHINJUKU_SOURCE.baseUrl}/event/calendar/calendar.php?Y=${m.year}&M=${m.month}`],
      parseOpts: {
        dayBlockRe: /<div[^>]*class="eventSelectDay[^"]*"[^>]*>[\s\S]*?<p>\s*(\d{1,2})\u65e5[\s\S]*?<ul>([\s\S]*?)<\/ul>[\s\S]*?<\/div>/gi,
        urlAllow: /city\.shinjuku\.lg\.jp\/.+\.(?:html?|php)(?:\?|$)/i,
        skipTr: true,
        useAnchorFallback: true,
        fallbackWhenRowsExist: true,
      },
      requirePreHint: false,
    },
  };

  const [
    chuoBase,
    chuoAkachan,
    bunkyo,
    taito,
    sumida,
    koto,
    nakano,
    suginami,
    toshima,
    kita,
    arakawa,
    itabashi,
    nerima,
    adachi,
    katsushika,
    edogawa,
    shinjuku,
  ] = await Promise.all([
    collectWardGenericEvents(configs.chuo.source, maxDays, configs.chuo),
    collectChuoAkachanTengokuEvents(maxDays),
    collectWardGenericEvents(configs.bunkyo.source, maxDays, configs.bunkyo),
    collectWardGenericEvents(configs.taito.source, maxDays, configs.taito),
    collectWardGenericEvents(configs.sumida.source, maxDays, configs.sumida),
    collectWardGenericEvents(configs.koto.source, maxDays, configs.koto),
    collectWardGenericEvents(configs.nakano.source, maxDays, configs.nakano),
    collectWardGenericEvents(configs.suginami.source, maxDays, configs.suginami),
    collectWardGenericEvents(configs.toshima.source, maxDays, configs.toshima),
    collectKitaJidokanEvents(maxDays),
    collectWardGenericEvents(configs.arakawa.source, maxDays, configs.arakawa),
    collectWardGenericEvents(configs.itabashi.source, maxDays, configs.itabashi),
    collectWardGenericEvents(configs.nerima.source, maxDays, configs.nerima),
    collectWardGenericEvents(configs.adachi.source, maxDays, configs.adachi),
    collectWardGenericEvents(configs.katsushika.source, maxDays, configs.katsushika),
    collectWardGenericEvents(configs.edogawa.source, maxDays, configs.edogawa),
    collectWardGenericEvents(configs.shinjuku.source, maxDays, configs.shinjuku),
  ]);

  const chuo = [];
  const seenChuo = new Set();
  for (const ev of [...chuoBase, ...chuoAkachan]) {
    const k = `${ev.url}|${ev.title}|${ev.starts_at}`;
    if (seenChuo.has(k)) continue;
    seenChuo.add(k);
    chuo.push(ev);
  }
  chuo.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return {
    chuo,
    bunkyo,
    taito,
    sumida,
    koto,
    nakano,
    suginami,
    toshima,
    kita,
    arakawa,
    itabashi,
    nerima,
    adachi,
    katsushika,
    edogawa,
    shinjuku,
  };
}

async function getEvents(maxDays, refresh) {
  const days = Math.min(Math.max(Number(maxDays) || 30, 1), 90);
  const cacheKey = `jidokan:${days}`;
  const isFresh = cache.data && cache.key === cacheKey && Date.now() - cache.savedAt < CACHE_TTL_MS;
  if (!refresh && isFresh) {
    return {
      ...cache.data,
      from_cache: true,
      snapshot_saved_at: new Date(cache.savedAt).toISOString(),
    };
  }

  const [setagaya, ota, shinagawa, meguro, shibuya, minato, chiyoda, additional] = await Promise.all([
    collectSetagayaJidokanEvents(days),
    collectOtaJidokanEvents(days),
    collectShinagawaJidokanEvents(days),
    collectMeguroJidokanEvents(days),
    collectShibuyaJidokanEvents(days),
    collectMinatoJidokanEvents(days),
    collectChiyodaJidokanEvents(days),
    collectAdditionalWardsEvents(days),
  ]);
  const {
    chuo,
    bunkyo,
    taito,
    sumida,
    koto,
    nakano,
    suginami,
    toshima,
    kita,
    arakawa,
    itabashi,
    nerima,
    adachi,
    katsushika,
    edogawa,
    shinjuku,
  } = additional;
  const items = [
    ...setagaya,
    ...ota,
    ...shinagawa,
    ...meguro,
    ...shibuya,
    ...minato,
    ...chiyoda,
    ...chuo,
    ...bunkyo,
    ...taito,
    ...sumida,
    ...koto,
    ...nakano,
    ...suginami,
    ...toshima,
    ...kita,
    ...arakawa,
    ...itabashi,
    ...nerima,
    ...adachi,
    ...katsushika,
    ...edogawa,
    ...shinjuku,
  ].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at)
  );
  const now = parseYmdFromJst(new Date());
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + days);
  const endJst = parseYmdFromJst(end);

  const payload = {
    date_jst: `${now.key}..${endJst.key}`,
    count: items.length,
    source: "tokyo_jidokan",
    debug_counts: {
      raw: {
        ward_setagaya: setagaya.length,
        ward_ota: ota.length,
        ward_shinagawa: shinagawa.length,
        ward_meguro: meguro.length,
        ward_shibuya: shibuya.length,
        ward_minato: minato.length,
        ward_chiyoda: chiyoda.length,
        ward_chuo: chuo.length,
        ward_bunkyo: bunkyo.length,
        ward_taito: taito.length,
        ward_sumida: sumida.length,
        ward_koto: koto.length,
        ward_nakano: nakano.length,
        ward_suginami: suginami.length,
        ward_toshima: toshima.length,
        ward_kita: kita.length,
        ward_arakawa: arakawa.length,
        ward_itabashi: itabashi.length,
        ward_nerima: nerima.length,
        ward_adachi: adachi.length,
        ward_katsushika: katsushika.length,
        ward_edogawa: edogawa.length,
        ward_shinjuku: shinjuku.length,
      },
      filtered: {
        ward_setagaya: setagaya.length,
        ward_ota: ota.length,
        ward_shinagawa: shinagawa.length,
        ward_meguro: meguro.length,
        ward_shibuya: shibuya.length,
        ward_minato: minato.length,
        ward_chiyoda: chiyoda.length,
        ward_chuo: chuo.length,
        ward_bunkyo: bunkyo.length,
        ward_taito: taito.length,
        ward_sumida: sumida.length,
        ward_koto: koto.length,
        ward_nakano: nakano.length,
        ward_suginami: suginami.length,
        ward_toshima: toshima.length,
        ward_kita: kita.length,
        ward_arakawa: arakawa.length,
        ward_itabashi: itabashi.length,
        ward_nerima: nerima.length,
        ward_adachi: adachi.length,
        ward_katsushika: katsushika.length,
        ward_edogawa: edogawa.length,
        ward_shinjuku: shinjuku.length,
      },
      implemented_wards: [
        SETAGAYA_SOURCE.label,
        OTA_SOURCE.label,
        SHINAGAWA_SOURCE.label,
        MEGURO_SOURCE.label,
        SHIBUYA_SOURCE.label,
        MINATO_SOURCE.label,
        CHIYODA_SOURCE.label,
        CHUO_SOURCE.label,
        BUNKYO_SOURCE.label,
        TAITO_SOURCE.label,
        SUMIDA_SOURCE.label,
        KOTO_SOURCE.label,
        NAKANO_SOURCE.label,
        SUGINAMI_SOURCE.label,
        TOSHIMA_SOURCE.label,
        KITA_SOURCE.label,
        ARAKAWA_SOURCE.label,
        ITABASHI_SOURCE.label,
        NERIMA_SOURCE.label,
        ADACHI_SOURCE.label,
        KATSUSHIKA_SOURCE.label,
        EDOGAWA_SOURCE.label,
        SHINJUKU_SOURCE.label,
      ],
    },
    items,
    refresh_in_progress: false,
  };

  cache = {
    key: cacheKey,
    data: payload,
    savedAt: Date.now(),
  };

  return {
    ...payload,
    from_cache: false,
    snapshot_saved_at: new Date(cache.savedAt).toISOString(),
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/events") {
    try {
      const days = Number(url.searchParams.get("days") || "30");
      const refresh = url.searchParams.get("refresh") === "1";
      const data = await getEvents(days, refresh);
      sendJson(res, 200, data);
    } catch (err) {
      sendJson(res, 500, {
        error: "failed_to_fetch_setagaya_events",
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    sendFile(res, path.join(PUBLIC_DIR, "index.html"));
    return;
  }

  const candidate = path.join(PUBLIC_DIR, url.pathname);
  if (!candidate.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }
  sendFile(res, candidate);
});

server.listen(PORT, () => {
  console.log(`kids-play-map running on http://localhost:${PORT}`);
});

