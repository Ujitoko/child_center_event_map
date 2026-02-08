const SETAGAYA_SOURCE = {
  key: "setagaya",
  label: "世田谷区",
  baseUrl: "https://www.city.setagaya.lg.jp",
  listPath: "/cgi-bin/event_cal_multi/calendar.cgi",
  center: { lat: 35.6466, lng: 139.6531 },
};

const OTA_SOURCE = {
  key: "ota",
  label: "大田区",
  baseUrl: "https://www.city.ota.tokyo.jp",
  center: { lat: 35.5613, lng: 139.716 },
};

const SHINAGAWA_SOURCE = {
  key: "shinagawa",
  label: "品川区",
  baseUrl: "https://www.city.shinagawa.tokyo.jp",
  center: { lat: 35.6092, lng: 139.7302 },
};

const SHIBUYA_SOURCE = {
  key: "shibuya",
  label: "渋谷区",
  baseUrl: "https://www.city.shibuya.tokyo.jp",
  center: { lat: 35.6618, lng: 139.7041 },
};

const SHIBUYA_NEUVOLA_BASE = "https://shibuya-city-neuvola.tokyo";
const SHIBUYA_FRIENDS_BASE = "https://friends-shibuya.com";

const MINATO_SOURCE = {
  key: "minato",
  label: "港区",
  baseUrl: "https://www.city.minato.tokyo.jp",
  center: { lat: 35.6581, lng: 139.7516 },
};

const CHIYODA_SOURCE = {
  key: "chiyoda",
  label: "千代田区",
  baseUrl: "https://www.city.chiyoda.lg.jp",
  center: { lat: 35.6938, lng: 139.7535 },
};

const CHUO_SOURCE = {
  key: "chuo",
  label: "中央区",
  baseUrl: "https://www.city.chuo.lg.jp",
  center: { lat: 35.6664, lng: 139.772 },
};

const BUNKYO_SOURCE = {
  key: "bunkyo",
  label: "文京区",
  baseUrl: "https://www.city.bunkyo.lg.jp",
  center: { lat: 35.7081, lng: 139.7528 },
};

const TAITO_SOURCE = {
  key: "taito",
  label: "台東区",
  baseUrl: "https://www.city.taito.lg.jp",
  center: { lat: 35.7128, lng: 139.7806 },
};

const SUMIDA_SOURCE = {
  key: "sumida",
  label: "墨田区",
  baseUrl: "https://www.city.sumida.lg.jp",
  center: { lat: 35.7107, lng: 139.8015 },
};

const KOTO_SOURCE = {
  key: "koto",
  label: "江東区",
  baseUrl: "https://www.city.koto.lg.jp",
  center: { lat: 35.6731, lng: 139.817 },
};

const NAKANO_SOURCE = {
  key: "nakano",
  label: "中野区",
  baseUrl: "https://www.city.tokyo-nakano.lg.jp",
  center: { lat: 35.7074, lng: 139.6638 },
};

const SUGINAMI_SOURCE = {
  key: "suginami",
  label: "杉並区",
  baseUrl: "https://www.city.suginami.tokyo.jp",
  center: { lat: 35.6994, lng: 139.6364 },
};

const TOSHIMA_SOURCE = {
  key: "toshima",
  label: "豊島区",
  baseUrl: "https://www.city.toshima.lg.jp",
  center: { lat: 35.7261, lng: 139.716 },
};

const KITA_SOURCE = {
  key: "kita",
  label: "北区",
  baseUrl: "https://www.city.kita.lg.jp",
  center: { lat: 35.752, lng: 139.7336 },
};

const ARAKAWA_SOURCE = {
  key: "arakawa",
  label: "荒川区",
  baseUrl: "https://www.city.arakawa.tokyo.jp",
  center: { lat: 35.7361, lng: 139.7835 },
};

const ITABASHI_SOURCE = {
  key: "itabashi",
  label: "板橋区",
  baseUrl: "https://www.city.itabashi.tokyo.jp",
  center: { lat: 35.7512, lng: 139.7094 },
};

const NERIMA_SOURCE = {
  key: "nerima",
  label: "練馬区",
  baseUrl: "https://www.city.nerima.tokyo.jp",
  center: { lat: 35.7356, lng: 139.6517 },
};

const ADACHI_SOURCE = {
  key: "adachi",
  label: "足立区",
  baseUrl: "https://www.city.adachi.tokyo.jp",
  center: { lat: 35.7758, lng: 139.8045 },
};

const KATSUSHIKA_SOURCE = {
  key: "katsushika",
  label: "葛飾区",
  baseUrl: "https://www.city.katsushika.lg.jp",
  center: { lat: 35.7436, lng: 139.8472 },
};

const EDOGAWA_SOURCE = {
  key: "edogawa",
  label: "江戸川区",
  baseUrl: "https://www.city.edogawa.tokyo.jp",
  center: { lat: 35.7069, lng: 139.8683 },
};

const SHINJUKU_SOURCE = {
  key: "shinjuku",
  label: "新宿区",
  baseUrl: "https://www.city.shinjuku.lg.jp",
  center: { lat: 35.6938, lng: 139.7034 },
};

