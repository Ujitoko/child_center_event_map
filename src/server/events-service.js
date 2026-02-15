const fs = require("fs");
const { parseYmdFromJst } = require("./date-utils");
const { saveGeoCache } = require("./geo-utils");
const {
  SETAGAYA_SOURCE,
  OTA_SOURCE,
  SHINAGAWA_SOURCE,
  MEGURO_SOURCE,
  SHIBUYA_SOURCE,
  MINATO_SOURCE,
  CHIYODA_SOURCE,
  CHUO_SOURCE,
  BUNKYO_SOURCE,
  TAITO_SOURCE,
  SUMIDA_SOURCE,
  KOTO_SOURCE,
  NAKANO_SOURCE,
  SUGINAMI_SOURCE,
  TOSHIMA_SOURCE,
  KITA_SOURCE,
  ARAKAWA_SOURCE,
  ITABASHI_SOURCE,
  NERIMA_SOURCE,
  ADACHI_SOURCE,
  KATSUSHIKA_SOURCE,
  EDOGAWA_SOURCE,
  SHINJUKU_SOURCE,
  HACHIOJI_SOURCE,
} = require("../config/wards");

function loadSnapshot(snapshotPath) {
  try {
    const raw = fs.readFileSync(snapshotPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSnapshot(snapshotPath, data) {
  try {
    const dir = require("path").dirname(snapshotPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(data), "utf8");
  } catch (e) {
    console.warn("[snapshot] save failed:", e.message || e);
  }
}

function createGetEvents(deps) {
  const {
    CACHE_TTL_MS,
    cache,
    snapshotPath,
    geoCache,
    geoCachePath,
    collectAdditionalWardsEvents,
    collectChiyodaJidokanEvents,
    collectMeguroJidokanEvents,
    collectMinatoJidokanEvents,
    collectOtaJidokanEvents,
    collectSetagayaJidokanEvents,
    collectShibuyaJidokanEvents,
    collectShinagawaJidokanEvents,
    collectHachiojiEvents,
  } = deps;

  return async function getEvents(maxDays, refresh) {
  const days = Math.min(Math.max(Number(maxDays) || 30, 1), 90);
  const cacheKey = `jidokan:${days}`;

  // Normal user access: return cached data only, never scrape
  if (!refresh) {
    if (cache.data && cache.key === cacheKey) {
      return {
        ...cache.data,
        from_cache: true,
        snapshot_saved_at: new Date(cache.savedAt).toISOString(),
      };
    }
    if (snapshotPath) {
      const snapshot = loadSnapshot(snapshotPath);
      if (snapshot) {
        cache.key = cacheKey;
        cache.data = snapshot;
        cache.savedAt = Date.now();
        console.log("[snapshot] loaded from disk:", snapshotPath);
        return {
          ...snapshot,
          from_cache: true,
          snapshot_saved_at: new Date(cache.savedAt).toISOString(),
        };
      }
    }
    return {
      date_jst: "",
      count: 0,
      source: "tokyo_jidokan",
      items: [],
      debug_counts: { raw: {}, filtered: {}, implemented_wards: [] },
      from_cache: true,
      snapshot_saved_at: null,
    };
  }

  // refresh=1 (cron only): actually scrape

  const [setagaya, ota, shinagawa, meguro, shibuya, minato, chiyoda, additional, hachioji] = await Promise.all([
    collectSetagayaJidokanEvents(days),
    collectOtaJidokanEvents(days),
    collectShinagawaJidokanEvents(days),
    collectMeguroJidokanEvents(days),
    collectShibuyaJidokanEvents(days),
    collectMinatoJidokanEvents(days),
    collectChiyodaJidokanEvents(days),
    collectAdditionalWardsEvents(days),
    collectHachiojiEvents(days),
  ]);
  const {
    chuo,
    bunkyo,
    taito,
    sumida,
    koto,
    nakano,
    suginami,
    toshima,
    kita,
    arakawa,
    itabashi,
    nerima,
    adachi,
    katsushika,
    edogawa,
    shinjuku,
  } = additional;
  const rawItems = [
    ...setagaya,
    ...ota,
    ...shinagawa,
    ...meguro,
    ...shibuya,
    ...minato,
    ...chiyoda,
    ...chuo,
    ...bunkyo,
    ...taito,
    ...sumida,
    ...koto,
    ...nakano,
    ...suginami,
    ...toshima,
    ...kita,
    ...arakawa,
    ...itabashi,
    ...nerima,
    ...adachi,
    ...katsushika,
    ...edogawa,
    ...shinjuku,
    ...hachioji,
  ];
  const items = rawItems
    .map((ev) => {
      if (typeof ev.time_unknown === "boolean") return ev;
      let inferredUnknown = false;
      if (!ev.ends_at && ev.starts_at) {
        const d = new Date(ev.starts_at);
        if (!Number.isNaN(d.getTime())) {
          const hm = new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(d);
          inferredUnknown = hm === "00:00";
        }
      }
      return { ...ev, time_unknown: inferredUnknown };
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const now = parseYmdFromJst(new Date());
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + days);
  const endJst = parseYmdFromJst(end);

  const payload = {
    date_jst: `${now.key}..${endJst.key}`,
    count: items.length,
    source: "tokyo_jidokan",
    debug_counts: {
      raw: {
        ward_setagaya: setagaya.length,
        ward_ota: ota.length,
        ward_shinagawa: shinagawa.length,
        ward_meguro: meguro.length,
        ward_shibuya: shibuya.length,
        ward_minato: minato.length,
        ward_chiyoda: chiyoda.length,
        ward_chuo: chuo.length,
        ward_bunkyo: bunkyo.length,
        ward_taito: taito.length,
        ward_sumida: sumida.length,
        ward_koto: koto.length,
        ward_nakano: nakano.length,
        ward_suginami: suginami.length,
        ward_toshima: toshima.length,
        ward_kita: kita.length,
        ward_arakawa: arakawa.length,
        ward_itabashi: itabashi.length,
        ward_nerima: nerima.length,
        ward_adachi: adachi.length,
        ward_katsushika: katsushika.length,
        ward_edogawa: edogawa.length,
        ward_shinjuku: shinjuku.length,
        city_hachioji: hachioji.length,
      },
      filtered: {
        ward_setagaya: setagaya.length,
        ward_ota: ota.length,
        ward_shinagawa: shinagawa.length,
        ward_meguro: meguro.length,
        ward_shibuya: shibuya.length,
        ward_minato: minato.length,
        ward_chiyoda: chiyoda.length,
        ward_chuo: chuo.length,
        ward_bunkyo: bunkyo.length,
        ward_taito: taito.length,
        ward_sumida: sumida.length,
        ward_koto: koto.length,
        ward_nakano: nakano.length,
        ward_suginami: suginami.length,
        ward_toshima: toshima.length,
        ward_kita: kita.length,
        ward_arakawa: arakawa.length,
        ward_itabashi: itabashi.length,
        ward_nerima: nerima.length,
        ward_adachi: adachi.length,
        ward_katsushika: katsushika.length,
        ward_edogawa: edogawa.length,
        ward_shinjuku: shinjuku.length,
        city_hachioji: hachioji.length,
      },
      implemented_wards: [
        SETAGAYA_SOURCE.label,
        OTA_SOURCE.label,
        SHINAGAWA_SOURCE.label,
        MEGURO_SOURCE.label,
        SHIBUYA_SOURCE.label,
        MINATO_SOURCE.label,
        CHIYODA_SOURCE.label,
        CHUO_SOURCE.label,
        BUNKYO_SOURCE.label,
        TAITO_SOURCE.label,
        SUMIDA_SOURCE.label,
        KOTO_SOURCE.label,
        NAKANO_SOURCE.label,
        SUGINAMI_SOURCE.label,
        TOSHIMA_SOURCE.label,
        KITA_SOURCE.label,
        ARAKAWA_SOURCE.label,
        ITABASHI_SOURCE.label,
        NERIMA_SOURCE.label,
        ADACHI_SOURCE.label,
        KATSUSHIKA_SOURCE.label,
        EDOGAWA_SOURCE.label,
        SHINJUKU_SOURCE.label,
        HACHIOJI_SOURCE.label,
      ],
    },
    items,
    refresh_in_progress: false,
  };

  cache.key = cacheKey;
  cache.data = payload;
  cache.savedAt = Date.now();

  if (snapshotPath) saveSnapshot(snapshotPath, payload);
  if (geoCachePath && geoCache) saveGeoCache(geoCachePath, geoCache);

  return {
    ...payload,
    from_cache: false,
    snapshot_saved_at: new Date(cache.savedAt).toISOString(),
  };
};
}

module.exports = {
  createGetEvents,
};
