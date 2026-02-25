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
  // 東北6県
  aomori_aomori: "青森市",
  aomori_hachinohe: "八戸市",
  aomori_tsugaru: "つがる市",
  aomori_hiranai: "平内町",
  aomori_nakadomari: "中泊町",
  aomori_yomogita: "蓬田村",
  aomori_itayanagi: "板柳町",
  iwate_ichinoseki: "一関市",
  iwate_kitakami: "北上市",
  iwate_kuji: "久慈市",
  iwate_oshu: "奥州市",
  iwate_nishiwaga: "西和賀町",
  iwate_ichinohe: "一戸町",
  iwate_otsuchi: "大槌町",
  miyagi_sendai: "仙台市",
  miyagi_ishinomaki: "石巻市",
  miyagi_higashimatsushima: "東松島市",
  miyagi_zao: "蔵王町",
  miyagi_shichikashuku: "七ヶ宿町",
  miyagi_shichigahama: "七ヶ浜町",
  miyagi_taiwa: "大和町",
  miyagi_shikama: "色麻町",
  miyagi_natori: "名取市",
  miyagi_shiogama: "塩竈市",
  akita_kosodate: "秋田市(子育て情報)",
  akita_yokote: "横手市",
  akita_yurihonjyo: "由利本荘市",
  akita_oga: "男鹿市",
  akita_kosaka: "小坂町",
  akita_hachirogata: "八郎潟町",
  yamagata_yonezawa: "米沢市",
  yamagata_sakata: "酒田市",
  yamagata_shinjo: "新庄市",
  yamagata_nagai: "長井市",
  yamagata_nakayama: "中山町",
  yamagata_kahoku: "河北町",
  yamagata_asahi_ym: "朝日町",
  yamagata_kaneyama: "金山町",
  yamagata_mamurogawa: "真室川町",
  yamagata_okura: "大蔵村",
  yamagata_shirataka: "白鷹町",
  fukushima_fukushima: "福島市",
  fukushima_koriyama: "郡山市",
  fukushima_soma: "相馬市",
  fukushima_minamisoma: "南相馬市",
  fukushima_otama: "大玉村",
  fukushima_shimogo: "下郷町",
  fukushima_aizumisato: "会津美里町",
  fukushima_furudono: "古殿町",
  // 北海道
  hokkaido_iwamizawa: "岩見沢市",
  hokkaido_shibetsu: "士別市",
  hokkaido_chitose: "千歳市",
  hokkaido_mori: "森町",
  hokkaido_ozora: "大空町",
  hokkaido_tsubetsu: "津別町",
  hokkaido_taiki: "大樹町",
  hokkaido_niseko: "ニセコ町",
  hokkaido_shiraoi: "白老町",
  hokkaido_higashikagura: "東神楽町",
  hokkaido_otoineppu: "音威子府村",
  hokkaido_yubetsu: "湧別町",
  hokkaido_nakasatsunai: "中札内村",
  hokkaido_sarabetsu: "更別村",
  hokkaido_honbetsu: "本別町",
  hokkaido_hiroo: "広尾町",
  hokkaido_shikaoi: "鹿追町",
  hokkaido_akkeshi: "厚岸町",
  hokkaido_betsukai: "別海町",
  hokkaido_nakashibetsu: "中標津町",
  hokkaido_shibetsu_cho: "標津町",
  hokkaido_shintoku: "新得町",
  hokkaido_kutchan: "倶知安町",
  hokkaido_haboro: "羽幌町",
  // 中部
  niigata_sanjo: "三条市",
  niigata_kashiwazaki: "柏崎市",
  niigata_tsubame: "燕市",
  niigata_agano: "阿賀野市",
  niigata_seiro: "聖籠町",
  niigata_yuzawa: "湯沢町",
  niigata_kamo: "加茂市",
  niigata_minamiuonuma: "南魚沼市",
  niigata_tagami: "田上町",
  toyama_himi: "氷見市",
  toyama_namerikawa: "滑川市",
  toyama_kurobe: "黒部市",
  toyama_nyuzen: "入善町",
  toyama_asahi_ty: "朝日町",
  ishikawa_kanazawa: "金沢市",
  ishikawa_komatsu: "小松市",
  ishikawa_kaga: "加賀市",
  ishikawa_nakanoto: "中能登町",
  fukui_fukuiku: "福井県(ふく育)",
  fukui_sabae: "鯖江市",
  yamanashi_chuo: "中央市",
  yamanashi_minamialps: "南アルプス市",
  yamanashi_hokuto: "北杜市",
  nagano_matsumoto: "松本市",
  nagano_suzaka: "須坂市",
  nagano_komagane: "駒ヶ根市",
  nagano_chikuma: "千曲市",
  nagano_iijimacho: "飯島町",
  nagano_matsukawa: "松川町",
  nagano_ikeda: "池田町",
  gifu_ogaki: "大垣市",
  gifu_seki: "関市",
  gifu_ena: "恵那市",
  gifu_motosu: "本巣市",
  gifu_kaizu: "海津市",
  gifu_anpachi: "安八町",
  gifu_ibigawa: "揖斐川町",
  gifu_ono_gf: "大野町",
  gifu_kakamigahara: "各務原市",
  shizuoka_fujieda: "藤枝市",
  shizuoka_susono: "裾野市",
  shizuoka_kosai: "湖西市",
  shizuoka_izu: "伊豆市",
  shizuoka_omaezaki: "御前崎市",
  shizuoka_nagaizumi: "長泉町",
  shizuoka_kannami: "函南町",
  shizuoka_hamamatsu: "浜松市",
  shizuoka_city: "静岡市",
  aichi_toyokawa: "豊川市",
  aichi_hekinan: "碧南市",
  aichi_shinshiro: "新城市",
  aichi_chiryu: "知立市",
  aichi_inazawa: "稲沢市",
  aichi_iwakura: "岩倉市",
  aichi_nisshin: "日進市",
  aichi_aisai: "愛西市",
  aichi_miyoshi: "みよし市",
  aichi_nagakute: "長久手市",
  aichi_togo: "東郷町",
  aichi_agui: "阿久比町",
  aichi_higashiura: "東浦町",
  aichi_owariasahi: "尾張旭市",
  aichi_komaki: "小牧市",
  aichi_nagoya: "名古屋市",
  gifu_gifu: "岐阜市",
  aichi_toyota: "豊田市",
  aichi_kasugai: "春日井市",
  aichi_ichinomiya: "一宮市",
  // 近畿
  mie_suzuka: "鈴鹿市",
  mie_tsu: "津市",
  mie_toba: "鳥羽市",
  mie_owase: "尾鷲市",
  mie_iga: "伊賀市",
  mie_kisosaki: "木曽岬町",
  mie_taki: "多気町",
  mie_meiwa: "明和町",
  shiga_hikone: "彦根市",
  shiga_nagahama: "長浜市",
  shiga_omihachiman: "近江八幡市",
  shiga_koka: "甲賀市",
  shiga_maibara: "米原市",
  shiga_aisho: "愛荘町",
  shiga_hino: "日野町",
  shiga_toyosato: "豊郷町",
  shiga_otsu: "大津市",
  shiga_moriyama: "守山市",
  kyoto_mamafre: "京都市(ママフレ)",
  kyoto_wakutobi: "京都市(わくわくのトビラ)",
  kyoto_maizuru: "舞鶴市",
  kyoto_ayabe: "綾部市",
  kyoto_joyo: "城陽市",
  kyoto_nagaokakyo: "長岡京市",
  kyoto_yawata: "八幡市",
  kyoto_seika: "精華町",
  kyoto_kumiyama: "久御山町",
  kyoto_minamiyamashiro: "南山城村",
  kyoto_kameoka: "亀岡市",
  kyoto_uji: "宇治市",
  kyoto_muko: "向日市",
  osaka_suita: "吹田市",
  osaka_ikeda: "池田市",
  osaka_izumiotsu: "泉大津市",
  osaka_kaizuka: "貝塚市",
  osaka_moriguchi: "守口市",
  osaka_ibaraki: "茨木市",
  osaka_hirakata: "枚方市",
  osaka_neyagawa: "寝屋川市",
  osaka_izumi: "和泉市",
  osaka_habikino: "羽曳野市",
  osaka_fujiidera: "藤井寺市",
  osaka_higashiosaka: "東大阪市",
  osaka_sennan: "泉南市",
  osaka_hannan: "阪南市",
  osaka_kumatori: "熊取町",
  osaka_tadaoka: "忠岡町",
  osaka_taishi: "太子町",
  osaka_takatsuki: "高槻市",
  osaka_kishiwada: "岸和田市",
  osaka_kawachinagano: "河内長野市",
  osaka_tondabayashi: "富田林市",
  osaka_sakai: "堺市",
  hyogo_ashiya: "芦屋市",
  hyogo_himeji: "姫路市",
  hyogo_itami: "伊丹市",
  hyogo_kakogawa: "加古川市",
  hyogo_tatsuno: "たつの市",
  hyogo_ono: "小野市",
  hyogo_shiso: "宍粟市",
  hyogo_kato: "加東市",
  hyogo_inagawa: "猪名川町",
  hyogo_inami: "稲美町",
  hyogo_fukusaki: "福崎町",
  hyogo_kamikawa: "神河町",
  nara_tenri: "天理市",
  nara_kashihara: "橿原市",
  nara_gojo: "五條市",
  nara_gose: "御所市",
  nara_ikoma: "生駒市",
  nara_ikaruga: "斑鳩町",
  nara_ando: "安堵町",
  nara_kawanishi_nr: "河合町",
  nara_tawaramoto: "田原本町",
  nara_oji: "王寺町",
  nara_koryo: "広陵町",
  nara_asuka: "明日香村",
  nara_totsukawa: "十津川村",
  nara_shimoichi: "下市町",
  wakayama_hashimoto: "橋本市",
  wakayama_inami_wk: "印南町",
  // 中国・四国
  tottori_kosodate: "鳥取県(子育て王国)",
  tottori_nichinan: "日南町",
  tottori_sakaiminato: "境港市",
  shimane_masuda: "益田市",
  shimane_ama: "海士町",
  okayama_okayama: "岡山市",
  okayama_akaiwa: "赤磐市",
  okayama_mimasaka: "美作市",
  okayama_hayashima: "早島町",
  hiroshima_hiroshima: "広島市",
  hiroshima_ikuchan: "広島県(イクちゃんネット)",
  hiroshima_fuchu: "府中市",
  hiroshima_otake: "大竹市",
  hiroshima_higashihiroshima: "東広島市",
  hiroshima_fukuyama: "福山市",
  hiroshima_kure: "呉市",
  hiroshima_onomichi: "尾道市",
  hiroshima_mihara: "三原市",
  hiroshima_hatsukaichi: "廿日市市",
  yamaguchi_hikari: "光市",
  yamaguchi_shimonoseki: "下関市",
  yamaguchi_yamaguchi: "山口市",
  yamaguchi_shunan: "周南市",
  yamaguchi_ube: "宇部市",
  tokushima_tokushima: "徳島市",
  tokushima_naka: "那賀町",
  tokushima_higashimiyoshi: "東みよし町",
  kagawa_takamatsu: "高松市",
  kagawa_sanuki: "さぬき市",
  kagawa_mitoyo: "三豊市",
  kagawa_tonosho: "土庄町",
  kagawa_marugame: "丸亀市",
  kagawa_sakaide: "坂出市",
  ehime_seiyo: "西予市",
  ehime_tobe: "砥部町",
  ehime_niihama: "新居浜市",
  ehime_saijo: "西条市",
  kochi_muroto: "室戸市",
  kochi_kokohare: "高知県(ココハレ)",
  // 九州・沖縄
  fukuoka_fukutsu: "福津市",
  fukuoka_shingu_fk: "新宮町",
  fukuoka_kitakyushu: "北九州市",
  fukuoka_hirokawa: "広川町",
  fukuoka_kawara: "川崎町",
  fukuoka_chikushino: "筑紫野市",
  fukuoka_nakagawa: "那珂川市",
  nagasaki_nagasaki: "長崎市",
  nagasaki_tsushima: "対馬市",
  nagasaki_iki: "壱岐市",
  nagasaki_saikai: "西海市",
  nagasaki_togitsu: "時津町",
  nagasaki_higashisonogi: "東彼杵町",
  saga_karatsu: "唐津市",
  saga_tosu: "鳥栖市",
  kumamoto_takamori: "高森町",
  kumamoto_kikuchi: "菊池市",
  kumamoto_kosodate: "熊本市(子育て)",
  oita_hita: "日田市",
  oita_taketa: "竹田市",
  oita_kitsuki: "杵築市",
  oita_kusu: "玖珠町",
  miyazaki_sukusuku: "すくすくみやざき",
  miyazaki_miyazaki: "宮崎市",
  miyazaki_nichinan: "日南市",
  miyazaki_kijo: "木城町",
  miyazaki_kadogawa: "門川町",
  miyazaki_miyakojima: "都城市",
  kagoshima_satsumasendai: "薩摩川内市",
  kagoshima_minamikyushu: "南九州市",
  kagoshima_satsuma: "さつま町",
  kagoshima_kimotsuki: "肝付町",
  ikoyo_miyagi: "いこーよ(宮城)",
  ikoyo_niigata: "いこーよ(新潟)",
  ikoyo_fukui: "いこーよ(福井)",
  ikoyo_gifu: "いこーよ(岐阜)",
  ikoyo_aichi: "いこーよ(愛知)",
  ikoyo_mie: "いこーよ(三重)",
  ikoyo_kyoto: "いこーよ(京都)",
  ikoyo_osaka: "いこーよ(大阪)",
  ikoyo_shimane: "いこーよ(島根)",
  ikoyo_hiroshima: "いこーよ(広島)",
  ikoyo_yamaguchi: "いこーよ(山口)",
  ikoyo_ehime: "いこーよ(愛媛)",
  ikoyo_kochi: "いこーよ(高知)",
  ikoyo_fukuoka: "いこーよ(福岡)",
  ikoyo_saga: "いこーよ(佐賀)",
  ikoyo_kumamoto: "いこーよ(熊本)",
  ikoyo_miyazaki: "いこーよ(宮崎)",
  ikoyo_kagoshima: "いこーよ(鹿児島)",
  hokkaido_sapporo: "札幌市",
  iwate_morioka: "盛岡市",
  oita_oita: "大分市",
  wakayama_wakayama: "和歌山市",
  okinawa_naha: "那覇市",
  okinawa_yomitan: "読谷村",
  okinawa_kitanakagusuku: "北中城村",
  okinawa_ie: "伊江村",
  shizuoka_atami: "熱海市",
  shizuoka_ito: "伊東市",
  aichi_kiyosu: "清須市",
  okayama_kibichuo: "吉備中央町",
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

