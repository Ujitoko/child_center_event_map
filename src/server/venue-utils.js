const { normalizeText, sanitizeVenueText } = require("./text-utils");
const { JIDOKAN_HINTS } = require("../config/wards");

function extractVenueFromTitle(title) {
  const t = String(title || "");
  const hiroba = t.match(/([^\s]{1,40}子育て児童ひろば)/u);
  if (hiroba) return hiroba[1];
  const m = t.match(/([^\s]{1,40}児童館)/u);
  if (m) return m[1];
  // Abbreviated: 烏山児館 → 烏山児童館
  const abbr = t.match(/([^\s]{1,20})児館/u);
  if (abbr) return `${abbr[1]}児童館`;
  // Parenthesized venue: （北沢子どもの居場所）, （弁天児童遊園）
  const paren = t.match(/[（(]([^）)]{2,30}(?:子どもの居場所|児童遊園|プレーパーク|プレーリヤカー))[）)]/u)
    || t.match(/[（(]([^）)]{2,30}(?:児童館|児童センター|ひろば))[）)]/u);
  if (paren) return paren[1];
  return "世田谷区児童館";
}

function inferWardVenueFromTitle(title, sourceLabel) {
  const text = normalizeText(title);
  if (!text) return `${sourceLabel}子ども関連施設`;
  const facilityPat =
    "(?:児童館|児童センター|児童会館|子ども交流館|交流館|子どもセンター|子ども家庭支援センター|子育て支援センター|すこやか福祉センター|福祉センター|住区センター|区民センター|区民活動センター|文化センター|子育てひろば|子ども・子育てプラザ|子育てプラザ|こどもプラザ|わんぱくひろば|ひろば|プラザ|図書館|学習センター|コミュニティセンター|保育園|保健センター)";
  const paren = text.match(
    new RegExp(`[（(]([^）)]{2,100}${facilityPat}[^）)]{0,30})[）)]`, "u")
  );
  if (paren) return sanitizeVenueText(paren[1]);
  // Bracketed venue at start of title: 【ギャラクシティ】, 【XX児童館】
  const bracket = text.match(/^【([^】]{2,40})】/u);
  if (bracket) {
    const v = sanitizeVenueText(bracket[1]);
    if (v && v.length >= 2 && v.length <= 40 && !/^(お知らせ|注意|重要|中止|延期|開催|募集|変更|参加|無料|有料|予約|速報)/.test(v)) return v;
  }
  const inline = text.match(
    new RegExp(`([^\\s]{2,100}${facilityPat})(?:[^\\s令和平成年月日0-9０-９]{0,10})`, "u")
  );
  if (inline) return sanitizeVenueText(inline[1]);
  // Fallback: extract last parenthesized text if it looks like a venue name
  const lastParen = text.match(/[（(]([^）)]{2,40})[）)]\s*$/u) || text.match(/[（(]([^）)]{2,40})[）)]/gu);
  if (lastParen) {
    const candidate = typeof lastParen === "string" ? lastParen : (lastParen[lastParen.length - 1] || "");
    const inner = (candidate.match(/[（(]([^）)]{2,40})[）)]/) || [])[1] || "";
    const v = sanitizeVenueText(inner);
    if (v && v.length >= 3 && v.length <= 40
      && !/^令和|^平成|^\d|^[0-9０-９]|月|日$|時|年度|詳細|募集|申込|無料|有料|要予約|抽選|先着|当日|事前|オンライン|^PDF/.test(v)) {
      return v;
    }
  }
  return `${sourceLabel}子ども関連施設`;
}

