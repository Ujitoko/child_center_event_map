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
  // Non-start bracketed venue: 1歳6か月児健康診査【新里総合センター】
  const midBracket = text.match(/【([^】]{2,40})】/u);
  if (midBracket && midBracket.index > 0) {
    const v = sanitizeVenueText(midBracket[1]);
    if (v && v.length >= 3 && v.length <= 40
      && /(?:センター|児童館|保健|ひろば|会館|ホール|プラザ|図書館|体育館|公民館|保育園|福祉|総合)/.test(v)
      && !/^(お知らせ|注意|重要|中止|延期|開催|募集|変更|参加|無料|有料|予約|速報)/.test(v)) return v;
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
      "childrens-center/fukuro": "袋児童館",
      "childrens-center/hachimanyama": "八幡山子どもセンター",
      "childrens-center/nishigahara": "西が原子どもセンター",
    };
    for (const [token, venue] of Object.entries(kitaMap)) {
      if (token.includes("/")) {
        if (pathname.includes(`/${token}/`)) return venue;
      } else {
        if (pathname.includes(`/${token}/`) || pathname.includes(`/${token}.`)) return venue;
      }
    }
  }

  if (key === "itabashi") {
    const capsMatch = pathname.match(/\/jidoukan\/([a-z0-9_-]+)\//);
    if (capsMatch) {
      const capsMap = {
        akatsuka: "CAP'S赤塚児童館",
        azusawa: "CAP'Sあずさわ児童館",
        ooyama: "CAP'S大山東児童館",
        kamiitabashi: "CAP'S上板橋児童館",
        koubai: "CAP'S紅梅児童館",
        sakaue: "CAP'Sさかうえ児童館",
        shimizu: "CAP'S清水児童館",
        shimura: "CAP'S志村児童館",
        shimurabashi: "CAP'S志村橋児童館",
        shirasagi: "CAP'Sしらさぎ児童館",
        shinkawagishi: "CAP'S新河岸児童館",
        takashimadaira: "CAP'S高島平児童館",
        toshin: "CAP'S東新児童館",
        narimasu: "CAP'Sなります児童館",
        nishitokuji: "CAP'S西徳児童館",
        hasune: "CAP'S蓮根児童館",
        hasune2: "CAP'S蓮根第二児童館",
        hasunomi: "CAP'Sはすのみ児童館",
        hikawa: "CAP'S氷川児童館",
        fujimidai: "CAP'S富士見台児童館",
        midorigaoka: "CAP'S緑が丘児童館",
        minamimaeno: "CAP'S南前野児童館",
        minamiitabashi: "CAP'S南板橋児童館",
        mukaihara: "CAP'S向原児童館",
        yayoi: "CAP'S弥生児童館",
        yurinoki: "CAP'Sゆりの木児童館",
      };
      if (capsMap[capsMatch[1]]) return capsMap[capsMatch[1]];
    }
  }

  if (key === "arakawa") {
    if (/\/hirobakan\//.test(pathname)) return "ゆいの森あらかわ";
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
  if (v.length === 1) return true;
  if (v.length <= 3 && /^[\u3040-\u309F]+$/.test(v)) return true;
  if (/innerHTML|getElementById|getTracker|function\s*\(|\.php|\.js|UA-\d/i.test(v)) return true;
  if (/^(ホール|テナント|募集終了|例|募集案内|err)$/i.test(v)) return true;
  if (/^(事業終了|抽選結果を送信しました|映画上映会・講演会)$/.test(v)) return true;
  if (/^まつり[」）)]内$/.test(v)) return true;
  if (/^各児童館により/.test(v)) return true;
  if (/^(?:観光[・\/]お祭り|講演[・\/]講座|スポーツ$|文化[・\/]芸術)/.test(v)) return true;
  if (/^(?:区役所(?:北庁舎|本庁舎|新庁舎)|[^\s]{2,6}(?:市役所|区役所))\d+階/.test(v)) return true;
  if (/^[月火水木金土日・、（）()\s\d:：～〜時分]+$/.test(v)) return true;
  if (/^[0-9０-９]+階[\s　]*(?:遊戯室|図工室|卓球室|会議室|集会室|研修室|多目的室|和室|体育室|ロビー|ピロティー|図書室|ギャラリー|プレイルーム|プレイホール|工作室)$/.test(v)) return true;
  // Room-only names without facility context
  if (/^(?:プレイルーム|プレイホール|ニコニコルーム|工作室|図書室|遊戯室|体育室)$/.test(v)) return true;
  // Schedule/capacity text extracted as venue
  if (/^各日[、,]/.test(v)) return true;
  if (/^(?:50人|100人|各?回?\d+人)/.test(v)) return true;
  // Pure floor reference
  if (/^(?:\d+階|\d+階\s*(?:ピロティー|ギャラリー|特別展示室))$/.test(v)) return true;
  // "令和N年度" prefix — not a venue
  if (/^令和\d+年度?\s/.test(v)) return true;
  // Category labels (学童保育, 防災, etc.)
  if (/^(?:学童保育|防災|安心・安全|コミュニティ|くらし・観光|平和・人権|子ども・教育)$/.test(v)) return true;
  // Date strings extracted as venue (chofu pattern: "2025年12月24日...")
  if (/^\d{4}年\d{1,2}月\d{1,2}日/.test(v)) return true;
  // Bare date references ("2月7日", "3月15日")
  if (/^\d{1,2}月\d{1,2}日$/.test(v)) return true;
  // Parsing artifacts ("会」と共催", "区では", "現在の市")
  if (/^[」）)）]/.test(v)) return true;
  if (/^(?:区では|現在の市|市では)$/.test(v)) return true;
  // Administrative text extracted as venue
  if (/申請書類|マイナンバー|令和\d+年度$/.test(v)) return true;
  // "3階ホール" without facility name
  if (/^(?:\d+階.*(?:ホール|会議室|展示室|研修室)|工作室・図書室|遊戯室・工作室)$/.test(v)) return true;
  // Online-only events
  if (/^(?:オンライン開催|Zoom開催|Web開催)$/.test(v)) return true;
  // Venue text that is actually a junk description
  if (/(?:はじめての保育園|ペアレンツセミナー|青少年育成プラン|（仮称）)/.test(v)) return true;
  if (/^(?:市内各図書館|区内各公衆浴場|市内各所|児童館の前庭|幼稚園・保育園|幼稚園|保育園)$/.test(v)) return true;
  // Generic "区の保育園" or "児童館で実施する子育てひろば"
  if (/^(?:江東区の保育園|児童館で実施する|都内企業を中心)/.test(v)) return true;
  // "区立幼稚園では" pattern (sumida)
  if (/^(?:区立|市立|都立)(?:幼稚園|保育園|小学校|中学校)(?:では|で|の|に)/.test(v)) return true;
  // Parsing artifacts with "と共催"
  if (/共催$/.test(v) && v.length <= 10) return true;
  // Text starting with venue-unrelated words
  if (/^(?:第\d+回[…・]|JR[^\s]+駅[^\s]+集合)/.test(v)) return true;
  // Date strings mistakenly extracted as venue names
  if (/^\d{1,2}月\d{1,2}日/.test(v)) return true;
  // Very long text that looks like a description
  if (v.length > 60) return true;
  // Application/registration text extracted as venue
  if (/^応募方法|^申込方法|^一時預かり場所|^展示場所$/.test(v)) return true;
  // Dental/medical institutions (not a single venue)
  if (/^(?:歯科)?医師会会員の/.test(v)) return true;
  // Ward-level generic child facility references (区/市/町/村 variants)
  if (/^[^\s]+(?:区|市|町|村)(?:子ども関連施設|子育て関連施設|子育て施設|子育てイベント|児童館)$/.test(v)) return true;
  // "名称" (header text)
  if (/^名称$/.test(v)) return true;
  // Year-prefixed academic/fiscal text
  if (/^年度冬期|^年度夏期/.test(v)) return true;
  // "トップ > ..." breadcrumb text
  if (/^トップ\s*>/.test(v)) return true;
  // "寒川町健" (truncated), "添付の「令和..." (instruction text)
  if (/^添付の[「『]/.test(v)) return true;
  // Venue text that starts with date/schedule info
  if (/^(?:毎月第\d|偶数月|奇数月)/.test(v)) return true;
  // Description text mistakenly extracted as venue
  if (/^養子縁組を|^育児休業復職/.test(v)) return true;
  // Venue text with description-like phrases (受付時間, 必要なもの, etc.)
  if (/受付時間|必要なもの|返送について|臨時休館/.test(v)) return true;
  // Partial/truncated text ending with body part of word
  if (/^(?:\d+日目|(?:1日目|（1日目))/.test(v)) return true;
  // Room-only without facility (e.g. "講義室および保育室")
  if (/^(?:講義室|保育室|集会室|会議室|和室|多目的室)(?:および|と|・)/.test(v)) return true;
  // Date text extracted as venue (e.g. "30日 （月曜日")
  if (/^\d{1,2}日\s*[（(]/.test(v)) return true;
  // Itabashi CAP'S parsing artifacts: "応援児童館", "立西徳児童館", "立なります児童館", "子育て応援児童館"
  if (/^(?:応援児童館|立[^\s]{1,6}児童館|子育て応援児童館)$/.test(v)) return true;
  // Description text (キラキラきれいな..., お湯につけると...)
  if (/^(?:キラキラ|お湯につけると|抽せん結果)/.test(v)) return true;
  // Floor + room without facility name
  if (/^\d+階\s*[^\s]+$/.test(v) && !/センター|館|プラザ|ホール/.test(v)) return true;
  return false;
}

function isGenericWardVenueName(venueName, wardLabel) {
  const v = normalizeText(venueName);
  const w = normalizeText(wardLabel);
  if (!v || !w) return false;
  const re = new RegExp(`^${w}(?:子ども関連施設|子育て関連施設|子育て施設|児童館|児童センター|子育てイベント)$`);
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
