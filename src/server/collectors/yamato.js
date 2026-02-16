const { YAMATO_SOURCE } = require("../../config/wards");
const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { stripTags } = require("../html-utils");

/**
 * description から ■場所 / ■会場 に続くテキストを抽出
 * @param {string} desc - HTML description (BR タグ区切り)
 * @returns {{ venue: string, address: string }}
 */
function parseVenueFromDescription(desc) {
  if (!desc) return { venue: "", address: "" };
  // BR タグを改行に変換してプレーンテキスト化
  const text = stripTags(desc.replace(/<BR\s*\/?>/gi, "\n"));
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let venue = "";
  let address = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/■(場所|会場)[：:\s]*(.*)/);
    if (match) {
      const rest = match[2].trim();
      if (rest) {
        venue = rest;
      } else if (i + 1 < lines.length) {
        // 次の行に会場名がある場合
        venue = lines[i + 1];
      }
      break;
    }
  }

  // 会場テキストから住所部分を分離
  if (venue) {
    // 括弧内の住所を抽出
    const addrMatch = venue.match(/[（(]([^）)]*(?:大和市|神奈川県)[^）)]*)[）)]/);
    if (addrMatch) {
      address = addrMatch[1].trim();
      venue = venue.replace(/[（(][^）)]*[）)]/, "").trim();
    }
    // 「大和市...」で始まる住所が直接含まれている場合
    const embeddedAddr = venue.match(/(大和市\S+)/);
    if (!address && embeddedAddr) {
      address = embeddedAddr[1];
    }
  }

  return { venue, address };
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("大和市") ? address : `大和市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県大和市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectYamatoEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectYamatoEvents(maxDays) {
    const source = `ward_${YAMATO_SOURCE.key}`;
    const label = YAMATO_SOURCE.label;
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    // JSON フィード取得
    let items;
    try {
      const url = "https://www.city.yamato.lg.jp/section/ehon_no_machi/events/events.json";
      const raw = await fetchText(url);
      // BOM 除去
      const text = raw.replace(/^\uFEFF/, "");
      items = JSON.parse(text);
    } catch (e) {
      console.warn(`[${label}] JSON fetch/parse failed:`, e.message || e);
      return [];
    }

    if (!Array.isArray(items)) {
      console.warn(`[${label}] JSON is not an array`);
      return [];
    }

    const byId = new Map();
    for (const item of items) {
      if (!item.title || !item.start) continue;

      // 日付パース: start は "2026-02-03T00:00" 形式
      const startStr = String(item.start);
      const dateMatch = startStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!dateMatch) continue;
      const dateKey = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      if (dateKey < todayStr || dateKey > endStr) continue;

      const title = item.title.replace(/[\r\n]+/g, " ").trim();
      const desc = item.description || "";

      // 開始・終了時刻
      let startsAt = `${dateKey}T00:00:00+09:00`;
      let endsAt = null;
      const startTime = startStr.match(/T(\d{2}):(\d{2})/);
      if (startTime && !(startTime[1] === "00" && startTime[2] === "00")) {
        startsAt = `${dateKey}T${startTime[1]}:${startTime[2]}:00+09:00`;
      }
      if (item.end) {
        const endTime = String(item.end).match(/T(\d{2}):(\d{2})/);
        if (endTime && !(endTime[1] === "00" && endTime[2] === "00")) {
          endsAt = `${dateKey}T${endTime[1]}:${endTime[2]}:00+09:00`;
        }
      }

      // 会場・住所抽出
      const { venue, address: descAddress } = parseVenueFromDescription(desc);

      // JSON に lat/lon がある場合
      const rawLat = parseFloat(item.lat);
      const rawLon = parseFloat(item.lon);
      const hasCoords = !isNaN(rawLat) && !isNaN(rawLon) && rawLat !== 0 && rawLon !== 0
        && String(item.lat).trim() !== "" && String(item.lon).trim() !== "";

      let point = hasCoords ? { lat: rawLat, lng: rawLon } : null;

      // ジオコーディング (座標が無い場合)
      if (!point && venue) {
        let geoCandidates = buildGeoCandidates(venue, descAddress);
        if (getFacilityAddressFromMaster) {
          const fmAddr = getFacilityAddressFromMaster(YAMATO_SOURCE.key, venue);
          if (fmAddr) {
            const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
            geoCandidates.unshift(full);
          }
        }
        point = await geocodeForWard(geoCandidates.slice(0, 7), YAMATO_SOURCE);
      }

      point = resolveEventPoint(YAMATO_SOURCE, venue, point, descAddress || `${label} ${venue}`);
      const address = resolveEventAddress(YAMATO_SOURCE, venue, descAddress || `${label} ${venue}`, point);

      const dateKeyStr = dateKey.replace(/-/g, "");
      const eventUrl = `https://www.city.yamato.lg.jp/section/ehon_no_machi/events/events.json`;
      const id = `${source}:${eventUrl}:${title}:${dateKeyStr}`;
      if (byId.has(id)) continue;

      byId.set(id, {
        id,
        source,
        source_label: label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: address || "",
        url: eventUrl,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectYamatoEvents };
