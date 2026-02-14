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

function render(items, options = {}) {
  const autoFit = options.autoFit === true;
  clearMarkers();
  listEl.innerHTML = "";

  if (items.length === 0) {
    listEl.innerHTML = '<p class="meta">条件に合うイベントは見つかりませんでした。</p>';
    return;
  }

  const bounds = [];
  for (const e of items) {
    const lat = parseFiniteCoord(e.lat);
    const lng = parseFiniteCoord(e.lng);
    if (lat !== null && lng !== null) {
      const marker = L.marker([lat, lng], { icon: eventPinIcon }).addTo(markerLayer);
      marker.bindPopup(
        `<b>${e.title}</b><br>${formatStartForPopup(e)}<br>${e.venue_name || "会場未設定"}<br><a href="${e.url}" target="_blank" rel="noopener noreferrer">詳細ページ</a>`
      );
      bounds.push([lat, lng]);
    }
  }

  const frag = document.createDocumentFragment();
  const listLimit = Math.min(items.length, MAX_LIST_RENDER);
  for (let i = 0; i < listLimit; i += 1) {
    const e = items[i];
    const card = document.createElement("article");
    card.className = "card";
    card.style.setProperty("--i", String(i));
    card.innerHTML = `
      <h3>${e.title}</h3>
      <div class="meta">開始: ${formatStartLabel(e)}</div>
      <div class="meta">場所: ${e.venue_name || "会場未設定"} ${e.address || ""}</div>
      <div class="meta">ソース: ${e.source_label || e.source || "unknown"}</div>
      <div class="meta"><a href="${e.url}" target="_blank" rel="noopener noreferrer">詳細ページ</a></div>
    `;
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
}

function applyFiltersAndRender(options = {}) {
  const autoFit = options.autoFit === true;
  let baseItems = lastFetchedItems.slice();
  renderWardFilters(countByWard(baseItems));
  let items = baseItems;
  items = items
    .filter((e) => {
      const ward = getWardLabel(e);
      return !ward || selectedWards.has(ward);
    });
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter((e) => {
      const hay = `${e.title || ""} ${e.venue_name || ""} ${e.address || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const rawSummary = summarizeBySource(lastFetchedItems);
  const shownSummary = summarizeBySource(items);
  const warning = lastWarningText ? ` / ${lastWarningText}` : "";
  dateEl.textContent = `${lastDateText} (JST) のイベント ${lastFetchedItems.length}件取得 / キャッシュ表示`;
  setStatus(`表示件数: ${items.length}/${lastFetchedItems.length}件 / 取得内訳: ${rawSummary} / 表示内訳: ${shownSummary}${warning}`);
  render(items, { autoFit });
}

async function loadEvents(forceRefresh = false) {
  const days = Number(document.getElementById("days").value || 30);

  setStatus("実データ取得中...");
  const refreshPart = forceRefresh ? "&refresh=1" : "";
  const url = `/api/events?days=${encodeURIComponent(days)}${refreshPart}`;

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
document.getElementById("reloadBtn").addEventListener("click", () => loadEvents(false));
loadEvents();