// ========== 東北6県 ==========
// 青森県
const AOMORI_AOMORI_SOURCE = { key: "aomori_aomori", label: "青森市", baseUrl: "https://www.city.aomori.aomori.jp", center: { lat: 40.8246, lng: 140.7406 } };
const HACHINOHE_SOURCE = { key: "aomori_hachinohe", label: "八戸市", baseUrl: "https://www.city.hachinohe.aomori.jp", center: { lat: 40.5122, lng: 141.4883 } };
const TSUGARU_SOURCE = { key: "aomori_tsugaru", label: "つがる市", baseUrl: "https://www.city.tsugaru.aomori.jp", center: { lat: 40.8079, lng: 140.3800 } };
const HIRANAI_SOURCE = { key: "aomori_hiranai", label: "平内町", baseUrl: "https://www.town.hiranai.aomori.jp", center: { lat: 40.9262, lng: 140.9571 } };
const NAKADOMARI_SOURCE = { key: "aomori_nakadomari", label: "中泊町", baseUrl: "https://www.town.nakadomari.lg.jp", center: { lat: 41.0494, lng: 140.4314 } };
const YOMOGITA_SOURCE = { key: "aomori_yomogita", label: "蓬田村", baseUrl: "https://www.vill.yomogita.lg.jp", center: { lat: 41.0087, lng: 140.6551 } };
const ITAYANAGI_SOURCE = { key: "aomori_itayanagi", label: "板柳町", baseUrl: "https://www.town.itayanagi.aomori.jp", center: { lat: 40.6935, lng: 140.4581 } };
// 岩手県
const IWATE_ICHINOSEKI_SOURCE = { key: "iwate_ichinoseki", label: "一関市", baseUrl: "https://www.city.ichinoseki.iwate.jp", center: { lat: 38.9347, lng: 141.1286 } };
const IWATE_MORIOKA_SOURCE = { key: "iwate_morioka", label: "盛岡市", baseUrl: "https://www.city.morioka.iwate.jp", center: { lat: 39.7036, lng: 141.1527 } };
const KITAKAMI_SOURCE = { key: "iwate_kitakami", label: "北上市", baseUrl: "https://www.city.kitakami.iwate.jp", center: { lat: 39.2866, lng: 141.1129 } };
const KUJI_SOURCE = { key: "iwate_kuji", label: "久慈市", baseUrl: "https://www.city.kuji.iwate.jp", center: { lat: 40.1904, lng: 141.7766 } };
const OSHU_SOURCE = { key: "iwate_oshu", label: "奥州市", baseUrl: "https://www.city.oshu.iwate.jp", center: { lat: 39.1441, lng: 141.1388 } };
const NISHIWAGA_SOURCE = { key: "iwate_nishiwaga", label: "西和賀町", baseUrl: "https://www.town.nishiwaga.lg.jp", center: { lat: 39.3197, lng: 140.6909 } };
const ICHINOHE_SOURCE = { key: "iwate_ichinohe", label: "一戸町", baseUrl: "https://www.town.ichinohe.iwate.jp", center: { lat: 40.2117, lng: 141.2978 } };
const OTSUCHI_SOURCE = { key: "iwate_otsuchi", label: "大槌町", baseUrl: "https://www.town.otsuchi.iwate.jp", center: { lat: 39.3590, lng: 141.8966 } };
// 宮城県
const MIYAGI_SENDAI_SOURCE = { key: "miyagi_sendai", label: "仙台市", baseUrl: "https://sendai-city.mamafre.jp", center: { lat: 38.2682, lng: 140.8694 } };
const ISHINOMAKI_SOURCE = { key: "miyagi_ishinomaki", label: "石巻市", baseUrl: "https://www.city.ishinomaki.lg.jp", center: { lat: 38.4341, lng: 141.3029 } };
const HIGASHIMATSUSHIMA_SOURCE = { key: "miyagi_higashimatsushima", label: "東松島市", baseUrl: "https://www.city.higashimatsushima.miyagi.jp", center: { lat: 38.4256, lng: 141.2108 } };
const ZAO_SOURCE = { key: "miyagi_zao", label: "蔵王町", baseUrl: "https://www.town.zao.miyagi.jp", center: { lat: 38.1005, lng: 140.6583 } };
const SHICHIKASHUKU_SOURCE = { key: "miyagi_shichikashuku", label: "七ヶ宿町", baseUrl: "https://www.town.shichikashuku.miyagi.jp", center: { lat: 37.9813, lng: 140.3516 } };
const SHICHIGAHAMA_SOURCE = { key: "miyagi_shichigahama", label: "七ヶ浜町", baseUrl: "https://www.shichigahama.com", center: { lat: 38.2979, lng: 141.0573 } };
const TAIWA_SOURCE = { key: "miyagi_taiwa", label: "大和町", baseUrl: "https://www.town.taiwa.miyagi.jp", center: { lat: 38.4399, lng: 140.8849 } };
const SHIKAMA_SOURCE = { key: "miyagi_shikama", label: "色麻町", baseUrl: "https://www.town.shikama.miyagi.jp", center: { lat: 38.5713, lng: 140.8459 } };
const NATORI_SOURCE = { key: "miyagi_natori", label: "名取市", baseUrl: "https://www.city.natori.miyagi.jp", center: { lat: 38.1707, lng: 140.8913 } };
const SHIOGAMA_SOURCE = { key: "miyagi_shiogama", label: "塩竈市", baseUrl: "https://www.city.shiogama.miyagi.jp", center: { lat: 38.3138, lng: 141.0222 } };
// 秋田県
const AKITA_KOSODATE_SOURCE = { key: "akita_kosodate", label: "秋田市(子育て情報)", baseUrl: "https://www.kosodate-akita.com", center: { lat: 39.7200, lng: 140.1025 } };
const YOKOTE_SOURCE = { key: "akita_yokote", label: "横手市", baseUrl: "https://www.city.yokote.lg.jp", center: { lat: 39.3112, lng: 140.5539 } };
const YURIHONJYO_SOURCE = { key: "akita_yurihonjyo", label: "由利本荘市", baseUrl: "https://www.city.yurihonjo.lg.jp", center: { lat: 39.3859, lng: 140.0485 } };
const OGA_SOURCE = { key: "akita_oga", label: "男鹿市", baseUrl: "https://www.city.oga.akita.jp", center: { lat: 39.8868, lng: 139.8492 } };
const KOSAKA_SOURCE = { key: "akita_kosaka", label: "小坂町", baseUrl: "https://www.town.kosaka.akita.jp", center: { lat: 40.3296, lng: 140.7393 } };
const HACHIROGATA_SOURCE = { key: "akita_hachirogata", label: "八郎潟町", baseUrl: "https://www.town.hachirogata.akita.jp", center: { lat: 39.9414, lng: 140.0644 } };
// 山形県
const YONEZAWA_SOURCE = { key: "yamagata_yonezawa", label: "米沢市", baseUrl: "https://www.city.yonezawa.yamagata.jp", center: { lat: 37.9227, lng: 140.1166 } };
const SAKATA_SOURCE = { key: "yamagata_sakata", label: "酒田市", baseUrl: "https://www.city.sakata.lg.jp", center: { lat: 38.9145, lng: 139.8364 } };
const SHINJO_SOURCE = { key: "yamagata_shinjo", label: "新庄市", baseUrl: "https://www.city.shinjo.yamagata.jp", center: { lat: 38.7632, lng: 140.3068 } };
const NAGAI_SOURCE = { key: "yamagata_nagai", label: "長井市", baseUrl: "https://www.city.nagai.yamagata.jp", center: { lat: 38.1078, lng: 140.0421 } };
const NAKAYAMA_YM_SOURCE = { key: "yamagata_nakayama", label: "中山町", baseUrl: "https://www.town.nakayama.yamagata.jp", center: { lat: 38.3063, lng: 140.2726 } };
const KAHOKU_SOURCE = { key: "yamagata_kahoku", label: "河北町", baseUrl: "https://www.town.kahoku.yamagata.jp", center: { lat: 38.4167, lng: 140.3114 } };
const ASAHI_YM_SOURCE = { key: "yamagata_asahi_ym", label: "朝日町", baseUrl: "https://www.town.asahi.yamagata.jp", center: { lat: 38.2879, lng: 140.1492 } };
const KANEYAMA_YM_SOURCE = { key: "yamagata_kaneyama", label: "金山町", baseUrl: "https://www.town.kaneyama.yamagata.jp", center: { lat: 38.8823, lng: 140.3396 } };
const MAMUROGAWA_SOURCE = { key: "yamagata_mamurogawa", label: "真室川町", baseUrl: "https://www.town.mamurogawa.yamagata.jp", center: { lat: 38.8580, lng: 140.2536 } };
const OKURA_SOURCE = { key: "yamagata_okura", label: "大蔵村", baseUrl: "https://www.vill.ohkura.yamagata.jp", center: { lat: 38.6685, lng: 140.1920 } };
const SHIRATAKA_SOURCE = { key: "yamagata_shirataka", label: "白鷹町", baseUrl: "https://www.town.shirataka.lg.jp", center: { lat: 38.1893, lng: 140.0994 } };
// 福島県
const FUKUSHIMA_CITY_SOURCE = { key: "fukushima_fukushima", label: "福島市", baseUrl: "https://www.city.fukushima.fukushima.jp", center: { lat: 37.7608, lng: 140.4748 } };
const FUKUSHIMA_KORIYAMA_SOURCE = { key: "fukushima_koriyama", label: "郡山市", baseUrl: "https://www.city.koriyama.lg.jp", center: { lat: 37.4006, lng: 140.3596 } };
const SOMA_SOURCE = { key: "fukushima_soma", label: "相馬市", baseUrl: "https://www.city.soma.fukushima.jp", center: { lat: 37.7963, lng: 140.9197 } };
const MINAMISOMA_SOURCE = { key: "fukushima_minamisoma", label: "南相馬市", baseUrl: "https://www.city.minamisoma.lg.jp", center: { lat: 37.6422, lng: 140.9574 } };
const OTAMA_SOURCE = { key: "fukushima_otama", label: "大玉村", baseUrl: "https://www.vill.otama.fukushima.jp", center: { lat: 37.5340, lng: 140.3587 } };
const SHIMOGO_SOURCE = { key: "fukushima_shimogo", label: "下郷町", baseUrl: "https://www.town.shimogo.fukushima.jp", center: { lat: 37.2249, lng: 139.8630 } };
const AIZUMISATO_SOURCE = { key: "fukushima_aizumisato", label: "会津美里町", baseUrl: "https://www.town.aizumisato.fukushima.jp", center: { lat: 37.4590, lng: 139.8422 } };
const FURUDONO_SOURCE = { key: "fukushima_furudono", label: "古殿町", baseUrl: "https://www.town.furudono.fukushima.jp", center: { lat: 37.0934, lng: 140.5600 } };

