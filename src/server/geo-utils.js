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
    // 東京都 + 神奈川県 + 千葉県 + 埼玉県全域をカバー (湯河原町 35.14 ～ 本庄市 36.25)
    return point.lat >= 34.9 && point.lat <= 36.3 && point.lng >= 139.0 && point.lng <= 140.9;
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
    // 神奈川県の市町村のみ (「神奈川県鎌倉市」「神奈川県中郡二宮町」のような自治体単位の結果を除外)
    if (/^神奈川県[^\s\d丁番号]+[市町村]$/.test(addr)) return true;
    // 埼玉県の市町村のみ
    if (/^埼玉県[^\s\d丁番号]+[市町村]$/.test(addr)) return true;
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
