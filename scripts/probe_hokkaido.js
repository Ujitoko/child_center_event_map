#!/usr/bin/env node
/**
 * 北海道 全自治体 CMS自動probe
 */

const HOKKAIDO = [
  // 北海道 (179市町村 - 主要+中規模)
  { pref: "北海道", key: "hokkaido_sapporo", label: "札幌市", domain: "www.city.sapporo.jp" },
  { pref: "北海道", key: "hokkaido_asahikawa", label: "旭川市", domain: "www.city.asahikawa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_hakodate", label: "函館市", domain: "www.city.hakodate.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_otaru", label: "小樽市", domain: "www.city.otaru.lg.jp" },
  { pref: "北海道", key: "hokkaido_obihiro", label: "帯広市", domain: "www.city.obihiro.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_kushiro", label: "釧路市", domain: "www.city.kushiro.lg.jp" },
  { pref: "北海道", key: "hokkaido_kitami", label: "北見市", domain: "www.city.kitami.lg.jp" },
  { pref: "北海道", key: "hokkaido_iwamizawa", label: "岩見沢市", domain: "www.city.iwamizawa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_abashiri", label: "網走市", domain: "www.city.abashiri.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_rumoi", label: "留萌市", domain: "www.e-rumoi.jp" },
  { pref: "北海道", key: "hokkaido_tomakomai", label: "苫小牧市", domain: "www.city.tomakomai.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_wakkanai", label: "稚内市", domain: "www.city.wakkanai.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_bibai", label: "美唄市", domain: "www.city.bibai.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_ashibetsu", label: "芦別市", domain: "www.city.ashibetsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_ebetsu", label: "江別市", domain: "www.city.ebetsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_akabira", label: "赤平市", domain: "www.city.akabira.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_monbetsu", label: "紋別市", domain: "www.city.monbetsu.lg.jp" },
  { pref: "北海道", key: "hokkaido_shibetsu", label: "士別市", domain: "www.city.shibetsu.lg.jp" },
  { pref: "北海道", key: "hokkaido_nayoro", label: "名寄市", domain: "www.city.nayoro.lg.jp" },
  { pref: "北海道", key: "hokkaido_mikasa", label: "三笠市", domain: "www.city.mikasa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_nemuro", label: "根室市", domain: "www.city.nemuro.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_chitose", label: "千歳市", domain: "www.city.chitose.lg.jp" },
  { pref: "北海道", key: "hokkaido_takikawa", label: "滝川市", domain: "www.city.takikawa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_sunagawa", label: "砂川市", domain: "www.city.sunagawa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_utashinai", label: "歌志内市", domain: "www.city.utashinai.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_fukagawa", label: "深川市", domain: "www.city.fukagawa.lg.jp" },
  { pref: "北海道", key: "hokkaido_furano", label: "富良野市", domain: "www.city.furano.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_eniwa", label: "恵庭市", domain: "www.city.eniwa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_date", label: "伊達市", domain: "www.city.date.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_kitahiroshima", label: "北広島市", domain: "www.city.kitahiroshima.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_ishikari", label: "石狩市", domain: "www.city.ishikari.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_hokuto", label: "北斗市", domain: "www.city.hokuto.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_muroran", label: "室蘭市", domain: "www.city.muroran.lg.jp" },
  { pref: "北海道", key: "hokkaido_noboribetsu", label: "登別市", domain: "www.city.noboribetsu.lg.jp" },
  { pref: "北海道", key: "hokkaido_eniwa2", skip: true },
  // 主要町村
  { pref: "北海道", key: "hokkaido_nanporo", label: "南幌町", domain: "www.town.nanporo.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_naganuma", label: "長沼町", domain: "www.maoi-net.jp" },
  { pref: "北海道", key: "hokkaido_kuriyama", label: "栗山町", domain: "www.town.kuriyama.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_tsukigata", label: "月形町", domain: "www.town.tsukigata.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_tobetsu", label: "当別町", domain: "www.town.tobetsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_shinshinotsu", label: "新篠津村", domain: "www.vill.shinshinotsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_matsumae", label: "松前町", domain: "www.town.matsumae.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_shikabe", label: "鹿部町", domain: "www.town.shikabe.lg.jp" },
  { pref: "北海道", key: "hokkaido_mori", label: "森町", domain: "www.town.hokkaido-mori.lg.jp" },
  { pref: "北海道", key: "hokkaido_yakumo", label: "八雲町", domain: "www.town.yakumo.lg.jp" },
  { pref: "北海道", key: "hokkaido_oshamambe", label: "長万部町", domain: "www.town.oshamambe.lg.jp" },
  { pref: "北海道", key: "hokkaido_niseko", label: "ニセコ町", domain: "www.town.niseko.lg.jp" },
  { pref: "北海道", key: "hokkaido_kimobetsu", label: "喜茂別町", domain: "www.town.kimobetsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_kutchan", label: "倶知安町", domain: "www.town.kutchan.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_iwanai", label: "岩内町", domain: "www.town.iwanai.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_shakotan", label: "積丹町", domain: "www.town.shakotan.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_yoichi", label: "余市町", domain: "www.town.yoichi.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_niki", label: "仁木町", domain: "www.town.niki.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_toyoura", label: "豊浦町", domain: "www.town.toyoura.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_sobetsu", label: "壮瞥町", domain: "www.town.sobetsu.lg.jp" },
  { pref: "北海道", key: "hokkaido_shiraoi", label: "白老町", domain: "www.town.shiraoi.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_atsuma", label: "厚真町", domain: "www.town.atsuma.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_mukawa", label: "むかわ町", domain: "www.town.mukawa.lg.jp" },
  { pref: "北海道", key: "hokkaido_hidaka", label: "日高町", domain: "www.town.hidaka.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_shinhidaka", label: "新ひだか町", domain: "www.shinhidaka.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_urakawa", label: "浦河町", domain: "www.town.urakawa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_samani", label: "様似町", domain: "www.samani.jp" },
  { pref: "北海道", key: "hokkaido_erimo", label: "えりも町", domain: "www.town.erimo.lg.jp" },
  { pref: "北海道", key: "hokkaido_obira", label: "小平町", domain: "www.town.obira.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_mashike", label: "増毛町", domain: "www.town.mashike.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_haboro", label: "羽幌町", domain: "www.town.haboro.lg.jp" },
  { pref: "北海道", key: "hokkaido_teshio", label: "天塩町", domain: "www.teshiotown.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_horonobe", label: "幌延町", domain: "www.town.horonobe.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_sarufutsu", label: "猿払村", domain: "www.vill.sarufutsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_hamatonbetsu", label: "浜頓別町", domain: "www.town.hamatonbetsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_esashi_hk", label: "枝幸町", domain: "www.town.esashi.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_toyotomi", label: "豊富町", domain: "www.town.toyotomi.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_rebun", label: "礼文町", domain: "www.town.rebun.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_rishiri", label: "利尻町", domain: "www.town.rishiri.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_takasu", label: "鷹栖町", domain: "www.town.takasu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_higashikagura", label: "東神楽町", domain: "www.town.higashikagura.lg.jp" },
  { pref: "北海道", key: "hokkaido_kamikawa_hk", label: "上川町", domain: "www.town.kamikawa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_biei", label: "美瑛町", domain: "town.biei.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_kamifurano", label: "上富良野町", domain: "www.town.kamifurano.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_nakafurano", label: "中富良野町", domain: "www.town.nakafurano.lg.jp" },
  { pref: "北海道", key: "hokkaido_minamifurano", label: "南富良野町", domain: "www.town.minamifurano.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_shimokawa", label: "下川町", domain: "www.town.shimokawa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_otoineppu", label: "音威子府村", domain: "www.vill.otoineppu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_nakagawa_hk", label: "中川町", domain: "www.town.nakagawa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_wassamu", label: "和寒町", domain: "www.town.wassamu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_kenbuchi", label: "剣淵町", domain: "www.town.kembuchi.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_pippu", label: "比布町", domain: "www.town.pippu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_aibetsu", label: "愛別町", domain: "www.town.aibetsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_higashikawa", label: "東川町", domain: "town.higashikawa.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_toma", label: "当麻町", domain: "www.town.tohma.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_engaru", label: "遠軽町", domain: "engaru.jp" },
  { pref: "北海道", key: "hokkaido_yubetsu", label: "湧別町", domain: "www.town.yubetsu.lg.jp" },
  { pref: "北海道", key: "hokkaido_takinoue", label: "滝上町", domain: "town.takinoue.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_okoppe", label: "興部町", domain: "www.town.okoppe.lg.jp" },
  { pref: "北海道", key: "hokkaido_nishiokoppe", label: "西興部村", domain: "www.vill.nishiokoppe.lg.jp" },
  { pref: "北海道", key: "hokkaido_ozora", label: "大空町", domain: "www.town.ozora.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_bihoro", label: "美幌町", domain: "www.town.bihoro.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_tsubetsu", label: "津別町", domain: "www.town.tsubetsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_shari", label: "斜里町", domain: "www.town.shari.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_kiyosato", label: "清里町", domain: "www.town.kiyosato.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_koshimizu", label: "小清水町", domain: "www.town.koshimizu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_memuro", label: "芽室町", domain: "www.memuro.net" },
  { pref: "北海道", key: "hokkaido_nakasatsunai", label: "中札内村", domain: "www.vill.nakasatsunai.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_sarabetsu", label: "更別村", domain: "www.sarabetsu.jp" },
  { pref: "北海道", key: "hokkaido_otofuke", label: "音更町", domain: "www.town.otofuke.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_shihoro", label: "士幌町", domain: "www.shihoro.jp" },
  { pref: "北海道", key: "hokkaido_kamishihoro", label: "上士幌町", domain: "www.town.kamishihoro.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_shintoku", label: "新得町", domain: "www.shintoku-town.jp" },
  { pref: "北海道", key: "hokkaido_shimizu", label: "清水町", domain: "www.town.shimizu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_makubetsu", label: "幕別町", domain: "www.town.makubetsu.lg.jp" },
  { pref: "北海道", key: "hokkaido_ikeda", label: "池田町", domain: "www.town.hokkaido-ikeda.lg.jp" },
  { pref: "北海道", key: "hokkaido_toyokoro", label: "豊頃町", domain: "www.town.toyokoro.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_honbetsu", label: "本別町", domain: "www.town.honbetsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_ashoro", label: "足寄町", domain: "www.town.ashoro.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_rikubetsu", label: "陸別町", domain: "www.town.rikubetsu.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_taiki", label: "大樹町", domain: "www.town.taiki.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_hiroo", label: "広尾町", domain: "www.town.hiroo.lg.jp" },
  { pref: "北海道", key: "hokkaido_shikaoi", label: "鹿追町", domain: "www.town.shikaoi.lg.jp" },
  { pref: "北海道", key: "hokkaido_kushiro_cho", label: "釧路町", domain: "www.town.kushiro.lg.jp" },
  { pref: "北海道", key: "hokkaido_akkeshi", label: "厚岸町", domain: "www.akkeshi-town.jp" },
  { pref: "北海道", key: "hokkaido_hamanaka", label: "浜中町", domain: "www.townhamanaka.jp" },
  { pref: "北海道", key: "hokkaido_shibecha", label: "標茶町", domain: "www.town.shibecha.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_teshikaga", label: "弟子屈町", domain: "www.town.teshikaga.hokkaido.jp" },
  { pref: "北海道", key: "hokkaido_shiranuka", label: "白糠町", domain: "www.town.shiranuka.lg.jp" },
  { pref: "北海道", key: "hokkaido_betsukai", label: "別海町", domain: "betsukai.jp" },
  { pref: "北海道", key: "hokkaido_nakashibetsu", label: "中標津町", domain: "www.nakashibetsu.jp" },
  { pref: "北海道", key: "hokkaido_shibetsu_cho", label: "標津町", domain: "www.shibetsutown.jp" },
  { pref: "北海道", key: "hokkaido_rausu", label: "羅臼町", domain: "www.rausu-town.jp" },
];

