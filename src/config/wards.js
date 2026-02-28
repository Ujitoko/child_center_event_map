const KAWASAKI_SOURCE = {
  key: "kawasaki",
  label: "川崎市",
  baseUrl: "https://eventapp.city.kawasaki.jp",
  center: { lat: 35.5309, lng: 139.7022 },
};

const YOKOHAMA_SOURCE = {
  key: "yokohama",
  label: "横浜市",
  baseUrl: "https://cgi.city.yokohama.lg.jp/common/event2",
  center: { lat: 35.4437, lng: 139.6380 },
};

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

const HACHIOJI_SOURCE = {
  key: "hachioji",
  label: "八王子市",
  baseUrl: "https://kosodate.city.hachioji.tokyo.jp",
  center: { lat: 35.6554, lng: 139.3388 },
};

const CHOFU_SOURCE = {
  key: "chofu",
  label: "調布市",
  baseUrl: "https://www.city.chofu.lg.jp",
  center: { lat: 35.6516, lng: 139.5414 },
};

const MUSASHINO_SOURCE = {
  key: "musashino",
  label: "武蔵野市",
  baseUrl: "https://www.city.musashino.lg.jp",
  center: { lat: 35.7178, lng: 139.5661 },
};

const TACHIKAWA_SOURCE = {
  key: "tachikawa",
  label: "立川市",
  baseUrl: "https://www.city.tachikawa.lg.jp",
  center: { lat: 35.6942, lng: 139.4179 },
};

const AKISHIMA_SOURCE = {
  key: "akishima",
  label: "昭島市",
  baseUrl: "https://www.city.akishima.lg.jp",
  center: { lat: 35.7057, lng: 139.3535 },
};

const HIGASHIYAMATO_SOURCE = {
  key: "higashiyamato",
  label: "東大和市",
  baseUrl: "https://www.city.higashiyamato.lg.jp",
  center: { lat: 35.7455, lng: 139.4266 },
};

const KIYOSE_SOURCE = {
  key: "kiyose",
  label: "清瀬市",
  baseUrl: "https://www.city.kiyose.lg.jp",
  center: { lat: 35.7692, lng: 139.5185 },
};

const TAMA_SOURCE = {
  key: "tama",
  label: "多摩市",
  baseUrl: "https://www.city.tama.lg.jp",
  center: { lat: 35.6368, lng: 139.4463 },
};

const INAGI_SOURCE = {
  key: "inagi",
  label: "稲城市",
  baseUrl: "https://www.city.inagi.tokyo.jp",
  center: { lat: 35.6379, lng: 139.5047 },
};

const HINO_SOURCE = {
  key: "hino",
  label: "日野市",
  baseUrl: "https://www.city.hino.lg.jp",
  center: { lat: 35.6713, lng: 139.3945 },
};

const KOKUBUNJI_SOURCE = {
  key: "kokubunji",
  label: "国分寺市",
  baseUrl: "https://www.city.kokubunji.tokyo.jp",
  center: { lat: 35.7107, lng: 139.4623 },
};

const HIGASHIKURUME_SOURCE = {
  key: "higashikurume",
  label: "東久留米市",
  baseUrl: "https://www.city.higashikurume.lg.jp",
  center: { lat: 35.7587, lng: 139.5306 },
};

const FUCHU_SOURCE = {
  key: "fuchu",
  label: "府中市",
  baseUrl: "https://www.city.fuchu.tokyo.jp",
  center: { lat: 35.6688, lng: 139.4777 },
};

const KOGANEI_SOURCE = {
  key: "koganei",
  label: "小金井市",
  baseUrl: "https://www.city.koganei.lg.jp",
  center: { lat: 35.6994, lng: 139.5032 },
};

const NISHITOKYO_SOURCE = {
  key: "nishitokyo",
  label: "西東京市",
  baseUrl: "https://www.city.nishitokyo.lg.jp",
  center: { lat: 35.7253, lng: 139.5387 },
};

const MACHIDA_SOURCE = {
  key: "machida",
  label: "町田市",
  baseUrl: "https://www.city.machida.tokyo.jp",
  center: { lat: 35.5482, lng: 139.4467 },
};

const FUSSA_SOURCE = {
  key: "fussa",
  label: "福生市",
  baseUrl: "https://www.city.fussa.tokyo.jp",
  center: { lat: 35.7388, lng: 139.3277 },
};

const MUSASHIMURAYAMA_SOURCE = {
  key: "musashimurayama",
  label: "武蔵村山市",
  baseUrl: "https://www.city.musashimurayama.lg.jp",
  center: { lat: 35.7545, lng: 139.3878 },
};

const AKIRUNO_SOURCE = {
  key: "akiruno",
  label: "あきる野市",
  baseUrl: "https://www.city.akiruno.tokyo.jp",
  center: { lat: 35.7287, lng: 139.2939 },
};

const KOMAE_SOURCE = {
  key: "komae",
  label: "狛江市",
  baseUrl: "https://www.city.komae.tokyo.jp",
  center: { lat: 35.6334, lng: 139.5786 },
};

const MITAKA_SOURCE = {
  key: "mitaka",
  label: "三鷹市",
  baseUrl: "https://www.city.mitaka.lg.jp",
  center: { lat: 35.6835, lng: 139.5597 },
};

const KODAIRA_SOURCE = {
  key: "kodaira",
  label: "小平市",
  baseUrl: "https://www.city.kodaira.tokyo.jp",
  center: { lat: 35.7283, lng: 139.4774 },
};

const HIGASHIMURAYAMA_SOURCE = {
  key: "higashimurayama",
  label: "東村山市",
  baseUrl: "https://www.city.higashimurayama.tokyo.jp",
  center: { lat: 35.7625, lng: 139.4682 },
};

const KUNITACHI_SOURCE = {
  key: "kunitachi",
  label: "国立市",
  baseUrl: "https://www.city.kunitachi.tokyo.jp",
  center: { lat: 35.6839, lng: 139.4414 },
};

const OME_SOURCE = {
  key: "ome",
  label: "青梅市",
  baseUrl: "https://www.city.ome.tokyo.jp",
  center: { lat: 35.7879, lng: 139.2754 },
};

const HAMURA_SOURCE = {
  key: "hamura",
  label: "羽村市",
  baseUrl: "https://www.city.hamura.tokyo.jp",
  center: { lat: 35.7688, lng: 139.3117 },
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
  /(児童|児童館|児童センター|児童会館|子ども|こども|子育て|親子|育児|乳幼児|乳児|幼児|未就園|未就学|幼稚園|保育園|こども園|学童|小学生|中学生|赤ちゃん|あかちゃん|ベビー|離乳食|妊娠|出産|母子|プレママ|パパママ|キッズ|ファミリー|ひろば|読み聞かせ|絵本|おはなし会|あっぴぃ)/i;

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
  hachioji: HACHIOJI_SOURCE.label,
  chofu: CHOFU_SOURCE.label,
  musashino: MUSASHINO_SOURCE.label,
  tachikawa: TACHIKAWA_SOURCE.label,
  akishima: AKISHIMA_SOURCE.label,
  higashiyamato: HIGASHIYAMATO_SOURCE.label,
  kiyose: KIYOSE_SOURCE.label,
  tama: TAMA_SOURCE.label,
  inagi: INAGI_SOURCE.label,
  hino: HINO_SOURCE.label,
  kokubunji: KOKUBUNJI_SOURCE.label,
  higashikurume: HIGASHIKURUME_SOURCE.label,
  fuchu: FUCHU_SOURCE.label,
  koganei: KOGANEI_SOURCE.label,
  nishitokyo: NISHITOKYO_SOURCE.label,
  machida: MACHIDA_SOURCE.label,
  fussa: FUSSA_SOURCE.label,
  musashimurayama: MUSASHIMURAYAMA_SOURCE.label,
  akiruno: AKIRUNO_SOURCE.label,
  komae: KOMAE_SOURCE.label,
  mitaka: MITAKA_SOURCE.label,
  kodaira: KODAIRA_SOURCE.label,
  higashimurayama: HIGASHIMURAYAMA_SOURCE.label,
  kunitachi: KUNITACHI_SOURCE.label,
  ome: OME_SOURCE.label,
  hamura: HAMURA_SOURCE.label,
  hakone: "箱根町",
  kawaguchi: "川口市",
  kasukabe: "春日部市",
  fujimino: "ふじみ野市",
  misato: "三郷市",
  kawagoe: "川越市",
  wako: "和光市",
  warabi: "蕨市",
  ageo: "上尾市",
  niiza: "新座市",
  asaka: "朝霞市",
  toda: "戸田市",
  shiki: "志木市",
  fujimi: "富士見市",
  sayama: "狭山市",
  yashio: "八潮市",
  saitamashi: "さいたま市",
  koshigaya: "越谷市",
  tokorozawa: "所沢市",
  kuki: "久喜市",
  kumagaya: "熊谷市",
  kounosu: "鴻巣市",
  sakado: "坂戸市",
  hanno: "飯能市",
  higashimatsuyama: "東松山市",
  gyoda: "行田市",
  honjo: "本庄市",
  hidaka: "日高市",
  shiraoka: "白岡市",
  satte: "幸手市",
  yorii: "寄居町",
  sugito: "杉戸町",
  soka: "草加市",
  tsurugashima: "鶴ヶ島市",
  hasuda: "蓮田市",
  iruma: "入間市",
  kazo: "加須市",
  fukaya: "深谷市",
  okegawa: "桶川市",
  ogose: "越生町",
  ogawa: "小川町",
  yoshimi: "吉見町",
  kamikawa: "神川町",
  kamisato: "上里町",
  yoshikawa: "吉川市",
  ogano: "小鹿野町",
  higashichichibu: "東秩父村",
  kawajima: "川島町",
  kitamoto: "北本市",
  ina_saitama: "伊奈町",
  yokoze: "横瀬町",
  nagatoro: "長瀞町",
  miyoshi_saitama: "三芳町",
  hatoyama: "鳩山町",
  miyashiro: "宮代町",
  // Gunma prefecture (群馬県)
  maebashi: "前橋市",
  takasaki: "高崎市",
  kiryu: "桐生市",
  isesaki: "伊勢崎市",
  ota_gunma: "太田市",
  numata: "沼田市",
  tatebayashi: "館林市",
  shibukawa: "渋川市",
  fujioka_gunma: "藤岡市",
  tomioka: "富岡市",
  annaka: "安中市",
  midori: "みどり市",
  shinto: "榛東村",
  yoshioka: "吉岡町",
  ueno_gunma: "上野村",
  kanna: "神流町",
  shimonita: "下仁田町",
  nanmoku: "南牧村",
  kanra: "甘楽町",
  nakanojo: "中之条町",
  naganohara: "長野原町",
  tsumagoi: "嬬恋村",
  kusatsu: "草津町",
  takayama_gunma: "高山村",
  higashiagatsuma: "東吾妻町",
  katashina: "片品村",
  kawaba: "川場村",
  showa_gunma: "昭和村",
  minakami: "みなかみ町",
  tamamura: "玉村町",
  itakura: "板倉町",
  meiwa: "明和町",
  chiyoda_gunma: "千代田町",
  oizumi: "大泉町",
  ora: "邑楽町",
  // Tochigi prefecture (栃木県)
  utsunomiya: "宇都宮市",
  ashikaga: "足利市",
  tochigi_city: "栃木市",
  sano: "佐野市",
  kanuma: "鹿沼市",
  nikko: "日光市",
  oyama: "小山市",
  moka: "真岡市",
  ohtawara: "大田原市",
  yaita: "矢板市",
  nasushiobara: "那須塩原市",
  tochigi_sakura: "さくら市",
  nasukarasuyama: "那須烏山市",
  shimotsuke: "下野市",
  kaminokawa: "上三川町",
  mashiko: "益子町",
  motegi: "茂木町",
  ichikai: "市貝町",
  haga: "芳賀町",
  mibu: "壬生町",
  nogi: "野木町",
  shioya: "塩谷町",
  takanezawa: "高根沢町",
  nasu: "那須町",
  tochigi_nakagawa: "那珂川町",
  // Ibaraki prefecture (茨城県)
  ibaraki_mito: "水戸市",
  ibaraki_hitachi: "日立市",
  ibaraki_hitachinaka: "ひたちなか市",
  ibaraki_tsukuba: "つくば市",
  ibaraki_koga: "古河市",
  ibaraki_moriya: "守谷市",
  ibaraki_kamisu: "神栖市",
  ibaraki_tokai: "東海村",
  ibaraki_toride: "取手市",
  ibaraki_ryugasaki: "龍ケ崎市",
  ibaraki_chikusei: "筑西市",
  ibaraki_tsuchiura: "土浦市",
  ibaraki_ishioka: "石岡市",
  ibaraki_joso: "常総市",
  ibaraki_naka: "那珂市",
  ibaraki_bando: "坂東市",
  ibaraki_hitachiota: "常陸太田市",
  ibaraki_yuki: "結城市",
  ibaraki_tsukubamirai: "つくばみらい市",
  ibaraki_inashiki: "稲敷市",
  ibaraki_sakuragawa: "桜川市",
  ibaraki_hitachiomiya: "常陸大宮市",
  ibaraki_shimotsuma: "下妻市",
  ibaraki_hokota: "鉾田市",
  ibaraki_namegata: "行方市",
  ibaraki_itako: "潮来市",
  ibaraki_kasumigaura: "かすみがうら市",
  ibaraki_takahagi: "高萩市",
  ibaraki_kashima: "鹿嶋市",
  ibaraki_kasama: "笠間市",
  ibaraki_shiro: "城里町",
  ibaraki_sakai: "境町",
  ibaraki_daigo: "大子町",
  ibaraki_yachiyo: "八千代町",
  ibaraki_goka: "五霞町",
  ibaraki_oarai: "大洗町",
  ibaraki_kawachi: "河内町",
  ibaraki_ibarakimachi: "茨城町",
  ibaraki_kitaibaraki: "北茨城市",
  ibaraki_ushiku: "牛久市",
  ibaraki_ami: "阿見町",
  ibaraki_tone: "利根町",
  tokyo_ota_mamafre: "大田区(ママフレ)",
  ibaraki_kamisu_mamafre: "神栖市(ママフレ)",
  tokyo_kodomo_smile: "こどもスマイル(東京)",
};