// ========== 北海道 ==========
// 北海道
const HOKKAIDO_IWAMIZAWA_SOURCE = { key: "hokkaido_iwamizawa", label: "岩見沢市", baseUrl: "https://www.city.iwamizawa.hokkaido.jp", center: { lat: 43.1965, lng: 141.7764 } };
const HOKKAIDO_SHIBETSU_SOURCE = { key: "hokkaido_shibetsu", label: "士別市", baseUrl: "https://www.city.shibetsu.lg.jp", center: { lat: 44.1765, lng: 142.3987 } };
const HOKKAIDO_CHITOSE_SOURCE = { key: "hokkaido_chitose", label: "千歳市", baseUrl: "https://www.city.chitose.lg.jp", center: { lat: 42.8195, lng: 141.6516 } };
const HOKKAIDO_MORI_SOURCE = { key: "hokkaido_mori", label: "森町", baseUrl: "https://www.town.hokkaido-mori.lg.jp", center: { lat: 42.1033, lng: 140.5742 } };
const HOKKAIDO_OZORA_SOURCE = { key: "hokkaido_ozora", label: "大空町", baseUrl: "https://www.town.ozora.hokkaido.jp", center: { lat: 43.6167, lng: 144.1833 } };
const HOKKAIDO_TSUBETSU_SOURCE = { key: "hokkaido_tsubetsu", label: "津別町", baseUrl: "https://www.town.tsubetsu.lg.jp", center: { lat: 43.7212, lng: 144.028 } };
const HOKKAIDO_TAIKI_SOURCE = { key: "hokkaido_taiki", label: "大樹町", baseUrl: "https://www.town.taiki.hokkaido.jp", center: { lat: 42.493, lng: 143.2845 } };
const HOKKAIDO_NISEKO_SOURCE = { key: "hokkaido_niseko", label: "ニセコ町", baseUrl: "https://www.town.niseko.lg.jp", center: { lat: 42.871, lng: 140.6877 } };
const HOKKAIDO_SHIRAOI_SOURCE = { key: "hokkaido_shiraoi", label: "白老町", baseUrl: "https://www.town.shiraoi.hokkaido.jp", center: { lat: 42.55, lng: 141.3553 } };
const HOKKAIDO_HIGASHIKAGURA_SOURCE = { key: "hokkaido_higashikagura", label: "東神楽町", baseUrl: "https://www.town.higashikagura.lg.jp", center: { lat: 43.6932, lng: 142.45 } };
const HOKKAIDO_OTOINEPPU_SOURCE = { key: "hokkaido_otoineppu", label: "音威子府村", baseUrl: "https://www.vill.otoineppu.hokkaido.jp", center: { lat: 44.7247, lng: 142.2575 } };
const HOKKAIDO_YUBETSU_SOURCE = { key: "hokkaido_yubetsu", label: "湧別町", baseUrl: "https://www.town.yubetsu.lg.jp", center: { lat: 44.1682, lng: 143.5845 } };
const HOKKAIDO_NAKASATSUNAI_SOURCE = { key: "hokkaido_nakasatsunai", label: "中札内村", baseUrl: "https://www.vill.nakasatsunai.hokkaido.jp", center: { lat: 42.6695, lng: 143.1295 } };
const HOKKAIDO_SARABETSU_SOURCE = { key: "hokkaido_sarabetsu", label: "更別村", baseUrl: "https://www.sarabetsu.jp", center: { lat: 42.56, lng: 143.23 } };
const HOKKAIDO_HONBETSU_SOURCE = { key: "hokkaido_honbetsu", label: "本別町", baseUrl: "https://www.town.honbetsu.hokkaido.jp", center: { lat: 43.1184, lng: 143.5483 } };
const HOKKAIDO_HIROO_SOURCE = { key: "hokkaido_hiroo", label: "広尾町", baseUrl: "https://www.town.hiroo.lg.jp", center: { lat: 42.2845, lng: 143.3148 } };
const HOKKAIDO_SHIKAOI_SOURCE = { key: "hokkaido_shikaoi", label: "鹿追町", baseUrl: "https://www.town.shikaoi.lg.jp", center: { lat: 43.0917, lng: 143.1003 } };
const HOKKAIDO_AKKESHI_SOURCE = { key: "hokkaido_akkeshi", label: "厚岸町", baseUrl: "https://www.akkeshi-town.jp", center: { lat: 43.0488, lng: 144.8439 } };
const HOKKAIDO_BETSUKAI_SOURCE = { key: "hokkaido_betsukai", label: "別海町", baseUrl: "https://betsukai.jp", center: { lat: 43.3905, lng: 145.1178 } };
const HOKKAIDO_NAKASHIBETSU_SOURCE = { key: "hokkaido_nakashibetsu", label: "中標津町", baseUrl: "https://www.nakashibetsu.jp", center: { lat: 43.5493, lng: 144.9695 } };
const HOKKAIDO_SHIBETSU_CHO_SOURCE = { key: "hokkaido_shibetsu_cho", label: "標津町", baseUrl: "https://www.shibetsutown.jp", center: { lat: 43.6619, lng: 145.1257 } };
const HOKKAIDO_SHINTOKU_SOURCE = { key: "hokkaido_shintoku", label: "新得町", baseUrl: "https://www.shintoku-town.jp", center: { lat: 43.0735, lng: 142.8475 } };
const HOKKAIDO_KUTCHAN_SOURCE = { key: "hokkaido_kutchan", label: "倶知安町", baseUrl: "https://www.town.kutchan.hokkaido.jp", center: { lat: 42.9018, lng: 140.757 } };
const HOKKAIDO_HABORO_SOURCE = { key: "hokkaido_haboro", label: "羽幌町", baseUrl: "https://www.town.haboro.lg.jp", center: { lat: 44.3597, lng: 141.7013 } };

// ========== 中部 ==========
// 新潟県
const NIIGATA_SANJO_SOURCE = { key: "niigata_sanjo", label: "三条市", baseUrl: "https://www.city.sanjo.niigata.jp", center: { lat: 37.6297, lng: 138.9624 } };
const NIIGATA_KASHIWAZAKI_SOURCE = { key: "niigata_kashiwazaki", label: "柏崎市", baseUrl: "https://www.city.kashiwazaki.lg.jp", center: { lat: 37.3724, lng: 138.5592 } };
const NIIGATA_TSUBAME_SOURCE = { key: "niigata_tsubame", label: "燕市", baseUrl: "https://www.city.tsubame.niigata.jp", center: { lat: 37.6719, lng: 138.8805 } };
const NIIGATA_AGANO_SOURCE = { key: "niigata_agano", label: "阿賀野市", baseUrl: "https://www.city.agano.niigata.jp", center: { lat: 37.8307, lng: 139.2297 } };
const NIIGATA_SEIRO_SOURCE = { key: "niigata_seiro", label: "聖籠町", baseUrl: "https://www.town.seiro.niigata.jp", center: { lat: 37.9625, lng: 139.2792 } };
const NIIGATA_YUZAWA_SOURCE = { key: "niigata_yuzawa", label: "湯沢町", baseUrl: "https://www.town.yuzawa.lg.jp", center: { lat: 36.9329, lng: 138.8131 } };
const NIIGATA_KAMO_SOURCE = { key: "niigata_kamo", label: "加茂市", baseUrl: "https://www.city.kamo.niigata.jp", center: { lat: 37.6621, lng: 139.0406 } };
const NIIGATA_MINAMIUONUMA_SOURCE = { key: "niigata_minamiuonuma", label: "南魚沼市", baseUrl: "https://www.city.minamiuonuma.niigata.jp", center: { lat: 37.0665, lng: 138.8815 } };
const NIIGATA_TAGAMI_SOURCE = { key: "niigata_tagami", label: "田上町", baseUrl: "https://www.town.tagami.niigata.jp", center: { lat: 37.6937, lng: 139.0646 } };
// 富山県
const TOYAMA_HIMI_SOURCE = { key: "toyama_himi", label: "氷見市", baseUrl: "https://www.city.himi.toyama.jp", center: { lat: 36.8563, lng: 136.9832 } };
const TOYAMA_NAMERIKAWA_SOURCE = { key: "toyama_namerikawa", label: "滑川市", baseUrl: "https://www.city.namerikawa.toyama.jp", center: { lat: 36.7643, lng: 137.3398 } };
const TOYAMA_KUROBE_SOURCE = { key: "toyama_kurobe", label: "黒部市", baseUrl: "https://www.city.kurobe.toyama.jp", center: { lat: 36.8709, lng: 137.435 } };
const TOYAMA_NYUZEN_SOURCE = { key: "toyama_nyuzen", label: "入善町", baseUrl: "https://www.town.nyuzen.toyama.jp", center: { lat: 36.9317, lng: 137.5011 } };
const TOYAMA_ASAHI_TY_SOURCE = { key: "toyama_asahi_ty", label: "朝日町", baseUrl: "https://www.town.asahi.toyama.jp", center: { lat: 36.9464, lng: 137.5611 } };
// 石川県
const ISHIKAWA_KANAZAWA_SOURCE = { key: "ishikawa_kanazawa", label: "金沢市", baseUrl: "https://www4.city.kanazawa.lg.jp", center: { lat: 36.5613, lng: 136.6562 } };
const ISHIKAWA_KOMATSU_SOURCE = { key: "ishikawa_komatsu", label: "小松市", baseUrl: "https://www.city.komatsu.lg.jp", center: { lat: 36.4022, lng: 136.4451 } };
const ISHIKAWA_KAGA_SOURCE = { key: "ishikawa_kaga", label: "加賀市", baseUrl: "https://www.city.kaga.ishikawa.jp", center: { lat: 36.3028, lng: 136.3147 } };
const ISHIKAWA_NAKANOTO_SOURCE = { key: "ishikawa_nakanoto", label: "中能登町", baseUrl: "https://www.town.nakanoto.ishikawa.jp", center: { lat: 36.8902, lng: 136.872 } };
// 福井県
const FUKUI_FUKUIKU_SOURCE = { key: "fukui_fukuiku", label: "福井県(ふく育)", baseUrl: "https://www.fuku-iku.jp", center: { lat: 36.0652, lng: 136.2219 } };
const FUKUI_SABAE_SOURCE = { key: "fukui_sabae", label: "鯖江市", baseUrl: "https://www.city.sabae.fukui.jp", center: { lat: 35.9563, lng: 136.1842 } };
// 山梨県
const YAMANASHI_CHUO_SOURCE = { key: "yamanashi_chuo", label: "中央市", baseUrl: "https://www.city.chuo.yamanashi.jp", center: { lat: 35.6087, lng: 138.5224 } };
const YAMANASHI_MINAMIALPS_SOURCE = { key: "yamanashi_minamialps", label: "南アルプス市", baseUrl: "https://www.city.minami-alps.yamanashi.jp", center: { lat: 35.6085, lng: 138.4655 } };
const YAMANASHI_HOKUTO_SOURCE = { key: "yamanashi_hokuto", label: "北杜市", baseUrl: "https://www.city.hokuto.yamanashi.jp", center: { lat: 35.7811, lng: 138.381 } };
// 長野県
const NAGANO_MATSUMOTO_SOURCE = { key: "nagano_matsumoto", label: "松本市", baseUrl: "https://www.city.matsumoto.nagano.jp", center: { lat: 36.2380, lng: 137.9720 } };
const NAGANO_SUZAKA_SOURCE = { key: "nagano_suzaka", label: "須坂市", baseUrl: "https://www.city.suzaka.nagano.jp", center: { lat: 36.6511, lng: 138.3071 } };
const NAGANO_KOMAGANE_SOURCE = { key: "nagano_komagane", label: "駒ヶ根市", baseUrl: "https://www.city.komagane.nagano.jp", center: { lat: 35.7273, lng: 137.9933 } };
const NAGANO_CHIKUMA_SOURCE = { key: "nagano_chikuma", label: "千曲市", baseUrl: "https://www.city.chikuma.lg.jp", center: { lat: 36.5309, lng: 138.1182 } };
const NAGANO_IIJIMACHO_SOURCE = { key: "nagano_iijimacho", label: "飯島町", baseUrl: "https://www.town.iijima.lg.jp", center: { lat: 35.6654, lng: 137.9159 } };
const NAGANO_MATSUKAWA_SOURCE = { key: "nagano_matsukawa", label: "松川町", baseUrl: "https://www.town.matsukawa.nagano.jp", center: { lat: 35.5843, lng: 137.9175 } };
const NAGANO_IKEDA_SOURCE = { key: "nagano_ikeda", label: "池田町", baseUrl: "https://www.ikedamachi.net", center: { lat: 36.4217, lng: 137.8775 } };
// 岐阜県
const GIFU_OGAKI_SOURCE = { key: "gifu_ogaki", label: "大垣市", baseUrl: "https://www.city.ogaki.lg.jp", center: { lat: 35.3598, lng: 136.6129 } };
const GIFU_SEKI_SOURCE = { key: "gifu_seki", label: "関市", baseUrl: "https://www.city.seki.lg.jp", center: { lat: 35.4955, lng: 136.9175 } };
const GIFU_ENA_SOURCE = { key: "gifu_ena", label: "恵那市", baseUrl: "https://www.city.ena.lg.jp", center: { lat: 35.4498, lng: 137.4127 } };
const GIFU_MOTOSU_SOURCE = { key: "gifu_motosu", label: "本巣市", baseUrl: "https://www.city.motosu.lg.jp", center: { lat: 35.4833, lng: 136.6862 } };
const GIFU_KAIZU_SOURCE = { key: "gifu_kaizu", label: "海津市", baseUrl: "https://www.city.kaizu.lg.jp", center: { lat: 35.2241, lng: 136.6337 } };
const GIFU_ANPACHI_SOURCE = { key: "gifu_anpachi", label: "安八町", baseUrl: "https://www.town.anpachi.gifu.jp", center: { lat: 35.3427, lng: 136.6389 } };
const GIFU_IBIGAWA_SOURCE = { key: "gifu_ibigawa", label: "揖斐川町", baseUrl: "https://www.town.ibigawa.lg.jp", center: { lat: 35.4787, lng: 136.5717 } };
const GIFU_ONO_GF_SOURCE = { key: "gifu_ono_gf", label: "大野町", baseUrl: "https://www.town-ono.jp", center: { lat: 35.468, lng: 136.6343 } };
// 静岡県
const SHIZUOKA_FUJIEDA_SOURCE = { key: "shizuoka_fujieda", label: "藤枝市", baseUrl: "https://www.city.fujieda.shizuoka.jp", center: { lat: 34.8679, lng: 138.2529 } };
const SHIZUOKA_SUSONO_SOURCE = { key: "shizuoka_susono", label: "裾野市", baseUrl: "https://www.city.susono.shizuoka.jp", center: { lat: 35.1744, lng: 138.9056 } };
const SHIZUOKA_KOSAI_SOURCE = { key: "shizuoka_kosai", label: "湖西市", baseUrl: "https://www.city.kosai.shizuoka.jp", center: { lat: 34.7189, lng: 137.5266 } };
const SHIZUOKA_IZU_SOURCE = { key: "shizuoka_izu", label: "伊豆市", baseUrl: "https://www.city.izu.shizuoka.jp", center: { lat: 34.9744, lng: 138.9456 } };
const SHIZUOKA_OMAEZAKI_SOURCE = { key: "shizuoka_omaezaki", label: "御前崎市", baseUrl: "https://www.city.omaezaki.shizuoka.jp", center: { lat: 34.6381, lng: 138.127 } };
const SHIZUOKA_NAGAIZUMI_SOURCE = { key: "shizuoka_nagaizumi", label: "長泉町", baseUrl: "https://www.town.nagaizumi.lg.jp", center: { lat: 35.144, lng: 138.8948 } };
const SHIZUOKA_KANNAMI_SOURCE = { key: "shizuoka_kannami", label: "函南町", baseUrl: "https://www.town.kannami.shizuoka.jp", center: { lat: 35.0726, lng: 138.9456 } };
const SHIZUOKA_HAMAMATSU_SOURCE = { key: "shizuoka_hamamatsu", label: "浜松市", baseUrl: "https://www.city.hamamatsu.shizuoka.jp", center: { lat: 34.7108, lng: 137.7261 } };
const SHIZUOKA_CITY_SOURCE = { key: "shizuoka_city", label: "静岡市", baseUrl: "https://shizuoka-city.mamafre.jp", center: { lat: 34.9756, lng: 138.3826 } };
// 愛知県
const AICHI_TOYOKAWA_SOURCE = { key: "aichi_toyokawa", label: "豊川市", baseUrl: "https://www.city.toyokawa.lg.jp", center: { lat: 34.8275, lng: 137.3755 } };
const AICHI_HEKINAN_SOURCE = { key: "aichi_hekinan", label: "碧南市", baseUrl: "https://www.city.hekinan.lg.jp", center: { lat: 34.8815, lng: 136.9935 } };
const AICHI_SHINSHIRO_SOURCE = { key: "aichi_shinshiro", label: "新城市", baseUrl: "https://www.city.shinshiro.lg.jp", center: { lat: 34.8993, lng: 137.4979 } };
const AICHI_CHIRYU_SOURCE = { key: "aichi_chiryu", label: "知立市", baseUrl: "https://www.city.chiryu.aichi.jp", center: { lat: 34.9928, lng: 137.051 } };
const AICHI_INAZAWA_SOURCE = { key: "aichi_inazawa", label: "稲沢市", baseUrl: "https://www.city.inazawa.aichi.jp", center: { lat: 35.2476, lng: 136.7858 } };
const AICHI_IWAKURA_SOURCE = { key: "aichi_iwakura", label: "岩倉市", baseUrl: "https://www.city.iwakura.aichi.jp", center: { lat: 35.2797, lng: 136.8704 } };
const AICHI_NISSHIN_SOURCE = { key: "aichi_nisshin", label: "日進市", baseUrl: "https://www.city.nisshin.lg.jp", center: { lat: 35.1316, lng: 137.0397 } };
const AICHI_AISAI_SOURCE = { key: "aichi_aisai", label: "愛西市", baseUrl: "https://www.city.aisai.lg.jp", center: { lat: 35.1586, lng: 136.7256 } };
const AICHI_MIYOSHI_SOURCE = { key: "aichi_miyoshi", label: "みよし市", baseUrl: "https://www.city.aichi-miyoshi.lg.jp", center: { lat: 35.086, lng: 137.0704 } };
const AICHI_NAGAKUTE_SOURCE = { key: "aichi_nagakute", label: "長久手市", baseUrl: "https://www.city.nagakute.lg.jp", center: { lat: 35.183, lng: 137.0481 } };
const AICHI_TOGO_SOURCE = { key: "aichi_togo", label: "東郷町", baseUrl: "https://www.town.aichi-togo.lg.jp", center: { lat: 35.0917, lng: 137.0556 } };
const AICHI_AGUI_SOURCE = { key: "aichi_agui", label: "阿久比町", baseUrl: "https://www.town.agui.lg.jp", center: { lat: 34.9336, lng: 136.9192 } };
const AICHI_HIGASHIURA_SOURCE = { key: "aichi_higashiura", label: "東浦町", baseUrl: "https://www.town.aichi-higashiura.lg.jp", center: { lat: 34.974, lng: 136.9641 } };
const AICHI_OWARIASAHI_SOURCE = { key: "aichi_owariasahi", label: "尾張旭市", baseUrl: "https://www.city.owariasahi.lg.jp", center: { lat: 35.2163, lng: 137.0349 } };
const AICHI_KOMAKI_SOURCE = { key: "aichi_komaki", label: "小牧市", baseUrl: "https://www.city.komaki.aichi.jp", center: { lat: 35.2917, lng: 136.9210 } };
const AICHI_NAGOYA_SOURCE = { key: "aichi_nagoya", label: "名古屋市", baseUrl: "https://www.city.nagoya.jp", center: { lat: 35.1815, lng: 136.9066 } };
const AICHI_TOYOTA_SOURCE = { key: "aichi_toyota", label: "豊田市", baseUrl: "https://www.city.toyota.aichi.jp", center: { lat: 35.0826, lng: 137.1560 } };
const AICHI_KASUGAI_SOURCE = { key: "aichi_kasugai", label: "春日井市", baseUrl: "https://www.city.kasugai.lg.jp", center: { lat: 35.2473, lng: 136.9722 } };
const AICHI_ICHINOMIYA_SOURCE = { key: "aichi_ichinomiya", label: "一宮市", baseUrl: "https://www.city.ichinomiya.aichi.jp", center: { lat: 35.3040, lng: 136.8030 } };
const GIFU_KAKAMIGAHARA_SOURCE = { key: "gifu_kakamigahara", label: "各務原市", baseUrl: "https://www.city.kakamigahara.lg.jp", center: { lat: 35.3989, lng: 136.8483 } };
const GIFU_GIFU_SOURCE = { key: "gifu_gifu", label: "岐阜市", baseUrl: "https://www.city.gifu.lg.jp", center: { lat: 35.4232, lng: 136.7606 } };

