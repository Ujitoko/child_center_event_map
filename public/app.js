const map = L.map("map").setView([35.681236, 139.767125], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
const eventPinIcon = L.divIcon({
  className: "event-pin-wrap",
  html: `<svg class="event-pin" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M14 0C6.8 0 1 5.8 1 13c0 9.8 11.4 25.2 12.3 26.3a1 1 0 0 0 1.4 0C15.6 38.2 27 22.8 27 13 27 5.8 21.2 0 14 0z" fill="#e63946" stroke="#ffffff" stroke-width="2"/>
    <circle cx="14" cy="13" r="4.3" fill="#ffffff"/>
  </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 39],
  popupAnchor: [0, -34],
});
const MAX_LIST_RENDER = 250;
let lastFetchedItems = [];
let lastDateText = "";
let lastWarningText = "";
const TOKYO_23_WARDS = [
  "千代田区",
  "中央区",
  "港区",
  "新宿区",
  "文京区",
  "台東区",
  "墨田区",
  "江東区",
  "品川区",
  "目黒区",
  "大田区",
  "世田谷区",
  "渋谷区",
  "中野区",
  "杉並区",
  "豊島区",
  "北区",
  "荒川区",
  "板橋区",
  "練馬区",
  "足立区",
  "葛飾区",
  "江戸川区",
];
const SOURCE_WARD_MAP = {
  chiyoda: "千代田区",
  chuo: "中央区",
  minato: "港区",
  shinjuku: "新宿区",
  bunkyo: "文京区",
  taito: "台東区",
  sumida: "墨田区",
  koto: "江東区",
  shinagawa: "品川区",
  meguro: "目黒区",
  ota: "大田区",
  setagaya: "世田谷区",
  shibuya: "渋谷区",
  nakano: "中野区",
  suginami: "杉並区",
  toshima: "豊島区",
  kita: "北区",
  arakawa: "荒川区",
  itabashi: "板橋区",
  nerima: "練馬区",
  adachi: "足立区",
  adachi_odekake: "足立区",
  katsushika: "葛飾区",
  edogawa: "江戸川区",
};
const selectedWards = new Set();
let searchQuery = "";
let searchDebounceTimer = null;
let userLocation = null;
let userLocationMarker = null;
let sortByDistance = false;

const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");
const dateEl = document.getElementById("dateText");
const wardFiltersEl = document.getElementById("wardFilters");
const selectAllWardsBtnEl = document.getElementById("selectAllWardsBtn");
const clearAllWardsBtnEl = document.getElementById("clearAllWardsBtn");

function setStatus(text) {
  statusEl.textContent = text;
}

function summarizeBySource(items) {
  const m = new Map();
  for (const e of items) {
    const k = e.source_label || e.source || "unknown";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");
}

function clearMarkers() {
  markerLayer.clearLayers();
}

function formatJst(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "不明";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatJstDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatStartLabel(eventItem) {
  if (eventItem && eventItem.time_unknown) {
    const d = formatJstDate(eventItem.starts_at);
    return d || "";
  }
  return formatJst(eventItem?.starts_at);
}

function formatStartForPopup(eventItem) {
  if (eventItem && eventItem.time_unknown) {
    const d = formatJstDate(eventItem.starts_at);
    return d || "";
  }
  const d = new Date(eventItem?.starts_at);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function parseFiniteCoord(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function haversineDist(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceLabel(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function getWardLabel(item) {
  const source = String(item.source || "");
  if (source.startsWith("ward_")) {
    const key = source.slice(5);
    if (SOURCE_WARD_MAP[key]) return SOURCE_WARD_MAP[key];
  }
  const sourceLabel = String(item.source_label || "");
  const fromLabel = sourceLabel.match(/([^\s　]+区)/u);
  if (fromLabel) return fromLabel[1];
  const address = String(item.address || "");
  const fromAddress = address.match(/([^\s　]+区)/u);
  if (fromAddress) return fromAddress[1];
  return "";
}

function countByWard(items) {
  const counts = new Map();
  for (const item of items) {
    const ward = getWardLabel(item);
    if (!ward) continue;
    counts.set(ward, (counts.get(ward) || 0) + 1);
  }
  return counts;
}

function renderWardFilters(wardCounts = new Map()) {
  wardFiltersEl.innerHTML = "";
  for (const ward of TOKYO_23_WARDS) {
    const row = document.createElement("label");
    row.className = "ward-option";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = ward;
    cb.checked = selectedWards.has(ward);
    cb.addEventListener("change", () => {
      if (cb.checked) selectedWards.add(ward);
      else selectedWards.delete(ward);
      applyFiltersAndRender({ autoFit: false });
    });
    const text = document.createElement("span");
    const count = wardCounts.get(ward) || 0;
    text.textContent = `${ward} (${count})`;
    row.appendChild(cb);
    row.appendChild(text);
    wardFiltersEl.appendChild(row);
  }
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const DISTANCE_BRACKETS = [1, 3, 5, 10];

function getDateGroupKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "不明";
  const jst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const m = jst.getMonth() + 1;
  const day = jst.getDate();
  const dow = DAY_NAMES[jst.getDay()];
  const today = getJstToday();
  const tomorrow = new Date(today.getTime() + 86400000);
  const jstDate = new Date(jst.getFullYear(), jst.getMonth(), jst.getDate());
  let prefix = "";
  if (jstDate.getTime() === today.getTime()) prefix = "今日 ";
  else if (jstDate.getTime() === tomorrow.getTime()) prefix = "明日 ";
  return `${prefix}${m}/${day} (${dow})`;
}

function getDistanceGroupKey(km) {
  if (km === null) return "位置情報なし";
  for (const bracket of DISTANCE_BRACKETS) {
    if (km < bracket) return `${bracket}km以内`;
  }
  return `${DISTANCE_BRACKETS[DISTANCE_BRACKETS.length - 1]}km以上`;
}

function render(items, options = {}) {
  const autoFit = options.autoFit === true;
  clearMarkers();
  listEl.innerHTML = "";

  if (items.length === 0) {
    listEl.innerHTML = '<p class="meta">条件に合うイベントは見つかりませんでした。</p>';
    return;
  }

  const bounds = [];
  const markerMap = new Map();
  for (let i = 0; i < items.length; i += 1) {
    const e = items[i];
    const lat = parseFiniteCoord(e.lat);
    const lng = parseFiniteCoord(e.lng);
    if (lat !== null && lng !== null) {
      const marker = L.marker([lat, lng], { icon: eventPinIcon }).addTo(markerLayer);
      const popupEl = document.createElement("div");
      popupEl.className = "popup-content";
      const shareAttr = navigator.share ? `<button type="button" class="popup-share-btn" data-popup-share="${i}">共有</button>` : "";
      popupEl.innerHTML = `<div class="popup-title">${e.title}</div><div class="popup-meta">${formatStartForPopup(e)}</div><div class="popup-meta">${e.venue_name || "会場未設定"}</div><div class="popup-actions"><a href="${e.url}" target="_blank" rel="noopener noreferrer">詳細ページ</a>${shareAttr}</div>`;
      const popupShareBtn = popupEl.querySelector(".popup-share-btn");
      if (popupShareBtn) {
        popupShareBtn.addEventListener("click", () => {
          navigator.share({
            title: e.title,
            text: `${e.title}\n${formatStartForPopup(e)} ${e.venue_name || ""}\n`,
            url: e.url,
          }).catch(() => {});
        });
      }
      marker.bindPopup(popupEl, { maxWidth: 280, minWidth: 200 });
      marker._eventIdx = i;
      bounds.push([lat, lng]);
      markerMap.set(i, { marker, lat, lng });
    }
  }

  const frag = document.createDocumentFragment();
  const listLimit = Math.min(items.length, MAX_LIST_RENDER);
  let lastGroupKey = "";
  for (let i = 0; i < listLimit; i += 1) {
    const e = items[i];

    // グループヘッダー挿入
    let groupKey = "";
    if (sortByDistance && userLocation) {
      const eLat = parseFiniteCoord(e.lat);
      const eLng = parseFiniteCoord(e.lng);
      const km = eLat !== null && eLng !== null ? haversineDist(userLocation.lat, userLocation.lng, eLat, eLng) : null;
      groupKey = getDistanceGroupKey(km);
    } else {
      groupKey = getDateGroupKey(e.starts_at);
    }
    if (groupKey !== lastGroupKey) {
      const header = document.createElement("div");
      header.className = "group-header";
      header.textContent = groupKey;
      frag.appendChild(header);
      lastGroupKey = groupKey;
    }

    const card = document.createElement("article");
    card.className = "card";
    card.style.setProperty("--i", String(i));
    let distHtml = "";
    if (userLocation) {
      const eLat = parseFiniteCoord(e.lat);
      const eLng = parseFiniteCoord(e.lng);
      if (eLat !== null && eLng !== null) {
        const km = haversineDist(userLocation.lat, userLocation.lng, eLat, eLng);
        distHtml = `<div class="meta">距離: ${distanceLabel(km)}</div>`;
      }
    }
    const shareBtn = navigator.share ? `<button type="button" class="share-btn" data-share="${i}">共有</button>` : "";
    card.innerHTML = `
      <h3>${e.title}</h3>
      <div class="meta">開始: ${formatStartLabel(e)}</div>
      <div class="meta">場所: ${e.venue_name || "会場未設定"} ${e.address || ""}</div>
      ${distHtml}
      <div class="meta">ソース: ${e.source_label || e.source || "unknown"}</div>
      <div class="card-actions">
        <a href="${e.url}" target="_blank" rel="noopener noreferrer">詳細ページ</a>
        ${shareBtn}
      </div>
    `;
    const shareBtnEl = card.querySelector(".share-btn");
    if (shareBtnEl) {
      shareBtnEl.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const venue = e.venue_name || "";
        const dateStr = formatStartLabel(e);
        navigator.share({
          title: e.title,
          text: `${e.title}\n${dateStr} ${venue}\n`,
          url: e.url,
        }).catch(() => {});
      });
    }
    card.dataset.idx = String(i);
    const idx = i;
    card.addEventListener("click", (ev) => {
      if (ev.target.tagName === "A" || ev.target.closest(".share-btn")) return;
      const entry = markerMap.get(idx);
      if (entry) {
        if (isMobile()) switchTab("map");
        map.setView(entry.marker.getLatLng(), 16);
        entry.marker.openPopup();
      }
    });
    card.style.cursor = "pointer";
    frag.appendChild(card);
  }
  if (items.length > listLimit) {
    const more = document.createElement("p");
    more.className = "meta";
    more.textContent = `一覧は先頭 ${listLimit} 件まで表示中（全 ${items.length} 件）`;
    frag.appendChild(more);
  }
  listEl.appendChild(frag);

  if (autoFit && bounds.length > 0) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }

  map.off("popupopen.cardlink");
  map.on("popupopen.cardlink", (ev) => {
    const marker = ev.popup._source;
    if (marker && marker._eventIdx != null) {
      const card = listEl.querySelector(`[data-idx="${marker._eventIdx}"]`);
      if (card) {
        listEl.querySelectorAll(".card.highlight").forEach((c) => c.classList.remove("highlight"));
        card.classList.add("highlight");
        const sideEl = listEl.closest(".side");
        if (sideEl) {
          const cardTop = card.offsetTop - sideEl.offsetTop;
          sideEl.scrollTo({ top: cardTop - sideEl.clientHeight / 3, behavior: "smooth" });
        }
      }
    }
  });
}

function getJstToday() {
  const now = new Date();
  const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate());
}

function formatDateValue(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateValue(val) {
  if (!val) return null;
  const parts = val.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function syncUrlParams() {
  const params = new URLSearchParams();
  const fromVal = document.getElementById("fromDate").value;
  const untilVal = document.getElementById("untilDate").value;
  const todayStart = getJstToday();
  const defaultFrom = formatDateValue(todayStart);
  const defaultUntil = formatDateValue(new Date(todayStart.getTime() + 30 * 86400000));
  if (fromVal && fromVal !== defaultFrom) params.set("from", fromVal);
  if (untilVal && untilVal !== defaultUntil) params.set("until", untilVal);
  if (selectedWards.size > 0) params.set("wards", Array.from(selectedWards).join(","));
  if (searchQuery) params.set("q", searchQuery);
  const qs = params.toString();
  const newUrl = qs ? `${location.pathname}?${qs}` : location.pathname;
  history.replaceState(null, "", newUrl);
}

function restoreFromUrl() {
  const params = new URLSearchParams(location.search);
  if (params.has("from")) document.getElementById("fromDate").value = params.get("from");
  if (params.has("until")) document.getElementById("untilDate").value = params.get("until");
  if (params.has("wards")) {
    selectedWards.clear();
    for (const w of params.get("wards").split(",")) {
      if (TOKYO_23_WARDS.includes(w)) selectedWards.add(w);
    }
  }
  if (params.has("q")) {
    searchQuery = params.get("q");
    document.getElementById("searchInput").value = searchQuery;
  }
}

function initDateRange() {
  const fromEl = document.getElementById("fromDate");
  const untilEl = document.getElementById("untilDate");
  const todayStart = getJstToday();
  const minDate = formatDateValue(todayStart);
  const maxDate = formatDateValue(new Date(todayStart.getTime() + 90 * 86400000));
  const defaultUntil = formatDateValue(new Date(todayStart.getTime() + 30 * 86400000));
  fromEl.min = minDate;
  fromEl.max = maxDate;
  untilEl.min = minDate;
  untilEl.max = maxDate;
  if (!fromEl.value) fromEl.value = minDate;
  if (!untilEl.value) untilEl.value = defaultUntil;
}

function applyFiltersAndRender(options = {}) {
  const autoFit = options.autoFit === true;
  const todayStart = getJstToday();

  // 開始日・終了日を取得
  const fromDate = parseDateValue(document.getElementById("fromDate").value) || todayStart;
  const untilDate = parseDateValue(document.getElementById("untilDate").value);
  const cutoff = untilDate ? new Date(untilDate.getTime() + 86400000) : new Date(todayStart.getTime() + 30 * 86400000);

  let items = lastFetchedItems.filter((e) => {
    const d = new Date(e.starts_at);
    return !Number.isNaN(d.getTime()) && d >= fromDate && d < cutoff;
  });

  // 区カウントは日数フィルタ済みデータで計算
  renderWardFilters(countByWard(items));

  // 区フィルタ
  if (selectedWards.size > 0) {
    items = items.filter((e) => {
      const ward = getWardLabel(e);
      return !ward || selectedWards.has(ward);
    });
  }

  // テキスト検索
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter((e) => {
      const hay = `${e.title || ""} ${e.venue_name || ""} ${e.address || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  // 距離ソート
  if (sortByDistance && userLocation) {
    items.sort((a, b) => {
      const aLat = parseFiniteCoord(a.lat);
      const aLng = parseFiniteCoord(a.lng);
      const bLat = parseFiniteCoord(b.lat);
      const bLng = parseFiniteCoord(b.lng);
      const aDist = aLat !== null && aLng !== null ? haversineDist(userLocation.lat, userLocation.lng, aLat, aLng) : Infinity;
      const bDist = bLat !== null && bLng !== null ? haversineDist(userLocation.lat, userLocation.lng, bLat, bLng) : Infinity;
      return aDist - bDist;
    });
  }

  // ステータス表示
  const totalInRange = lastFetchedItems.filter((e) => {
    const d = new Date(e.starts_at);
    return !Number.isNaN(d.getTime()) && d >= fromDate && d < cutoff;
  }).length;
  const days = Math.round((cutoff - fromDate) / 86400000);
  const warning = lastWarningText ? ` / ${lastWarningText}` : "";
  dateEl.textContent = `${lastDateText} (JST) のイベント ${lastFetchedItems.length}件取得`;
  setStatus(`表示件数: ${items.length}/${totalInRange}件（${days}日間）${warning}`);
  updateTabBadge(items.length);
  render(items, { autoFit });
  syncUrlParams();
}

async function loadEvents() {
  setStatus("データ取得中...");
  const url = "/api/events?days=90";

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "fetch failed");

    lastFetchedItems = data.items.slice().sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    lastDateText = data.date_jst;
    lastWarningText = data.warning || "";
    applyFiltersAndRender({ autoFit: true });
  } catch (err) {
    setStatus(`取得失敗: ${err.message}`);
    render([], { autoFit: false });
  }
}

const searchInputEl = document.getElementById("searchInput");
searchInputEl.addEventListener("input", () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    searchQuery = searchInputEl.value.trim();
    applyFiltersAndRender({ autoFit: false });
  }, 250);
});

