#!/usr/bin/env node
/**
 * generate_nationwide_config.js
 *
 * Generates code blocks for adding nationwide municipalities to the project.
 * Based on CMS probe results across Hokkaido, Chubu, Kinki, Chugoku/Shikoku,
 * and Kyushu/Okinawa regions.
 *
 * Usage: node scripts/generate_nationwide_config.js
 *
 * Output: Separate code blocks for each target file (wards.js, geo-utils.js,
 * server.js, events-service.js) that can be pasted in.
 */

"use strict";

// ============================================================
// Municipality definitions
// ============================================================
// Each entry: { key, label, domain, lat, lng, cmsType, cmsCount, geoMaxKm, region, prefecture, jsFile?, calendarPath?, calPath? }
// cmsType priority: calendar.json > municipal-calendar > list_calendar > cal.php > event_j.js
// Entries with "SKIP" in the user's list are excluded.
// For dual-CMS (e.g. municipal-calendar + event_j.js), prefer the higher-priority CMS.

const MUNICIPALITIES = [
  // ========== 北海道 ==========
  { key: "hokkaido_iwamizawa", label: "岩見沢市", domain: "www.city.iwamizawa.hokkaido.jp", lat: 43.1965, lng: 141.7764, cmsType: "calendar.json", cmsCount: 64, geoMaxKm: 20, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_shibetsu", label: "士別市", domain: "www.city.shibetsu.lg.jp", lat: 44.1765, lng: 142.3987, cmsType: "calendar.json", cmsCount: 91, geoMaxKm: 25, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_chitose", label: "千歳市", domain: "www.city.chitose.lg.jp", lat: 42.8195, lng: 141.6516, cmsType: "municipal-calendar", cmsCount: 20, geoMaxKm: 20, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_mori", label: "森町", domain: "www.town.hokkaido-mori.lg.jp", lat: 42.1033, lng: 140.5742, cmsType: "calendar.json", cmsCount: 7, geoMaxKm: 12, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_ozora", label: "大空町", domain: "www.town.ozora.hokkaido.jp", lat: 43.6167, lng: 144.1833, cmsType: "calendar.json", cmsCount: 9, geoMaxKm: 12, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_tsubetsu", label: "津別町", domain: "www.town.tsubetsu.lg.jp", lat: 43.7212, lng: 144.0280, cmsType: "calendar.json", cmsCount: 7, geoMaxKm: 12, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_taiki", label: "大樹町", domain: "www.town.taiki.hokkaido.jp", lat: 42.4930, lng: 143.2845, cmsType: "calendar.json", cmsCount: 68, geoMaxKm: 15, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_niseko", label: "ニセコ町", domain: "www.town.niseko.lg.jp", lat: 42.8710, lng: 140.6877, cmsType: "municipal-calendar", cmsCount: 74, geoMaxKm: 12, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_shiraoi", label: "白老町", domain: "www.town.shiraoi.hokkaido.jp", lat: 42.5500, lng: 141.3553, cmsType: "municipal-calendar", cmsCount: 59, geoMaxKm: 15, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_higashikagura", label: "東神楽町", domain: "www.town.higashikagura.lg.jp", lat: 43.6932, lng: 142.4500, cmsType: "municipal-calendar", cmsCount: 24, geoMaxKm: 10, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_otoineppu", label: "音威子府村", domain: "www.vill.otoineppu.hokkaido.jp", lat: 44.7247, lng: 142.2575, cmsType: "municipal-calendar", cmsCount: 29, geoMaxKm: 15, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_yubetsu", label: "湧別町", domain: "www.town.yubetsu.lg.jp", lat: 44.1682, lng: 143.5845, cmsType: "municipal-calendar", cmsCount: 55, geoMaxKm: 15, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_nakasatsunai", label: "中札内村", domain: "www.vill.nakasatsunai.hokkaido.jp", lat: 42.6695, lng: 143.1295, cmsType: "cal.php", cmsCount: 64, geoMaxKm: 10, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_sarabetsu", label: "更別村", domain: "www.sarabetsu.jp", lat: 42.5600, lng: 143.2300, cmsType: "cal.php", cmsCount: 96, geoMaxKm: 10, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_honbetsu", label: "本別町", domain: "www.town.honbetsu.hokkaido.jp", lat: 43.1184, lng: 143.5483, cmsType: "cal.php", cmsCount: 305, geoMaxKm: 15, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_hiroo", label: "広尾町", domain: "www.town.hiroo.lg.jp", lat: 42.2845, lng: 143.3148, cmsType: "cal.php", cmsCount: 91, geoMaxKm: 15, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_shikaoi", label: "鹿追町", domain: "www.town.shikaoi.lg.jp", lat: 43.0917, lng: 143.1003, cmsType: "cal.php", cmsCount: 102, geoMaxKm: 15, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_akkeshi", label: "厚岸町", domain: "www.akkeshi-town.jp", lat: 43.0488, lng: 144.8439, cmsType: "municipal-calendar", cmsCount: 102, geoMaxKm: 15, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_betsukai", label: "別海町", domain: "betsukai.jp", lat: 43.3905, lng: 145.1178, cmsType: "municipal-calendar", cmsCount: 74, geoMaxKm: 25, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_nakashibetsu", label: "中標津町", domain: "www.nakashibetsu.jp", lat: 43.5493, lng: 144.9695, cmsType: "cal.php", cmsCount: 113, geoMaxKm: 15, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_shibetsu_cho", label: "標津町", domain: "www.shibetsutown.jp", lat: 43.6619, lng: 145.1257, cmsType: "cal.php", cmsCount: 106, geoMaxKm: 12, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_shintoku", label: "新得町", domain: "www.shintoku-town.jp", lat: 43.0735, lng: 142.8475, cmsType: "municipal-calendar", cmsCount: 28, geoMaxKm: 25, region: "HOKKAIDO", prefecture: "北海道" },
  { key: "hokkaido_kutchan", label: "倶知安町", domain: "www.town.kutchan.hokkaido.jp", lat: 42.9018, lng: 140.7570, cmsType: "event_j.js", cmsCount: 0, geoMaxKm: 12, region: "HOKKAIDO", prefecture: "北海道", jsFile: "calendar/event_j.js" },
  { key: "hokkaido_haboro", label: "羽幌町", domain: "www.town.haboro.lg.jp", lat: 44.3597, lng: 141.7013, cmsType: "cal.php", cmsCount: 28, geoMaxKm: 15, region: "HOKKAIDO", prefecture: "北海道" },

  // ========== 中部 ==========
  // 新潟県
  { key: "niigata_sanjo", label: "三条市", domain: "www.city.sanjo.niigata.jp", lat: 37.6297, lng: 138.9624, cmsType: "calendar.json", cmsCount: 28, geoMaxKm: 20, region: "CHUBU", prefecture: "新潟県" },
  { key: "niigata_kashiwazaki", label: "柏崎市", domain: "www.city.kashiwazaki.lg.jp", lat: 37.3724, lng: 138.5592, cmsType: "calendar.json", cmsCount: 86, geoMaxKm: 20, region: "CHUBU", prefecture: "新潟県" },
  { key: "niigata_tsubame", label: "燕市", domain: "www.city.tsubame.niigata.jp", lat: 37.6719, lng: 138.8805, cmsType: "calendar.json", cmsCount: 23, geoMaxKm: 15, region: "CHUBU", prefecture: "新潟県" },
  { key: "niigata_agano", label: "阿賀野市", domain: "www.city.agano.niigata.jp", lat: 37.8307, lng: 139.2297, cmsType: "calendar.json", cmsCount: 12, geoMaxKm: 15, region: "CHUBU", prefecture: "新潟県" },
  { key: "niigata_seiro", label: "聖籠町", domain: "www.town.seiro.niigata.jp", lat: 37.9625, lng: 139.2792, cmsType: "calendar.json", cmsCount: 7, geoMaxKm: 10, region: "CHUBU", prefecture: "新潟県" },
  { key: "niigata_yuzawa", label: "湯沢町", domain: "www.town.yuzawa.lg.jp", lat: 36.9329, lng: 138.8131, cmsType: "calendar.json", cmsCount: 10, geoMaxKm: 15, region: "CHUBU", prefecture: "新潟県" },
  { key: "niigata_kamo", label: "加茂市", domain: "www.city.kamo.niigata.jp", lat: 37.6621, lng: 139.0406, cmsType: "municipal-calendar", cmsCount: 83, geoMaxKm: 15, region: "CHUBU", prefecture: "新潟県" },
  { key: "niigata_minamiuonuma", label: "南魚沼市", domain: "www.city.minamiuonuma.niigata.jp", lat: 37.0665, lng: 138.8815, cmsType: "municipal-calendar", cmsCount: 62, geoMaxKm: 25, region: "CHUBU", prefecture: "新潟県" },
  { key: "niigata_tagami", label: "田上町", domain: "www.town.tagami.niigata.jp", lat: 37.6937, lng: 139.0646, cmsType: "municipal-calendar", cmsCount: 67, geoMaxKm: 10, region: "CHUBU", prefecture: "新潟県" },
  // 富山県
  { key: "toyama_himi", label: "氷見市", domain: "www.city.himi.toyama.jp", lat: 36.8563, lng: 136.9832, cmsType: "calendar.json", cmsCount: 113, geoMaxKm: 15, region: "CHUBU", prefecture: "富山県" },
  { key: "toyama_namerikawa", label: "滑川市", domain: "www.city.namerikawa.toyama.jp", lat: 36.7643, lng: 137.3398, cmsType: "calendar.json", cmsCount: 41, geoMaxKm: 12, region: "CHUBU", prefecture: "富山県" },
  { key: "toyama_kurobe", label: "黒部市", domain: "www.city.kurobe.toyama.jp", lat: 36.8709, lng: 137.4350, cmsType: "event_j.js", cmsCount: 0, geoMaxKm: 15, region: "CHUBU", prefecture: "富山県", jsFile: "calendar/event_j.js" },
  { key: "toyama_nyuzen", label: "入善町", domain: "www.town.nyuzen.toyama.jp", lat: 36.9317, lng: 137.5011, cmsType: "calendar.json", cmsCount: 13, geoMaxKm: 10, region: "CHUBU", prefecture: "富山県" },
  { key: "toyama_asahi_ty", label: "朝日町", domain: "www.town.asahi.toyama.jp", lat: 36.9464, lng: 137.5611, cmsType: "calendar.json", cmsCount: 18, geoMaxKm: 10, region: "CHUBU", prefecture: "富山県" },
  // 石川県
  { key: "ishikawa_kanazawa", label: "金沢市", domain: "www4.city.kanazawa.lg.jp", lat: 36.5613, lng: 136.6562, cmsType: "calendar.json", cmsCount: 75, geoMaxKm: 20, region: "CHUBU", prefecture: "石川県" },
  { key: "ishikawa_komatsu", label: "小松市", domain: "www.city.komatsu.lg.jp", lat: 36.4022, lng: 136.4451, cmsType: "calendar.json", cmsCount: 22, geoMaxKm: 15, region: "CHUBU", prefecture: "石川県" },
  { key: "ishikawa_kaga", label: "加賀市", domain: "www.city.kaga.ishikawa.jp", lat: 36.3028, lng: 136.3147, cmsType: "calendar.json", cmsCount: 22, geoMaxKm: 15, region: "CHUBU", prefecture: "石川県" },
  { key: "ishikawa_nakanoto", label: "中能登町", domain: "www.town.nakanoto.ishikawa.jp", lat: 36.8902, lng: 136.8720, cmsType: "calendar.json", cmsCount: 30, geoMaxKm: 12, region: "CHUBU", prefecture: "石川県" },
  // 福井県
  { key: "fukui_sabae", label: "鯖江市", domain: "www.city.sabae.fukui.jp", lat: 35.9563, lng: 136.1842, cmsType: "list_calendar", cmsCount: 47, geoMaxKm: 12, region: "CHUBU", prefecture: "福井県" },
  // 山梨県
  { key: "yamanashi_chuo", label: "中央市", domain: "www.city.chuo.yamanashi.jp", lat: 35.6087, lng: 138.5224, cmsType: "calendar.json", cmsCount: 25, geoMaxKm: 12, region: "CHUBU", prefecture: "山梨県" },
  { key: "yamanashi_minamialps", label: "南アルプス市", domain: "www.city.minami-alps.yamanashi.jp", lat: 35.6085, lng: 138.4655, cmsType: "municipal-calendar", cmsCount: 246, geoMaxKm: 25, region: "CHUBU", prefecture: "山梨県" },
  { key: "yamanashi_hokuto", label: "北杜市", domain: "www.city.hokuto.yamanashi.jp", lat: 35.7811, lng: 138.3810, cmsType: "municipal-calendar", cmsCount: 339, geoMaxKm: 30, region: "CHUBU", prefecture: "山梨県" },
  // 長野県
  { key: "nagano_suzaka", label: "須坂市", domain: "www.city.suzaka.nagano.jp", lat: 36.6511, lng: 138.3071, cmsType: "calendar.json", cmsCount: 26, geoMaxKm: 15, region: "CHUBU", prefecture: "長野県" },
  { key: "nagano_komagane", label: "駒ヶ根市", domain: "www.city.komagane.nagano.jp", lat: 35.7273, lng: 137.9933, cmsType: "calendar.json", cmsCount: 22, geoMaxKm: 15, region: "CHUBU", prefecture: "長野県" },
  { key: "nagano_chikuma", label: "千曲市", domain: "www.city.chikuma.lg.jp", lat: 36.5309, lng: 138.1182, cmsType: "calendar.json", cmsCount: 7, geoMaxKm: 15, region: "CHUBU", prefecture: "長野県" },
  { key: "nagano_iijimacho", label: "飯島町", domain: "www.town.iijima.lg.jp", lat: 35.6654, lng: 137.9159, cmsType: "calendar.json", cmsCount: 52, geoMaxKm: 10, region: "CHUBU", prefecture: "長野県" },
  { key: "nagano_matsukawa", label: "松川町", domain: "www.town.matsukawa.nagano.jp", lat: 35.5843, lng: 137.9175, cmsType: "calendar.json", cmsCount: 13, geoMaxKm: 10, region: "CHUBU", prefecture: "長野県" },
  { key: "nagano_ikeda", label: "池田町", domain: "www.ikedamachi.net", lat: 36.4217, lng: 137.8775, cmsType: "municipal-calendar", cmsCount: 122, geoMaxKm: 10, region: "CHUBU", prefecture: "長野県" },
  // 岐阜県
  { key: "gifu_ogaki", label: "大垣市", domain: "www.city.ogaki.lg.jp", lat: 35.3598, lng: 136.6129, cmsType: "municipal-calendar", cmsCount: 58, geoMaxKm: 15, region: "CHUBU", prefecture: "岐阜県" },
  { key: "gifu_seki", label: "関市", domain: "www.city.seki.lg.jp", lat: 35.4955, lng: 136.9175, cmsType: "municipal-calendar", cmsCount: 211, geoMaxKm: 20, region: "CHUBU", prefecture: "岐阜県" },
  { key: "gifu_ena", label: "恵那市", domain: "www.city.ena.lg.jp", lat: 35.4498, lng: 137.4127, cmsType: "calendar.json", cmsCount: 42, geoMaxKm: 20, region: "CHUBU", prefecture: "岐阜県" },
  { key: "gifu_motosu", label: "本巣市", domain: "www.city.motosu.lg.jp", lat: 35.4833, lng: 136.6862, cmsType: "municipal-calendar", cmsCount: 42, geoMaxKm: 20, region: "CHUBU", prefecture: "岐阜県" },
  { key: "gifu_kaizu", label: "海津市", domain: "www.city.kaizu.lg.jp", lat: 35.2241, lng: 136.6337, cmsType: "municipal-calendar", cmsCount: 169, geoMaxKm: 15, region: "CHUBU", prefecture: "岐阜県" },
  { key: "gifu_anpachi", label: "安八町", domain: "www.town.anpachi.gifu.jp", lat: 35.3427, lng: 136.6389, cmsType: "municipal-calendar", cmsCount: 83, geoMaxKm: 10, region: "CHUBU", prefecture: "岐阜県" },
  { key: "gifu_ibigawa", label: "揖斐川町", domain: "www.town.ibigawa.lg.jp", lat: 35.4787, lng: 136.5717, cmsType: "municipal-calendar", cmsCount: 34, geoMaxKm: 25, region: "CHUBU", prefecture: "岐阜県" },
  { key: "gifu_ono_gf", label: "大野町", domain: "www.town-ono.jp", lat: 35.4680, lng: 136.6343, cmsType: "municipal-calendar", cmsCount: 31, geoMaxKm: 10, region: "CHUBU", prefecture: "岐阜県" },
  // 静岡県
  { key: "shizuoka_fujieda", label: "藤枝市", domain: "www.city.fujieda.shizuoka.jp", lat: 34.8679, lng: 138.2529, cmsType: "calendar.json", cmsCount: 39, geoMaxKm: 15, region: "CHUBU", prefecture: "静岡県" },
  { key: "shizuoka_susono", label: "裾野市", domain: "www.city.susono.shizuoka.jp", lat: 35.1744, lng: 138.9056, cmsType: "calendar.json", cmsCount: 76, geoMaxKm: 15, region: "CHUBU", prefecture: "静岡県" },
  { key: "shizuoka_kosai", label: "湖西市", domain: "www.city.kosai.shizuoka.jp", lat: 34.7189, lng: 137.5266, cmsType: "calendar.json", cmsCount: 35, geoMaxKm: 12, region: "CHUBU", prefecture: "静岡県" },
  { key: "shizuoka_izu", label: "伊豆市", domain: "www.city.izu.shizuoka.jp", lat: 34.9744, lng: 138.9456, cmsType: "calendar.json", cmsCount: 28, geoMaxKm: 20, region: "CHUBU", prefecture: "静岡県" },
  { key: "shizuoka_omaezaki", label: "御前崎市", domain: "www.city.omaezaki.shizuoka.jp", lat: 34.6381, lng: 138.1270, cmsType: "calendar.json", cmsCount: 8, geoMaxKm: 12, region: "CHUBU", prefecture: "静岡県" },
  { key: "shizuoka_nagaizumi", label: "長泉町", domain: "www.town.nagaizumi.lg.jp", lat: 35.1440, lng: 138.8948, cmsType: "calendar.json", cmsCount: 17, geoMaxKm: 8, region: "CHUBU", prefecture: "静岡県" },
  { key: "shizuoka_kannami", label: "函南町", domain: "www.town.kannami.shizuoka.jp", lat: 35.0726, lng: 138.9456, cmsType: "calendar.json", cmsCount: 19, geoMaxKm: 10, region: "CHUBU", prefecture: "静岡県" },
  // 愛知県
  { key: "aichi_toyokawa", label: "豊川市", domain: "www.city.toyokawa.lg.jp", lat: 34.8275, lng: 137.3755, cmsType: "calendar.json", cmsCount: 69, geoMaxKm: 15, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_hekinan", label: "碧南市", domain: "www.city.hekinan.lg.jp", lat: 34.8815, lng: 136.9935, cmsType: "calendar.json", cmsCount: 109, geoMaxKm: 10, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_shinshiro", label: "新城市", domain: "www.city.shinshiro.lg.jp", lat: 34.8993, lng: 137.4979, cmsType: "list_calendar", cmsCount: 215, geoMaxKm: 20, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_chiryu", label: "知立市", domain: "www.city.chiryu.aichi.jp", lat: 34.9928, lng: 137.0510, cmsType: "calendar.json", cmsCount: 8, geoMaxKm: 8, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_inazawa", label: "稲沢市", domain: "www.city.inazawa.aichi.jp", lat: 35.2476, lng: 136.7858, cmsType: "municipal-calendar", cmsCount: 238, geoMaxKm: 12, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_iwakura", label: "岩倉市", domain: "www.city.iwakura.aichi.jp", lat: 35.2797, lng: 136.8704, cmsType: "municipal-calendar", cmsCount: 86, geoMaxKm: 8, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_nisshin", label: "日進市", domain: "www.city.nisshin.lg.jp", lat: 35.1316, lng: 137.0397, cmsType: "calendar.json", cmsCount: 35, geoMaxKm: 10, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_aisai", label: "愛西市", domain: "www.city.aisai.lg.jp", lat: 35.1586, lng: 136.7256, cmsType: "municipal-calendar", cmsCount: 35, geoMaxKm: 12, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_miyoshi", label: "みよし市", domain: "www.city.aichi-miyoshi.lg.jp", lat: 35.0860, lng: 137.0704, cmsType: "calendar.json", cmsCount: 70, geoMaxKm: 10, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_nagakute", label: "長久手市", domain: "www.city.nagakute.lg.jp", lat: 35.1830, lng: 137.0481, cmsType: "calendar.json", cmsCount: 17, geoMaxKm: 8, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_togo", label: "東郷町", domain: "www.town.aichi-togo.lg.jp", lat: 35.0917, lng: 137.0556, cmsType: "calendar.json", cmsCount: 6, geoMaxKm: 8, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_agui", label: "阿久比町", domain: "www.town.agui.lg.jp", lat: 34.9336, lng: 136.9192, cmsType: "municipal-calendar", cmsCount: 76, geoMaxKm: 8, region: "CHUBU", prefecture: "愛知県" },
  { key: "aichi_higashiura", label: "東浦町", domain: "www.town.aichi-higashiura.lg.jp", lat: 34.9740, lng: 136.9641, cmsType: "calendar.json", cmsCount: 38, geoMaxKm: 10, region: "CHUBU", prefecture: "愛知県" },

  // ========== 近畿 ==========
  // 三重県
  { key: "mie_toba", label: "鳥羽市", domain: "www.city.toba.mie.jp", lat: 34.4802, lng: 136.8427, cmsType: "calendar.json", cmsCount: 81, geoMaxKm: 15, region: "KINKI", prefecture: "三重県" },
  { key: "mie_owase", label: "尾鷲市", domain: "www.city.owase.lg.jp", lat: 34.0706, lng: 136.1909, cmsType: "municipal-calendar", cmsCount: 126, geoMaxKm: 15, region: "KINKI", prefecture: "三重県" },
  { key: "mie_iga", label: "伊賀市", domain: "www.city.iga.lg.jp", lat: 34.7663, lng: 136.1295, cmsType: "municipal-calendar", cmsCount: 44, geoMaxKm: 20, region: "KINKI", prefecture: "三重県" },
  { key: "mie_kisosaki", label: "木曽岬町", domain: "www.town.kisosaki.lg.jp", lat: 35.0887, lng: 136.7726, cmsType: "municipal-calendar", cmsCount: 66, geoMaxKm: 8, region: "KINKI", prefecture: "三重県" },
  { key: "mie_taki", label: "多気町", domain: "www.town.taki.mie.jp", lat: 34.4811, lng: 136.5496, cmsType: "calendar.json", cmsCount: 8, geoMaxKm: 12, region: "KINKI", prefecture: "三重県" },
  { key: "mie_meiwa", label: "明和町", domain: "www.town.meiwa.mie.jp", lat: 34.5426, lng: 136.6187, cmsType: "calendar.json", cmsCount: 11, geoMaxKm: 10, region: "KINKI", prefecture: "三重県" },
  // 滋賀県
  { key: "shiga_hikone", label: "彦根市", domain: "www.city.hikone.lg.jp", lat: 35.2760, lng: 136.2515, cmsType: "calendar.json", cmsCount: 52, geoMaxKm: 15, region: "KINKI", prefecture: "滋賀県" },
  { key: "shiga_nagahama", label: "長浜市", domain: "www.city.nagahama.lg.jp", lat: 35.3813, lng: 136.2699, cmsType: "municipal-calendar", cmsCount: 156, geoMaxKm: 20, region: "KINKI", prefecture: "滋賀県" },
  { key: "shiga_omihachiman", label: "近江八幡市", domain: "www.city.omihachiman.shiga.jp", lat: 35.1278, lng: 136.0977, cmsType: "calendar.json", cmsCount: 5, geoMaxKm: 15, region: "KINKI", prefecture: "滋賀県" },
  { key: "shiga_koka", label: "甲賀市", domain: "www.city.koka.lg.jp", lat: 34.9659, lng: 136.1651, cmsType: "municipal-calendar", cmsCount: 17, geoMaxKm: 20, region: "KINKI", prefecture: "滋賀県" },
  { key: "shiga_maibara", label: "米原市", domain: "www.city.maibara.lg.jp", lat: 35.3153, lng: 136.2886, cmsType: "calendar.json", cmsCount: 33, geoMaxKm: 15, region: "KINKI", prefecture: "滋賀県" },
  { key: "shiga_aisho", label: "愛荘町", domain: "www.town.aisho.shiga.jp", lat: 35.1467, lng: 136.2233, cmsType: "calendar.json", cmsCount: 36, geoMaxKm: 10, region: "KINKI", prefecture: "滋賀県" },
  { key: "shiga_hino", label: "日野町", domain: "www.town.shiga-hino.lg.jp", lat: 35.0178, lng: 136.2494, cmsType: "municipal-calendar", cmsCount: 83, geoMaxKm: 12, region: "KINKI", prefecture: "滋賀県" },
  { key: "shiga_toyosato", label: "豊郷町", domain: "www.town.toyosato.shiga.jp", lat: 35.2053, lng: 136.2556, cmsType: "municipal-calendar", cmsCount: 34, geoMaxKm: 8, region: "KINKI", prefecture: "滋賀県" },
  // 京都府
  { key: "kyoto_maizuru", label: "舞鶴市", domain: "www.city.maizuru.kyoto.jp", lat: 35.4544, lng: 135.3842, cmsType: "municipal-calendar", cmsCount: 214, geoMaxKm: 20, region: "KINKI", prefecture: "京都府" },
  { key: "kyoto_ayabe", label: "綾部市", domain: "www.city.ayabe.lg.jp", lat: 35.2912, lng: 135.2533, cmsType: "municipal-calendar", cmsCount: 194, geoMaxKm: 20, region: "KINKI", prefecture: "京都府" },
  { key: "kyoto_joyo", label: "城陽市", domain: "www.city.joyo.kyoto.jp", lat: 34.8522, lng: 135.7808, cmsType: "municipal-calendar", cmsCount: 49, geoMaxKm: 10, region: "KINKI", prefecture: "京都府" },
  { key: "kyoto_nagaokakyo", label: "長岡京市", domain: "www.city.nagaokakyo.lg.jp", lat: 34.9264, lng: 135.6952, cmsType: "municipal-calendar", cmsCount: 64, geoMaxKm: 8, region: "KINKI", prefecture: "京都府" },
  { key: "kyoto_yawata", label: "八幡市", domain: "www.city.yawata.kyoto.jp", lat: 34.8763, lng: 135.7081, cmsType: "municipal-calendar", cmsCount: 179, geoMaxKm: 10, region: "KINKI", prefecture: "京都府" },
  { key: "kyoto_seika", label: "精華町", domain: "www.town.seika.kyoto.jp", lat: 34.7584, lng: 135.7828, cmsType: "calendar.json", cmsCount: 34, geoMaxKm: 8, region: "KINKI", prefecture: "京都府" },
  { key: "kyoto_kumiyama", label: "久御山町", domain: "www.town.kumiyama.lg.jp", lat: 34.8830, lng: 135.7245, cmsType: "municipal-calendar", cmsCount: 33, geoMaxKm: 8, region: "KINKI", prefecture: "京都府" },
  { key: "kyoto_minamiyamashiro", label: "南山城村", domain: "www.vill.minamiyamashiro.lg.jp", lat: 34.7552, lng: 135.9756, cmsType: "municipal-calendar", cmsCount: 52, geoMaxKm: 12, region: "KINKI", prefecture: "京都府" },
  // 大阪府
  { key: "osaka_ikeda", label: "池田市", domain: "www.city.ikeda.osaka.jp", lat: 34.8215, lng: 135.4268, cmsType: "calendar.json", cmsCount: 12, geoMaxKm: 10, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_izumiotsu", label: "泉大津市", domain: "www.city.izumiotsu.lg.jp", lat: 34.5053, lng: 135.4057, cmsType: "calendar.json", cmsCount: 61, geoMaxKm: 8, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_kaizuka", label: "貝塚市", domain: "www.city.kaizuka.lg.jp", lat: 34.4426, lng: 135.3598, cmsType: "calendar.json", cmsCount: 68, geoMaxKm: 12, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_moriguchi", label: "守口市", domain: "www.city.moriguchi.osaka.jp", lat: 34.7359, lng: 135.5639, cmsType: "calendar.json", cmsCount: 11, geoMaxKm: 8, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_ibaraki", label: "茨木市", domain: "www.city.ibaraki.osaka.jp", lat: 34.8156, lng: 135.5685, cmsType: "calendar.json", cmsCount: 111, geoMaxKm: 12, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_hirakata", label: "枚方市", domain: "www.city.hirakata.osaka.jp", lat: 34.8144, lng: 135.6519, cmsType: "municipal-calendar", cmsCount: 203, geoMaxKm: 12, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_neyagawa", label: "寝屋川市", domain: "www.city.neyagawa.osaka.jp", lat: 34.7662, lng: 135.6278, cmsType: "calendar.json", cmsCount: 70, geoMaxKm: 10, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_izumi", label: "和泉市", domain: "www.city.osaka-izumi.lg.jp", lat: 34.4837, lng: 135.4226, cmsType: "calendar.json", cmsCount: 39, geoMaxKm: 12, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_habikino", label: "羽曳野市", domain: "www.city.habikino.lg.jp", lat: 34.5577, lng: 135.6063, cmsType: "calendar.json", cmsCount: 40, geoMaxKm: 10, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_fujiidera", label: "藤井寺市", domain: "www.city.fujiidera.lg.jp", lat: 34.5737, lng: 135.5968, cmsType: "calendar.json", cmsCount: 12, geoMaxKm: 8, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_higashiosaka", label: "東大阪市", domain: "www.city.higashiosaka.lg.jp", lat: 34.6796, lng: 135.6005, cmsType: "municipal-calendar", cmsCount: 270, geoMaxKm: 12, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_sennan", label: "泉南市", domain: "www.city.sennan.lg.jp", lat: 34.3628, lng: 135.2725, cmsType: "calendar.json", cmsCount: 154, geoMaxKm: 10, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_hannan", label: "阪南市", domain: "www.city.hannan.lg.jp", lat: 34.3561, lng: 135.2444, cmsType: "calendar.json", cmsCount: 23, geoMaxKm: 10, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_kumatori", label: "熊取町", domain: "www.town.kumatori.lg.jp", lat: 34.3989, lng: 135.3489, cmsType: "calendar.json", cmsCount: 84, geoMaxKm: 8, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_tadaoka", label: "忠岡町", domain: "www.town.tadaoka.osaka.jp", lat: 34.4883, lng: 135.4008, cmsType: "calendar.json", cmsCount: 11, geoMaxKm: 6, region: "KINKI", prefecture: "大阪府" },
  { key: "osaka_taishi", label: "太子町", domain: "www.town.taishi.osaka.jp", lat: 34.5183, lng: 135.6479, cmsType: "calendar.json", cmsCount: 8, geoMaxKm: 8, region: "KINKI", prefecture: "大阪府" },
  // 兵庫県
  { key: "hyogo_himeji", label: "姫路市", domain: "www.city.himeji.lg.jp", lat: 34.8159, lng: 134.6853, cmsType: "municipal-calendar", cmsCount: 332, geoMaxKm: 25, region: "KINKI", prefecture: "兵庫県" },
  { key: "hyogo_itami", label: "伊丹市", domain: "www.city.itami.lg.jp", lat: 34.7847, lng: 135.3985, cmsType: "calendar.json", cmsCount: 138, geoMaxKm: 8, region: "KINKI", prefecture: "兵庫県" },
  { key: "hyogo_kakogawa", label: "加古川市", domain: "www.city.kakogawa.lg.jp", lat: 34.7568, lng: 134.8413, cmsType: "calendar.json", cmsCount: 91, geoMaxKm: 15, region: "KINKI", prefecture: "兵庫県" },
  { key: "hyogo_tatsuno", label: "たつの市", domain: "www.city.tatsuno.lg.jp", lat: 34.8588, lng: 134.5446, cmsType: "calendar.json", cmsCount: 29, geoMaxKm: 15, region: "KINKI", prefecture: "兵庫県" },
  { key: "hyogo_ono", label: "小野市", domain: "www.city.ono.hyogo.jp", lat: 34.8530, lng: 134.9310, cmsType: "calendar.json", cmsCount: 28, geoMaxKm: 12, region: "KINKI", prefecture: "兵庫県" },
  { key: "hyogo_shiso", label: "宍粟市", domain: "www.city.shiso.lg.jp", lat: 35.0006, lng: 134.5367, cmsType: "calendar.json", cmsCount: 9, geoMaxKm: 25, region: "KINKI", prefecture: "兵庫県" },
  { key: "hyogo_kato", label: "加東市", domain: "www.city.kato.lg.jp", lat: 34.9176, lng: 134.9642, cmsType: "calendar.json", cmsCount: 14, geoMaxKm: 15, region: "KINKI", prefecture: "兵庫県" },
  { key: "hyogo_inagawa", label: "猪名川町", domain: "www.town.inagawa.lg.jp", lat: 34.8954, lng: 135.3758, cmsType: "calendar.json", cmsCount: 17, geoMaxKm: 12, region: "KINKI", prefecture: "兵庫県" },
  { key: "hyogo_inami", label: "稲美町", domain: "www.town.hyogo-inami.lg.jp", lat: 34.7445, lng: 134.8940, cmsType: "municipal-calendar", cmsCount: 233, geoMaxKm: 8, region: "KINKI", prefecture: "兵庫県" },
  { key: "hyogo_fukusaki", label: "福崎町", domain: "www.town.fukusaki.hyogo.jp", lat: 34.9475, lng: 134.7564, cmsType: "municipal-calendar", cmsCount: 39, geoMaxKm: 10, region: "KINKI", prefecture: "兵庫県" },
  { key: "hyogo_kamikawa", label: "神河町", domain: "www.town.kamikawa.hyogo.jp", lat: 35.0556, lng: 134.7394, cmsType: "municipal-calendar", cmsCount: 132, geoMaxKm: 15, region: "KINKI", prefecture: "兵庫県" },
  // 奈良県
  { key: "nara_tenri", label: "天理市", domain: "www.city.tenri.nara.jp", lat: 34.5963, lng: 135.8371, cmsType: "calendar.json", cmsCount: 10, geoMaxKm: 12, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_kashihara", label: "橿原市", domain: "www.city.kashihara.nara.jp", lat: 34.5092, lng: 135.7929, cmsType: "calendar.json", cmsCount: 47, geoMaxKm: 10, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_gojo", label: "五條市", domain: "www.city.gojo.lg.jp", lat: 34.3511, lng: 135.6938, cmsType: "calendar.json", cmsCount: 23, geoMaxKm: 20, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_gose", label: "御所市", domain: "www.city.gose.nara.jp", lat: 34.4567, lng: 135.7388, cmsType: "municipal-calendar", cmsCount: 73, geoMaxKm: 12, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_ikoma", label: "生駒市", domain: "www.city.ikoma.lg.jp", lat: 34.6923, lng: 135.6995, cmsType: "municipal-calendar", cmsCount: 233, geoMaxKm: 10, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_ikaruga", label: "斑鳩町", domain: "www.town.ikaruga.nara.jp", lat: 34.6142, lng: 135.7280, cmsType: "municipal-calendar", cmsCount: 85, geoMaxKm: 8, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_ando", label: "安堵町", domain: "www.town.ando.nara.jp", lat: 34.5975, lng: 135.7268, cmsType: "municipal-calendar", cmsCount: 65, geoMaxKm: 6, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_kawanishi_nr", label: "河合町", domain: "www.town.kawai.nara.jp", lat: 34.5860, lng: 135.7604, cmsType: "municipal-calendar", cmsCount: 45, geoMaxKm: 8, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_tawaramoto", label: "田原本町", domain: "www.town.tawaramoto.nara.jp", lat: 34.5564, lng: 135.7923, cmsType: "calendar.json", cmsCount: 8, geoMaxKm: 8, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_oji", label: "王寺町", domain: "www.town.oji.nara.jp", lat: 34.5933, lng: 135.7064, cmsType: "calendar.json", cmsCount: 58, geoMaxKm: 6, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_koryo", label: "広陵町", domain: "www.town.koryo.nara.jp", lat: 34.5563, lng: 135.7500, cmsType: "municipal-calendar", cmsCount: 50, geoMaxKm: 8, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_asuka", label: "明日香村", domain: "www.asukamura.jp", lat: 34.4754, lng: 135.8175, cmsType: "municipal-calendar", cmsCount: 259, geoMaxKm: 8, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_totsukawa", label: "十津川村", domain: "www.vill.totsukawa.lg.jp", lat: 34.1064, lng: 135.6960, cmsType: "cal.php", cmsCount: 106, geoMaxKm: 30, region: "KINKI", prefecture: "奈良県" },
  { key: "nara_shimoichi", label: "下市町", domain: "www.town.shimoichi.lg.jp", lat: 34.3708, lng: 135.7648, cmsType: "municipal-calendar", cmsCount: 39, geoMaxKm: 12, region: "KINKI", prefecture: "奈良県" },
  // 和歌山県
  { key: "wakayama_hashimoto", label: "橋本市", domain: "www.city.hashimoto.lg.jp", lat: 34.3146, lng: 135.6051, cmsType: "calendar.json", cmsCount: 7, geoMaxKm: 15, region: "KINKI", prefecture: "和歌山県" },
  { key: "wakayama_inami_wk", label: "印南町", domain: "www.town.wakayama-inami.lg.jp", lat: 33.8042, lng: 135.2292, cmsType: "municipal-calendar", cmsCount: 78, geoMaxKm: 12, region: "KINKI", prefecture: "和歌山県" },

  // ========== 中国・四国 ==========
  // 鳥取県
  { key: "tottori_nichinan", label: "日南町", domain: "www.town.nichinan.lg.jp", lat: 35.1545, lng: 133.3184, cmsType: "calendar.json", cmsCount: 43, geoMaxKm: 15, region: "CHUGOKU_SHIKOKU", prefecture: "鳥取県" },
  { key: "tottori_sakaiminato", label: "境港市", domain: "www.city.sakaiminato.lg.jp", lat: 35.5400, lng: 133.2309, cmsType: "event_j.js", cmsCount: 0, geoMaxKm: 10, region: "CHUGOKU_SHIKOKU", prefecture: "鳥取県", jsFile: "calendar/event_j.js" },
  // 島根県
  { key: "shimane_masuda", label: "益田市", domain: "www.city.masuda.lg.jp", lat: 34.6791, lng: 131.8430, cmsType: "calendar.json", cmsCount: 15, geoMaxKm: 20, region: "CHUGOKU_SHIKOKU", prefecture: "島根県" },
  { key: "shimane_ama", label: "海士町", domain: "www.town.ama.shimane.jp", lat: 36.0792, lng: 133.0876, cmsType: "municipal-calendar", cmsCount: 23, geoMaxKm: 15, region: "CHUGOKU_SHIKOKU", prefecture: "島根県" },
  // 岡山県
  { key: "okayama_okayama", label: "岡山市", domain: "www.city.okayama.jp", lat: 34.6551, lng: 133.9195, cmsType: "municipal-calendar", cmsCount: 98, geoMaxKm: 25, region: "CHUGOKU_SHIKOKU", prefecture: "岡山県" },
  { key: "okayama_akaiwa", label: "赤磐市", domain: "www.city.akaiwa.lg.jp", lat: 34.7543, lng: 134.0171, cmsType: "calendar.json", cmsCount: 24, geoMaxKm: 15, region: "CHUGOKU_SHIKOKU", prefecture: "岡山県" },
  { key: "okayama_mimasaka", label: "美作市", domain: "www.city.mimasaka.lg.jp", lat: 35.0070, lng: 134.1458, cmsType: "calendar.json", cmsCount: 44, geoMaxKm: 20, region: "CHUGOKU_SHIKOKU", prefecture: "岡山県" },
  { key: "okayama_hayashima", label: "早島町", domain: "www.town.hayashima.lg.jp", lat: 34.5997, lng: 133.8275, cmsType: "calendar.json", cmsCount: 40, geoMaxKm: 6, region: "CHUGOKU_SHIKOKU", prefecture: "岡山県" },
  // 広島県
  { key: "hiroshima_fuchu", label: "府中市", domain: "www.city.fuchu.hiroshima.jp", lat: 34.5678, lng: 133.2393, cmsType: "calendar.json", cmsCount: 13, geoMaxKm: 15, region: "CHUGOKU_SHIKOKU", prefecture: "広島県" },
  { key: "hiroshima_otake", label: "大竹市", domain: "www.city.otake.hiroshima.jp", lat: 34.2389, lng: 132.2222, cmsType: "calendar.json", cmsCount: 31, geoMaxKm: 12, region: "CHUGOKU_SHIKOKU", prefecture: "広島県" },
  { key: "hiroshima_higashihiroshima", label: "東広島市", domain: "www.city.higashihiroshima.lg.jp", lat: 34.4275, lng: 132.7432, cmsType: "calendar.json", cmsCount: 27, geoMaxKm: 20, region: "CHUGOKU_SHIKOKU", prefecture: "広島県" },
  // 山口県
  { key: "yamaguchi_hikari", label: "光市", domain: "www.city.hikari.lg.jp", lat: 33.9619, lng: 131.9422, cmsType: "calendar.json", cmsCount: 12, geoMaxKm: 12, region: "CHUGOKU_SHIKOKU", prefecture: "山口県" },
  // 徳島県
  { key: "tokushima_tokushima", label: "徳島市", domain: "www.city.tokushima.tokushima.jp", lat: 34.0658, lng: 134.5593, cmsType: "list_calendar", cmsCount: 32, geoMaxKm: 15, region: "CHUGOKU_SHIKOKU", prefecture: "徳島県" },
  { key: "tokushima_naka", label: "那賀町", domain: "www.town.tokushima-naka.lg.jp", lat: 33.9375, lng: 134.5236, cmsType: "calendar.json", cmsCount: 27, geoMaxKm: 25, region: "CHUGOKU_SHIKOKU", prefecture: "徳島県" },
  { key: "tokushima_higashimiyoshi", label: "東みよし町", domain: "www.town.higashimiyoshi.lg.jp", lat: 34.0294, lng: 133.9286, cmsType: "municipal-calendar", cmsCount: 102, geoMaxKm: 15, region: "CHUGOKU_SHIKOKU", prefecture: "徳島県" },
  // 香川県
  { key: "kagawa_takamatsu", label: "高松市", domain: "www.city.takamatsu.kagawa.jp", lat: 34.3401, lng: 134.0434, cmsType: "list_calendar", cmsCount: 34, geoMaxKm: 20, region: "CHUGOKU_SHIKOKU", prefecture: "香川県" },
  { key: "kagawa_sanuki", label: "さぬき市", domain: "www.city.sanuki.kagawa.jp", lat: 34.3255, lng: 134.1766, cmsType: "cal.php", cmsCount: 78, geoMaxKm: 15, region: "CHUGOKU_SHIKOKU", prefecture: "香川県" },
  { key: "kagawa_mitoyo", label: "三豊市", domain: "www.city.mitoyo.lg.jp", lat: 34.1833, lng: 133.7167, cmsType: "calendar.json", cmsCount: 8, geoMaxKm: 15, region: "CHUGOKU_SHIKOKU", prefecture: "香川県" },
  { key: "kagawa_tonosho", label: "土庄町", domain: "www.town.tonosho.kagawa.jp", lat: 34.4900, lng: 134.1863, cmsType: "calendar.json", cmsCount: 9, geoMaxKm: 12, region: "CHUGOKU_SHIKOKU", prefecture: "香川県" },
  // 愛媛県
  { key: "ehime_seiyo", label: "西予市", domain: "www.city.seiyo.ehime.jp", lat: 33.3645, lng: 132.5113, cmsType: "calendar.json", cmsCount: 23, geoMaxKm: 20, region: "CHUGOKU_SHIKOKU", prefecture: "愛媛県" },
  { key: "ehime_tobe", label: "砥部町", domain: "www.town.tobe.ehime.jp", lat: 33.7480, lng: 132.7906, cmsType: "calendar.json", cmsCount: 6, geoMaxKm: 12, region: "CHUGOKU_SHIKOKU", prefecture: "愛媛県" },
  // 高知県
  { key: "kochi_muroto", label: "室戸市", domain: "www.city.muroto.kochi.jp", lat: 33.2899, lng: 134.1527, cmsType: "municipal-calendar", cmsCount: 8, geoMaxKm: 20, region: "CHUGOKU_SHIKOKU", prefecture: "高知県" },

  // ========== 九州・沖縄 ==========
  // 福岡県
  { key: "fukuoka_fukutsu", label: "福津市", domain: "www.city.fukutsu.lg.jp", lat: 33.7699, lng: 130.4882, cmsType: "calendar.json", cmsCount: 159, geoMaxKm: 12, region: "KYUSHU_OKINAWA", prefecture: "福岡県" },
  { key: "fukuoka_shingu_fk", label: "新宮町", domain: "www.town.shingu.fukuoka.jp", lat: 33.7151, lng: 130.4448, cmsType: "calendar.json", cmsCount: 24, geoMaxKm: 10, region: "KYUSHU_OKINAWA", prefecture: "福岡県" },
  { key: "fukuoka_hirokawa", label: "広川町", domain: "www.town.hirokawa.fukuoka.jp", lat: 33.2467, lng: 130.5538, cmsType: "calendar.json", cmsCount: 9, geoMaxKm: 10, region: "KYUSHU_OKINAWA", prefecture: "福岡県" },
  { key: "fukuoka_kawara", label: "川崎町", domain: "www.town-kawara.com", lat: 33.5783, lng: 130.8506, cmsType: "municipal-calendar", cmsCount: 72, geoMaxKm: 12, region: "KYUSHU_OKINAWA", prefecture: "福岡県" },
  // 長崎県
  { key: "nagasaki_tsushima", label: "対馬市", domain: "www.city.tsushima.nagasaki.jp", lat: 34.2044, lng: 129.2888, cmsType: "calendar.json", cmsCount: 16, geoMaxKm: 30, region: "KYUSHU_OKINAWA", prefecture: "長崎県" },
  { key: "nagasaki_iki", label: "壱岐市", domain: "www.city.iki.nagasaki.jp", lat: 33.7490, lng: 129.6915, cmsType: "calendar.json", cmsCount: 191, geoMaxKm: 15, region: "KYUSHU_OKINAWA", prefecture: "長崎県" },
  { key: "nagasaki_saikai", label: "西海市", domain: "www.city.saikai.nagasaki.jp", lat: 32.9558, lng: 129.6732, cmsType: "calendar.json", cmsCount: 7, geoMaxKm: 20, region: "KYUSHU_OKINAWA", prefecture: "長崎県" },
  { key: "nagasaki_togitsu", label: "時津町", domain: "www.town.togitsu.nagasaki.jp", lat: 32.8283, lng: 129.8575, cmsType: "calendar.json", cmsCount: 11, geoMaxKm: 8, region: "KYUSHU_OKINAWA", prefecture: "長崎県" },
  { key: "nagasaki_higashisonogi", label: "東彼杵町", domain: "www.town.higashisonogi.lg.jp", lat: 33.0767, lng: 129.9633, cmsType: "calendar.json", cmsCount: 6, geoMaxKm: 12, region: "KYUSHU_OKINAWA", prefecture: "長崎県" },
  // 熊本県
  { key: "kumamoto_takamori", label: "高森町", domain: "www.town.takamori.kumamoto.jp", lat: 32.8191, lng: 131.1124, cmsType: "municipal-calendar", cmsCount: 41, geoMaxKm: 15, region: "KYUSHU_OKINAWA", prefecture: "熊本県" },
  // 大分県
  { key: "oita_hita", label: "日田市", domain: "www.city.hita.oita.jp", lat: 33.3214, lng: 130.9414, cmsType: "calendar.json", cmsCount: 5, geoMaxKm: 25, region: "KYUSHU_OKINAWA", prefecture: "大分県" },
  { key: "oita_taketa", label: "竹田市", domain: "www.city.taketa.oita.jp", lat: 32.9692, lng: 131.3967, cmsType: "calendar.json", cmsCount: 157, geoMaxKm: 25, region: "KYUSHU_OKINAWA", prefecture: "大分県" },
  { key: "oita_kitsuki", label: "杵築市", domain: "www.city.kitsuki.lg.jp", lat: 33.4153, lng: 131.6171, cmsType: "calendar.json", cmsCount: 8, geoMaxKm: 15, region: "KYUSHU_OKINAWA", prefecture: "大分県" },
  { key: "oita_kusu", label: "玖珠町", domain: "www.town.kusu.oita.jp", lat: 33.2817, lng: 131.1490, cmsType: "calendar.json", cmsCount: 11, geoMaxKm: 15, region: "KYUSHU_OKINAWA", prefecture: "大分県" },
  // 宮崎県
  { key: "miyazaki_miyazaki", label: "宮崎市", domain: "www.city.miyazaki.miyazaki.jp", lat: 31.9111, lng: 131.4239, cmsType: "municipal-calendar", cmsCount: 80, geoMaxKm: 25, region: "KYUSHU_OKINAWA", prefecture: "宮崎県" },
  { key: "miyazaki_nichinan", label: "日南市", domain: "www.city.nichinan.lg.jp", lat: 31.6028, lng: 131.3817, cmsType: "calendar.json", cmsCount: 7, geoMaxKm: 20, region: "KYUSHU_OKINAWA", prefecture: "宮崎県" },
  { key: "miyazaki_kijo", label: "木城町", domain: "www.town.kijo.lg.jp", lat: 32.1229, lng: 131.4592, cmsType: "calendar.json", cmsCount: 24, geoMaxKm: 12, region: "KYUSHU_OKINAWA", prefecture: "宮崎県" },
  { key: "miyazaki_kadogawa", label: "門川町", domain: "www.town.kadogawa.lg.jp", lat: 32.4693, lng: 131.6364, cmsType: "cal.php", cmsCount: 91, geoMaxKm: 10, region: "KYUSHU_OKINAWA", prefecture: "宮崎県" },
  { key: "miyazaki_miyakojima", label: "都城市", domain: "www.city.miyakonojo.miyazaki.jp", lat: 31.7283, lng: 131.0653, cmsType: "municipal-calendar", cmsCount: 25, geoMaxKm: 25, region: "KYUSHU_OKINAWA", prefecture: "宮崎県" },
  // 鹿児島県
  { key: "kagoshima_satsumasendai", label: "薩摩川内市", domain: "www.city.satsumasendai.lg.jp", lat: 31.8132, lng: 130.3042, cmsType: "calendar.json", cmsCount: 32, geoMaxKm: 25, region: "KYUSHU_OKINAWA", prefecture: "鹿児島県" },
  { key: "kagoshima_minamikyushu", label: "南九州市", domain: "www.city.minamikyushu.lg.jp", lat: 31.3802, lng: 130.4393, cmsType: "calendar.json", cmsCount: 209, geoMaxKm: 20, region: "KYUSHU_OKINAWA", prefecture: "鹿児島県" },
  { key: "kagoshima_satsuma", label: "さつま町", domain: "www.satsuma-net.jp", lat: 31.8992, lng: 130.4589, cmsType: "calendar.json", cmsCount: 135, geoMaxKm: 15, region: "KYUSHU_OKINAWA", prefecture: "鹿児島県" },
  { key: "kagoshima_kimotsuki", label: "肝付町", domain: "www.town.kimotsuki.lg.jp", lat: 31.3417, lng: 131.0853, cmsType: "calendar.json", cmsCount: 10, geoMaxKm: 15, region: "KYUSHU_OKINAWA", prefecture: "鹿児島県" },
  // 沖縄県
  { key: "okinawa_yomitan", label: "読谷村", domain: "www.vill.yomitan.okinawa.jp", lat: 26.3950, lng: 127.7442, cmsType: "calendar.json", cmsCount: 48, geoMaxKm: 10, region: "KYUSHU_OKINAWA", prefecture: "沖縄県" },
  { key: "okinawa_kitanakagusuku", label: "北中城村", domain: "www.vill.kitanakagusuku.lg.jp", lat: 26.3367, lng: 127.7892, cmsType: "calendar.json", cmsCount: 28, geoMaxKm: 8, region: "KYUSHU_OKINAWA", prefecture: "沖縄県" },
  { key: "okinawa_ie", label: "伊江村", domain: "www.iejima.org", lat: 26.7100, lng: 127.8063, cmsType: "event_j.js", cmsCount: 0, geoMaxKm: 8, region: "KYUSHU_OKINAWA", prefecture: "沖縄県", jsFile: "calendar/event_j.js" },
];

// ============================================================
// Helper functions
// ============================================================

function keyToConstName(key) {
  return key.toUpperCase() + "_SOURCE";
}

function keyToVarName(key) {
  // hokkaido_iwamizawa → collectHokkaidoIwamizawaEvents
  const parts = key.split("_");
  const camel = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  return "collect" + camel + "Events";
}

function regionToChildKwConst(region) {
  return region + "_CHILD_KW";
}

function groupByRegion(munis) {
  const groups = {};
  for (const m of munis) {
    if (!groups[m.region]) groups[m.region] = [];
    groups[m.region].push(m);
  }
  return groups;
}

function groupByPrefecture(munis) {
  const groups = {};
  for (const m of munis) {
    if (!groups[m.prefecture]) groups[m.prefecture] = [];
    groups[m.prefecture].push(m);
  }
  return groups;
}

const REGION_LABELS = {
  HOKKAIDO: "北海道",
  CHUBU: "中部",
  KINKI: "近畿",
  CHUGOKU_SHIKOKU: "中国・四国",
  KYUSHU_OKINAWA: "九州・沖縄",
};

// ============================================================
// Generate wards.js code
// ============================================================
function generateWardsJs() {
  const lines = [];
  lines.push("// ============================================================");
  lines.push("// === PASTE INTO src/config/wards.js (before module.exports) ===");
  lines.push("// ============================================================");
  lines.push("");

  const byRegion = groupByRegion(MUNICIPALITIES);
  for (const [region, munis] of Object.entries(byRegion)) {
    lines.push(`// ========== ${REGION_LABELS[region]} ==========`);
    const byPref = groupByPrefecture(munis);
    for (const [pref, prefMunis] of Object.entries(byPref)) {
      lines.push(`// ${pref}`);
      for (const m of prefMunis) {
        const constName = keyToConstName(m.key);
        lines.push(`const ${constName} = { key: "${m.key}", label: "${m.label}", baseUrl: "https://${m.domain}", center: { lat: ${m.lat}, lng: ${m.lng} } };`);
      }
    }
    lines.push("");
  }

  // WARD_LABEL_BY_KEY entries
  lines.push("// --- Add to WARD_LABEL_BY_KEY ---");
  for (const [region, munis] of Object.entries(byRegion)) {
    lines.push(`  // ${REGION_LABELS[region]}`);
    for (const m of munis) {
      lines.push(`  ${m.key}: "${m.label}",`);
    }
  }
  lines.push("");

  // module.exports entries
  lines.push("// --- Add to module.exports ---");
  for (const [region, munis] of Object.entries(byRegion)) {
    const constNames = munis.map(m => keyToConstName(m.key)).join(", ");
    lines.push(`  // ${REGION_LABELS[region]}`);
    lines.push(`  ${constNames},`);
  }

  return lines.join("\n");
}

// ============================================================
// Generate geo-utils.js code
// ============================================================
function generateGeoUtils() {
  const lines = [];
  lines.push("// ============================================================");
  lines.push("// === PASTE INTO src/server/geo-utils.js getWardGeoMaxKm() ===");
  lines.push("// ============================================================");
  lines.push("");

  const byRegion = groupByRegion(MUNICIPALITIES);
  for (const [region, munis] of Object.entries(byRegion)) {
    lines.push(`      // ${REGION_LABELS[region]}`);
    for (const m of munis) {
      lines.push(`      ${m.key}: ${m.geoMaxKm},`);
    }
  }

  return lines.join("\n");
}

// ============================================================
// Generate server.js code
// ============================================================
function generateServerJs() {
  const lines = [];
  lines.push("// ============================================================");
  lines.push("// === PASTE INTO server.js ===");
  lines.push("// ============================================================");
  lines.push("");

  // 1. require() additions for wards.js imports
  lines.push("// --- Add to require('./src/config/wards') destructuring ---");
  const byRegion = groupByRegion(MUNICIPALITIES);
  for (const [region, munis] of Object.entries(byRegion)) {
    const constNames = munis.map(m => keyToConstName(m.key)).join(", ");
    lines.push(`  // ${REGION_LABELS[region]}`);
    lines.push(`  ${constNames},`);
  }
  lines.push("");

  // 2. Child keyword constants per region
  lines.push("// --- Child keyword constants (add after other CHILD_KW definitions) ---");
  for (const region of Object.keys(byRegion)) {
    const kwConst = regionToChildKwConst(region);
    lines.push(`const ${kwConst} = ["子育て", "親子", "幼児", "乳幼児", "健診", "キッズ", "児童", "おはなし", "広場", "赤ちゃん", "読み聞かせ", "教室", "サロン", "相談", "工作"];`);
  }
  lines.push("");

  // 3. Collector instantiation
  lines.push("// --- Collector instantiation ---");
  for (const [region, munis] of Object.entries(byRegion)) {
    const kwConst = regionToChildKwConst(region);
    lines.push(`// ${REGION_LABELS[region]}`);
    const byPref = groupByPrefecture(munis);
    for (const [pref, prefMunis] of Object.entries(byPref)) {
      lines.push(`// ${pref}`);
      for (const m of prefMunis) {
        const varName = keyToVarName(m.key);
        const constName = keyToConstName(m.key);
        switch (m.cmsType) {
          case "calendar.json":
            lines.push(`const ${varName} = createCalendarJsonCollector({ source: ${constName}, childKeywords: ${kwConst}, useKeywordFilter: true }, geoFmDeps);`);
            break;
          case "municipal-calendar":
            lines.push(`const ${varName} = createMunicipalCalendarCollector({ source: ${constName}, calendarPath: "/event/", useKeywordFilter: true, childKeywords: ${kwConst} }, geoFmDeps);`);
            break;
          case "list_calendar":
            lines.push(`const ${varName} = createListCalendarCollector({ source: ${constName}, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);`);
            break;
          case "cal.php":
            lines.push(`const ${varName} = createCalPhpCollector({ source: ${constName}, category: 0, useKeywordFilter: true, childKeywords: ${kwConst} }, geoFmDeps);`);
            break;
          case "event_j.js":
            lines.push(`const ${varName} = createEventJsCollector({ source: ${constName}, jsFile: "${m.jsFile || "calendar/event_j.js"}", childCategoryIds: [], useKeywordFilter: true }, eventJsDeps);`);
            break;
        }
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ============================================================
// Generate events-service.js code
// ============================================================
function generateEventsService() {
  const lines = [];
  lines.push("// ============================================================");
  lines.push("// === PASTE INTO src/server/events-service.js ===");
  lines.push("// ============================================================");
  lines.push("");

  const byRegion = groupByRegion(MUNICIPALITIES);

  // 1. deps destructuring additions
  lines.push("// --- Add to createGetEvents(deps) destructuring ---");
  for (const [region, munis] of Object.entries(byRegion)) {
    const varNames = munis.map(m => keyToVarName(m.key)).join(", ");
    lines.push(`    // ${REGION_LABELS[region]}`);
    lines.push(`    ${varNames},`);
  }
  lines.push("");

  // 2. batchCollect entries
  lines.push("// --- Add to batchCollect array ---");
  for (const [region, munis] of Object.entries(byRegion)) {
    lines.push(`    // ${REGION_LABELS[region]}`);
    for (const m of munis) {
      const varName = keyToVarName(m.key);
      lines.push(`    () => ${varName}(days),`);
    }
  }
  lines.push("");

  // 3. createGetEvents({...}) call additions in server.js
  lines.push("// --- Add to createGetEvents({}) call in server.js ---");
  for (const [region, munis] of Object.entries(byRegion)) {
    const varNames = munis.map(m => keyToVarName(m.key)).join(", ");
    lines.push(`  // ${REGION_LABELS[region]}`);
    lines.push(`  ${varNames},`);
  }

  return lines.join("\n");
}

// ============================================================
// Summary stats
// ============================================================
function generateSummary() {
  const lines = [];
  lines.push("// ============================================================");
  lines.push("// === SUMMARY ===");
  lines.push("// ============================================================");

  const byRegion = groupByRegion(MUNICIPALITIES);
  let totalMunis = 0;
  const byCms = {};

  for (const [region, munis] of Object.entries(byRegion)) {
    totalMunis += munis.length;
    lines.push(`// ${REGION_LABELS[region]}: ${munis.length} municipalities`);
    for (const m of munis) {
      byCms[m.cmsType] = (byCms[m.cmsType] || 0) + 1;
    }
  }
  lines.push(`// TOTAL: ${totalMunis} municipalities`);
  lines.push("//");
  lines.push("// By CMS type:");
  for (const [cms, count] of Object.entries(byCms).sort((a, b) => b[1] - a[1])) {
    lines.push(`//   ${cms}: ${count}`);
  }

  // Count by prefecture
  lines.push("//");
  lines.push("// By prefecture:");
  const byPref = {};
  for (const m of MUNICIPALITIES) {
    byPref[m.prefecture] = (byPref[m.prefecture] || 0) + 1;
  }
  for (const [pref, count] of Object.entries(byPref)) {
    lines.push(`//   ${pref}: ${count}`);
  }

  return lines.join("\n");
}

// ============================================================
// Main
// ============================================================
function main() {
  console.log(generateSummary());
  console.log("\n");
  console.log(generateWardsJs());
  console.log("\n");
  console.log(generateGeoUtils());
  console.log("\n");
  console.log(generateServerJs());
  console.log("\n");
  console.log(generateEventsService());
}

main();