const SAGAMIHARA_SOURCE = {
  key: "sagamihara",
  label: "相模原市",
  baseUrl: "https://www.city.sagamihara.kanagawa.jp",
  center: { lat: 35.5714, lng: 139.3728 },
};

const EBINA_SOURCE = {
  key: "ebina",
  label: "海老名市",
  baseUrl: "https://www.city.ebina.kanagawa.jp",
  center: { lat: 35.4461, lng: 139.3906 },
};

const KAMAKURA_SOURCE = {
  key: "kamakura",
  label: "鎌倉市",
  baseUrl: "https://www.city.kamakura.kanagawa.jp",
  center: { lat: 35.3192, lng: 139.5467 },
};

const YOKOSUKA_SOURCE = {
  key: "yokosuka",
  label: "横須賀市",
  baseUrl: "https://www.city.yokosuka.kanagawa.jp",
  center: { lat: 35.2814, lng: 139.6722 },
};

const CHIGASAKI_SOURCE = {
  key: "chigasaki",
  label: "茅ヶ崎市",
  baseUrl: "https://www.city.chigasaki.kanagawa.jp",
  center: { lat: 35.3339, lng: 139.4036 },
};

const ZAMA_SOURCE = {
  key: "zama",
  label: "座間市",
  baseUrl: "https://www.city.zama.kanagawa.jp",
  center: { lat: 35.4886, lng: 139.4082 },
};

const ZUSHI_SOURCE = {
  key: "zushi",
  label: "逗子市",
  baseUrl: "https://www.city.zushi.kanagawa.jp",
  center: { lat: 35.2955, lng: 139.5803 },
};

const YAMATO_SOURCE = {
  key: "yamato",
  label: "大和市",
  baseUrl: "https://www.city.yamato.lg.jp",
  center: { lat: 35.4872, lng: 139.4615 },
};

const HIRATSUKA_SOURCE = {
  key: "hiratsuka",
  label: "平塚市",
  baseUrl: "https://www.city.hiratsuka.kanagawa.jp",
  center: { lat: 35.3297, lng: 139.3499 },
};

const ODAWARA_SOURCE = {
  key: "odawara",
  label: "小田原市",
  baseUrl: "https://www.city.odawara.kanagawa.jp",
  center: { lat: 35.2644, lng: 139.1522 },
};

const HADANO_SOURCE = {
  key: "hadano",
  label: "秦野市",
  baseUrl: "https://www.city.hadano.kanagawa.jp",
  center: { lat: 35.3739, lng: 139.2228 },
};

const AYASE_SOURCE = {
  key: "ayase",
  label: "綾瀬市",
  baseUrl: "https://www.city.ayase.kanagawa.jp",
  center: { lat: 35.4372, lng: 139.4267 },
};

const ATSUGI_SOURCE = {
  key: "atsugi",
  label: "厚木市",
  baseUrl: "https://www.city.atsugi.kanagawa.jp",
  center: { lat: 35.4430, lng: 139.3616 },
};

const ISEHARA_SOURCE = {
  key: "isehara",
  label: "伊勢原市",
  baseUrl: "https://www.city.isehara.kanagawa.jp",
  center: { lat: 35.3978, lng: 139.3140 },
};

const MINAMIASHIGARA_SOURCE = {
  key: "minamiashigara",
  label: "南足柄市",
  baseUrl: "https://www.city.minamiashigara.kanagawa.jp",
  center: { lat: 35.3300, lng: 139.1103 },
};

const SAMUKAWA_SOURCE = {
  key: "samukawa",
  label: "寒川町",
  baseUrl: "https://www.town.samukawa.kanagawa.jp",
  center: { lat: 35.3737, lng: 139.3856 },
};

const AIKAWA_SOURCE = {
  key: "aikawa",
  label: "愛川町",
  baseUrl: "https://www.town.aikawa.kanagawa.jp",
  center: { lat: 35.5278, lng: 139.3217 },
};

const MIURA_SOURCE = {
  key: "miura",
  label: "三浦市",
  baseUrl: "https://www.city.miura.kanagawa.jp",
  center: { lat: 35.1781, lng: 139.6283 },
};

const OISO_SOURCE = {
  key: "oiso",
  label: "大磯町",
  baseUrl: "https://www.town.oiso.kanagawa.jp",
  center: { lat: 35.3100, lng: 139.3150 },
};

const HAYAMA_SOURCE = {
  key: "hayama",
  label: "葉山町",
  baseUrl: "https://www.town.hayama.lg.jp",
  center: { lat: 35.2686, lng: 139.5878 },
};

const FUJISAWA_SOURCE = {
  key: "fujisawa",
  label: "藤沢市",
  baseUrl: "https://www.city.fujisawa.kanagawa.jp",
  center: { lat: 35.3388, lng: 139.4900 },
};

const NAKAI_SOURCE = {
  key: "nakai",
  label: "中井町",
  baseUrl: "https://www.town.nakai.kanagawa.jp",
  center: { lat: 35.3408, lng: 139.2133 },
};

const KIYOKAWA_SOURCE = {
  key: "kiyokawa",
  label: "清川村",
  baseUrl: "https://www.town.kiyokawa.kanagawa.jp",
  center: { lat: 35.4744, lng: 139.2844 },
};

const MIZUHO_SOURCE = {
  key: "mizuho",
  label: "瑞穂町",
  baseUrl: "https://www.town.mizuho.tokyo.jp",
  center: { lat: 35.7706, lng: 139.3516 },
};

const NINOMIYA_SOURCE = {
  key: "ninomiya",
  label: "二宮町",
  baseUrl: "https://www.town.ninomiya.kanagawa.jp",
  center: { lat: 35.3022, lng: 139.2558 },
};

const OI_SOURCE = {
  key: "oi",
  label: "大井町",
  baseUrl: "https://www.town.oi.kanagawa.jp",
  center: { lat: 35.3456, lng: 139.1661 },
};

const YUGAWARA_SOURCE = {
  key: "yugawara",
  label: "湯河原町",
  baseUrl: "https://www.town.yugawara.kanagawa.jp",
  center: { lat: 35.1478, lng: 139.1028 },
};

const MATSUDA_SOURCE = {
  key: "matsuda",
  label: "松田町",
  baseUrl: "https://town.matsuda.kanagawa.jp",
  center: { lat: 35.3461, lng: 139.1458 },
};

const MANAZURU_SOURCE = {
  key: "manazuru",
  label: "真鶴町",
  baseUrl: "https://www.town.manazuru.kanagawa.jp",
  center: { lat: 35.1575, lng: 139.1350 },
};

const HAKONE_SOURCE = {
  key: "hakone",
  label: "箱根町",
  baseUrl: "https://www.town.hakone.kanagawa.jp",
  center: { lat: 35.2326, lng: 139.1069 },
};

const KAISEI_SOURCE = {
  key: "kaisei",
  label: "開成町",
  baseUrl: "https://www.town.kaisei.kanagawa.jp",
  center: { lat: 35.3378, lng: 139.1283 },
};

const YAMAKITA_SOURCE = {
  key: "yamakita",
  label: "山北町",
  baseUrl: "https://www.town.yamakita.kanagawa.jp",
  center: { lat: 35.3642, lng: 139.0833 },
};

const OKUTAMA_SOURCE = {
  key: "okutama",
  label: "奥多摩町",
  baseUrl: "https://www.town.okutama.tokyo.jp/gyosei",
  center: { lat: 35.8098, lng: 139.0966 },
};

const HINODE_SOURCE = {
  key: "hinode",
  label: "日の出町",
  baseUrl: "https://www.town.hinode.tokyo.jp",
  center: { lat: 35.7441, lng: 139.2594 },
};

const HINOHARA_SOURCE = {
  key: "hinohara",
  label: "檜原村",
  baseUrl: "https://www.vill.hinohara.tokyo.jp",
  center: { lat: 35.7272, lng: 139.1497 },
};

// --- 千葉県 ---

const NAGAREYAMA_SOURCE = {
  key: "nagareyama",
  label: "流山市",
  baseUrl: "https://www.city.nagareyama.chiba.jp",
  center: { lat: 35.8564, lng: 139.9027 },
};

const URAYASU_SOURCE = {
  key: "urayasu",
  label: "浦安市",
  baseUrl: "https://www.city.urayasu.lg.jp",
  center: { lat: 35.6536, lng: 139.9019 },
};

const NODA_SOURCE = {
  key: "noda",
  label: "野田市",
  baseUrl: "https://www.city.noda.chiba.jp",
  center: { lat: 35.9550, lng: 139.8745 },
};

const NARASHINO_SOURCE = {
  key: "narashino",
  label: "習志野市",
  baseUrl: "https://www.city.narashino.lg.jp",
  center: { lat: 35.6808, lng: 140.0268 },
};

const SHIROI_SOURCE = {
  key: "shiroi",
  label: "白井市",
  baseUrl: "https://www.city.shiroi.chiba.jp",
  center: { lat: 35.7914, lng: 140.0572 },
};

const KISARAZU_SOURCE = {
  key: "kisarazu",
  label: "木更津市",
  baseUrl: "https://www.city.kisarazu.lg.jp",
  center: { lat: 35.3764, lng: 139.9168 },
};

