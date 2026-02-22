const { scoreJapaneseText } = require("./text-utils");

const MAX_CONCURRENT = 12;
let active = 0;
const queue = [];
const lastFetchByDomain = new Map();
const PER_DOMAIN_DELAY_MS = 200;

async function acquireSlot(domain) {
  const last = lastFetchByDomain.get(domain) || 0;
  const wait = Math.max(0, PER_DOMAIN_DELAY_MS - (Date.now() - last));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  if (active >= MAX_CONCURRENT) {
    await new Promise((r) => queue.push(r));
  }
  active++;
  lastFetchByDomain.set(domain, Date.now());
}

function releaseSlot() {
  active--;
  if (queue.length > 0) queue.shift()();
}

async function fetchText(url, opts) {
  const timeoutMs = (opts && opts.timeout) || 20000;
  let domain = "";
  try { domain = new URL(url).hostname; } catch { domain = "unknown"; }
  await acquireSlot(domain);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(timeoutMs),
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
  } finally {
    releaseSlot();
  }
}

function buildChiyodaPdfProxyUrl(pdfUrl) {
  const normalized = String(pdfUrl || "").replace(/^https?:\/\//i, "");
  return `https://r.jina.ai/http://${normalized}`;
}

async function fetchChiyodaPdfMarkdown(pdfUrl) {
  const proxyUrl = buildChiyodaPdfProxyUrl(pdfUrl);
  let domain = "";
  try { domain = new URL(proxyUrl).hostname; } catch { domain = "jina"; }
  await acquireSlot(domain);
  try {
    const res = await fetch(proxyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "text/plain,text/markdown;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(50000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${proxyUrl}`);
    return await res.text();
  } finally {
    releaseSlot();
  }
}

module.exports = {
  buildChiyodaPdfProxyUrl,
  fetchChiyodaPdfMarkdown,
  fetchText,
};