const ACTIVE = HOKKAIDO.filter(m => !m.skip);

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: controller.signal, redirect: "follow",
    });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, status: 0, text: async () => "", error: e.message };
  }
}

async function probeOne(muni) {
  const results = { key: muni.key, label: muni.label, pref: muni.pref, hits: [] };
  const base = `https://${muni.domain}`;
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 1. calendar.json
  try {
    const res = await fetchWithTimeout(`${base}/calendar.json`);
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith("[") || text.startsWith("{")) {
        const data = JSON.parse(text);
        const count = Array.isArray(data) ? data.length : 0;
        results.hits.push({ type: "calendar.json", url: `${base}/calendar.json`, count });
      }
    }
  } catch {}

  // 2. cal.php
  for (const path of [`/cal.php?ym=${ym}`, `/cgi/cal.php?ym=${ym}`]) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("calendarlist") || text.includes("calendar_day") || text.includes("<table")) {
          const eventCount = (text.match(/<a\s+href=/gi) || []).length;
          results.hits.push({ type: "cal.php", url: `${base}${path}`, eventCount });
        }
      }
    } catch {}
  }

  // 3. list_calendar
  for (const path of [
    `/event/kosodate/calendar/list_calendar${ym}.html`,
    `/event/kosodate/calendar/list_calendar.html`,
    `/event/calendar/list_calendar${ym}.html`,
    `/event/list_calendar${ym}.html`,
  ]) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("calendarlist") || text.includes("calendar_day")) {
          const eventCount = (text.match(/<a\s+href=/gi) || []).length;
          results.hits.push({ type: "list_calendar", url: `${base}${path}`, eventCount });
          break;
        }
      }
    } catch {}
  }

  // 4. municipal-calendar
  for (const path of [
    `/event/${ym}.html`,
    `/event2/${ym}.html`,
  ]) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("event_day") || text.includes("calendar") || text.includes("イベント")) {
          const eventCount = (text.match(/<a\s+href=/gi) || []).length;
          results.hits.push({ type: "municipal-calendar", url: `${base}${path}`, eventCount });
          break;
        }
      }
    } catch {}
  }

  // 5. WordPress REST
  try {
    const res = await fetchWithTimeout(`${base}/wp-json/wp/v2/posts?per_page=5`);
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith("[")) {
        const data = JSON.parse(text);
        results.hits.push({ type: "wordpress", url: `${base}/wp-json/wp/v2/posts`, count: data.length });
      }
    }
  } catch {}

  // 6. event_j.js
  for (const path of ["/calendar/event_j.js", "/event_j.js"]) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("eventlist") || text.includes("var ")) {
          results.hits.push({ type: "event_j.js", url: `${base}${path}` });
          break;
        }
      }
    } catch {}
  }

  return results;
}

