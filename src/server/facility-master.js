const { normalizeText, sanitizeAddressText, hasConcreteAddressToken } = require("./text-utils");
const { isGenericWardVenueName } = require("./venue-utils");
const { isLikelyWardOfficeAddress } = require("./address-utils");
const { WARD_LABEL_BY_KEY } = require("../config/wards");

function createFacilityMaster(deps) {
  const facilityAddressMaster = deps?.facilityAddressMaster instanceof Map ? deps.facilityAddressMaster : new Map();
  const facilityPointMaster = deps?.facilityPointMaster instanceof Map ? deps.facilityPointMaster : new Map();
  const sanitizeWardPoint = deps?.sanitizeWardPoint;

  function normalizeFacilityName(value) {
    return normalizeText(value)
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[（）()【】\[\]「」『』]/g, " ")
      .replace(/[・･]/g, "")
      .replace(/[\u2018\u2019\u02BC\u0060\u00B4\uFF07']/g, "'")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function buildFacilityMasterKey(sourceKey, venueName) {
    const key = String(sourceKey || "").trim();
    const venue = normalizeFacilityName(venueName);
    if (!key || !venue) return "";
    return `${key}:${venue}`;
  }

  function getFacilityAddressFromMaster(sourceKey, venueName) {
    const key = buildFacilityMasterKey(sourceKey, venueName);
    if (!key) return "";
    const exact = facilityAddressMaster.get(key);
    if (exact) return exact;
    const venueNorm = normalizeFacilityName(venueName);
    const prefix = `${String(sourceKey || "").trim()}:`;
    // Strip room/floor suffixes for retry: "○○児童館 プレイルーム" → "○○児童館"
    const roomSuffixRe = /(?:プレイルーム|プレイホール|遊戯室|工作室|体育室|図書室|会議室|集会室|講座室|保育室|和室|多目的室|研修室|料理室|活動室|ラウンジ|ホール|小ホール|大ホール|子ども室|環境実習室|団体室|講堂|第?\d+[・\d]*展示室)$/;
    const venueStripped = venueNorm
      .replace(roomSuffixRe, "")
      .replace(/\d+階.*$/, "")
      .replace(/地下?\d*階.*$/, "");
    for (const [mk, addr] of facilityAddressMaster.entries()) {
      if (!mk.startsWith(prefix)) continue;
      const facName = mk.slice(prefix.length);
      if (facName.length < 3) continue;
      // Forward: venue contains facility name
      if (venueNorm.includes(facName)) return addr;
      // Reverse: facility name contains venue (short venue name matched to longer registered name)
      if (venueNorm.length >= 3 && facName.includes(venueNorm)) return addr;
      // Stripped venue match (room/floor suffix removed)
      if (venueStripped !== venueNorm && venueStripped.length >= 3) {
        if (venueStripped.includes(facName) || facName.includes(venueStripped)) return addr;
      }
      // Bracket-removed match: strip (...) from facility name then retry
      const facNameNoParen = facName.replace(/[（()）)]/g, "").replace(/[^a-z0-9\u3000-\u9fff\uff00-\uffef]/g, "");
      if (facNameNoParen !== facName && facNameNoParen.length >= 3) {
        if (venueNorm.includes(facNameNoParen) || facNameNoParen.includes(venueNorm)) return addr;
      }
    }
    return "";
  }

  function getFacilityPointFromMaster(sourceKey, venueName) {
    const key = buildFacilityMasterKey(sourceKey, venueName);
    if (!key) return null;
    const exact = facilityPointMaster.get(key);
    if (exact) return { lat: Number(exact.lat), lng: Number(exact.lng) };
    // Partial match with room/floor suffix stripping
    const venueNorm = normalizeFacilityName(venueName);
    const prefix = `${String(sourceKey || "").trim()}:`;
    const roomSuffixRe2 = /(?:プレイルーム|プレイホール|遊戯室|工作室|体育室|図書室|会議室|集会室|講座室|保育室|和室|多目的室|研修室|料理室|活動室|ラウンジ|ホール|小ホール|大ホール|子ども室|環境実習室|団体室|講堂|第?\d+[・\d]*展示室)$/;
    const venueStripped = venueNorm
      .replace(roomSuffixRe2, "")
      .replace(/\d+階.*$/, "")
      .replace(/地下?\d*階.*$/, "");
    for (const [mk, pt] of facilityPointMaster.entries()) {
      if (!mk.startsWith(prefix)) continue;
      const facName = mk.slice(prefix.length);
      if (facName.length < 3) continue;
      if (venueNorm.includes(facName) || (venueNorm.length >= 3 && facName.includes(venueNorm))) {
        return { lat: Number(pt.lat), lng: Number(pt.lng) };
      }
      if (venueStripped !== venueNorm && venueStripped.length >= 3) {
        if (venueStripped.includes(facName) || facName.includes(venueStripped)) {
          return { lat: Number(pt.lat), lng: Number(pt.lng) };
        }
      }
    }
    return null;
  }

  function setFacilityAddressToMaster(sourceKey, venueName, address) {
    const key = buildFacilityMasterKey(sourceKey, venueName);
    const addr = sanitizeAddressText(address);
    if (!key || !addr) return;
    if (!facilityAddressMaster.has(key)) facilityAddressMaster.set(key, addr);
  }

  function setFacilityPointToMaster(sourceKey, venueName, point) {
    const key = buildFacilityMasterKey(sourceKey, venueName);
    if (!key || !point) return;
    const normalized = sanitizeWardPoint(point, {
      key: String(sourceKey || ""),
      label: WARD_LABEL_BY_KEY[String(sourceKey || "")] || "",
    });
    if (!normalized) return;
    if (!facilityPointMaster.has(key)) facilityPointMaster.set(key, { lat: normalized.lat, lng: normalized.lng });
  }

  function inferAddressFromPoint(sourceOrCenter, point) {
    const sourceKey = sourceOrCenter?.key || "";
    const label = sourceOrCenter?.label || WARD_LABEL_BY_KEY[sourceKey] || "";
    const addr = sanitizeAddressText(point?.address || "");
    if (!addr) return "";
    if (!/東京都/.test(addr)) return "";
    if (label) {
      const ward = (addr.match(/([^\s\u3000]{2,8}区)/u) || [])[1] || "";
      if (ward && ward !== label) return "";
    }
    return addr;
  }

  function resolveEventAddress(sourceOrCenter, venueName, currentAddress, point) {
    const sourceKey = sourceOrCenter?.key || "";
    const wardLabel = sourceOrCenter?.label || WARD_LABEL_BY_KEY[sourceKey] || "";
    const genericVenue = isGenericWardVenueName(venueName, wardLabel);
    let address = sanitizeAddressText(currentAddress || "");
    if (isLikelyWardOfficeAddress(sourceKey, address)) address = "";
    if (!address && sourceKey && venueName && !genericVenue) address = getFacilityAddressFromMaster(sourceKey, venueName);
    if (!address) address = inferAddressFromPoint(sourceOrCenter, point);
    if (isLikelyWardOfficeAddress(sourceKey, address)) address = "";
    if (address && sourceKey && venueName && !genericVenue) setFacilityAddressToMaster(sourceKey, venueName, address);
    return address;
  }

  function resolveEventPoint(sourceOrCenter, venueName, currentPoint, currentAddress) {
    const sourceKey = sourceOrCenter?.key || "";
    const wardLabel = sourceOrCenter?.label || WARD_LABEL_BY_KEY[sourceKey] || "";
    const genericVenue = isGenericWardVenueName(venueName, wardLabel);
    const address = sanitizeAddressText(currentAddress || "");
    const hasConcreteAddress = hasConcreteAddressToken(address);
    let point = sanitizeWardPoint(currentPoint, sourceOrCenter);
    if (point && genericVenue && !hasConcreteAddress) point = null;
    if (!point && sourceKey && venueName && !genericVenue) point = getFacilityPointFromMaster(sourceKey, venueName);
    if (point && sourceKey && venueName && !genericVenue) setFacilityPointToMaster(sourceKey, venueName, point);
    return point;
  }

  return {
    getFacilityAddressFromMaster,
    getFacilityPointFromMaster,
    resolveEventAddress,
    resolveEventPoint,
    setFacilityAddressToMaster,
    setFacilityPointToMaster,
  };
}

module.exports = {
  createFacilityMaster,
};