// ========== 近畿 ==========
// 三重県
const MIE_SUZUKA_SOURCE = { key: "mie_suzuka", label: "鈴鹿市", baseUrl: "https://www.city.suzuka.lg.jp", center: { lat: 34.8824, lng: 136.5842 } };
const MIE_TSU_SOURCE = { key: "mie_tsu", label: "津市", baseUrl: "https://www.info.city.tsu.mie.jp", center: { lat: 34.7303, lng: 136.5086 } };
const MIE_TOBA_SOURCE = { key: "mie_toba", label: "鳥羽市", baseUrl: "https://www.city.toba.mie.jp", center: { lat: 34.4802, lng: 136.8427 } };
const MIE_OWASE_SOURCE = { key: "mie_owase", label: "尾鷲市", baseUrl: "https://www.city.owase.lg.jp", center: { lat: 34.0706, lng: 136.1909 } };
const MIE_IGA_SOURCE = { key: "mie_iga", label: "伊賀市", baseUrl: "https://www.city.iga.lg.jp", center: { lat: 34.7663, lng: 136.1295 } };
const MIE_KISOSAKI_SOURCE = { key: "mie_kisosaki", label: "木曽岬町", baseUrl: "https://www.town.kisosaki.lg.jp", center: { lat: 35.0887, lng: 136.7726 } };
const MIE_TAKI_SOURCE = { key: "mie_taki", label: "多気町", baseUrl: "https://www.town.taki.mie.jp", center: { lat: 34.4811, lng: 136.5496 } };
const MIE_MEIWA_SOURCE = { key: "mie_meiwa", label: "明和町", baseUrl: "https://www.town.meiwa.mie.jp", center: { lat: 34.5426, lng: 136.6187 } };
// 滋賀県
const SHIGA_OTSU_SOURCE = { key: "shiga_otsu", label: "大津市", baseUrl: "https://otsu-city.mamafre.jp", center: { lat: 35.0045, lng: 135.8686 } };
const SHIGA_MORIYAMA_SOURCE = { key: "shiga_moriyama", label: "守山市", baseUrl: "https://moriyama-city.mamafre.jp", center: { lat: 35.0571, lng: 135.9941 } };
const SHIGA_HIKONE_SOURCE = { key: "shiga_hikone", label: "彦根市", baseUrl: "https://www.city.hikone.lg.jp", center: { lat: 35.276, lng: 136.2515 } };
const SHIGA_NAGAHAMA_SOURCE = { key: "shiga_nagahama", label: "長浜市", baseUrl: "https://www.city.nagahama.lg.jp", center: { lat: 35.3813, lng: 136.2699 } };
const SHIGA_OMIHACHIMAN_SOURCE = { key: "shiga_omihachiman", label: "近江八幡市", baseUrl: "https://www.city.omihachiman.shiga.jp", center: { lat: 35.1278, lng: 136.0977 } };
const SHIGA_KOKA_SOURCE = { key: "shiga_koka", label: "甲賀市", baseUrl: "https://www.city.koka.lg.jp", center: { lat: 34.9659, lng: 136.1651 } };
const SHIGA_MAIBARA_SOURCE = { key: "shiga_maibara", label: "米原市", baseUrl: "https://www.city.maibara.lg.jp", center: { lat: 35.3153, lng: 136.2886 } };
const SHIGA_AISHO_SOURCE = { key: "shiga_aisho", label: "愛荘町", baseUrl: "https://www.town.aisho.shiga.jp", center: { lat: 35.1467, lng: 136.2233 } };
const SHIGA_HINO_SOURCE = { key: "shiga_hino", label: "日野町", baseUrl: "https://www.town.shiga-hino.lg.jp", center: { lat: 35.0178, lng: 136.2494 } };
const SHIGA_TOYOSATO_SOURCE = { key: "shiga_toyosato", label: "豊郷町", baseUrl: "https://www.town.toyosato.shiga.jp", center: { lat: 35.2053, lng: 136.2556 } };
// 京都府
const KYOTO_MAMAFRE_SOURCE = { key: "kyoto_mamafre", label: "京都市(ママフレ)", baseUrl: "https://kyoto-city.mamafre.jp", center: { lat: 35.0116, lng: 135.7681 } };
const KYOTO_WAKUTOBI_SOURCE = { key: "kyoto_wakutobi", label: "京都市(わくわくのトビラ)", baseUrl: "https://wakutobi.city.kyoto.lg.jp", center: { lat: 35.0116, lng: 135.7681 } };
const KYOTO_MAIZURU_SOURCE = { key: "kyoto_maizuru", label: "舞鶴市", baseUrl: "https://www.city.maizuru.kyoto.jp", center: { lat: 35.4544, lng: 135.3842 } };
const KYOTO_AYABE_SOURCE = { key: "kyoto_ayabe", label: "綾部市", baseUrl: "https://www.city.ayabe.lg.jp", center: { lat: 35.2912, lng: 135.2533 } };
const KYOTO_JOYO_SOURCE = { key: "kyoto_joyo", label: "城陽市", baseUrl: "https://www.city.joyo.kyoto.jp", center: { lat: 34.8522, lng: 135.7808 } };
const KYOTO_NAGAOKAKYO_SOURCE = { key: "kyoto_nagaokakyo", label: "長岡京市", baseUrl: "https://www.city.nagaokakyo.lg.jp", center: { lat: 34.9264, lng: 135.6952 } };
const KYOTO_YAWATA_SOURCE = { key: "kyoto_yawata", label: "八幡市", baseUrl: "https://www.city.yawata.kyoto.jp", center: { lat: 34.8763, lng: 135.7081 } };
const KYOTO_SEIKA_SOURCE = { key: "kyoto_seika", label: "精華町", baseUrl: "https://www.town.seika.kyoto.jp", center: { lat: 34.7584, lng: 135.7828 } };
const KYOTO_KUMIYAMA_SOURCE = { key: "kyoto_kumiyama", label: "久御山町", baseUrl: "https://www.town.kumiyama.lg.jp", center: { lat: 34.883, lng: 135.7245 } };
const KYOTO_MINAMIYAMASHIRO_SOURCE = { key: "kyoto_minamiyamashiro", label: "南山城村", baseUrl: "https://www.vill.minamiyamashiro.lg.jp", center: { lat: 34.7552, lng: 135.9756 } };
const KYOTO_KAMEOKA_SOURCE = { key: "kyoto_kameoka", label: "亀岡市", baseUrl: "https://www.city.kameoka.kyoto.jp", center: { lat: 35.0128, lng: 135.5773 } };
const KYOTO_UJI_SOURCE = { key: "kyoto_uji", label: "宇治市", baseUrl: "https://www.city.uji.kyoto.jp", center: { lat: 34.8844, lng: 135.7997 } };
const KYOTO_MUKO_SOURCE = { key: "kyoto_muko", label: "向日市", baseUrl: "https://www.city.muko.kyoto.jp", center: { lat: 34.9485, lng: 135.6989 } };
// 大阪府
const OSAKA_SUITA_SOURCE = { key: "osaka_suita", label: "吹田市", baseUrl: "https://suita-city.mamafre.jp", center: { lat: 34.7619, lng: 135.5163 } };
const OSAKA_IKEDA_SOURCE = { key: "osaka_ikeda", label: "池田市", baseUrl: "https://www.city.ikeda.osaka.jp", center: { lat: 34.8215, lng: 135.4268 } };
const OSAKA_IZUMIOTSU_SOURCE = { key: "osaka_izumiotsu", label: "泉大津市", baseUrl: "https://www.city.izumiotsu.lg.jp", center: { lat: 34.5053, lng: 135.4057 } };
const OSAKA_KAIZUKA_SOURCE = { key: "osaka_kaizuka", label: "貝塚市", baseUrl: "https://www.city.kaizuka.lg.jp", center: { lat: 34.4426, lng: 135.3598 } };
const OSAKA_MORIGUCHI_SOURCE = { key: "osaka_moriguchi", label: "守口市", baseUrl: "https://www.city.moriguchi.osaka.jp", center: { lat: 34.7359, lng: 135.5639 } };
const OSAKA_IBARAKI_SOURCE = { key: "osaka_ibaraki", label: "茨木市", baseUrl: "https://www.city.ibaraki.osaka.jp", center: { lat: 34.8156, lng: 135.5685 } };
const OSAKA_HIRAKATA_SOURCE = { key: "osaka_hirakata", label: "枚方市", baseUrl: "https://www.city.hirakata.osaka.jp", center: { lat: 34.8144, lng: 135.6519 } };
const OSAKA_NEYAGAWA_SOURCE = { key: "osaka_neyagawa", label: "寝屋川市", baseUrl: "https://www.city.neyagawa.osaka.jp", center: { lat: 34.7662, lng: 135.6278 } };
const OSAKA_IZUMI_SOURCE = { key: "osaka_izumi", label: "和泉市", baseUrl: "https://www.city.osaka-izumi.lg.jp", center: { lat: 34.4837, lng: 135.4226 } };
const OSAKA_HABIKINO_SOURCE = { key: "osaka_habikino", label: "羽曳野市", baseUrl: "https://www.city.habikino.lg.jp", center: { lat: 34.5577, lng: 135.6063 } };
const OSAKA_FUJIIDERA_SOURCE = { key: "osaka_fujiidera", label: "藤井寺市", baseUrl: "https://www.city.fujiidera.lg.jp", center: { lat: 34.5737, lng: 135.5968 } };
const OSAKA_HIGASHIOSAKA_SOURCE = { key: "osaka_higashiosaka", label: "東大阪市", baseUrl: "https://www.city.higashiosaka.lg.jp", center: { lat: 34.6796, lng: 135.6005 } };
const OSAKA_SENNAN_SOURCE = { key: "osaka_sennan", label: "泉南市", baseUrl: "https://www.city.sennan.lg.jp", center: { lat: 34.3628, lng: 135.2725 } };
const OSAKA_HANNAN_SOURCE = { key: "osaka_hannan", label: "阪南市", baseUrl: "https://www.city.hannan.lg.jp", center: { lat: 34.3561, lng: 135.2444 } };
const OSAKA_KUMATORI_SOURCE = { key: "osaka_kumatori", label: "熊取町", baseUrl: "https://www.town.kumatori.lg.jp", center: { lat: 34.3989, lng: 135.3489 } };
const OSAKA_TADAOKA_SOURCE = { key: "osaka_tadaoka", label: "忠岡町", baseUrl: "https://www.town.tadaoka.osaka.jp", center: { lat: 34.4883, lng: 135.4008 } };
const OSAKA_TAISHI_SOURCE = { key: "osaka_taishi", label: "太子町", baseUrl: "https://www.town.taishi.osaka.jp", center: { lat: 34.5183, lng: 135.6479 } };
const OSAKA_TAKATSUKI_SOURCE = { key: "osaka_takatsuki", label: "高槻市", baseUrl: "https://www.city.takatsuki.osaka.jp", center: { lat: 34.8469, lng: 135.6172 } };
const OSAKA_KISHIWADA_SOURCE = { key: "osaka_kishiwada", label: "岸和田市", baseUrl: "https://www.city.kishiwada.osaka.jp", center: { lat: 34.4590, lng: 135.3708 } };
const OSAKA_KAWACHINAGANO_SOURCE = { key: "osaka_kawachinagano", label: "河内長野市", baseUrl: "https://www.city.kawachinagano.lg.jp", center: { lat: 34.4533, lng: 135.5642 } };
const OSAKA_TONDABAYASHI_SOURCE = { key: "osaka_tondabayashi", label: "富田林市", baseUrl: "https://www.city.tondabayashi.lg.jp", center: { lat: 34.5000, lng: 135.5958 } };
const OSAKA_SAKAI_SOURCE = { key: "osaka_sakai", label: "堺市", baseUrl: "https://www.city.sakai.lg.jp", center: { lat: 34.5733, lng: 135.4830 } };
// 兵庫県
const HYOGO_ASHIYA_SOURCE = { key: "hyogo_ashiya", label: "芦屋市", baseUrl: "https://ashiya-city.mamafre.jp", center: { lat: 34.7278, lng: 135.3036 } };
const HYOGO_HIMEJI_SOURCE = { key: "hyogo_himeji", label: "姫路市", baseUrl: "https://www.city.himeji.lg.jp", center: { lat: 34.8159, lng: 134.6853 } };
const HYOGO_ITAMI_SOURCE = { key: "hyogo_itami", label: "伊丹市", baseUrl: "https://www.city.itami.lg.jp", center: { lat: 34.7847, lng: 135.3985 } };
const HYOGO_KAKOGAWA_SOURCE = { key: "hyogo_kakogawa", label: "加古川市", baseUrl: "https://www.city.kakogawa.lg.jp", center: { lat: 34.7568, lng: 134.8413 } };
const HYOGO_TATSUNO_SOURCE = { key: "hyogo_tatsuno", label: "たつの市", baseUrl: "https://www.city.tatsuno.lg.jp", center: { lat: 34.8588, lng: 134.5446 } };
const HYOGO_ONO_SOURCE = { key: "hyogo_ono", label: "小野市", baseUrl: "https://www.city.ono.hyogo.jp", center: { lat: 34.853, lng: 134.931 } };
const HYOGO_SHISO_SOURCE = { key: "hyogo_shiso", label: "宍粟市", baseUrl: "https://www.city.shiso.lg.jp", center: { lat: 35.0006, lng: 134.5367 } };
const HYOGO_KATO_SOURCE = { key: "hyogo_kato", label: "加東市", baseUrl: "https://www.city.kato.lg.jp", center: { lat: 34.9176, lng: 134.9642 } };
const HYOGO_INAGAWA_SOURCE = { key: "hyogo_inagawa", label: "猪名川町", baseUrl: "https://www.town.inagawa.lg.jp", center: { lat: 34.8954, lng: 135.3758 } };
const HYOGO_INAMI_SOURCE = { key: "hyogo_inami", label: "稲美町", baseUrl: "https://www.town.hyogo-inami.lg.jp", center: { lat: 34.7445, lng: 134.894 } };
const HYOGO_FUKUSAKI_SOURCE = { key: "hyogo_fukusaki", label: "福崎町", baseUrl: "https://www.town.fukusaki.hyogo.jp", center: { lat: 34.9475, lng: 134.7564 } };
const HYOGO_KAMIKAWA_SOURCE = { key: "hyogo_kamikawa", label: "神河町", baseUrl: "https://www.town.kamikawa.hyogo.jp", center: { lat: 35.0556, lng: 134.7394 } };
// 奈良県
const NARA_TENRI_SOURCE = { key: "nara_tenri", label: "天理市", baseUrl: "https://www.city.tenri.nara.jp", center: { lat: 34.5963, lng: 135.8371 } };
const NARA_KASHIHARA_SOURCE = { key: "nara_kashihara", label: "橿原市", baseUrl: "https://www.city.kashihara.nara.jp", center: { lat: 34.5092, lng: 135.7929 } };
const NARA_GOJO_SOURCE = { key: "nara_gojo", label: "五條市", baseUrl: "https://www.city.gojo.lg.jp", center: { lat: 34.3511, lng: 135.6938 } };
const NARA_GOSE_SOURCE = { key: "nara_gose", label: "御所市", baseUrl: "https://www.city.gose.nara.jp", center: { lat: 34.4567, lng: 135.7388 } };
const NARA_IKOMA_SOURCE = { key: "nara_ikoma", label: "生駒市", baseUrl: "https://www.city.ikoma.lg.jp", center: { lat: 34.6923, lng: 135.6995 } };
const NARA_IKARUGA_SOURCE = { key: "nara_ikaruga", label: "斑鳩町", baseUrl: "https://www.town.ikaruga.nara.jp", center: { lat: 34.6142, lng: 135.728 } };
const NARA_ANDO_SOURCE = { key: "nara_ando", label: "安堵町", baseUrl: "https://www.town.ando.nara.jp", center: { lat: 34.5975, lng: 135.7268 } };
const NARA_KAWANISHI_NR_SOURCE = { key: "nara_kawanishi_nr", label: "河合町", baseUrl: "https://www.town.kawai.nara.jp", center: { lat: 34.586, lng: 135.7604 } };
const NARA_TAWARAMOTO_SOURCE = { key: "nara_tawaramoto", label: "田原本町", baseUrl: "https://www.town.tawaramoto.nara.jp", center: { lat: 34.5564, lng: 135.7923 } };
const NARA_OJI_SOURCE = { key: "nara_oji", label: "王寺町", baseUrl: "https://www.town.oji.nara.jp", center: { lat: 34.5933, lng: 135.7064 } };
const NARA_KORYO_SOURCE = { key: "nara_koryo", label: "広陵町", baseUrl: "https://www.town.koryo.nara.jp", center: { lat: 34.5563, lng: 135.75 } };
const NARA_ASUKA_SOURCE = { key: "nara_asuka", label: "明日香村", baseUrl: "https://www.asukamura.jp", center: { lat: 34.4754, lng: 135.8175 } };
const NARA_TOTSUKAWA_SOURCE = { key: "nara_totsukawa", label: "十津川村", baseUrl: "https://www.vill.totsukawa.lg.jp", center: { lat: 34.1064, lng: 135.696 } };
const NARA_SHIMOICHI_SOURCE = { key: "nara_shimoichi", label: "下市町", baseUrl: "https://www.town.shimoichi.lg.jp", center: { lat: 34.3708, lng: 135.7648 } };
// 和歌山県
const WAKAYAMA_WAKAYAMA_SOURCE = { key: "wakayama_wakayama", label: "和歌山市", baseUrl: "https://www.city.wakayama.wakayama.jp", center: { lat: 34.2306, lng: 135.1707 } };
const WAKAYAMA_HASHIMOTO_SOURCE = { key: "wakayama_hashimoto", label: "橋本市", baseUrl: "https://www.city.hashimoto.lg.jp", center: { lat: 34.3146, lng: 135.6051 } };
const WAKAYAMA_INAMI_WK_SOURCE = { key: "wakayama_inami_wk", label: "印南町", baseUrl: "https://www.town.wakayama-inami.lg.jp", center: { lat: 33.8042, lng: 135.2292 } };