const ISUMI_SOURCE = {
  key: "isumi",
  label: "いすみ市",
  baseUrl: "https://www.city.isumi.lg.jp",
  center: { lat: 35.2531, lng: 140.3828 },
};

const TOHNOSHO_SOURCE = {
  key: "tohnosho",
  label: "東庄町",
  baseUrl: "https://www.town.tohnosho.chiba.jp",
  center: { lat: 35.8278, lng: 140.6706 },
};

const OTAKI_SOURCE = {
  key: "otaki",
  label: "大多喜町",
  baseUrl: "https://www.town.otaki.chiba.jp",
  center: { lat: 35.2833, lng: 140.2444 },
};

const FUNABASHI_SOURCE = {
  key: "funabashi",
  label: "船橋市",
  baseUrl: "https://www.city.funabashi.lg.jp",
  center: { lat: 35.6947, lng: 139.9828 },
};

const NARITA_SOURCE = {
  key: "narita",
  label: "成田市",
  baseUrl: "https://www.city.narita.chiba.jp",
  center: { lat: 35.7768, lng: 140.3182 },
};

const CHIBA_CITY_SOURCE = {
  key: "chiba",
  label: "千葉市",
  baseUrl: "https://www.city.chiba.jp",
  center: { lat: 35.6073, lng: 140.1063 },
};

const KASHIWA_SOURCE = {
  key: "kashiwa",
  label: "柏市",
  baseUrl: "https://www.city.kashiwa.lg.jp",
  center: { lat: 35.8676, lng: 139.9756 },
};

const YACHIYO_SOURCE = {
  key: "yachiyo",
  label: "八千代市",
  baseUrl: "https://www.city.yachiyo.lg.jp",
  center: { lat: 35.7225, lng: 140.0997 },
};

const ASAHI_SOURCE = {
  key: "asahi",
  label: "旭市",
  baseUrl: "https://www.city.asahi.lg.jp",
  center: { lat: 35.7199, lng: 140.6478 },
};

const KAMOGAWA_SOURCE = {
  key: "kamogawa",
  label: "鴨川市",
  baseUrl: "https://www.city.kamogawa.lg.jp",
  center: { lat: 35.1147, lng: 140.0992 },
};

const YOKOSHIBAHIKARI_SOURCE = {
  key: "yokoshibahikari",
  label: "横芝光町",
  baseUrl: "https://www.town.yokoshibahikari.chiba.jp",
  center: { lat: 35.6622, lng: 140.5075 },
};

const ICHIKAWA_SOURCE = {
  key: "ichikawa",
  label: "市川市",
  baseUrl: "https://event.city.ichikawa.lg.jp",
  center: { lat: 35.7218, lng: 139.9312 },
};

const KATSUURA_SOURCE = {
  key: "katsuura",
  label: "勝浦市",
  baseUrl: "https://www.city.katsuura.lg.jp",
  center: { lat: 35.1526, lng: 140.3196 },
};

const KIMITSU_SOURCE = {
  key: "kimitsu",
  label: "君津市",
  baseUrl: "https://www.city.kimitsu.lg.jp",
  center: { lat: 35.3305, lng: 139.9025 },
};

const KYONAN_SOURCE = {
  key: "kyonan",
  label: "鋸南町",
  baseUrl: "https://www.town.kyonan.chiba.jp",
  center: { lat: 35.1044, lng: 139.8344 },
};

const YOTSUKAIDO_SOURCE = {
  key: "yotsukaido",
  label: "四街道市",
  baseUrl: "https://www.city.yotsukaido.chiba.jp",
  center: { lat: 35.6699, lng: 140.1696 },
};

const MATSUDO_SOURCE = {
  key: "matsudo",
  label: "松戸市",
  baseUrl: "https://www.city.matsudo.chiba.jp",
  center: { lat: 35.7878, lng: 139.9032 },
};

const ABIKO_SOURCE = {
  key: "abiko",
  label: "我孫子市",
  baseUrl: "https://www.city.abiko.chiba.jp",
  center: { lat: 35.8644, lng: 140.0283 },
};

const KAMAGAYA_SOURCE = {
  key: "kamagaya",
  label: "鎌ケ谷市",
  baseUrl: "https://www.city.kamagaya.chiba.jp",
  center: { lat: 35.7769, lng: 140.0008 },
};

const TOMISATO_SOURCE = {
  key: "tomisato",
  label: "富里市",
  baseUrl: "https://www.city.tomisato.lg.jp",
  center: { lat: 35.7321, lng: 140.3424 },
};

const SHIRAKO_SOURCE = {
  key: "shirako",
  label: "白子町",
  baseUrl: "https://www.town.shirako.lg.jp",
  center: { lat: 35.4408, lng: 140.3706 },
};

const KUJUKURI_SOURCE = {
  key: "kujukuri",
  label: "九十九里町",
  baseUrl: "https://www.town.kujukuri.chiba.jp",
  center: { lat: 35.5325, lng: 140.4500 },
};

const YACHIMATA_SOURCE = {
  key: "yachimata",
  label: "八街市",
  baseUrl: "https://www.city.yachimata.lg.jp",
  center: { lat: 35.6647, lng: 140.3186 },
};

const SODEGAURA_SOURCE = {
  key: "sodegaura",
  label: "袖ケ浦市",
  baseUrl: "https://www.city.sodegaura.lg.jp",
  center: { lat: 35.4310, lng: 139.9527 },
};

const ICHINOMIYA_SOURCE = {
  key: "ichinomiya",
  label: "一宮町",
  baseUrl: "https://www.town.ichinomiya.chiba.jp",
  center: { lat: 35.3700, lng: 140.3700 },
};

const CHOSHI_SOURCE = {
  key: "choshi",
  label: "銚子市",
  baseUrl: "https://www.city.choshi.chiba.jp",
  center: { lat: 35.7346, lng: 140.8267 },
};

// --- 千葉県追加 ---
const SAKURA_SOURCE = {
  key: "sakura", label: "佐倉市",
  baseUrl: "https://www.city.sakura.lg.jp",
  center: { lat: 35.7240, lng: 140.2190 },
};
const FUTTSU_SOURCE = {
  key: "futtsu", label: "富津市",
  baseUrl: "https://www.city.futtsu.lg.jp",
  center: { lat: 35.3028, lng: 139.8567 },
};
const INZAI_SOURCE = {
  key: "inzai", label: "印西市",
  baseUrl: "https://www.city.inzai.lg.jp",
  center: { lat: 35.8310, lng: 140.1460 },
};
const KATORI_SOURCE = {
  key: "katori", label: "香取市",
  baseUrl: "https://www.city.katori.lg.jp",
  center: { lat: 35.8977, lng: 140.4991 },
};
const TOGANE_SOURCE = {
  key: "togane", label: "東金市",
  baseUrl: "https://www.city.togane.chiba.jp",
  center: { lat: 35.5603, lng: 140.3656 },
};
const ICHIHARA_SOURCE = {
  key: "ichihara", label: "市原市",
  baseUrl: "https://www.city.ichihara.chiba.jp",
  center: { lat: 35.4980, lng: 140.1155 },
};
const SOSA_SOURCE = {
  key: "sosa", label: "匝瑳市",
  baseUrl: "https://www.city.sosa.lg.jp",
  center: { lat: 35.7100, lng: 140.5636 },
};
const SAMMU_SOURCE = {
  key: "sammu", label: "山武市",
  baseUrl: "https://www.city.sammu.lg.jp",
  center: { lat: 35.6060, lng: 140.4148 },
};
const SAKAE_CHIBA_SOURCE = {
  key: "sakae_chiba", label: "栄町",
  baseUrl: "https://www.town.sakae.chiba.jp",
  center: { lat: 35.8422, lng: 140.2531 },
};

// --- 千葉県 残り13自治体 ---
const MOBARA_SOURCE = {
  key: "mobara", label: "茂原市",
  baseUrl: "https://www.city.mobara.chiba.jp",
  center: { lat: 35.4284, lng: 140.2880 },
};
const TATEYAMA_SOURCE = {
  key: "tateyama", label: "館山市",
  baseUrl: "https://www.city.tateyama.chiba.jp",
  center: { lat: 34.9961, lng: 139.8695 },
};
const MINAMIBOSO_SOURCE = {
  key: "minamiboso", label: "南房総市",
  baseUrl: "https://www.city.minamiboso.chiba.jp",
  center: { lat: 35.0425, lng: 139.8383 },
};
const OAMISHIRASATO_SOURCE = {
  key: "oamishirasato", label: "大網白里市",
  baseUrl: "https://www.city.oamishirasato.lg.jp",
  center: { lat: 35.5192, lng: 140.3188 },
};
const SHISUI_SOURCE = {
  key: "shisui", label: "酒々井町",
  baseUrl: "https://www.town.shisui.chiba.jp",
  center: { lat: 35.7250, lng: 140.2727 },
};
const KOZAKI_SOURCE = {
  key: "kozaki", label: "神崎町",
  baseUrl: "https://www.town.kozaki.chiba.jp",
  center: { lat: 35.8940, lng: 140.4030 },
};
const TAKO_SOURCE = {
  key: "tako", label: "多古町",
  baseUrl: "https://www.town.tako.chiba.jp",
  center: { lat: 35.7350, lng: 140.4710 },
};
const SHIBAYAMA_SOURCE = {
  key: "shibayama", label: "芝山町",
  baseUrl: "https://www.town.shibayama.lg.jp",
  center: { lat: 35.6970, lng: 140.4160 },
};
const MUTSUZAWA_SOURCE = {
  key: "mutsuzawa", label: "睦沢町",
  baseUrl: "https://www.town.mutsuzawa.chiba.jp",
  center: { lat: 35.3640, lng: 140.3220 },
};
const CHOSEI_SOURCE = {
  key: "chosei", label: "長生村",
  baseUrl: "https://www.vill.chosei.chiba.jp",
  center: { lat: 35.4010, lng: 140.3580 },
};
const NAGARA_SOURCE = {
  key: "nagara", label: "長柄町",
  baseUrl: "https://www.town.nagara.chiba.jp",
  center: { lat: 35.4170, lng: 140.2280 },
};
const ONJUKU_SOURCE = {
  key: "onjuku", label: "御宿町",
  baseUrl: "https://www.town.onjuku.chiba.jp",
  center: { lat: 35.1862, lng: 140.3476 },
};
const CHONAN_SOURCE = {
  key: "chonan", label: "長南町",
  baseUrl: "https://www.town.chonan.chiba.jp",
  center: { lat: 35.3730, lng: 140.2350 },
};