const MINATO_APII_URL = "https://www.city.minato.tokyo.jp/kodomo/kodomo/kodomo/shienshisetsu/apii.html";
const MINATO_ASSOCIE_FUREAI_URL =
  "https://associe-international.co.jp/%e6%96%bd%e8%a8%ad%e7%b4%b9%e4%bb%8b/nishiazabu_fureairoom/";

const MEGURO_SOURCE = {
  key: "meguro",
  label: "目黒区",
  baseUrl: "https://www.city.meguro.tokyo.jp",
  center: { lat: 35.6415, lng: 139.6982 },
};

const SHINAGAWA_POCKET_BASE = "https://shinagawa-pocket.city-hc.jp";

const JIDOKAN_HINTS = [
  "児童",
  "児童館",
  "児童センター",
  "児童会館",
  "こどもセンター",
  "子どもセンター",
  "こども会館",
  "子ども会館",
  "子育て児童ひろば",
  "奥沢子育て児童ひろば",
];

const WARD_CHILD_HINT_RE =
  /(児童|児童館|児童センター|児童会館|子ども|こども|子育て|親子|育児|乳幼児|乳児|幼児|未就園|未就学|幼稚園|保育園|こども園|学童|小学生|中学生|赤ちゃん|あかちゃん|ベビー|離乳食|妊娠|出産|母子|プレママ|パパママ|キッズ|ファミリー|ひろば|読み聞かせ|絵本|あっぴぃ)/i;

const WARD_CHILD_URL_HINT_RE =
  /(kodomo|kosodate|jidokan|jido|gakudo|akachan|baby|kids|oyako|ikuji|kyoiku|hoiku|hiroba|hirobakan|fureai|family|teens|nikoniko|nerijiten)/i;

const WARD_EVENT_WORD_RE =
  /(イベント|行事|講座|教室|ひろば|プログラム|おたより|まつり|祭|工作|読み聞かせ|相談|講演|ワークショップ|体験|募集|学級|クラブ|遊び|あそび|フェス)/i;

const SETAGAYA_JIDOKAN_URL_RE = /city\.setagaya\.lg\.jp\/03(?:06[1-9]|07\d|08[0-5])\//i;

const CACHE_TTL_MS = 5 * 60 * 1000;

const WARD_LABEL_BY_KEY = {
  setagaya: SETAGAYA_SOURCE.label,
  ota: OTA_SOURCE.label,
  shinagawa: SHINAGAWA_SOURCE.label,
  shibuya: SHIBUYA_SOURCE.label,
  minato: MINATO_SOURCE.label,
  chiyoda: CHIYODA_SOURCE.label,
  chuo: CHUO_SOURCE.label,
  bunkyo: BUNKYO_SOURCE.label,
  taito: TAITO_SOURCE.label,
  sumida: SUMIDA_SOURCE.label,
  koto: KOTO_SOURCE.label,
  nakano: NAKANO_SOURCE.label,
  suginami: SUGINAMI_SOURCE.label,
  toshima: TOSHIMA_SOURCE.label,
  kita: KITA_SOURCE.label,
  arakawa: ARAKAWA_SOURCE.label,
  itabashi: ITABASHI_SOURCE.label,
  nerima: NERIMA_SOURCE.label,
  adachi: ADACHI_SOURCE.label,
  katsushika: KATSUSHIKA_SOURCE.label,
  edogawa: EDOGAWA_SOURCE.label,
  shinjuku: SHINJUKU_SOURCE.label,
  meguro: MEGURO_SOURCE.label,
};

module.exports = {
  ADACHI_SOURCE,
  ARAKAWA_SOURCE,
  BUNKYO_SOURCE,
  CACHE_TTL_MS,
  CHIYODA_SOURCE,
  CHUO_SOURCE,
  EDOGAWA_SOURCE,
  ITABASHI_SOURCE,
  JIDOKAN_HINTS,
  KATSUSHIKA_SOURCE,
  KITA_SOURCE,
  KOTO_SOURCE,
  MEGURO_SOURCE,
  MINATO_APII_URL,
  MINATO_ASSOCIE_FUREAI_URL,
  MINATO_SOURCE,
  NAKANO_SOURCE,
  NERIMA_SOURCE,
  OTA_SOURCE,
  SETAGAYA_JIDOKAN_URL_RE,
  SETAGAYA_SOURCE,
  SHIBUYA_FRIENDS_BASE,
  SHIBUYA_NEUVOLA_BASE,
  SHIBUYA_SOURCE,
  SHINAGAWA_POCKET_BASE,
  SHINAGAWA_SOURCE,
  SHINJUKU_SOURCE,
  SUGINAMI_SOURCE,
  SUMIDA_SOURCE,
  TAITO_SOURCE,
  TOSHIMA_SOURCE,
  WARD_CHILD_HINT_RE,
  WARD_CHILD_URL_HINT_RE,
  WARD_EVENT_WORD_RE,
  WARD_LABEL_BY_KEY,
};