// ========== 中国・四国 ==========
// 鳥取県
const TOTTORI_KOSODATE_SOURCE = { key: "tottori_kosodate", label: "鳥取県(子育て王国)", baseUrl: "https://www.kosodate-ohkoku-tottori.net", center: { lat: 35.5011, lng: 134.2351 } };
const TOTTORI_NICHINAN_SOURCE = { key: "tottori_nichinan", label: "日南町", baseUrl: "https://www.town.nichinan.lg.jp", center: { lat: 35.1545, lng: 133.3184 } };
const TOTTORI_SAKAIMINATO_SOURCE = { key: "tottori_sakaiminato", label: "境港市", baseUrl: "https://www.city.sakaiminato.lg.jp", center: { lat: 35.54, lng: 133.2309 } };
// 島根県
const SHIMANE_MASUDA_SOURCE = { key: "shimane_masuda", label: "益田市", baseUrl: "https://www.city.masuda.lg.jp", center: { lat: 34.6791, lng: 131.843 } };
const SHIMANE_AMA_SOURCE = { key: "shimane_ama", label: "海士町", baseUrl: "https://www.town.ama.shimane.jp", center: { lat: 36.0792, lng: 133.0876 } };
// 岡山県
const OKAYAMA_OKAYAMA_SOURCE = { key: "okayama_okayama", label: "岡山市", baseUrl: "https://www.city.okayama.jp", center: { lat: 34.6551, lng: 133.9195 } };
const OKAYAMA_AKAIWA_SOURCE = { key: "okayama_akaiwa", label: "赤磐市", baseUrl: "https://www.city.akaiwa.lg.jp", center: { lat: 34.7543, lng: 134.0171 } };
const OKAYAMA_MIMASAKA_SOURCE = { key: "okayama_mimasaka", label: "美作市", baseUrl: "https://www.city.mimasaka.lg.jp", center: { lat: 35.007, lng: 134.1458 } };
const OKAYAMA_HAYASHIMA_SOURCE = { key: "okayama_hayashima", label: "早島町", baseUrl: "https://www.town.hayashima.lg.jp", center: { lat: 34.5997, lng: 133.8275 } };
// 広島県
const HIROSHIMA_HIROSHIMA_SOURCE = { key: "hiroshima_hiroshima", label: "広島市", baseUrl: "https://www.city.hiroshima.lg.jp", center: { lat: 34.3853, lng: 132.4553 } };
const HIROSHIMA_IKUCHAN_SOURCE = { key: "hiroshima_ikuchan", label: "広島県(イクちゃんネット)", baseUrl: "https://ikuchan.or.jp", center: { lat: 34.3963, lng: 132.4596 } };
const HIROSHIMA_FUCHU_SOURCE = { key: "hiroshima_fuchu", label: "府中市", baseUrl: "https://www.city.fuchu.hiroshima.jp", center: { lat: 34.5678, lng: 133.2393 } };
const HIROSHIMA_OTAKE_SOURCE = { key: "hiroshima_otake", label: "大竹市", baseUrl: "https://www.city.otake.hiroshima.jp", center: { lat: 34.2389, lng: 132.2222 } };
const HIROSHIMA_HIGASHIHIROSHIMA_SOURCE = { key: "hiroshima_higashihiroshima", label: "東広島市", baseUrl: "https://www.city.higashihiroshima.lg.jp", center: { lat: 34.4275, lng: 132.7432 } };
const HIROSHIMA_FUKUYAMA_SOURCE = { key: "hiroshima_fukuyama", label: "福山市", baseUrl: "https://www.city.fukuyama.hiroshima.jp", center: { lat: 34.4860, lng: 133.3621 } };
const HIROSHIMA_KURE_SOURCE = { key: "hiroshima_kure", label: "呉市", baseUrl: "https://www.city.kure.lg.jp", center: { lat: 34.2490, lng: 132.5661 } };
const HIROSHIMA_ONOMICHI_SOURCE = { key: "hiroshima_onomichi", label: "尾道市", baseUrl: "https://www.city.onomichi.hiroshima.jp", center: { lat: 34.4089, lng: 133.2051 } };
const HIROSHIMA_MIHARA_SOURCE = { key: "hiroshima_mihara", label: "三原市", baseUrl: "https://www.city.mihara.hiroshima.jp", center: { lat: 34.3986, lng: 133.0779 } };
const HIROSHIMA_HATSUKAICHI_SOURCE = { key: "hiroshima_hatsukaichi", label: "廿日市市", baseUrl: "https://www.city.hatsukaichi.hiroshima.jp", center: { lat: 34.3487, lng: 132.3314 } };
// 山口県
const YAMAGUCHI_HIKARI_SOURCE = { key: "yamaguchi_hikari", label: "光市", baseUrl: "https://www.city.hikari.lg.jp", center: { lat: 33.9619, lng: 131.9422 } };
const YAMAGUCHI_SHIMONOSEKI_SOURCE = { key: "yamaguchi_shimonoseki", label: "下関市", baseUrl: "https://www.city.shimonoseki.lg.jp", center: { lat: 33.9505, lng: 130.9425 } };
const YAMAGUCHI_YAMAGUCHI_SOURCE = { key: "yamaguchi_yamaguchi", label: "山口市", baseUrl: "https://www.city.yamaguchi.lg.jp", center: { lat: 34.1861, lng: 131.4706 } };
const YAMAGUCHI_SHUNAN_SOURCE = { key: "yamaguchi_shunan", label: "周南市", baseUrl: "https://www.city.shunan.lg.jp", center: { lat: 34.0552, lng: 131.8063 } };
const YAMAGUCHI_UBE_SOURCE = { key: "yamaguchi_ube", label: "宇部市", baseUrl: "https://www.city.ube.yamaguchi.jp", center: { lat: 33.9516, lng: 131.2468 } };
// 徳島県
const TOKUSHIMA_TOKUSHIMA_SOURCE = { key: "tokushima_tokushima", label: "徳島市", baseUrl: "https://www.city.tokushima.tokushima.jp", center: { lat: 34.0658, lng: 134.5593 } };
const TOKUSHIMA_NAKA_SOURCE = { key: "tokushima_naka", label: "那賀町", baseUrl: "https://www.town.tokushima-naka.lg.jp", center: { lat: 33.9375, lng: 134.5236 } };
const TOKUSHIMA_HIGASHIMIYOSHI_SOURCE = { key: "tokushima_higashimiyoshi", label: "東みよし町", baseUrl: "https://www.town.higashimiyoshi.lg.jp", center: { lat: 34.0294, lng: 133.9286 } };
// 香川県
const KAGAWA_TAKAMATSU_SOURCE = { key: "kagawa_takamatsu", label: "高松市", baseUrl: "https://www.city.takamatsu.kagawa.jp", center: { lat: 34.3401, lng: 134.0434 } };
const KAGAWA_SANUKI_SOURCE = { key: "kagawa_sanuki", label: "さぬき市", baseUrl: "https://www.city.sanuki.kagawa.jp", center: { lat: 34.3255, lng: 134.1766 } };
const KAGAWA_MITOYO_SOURCE = { key: "kagawa_mitoyo", label: "三豊市", baseUrl: "https://www.city.mitoyo.lg.jp", center: { lat: 34.1833, lng: 133.7167 } };
const KAGAWA_TONOSHO_SOURCE = { key: "kagawa_tonosho", label: "土庄町", baseUrl: "https://www.town.tonosho.kagawa.jp", center: { lat: 34.49, lng: 134.1863 } };
const KAGAWA_MARUGAME_SOURCE = { key: "kagawa_marugame", label: "丸亀市", baseUrl: "https://www.city.marugame.lg.jp", center: { lat: 34.2897, lng: 133.7980 } };
const KAGAWA_SAKAIDE_SOURCE = { key: "kagawa_sakaide", label: "坂出市", baseUrl: "https://www.city.sakaide.lg.jp", center: { lat: 34.3161, lng: 133.8586 } };
// 愛媛県
const EHIME_SEIYO_SOURCE = { key: "ehime_seiyo", label: "西予市", baseUrl: "https://www.city.seiyo.ehime.jp", center: { lat: 33.3645, lng: 132.5113 } };
const EHIME_TOBE_SOURCE = { key: "ehime_tobe", label: "砥部町", baseUrl: "https://www.town.tobe.ehime.jp", center: { lat: 33.748, lng: 132.7906 } };
const EHIME_NIIHAMA_SOURCE = { key: "ehime_niihama", label: "新居浜市", baseUrl: "https://www.city.niihama.lg.jp", center: { lat: 33.9602, lng: 133.2834 } };
const EHIME_SAIJO_SOURCE = { key: "ehime_saijo", label: "西条市", baseUrl: "https://www.city.saijo.ehime.jp", center: { lat: 33.9194, lng: 133.1830 } };
// 高知県
const KOCHI_MUROTO_SOURCE = { key: "kochi_muroto", label: "室戸市", baseUrl: "https://www.city.muroto.kochi.jp", center: { lat: 33.2899, lng: 134.1527 } };
const KOCHI_KOKOHARE_SOURCE = { key: "kochi_kokohare", label: "高知県(ココハレ)", baseUrl: "https://kokoharekochi.com", center: { lat: 33.5597, lng: 133.5311 } };