// --- 埼玉県 ---
const KAWAGUCHI_SOURCE = {
  key: "kawaguchi", label: "川口市",
  baseUrl: "https://www.city.kawaguchi.lg.jp",
  center: { lat: 35.8078, lng: 139.7241 },
};
const KASUKABE_SOURCE = {
  key: "kasukabe", label: "春日部市",
  baseUrl: "https://www.city.kasukabe.lg.jp",
  center: { lat: 35.9753, lng: 139.7525 },
};
const FUJIMINO_SOURCE = {
  key: "fujimino", label: "ふじみ野市",
  baseUrl: "https://www.city.fujimino.saitama.jp",
  center: { lat: 35.8594, lng: 139.5198 },
};
const MISATO_SOURCE = {
  key: "misato", label: "三郷市",
  baseUrl: "https://www.city.misato.lg.jp",
  center: { lat: 35.8311, lng: 139.8643 },
};
const KAWAGOE_SOURCE = {
  key: "kawagoe", label: "川越市",
  baseUrl: "https://www.city.kawagoe.saitama.jp",
  center: { lat: 35.9250, lng: 139.4856 },
};
const WAKO_SOURCE = {
  key: "wako", label: "和光市",
  baseUrl: "https://www.city.wako.lg.jp",
  center: { lat: 35.7812, lng: 139.6056 },
};
const WARABI_SOURCE = {
  key: "warabi", label: "蕨市",
  baseUrl: "https://www.city.warabi.saitama.jp",
  center: { lat: 35.8256, lng: 139.6797 },
};
const AGEO_SOURCE = {
  key: "ageo", label: "上尾市",
  baseUrl: "https://www.city.ageo.lg.jp",
  center: { lat: 35.9775, lng: 139.5933 },
};
const NIIZA_SOURCE = {
  key: "niiza", label: "新座市",
  baseUrl: "https://www.city.niiza.lg.jp",
  center: { lat: 35.7933, lng: 139.5650 },
};
const ASAKA_SOURCE = {
  key: "asaka", label: "朝霞市",
  baseUrl: "https://www.city.asaka.lg.jp",
  center: { lat: 35.7972, lng: 139.5931 },
};
const TODA_SOURCE = {
  key: "toda", label: "戸田市",
  baseUrl: "https://www.city.toda.saitama.jp",
  center: { lat: 35.8175, lng: 139.6778 },
};
const SHIKI_SOURCE = {
  key: "shiki", label: "志木市",
  baseUrl: "https://www.city.shiki.lg.jp",
  center: { lat: 35.8383, lng: 139.5800 },
};
const FUJIMI_SOURCE = {
  key: "fujimi", label: "富士見市",
  baseUrl: "https://www.city.fujimi.saitama.jp",
  center: { lat: 35.8572, lng: 139.5494 },
};
const SAYAMA_SOURCE = {
  key: "sayama", label: "狭山市",
  baseUrl: "https://www.city.sayama.saitama.jp",
  center: { lat: 35.8528, lng: 139.4122 },
};
const YASHIO_SOURCE = {
  key: "yashio", label: "八潮市",
  baseUrl: "https://www.city.yashio.lg.jp",
  center: { lat: 35.8228, lng: 139.8392 },
};
const SAITAMA_CITY_SOURCE = {
  key: "saitamashi", label: "さいたま市",
  baseUrl: "https://www.city.saitama.lg.jp",
  center: { lat: 35.8617, lng: 139.6455 },
};
const KOSHIGAYA_SOURCE = {
  key: "koshigaya", label: "越谷市",
  baseUrl: "https://www.city.koshigaya.saitama.jp",
  center: { lat: 35.8911, lng: 139.7906 },
};
const TOKOROZAWA_SOURCE = {
  key: "tokorozawa", label: "所沢市",
  baseUrl: "https://www.city.tokorozawa.saitama.jp",
  center: { lat: 35.7990, lng: 139.4689 },
};
const KUKI_SOURCE = {
  key: "kuki", label: "久喜市",
  baseUrl: "https://www.city.kuki.lg.jp",
  center: { lat: 36.0622, lng: 139.6669 },
};
const KUMAGAYA_SOURCE = {
  key: "kumagaya", label: "熊谷市",
  baseUrl: "https://www.city.kumagaya.lg.jp",
  center: { lat: 36.1472, lng: 139.3886 },
};
const KOUNOSU_SOURCE = {
  key: "kounosu", label: "鴻巣市",
  baseUrl: "https://www.city.kounosu.saitama.jp",
  center: { lat: 36.0656, lng: 139.5228 },
};
const SAKADO_SOURCE = {
  key: "sakado", label: "坂戸市",
  baseUrl: "https://www.city.sakado.lg.jp",
  center: { lat: 35.9572, lng: 139.3886 },
};
const HANNO_SOURCE = {
  key: "hanno", label: "飯能市",
  baseUrl: "https://www.city.hanno.lg.jp",
  center: { lat: 35.8558, lng: 139.3278 },
};
const HIGASHIMATSUYAMA_SOURCE = {
  key: "higashimatsuyama", label: "東松山市",
  baseUrl: "https://www.city.higashimatsuyama.lg.jp",
  center: { lat: 36.0422, lng: 139.3994 },
};
const GYODA_SOURCE = {
  key: "gyoda", label: "行田市",
  baseUrl: "https://www.city.gyoda.lg.jp",
  center: { lat: 36.1389, lng: 139.4556 },
};
const HONJO_SOURCE = {
  key: "honjo", label: "本庄市",
  baseUrl: "https://www.city.honjo.lg.jp",
  center: { lat: 36.2439, lng: 139.1906 },
};
const HIDAKA_SOURCE = {
  key: "hidaka", label: "日高市",
  baseUrl: "https://www.city.hidaka.lg.jp",
  center: { lat: 35.9072, lng: 139.3392 },
};
const SHIRAOKA_SOURCE = {
  key: "shiraoka", label: "白岡市",
  baseUrl: "https://www.city.shiraoka.lg.jp",
  center: { lat: 36.0175, lng: 139.6767 },
};
const SATTE_SOURCE = {
  key: "satte", label: "幸手市",
  baseUrl: "https://www.city.satte.lg.jp",
  center: { lat: 36.0783, lng: 139.7264 },
};

const YORII_SOURCE = {
  key: "yorii", label: "寄居町",
  baseUrl: "https://www.town.yorii.saitama.jp",
  center: { lat: 36.1164, lng: 139.1953 },
};

const SUGITO_SOURCE = {
  key: "sugito", label: "杉戸町",
  baseUrl: "https://www.town.sugito.lg.jp",
  center: { lat: 36.0260, lng: 139.7357 },
};

const SOKA_SOURCE = {
  key: "soka", label: "草加市",
  baseUrl: "https://www.city.soka.saitama.jp",
  center: { lat: 35.8265, lng: 139.8055 },
};

const TSURUGASHIMA_SOURCE = {
  key: "tsurugashima", label: "鶴ヶ島市",
  baseUrl: "https://www.city.tsurugashima.lg.jp",
  center: { lat: 35.9328, lng: 139.3936 },
};

const HASUDA_SOURCE = {
  key: "hasuda", label: "蓮田市",
  baseUrl: "https://www.city.hasuda.saitama.jp",
  center: { lat: 35.9925, lng: 139.6621 },
};

const IRUMA_SOURCE = {
  key: "iruma", label: "入間市",
  baseUrl: "https://www.city.iruma.saitama.jp",
  center: { lat: 35.8358, lng: 139.3911 },
};

const KAZO_SOURCE = {
  key: "kazo", label: "加須市",
  baseUrl: "https://www.city.kazo.lg.jp",
  center: { lat: 36.1314, lng: 139.6019 },
};

const FUKAYA_SOURCE = {
  key: "fukaya", label: "深谷市",
  baseUrl: "https://www.city.fukaya.saitama.jp",
  center: { lat: 36.1975, lng: 139.2815 },
};

const OKEGAWA_SOURCE = {
  key: "okegawa", label: "桶川市",
  baseUrl: "https://www.city.okegawa.lg.jp",
  center: { lat: 35.9967, lng: 139.5583 },
};

const OGOSE_SOURCE = {
  key: "ogose", label: "越生町",
  baseUrl: "https://www.town.ogose.saitama.jp",
  center: { lat: 35.9633, lng: 139.2939 },
};

const OGAWA_SOURCE = {
  key: "ogawa", label: "小川町",
  baseUrl: "https://www.town.ogawa.saitama.jp",
  center: { lat: 36.0567, lng: 139.2619 },
};

const YOSHIMI_SOURCE = {
  key: "yoshimi", label: "吉見町",
  baseUrl: "https://www.town.yoshimi.saitama.jp",
  center: { lat: 36.0411, lng: 139.4531 },
};

const KAMIKAWA_SOURCE = {
  key: "kamikawa", label: "神川町",
  baseUrl: "https://www.town.kamikawa.saitama.jp",
  center: { lat: 36.1661, lng: 139.1250 },
};

const KAMISATO_SOURCE = {
  key: "kamisato", label: "上里町",
  baseUrl: "https://www.town.kamisato.saitama.jp",
  center: { lat: 36.2460, lng: 139.1477 },
};

const YOSHIKAWA_SOURCE = {
  key: "yoshikawa", label: "吉川市",
  baseUrl: "https://www.city.yoshikawa.saitama.jp",
  center: { lat: 35.8917, lng: 139.8428 },
};

const OGANO_SOURCE = {
  key: "ogano", label: "小鹿野町",
  baseUrl: "https://www.town.ogano.lg.jp",
  center: { lat: 36.0153, lng: 138.9833 },
};

const HIGASHICHICHIBU_SOURCE = {
  key: "higashichichibu", label: "東秩父村",
  baseUrl: "https://www.vill.higashichichibu.saitama.jp",
  center: { lat: 36.0500, lng: 139.1900 },
};

const KAWAJIMA_SOURCE = {
  key: "kawajima", label: "川島町",
  baseUrl: "https://www.town.kawajima.saitama.jp",
  center: { lat: 35.9806, lng: 139.4814 },
};

const KITAMOTO_SOURCE = {
  key: "kitamoto", label: "北本市",
  baseUrl: "https://www.city.kitamoto.lg.jp",
  center: { lat: 36.0270, lng: 139.5318 },
};

const INA_SAITAMA_SOURCE = {
  key: "ina_saitama", label: "伊奈町",
  baseUrl: "https://www.town.saitama-ina.lg.jp",
  center: { lat: 35.9936, lng: 139.6219 },
};

const YOKOZE_SOURCE = {
  key: "yokoze", label: "横瀬町",
  baseUrl: "https://www.town.yokoze.saitama.jp",
  center: { lat: 35.9797, lng: 139.0947 },
};

const NAGATORO_SOURCE = {
  key: "nagatoro", label: "長瀞町",
  baseUrl: "https://www.town.nagatoro.saitama.jp",
  center: { lat: 36.1139, lng: 139.1083 },
};

const MIYOSHI_SAITAMA_SOURCE = {
  key: "miyoshi_saitama", label: "三芳町",
  baseUrl: "https://www.town.saitama-miyoshi.lg.jp",
  center: { lat: 35.8278, lng: 139.5306 },
};

const HATOYAMA_SOURCE = {
  key: "hatoyama", label: "鳩山町",
  baseUrl: "https://www.town.hatoyama.saitama.jp",
  center: { lat: 35.9500, lng: 139.3350 },
};

const MIYASHIRO_SOURCE = {
  key: "miyashiro", label: "宮代町",
  baseUrl: "https://www.town.miyashiro.lg.jp",
  center: { lat: 36.0238, lng: 139.7253 },
};

const CHICHIBU_SOURCE = {
  key: "chichibu", label: "秩父市",
  baseUrl: "https://www.city.chichibu.lg.jp",
  center: { lat: 35.9917, lng: 139.0853 },
};

const NAMEGAWA_SOURCE = {
  key: "namegawa", label: "滑川町",
  baseUrl: "https://www.town.namegawa.saitama.jp",
  center: { lat: 36.0600, lng: 139.3567 },
};

const RANZAN_SOURCE = {
  key: "ranzan", label: "嵐山町",
  baseUrl: "https://www.town.ranzan.saitama.jp",
  center: { lat: 36.0533, lng: 139.3233 },
};

const MATSUBUSHI_SOURCE = {
  key: "matsubushi", label: "松伏町",
  baseUrl: "https://www.town.matsubushi.lg.jp",
  center: { lat: 35.9267, lng: 139.8133 },
};

const MINANO_SOURCE = {
  key: "minano", label: "皆野町",
  baseUrl: "https://www.town.minano.saitama.jp",
  center: { lat: 36.0567, lng: 139.1000 },
};

