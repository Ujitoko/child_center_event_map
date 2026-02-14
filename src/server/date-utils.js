const { normalizeText, normalizeJaDigits, normalizeJapaneseEraYears } = require("./text-utils");
const { stripTags } = require("./html-utils");

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

  const rangeRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*[～〜\-－]\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  let m;
  while ((m = rangeRe.exec(text)) !== null) {
    spans.push({
      start: { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) },
      end: { y: Number(m[4]), mo: Number(m[5]), d: Number(m[6]) },
    });
  }

  const singleRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
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
  const jpRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  while ((m = jpRe.exec(html)) !== null) push(Number(m[1]), Number(m[2]), Number(m[3]));

  const slashRe = /(\d{4})\/(\d{1,2})\/(\d{1,2})/g;
  while ((m = slashRe.exec(html)) !== null) push(Number(m[1]), Number(m[2]), Number(m[3]));

  return out;
}

function parseOtaDatesFromText(textRaw, baseY, baseMo) {
  const text = normalizeText(textRaw);
  const out = [];
  const push = (y, mo, d) => {
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return;
    out.push({ y, mo, d });
  };
  let m;

  const ymdRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  while ((m = ymdRe.exec(text)) !== null) push(Number(m[1]), Number(m[2]), Number(m[3]));

  const mdRangeRe = /(\d{1,2})月\s*(\d{1,2})日\s*[～〜\-－]\s*(\d{1,2})月\s*(\d{1,2})日/g;
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

  const mdRe = /(\d{1,2})月\s*(\d{1,2})日/g;
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

function parseJpYearMonth(textRaw) {
  const text = normalizeText(textRaw);
  let m = text.match(/(\d{4})年\s*(\d{1,2})月/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]) };
  m = text.match(/令和\s*(\d{1,2})年\s*(\d{1,2})月/u);
  if (m) return { y: 2018 + Number(m[1]), mo: Number(m[2]) };
  const now = parseYmdFromJst(new Date());
  return { y: now.y, mo: now.m };
}

function buildDateKey(y, mo, d) {
  return `${Number(y)}-${Number(mo)}-${Number(d)}`;
}

function buildStartsEndsForDate(d, timeRange) {
  const hasStartTime = Boolean(timeRange && Number.isFinite(timeRange.startHour));
  const startHour = hasStartTime ? Number(timeRange.startHour) : 0;
  const startMinute = hasStartTime && Number.isFinite(timeRange.startMinute) ? Number(timeRange.startMinute) : 0;
  const startDate = toJstDate(d.y, d.mo, d.d, startHour, startMinute);
  let endIso = null;
  if (timeRange && Number.isFinite(timeRange.endHour)) {
    const endHour = Number(timeRange.endHour);
    const endMinute = Number.isFinite(timeRange.endMinute) ? Number(timeRange.endMinute) : 0;
    let endDate = toJstDate(d.y, d.mo, d.d, endHour, endMinute);
    if (endDate.getTime() < startDate.getTime()) endDate = new Date(endDate.getTime() + 86400000);
    endIso = endDate.toISOString();
  }
  const timeUnknown = !hasStartTime;
  return { startsAt: startDate.toISOString(), endsAt: endIso, timeUnknown };
}