// ========== 九州・沖縄 ==========
// 福岡県
const FUKUOKA_KITAKYUSHU_SOURCE = { key: "fukuoka_kitakyushu", label: "北九州市", baseUrl: "https://kitakyushu-city.mamafre.jp", center: { lat: 33.8834, lng: 130.8752 } };
const FUKUOKA_FUKUTSU_SOURCE = { key: "fukuoka_fukutsu", label: "福津市", baseUrl: "https://www.city.fukutsu.lg.jp", center: { lat: 33.7699, lng: 130.4882 } };
const FUKUOKA_SHINGU_FK_SOURCE = { key: "fukuoka_shingu_fk", label: "新宮町", baseUrl: "https://www.town.shingu.fukuoka.jp", center: { lat: 33.7151, lng: 130.4448 } };
const FUKUOKA_HIROKAWA_SOURCE = { key: "fukuoka_hirokawa", label: "広川町", baseUrl: "https://www.town.hirokawa.fukuoka.jp", center: { lat: 33.2467, lng: 130.5538 } };
const FUKUOKA_KAWARA_SOURCE = { key: "fukuoka_kawara", label: "川崎町", baseUrl: "https://www.town-kawara.com", center: { lat: 33.5783, lng: 130.8506 } };
const FUKUOKA_CHIKUSHINO_SOURCE = { key: "fukuoka_chikushino", label: "筑紫野市", baseUrl: "https://www.city.chikushino.fukuoka.jp", center: { lat: 33.4967, lng: 130.5153 } };
const FUKUOKA_NAKAGAWA_SOURCE = { key: "fukuoka_nakagawa", label: "那珂川市", baseUrl: "https://www.city.nakagawa.lg.jp", center: { lat: 33.5009, lng: 130.4204 } };
// 長崎県
const NAGASAKI_NAGASAKI_SOURCE = { key: "nagasaki_nagasaki", label: "長崎市", baseUrl: "https://www.city.nagasaki.lg.jp", center: { lat: 32.7503, lng: 129.8779 } };
const NAGASAKI_TSUSHIMA_SOURCE = { key: "nagasaki_tsushima", label: "対馬市", baseUrl: "https://www.city.tsushima.nagasaki.jp", center: { lat: 34.2044, lng: 129.2888 } };
const NAGASAKI_IKI_SOURCE = { key: "nagasaki_iki", label: "壱岐市", baseUrl: "https://www.city.iki.nagasaki.jp", center: { lat: 33.749, lng: 129.6915 } };
const NAGASAKI_SAIKAI_SOURCE = { key: "nagasaki_saikai", label: "西海市", baseUrl: "https://www.city.saikai.nagasaki.jp", center: { lat: 32.9558, lng: 129.6732 } };
const NAGASAKI_TOGITSU_SOURCE = { key: "nagasaki_togitsu", label: "時津町", baseUrl: "https://www.town.togitsu.nagasaki.jp", center: { lat: 32.8283, lng: 129.8575 } };
const NAGASAKI_HIGASHISONOGI_SOURCE = { key: "nagasaki_higashisonogi", label: "東彼杵町", baseUrl: "https://www.town.higashisonogi.lg.jp", center: { lat: 33.0767, lng: 129.9633 } };
// 佐賀県
const SAGA_KARATSU_SOURCE = { key: "saga_karatsu", label: "唐津市", baseUrl: "https://www.city.karatsu.lg.jp", center: { lat: 33.4496, lng: 129.9693 } };
const SAGA_TOSU_SOURCE = { key: "saga_tosu", label: "鳥栖市", baseUrl: "https://www.city.tosu.lg.jp", center: { lat: 33.3786, lng: 130.5061 } };
// 熊本県
const KUMAMOTO_TAKAMORI_SOURCE = { key: "kumamoto_takamori", label: "高森町", baseUrl: "https://www.town.kumamoto-takamori.lg.jp", center: { lat: 32.8191, lng: 131.1124 } };
const KUMAMOTO_KIKUCHI_SOURCE = { key: "kumamoto_kikuchi", label: "菊池市", baseUrl: "https://www.city.kikuchi.lg.jp", center: { lat: 32.9804, lng: 130.8147 } };
const KUMAMOTO_KOSODATE_SOURCE = { key: "kumamoto_kosodate", label: "熊本市(子育て)", baseUrl: "https://www.kumamoto-kekkon-kosodate.jp", center: { lat: 32.8032, lng: 130.7079 } };
// 大分県
const OITA_HITA_SOURCE = { key: "oita_hita", label: "日田市", baseUrl: "https://www.city.hita.oita.jp", center: { lat: 33.3214, lng: 130.9414 } };
const OITA_TAKETA_SOURCE = { key: "oita_taketa", label: "竹田市", baseUrl: "https://www.city.taketa.oita.jp", center: { lat: 32.9692, lng: 131.3967 } };
const OITA_KITSUKI_SOURCE = { key: "oita_kitsuki", label: "杵築市", baseUrl: "https://www.city.kitsuki.lg.jp", center: { lat: 33.4153, lng: 131.6171 } };
const OITA_KUSU_SOURCE = { key: "oita_kusu", label: "玖珠町", baseUrl: "https://www.town.kusu.oita.jp", center: { lat: 33.2817, lng: 131.149 } };
// 宮崎県
const MIYAZAKI_SUKUSUKU_SOURCE = { key: "miyazaki_sukusuku", label: "すくすくみやざき", baseUrl: "https://kodomoseisaku.pref.miyazaki.lg.jp", center: { lat: 31.9111, lng: 131.4239 } };
const MIYAZAKI_MIYAZAKI_SOURCE = { key: "miyazaki_miyazaki", label: "宮崎市", baseUrl: "https://www.city.miyazaki.miyazaki.jp", center: { lat: 31.9111, lng: 131.4239 } };
const MIYAZAKI_NICHINAN_SOURCE = { key: "miyazaki_nichinan", label: "日南市", baseUrl: "https://www.city.nichinan.lg.jp", center: { lat: 31.6028, lng: 131.3817 } };
const MIYAZAKI_KIJO_SOURCE = { key: "miyazaki_kijo", label: "木城町", baseUrl: "https://www.town.kijo.lg.jp", center: { lat: 32.1229, lng: 131.4592 } };
const MIYAZAKI_KADOGAWA_SOURCE = { key: "miyazaki_kadogawa", label: "門川町", baseUrl: "https://www.town.kadogawa.lg.jp", center: { lat: 32.4693, lng: 131.6364 } };
const MIYAZAKI_MIYAKOJIMA_SOURCE = { key: "miyazaki_miyakojima", label: "都城市", baseUrl: "https://www.city.miyakonojo.miyazaki.jp", center: { lat: 31.7283, lng: 131.0653 } };
// 鹿児島県
const KAGOSHIMA_SATSUMASENDAI_SOURCE = { key: "kagoshima_satsumasendai", label: "薩摩川内市", baseUrl: "https://www.city.satsumasendai.lg.jp", center: { lat: 31.8132, lng: 130.3042 } };
const KAGOSHIMA_MINAMIKYUSHU_SOURCE = { key: "kagoshima_minamikyushu", label: "南九州市", baseUrl: "https://www.city.minamikyushu.lg.jp", center: { lat: 31.3802, lng: 130.4393 } };
const KAGOSHIMA_SATSUMA_SOURCE = { key: "kagoshima_satsuma", label: "さつま町", baseUrl: "https://www.satsuma-net.jp", center: { lat: 31.8992, lng: 130.4589 } };
const KAGOSHIMA_KIMOTSUKI_SOURCE = { key: "kagoshima_kimotsuki", label: "肝付町", baseUrl: "https://www.town.kimotsuki.lg.jp", center: { lat: 31.3417, lng: 131.0853 } };
// 沖縄県
const IKOYO_SOURCE = { key: "ikoyo", label: "いこーよ", baseUrl: "https://iko-yo.net", center: { lat: 36.5, lng: 138.0 } };
const HOKKAIDO_SAPPORO_SOURCE = { key: "hokkaido_sapporo", label: "札幌市", baseUrl: "https://kosodate.city.sapporo.jp", center: { lat: 43.0621, lng: 141.3544 } };
const OITA_OITA_SOURCE = { key: "oita_oita", label: "大分市(naana)", baseUrl: "https://naana-oita.jp", center: { lat: 33.2382, lng: 131.6126 } };
const OKINAWA_NAHA_SOURCE = { key: "okinawa_naha", label: "那覇市", baseUrl: "https://www.city.naha.okinawa.jp", center: { lat: 26.2124, lng: 127.6809 } };
const OKINAWA_YOMITAN_SOURCE = { key: "okinawa_yomitan", label: "読谷村", baseUrl: "https://www.vill.yomitan.okinawa.jp", center: { lat: 26.395, lng: 127.7442 } };
const OKINAWA_KITANAKAGUSUKU_SOURCE = { key: "okinawa_kitanakagusuku", label: "北中城村", baseUrl: "https://www.vill.kitanakagusuku.lg.jp", center: { lat: 26.3367, lng: 127.7892 } };
const OKINAWA_IE_SOURCE = { key: "okinawa_ie", label: "伊江村", baseUrl: "https://www.iejima.org", center: { lat: 26.71, lng: 127.8063 } };
// 追加ママフレ都市
const SHIZUOKA_ATAMI_SOURCE = { key: "shizuoka_atami", label: "熱海市", baseUrl: "https://atami-city.mamafre.jp", center: { lat: 35.0964, lng: 139.0715 } };
const SHIZUOKA_ITO_SOURCE = { key: "shizuoka_ito", label: "伊東市", baseUrl: "https://ito-city.mamafre.jp", center: { lat: 34.9656, lng: 139.1017 } };
const AICHI_KIYOSU_SOURCE = { key: "aichi_kiyosu", label: "清須市", baseUrl: "https://kiyosu-city.mamafre.jp", center: { lat: 35.2003, lng: 136.8511 } };
const OKAYAMA_KIBICHUO_SOURCE = { key: "okayama_kibichuo", label: "吉備中央町", baseUrl: "https://kibichuo-town.mamafre.jp", center: { lat: 34.8574, lng: 133.6928 } };

