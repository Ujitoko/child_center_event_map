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
  CHOFU_SOURCE,
  MUSASHINO_SOURCE,
  TACHIKAWA_SOURCE,
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
    collectMusashinoEvents,
    collectTachikawaEvents,
    collectAkishimaEvents,
    collectHigashiyamatoEvents,
    collectKiyoseEvents,
    collectTamaEvents,
    collectInagiEvents,
    collectHinoEvents,
    collectKokubunjiEvents,
    collectHigashikurumeEvents,
    collectMitakaEvents,
    collectKodairaEvents,
    collectHigashimurayamaEvents,
    collectKunitachiEvents,
    collectOmeEvents,
    collectHamuraEvents,
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

  const [setagaya, ota, shinagawa, meguro, shibuya, minato, chiyoda, additional, hachioji, musashino, tachikawa, akishima, higashiyamato, kiyose, tama, inagi, hino, kokubunji, higashikurume, mitaka, kodaira, higashimurayama, kunitachi, ome, hamura] = await Promise.all([
    collectSetagayaJidokanEvents(days),
    collectOtaJidokanEvents(days),
    collectShinagawaJidokanEvents(days),
    collectMeguroJidokanEvents(days),
    collectShibuyaJidokanEvents(days),
    collectMinatoJidokanEvents(days),
    collectChiyodaJidokanEvents(days),
    collectAdditionalWardsEvents(days),
    collectHachiojiEvents(days),
    collectMusashinoEvents(days),
    collectTachikawaEvents(days),
    collectAkishimaEvents(days),
    collectHigashiyamatoEvents(days),
    collectKiyoseEvents(days),
    collectTamaEvents(days),
    collectInagiEvents(days),
    collectHinoEvents(days),
    collectKokubunjiEvents(days),
    collectHigashikurumeEvents(days),
    collectMitakaEvents(days),
    collectKodairaEvents(days),
    collectHigashimurayamaEvents(days),
    collectKunitachiEvents(days),
    collectOmeEvents(days),
    collectHamuraEvents(days),
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
    chofu,
    fuchu,
    koganei,
    nishitokyo,
    machida,
    fussa,
    musashimurayama,
    akiruno,
    komae,
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
    ...chofu,
    ...hachioji,
    ...musashino,
    ...tachikawa,
    ...akishima,
    ...higashiyamato,
    ...kiyose,
    ...tama,
    ...inagi,
    ...hino,
    ...kokubunji,
    ...higashikurume,
    ...fuchu,
    ...koganei,
    ...nishitokyo,
    ...machida,
    ...fussa,
    ...musashimurayama,
    ...akiruno,
    ...komae,
    ...mitaka,
    ...kodaira,
    ...higashimurayama,
    ...kunitachi,
    ...ome,
    ...hamura,
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
        city_chofu: chofu.length,
        city_hachioji: hachioji.length,
        city_musashino: musashino.length,
        city_tachikawa: tachikawa.length,
        city_akishima: akishima.length,
        city_higashiyamato: higashiyamato.length,
        city_kiyose: kiyose.length,
        city_tama: tama.length,
        city_inagi: inagi.length,
        city_hino: hino.length,
        city_kokubunji: kokubunji.length,
        city_higashikurume: higashikurume.length,
        city_fuchu: fuchu.length,
        city_koganei: koganei.length,
        city_nishitokyo: nishitokyo.length,
        city_machida: machida.length,
        city_fussa: fussa.length,
        city_musashimurayama: musashimurayama.length,
        city_akiruno: akiruno.length,
        city_komae: komae.length,
        city_mitaka: mitaka.length,
        city_kodaira: kodaira.length,
        city_higashimurayama: higashimurayama.length,
        city_kunitachi: kunitachi.length,
        city_ome: ome.length,
        city_hamura: hamura.length,
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
        city_chofu: chofu.length,
        city_hachioji: hachioji.length,
        city_musashino: musashino.length,
        city_tachikawa: tachikawa.length,
        city_akishima: akishima.length,
        city_higashiyamato: higashiyamato.length,
        city_kiyose: kiyose.length,
        city_tama: tama.length,
        city_inagi: inagi.length,
        city_hino: hino.length,
        city_kokubunji: kokubunji.length,
        city_higashikurume: higashikurume.length,
        city_fuchu: fuchu.length,
        city_koganei: koganei.length,
        city_nishitokyo: nishitokyo.length,
        city_machida: machida.length,
        city_fussa: fussa.length,
        city_musashimurayama: musashimurayama.length,
        city_akiruno: akiruno.length,
        city_komae: komae.length,
        city_mitaka: mitaka.length,
        city_kodaira: kodaira.length,
        city_higashimurayama: higashimurayama.length,
        city_kunitachi: kunitachi.length,
        city_ome: ome.length,
        city_hamura: hamura.length,
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
        CHOFU_SOURCE.label,
        MUSASHINO_SOURCE.label,
        TACHIKAWA_SOURCE.label,
        AKISHIMA_SOURCE.label,
        HIGASHIYAMATO_SOURCE.label,
        KIYOSE_SOURCE.label,
        TAMA_SOURCE.label,
        INAGI_SOURCE.label,
        HINO_SOURCE.label,
        KOKUBUNJI_SOURCE.label,
        HIGASHIKURUME_SOURCE.label,
        FUCHU_SOURCE.label,
        KOGANEI_SOURCE.label,
        NISHITOKYO_SOURCE.label,
        MACHIDA_SOURCE.label,
        FUSSA_SOURCE.label,
        MUSASHIMURAYAMA_SOURCE.label,
        AKIRUNO_SOURCE.label,
        KOMAE_SOURCE.label,
        MITAKA_SOURCE.label,
        KODAIRA_SOURCE.label,
        HIGASHIMURAYAMA_SOURCE.label,
        KUNITACHI_SOURCE.label,
        OME_SOURCE.label,
        HAMURA_SOURCE.label,
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
