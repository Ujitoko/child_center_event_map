const { normalizeText } = require("../text-utils");
const { fetchText } = require("../fetch-utils");
const { BUNKYO_SOURCE } = require("../../config/wards");
const { buildAdditionalWardConfigs } = require("../../config/additional-ward-configs");

function createCollectAdditionalWardsEvents(deps) {
  const {
    collectChuoAkachanTengokuEvents,
    collectKitaJidokanEvents,
    collectWardGenericEvents,
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
  } catch (e) {
    console.warn("[additional-wards] bunkyo sitemap fetch failed:", e.message || e);
  }
  return Array.from(new Set(seeds.map((u) => normalizeText(u)).filter(Boolean))).slice(0, 220);
}

async function collectAdditionalWardsEvents(maxDays) {
  const configs = buildAdditionalWardConfigs({
    fetchBunkyoJidokanSeedUrls,
  });
  const BATCH = 5;
  const fns = [
    () => collectWardGenericEvents(configs.chuo.source, maxDays, configs.chuo),
    () => collectChuoAkachanTengokuEvents(maxDays),
    () => collectWardGenericEvents(configs.bunkyo.source, maxDays, configs.bunkyo),
    () => collectWardGenericEvents(configs.taito.source, maxDays, configs.taito),
    () => collectWardGenericEvents(configs.sumida.source, maxDays, configs.sumida),
    () => collectWardGenericEvents(configs.koto.source, maxDays, configs.koto),
    () => collectWardGenericEvents(configs.nakano.source, maxDays, configs.nakano),
    () => collectWardGenericEvents(configs.suginami.source, maxDays, configs.suginami),
    () => collectWardGenericEvents(configs.toshima.source, maxDays, configs.toshima),
    () => collectKitaJidokanEvents(maxDays),
    () => collectWardGenericEvents(configs.arakawa.source, maxDays, configs.arakawa),
    () => collectWardGenericEvents(configs.itabashi.source, maxDays, configs.itabashi),
    () => collectWardGenericEvents(configs.nerima.source, maxDays, configs.nerima),
    () => collectWardGenericEvents(configs.adachi.source, maxDays, configs.adachi),
    () => collectWardGenericEvents(configs.katsushika.source, maxDays, configs.katsushika),
    () => collectWardGenericEvents(configs.edogawa.source, maxDays, configs.edogawa),
    () => collectWardGenericEvents(configs.shinjuku.source, maxDays, configs.shinjuku),
    () => collectWardGenericEvents(configs.chofu.source, maxDays, configs.chofu),
    () => collectWardGenericEvents(configs.fuchu.source, maxDays, configs.fuchu),
    () => collectWardGenericEvents(configs.koganei.source, maxDays, configs.koganei),
    () => collectWardGenericEvents(configs.nishitokyo.source, maxDays, configs.nishitokyo),
    () => collectWardGenericEvents(configs.machida.source, maxDays, configs.machida),
    () => collectWardGenericEvents(configs.fussa.source, maxDays, configs.fussa),
    () => collectWardGenericEvents(configs.musashimurayama.source, maxDays, configs.musashimurayama),
    () => collectWardGenericEvents(configs.akiruno.source, maxDays, configs.akiruno),
    () => collectWardGenericEvents(configs.komae.source, maxDays, configs.komae),
  ];
  const allResults = [];
  for (let i = 0; i < fns.length; i += BATCH) {
    const batch = await Promise.all(fns.slice(i, i + BATCH).map(f => f()));
    allResults.push(...batch);
  }
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
    chofu,
    fuchu,
    koganei,
    nishitokyo,
    machida,
    fussa,
    musashimurayama,
    akiruno,
    komae,
  ] = allResults;

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
    chofu,
    fuchu,
    koganei,
    nishitokyo,
    machida,
    fussa,
    musashimurayama,
    akiruno,
    komae,
  };
}

  return collectAdditionalWardsEvents;
}

module.exports = {
  createCollectAdditionalWardsEvents,
};
