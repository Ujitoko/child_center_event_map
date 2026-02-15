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
    // Fallback: partial match — venue contains a known facility name (荒川区 room suffix pattern)
    const venueNorm = normalizeFacilityName(venueName);
    const prefix = `${String(sourceKey || "").trim()}:`;
    for (const [mk, addr] of facilityAddressMaster.entries()) {
      if (!mk.startsWith(prefix)) continue;
      const facName = mk.slice(prefix.length);
      if (facName.length >= 3 && venueNorm.includes(facName)) return addr;
    }
    return "";
  }

  function getFacilityPointFromMaster(sourceKey, venueName) {
    const key = buildFacilityMasterKey(sourceKey, venueName);
    if (!key) return null;
    const point = facilityPointMaster.get(key);
    if (!point) return null;
    return { lat: Number(point.lat), lng: Number(point.lng) };
  }

  function setFacilityAddressToMaster(sourceKey, venueName, address) {
    const key = buildFacilityMasterKey(sourceKey, venueName);
    const addr = sanitizeAddressText(address);
    if (!key || !addr) return;
    const label = WARD_LABEL_BY_KEY[String(sourceKey || "")] || "";
    if (label) {
      const ward = (addr.match(/([^\s\u3000]{2,8}区)/u) || [])[1] || "";
      if (ward && ward !== label) return;
    }
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