renderWardFilters();
selectAllWardsBtnEl.addEventListener("click", () => {
  selectedWards.clear();
  for (const ward of TOKYO_23_WARDS) selectedWards.add(ward);
  applyFiltersAndRender({ autoFit: false });
});
clearAllWardsBtnEl.addEventListener("click", () => {
  selectedWards.clear();
  applyFiltersAndRender({ autoFit: false });
});
const nearbyBtn = document.getElementById("nearbyBtn");
nearbyBtn.addEventListener("click", () => {
  if (sortByDistance) {
    sortByDistance = false;
    nearbyBtn.classList.remove("active");
    nearbyBtn.textContent = "現在地から近い順";
    if (userLocationMarker) {
      map.removeLayer(userLocationMarker);
      userLocationMarker = null;
    }
    applyFiltersAndRender({ autoFit: false });
    return;
  }
  if (!navigator.geolocation) {
    setStatus("位置情報に対応していません");
    return;
  }
  nearbyBtn.textContent = "取得中...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      sortByDistance = true;
      nearbyBtn.classList.add("active");
      nearbyBtn.textContent = "現在地から近い順 (解除)";
      if (userLocationMarker) map.removeLayer(userLocationMarker);
      userLocationMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 9,
        color: "#fff",
        weight: 3,
        fillColor: "#4285f4",
        fillOpacity: 1,
      }).addTo(map).bindPopup("現在地");
      map.setView([userLocation.lat, userLocation.lng], 14);
      applyFiltersAndRender({ autoFit: false });
    },
    (err) => {
      nearbyBtn.textContent = "現在地から近い順";
      setStatus(`位置情報を取得できません: ${err.message}`);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

document.getElementById("fromDate").addEventListener("change", () => {
  updatePresetHighlight();
  applyFiltersAndRender({ autoFit: false });
});
document.getElementById("untilDate").addEventListener("change", () => {
  updatePresetHighlight();
  applyFiltersAndRender({ autoFit: false });
});

function computeWeekendRange(today) {
  const dow = today.getDay();
  if (dow === 0) {
    return {
      from: new Date(today.getTime() - 86400000),
      until: today,
    };
  }
  if (dow === 6) {
    return {
      from: today,
      until: new Date(today.getTime() + 86400000),
    };
  }
  const satOffset = 6 - dow;
  const sat = new Date(today.getTime() + satOffset * 86400000);
  const sun = new Date(sat.getTime() + 86400000);
  return { from: sat, until: sun };
}

function computePresetRange(preset) {
  const today = getJstToday();
  if (preset === "today") {
    return { from: today, until: today };
  }
  if (preset === "weekend") {
    return computeWeekendRange(today);
  }
  if (preset === "next-weekend") {
    const thisWeekend = computeWeekendRange(today);
    return {
      from: new Date(thisWeekend.from.getTime() + 7 * 86400000),
      until: new Date(thisWeekend.until.getTime() + 7 * 86400000),
    };
  }
  return {
    from: today,
    until: new Date(today.getTime() + Number(preset) * 86400000),
  };
}

function updatePresetHighlight() {
  const currentFrom = document.getElementById("fromDate").value;
  const currentUntil = document.getElementById("untilDate").value;
  document.querySelectorAll(".date-presets button").forEach((btn) => {
    const range = computePresetRange(btn.dataset.preset);
    const matchFrom = currentFrom === formatDateValue(range.from);
    const matchUntil = currentUntil === formatDateValue(range.until);
    btn.classList.toggle("active", matchFrom && matchUntil);
  });
}

document.querySelectorAll(".date-presets button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const range = computePresetRange(btn.dataset.preset);
    document.getElementById("fromDate").value = formatDateValue(range.from);
    document.getElementById("untilDate").value = formatDateValue(range.until);
    updatePresetHighlight();
    applyFiltersAndRender({ autoFit: false });
  });
});

// モバイルタブ切り替え
const mobileTabs = document.querySelectorAll(".mobile-tab");
const sideEl = document.querySelector(".side");
const mainEl = document.querySelector("main");

function switchTab(target) {
  mobileTabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === target));
  sideEl.classList.toggle("show", target === "list");
  mainEl.classList.toggle("show", target === "map");
  if (target === "map") map.invalidateSize();
}

function isMobile() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function updateTabBadge(count) {
  const listTab = document.querySelector('.mobile-tab[data-tab="list"]');
  if (listTab) listTab.innerHTML = `リスト <span class="tab-badge">(${count})</span>`;
}

mobileTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

// スワイプでタブ切り替え
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 50;
const layoutEl = document.querySelector(".layout");

layoutEl.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

layoutEl.addEventListener("touchend", (e) => {
  if (!isMobile()) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (dx < 0) switchTab("map");
    else switchTab("list");
  }
}, { passive: true });

// 初期状態: モバイルではリストタブをアクティブに + フィルター折りたたみ
if (isMobile()) {
  switchTab("list");
  const controlsSection = document.querySelector(".controls-section");
  if (controlsSection) controlsSection.removeAttribute("open");
}

initDateRange();
restoreFromUrl();
updatePresetHighlight();
loadEvents();
