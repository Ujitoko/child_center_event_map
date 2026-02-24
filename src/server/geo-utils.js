const fs = require("fs");
const path = require("path");
const { normalizeText } = require("./text-utils");
const { sanitizeAddressText } = require("./text-utils");

function createGeoHelpers(deps) {
  const geoCache = deps?.geoCache instanceof Map ? deps.geoCache : new Map();

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
      const top = data[0] || {};
      const c = top?.geometry?.coordinates;
      if (!Array.isArray(c) || c.length < 2) {
        geoCache.set(q, null);
        return null;
      }
      const point = {
        lat: Number(c[1]),
        lng: Number(c[0]),
        address: sanitizeAddressText(top?.properties?.title || top?.properties?.address || ""),
      };
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

  function isLikelyLocalPoint(point) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;
    // 東京都 + 神奈川県 + 千葉県 + 埼玉県 + 群馬県 + 栃木県 + 茨城県全域をカバー
    // (南: 湯河原町 35.14, 北: 北茨城市 36.87/那須町 37.12, 西: 嬬恋村 138.48, 東: 神栖市 140.87)
    return point.lat >= 34.9 && point.lat <= 37.2 && point.lng >= 138.4 && point.lng <= 140.9;
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
    // 東京都の区市のみ (「東京都世田谷区」のような市区単位の結果を除外)
    if (/^東京都[^\s\d丁番号区市]+[区市]$/.test(addr)) return true;
    // 神奈川/埼玉/千葉/群馬/栃木の自治体単位のみ除外
    // [^\s\d丁番号市町村] で市町村文字を除外し、「XX市YY町」のような町域結果を誤って除外しない
    if (/^神奈川県[^\s\d丁番号市町村]+[市町村]$/.test(addr)) return true;
    if (/^埼玉県[^\s\d丁番号市町村]+[市町村]$/.test(addr)) return true;
    if (/^千葉県[^\s\d丁番号市町村]+[市町村]$/.test(addr)) return true;
    if (/^群馬県[^\s\d丁番号市町村]+[市町村]$/.test(addr)) return true;
    if (/^栃木県[^\s\d丁番号市町村]+[市町村]$/.test(addr)) return true;
    if (/^茨城県[^\s\d丁番号市町村]+[市町村]$/.test(addr)) return true;
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