function parseTimeRangeFromText(textRaw) {
  const text = normalizeJaDigits(normalizeText(textRaw))
    .replace(/(\d{1,2})\s*時(?!\s*\d)/g, "$1:00")
    .replace(/午前/g, "AM ")
    .replace(/午後/g, "PM ")
    .replace(/時半/g, ":30")
    .replace(/[〜～ー－−]/g, "~")
    .replace(/から/g, "~");
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
    /(?:\b(AM|PM)\s*)?(\d{1,2})(\s*(?::|時)\s*(\d{1,2}))?\s*(?:分)?\s*(?:~|-)\s*(?:\b(AM|PM)\s*)?(\d{1,2})(\s*(?::|時)\s*(\d{1,2}))?\s*(?:分)?/i;
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
  const singleRe = /(?:\b(AM|PM)\s*)?(\d{1,2})(\s*(?::|時)\s*(\d{1,2}))?\s*(?:分)?/i;
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

function parseDateSpecificTimeRanges(textRaw, dates, baseY, baseMo) {
  const text = normalizeJapaneseEraYears(normalizeJaDigits(String(textRaw || "")));
  if (!text) return {};
  const out = {};
  const targetDates = Array.isArray(dates) ? dates : [];
  const register = (d, snippet) => {
    if (!d || !Number.isFinite(d.y) || !Number.isFinite(d.mo) || !Number.isFinite(d.d)) return;
    const key = buildDateKey(d.y, d.mo, d.d);
    if (out[key]) return;
    const tr = parseTimeRangeFromText(snippet);
    if (tr) out[key] = tr;
  };

  for (const d of targetDates) {
    const key = buildDateKey(d.y, d.mo, d.d);
    if (out[key]) continue;
    const patterns = [
      new RegExp(`${d.y}\\s*年\\s*${d.mo}\\s*月\\s*${d.d}\\s*日`, "g"),
      new RegExp(`${d.mo}\\s*月\\s*${d.d}\\s*日`, "g"),
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(text)) !== null) {
        const from = Math.max(0, m.index - 40);
        const to = Math.min(text.length, m.index + m[0].length + 90);
        register(d, text.slice(from, to));
        if (out[key]) break;
      }
      if (out[key]) break;
    }
  }

  if (Object.keys(out).length === 0) {
    const pairRe =
      /(?:(20\d{2})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日[\s\S]{0,48}?((?:午前|午後)?\s*\d{1,2}\s*(?::|時)\s*\d{0,2}\s*(?:分)?\s*(?:~|-|〜|～|ー|から)\s*(?:午前|午後)?\s*\d{1,2}\s*(?::|時)\s*\d{0,2}\s*(?:分)?|(?:午前|午後)?\s*\d{1,2}\s*(?::|時)\s*\d{0,2}\s*(?:分)?)/g;
    let m;
    while ((m = pairRe.exec(text)) !== null) {
      let y = m[1] ? Number(m[1]) : Number(baseY);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (!m[1] && Number.isFinite(mo) && Number.isFinite(baseMo) && mo < Number(baseMo) - 6) y += 1;
      register({ y, mo, d }, m[4] || "");
    }
  }
  return out;
}

function inferChiyodaMonthlyFallbackDate(title, baseY, baseMo) {
  const text = normalizeText(normalizeJaDigits(normalizeJapaneseEraYears(title)));
  const m = text.match(/(\d{1,2})\s*月/);
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

function parseYmdFromJpText(textRaw) {
  const text = normalizeJaDigits(normalizeText(textRaw));
  let m = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  m = text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  return null;
}

function parseMonthDayFromTextWithBase(textRaw, baseY, baseMo) {
  const text = normalizeJaDigits(normalizeText(textRaw));
  const out = [];
  const re = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
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

function parseOtaBaseYearMonth(html) {
  const t = `${stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "")} ${stripTags(
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ""
  )}`;
  let m = t.match(/令和\s*([0-9]{1,2})年\s*([0-9]{1,2})月/u);
  if (m) {
    return { y: 2018 + Number(m[1]), mo: Number(m[2]) };
  }
  m = t.match(/(\d{4})年\s*(\d{1,2})月/u);
  if (m) return { y: Number(m[1]), mo: Number(m[2]) };
  const now = parseYmdFromJst(new Date());
  return { y: now.y, mo: now.m };
}

module.exports = {
  alignMonthlyFallbackDate,
  buildDateKey,
  buildStartsEndsForDate,
  explodeSpanToDates,
  getDaysInMonth,
  getMonthsForRange,
  inRangeJst,
  inferChiyodaMonthlyFallbackDate,
  parseChiyodaSlashDates,
  parseDateSpans,
  parseDateSpecificTimeRanges,
  parseDatesFromHtml,
  parseJpYearMonth,
  parseMonthDayFromTextWithBase,
  parseOtaBaseYearMonth,
  parseOtaDatesFromText,
  parseTimeRangeFromText,
  parseYmdFromJpText,
  parseYmdFromJst,
  toJstDate,
};