function inferVenueFromTitleSupplement(title, sourceLabel) {
  const text = normalizeText(title);
  if (!text) return "";
  const facilityWord =
    "(?:図書館|分室|児童館|児童センター|児童会館|子ども交流館|交流館|子どもセンター|子ども家庭支援センター|子育て支援センター|すこやか福祉センター|福祉センター|住区センター|区民センター|区民活動センター|文化センター|学習センター|コミュニティセンター|こどもとしょしつ|としょしつ|ひろば|プラザ|会館|ホール|保育園|保健センター)";

  let m = text.match(new RegExp(`【([^】]{2,80}${facilityWord}[^】]{0,30})】`, "u"));
  if (m) {
    const v = sanitizeVenueText(m[1]);
    if (v && v !== `${sourceLabel}子ども関連施設`) return v;
  }

  m = text.match(new RegExp(`([^\n\\s]{2,80}${facilityWord})(?:[^\n\\s令和平成年月日0-9０-９]{0,10})`, "u"));
  if (m) {
    const v = sanitizeVenueText(m[1]);
    if (v && v !== `${sourceLabel}子ども関連施設`) return v;
  }

  return "";
}

function inferRegionalVenueFromTitle(sourceKey, title) {
  if (String(sourceKey || "") !== "nerima") return "";
  const text = normalizeText(title);
  if (!text || !/にこにこ/.test(text)) return "";
  const region =
    (text.match(/(練馬地域|石神井地域|大泉地域|光が丘地域)/) || [])[1] ||
    (text.match(/〒\s*17[6-9]\s*([^\s　]{2,12}地域)/) || [])[1] ||
    "";
  if (!region) return "";
  return `${region} にこにこ`;
}