const MOROYAMA_SOURCE = {
  key: "moroyama", label: "毛呂山町",
  baseUrl: "https://www.town.moroyama.saitama.jp",
  center: { lat: 35.9417, lng: 139.3167 },
};

const HANYU_SOURCE = {
  key: "hanyu", label: "羽生市",
  baseUrl: "https://www.city.hanyu.lg.jp",
  center: { lat: 36.1717, lng: 139.5483 },
};

const MISATO_SAITAMA_SOURCE = {
  key: "misato_saitama", label: "美里町",
  baseUrl: "https://www.town.saitama-misato.lg.jp",
  center: { lat: 36.1267, lng: 139.2000 },
};

// --- Gunma prefecture (群馬県) ---
// Cities
const MAEBASHI_SOURCE = {
  key: "maebashi", label: "前橋市",
  baseUrl: "https://www.city.maebashi.gunma.jp",
  center: { lat: 36.3912, lng: 139.0608 },
};

const TAKASAKI_SOURCE = {
  key: "takasaki", label: "高崎市",
  baseUrl: "https://www.city.takasaki.gunma.jp",
  center: { lat: 36.3219, lng: 139.0032 },
};

const KIRYU_SOURCE = {
  key: "kiryu", label: "桐生市",
  baseUrl: "https://www.city.kiryu.lg.jp",
  center: { lat: 36.4053, lng: 139.3309 },
};

const ISESAKI_SOURCE = {
  key: "isesaki", label: "伊勢崎市",
  baseUrl: "https://www.city.isesaki.lg.jp",
  center: { lat: 36.3114, lng: 139.1967 },
};

const OTA_GUNMA_SOURCE = {
  key: "ota_gunma", label: "太田市",
  baseUrl: "https://www.city.ota.gunma.jp",
  center: { lat: 36.2914, lng: 139.3756 },
};

const NUMATA_SOURCE = {
  key: "numata", label: "沼田市",
  baseUrl: "https://www.city.numata.gunma.jp",
  center: { lat: 36.6449, lng: 139.0443 },
};

const TATEBAYASHI_SOURCE = {
  key: "tatebayashi", label: "館林市",
  baseUrl: "https://www.city.tatebayashi.gunma.jp",
  center: { lat: 36.2447, lng: 139.5420 },
};

const SHIBUKAWA_SOURCE = {
  key: "shibukawa", label: "渋川市",
  baseUrl: "https://www.city.shibukawa.lg.jp",
  center: { lat: 36.4894, lng: 139.0001 },
};

const FUJIOKA_GUNMA_SOURCE = {
  key: "fujioka_gunma", label: "藤岡市",
  baseUrl: "https://www.city.fujioka.gunma.jp",
  center: { lat: 36.2558, lng: 139.0748 },
};

const TOMIOKA_SOURCE = {
  key: "tomioka", label: "富岡市",
  baseUrl: "https://www.city.tomioka.lg.jp",
  center: { lat: 36.2565, lng: 138.8880 },
};

const ANNAKA_SOURCE = {
  key: "annaka", label: "安中市",
  baseUrl: "https://www.city.annaka.lg.jp",
  center: { lat: 36.3305, lng: 138.8860 },
};

const MIDORI_SOURCE = {
  key: "midori", label: "みどり市",
  baseUrl: "https://www.city.midori.gunma.jp",
  center: { lat: 36.3954, lng: 139.2810 },
};

// Towns/Villages
const SHINTO_SOURCE = {
  key: "shinto", label: "榛東村",
  baseUrl: "https://www.vill.shinto.gunma.jp",
  center: { lat: 36.4458, lng: 139.0134 },
};

const YOSHIOKA_SOURCE = {
  key: "yoshioka", label: "吉岡町",
  baseUrl: "https://www.town.yoshioka.gunma.jp",
  center: { lat: 36.4340, lng: 139.0179 },
};

const UENO_GUNMA_SOURCE = {
  key: "ueno_gunma", label: "上野村",
  baseUrl: "https://www.uenomura.jp",
  center: { lat: 36.0518, lng: 138.8178 },
};

const KANNA_SOURCE = {
  key: "kanna", label: "神流町",
  baseUrl: "https://www.town.kanna.gunma.jp",
  center: { lat: 36.1114, lng: 138.9509 },
};

const SHIMONITA_SOURCE = {
  key: "shimonita", label: "下仁田町",
  baseUrl: "https://www.town.shimonita.lg.jp",
  center: { lat: 36.2124, lng: 138.7886 },
};

const NANMOKU_SOURCE = {
  key: "nanmoku", label: "南牧村",
  baseUrl: "https://www.nanmoku.ne.jp",
  center: { lat: 36.1766, lng: 138.7392 },
};

const KANRA_SOURCE = {
  key: "kanra", label: "甘楽町",
  baseUrl: "https://www.town.kanra.lg.jp",
  center: { lat: 36.2416, lng: 138.9163 },
};

const NAKANOJO_SOURCE = {
  key: "nakanojo", label: "中之条町",
  baseUrl: "https://www.town.nakanojo.gunma.jp",
  center: { lat: 36.5945, lng: 138.8383 },
};

const NAGANOHARA_SOURCE = {
  key: "naganohara", label: "長野原町",
  baseUrl: "https://www.town.naganohara.gunma.jp",
  center: { lat: 36.5467, lng: 138.6314 },
};

const TSUMAGOI_SOURCE = {
  key: "tsumagoi", label: "嬬恋村",
  baseUrl: "https://www.vill.tsumagoi.gunma.jp",
  center: { lat: 36.5266, lng: 138.5227 },
};

const KUSATSU_SOURCE = {
  key: "kusatsu", label: "草津町",
  baseUrl: "https://www.town.kusatsu.gunma.jp",
  center: { lat: 36.6213, lng: 138.5960 },
};

const TAKAYAMA_GUNMA_SOURCE = {
  key: "takayama_gunma", label: "高山村",
  baseUrl: "https://www.vill.takayama.gunma.jp",
  center: { lat: 36.5890, lng: 138.9415 },
};

const HIGASHIAGATSUMA_SOURCE = {
  key: "higashiagatsuma", label: "東吾妻町",
  baseUrl: "https://www.town.higashiagatsuma.gunma.jp",
  center: { lat: 36.5660, lng: 138.8261 },
};

const KATASHINA_SOURCE = {
  key: "katashina", label: "片品村",
  baseUrl: "https://www.vill.katashina.gunma.jp",
  center: { lat: 36.7845, lng: 139.2268 },
};

const KAWABA_SOURCE = {
  key: "kawaba", label: "川場村",
  baseUrl: "https://www.vill.kawaba.gunma.jp",
  center: { lat: 36.6888, lng: 139.0985 },
};

const SHOWA_GUNMA_SOURCE = {
  key: "showa_gunma", label: "昭和村",
  baseUrl: "https://www.vill.showa.gunma.jp",
  center: { lat: 36.6264, lng: 139.0602 },
};

const MINAKAMI_SOURCE = {
  key: "minakami", label: "みなかみ町",
  baseUrl: "https://www.town.minakami.gunma.jp",
  center: { lat: 36.6791, lng: 138.9991 },
};

const TAMAMURA_SOURCE = {
  key: "tamamura", label: "玉村町",
  baseUrl: "https://www.town.tamamura.lg.jp",
  center: { lat: 36.2964, lng: 139.1145 },
};

const ITAKURA_SOURCE = {
  key: "itakura", label: "板倉町",
  baseUrl: "https://www.town.itakura.gunma.jp",
  center: { lat: 36.2297, lng: 139.6010 },
};

const MEIWA_SOURCE = {
  key: "meiwa", label: "明和町",
  baseUrl: "https://www.town.meiwa.gunma.jp",
  center: { lat: 36.2095, lng: 139.5327 },
};

const CHIYODA_GUNMA_SOURCE = {
  key: "chiyoda_gunma", label: "千代田町",
  baseUrl: "https://www.town.chiyoda.gunma.jp",
  center: { lat: 36.2218, lng: 139.4419 },
};

const OIZUMI_SOURCE = {
  key: "oizumi", label: "大泉町",
  baseUrl: "https://www.town.oizumi.gunma.jp",
  center: { lat: 36.2497, lng: 139.4024 },
};

const ORA_SOURCE = {
  key: "ora", label: "邑楽町",
  baseUrl: "https://www.town.ora.gunma.jp",
  center: { lat: 36.2562, lng: 139.4641 },
};

// --- Tochigi prefecture (栃木県) ---
// Cities
const UTSUNOMIYA_SOURCE = { key: "utsunomiya", label: "宇都宮市", baseUrl: "https://www.city.utsunomiya.lg.jp", center: { lat: 36.5551, lng: 139.8829 } };
const ASHIKAGA_SOURCE = { key: "ashikaga", label: "足利市", baseUrl: "https://www.city.ashikaga.tochigi.jp", center: { lat: 36.3405, lng: 139.4498 } };
const TOCHIGI_CITY_SOURCE = { key: "tochigi_city", label: "栃木市", baseUrl: "https://www.city.tochigi.lg.jp", center: { lat: 36.3831, lng: 139.7332 } };
const SANO_SOURCE = { key: "sano", label: "佐野市", baseUrl: "https://www.city.sano.lg.jp", center: { lat: 36.3141, lng: 139.5783 } };
const KANUMA_SOURCE = { key: "kanuma", label: "鹿沼市", baseUrl: "https://www.city.kanuma.tochigi.jp", center: { lat: 36.5725, lng: 139.7500 } };
const NIKKO_SOURCE = { key: "nikko", label: "日光市", baseUrl: "https://www.city.nikko.lg.jp", center: { lat: 36.7198, lng: 139.6982 } };
const OYAMA_SOURCE = { key: "oyama", label: "小山市", baseUrl: "https://www.city.oyama.tochigi.jp", center: { lat: 36.3198, lng: 139.7961 } };
const MOKA_SOURCE = { key: "moka", label: "真岡市", baseUrl: "https://www.city.moka.lg.jp", center: { lat: 36.4405, lng: 140.0139 } };
const OHTAWARA_SOURCE = { key: "ohtawara", label: "大田原市", baseUrl: "https://www.city.ohtawara.tochigi.jp", center: { lat: 36.8713, lng: 140.0166 } };
const YAITA_SOURCE = { key: "yaita", label: "矢板市", baseUrl: "https://www.city.yaita.tochigi.jp", center: { lat: 36.8040, lng: 139.9293 } };
const NASUSHIOBARA_SOURCE = { key: "nasushiobara", label: "那須塩原市", baseUrl: "https://www.city.nasushiobara.tochigi.jp", center: { lat: 36.9619, lng: 139.9928 } };
const TOCHIGI_SAKURA_SOURCE = { key: "tochigi_sakura", label: "さくら市", baseUrl: "https://www.city.tochigi-sakura.lg.jp", center: { lat: 36.6935, lng: 139.9690 } };
const NASUKARASUYAMA_SOURCE = { key: "nasukarasuyama", label: "那須烏山市", baseUrl: "https://www.city.nasukarasuyama.lg.jp", center: { lat: 36.6571, lng: 140.1528 } };
const SHIMOTSUKE_SOURCE = { key: "shimotsuke", label: "下野市", baseUrl: "https://www.city.shimotsuke.lg.jp", center: { lat: 36.3882, lng: 139.8423 } };