async function main() {
  console.log(`北海道 CMS probe: ${ACTIVE.length} municipalities`);
  console.log("=".repeat(60));

  const BATCH = 10;
  const allResults = [];

  for (let i = 0; i < ACTIVE.length; i += BATCH) {
    const batch = ACTIVE.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(m => probeOne(m)));
    allResults.push(...batchResults);
    for (const r of batchResults) {
      if (r.hits.length > 0) {
        console.log(`✓ ${r.pref} ${r.label} (${r.key})`);
        for (const h of r.hits) {
          console.log(`  ${h.type}: ${h.url} ${h.count != null ? `(${h.count} entries)` : ""} ${h.eventCount != null ? `(${h.eventCount} links)` : ""}`);
        }
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  const byType = {};
  for (const r of allResults) {
    for (const h of r.hits) {
      if (!byType[h.type]) byType[h.type] = [];
      byType[h.type].push({ ...r, hit: h });
    }
  }
  for (const [type, entries] of Object.entries(byType)) {
    console.log(`\n${type} (${entries.length} hits):`);
    for (const e of entries) {
      console.log(`  ${e.pref} ${e.label}: ${e.hit.url} ${e.hit.count != null ? `(${e.hit.count})` : ""} ${e.hit.eventCount != null ? `(${e.hit.eventCount} links)` : ""}`);
    }
  }
  const hitCount = allResults.filter(r => r.hits.length > 0).length;
  console.log(`\nTotal: ${hitCount}/${ACTIVE.length} municipalities with at least one CMS pattern`);
}

main().catch(console.error);