// Ibaraki KNOWN_FACILITIES

// --- Metadata for frontend (nationwide) ---

const PREF_PREFIX_MAP = {
  hokkaido: "北海道", tokyo: "東京都",
  aomori: "青森県", iwate: "岩手県", miyagi: "宮城県", akita: "秋田県", yamagata: "山形県", fukushima: "福島県",
  ibaraki: "茨城県", tochigi: "栃木県", gunma: "群馬県", saitama: "埼玉県", chiba: "千葉県", kanagawa: "神奈川県",
  niigata: "新潟県", toyama: "富山県", ishikawa: "石川県", fukui: "福井県", yamanashi: "山梨県", nagano: "長野県", gifu: "岐阜県", shizuoka: "静岡県", aichi: "愛知県",
  mie: "三重県", shiga: "滋賀県", kyoto: "京都府", osaka: "大阪府", hyogo: "兵庫県", nara: "奈良県", wakayama: "和歌山県",
  tottori: "鳥取県", shimane: "島根県", okayama: "岡山県", hiroshima: "広島県", yamaguchi: "山口県",
  tokushima: "徳島県", kagawa: "香川県", ehime: "愛媛県", kochi: "高知県",
  fukuoka: "福岡県", saga: "佐賀県", nagasaki: "長崎県", kumamoto: "熊本県", oita: "大分県", miyazaki: "宮崎県", kagoshima: "鹿児島県", okinawa: "沖縄県",
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
};