// Towns
const KAMINOKAWA_SOURCE = { key: "kaminokawa", label: "上三川町", baseUrl: "https://www.town.kaminokawa.lg.jp", center: { lat: 36.4407, lng: 139.9093 } };
const MASHIKO_SOURCE = { key: "mashiko", label: "益子町", baseUrl: "https://www.town.mashiko.lg.jp", center: { lat: 36.4650, lng: 140.0960 } };
const MOTEGI_SOURCE = { key: "motegi", label: "茂木町", baseUrl: "https://www.town.motegi.tochigi.jp", center: { lat: 36.5318, lng: 140.1893 } };
const ICHIKAI_SOURCE = { key: "ichikai", label: "市貝町", baseUrl: "https://www.town.ichikai.tochigi.jp", center: { lat: 36.5206, lng: 140.0817 } };
const HAGA_SOURCE = { key: "haga", label: "芳賀町", baseUrl: "https://www.town.tochigi-haga.lg.jp", center: { lat: 36.5481, lng: 139.9781 } };
const MIBU_SOURCE = { key: "mibu", label: "壬生町", baseUrl: "https://www.town.mibu.tochigi.jp", center: { lat: 36.4231, lng: 139.8065 } };
const NOGI_SOURCE = { key: "nogi", label: "野木町", baseUrl: "https://www.town.nogi.lg.jp", center: { lat: 36.2326, lng: 139.7373 } };
const SHIOYA_SOURCE = { key: "shioya", label: "塩谷町", baseUrl: "https://www.town.shioya.tochigi.jp", center: { lat: 36.7899, lng: 139.8513 } };
const TAKANEZAWA_SOURCE = { key: "takanezawa", label: "高根沢町", baseUrl: "https://www.town.takanezawa.tochigi.jp", center: { lat: 36.6236, lng: 139.9862 } };
const NASU_SOURCE = { key: "nasu", label: "那須町", baseUrl: "https://www.town.nasu.lg.jp", center: { lat: 37.0194, lng: 140.1211 } };
const TOCHIGI_NAKAGAWA_SOURCE = { key: "tochigi_nakagawa", label: "那珂川町", baseUrl: "https://www.town.tochigi-nakagawa.lg.jp", center: { lat: 36.6794, lng: 140.1630 } };

// Tochigi KNOWN_FACILITIES

// Ibaraki prefecture (茨城県)
const MITO_SOURCE = { key: "ibaraki_mito", label: "水戸市", baseUrl: "https://www.city.mito.lg.jp", center: { lat: 36.3416, lng: 140.4467 } };
const HITACHI_IB_SOURCE = { key: "ibaraki_hitachi", label: "日立市", baseUrl: "https://www.city.hitachi.lg.jp", center: { lat: 36.5991, lng: 140.6514 } };
const HITACHINAKA_SOURCE = { key: "ibaraki_hitachinaka", label: "ひたちなか市", baseUrl: "https://www.city.hitachinaka.lg.jp", center: { lat: 36.3966, lng: 140.5347 } };
const TSUKUBA_SOURCE = { key: "ibaraki_tsukuba", label: "つくば市", baseUrl: "https://www.city.tsukuba.lg.jp", center: { lat: 36.0835, lng: 140.0764 } };
const KOGA_IB_SOURCE = { key: "ibaraki_koga", label: "古河市", baseUrl: "https://www.city.ibaraki-koga.lg.jp", center: { lat: 36.1953, lng: 139.7553 } };
const MORIYA_SOURCE = { key: "ibaraki_moriya", label: "守谷市", baseUrl: "https://www.city.moriya.ibaraki.jp", center: { lat: 35.9513, lng: 139.9747 } };
const KAMISU_SOURCE = { key: "ibaraki_kamisu", label: "神栖市", baseUrl: "https://www.city.kamisu.ibaraki.jp", center: { lat: 35.89, lng: 140.66 } };
const TOKAI_IB_SOURCE = { key: "ibaraki_tokai", label: "東海村", baseUrl: "https://www.vill.tokai.ibaraki.jp", center: { lat: 36.4734, lng: 140.5647 } };
const TORIDE_SOURCE = { key: "ibaraki_toride", label: "取手市", baseUrl: "https://www.city.toride.ibaraki.jp", center: { lat: 35.9117, lng: 140.0502 } };
const RYUGASAKI_SOURCE = { key: "ibaraki_ryugasaki", label: "龍ケ崎市", baseUrl: "https://www.city.ryugasaki.ibaraki.jp", center: { lat: 35.9117, lng: 140.1830 } };
const CHIKUSEI_SOURCE = { key: "ibaraki_chikusei", label: "筑西市", baseUrl: "https://www.city.chikusei.lg.jp", center: { lat: 36.3071, lng: 139.9847 } };
const TSUCHIURA_SOURCE = { key: "ibaraki_tsuchiura", label: "土浦市", baseUrl: "https://www.city.tsuchiura.lg.jp", center: { lat: 36.0719, lng: 140.2056 } };
const ISHIOKA_SOURCE = { key: "ibaraki_ishioka", label: "石岡市", baseUrl: "https://www.city.ishioka.lg.jp", center: { lat: 36.1899, lng: 140.2863 } };
const JOSO_SOURCE = { key: "ibaraki_joso", label: "常総市", baseUrl: "https://www.city.joso.lg.jp", center: { lat: 36.0236, lng: 139.9936 } };
const NAKA_IB_SOURCE = { key: "ibaraki_naka", label: "那珂市", baseUrl: "https://www.city.naka.lg.jp", center: { lat: 36.4575, lng: 140.4855 } };
const BANDO_SOURCE = { key: "ibaraki_bando", label: "坂東市", baseUrl: "https://www.city.bando.lg.jp", center: { lat: 36.0479, lng: 139.8894 } };
const HITACHIOTA_SOURCE = { key: "ibaraki_hitachiota", label: "常陸太田市", baseUrl: "https://www.city.hitachiota.ibaraki.jp", center: { lat: 36.5392, lng: 140.5276 } };
const YUKI_SOURCE = { key: "ibaraki_yuki", label: "結城市", baseUrl: "https://www.city.yuki.lg.jp", center: { lat: 36.3056, lng: 139.8736 } };
const TSUKUBAMIRAI_SOURCE = { key: "ibaraki_tsukubamirai", label: "つくばみらい市", baseUrl: "https://www.city.tsukubamirai.lg.jp", center: { lat: 35.9608, lng: 140.0345 } };
const INASHIKI_SOURCE = { key: "ibaraki_inashiki", label: "稲敷市", baseUrl: "https://www.city.inashiki.lg.jp", center: { lat: 35.9558, lng: 140.3217 } };
const SAKURAGAWA_SOURCE = { key: "ibaraki_sakuragawa", label: "桜川市", baseUrl: "https://www.city.sakuragawa.lg.jp", center: { lat: 36.3722, lng: 140.0861 } };
const HITACHIOMIYA_SOURCE = { key: "ibaraki_hitachiomiya", label: "常陸大宮市", baseUrl: "https://www.city.hitachiomiya.lg.jp", center: { lat: 36.5429, lng: 140.4109 } };
const SHIMOTSUMA_SOURCE = { key: "ibaraki_shimotsuma", label: "下妻市", baseUrl: "https://www.city.shimotsuma.lg.jp", center: { lat: 36.1840, lng: 139.9680 } };
const HOKOTA_SOURCE = { key: "ibaraki_hokota", label: "鉾田市", baseUrl: "https://www.city.hokota.lg.jp", center: { lat: 36.1569, lng: 140.5159 } };
const NAMEGATA_SOURCE = { key: "ibaraki_namegata", label: "行方市", baseUrl: "https://www.city.namegata.ibaraki.jp", center: { lat: 36.1142, lng: 140.4826 } };
const ITAKO_SOURCE = { key: "ibaraki_itako", label: "潮来市", baseUrl: "https://www.city.itako.lg.jp", center: { lat: 35.9470, lng: 140.5544 } };
const KASUMIGAURA_SOURCE = { key: "ibaraki_kasumigaura", label: "かすみがうら市", baseUrl: "https://www.city.kasumigaura.lg.jp", center: { lat: 36.1505, lng: 140.2375 } };
const TAKAHAGI_SOURCE = { key: "ibaraki_takahagi", label: "高萩市", baseUrl: "https://www.city.takahagi.ibaraki.jp", center: { lat: 36.7165, lng: 140.7147 } };
const KASHIMA_IB_SOURCE = { key: "ibaraki_kashima", label: "鹿嶋市", baseUrl: "https://www.city.kashima.ibaraki.jp", center: { lat: 35.9650, lng: 140.6444 } };
const KASAMA_SOURCE = { key: "ibaraki_kasama", label: "笠間市", baseUrl: "https://www.city.kasama.lg.jp", center: { lat: 36.3458, lng: 140.3053 } };
const SHIRO_IB_SOURCE = { key: "ibaraki_shiro", label: "城里町", baseUrl: "https://www.town.shirosato.lg.jp", center: { lat: 36.4400, lng: 140.3600 } };
const SAKAI_IB_SOURCE = { key: "ibaraki_sakai", label: "境町", baseUrl: "https://www.town.sakai.ibaraki.jp", center: { lat: 36.1082, lng: 139.7891 } };
const DAIGO_SOURCE = { key: "ibaraki_daigo", label: "大子町", baseUrl: "https://www.town.daigo.ibaraki.jp", center: { lat: 36.7700, lng: 140.3500 } };
const YACHIYO_IB_SOURCE = { key: "ibaraki_yachiyo", label: "八千代町", baseUrl: "https://www.town.ibaraki-yachiyo.lg.jp", center: { lat: 36.1740, lng: 139.8817 } };
const GOKA_SOURCE = { key: "ibaraki_goka", label: "五霞町", baseUrl: "https://www.town.goka.lg.jp", center: { lat: 36.0949, lng: 139.7453 } };
const OARAI_SOURCE = { key: "ibaraki_oarai", label: "大洗町", baseUrl: "https://www.town.oarai.lg.jp", center: { lat: 36.3143, lng: 140.5665 } };
const KAWACHI_IB_SOURCE = { key: "ibaraki_kawachi", label: "河内町", baseUrl: "https://www.town.ibaraki-kawachi.lg.jp", center: { lat: 35.9295, lng: 140.3043 } };
const IBARAKIMACHI_SOURCE = { key: "ibaraki_ibarakimachi", label: "茨城町", baseUrl: "https://www.town.ibaraki.lg.jp", center: { lat: 36.2870, lng: 140.4138 } };
const KITAIBARAKI_SOURCE = { key: "ibaraki_kitaibaraki", label: "北茨城市", baseUrl: "http://isohara-hoikuen.com", center: { lat: 36.8022, lng: 140.7513 } };
const USHIKU_SOURCE = { key: "ibaraki_ushiku", label: "牛久市", baseUrl: "https://www.city.ushiku.lg.jp", center: { lat: 35.9774, lng: 140.1490 } };
const AMI_SOURCE = { key: "ibaraki_ami", label: "阿見町", baseUrl: "https://www.town.ami.lg.jp", center: { lat: 36.0300, lng: 140.2130 } };
const TONE_IB_SOURCE = { key: "ibaraki_tone", label: "利根町", baseUrl: "https://www.town.tone.ibaraki.jp", center: { lat: 35.8603, lng: 140.1464 } };

const IKOYO_SOURCE = { key: "ikoyo", label: "いこーよ", baseUrl: "https://iko-yo.net", center: { lat: 36.5, lng: 138.0 } };
const TOKYO_OTA_MAMAFRE_SOURCE = { key: "tokyo_ota_mamafre", label: "大田区(ママフレ)", baseUrl: "https://tokyo-ota-city.mamafre.jp", center: { lat: 35.5613, lng: 139.7160 } };
const KODOMO_SMILE_SOURCE = { key: "tokyo_kodomo_smile", label: "こどもスマイル(東京)", baseUrl: "https://kodomo-smile.metro.tokyo.lg.jp", center: { lat: 35.6895, lng: 139.6917 }, geoMaxKm: 60 };
const IBARAKI_KAMISU_MAMAFRE_SOURCE = { key: "ibaraki_kamisu_mamafre", label: "神栖市(ママフレ)", baseUrl: "https://kamisu-city.mamafre.jp", center: { lat: 35.89, lng: 140.66 } };
const PREF_PREFIX_MAP = {
  tokyo: "東京都", kanagawa: "神奈川県", chiba: "千葉県",
  saitama: "埼玉県", ibaraki: "茨城県", tochigi: "栃木県", gunma: "群馬県",
};

