function createCollectAdditionalWardsEvents(deps) {
  const {
    ADACHI_SOURCE,
    ARAKAWA_SOURCE,
    BUNKYO_SOURCE,
    CHUO_SOURCE,
    EDOGAWA_SOURCE,
    ITABASHI_SOURCE,
    KATSUSHIKA_SOURCE,
    KOTO_SOURCE,
    NAKANO_SOURCE,
    NERIMA_SOURCE,
    SHINJUKU_SOURCE,
    SUGINAMI_SOURCE,
    SUMIDA_SOURCE,
    TAITO_SOURCE,
    TOSHIMA_SOURCE,
    WARD_CHILD_HINT_RE,
    WARD_EVENT_WORD_RE,
    buildAdditionalWardConfigs,
    buildListCalendarUrl,
    collectChuoAkachanTengokuEvents,
    collectKitaJidokanEvents,
    collectWardGenericEvents,
    fetchText,
    getDaysInMonth,
    normalizeText,
  } = deps;

  async function fetchBunkyoJidokanSeedUrls() {
  const seeds = [
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/honkomagomeminami/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/yanagimachi/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/hisakata/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/hakusanhigashi/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/sengoku/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/sengokunishi/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/suidou/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/kohinatadaimachi/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/ootuka/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/mejirodai/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/mejirodai2/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/yushima/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/hongou/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/nezu/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/shiomi/index.html`,
    `${BUNKYO_SOURCE.baseUrl}/kosodatekyouiku/ibashozukuri/jidoukan/honkomagome/index.html`,
  ];
  try {
    const xml = await fetchText(`${BUNKYO_SOURCE.baseUrl}/sitemap.xml`);
    const re = /<loc>(https:\/\/www\.city\.bunkyo\.lg\.jp\/(?:kosodatekyouiku\/ibashozukuri\/jidoukan\/[^<]+|b050\/p\d+\.html))<\/loc>/gi;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const u = normalizeText(m[1]);
      if (!u) continue;
      seeds.push(u);
    }
  } catch {
    // keep static seeds
  }
  return Array.from(new Set(seeds.map((u) => normalizeText(u)).filter(Boolean))).slice(0, 220);
}

async function collectAdditionalWardsEvents(maxDays) {
  const configs = buildAdditionalWardConfigs({
    ADACHI_SOURCE,
    ARAKAWA_SOURCE,
    BUNKYO_SOURCE,
    CHUO_SOURCE,
    EDOGAWA_SOURCE,
    ITABASHI_SOURCE,
    KATSUSHIKA_SOURCE,
    KOTO_SOURCE,
    NAKANO_SOURCE,
    NERIMA_SOURCE,
    SHINJUKU_SOURCE,
    SUGINAMI_SOURCE,
    SUMIDA_SOURCE,
    TAITO_SOURCE,
    TOSHIMA_SOURCE,
    WARD_CHILD_HINT_RE,
    WARD_EVENT_WORD_RE,
    buildListCalendarUrl,
    fetchBunkyoJidokanSeedUrls,
    getDaysInMonth,
  });
  const [
    chuoBase,
    chuoAkachan,
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
  ] = await Promise.all([
    collectWardGenericEvents(configs.chuo.source, maxDays, configs.chuo),
    collectChuoAkachanTengokuEvents(maxDays),
    collectWardGenericEvents(configs.bunkyo.source, maxDays, configs.bunkyo),
    collectWardGenericEvents(configs.taito.source, maxDays, configs.taito),
    collectWardGenericEvents(configs.sumida.source, maxDays, configs.sumida),
    collectWardGenericEvents(configs.koto.source, maxDays, configs.koto),
    collectWardGenericEvents(configs.nakano.source, maxDays, configs.nakano),
    collectWardGenericEvents(configs.suginami.source, maxDays, configs.suginami),
    collectWardGenericEvents(configs.toshima.source, maxDays, configs.toshima),
    collectKitaJidokanEvents(maxDays),
    collectWardGenericEvents(configs.arakawa.source, maxDays, configs.arakawa),
    collectWardGenericEvents(configs.itabashi.source, maxDays, configs.itabashi),
    collectWardGenericEvents(configs.nerima.source, maxDays, configs.nerima),
    collectWardGenericEvents(configs.adachi.source, maxDays, configs.adachi),
    collectWardGenericEvents(configs.katsushika.source, maxDays, configs.katsushika),
    collectWardGenericEvents(configs.edogawa.source, maxDays, configs.edogawa),
    collectWardGenericEvents(configs.shinjuku.source, maxDays, configs.shinjuku),
  ]);

  const chuo = [];
  const seenChuo = new Set();
  for (const ev of [...chuoBase, ...chuoAkachan]) {
    const k = `${ev.url}|${ev.title}|${ev.starts_at}`;
    if (seenChuo.has(k)) continue;
    seenChuo.add(k);
    chuo.push(ev);
  }
  chuo.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return {
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
  };
}

  return collectAdditionalWardsEvents;
}

module.exports = {
  createCollectAdditionalWardsEvents,
};