const REGION_GROUPS = [
  { id: "hokkaido", label: "北海道", prefs: ["北海道"], center: { lat: 43.06, lng: 141.35 }, zoom: 7 },
  { id: "tohoku", label: "東北", prefs: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"], center: { lat: 39.7, lng: 140.1 }, zoom: 7 },
  { id: "kanto", label: "関東", prefs: ["東京都", "神奈川県", "千葉県", "埼玉県", "群馬県", "栃木県", "茨城県"], center: { lat: 35.9, lng: 139.7 }, zoom: 8 },
  { id: "chubu", label: "中部", prefs: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"], center: { lat: 36.2, lng: 137.7 }, zoom: 7 },
  { id: "kinki", label: "近畿", prefs: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"], center: { lat: 34.7, lng: 135.5 }, zoom: 8 },
  { id: "chugoku_shikoku", label: "中国・四国", prefs: ["鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県"], center: { lat: 34.0, lng: 133.5 }, zoom: 7 },
  { id: "kyushu_okinawa", label: "九州・沖縄", prefs: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"], center: { lat: 32.5, lng: 131.0 }, zoom: 7 },
];

const PREF_CENTERS = {
  "北海道": { lat: 43.06, lng: 141.35, zoom: 7 },
  "青森県": { lat: 40.82, lng: 140.74, zoom: 9 }, "岩手県": { lat: 39.70, lng: 141.15, zoom: 8 },
  "宮城県": { lat: 38.27, lng: 140.87, zoom: 9 }, "秋田県": { lat: 39.72, lng: 140.10, zoom: 8 },
  "山形県": { lat: 38.24, lng: 140.34, zoom: 9 }, "福島県": { lat: 37.75, lng: 140.47, zoom: 8 },
  "茨城県": { lat: 36.34, lng: 140.45, zoom: 9 }, "栃木県": { lat: 36.57, lng: 139.88, zoom: 9 },
  "群馬県": { lat: 36.39, lng: 139.06, zoom: 9 }, "埼玉県": { lat: 35.86, lng: 139.65, zoom: 10 },
  "千葉県": { lat: 35.60, lng: 140.12, zoom: 9 }, "東京都": { lat: 35.68, lng: 139.77, zoom: 11 },
  "神奈川県": { lat: 35.45, lng: 139.64, zoom: 10 },
  "新潟県": { lat: 37.90, lng: 139.02, zoom: 8 }, "富山県": { lat: 36.70, lng: 137.21, zoom: 9 },
  "石川県": { lat: 36.59, lng: 136.63, zoom: 9 }, "福井県": { lat: 36.07, lng: 136.22, zoom: 9 },
  "山梨県": { lat: 35.66, lng: 138.57, zoom: 9 }, "長野県": { lat: 36.23, lng: 138.18, zoom: 8 },
  "岐阜県": { lat: 35.39, lng: 136.72, zoom: 9 }, "静岡県": { lat: 34.98, lng: 138.38, zoom: 9 },
  "愛知県": { lat: 35.18, lng: 136.91, zoom: 9 },
  "三重県": { lat: 34.73, lng: 136.51, zoom: 9 }, "滋賀県": { lat: 35.00, lng: 135.87, zoom: 10 },
  "京都府": { lat: 35.02, lng: 135.76, zoom: 9 }, "大阪府": { lat: 34.69, lng: 135.52, zoom: 10 },
  "兵庫県": { lat: 34.69, lng: 135.18, zoom: 9 }, "奈良県": { lat: 34.69, lng: 135.83, zoom: 10 },
  "和歌山県": { lat: 34.23, lng: 135.17, zoom: 9 },
  "鳥取県": { lat: 35.50, lng: 134.24, zoom: 9 }, "島根県": { lat: 35.47, lng: 133.05, zoom: 8 },
  "岡山県": { lat: 34.66, lng: 133.93, zoom: 9 }, "広島県": { lat: 34.40, lng: 132.46, zoom: 9 },
  "山口県": { lat: 34.19, lng: 131.47, zoom: 9 },
  "徳島県": { lat: 34.07, lng: 134.56, zoom: 9 }, "香川県": { lat: 34.34, lng: 134.04, zoom: 10 },
  "愛媛県": { lat: 33.84, lng: 132.77, zoom: 9 }, "高知県": { lat: 33.56, lng: 133.53, zoom: 9 },
  "福岡県": { lat: 33.61, lng: 130.42, zoom: 9 }, "佐賀県": { lat: 33.25, lng: 130.30, zoom: 10 },
  "長崎県": { lat: 32.74, lng: 129.87, zoom: 9 }, "熊本県": { lat: 32.79, lng: 130.74, zoom: 9 },
  "大分県": { lat: 33.24, lng: 131.61, zoom: 9 }, "宮崎県": { lat: 31.91, lng: 131.42, zoom: 9 },
  "鹿児島県": { lat: 31.56, lng: 130.56, zoom: 9 }, "沖縄県": { lat: 26.34, lng: 127.80, zoom: 9 },
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
  return result;
}

const CHILD_KW = ["子育て", "親子", "幼児", "乳幼児", "健診", "教室", "サロン", "相談", "キッズ", "児童", "おはなし", "広場", "赤ちゃん", "工作", "映画会", "読み聞かせ"];
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
  // 東北6県
  AOMORI_AOMORI_SOURCE, HACHINOHE_SOURCE, TSUGARU_SOURCE, HIRANAI_SOURCE, NAKADOMARI_SOURCE, YOMOGITA_SOURCE, ITAYANAGI_SOURCE,
  IWATE_ICHINOSEKI_SOURCE, IWATE_MORIOKA_SOURCE, KITAKAMI_SOURCE, KUJI_SOURCE, OSHU_SOURCE, NISHIWAGA_SOURCE, ICHINOHE_SOURCE, OTSUCHI_SOURCE,
  MIYAGI_SENDAI_SOURCE, ISHINOMAKI_SOURCE, HIGASHIMATSUSHIMA_SOURCE, ZAO_SOURCE, SHICHIKASHUKU_SOURCE, SHICHIGAHAMA_SOURCE, TAIWA_SOURCE, SHIKAMA_SOURCE, NATORI_SOURCE, SHIOGAMA_SOURCE,
  AKITA_KOSODATE_SOURCE, YOKOTE_SOURCE, YURIHONJYO_SOURCE, OGA_SOURCE, KOSAKA_SOURCE, HACHIROGATA_SOURCE,
  YONEZAWA_SOURCE, SAKATA_SOURCE, SHINJO_SOURCE, NAGAI_SOURCE, NAKAYAMA_YM_SOURCE, KAHOKU_SOURCE, ASAHI_YM_SOURCE, KANEYAMA_YM_SOURCE, MAMUROGAWA_SOURCE, OKURA_SOURCE, SHIRATAKA_SOURCE,
  FUKUSHIMA_CITY_SOURCE, FUKUSHIMA_KORIYAMA_SOURCE, SOMA_SOURCE, MINAMISOMA_SOURCE, OTAMA_SOURCE, SHIMOGO_SOURCE, AIZUMISATO_SOURCE, FURUDONO_SOURCE,
  // 北海道
  HOKKAIDO_IWAMIZAWA_SOURCE, HOKKAIDO_SHIBETSU_SOURCE, HOKKAIDO_CHITOSE_SOURCE, HOKKAIDO_MORI_SOURCE, HOKKAIDO_OZORA_SOURCE, HOKKAIDO_TSUBETSU_SOURCE, HOKKAIDO_TAIKI_SOURCE, HOKKAIDO_NISEKO_SOURCE, HOKKAIDO_SHIRAOI_SOURCE, HOKKAIDO_HIGASHIKAGURA_SOURCE, HOKKAIDO_OTOINEPPU_SOURCE, HOKKAIDO_YUBETSU_SOURCE, HOKKAIDO_NAKASATSUNAI_SOURCE, HOKKAIDO_SARABETSU_SOURCE, HOKKAIDO_HONBETSU_SOURCE, HOKKAIDO_HIROO_SOURCE, HOKKAIDO_SHIKAOI_SOURCE, HOKKAIDO_AKKESHI_SOURCE, HOKKAIDO_BETSUKAI_SOURCE, HOKKAIDO_NAKASHIBETSU_SOURCE, HOKKAIDO_SHIBETSU_CHO_SOURCE, HOKKAIDO_SHINTOKU_SOURCE, HOKKAIDO_KUTCHAN_SOURCE, HOKKAIDO_HABORO_SOURCE,
  // 中部
  NIIGATA_SANJO_SOURCE, NIIGATA_KASHIWAZAKI_SOURCE, NIIGATA_TSUBAME_SOURCE, NIIGATA_AGANO_SOURCE, NIIGATA_SEIRO_SOURCE, NIIGATA_YUZAWA_SOURCE, NIIGATA_KAMO_SOURCE, NIIGATA_MINAMIUONUMA_SOURCE, NIIGATA_TAGAMI_SOURCE, TOYAMA_HIMI_SOURCE, TOYAMA_NAMERIKAWA_SOURCE, TOYAMA_KUROBE_SOURCE, TOYAMA_NYUZEN_SOURCE, TOYAMA_ASAHI_TY_SOURCE, ISHIKAWA_KANAZAWA_SOURCE, ISHIKAWA_KOMATSU_SOURCE, ISHIKAWA_KAGA_SOURCE, ISHIKAWA_NAKANOTO_SOURCE, FUKUI_FUKUIKU_SOURCE, FUKUI_SABAE_SOURCE, YAMANASHI_CHUO_SOURCE, YAMANASHI_MINAMIALPS_SOURCE, YAMANASHI_HOKUTO_SOURCE, NAGANO_MATSUMOTO_SOURCE, NAGANO_SUZAKA_SOURCE, NAGANO_KOMAGANE_SOURCE, NAGANO_CHIKUMA_SOURCE, NAGANO_IIJIMACHO_SOURCE, NAGANO_MATSUKAWA_SOURCE, NAGANO_IKEDA_SOURCE, GIFU_OGAKI_SOURCE, GIFU_SEKI_SOURCE, GIFU_ENA_SOURCE, GIFU_MOTOSU_SOURCE, GIFU_KAIZU_SOURCE, GIFU_ANPACHI_SOURCE, GIFU_IBIGAWA_SOURCE, GIFU_ONO_GF_SOURCE, GIFU_KAKAMIGAHARA_SOURCE, SHIZUOKA_FUJIEDA_SOURCE, SHIZUOKA_SUSONO_SOURCE, SHIZUOKA_KOSAI_SOURCE, SHIZUOKA_IZU_SOURCE, SHIZUOKA_OMAEZAKI_SOURCE, SHIZUOKA_NAGAIZUMI_SOURCE, SHIZUOKA_KANNAMI_SOURCE, SHIZUOKA_HAMAMATSU_SOURCE, SHIZUOKA_CITY_SOURCE, AICHI_TOYOKAWA_SOURCE, AICHI_HEKINAN_SOURCE, AICHI_SHINSHIRO_SOURCE, AICHI_CHIRYU_SOURCE, AICHI_INAZAWA_SOURCE, AICHI_IWAKURA_SOURCE, AICHI_NISSHIN_SOURCE, AICHI_AISAI_SOURCE, AICHI_MIYOSHI_SOURCE, AICHI_NAGAKUTE_SOURCE, AICHI_TOGO_SOURCE, AICHI_AGUI_SOURCE, AICHI_HIGASHIURA_SOURCE, AICHI_OWARIASAHI_SOURCE, AICHI_KOMAKI_SOURCE, AICHI_NAGOYA_SOURCE, AICHI_TOYOTA_SOURCE, AICHI_KASUGAI_SOURCE, AICHI_ICHINOMIYA_SOURCE, GIFU_GIFU_SOURCE,
  // 近畿
  MIE_SUZUKA_SOURCE, MIE_TSU_SOURCE, MIE_TOBA_SOURCE, SHIGA_OTSU_SOURCE, SHIGA_MORIYAMA_SOURCE, MIE_OWASE_SOURCE, MIE_IGA_SOURCE, MIE_KISOSAKI_SOURCE, MIE_TAKI_SOURCE, MIE_MEIWA_SOURCE, SHIGA_HIKONE_SOURCE, SHIGA_NAGAHAMA_SOURCE, SHIGA_OMIHACHIMAN_SOURCE, SHIGA_KOKA_SOURCE, SHIGA_MAIBARA_SOURCE, SHIGA_AISHO_SOURCE, SHIGA_HINO_SOURCE, SHIGA_TOYOSATO_SOURCE, KYOTO_MAMAFRE_SOURCE, KYOTO_WAKUTOBI_SOURCE, KYOTO_MAIZURU_SOURCE, KYOTO_AYABE_SOURCE, KYOTO_JOYO_SOURCE, KYOTO_NAGAOKAKYO_SOURCE, KYOTO_YAWATA_SOURCE, KYOTO_SEIKA_SOURCE, KYOTO_KUMIYAMA_SOURCE, KYOTO_MINAMIYAMASHIRO_SOURCE, KYOTO_KAMEOKA_SOURCE, KYOTO_UJI_SOURCE, KYOTO_MUKO_SOURCE, OSAKA_IKEDA_SOURCE, OSAKA_IZUMIOTSU_SOURCE, OSAKA_KAIZUKA_SOURCE, OSAKA_MORIGUCHI_SOURCE, OSAKA_IBARAKI_SOURCE, OSAKA_HIRAKATA_SOURCE, OSAKA_NEYAGAWA_SOURCE, OSAKA_IZUMI_SOURCE, OSAKA_HABIKINO_SOURCE, OSAKA_FUJIIDERA_SOURCE, OSAKA_HIGASHIOSAKA_SOURCE, OSAKA_SENNAN_SOURCE, OSAKA_HANNAN_SOURCE, OSAKA_KUMATORI_SOURCE, OSAKA_TADAOKA_SOURCE, OSAKA_TAISHI_SOURCE, OSAKA_TAKATSUKI_SOURCE, OSAKA_KISHIWADA_SOURCE, OSAKA_KAWACHINAGANO_SOURCE, OSAKA_TONDABAYASHI_SOURCE, OSAKA_SAKAI_SOURCE, OSAKA_SUITA_SOURCE, HYOGO_ASHIYA_SOURCE, HYOGO_HIMEJI_SOURCE, HYOGO_ITAMI_SOURCE, HYOGO_KAKOGAWA_SOURCE, HYOGO_TATSUNO_SOURCE, HYOGO_ONO_SOURCE, HYOGO_SHISO_SOURCE, HYOGO_KATO_SOURCE, HYOGO_INAGAWA_SOURCE, HYOGO_INAMI_SOURCE, HYOGO_FUKUSAKI_SOURCE, HYOGO_KAMIKAWA_SOURCE, NARA_TENRI_SOURCE, NARA_KASHIHARA_SOURCE, NARA_GOJO_SOURCE, NARA_GOSE_SOURCE, NARA_IKOMA_SOURCE, NARA_IKARUGA_SOURCE, NARA_ANDO_SOURCE, NARA_KAWANISHI_NR_SOURCE, NARA_TAWARAMOTO_SOURCE, NARA_OJI_SOURCE, NARA_KORYO_SOURCE, NARA_ASUKA_SOURCE, NARA_TOTSUKAWA_SOURCE, NARA_SHIMOICHI_SOURCE, WAKAYAMA_WAKAYAMA_SOURCE, WAKAYAMA_HASHIMOTO_SOURCE, WAKAYAMA_INAMI_WK_SOURCE,
  // 中国・四国
  TOTTORI_KOSODATE_SOURCE, TOTTORI_NICHINAN_SOURCE, TOTTORI_SAKAIMINATO_SOURCE, SHIMANE_MASUDA_SOURCE, SHIMANE_AMA_SOURCE, OKAYAMA_OKAYAMA_SOURCE, OKAYAMA_AKAIWA_SOURCE, OKAYAMA_MIMASAKA_SOURCE, OKAYAMA_HAYASHIMA_SOURCE, HIROSHIMA_HIROSHIMA_SOURCE, HIROSHIMA_IKUCHAN_SOURCE, HIROSHIMA_FUCHU_SOURCE, HIROSHIMA_OTAKE_SOURCE, HIROSHIMA_HIGASHIHIROSHIMA_SOURCE, HIROSHIMA_FUKUYAMA_SOURCE, HIROSHIMA_KURE_SOURCE, HIROSHIMA_ONOMICHI_SOURCE, HIROSHIMA_MIHARA_SOURCE, HIROSHIMA_HATSUKAICHI_SOURCE, YAMAGUCHI_HIKARI_SOURCE, YAMAGUCHI_SHIMONOSEKI_SOURCE, YAMAGUCHI_YAMAGUCHI_SOURCE, YAMAGUCHI_SHUNAN_SOURCE, YAMAGUCHI_UBE_SOURCE, TOKUSHIMA_TOKUSHIMA_SOURCE, TOKUSHIMA_NAKA_SOURCE, TOKUSHIMA_HIGASHIMIYOSHI_SOURCE, KAGAWA_TAKAMATSU_SOURCE, KAGAWA_SANUKI_SOURCE, KAGAWA_MITOYO_SOURCE, KAGAWA_TONOSHO_SOURCE, KAGAWA_MARUGAME_SOURCE, KAGAWA_SAKAIDE_SOURCE, EHIME_SEIYO_SOURCE, EHIME_TOBE_SOURCE, EHIME_NIIHAMA_SOURCE, EHIME_SAIJO_SOURCE, KOCHI_MUROTO_SOURCE, KOCHI_KOKOHARE_SOURCE,
  // 九州・沖縄
  FUKUOKA_KITAKYUSHU_SOURCE, FUKUOKA_FUKUTSU_SOURCE, FUKUOKA_SHINGU_FK_SOURCE, FUKUOKA_HIROKAWA_SOURCE, FUKUOKA_KAWARA_SOURCE, FUKUOKA_CHIKUSHINO_SOURCE, FUKUOKA_NAKAGAWA_SOURCE, NAGASAKI_NAGASAKI_SOURCE, NAGASAKI_TSUSHIMA_SOURCE, NAGASAKI_IKI_SOURCE, NAGASAKI_SAIKAI_SOURCE, NAGASAKI_TOGITSU_SOURCE, NAGASAKI_HIGASHISONOGI_SOURCE, SAGA_KARATSU_SOURCE, SAGA_TOSU_SOURCE, KUMAMOTO_TAKAMORI_SOURCE, KUMAMOTO_KIKUCHI_SOURCE, KUMAMOTO_KOSODATE_SOURCE, OITA_HITA_SOURCE, OITA_TAKETA_SOURCE, OITA_KITSUKI_SOURCE, OITA_KUSU_SOURCE, MIYAZAKI_SUKUSUKU_SOURCE, MIYAZAKI_MIYAZAKI_SOURCE, MIYAZAKI_NICHINAN_SOURCE, MIYAZAKI_KIJO_SOURCE, MIYAZAKI_KADOGAWA_SOURCE, MIYAZAKI_MIYAKOJIMA_SOURCE, KAGOSHIMA_SATSUMASENDAI_SOURCE, KAGOSHIMA_MINAMIKYUSHU_SOURCE, KAGOSHIMA_SATSUMA_SOURCE, KAGOSHIMA_KIMOTSUKI_SOURCE, OKINAWA_YOMITAN_SOURCE, OKINAWA_KITANAKAGUSUKU_SOURCE, OKINAWA_IE_SOURCE, HOKKAIDO_SAPPORO_SOURCE, OITA_OITA_SOURCE, OKINAWA_NAHA_SOURCE, SHIZUOKA_ATAMI_SOURCE, SHIZUOKA_ITO_SOURCE, AICHI_KIYOSU_SOURCE, OKAYAMA_KIBICHUO_SOURCE, IKOYO_SOURCE, IWATE_MORIOKA_SOURCE, WAKAYAMA_WAKAYAMA_SOURCE,
  // Metadata for frontend
  REGION_GROUPS,
  PREF_CENTERS,
  buildSourceToPrefMap,
};
