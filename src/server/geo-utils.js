const fs = require("fs");
const path = require("path");
const { normalizeText } = require("./text-utils");
const { sanitizeAddressText } = require("./text-utils");

const GEO_CACHE_MAX = 10000;

function createGeoHelpers(deps) {
  const geoCache = deps?.geoCache instanceof Map ? deps.geoCache : new Map();

  function geoCacheSet(key, value) {
    // LRU-like eviction: remove oldest 20% when cap is reached
    if (geoCache.size >= GEO_CACHE_MAX && !geoCache.has(key)) {
      const toRemove = Math.floor(GEO_CACHE_MAX * 0.2);
      let removed = 0;
      for (const k of geoCache.keys()) {
        if (removed >= toRemove) break;
        // Prioritize removing null entries
        if (geoCache.get(k) === null) { geoCache.delete(k); removed++; }
      }
      if (removed < toRemove) {
        for (const k of geoCache.keys()) {
          if (removed >= toRemove) break;
          geoCache.delete(k); removed++;
        }
      }
    }
    geoCache.set(key, value);
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
        geoCacheSet(q, null);
        return null;
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        geoCacheSet(q, null);
        return null;
      }
      const top = data[0] || {};
      const c = top?.geometry?.coordinates;
      if (!Array.isArray(c) || c.length < 2) {
        geoCacheSet(q, null);
        return null;
      }
      const point = {
        lat: Number(c[1]),
        lng: Number(c[0]),
        address: sanitizeAddressText(top?.properties?.title || top?.properties?.address || ""),
      };
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
        geoCacheSet(q, null);
        return null;
      }
      geoCacheSet(q, point);
      return point;
    } catch {
      geoCacheSet(q, null);
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

  function isLikelyLocalPoint(point) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
    // 日本全国をカバー (沖縄~北海道)
    return point.lat >= 24.0 && point.lat <= 45.6 && point.lng >= 122.9 && point.lng <= 145.9;
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
      hachioji: 20,
      chofu: 10,
      musashino: 8,
      tachikawa: 10,
      akishima: 10,
      higashiyamato: 8,
      kiyose: 8,
      tama: 10,
      inagi: 10,
      hino: 10,
      kokubunji: 8,
      higashikurume: 8,
      fuchu: 10,
      koganei: 8,
      nishitokyo: 8,
      machida: 15,
      fussa: 8,
      musashimurayama: 10,
      akiruno: 15,
      komae: 6,
      mitaka: 8,
      kodaira: 10,
      higashimurayama: 8,
      kunitachi: 8,
      ome: 25,
      hamura: 8,
      // 神奈川県
      kawasaki: 15,
      yokohama: 20,
      sagamihara: 25,
      ebina: 8,
      kamakura: 12,
      yokosuka: 15,
      chigasaki: 10,
      zama: 8,
      zushi: 8,
      yamato: 8,
      hiratsuka: 10,
      odawara: 12,
      hadano: 15,
      ayase: 8,
      atsugi: 12,
      isehara: 12,
      minamiashigara: 15,
      fujisawa: 10,
      samukawa: 8,
      aikawa: 12,
      miura: 12,
      oiso: 8,
      hayama: 8,
      nakai: 8,
      kiyokawa: 15,
      ninomiya: 8,
      oi: 10,
      yugawara: 10,
      matsuda: 10,
      manazuru: 8,
      mizuho: 8,
      // 埼玉県
      kawaguchi: 10,
      kasukabe: 12,
      fujimino: 8,
      misato: 8,
      kawagoe: 15,
      wako: 8,
      warabi: 6,
      ageo: 10,
      niiza: 8,
      asaka: 8,
      toda: 8,
      shiki: 6,
      fujimi: 10,
      sayama: 12,
      yashio: 8,
      saitamashi: 25,
      koshigaya: 12,
      tokorozawa: 15,
      kuki: 15,
      kumagaya: 20,
      kounosu: 12,
      sakado: 10,
      hanno: 25,
      higashimatsuyama: 12,
      gyoda: 12,
      honjo: 15,
      hidaka: 15,
      shiraoka: 8,
      satte: 10,
      yorii: 15,
      sugito: 8,
      soka: 10,
      tsurugashima: 10,
      hasuda: 10,
      iruma: 15,
      kazo: 20,
      // 栃木県
      utsunomiya: 20,
      ashikaga: 15,
      kanuma: 20,
      oyama: 15,
      tochigi_city: 20,
      sano: 15,
      nikko: 30,
      moka: 12,
      ohtawara: 15,
      nasushiobara: 25,
      nasukarasuyama: 20,
      shimotsuke: 10,
      tochigi_sakura: 12,
      nasu: 25,
      takanezawa: 10,
      mashiko: 12,
      nogi: 8,
      haga: 10,
      // 群馬県
      maebashi: 20,
      takasaki: 25,
      kiryu: 20,
      isesaki: 15,
      ota_gunma: 15,
      numata: 25,
      tatebayashi: 12,
      shibukawa: 20,
      fujioka: 15,
      annaka: 15,
      tomioka: 12,
      midori: 20,
      // 茨城県
      ibaraki_mito: 15,
      ibaraki_hitachi: 20,
      ibaraki_hitachinaka: 12,
      ibaraki_tsukuba: 20,
      ibaraki_koga: 15,
      ibaraki_moriya: 10,
      ibaraki_kamisu: 15,
      ibaraki_tokai: 10,
      ibaraki_toride: 12,
      ibaraki_ryugasaki: 12,
      ibaraki_chikusei: 15,
      ibaraki_tsuchiura: 12,
      ibaraki_ishioka: 15,
      ibaraki_joso: 15,
      ibaraki_naka: 12,
      ibaraki_bando: 12,
      ibaraki_hitachiota: 25,
      ibaraki_yuki: 10,
      ibaraki_tsukubamirai: 12,
      ibaraki_inashiki: 15,
      ibaraki_sakuragawa: 20,
      ibaraki_hitachiomiya: 25,
      ibaraki_shimotsuma: 12,
      ibaraki_hokota: 15,
      ibaraki_namegata: 15,
      ibaraki_itako: 12,
      ibaraki_kasumigaura: 15,
      ibaraki_takahagi: 15,
      ibaraki_kashima: 15,
      ibaraki_kasama: 15,
      ibaraki_shiro: 10,
      ibaraki_sakai: 8,
      ibaraki_daigo: 25,
      ibaraki_yachiyo: 8,
      ibaraki_goka: 6,
      ibaraki_oarai: 8,
      ibaraki_kawachi: 8,
      ibaraki_ibarakimachi: 10,
      ibaraki_kitaibaraki: 15,
      ibaraki_ushiku: 10,
      ibaraki_ami: 10,
      ibaraki_tone: 8,
      // 東北6県
      aomori_hachinohe: 20,
      aomori_tsugaru: 20,
      aomori_hiranai: 15,
      aomori_nakadomari: 15,
      aomori_yomogita: 10,
      aomori_itayanagi: 10,
      iwate_kitakami: 15,
      iwate_kuji: 20,
      iwate_oshu: 25,
      iwate_nishiwaga: 25,
      iwate_ichinohe: 15,
      iwate_otsuchi: 15,
      miyagi_ishinomaki: 25,
      miyagi_higashimatsushima: 12,
      miyagi_zao: 15,
      miyagi_shichikashuku: 20,
      miyagi_shichigahama: 8,
      miyagi_taiwa: 12,
      miyagi_shikama: 10,
      akita_yokote: 25,
      akita_yurihonjyo: 30,
      akita_oga: 20,
      akita_kosaka: 15,
      akita_hachirogata: 8,
      yamagata_yonezawa: 20,
      yamagata_sakata: 25,
      yamagata_shinjo: 15,
      yamagata_nagai: 15,
      yamagata_nakayama: 10,
      yamagata_kahoku: 10,
      yamagata_asahi_ym: 15,
      yamagata_kaneyama: 15,
      yamagata_mamurogawa: 15,
      yamagata_okura: 20,
      yamagata_shirataka: 12,
      fukushima_fukushima: 20,
      fukushima_soma: 15,
      fukushima_minamisoma: 20,
      fukushima_otama: 10,
      fukushima_shimogo: 20,
      fukushima_aizumisato: 15,
      fukushima_furudono: 12,
      // 北海道
      hokkaido_iwamizawa: 20,
      hokkaido_shibetsu: 25,
      hokkaido_chitose: 20,
      hokkaido_mori: 12,
      hokkaido_ozora: 12,
      hokkaido_tsubetsu: 12,
      hokkaido_taiki: 15,
      hokkaido_niseko: 12,
      hokkaido_shiraoi: 15,
      hokkaido_higashikagura: 10,
      hokkaido_otoineppu: 15,
      hokkaido_yubetsu: 15,
      hokkaido_nakasatsunai: 10,
      hokkaido_sarabetsu: 10,
      hokkaido_honbetsu: 15,
      hokkaido_hiroo: 15,
      hokkaido_shikaoi: 15,
      hokkaido_akkeshi: 15,
      hokkaido_betsukai: 25,
      hokkaido_nakashibetsu: 15,
      hokkaido_shibetsu_cho: 12,
      hokkaido_shintoku: 25,
      hokkaido_kutchan: 12,
      hokkaido_haboro: 15,
      // 中部
      niigata_sanjo: 20,
      niigata_kashiwazaki: 20,
      niigata_tsubame: 15,
      niigata_agano: 15,
      niigata_seiro: 10,
      niigata_yuzawa: 15,
      niigata_kamo: 15,
      niigata_minamiuonuma: 25,
      niigata_tagami: 10,
      toyama_himi: 15,
      toyama_namerikawa: 12,
      toyama_kurobe: 15,
      toyama_nyuzen: 10,
      toyama_asahi_ty: 10,
      ishikawa_kanazawa: 20,
      ishikawa_komatsu: 15,
      ishikawa_kaga: 15,
      ishikawa_nakanoto: 12,
      fukui_sabae: 12,
      yamanashi_chuo: 12,
      yamanashi_minamialps: 25,
      yamanashi_hokuto: 30,
      nagano_suzaka: 15,
      nagano_komagane: 15,
      nagano_chikuma: 15,
      nagano_iijimacho: 10,
      nagano_matsukawa: 10,
      nagano_ikeda: 10,
      gifu_ogaki: 15,
      gifu_seki: 20,
      gifu_ena: 20,
      gifu_motosu: 20,
      gifu_kaizu: 15,
      gifu_anpachi: 10,
      gifu_ibigawa: 25,
      gifu_ono_gf: 10,
      shizuoka_fujieda: 15,
      shizuoka_susono: 15,
      shizuoka_kosai: 12,
      shizuoka_izu: 20,
      shizuoka_omaezaki: 12,
      shizuoka_nagaizumi: 8,
      shizuoka_kannami: 10,
      aichi_toyokawa: 15,
      aichi_hekinan: 10,
      aichi_shinshiro: 20,
      aichi_chiryu: 8,
      aichi_inazawa: 12,
      aichi_iwakura: 8,
      aichi_nisshin: 10,
      aichi_aisai: 12,
      aichi_miyoshi: 10,
      aichi_nagakute: 8,
      aichi_togo: 8,
      aichi_agui: 8,
      aichi_higashiura: 10,
      // 近畿
      mie_toba: 15,
      mie_owase: 15,
      mie_iga: 20,
      mie_kisosaki: 8,
      mie_taki: 12,
      mie_meiwa: 10,
      shiga_hikone: 15,
      shiga_nagahama: 20,
      shiga_omihachiman: 15,
      shiga_koka: 20,
      shiga_maibara: 15,
      shiga_aisho: 10,
      shiga_hino: 12,
      shiga_toyosato: 8,
      kyoto_maizuru: 20,
      kyoto_ayabe: 20,
      kyoto_joyo: 10,
      kyoto_nagaokakyo: 8,
      kyoto_yawata: 10,
      kyoto_seika: 8,
      kyoto_kumiyama: 8,
      kyoto_minamiyamashiro: 12,
      osaka_ikeda: 10,
      osaka_izumiotsu: 8,
      osaka_kaizuka: 12,
      osaka_moriguchi: 8,
      osaka_ibaraki: 12,
      osaka_hirakata: 12,
      osaka_neyagawa: 10,
      osaka_izumi: 12,
      osaka_habikino: 10,
      osaka_fujiidera: 8,
      osaka_higashiosaka: 12,
      osaka_sennan: 10,
      osaka_hannan: 10,
      osaka_kumatori: 8,
      osaka_tadaoka: 6,
      osaka_taishi: 8,
      hyogo_himeji: 25,
      hyogo_itami: 8,
      hyogo_kakogawa: 15,
      hyogo_tatsuno: 15,
      hyogo_ono: 12,
      hyogo_shiso: 25,
      hyogo_kato: 15,
      hyogo_inagawa: 12,
      hyogo_inami: 8,
      hyogo_fukusaki: 10,
      hyogo_kamikawa: 15,
      nara_tenri: 12,
      nara_kashihara: 10,
      nara_gojo: 20,
      nara_gose: 12,
      nara_ikoma: 10,
      nara_ikaruga: 8,
      nara_ando: 6,
      nara_kawanishi_nr: 8,
      nara_tawaramoto: 8,
      nara_oji: 6,
      nara_koryo: 8,
      nara_asuka: 8,
      nara_totsukawa: 30,
      nara_shimoichi: 12,
      wakayama_hashimoto: 15,
      wakayama_inami_wk: 12,
      // 中国・四国
      tottori_nichinan: 15,
      tottori_sakaiminato: 10,
      shimane_masuda: 20,
      shimane_ama: 15,
      okayama_okayama: 25,
      okayama_akaiwa: 15,
      okayama_mimasaka: 20,
      okayama_hayashima: 6,
      hiroshima_fuchu: 15,
      hiroshima_otake: 12,
      hiroshima_higashihiroshima: 20,
      yamaguchi_hikari: 12,
      tokushima_tokushima: 15,
      tokushima_naka: 25,
      tokushima_higashimiyoshi: 15,
      kagawa_takamatsu: 20,
      kagawa_sanuki: 15,
      kagawa_mitoyo: 15,
      kagawa_tonosho: 12,
      ehime_seiyo: 20,
      ehime_tobe: 12,
      kochi_muroto: 20,
      // 九州・沖縄
      fukuoka_fukutsu: 12,
      fukuoka_shingu_fk: 10,
      fukuoka_hirokawa: 10,
      fukuoka_kawara: 12,
      nagasaki_tsushima: 30,
      nagasaki_iki: 15,
      nagasaki_saikai: 20,
      nagasaki_togitsu: 8,
      nagasaki_higashisonogi: 12,
      kumamoto_takamori: 15,
      oita_hita: 25,
      oita_taketa: 25,
      oita_kitsuki: 15,
      oita_kusu: 15,
      miyazaki_miyazaki: 25,
      miyazaki_nichinan: 20,
      miyazaki_kijo: 12,
      miyazaki_kadogawa: 10,
      miyazaki_miyakojima: 25,
      kagoshima_satsumasendai: 25,
      kagoshima_minamikyushu: 20,
      kagoshima_satsuma: 15,
      kagoshima_kimotsuki: 15,
      okinawa_yomitan: 10,
      okinawa_kitanakagusuku: 8,
      okinawa_ie: 8,
    };
    return overrides[key] || 10;
  }

  function sanitizeWardPoint(point, sourceOrCenter, maxKmOverride) {
    if (!point) return null;
    const lat = Number(point.lat);
    const lng = Number(point.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const normalized = { lat, lng, address: sanitizeAddressText(point.address || "") };
    if (!isLikelyLocalPoint(normalized)) return null;
    const center = sourceOrCenter?.center || sourceOrCenter || null;
    if (center) {
      const maxKm = Number(maxKmOverride || getWardGeoMaxKm(sourceOrCenter?.key));
      if (!isNearWardCenter(normalized, center, maxKm)) return null;
    }
    return normalized;
  }

  function isGenericMunicipalityGeocode(point) {
    if (!point || !point.address) return false;
    const addr = String(point.address).trim();
    // 全国対応: 都道府県+自治体名のみ（番地等なし）の結果を除外
    // 東京都の区市
    if (/^東京都[^\s\d丁番号区市]+[区市]$/.test(addr)) return true;
    // 北海道/XX府/XX県 + 市町村のみ
    if (/^(?:北海道|(?:京都|大阪)府|.+?県)[^\s\d丁番号市町村]+[市町村]$/.test(addr)) return true;
    return false;
  }

  async function geocodeForWard(candidates, sourceOrCenter, maxKmOverride) {
    for (const q of candidates || []) {
      const point = await geocodeQuery(q);
      if (isGenericMunicipalityGeocode(point)) continue;
      const ok = sanitizeWardPoint(point, sourceOrCenter, maxKmOverride);
      if (ok) return ok;
    }
    return null;
  }

  return {
    geocodeForWard,
    geocodeQuery,
    haversineKm,
    sanitizeWardPoint,
  };
}

function loadGeoCache(filePath, targetMap) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const entries = JSON.parse(raw);
    for (const [k, v] of entries) targetMap.set(k, v);
    console.log(`[geo] loaded ${targetMap.size} entries from cache`);
  } catch { /* first run */ }
}

function saveGeoCache(filePath, sourceMap) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify([...sourceMap]), "utf8");
  } catch (e) {
    console.warn("[geo] cache save failed:", e.message || e);
  }
}

module.exports = {
  createGeoHelpers,
  loadGeoCache,
  saveGeoCache,
};