// Legacy keys (no pref prefix) → prefecture
const LEGACY_KEY_PREF = {
  // 東京23区
  setagaya: "東京都", ota: "東京都", shinagawa: "東京都", shibuya: "東京都", minato: "東京都",
  chiyoda: "東京都", chuo: "東京都", bunkyo: "東京都", taito: "東京都", sumida: "東京都",
  koto: "東京都", nakano: "東京都", suginami: "東京都", toshima: "東京都", kita: "東京都",
  arakawa: "東京都", itabashi: "東京都", nerima: "東京都", adachi: "東京都", adachi_odekake: "東京都",
  katsushika: "東京都", edogawa: "東京都", shinjuku: "東京都", meguro: "東京都",
  // 東京市部
  hachioji: "東京都", chofu: "東京都", musashino: "東京都", tachikawa: "東京都", akishima: "東京都",
  higashiyamato: "東京都", kiyose: "東京都", tama: "東京都", inagi: "東京都", hino: "東京都",
  kokubunji: "東京都", higashikurume: "東京都", fuchu: "東京都", koganei: "東京都",
  nishitokyo: "東京都", machida: "東京都", fussa: "東京都", musashimurayama: "東京都",
  akiruno: "東京都", komae: "東京都", mitaka: "東京都", kodaira: "東京都", higashimurayama: "東京都",
  kunitachi: "東京都", ome: "東京都", hamura: "東京都", mizuho: "東京都", okutama: "東京都",
  hinode: "東京都", hinohara: "東京都",
  // 神奈川県
  kawasaki: "神奈川県", yokohama: "神奈川県", sagamihara: "神奈川県", ebina: "神奈川県",
  kamakura: "神奈川県", yokosuka: "神奈川県", chigasaki: "神奈川県", zama: "神奈川県",
  zushi: "神奈川県", yamato: "神奈川県", hiratsuka: "神奈川県", odawara: "神奈川県",
  hadano: "神奈川県", ayase: "神奈川県", atsugi: "神奈川県", isehara: "神奈川県",
  minamiashigara: "神奈川県", fujisawa: "神奈川県", samukawa: "神奈川県", aikawa: "神奈川県",
  miura: "神奈川県", oiso: "神奈川県", hayama: "神奈川県", nakai: "神奈川県", kiyokawa: "神奈川県",
  ninomiya: "神奈川県", oi: "神奈川県", yugawara: "神奈川県", matsuda: "神奈川県",
  manazuru: "神奈川県", hakone: "神奈川県", kaisei: "神奈川県", yamakita: "神奈川県",
  // 千葉県
  chiba: "千葉県", funabashi: "千葉県", kashiwa: "千葉県", nagareyama: "千葉県",
  urayasu: "千葉県", noda: "千葉県", narashino: "千葉県", shiroi: "千葉県",
  narita: "千葉県", kisarazu: "千葉県", isumi: "千葉県", tohnosho: "千葉県", otaki: "千葉県",
  yachiyo: "千葉県", asahi: "千葉県", kamogawa: "千葉県", yokoshibahikari: "千葉県",
  ichikawa: "千葉県", katsuura: "千葉県", kimitsu: "千葉県", kyonan: "千葉県",
  yotsukaido: "千葉県", matsudo: "千葉県", abiko: "千葉県", kamagaya: "千葉県",
  tomisato: "千葉県", shirako: "千葉県", kujukuri: "千葉県", yachimata: "千葉県",
  sodegaura: "千葉県", ichinomiya: "千葉県", choshi: "千葉県", sakura: "千葉県",
  futtsu: "千葉県", inzai: "千葉県", katori: "千葉県", togane: "千葉県",
  ichihara: "千葉県", sosa: "千葉県", sammu: "千葉県", sakae_chiba: "千葉県",
  mobara: "千葉県", tateyama: "千葉県", minamiboso: "千葉県", oamishirasato: "千葉県",
  shisui: "千葉県", kozaki: "千葉県", tako: "千葉県", shibayama: "千葉県",
  mutsuzawa: "千葉県", chosei: "千葉県", nagara: "千葉県", onjuku: "千葉県", chonan: "千葉県",
  // 埼玉県
  saitamashi: "埼玉県", kawaguchi: "埼玉県", kasukabe: "埼玉県", fujimino: "埼玉県",
  misato: "埼玉県", kawagoe: "埼玉県", wako: "埼玉県", warabi: "埼玉県", ageo: "埼玉県",
  niiza: "埼玉県", asaka: "埼玉県", toda: "埼玉県", shiki: "埼玉県", fujimi: "埼玉県",
  sayama: "埼玉県", yashio: "埼玉県", koshigaya: "埼玉県", tokorozawa: "埼玉県",
  kuki: "埼玉県", kumagaya: "埼玉県", kounosu: "埼玉県", sakado: "埼玉県", hanno: "埼玉県",
  higashimatsuyama: "埼玉県", gyoda: "埼玉県", honjo: "埼玉県", hidaka: "埼玉県",
  shiraoka: "埼玉県", satte: "埼玉県", yorii: "埼玉県", sugito: "埼玉県",
  soka: "埼玉県", tsurugashima: "埼玉県", hasuda: "埼玉県", iruma: "埼玉県", kazo: "埼玉県",
  fukaya: "埼玉県", okegawa: "埼玉県", ogose: "埼玉県", ogawa: "埼玉県", yoshimi: "埼玉県",
  kamikawa: "埼玉県", kamisato: "埼玉県", yoshikawa: "埼玉県", ogano: "埼玉県",
  higashichichibu: "埼玉県", kawajima: "埼玉県", kitamoto: "埼玉県", ina_saitama: "埼玉県",
  yokoze: "埼玉県", nagatoro: "埼玉県", miyoshi_saitama: "埼玉県", hatoyama: "埼玉県",
  miyashiro: "埼玉県", chichibu: "埼玉県", namegawa: "埼玉県", ranzan: "埼玉県",
  matsubushi: "埼玉県", minano: "埼玉県", moroyama: "埼玉県", hanyu: "埼玉県",
  misato_saitama: "埼玉県",
  // 群馬県
  maebashi: "群馬県", takasaki: "群馬県", kiryu: "群馬県", isesaki: "群馬県",
  ota_gunma: "群馬県", numata: "群馬県", tatebayashi: "群馬県", shibukawa: "群馬県",
  fujioka_gunma: "群馬県", tomioka: "群馬県", annaka: "群馬県", midori: "群馬県",
  shinto: "群馬県", yoshioka: "群馬県", ueno_gunma: "群馬県", kanna: "群馬県",
  shimonita: "群馬県", nanmoku: "群馬県", kanra: "群馬県", nakanojo: "群馬県",
  naganohara: "群馬県", tsumagoi: "群馬県", kusatsu: "群馬県", takayama_gunma: "群馬県",
  higashiagatsuma: "群馬県", katashina: "群馬県", kawaba: "群馬県", showa_gunma: "群馬県",
  minakami: "群馬県", tamamura: "群馬県", itakura: "群馬県", meiwa: "群馬県",
  chiyoda_gunma: "群馬県", oizumi: "群馬県", ora: "群馬県",
  // 栃木県
  utsunomiya: "栃木県", ashikaga: "栃木県", tochigi_city: "栃木県", sano: "栃木県",
  kanuma: "栃木県", nikko: "栃木県", oyama: "栃木県", moka: "栃木県", ohtawara: "栃木県",
  yaita: "栃木県", nasushiobara: "栃木県", tochigi_sakura: "栃木県", nasukarasuyama: "栃木県",
  shimotsuke: "栃木県", kaminokawa: "栃木県", mashiko: "栃木県", motegi: "栃木県",
  ichikai: "栃木県", haga: "栃木県", mibu: "栃木県", nogi: "栃木県", shioya: "栃木県",
  takanezawa: "栃木県", nasu: "栃木県", tochigi_nakagawa: "栃木県",
  // いこーよ (ikoyo_* keys from ikoyo-collector)
  ikoyo_ibaraki: "いこーよ(茨城)", ikoyo_tochigi: "いこーよ(栃木)", ikoyo_gunma: "いこーよ(群馬)", ikoyo_saitama: "いこーよ(埼玉)",
  ikoyo_chiba: "いこーよ(千葉)", ikoyo_tokyo: "いこーよ(東京)", ikoyo_kanagawa: "いこーよ(神奈川)",
};

const REGION_GROUPS = [
  { id: "kanto", label: "関東", prefs: ["東京都","神奈川県","千葉県","埼玉県","群馬県","栃木県","茨城県"], center: { lat: 35.9, lng: 139.7 }, zoom: 8 },
];

const PREF_CENTERS = {
  "茨城県": { lat: 36.34, lng: 140.45 }, "栃木県": { lat: 36.57, lng: 139.88 },
  "群馬県": { lat: 36.39, lng: 139.06 }, "埼玉県": { lat: 35.86, lng: 139.65 },
  "千葉県": { lat: 35.60, lng: 140.12 }, "東京都": { lat: 35.69, lng: 139.69 },
  "神奈川県": { lat: 35.45, lng: 139.64 },
};

const PREF_PREFIX_RE = new RegExp("^(" + Object.keys(PREF_PREFIX_MAP).join("|") + ")_");

function getPrefectureForSourceKey(key) {
  // Check legacy keys first (exact match)
  if (LEGACY_KEY_PREF[key]) return LEGACY_KEY_PREF[key];
  // Check prefix-based keys (e.g., ibaraki_mito → 茨城県)
  const m = key.match(PREF_PREFIX_RE);
  if (m) return PREF_PREFIX_MAP[m[1]];
  return null;
}

function buildSourceToPrefMap(exportsObj) {
  const result = {};
  // Scan all *_SOURCE exports for their .key field
  for (const [name, val] of Object.entries(exportsObj)) {
    if (name.endsWith("_SOURCE") && val && typeof val.key === "string") {
      const pref = getPrefectureForSourceKey(val.key);
      if (pref) result[val.key] = pref;
    }
  }
  // Also include WARD_LABEL_BY_KEY for any non-SOURCE keys (e.g. adachi_odekake)
  for (const key of Object.keys(WARD_LABEL_BY_KEY)) {
    if (!result[key]) {
      const pref = getPrefectureForSourceKey(key);
      if (pref) result[key] = pref;
    }
  }
  // Include LEGACY_KEY_PREF entries directly (e.g. ikoyo_* keys)
  for (const [key, pref] of Object.entries(LEGACY_KEY_PREF)) {
    if (!result[key]) result[key] = pref;
  }
  return result;
}

const CHILD_KW = ["子育て", "親子", "幼児", "乳幼児", "健診", "教室", "サロン", "相談", "キッズ", "児童", "おはなし", "広場", "赤ちゃん", "工作", "映画会", "読み聞かせ", "子ども", "こども", "ベビー", "育児", "子供", "未就学", "ファミリー", "小学生", "リトミック"];
const IKOYO_CHILD_KW = ["子ども", "子育て", "親子", "キッズ", "ベビー", "赤ちゃん", "幼児", "児童", "乳幼児", "ファミリー", "小学生", "未就学", "おはなし", "工作", "体験", "ワークショップ"];