function inferWardVenueFromUrl(sourceKey, url) {
  const key = String(sourceKey || "");
  const href = normalizeText(url);
  if (!href) return "";
  let pathname = "";
  try {
    pathname = new URL(href).pathname.toLowerCase();
  } catch {
    pathname = href.toLowerCase();
  }

  if (key === "kita") {
    const kitaMap = {
      shimojidoukan: "志茂子ども交流館",
      akabane_jido: "赤羽児童館",
      jujo_dai_jido: "十条台子どもセンター",
      jujodai_kodomo: "十条台子どもセンター",
      takinogawa_higashi_jido: "滝野川東児童館",
      takinogawa_nishi_jido: "滝野川西児童館",
      ukima_jido: "浮間児童館",
      nishigaoka_jido: "西が丘児童館",
      ouji_jido: "王子児童館",
      kamiya_jido: "神谷児童館",
      nakazato_jido: "中里児童館",
      tabata_jido: "田端児童館",
      akabane_nishi_jido: "赤羽西児童館",
      iwabuchi_jido: "岩淵児童館",
      sakurada_jido: "桜田児童館",
      "childrens-center/ukima": "浮間児童館",
      "childrens-center/shimo": "志茂子ども交流館",
      "childrens-center/akabane": "赤羽児童館",
      "childrens-center/jujodai": "十条台子どもセンター",
      "childrens-center/kamijujo-higashi": "上十条東児童館",
      "childrens-center/takinogawa-higashi": "滝野川東児童館",
      "childrens-center/takinogawa-nishi": "滝野川西児童館",
      "childrens-center/nishigaoka": "西が丘児童館",
      "childrens-center/ouji": "王子児童館",
      "childrens-center/kamiya": "神谷児童館",
      "childrens-center/nakazato": "中里児童館",
      "childrens-center/tabata": "田端児童館",
      "childrens-center/akabane-nishi": "赤羽西児童館",
      "childrens-center/iwabuchi": "岩淵児童館",
      "childrens-center/sakurada": "桜田児童館",
    };
    for (const [token, venue] of Object.entries(kitaMap)) {
      if (token.includes("/")) {
        if (pathname.includes(`/${token}/`)) return venue;
      } else {
        if (pathname.includes(`/${token}/`) || pathname.includes(`/${token}.`)) return venue;
      }
    }
  }

  if (key === "nerima") {
    if (/\/shisetsu\/hokenfuku\/fukushi\/koseibunka\/jido\//.test(pathname)) return "厚生文化会館";
    const nikoniko = pathname.match(/\/jidokan\/nikoniko\/([a-z0-9_-]+)\.html/);
    if (nikoniko) {
      const m = nikoniko[1];
      if (m === "nerima") return "練馬地域 にこにこ";
      if (m === "shakuiji") return "石神井地域 にこにこ";
      if (m === "oizumi") return "大泉地域 にこにこ";
      if (m === "hikarigaoka") return "光が丘地域 にこにこ";
    }

    const map = {
      shakujii_jidokan: "石神井児童館",
      kamishakujii: "上石神井児童館",
      hikarigaoka: "光が丘児童館",
      sakaecho: "栄町児童館",
      nakamura_jidokan: "中村児童館",
      miharadai: "三原台児童館",
      heiwadai: "平和台児童館",
      harunohi: "北町はるのひ児童館",
      higashioizumi: "東大泉児童館",
      minamitanaka: "南田中児童館",
      kitamachi: "北町児童館",
    };
    for (const [token, venue] of Object.entries(map)) {
      if (pathname.includes(`/${token}/`) || pathname.endsWith(`/${token}.html`)) return venue;
    }
  }
  return "";
}

function isLikelyAudienceText(textRaw) {
  const text = normalizeText(textRaw);
  if (!text) return false;
  return /^(?:どなたでも|区内在住|在勤|在学|小学[0-9０-９]*年?生?|小・中学生|中学|中学生|高校|高校生|未就学|乳幼児|親子|保護者|[0-9０-９]+歳(?:以上|から|未満|まで)?|上記をご確認ください)/.test(
    text
  );
}

function isLikelyDepartmentVenue(textRaw) {
  const text = normalizeText(textRaw);
  if (!text) return false;
  if (isLikelyAudienceText(text)) return true;
  if (/(児童館|児童センター|児童会館|子ども交流館|交流館|子どもセンター|子ども|こども|ひろば|プラザ|会館|図書館|学習センター|コミュニティセンター|保育園|福祉センター|区民センター|住区センター|区民活動センター|文化センター|保健センター|学校|公園|未来館)/.test(text)) return false;
  return /(部|課|係|担当|組織|推進|支援|保育サービス|保育課|環境課)/.test(text);
}

function isOnlineOnlyWithoutPlace(textRaw) {
  const text = normalizeText(textRaw);
  if (!text) return false;
  const online = /(オンライン|web|zoom|youtube|配信|録画)/i.test(text);
  if (!online) return false;
  const physical = /(児童館|図書館|分室|センター|ひろば|プラザ|会館|ホール|体育館|学校|公園|住所|所在地)/.test(text);
  return !physical;
}

function isJunkVenueName(venueName) {
  const v = normalizeText(venueName);
  if (!v) return true;
  if (v.length <= 3 && /^[\u3040-\u309F]+$/.test(v)) return true;
  if (/innerHTML|getElementById|getTracker|function\s*\(|\.php|\.js|UA-\d/i.test(v)) return true;
  if (/^(ホール|テナント|募集終了|例|募集案内|err)$/i.test(v)) return true;
  if (/^[月火水木金土日・、（）()\s\d:：～〜時分]+$/.test(v)) return true;
  return false;
}

function isGenericWardVenueName(venueName, wardLabel) {
  const v = normalizeText(venueName);
  const w = normalizeText(wardLabel);
  if (!v || !w) return false;
  const re = new RegExp(`^${w}(?:子ども関連施設|児童館|児童センター|子育てイベント)$`);
  return re.test(v);
}

function hasJidokanHint(text) {
  const t = normalizeText(text);
  return JIDOKAN_HINTS.some((x) => t.includes(x));
}

module.exports = {
  extractVenueFromTitle,
  hasJidokanHint,
  inferRegionalVenueFromTitle,
  inferVenueFromTitleSupplement,
  inferWardVenueFromTitle,
  inferWardVenueFromUrl,
  isGenericWardVenueName,
  isJunkVenueName,
  isLikelyAudienceText,
  isLikelyDepartmentVenue,
  isOnlineOnlyWithoutPlace,
};
