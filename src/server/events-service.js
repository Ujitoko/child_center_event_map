function createGetEvents(deps) {
  const {
    CACHE_TTL_MS,
    cache,
    collectAdditionalWardsEvents,
    collectChiyodaJidokanEvents,
    collectMeguroJidokanEvents,
    collectMinatoJidokanEvents,
    collectOtaJidokanEvents,
    collectSetagayaJidokanEvents,
    collectShibuyaJidokanEvents,
    collectShinagawaJidokanEvents,
  } = deps;

  return async function getEvents(maxDays, refresh) {
  const days = Math.min(Math.max(Number(maxDays) || 30, 1), 90);
  const cacheKey = `jidokan:${days}`;
  const isFresh = cache.data && cache.key === cacheKey && Date.now() - cache.savedAt < CACHE_TTL_MS;
  if (!refresh && isFresh) {
    return {
      ...cache.data,
      from_cache: true,
      snapshot_saved_at: new Date(cache.savedAt).toISOString(),
    };
  }

  const [setagaya, ota, shinagawa, meguro, shibuya, minato, chiyoda, additional] = await Promise.all([
    collectSetagayaJidokanEvents(days),
    collectOtaJidokanEvents(days),
    collectShinagawaJidokanEvents(days),
    collectMeguroJidokanEvents(days),
    collectShibuyaJidokanEvents(days),
    collectMinatoJidokanEvents(days),
    collectChiyodaJidokanEvents(days),
    collectAdditionalWardsEvents(days),
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
      ],
    },
    items,
    refresh_in_progress: false,
  };

  cache = {
    key: cacheKey,
    data: payload,
    savedAt: Date.now(),
  };

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


