const { fetchText } = require('../src/server/fetch-utils');
const { normalizeText } = require('../src/server/text-utils');
const { stripTags, parseAnchors } = require('../src/server/html-utils');
const { CHIYODA_SOURCE, MINATO_SOURCE, MINATO_APII_URL, MINATO_ASSOCIE_FUREAI_URL } = require('../src/config/wards');

async function main() {
  const cBase = CHIYODA_SOURCE.baseUrl;

  console.log("=== CHIYODA: CGI URL filter analysis ===");
  const url1 = cBase + "/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=2026&month=2&event_target=1";
  const html = await fetchText(url1);
  const blockMatch = html.match(/<div id="tmp_event_cal_list">([\s\S]*?)<div id="event_cal_list_end_position">/i);
  const block = blockMatch ? blockMatch[1] : "";

  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let tr, total = 0, passed = 0, filtered = 0;
  const passedLinks = [], filteredLinks = [];

  while ((tr = trRe.exec(block)) !== null) {
    const row = tr[0];
    const dayMatch = row.match(/cal_day_(\d{1,2})/i);
    if (!dayMatch) continue;
    const day = Number(dayMatch[1]);
    const linkRe = /<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = linkRe.exec(row)) !== null) {
      total++;
      const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
      const title = normalizeText(stripTags(m[2]));
      if (!hrefRaw || !title) continue;
      let abs = "";
      try { abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, url1).toString(); } catch { continue; }
      const urlFilter = /city\.chiyoda\.lg\.jp\/(?:koho\/event|koho\/kosodate|kurashi\/kosodate|kosodate|shisetsu\/jidokan|shisetsu\/gakko)\//i;
      if (urlFilter.test(abs)) {
        passed++;
        passedLinks.push("Day " + day + ": " + title.substring(0,50) + " -> " + abs.replace(cBase, ""));
      } else {
        filtered++;
        filteredLinks.push("Day " + day + ": " + title.substring(0,50) + " -> " + abs.replace(cBase, ""));
      }
    }
  }

  console.log("Total: " + total + ", Passed: " + passed + ", Filtered: " + filtered);
  console.log("\nPassed:");
  passedLinks.forEach(function(l) { console.log("  " + l); });
  console.log("\nFiltered:");
  filteredLinks.forEach(function(l) { console.log("  " + l); });

  console.log("\n=== CHIYODA: Keyword searches ===");
  for (const kw of ["\u5150\u7ae5", "\u5b50\u3069\u3082", "\u5b50\u80b2\u3066"]) {
    const kwUrl = cBase + "/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=2026&month=2&keyword=" + encodeURIComponent(kw);
    try {
      const kwHtml = await fetchText(kwUrl);
      const kwBlock = (kwHtml.match(/<div id="tmp_event_cal_list">([\s\S]*?)<div id="event_cal_list_end_position">/i) || [])[1] || "";
      const links = kwBlock.match(/<a href="[^"]+"[^>]*>[\s\S]*?<\/a>/gi) || [];
      console.log("keyword=" + kw + ": " + links.length + " links");
      links.slice(0, 5).forEach(function(l) { console.log("  " + normalizeText(stripTags(l)).substring(0, 80)); });
    } catch(e) {
      console.log("keyword=" + kw + ": ERROR");
    }
  }

  console.log("\n=== CHIYODA: Hoikuen event page ===");
  try {
    const hHtml = await fetchText(cBase + "/koho/kosodate/hoiku/event.html");
    const links = parseAnchors(hHtml, cBase + "/koho/kosodate/hoiku/event.html");
    const eventLinks = links.filter(function(a) { return /\.html/i.test(a.url) && !/index\.html/i.test(a.url); });
    console.log("Total: " + links.length + ", non-index html: " + eventLinks.length);
    eventLinks.slice(0, 10).forEach(function(a) { console.log("  " + a.text.substring(0,50) + " -> " + a.url.replace(cBase, "")); });
  } catch(e) {
    console.log("ERROR: " + e.message.substring(0, 80));
  }

  console.log("\n=== CHIYODA: jidocenter/ichiran page ===");
  try {
    const jHtml = await fetchText(cBase + "/koho/kosodate/jidocenter/ichiran/jidocenter.html");
    const links = parseAnchors(jHtml, cBase + "/koho/kosodate/jidocenter/ichiran/jidocenter.html");
    console.log("Total links: " + links.length);
    links.filter(function(a) { return /(\u5150\u7ae5|\u30bb\u30f3\u30bf\u30fc|\u3072\u308d\u3070|\u308f\u3093\u3071\u304f)/i.test(a.text); }).forEach(function(a) {
      console.log("  " + a.text.substring(0,50) + " -> " + a.url.replace(cBase, ""));
    });
  } catch(e) {
    console.log("ERROR: " + e.message.substring(0, 80));
  }

  console.log("\n\n=== MINATO: Event count breakdown ===");
  const mBase = MINATO_SOURCE.baseUrl;

  for (const month of [{ year: 2026, month: 2 }, { year: 2026, month: 3 }]) {
    for (const params of [
      "type=2&event_target=2&siteid=1",
      "type=2&siteid=1",
      "type=1&siteid=1",
    ]) {
      const calUrl = mBase + "/cgi-bin/event_cal_multi/calendar.cgi?" + params + "&year=" + month.year + "&month=" + month.month;
      try {
        const calHtml = await fetchText(calUrl);
        const re = /<p[^>]*class="event_item_cnt[^"]*"[^>]*>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/p>/gi;
        let count = 0;
        while (re.exec(calHtml) !== null) count++;
        console.log(month.year + "/" + month.month + " " + params + ": " + count + " items");
      } catch(e) {
        console.log("ERROR: " + e.message.substring(0, 60));
      }
    }
  }

  console.log("\n--- Minato appii facility links ---");
  try {
    const apiiHtml = await fetchText(MINATO_APII_URL);
    const apiiLinks = parseAnchors(apiiHtml, MINATO_APII_URL);
    const apiiChildren = apiiLinks.filter(function(a) {
      return /city\.minato\.tokyo\.jp/i.test(a.url) &&
        /(shienshisetsu|appy|apii|fureairoom)/i.test(a.url) &&
        /(\u3042\u3063\u3074\u3043|\u5b50\u3069\u3082\u3075\u308c\u3042\u3044\u30eb\u30fc\u30e0)/.test(a.text);
    });
    console.log("Appii facility links: " + apiiChildren.length);
    apiiChildren.forEach(function(a) { console.log("  " + a.text.substring(0,50) + " -> " + a.url.replace(mBase, "")); });
  } catch(e) {
    console.log("Appii ERROR: " + e.message.substring(0, 60));
  }

  console.log("\n--- Minato associe fureai events ---");
  try {
    const assocHtml = await fetchText(MINATO_ASSOCIE_FUREAI_URL);
    const re = /<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*(\d{4})\.(\d{2})\.(\d{2})<br>\s*([^<]{1,160})/gi;
    let count = 0;
    let m;
    while ((m = re.exec(assocHtml)) !== null) {
      count++;
      if (count <= 5) console.log("  " + m[2] + "." + m[3] + "." + m[4] + ": " + normalizeText(m[5]).substring(0, 60));
    }
    console.log("Total associe events: " + count);
  } catch(e) {
    console.log("Associe ERROR: " + e.message.substring(0, 60));
  }
}

main().catch(function(e) { console.error(e); process.exit(1); });