module.exports = {
  CHILD_KW,
  IKOYO_CHILD_KW,
  ADACHI_SOURCE,
  KAWASAKI_SOURCE,
  YOKOHAMA_SOURCE,
  HACHIOJI_SOURCE,
  ARAKAWA_SOURCE,
  BUNKYO_SOURCE,
  CACHE_TTL_MS,
  CHOFU_SOURCE,
  CHIYODA_SOURCE,
  MUSASHINO_SOURCE,
  TACHIKAWA_SOURCE,
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
  AKISHIMA_SOURCE,
  HIGASHIYAMATO_SOURCE,
  KIYOSE_SOURCE,
  TAMA_SOURCE,
  INAGI_SOURCE,
  HINO_SOURCE,
  KOKUBUNJI_SOURCE,
  HIGASHIKURUME_SOURCE,
  FUCHU_SOURCE,
  KOGANEI_SOURCE,
  NISHITOKYO_SOURCE,
  MACHIDA_SOURCE,
  FUSSA_SOURCE,
  MUSASHIMURAYAMA_SOURCE,
  AKIRUNO_SOURCE,
  KOMAE_SOURCE,
  MITAKA_SOURCE,
  KODAIRA_SOURCE,
  HIGASHIMURAYAMA_SOURCE,
  KUNITACHI_SOURCE,
  OME_SOURCE,
  HAMURA_SOURCE,
  WARD_CHILD_HINT_RE,
  WARD_CHILD_URL_HINT_RE,
  WARD_EVENT_WORD_RE,
  WARD_LABEL_BY_KEY,
  SAGAMIHARA_SOURCE,
  EBINA_SOURCE,
  KAMAKURA_SOURCE,
  YOKOSUKA_SOURCE,
  CHIGASAKI_SOURCE,
  ZAMA_SOURCE,
  ZUSHI_SOURCE,
  YAMATO_SOURCE,
  HIRATSUKA_SOURCE,
  ODAWARA_SOURCE,
  HADANO_SOURCE,
  AYASE_SOURCE,
  ATSUGI_SOURCE,
  ISEHARA_SOURCE,
  MINAMIASHIGARA_SOURCE,
  SAMUKAWA_SOURCE,
  AIKAWA_SOURCE,
  MIURA_SOURCE,
  OISO_SOURCE,
  HAYAMA_SOURCE,
  FUJISAWA_SOURCE,
  NAKAI_SOURCE,
  KIYOKAWA_SOURCE,
  MIZUHO_SOURCE,
  NINOMIYA_SOURCE,
  OI_SOURCE,
  YUGAWARA_SOURCE,
  MATSUDA_SOURCE,
  MANAZURU_SOURCE,
  HAKONE_SOURCE,
  KAISEI_SOURCE,
  YAMAKITA_SOURCE,
  OKUTAMA_SOURCE,
  HINODE_SOURCE,
  HINOHARA_SOURCE,
  NAGAREYAMA_SOURCE,
  URAYASU_SOURCE,
  NODA_SOURCE,
  NARASHINO_SOURCE,
  SHIROI_SOURCE,
  KISARAZU_SOURCE,
  ISUMI_SOURCE,
  TOHNOSHO_SOURCE,
  OTAKI_SOURCE,
  FUNABASHI_SOURCE,
  NARITA_SOURCE,
  CHIBA_CITY_SOURCE,
  KASHIWA_SOURCE,
  YACHIYO_SOURCE,
  ASAHI_SOURCE,
  KAMOGAWA_SOURCE,
  YOKOSHIBAHIKARI_SOURCE,
  ICHIKAWA_SOURCE,
  KATSUURA_SOURCE,
  KIMITSU_SOURCE,
  KYONAN_SOURCE,
  YOTSUKAIDO_SOURCE,
  MATSUDO_SOURCE,
  ABIKO_SOURCE,
  KAMAGAYA_SOURCE,
  TOMISATO_SOURCE,
  SHIRAKO_SOURCE,
  KUJUKURI_SOURCE,
  YACHIMATA_SOURCE,
  SODEGAURA_SOURCE,
  ICHINOMIYA_SOURCE,
  CHOSHI_SOURCE,
  SAKURA_SOURCE,
  FUTTSU_SOURCE,
  INZAI_SOURCE,
  KATORI_SOURCE,
  TOGANE_SOURCE,
  ICHIHARA_SOURCE,
  SOSA_SOURCE,
  SAMMU_SOURCE,
  SAKAE_CHIBA_SOURCE,
  MOBARA_SOURCE,
  TATEYAMA_SOURCE,
  MINAMIBOSO_SOURCE,
  OAMISHIRASATO_SOURCE,
  SHISUI_SOURCE,
  KOZAKI_SOURCE,
  TAKO_SOURCE,
  SHIBAYAMA_SOURCE,
  MUTSUZAWA_SOURCE,
  CHOSEI_SOURCE,
  NAGARA_SOURCE,
  ONJUKU_SOURCE,
  CHONAN_SOURCE,
  KAWAGUCHI_SOURCE,
  KASUKABE_SOURCE,
  FUJIMINO_SOURCE,
  MISATO_SOURCE,
  KAWAGOE_SOURCE,
  WAKO_SOURCE,
  WARABI_SOURCE,
  AGEO_SOURCE,
  NIIZA_SOURCE,
  ASAKA_SOURCE,
  TODA_SOURCE,
  SHIKI_SOURCE,
  FUJIMI_SOURCE,
  SAYAMA_SOURCE,
  YASHIO_SOURCE,
  SAITAMA_CITY_SOURCE,
  KOSHIGAYA_SOURCE,
  TOKOROZAWA_SOURCE,
  KUKI_SOURCE,
  KUMAGAYA_SOURCE,
  KOUNOSU_SOURCE,
  SAKADO_SOURCE,
  HANNO_SOURCE,
  HIGASHIMATSUYAMA_SOURCE,
  GYODA_SOURCE,
  HONJO_SOURCE,
  HIDAKA_SOURCE,
  SHIRAOKA_SOURCE,
  SATTE_SOURCE,
  YORII_SOURCE,
  SUGITO_SOURCE,
  SOKA_SOURCE,
  TSURUGASHIMA_SOURCE,
  HASUDA_SOURCE,
  IRUMA_SOURCE,
  KAZO_SOURCE,
  FUKAYA_SOURCE,
  OKEGAWA_SOURCE,
  OGOSE_SOURCE,
  OGAWA_SOURCE,
  YOSHIMI_SOURCE,
  KAMIKAWA_SOURCE,
  KAMISATO_SOURCE,
  YOSHIKAWA_SOURCE,
  OGANO_SOURCE,
  HIGASHICHICHIBU_SOURCE,
  KAWAJIMA_SOURCE,
  KITAMOTO_SOURCE,
  INA_SAITAMA_SOURCE,
  YOKOZE_SOURCE,
  NAGATORO_SOURCE,
  MIYOSHI_SAITAMA_SOURCE,
  HATOYAMA_SOURCE,
  MIYASHIRO_SOURCE,
  CHICHIBU_SOURCE,
  NAMEGAWA_SOURCE,
  RANZAN_SOURCE,
  MATSUBUSHI_SOURCE,
  MINANO_SOURCE,
  MOROYAMA_SOURCE,
  HANYU_SOURCE,
  MISATO_SAITAMA_SOURCE,
  // Tochigi prefecture (栃木県)
  UTSUNOMIYA_SOURCE,
  ASHIKAGA_SOURCE,
  TOCHIGI_CITY_SOURCE,
  SANO_SOURCE,
  KANUMA_SOURCE,
  NIKKO_SOURCE,
  OYAMA_SOURCE,
  MOKA_SOURCE,
  OHTAWARA_SOURCE,
  YAITA_SOURCE,
  NASUSHIOBARA_SOURCE,
  TOCHIGI_SAKURA_SOURCE,
  NASUKARASUYAMA_SOURCE,
  SHIMOTSUKE_SOURCE,
  KAMINOKAWA_SOURCE,
  MASHIKO_SOURCE,
  MOTEGI_SOURCE,
  ICHIKAI_SOURCE,
  HAGA_SOURCE,
  MIBU_SOURCE,
  NOGI_SOURCE,
  SHIOYA_SOURCE,
  TAKANEZAWA_SOURCE,
  NASU_SOURCE,
  TOCHIGI_NAKAGAWA_SOURCE,
  // Gunma prefecture (群馬県)
  // Cities
  MAEBASHI_SOURCE,
  TAKASAKI_SOURCE,
  KIRYU_SOURCE,
  ISESAKI_SOURCE,
  OTA_GUNMA_SOURCE,
  NUMATA_SOURCE,
  TATEBAYASHI_SOURCE,
  SHIBUKAWA_SOURCE,
  FUJIOKA_GUNMA_SOURCE,
  TOMIOKA_SOURCE,
  ANNAKA_SOURCE,
  MIDORI_SOURCE,
  // Towns/Villages
  SHINTO_SOURCE,
  YOSHIOKA_SOURCE,
  UENO_GUNMA_SOURCE,
  KANNA_SOURCE,
  SHIMONITA_SOURCE,
  NANMOKU_SOURCE,
  KANRA_SOURCE,
  NAKANOJO_SOURCE,
  NAGANOHARA_SOURCE,
  TSUMAGOI_SOURCE,
  KUSATSU_SOURCE,
  TAKAYAMA_GUNMA_SOURCE,
  HIGASHIAGATSUMA_SOURCE,
  KATASHINA_SOURCE,
  KAWABA_SOURCE,
  SHOWA_GUNMA_SOURCE,
  MINAKAMI_SOURCE,
  TAMAMURA_SOURCE,
  ITAKURA_SOURCE,
  MEIWA_SOURCE,
  CHIYODA_GUNMA_SOURCE,
  OIZUMI_SOURCE,
  ORA_SOURCE,
  // Ibaraki prefecture (茨城県)
  MITO_SOURCE,
  HITACHI_IB_SOURCE,
  HITACHINAKA_SOURCE,
  TSUKUBA_SOURCE,
  KOGA_IB_SOURCE,
  MORIYA_SOURCE,
  KAMISU_SOURCE,
  TOKAI_IB_SOURCE,
  TORIDE_SOURCE,
  RYUGASAKI_SOURCE,
  CHIKUSEI_SOURCE,
  TSUCHIURA_SOURCE,
  ISHIOKA_SOURCE,
  JOSO_SOURCE,
  NAKA_IB_SOURCE,
  BANDO_SOURCE,
  HITACHIOTA_SOURCE,
  YUKI_SOURCE,
  TSUKUBAMIRAI_SOURCE,
  INASHIKI_SOURCE,
  SAKURAGAWA_SOURCE,
  HITACHIOMIYA_SOURCE,
  SHIMOTSUMA_SOURCE,
  HOKOTA_SOURCE,
  NAMEGATA_SOURCE,
  ITAKO_SOURCE,
  KASUMIGAURA_SOURCE,
  TAKAHAGI_SOURCE,
  KASHIMA_IB_SOURCE,
  KASAMA_SOURCE,
  SHIRO_IB_SOURCE,
  SAKAI_IB_SOURCE,
  DAIGO_SOURCE,
  YACHIYO_IB_SOURCE,
  GOKA_SOURCE,
  OARAI_SOURCE,
  KAWACHI_IB_SOURCE,
  IBARAKIMACHI_SOURCE,
  KITAIBARAKI_SOURCE,
  USHIKU_SOURCE,
  AMI_SOURCE,
  TONE_IB_SOURCE,
  IKOYO_SOURCE, TOKYO_OTA_MAMAFRE_SOURCE, KODOMO_SMILE_SOURCE, IBARAKI_KAMISU_MAMAFRE_SOURCE,
  REGION_GROUPS, PREF_CENTERS, buildSourceToPrefMap,
};
