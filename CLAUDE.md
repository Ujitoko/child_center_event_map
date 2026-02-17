# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web app that aggregates children's/family events across Tokyo's 23 wards and displays them on an interactive Leaflet.js map. Events are scraped from municipal ward websites, geocoded via GSI (国土地理院) API, and served through a Node.js HTTP server.

**Language:** Japanese (UI, data, comments). All event data is in Japanese.

## Commands

```bash
npm start          # Start server at http://localhost:8787 (PORT env to override)
```

No build step, no test suite, no linter. Pure Node.js (CommonJS) with vanilla JavaScript frontend. No external npm dependencies.

## Architecture

### Server (server.js + src/)

`server.js` (~115 lines) is a thin wiring layer: it creates mutable state objects, instantiates factory modules via DI, and starts the HTTP server. All business logic lives in `src/`.

**Dependency injection pattern:** Factory functions (`createXxx(deps)`) are used **only** for modules that need mutable state (geoCache, facilityMaster, cache) or runtime-wired functions (geocodeForWard, resolveEventPoint). Pure utility functions are imported directly via `require()`.

**Data flow:**
1. `events-service.js` orchestrates parallel collection from 8 collector groups (7 ward-specific + `additional-wards.js` handling 16 more wards)
2. Each collector scrapes HTML from ward calendar pages, extracts events, then geocodes addresses
3. Results are merged, deduplicated by `id` (`source:url:title:dateKey`), sorted by `starts_at`, and cached in memory
4. Cache key is based on `days` parameter; TTL defined by `CACHE_TTL_MS` in `wards.js`

**Module categories:**

| Category | Modules | Pattern |
|---|---|---|
| Pure utilities | `text-utils`, `date-utils`, `html-utils`, `venue-utils`, `address-utils`, `fetch-utils`, `ward-parsing` | Direct `require()` exports |
| Stateful factories | `geo-utils`, `facility-master` | `createXxx(deps)` with mutable state |
| Collectors (ward-specific) | `setagaya`, `ota`, `shinagawa`, `meguro`, `shibuya`, `minato`, `chiyoda` | `createCollectXxx({ geocodeForWard, resolveEventPoint, resolveEventAddress })` |
| Collectors (generic) | `ward-generic`, `chuo-akachan`, `kita`, `additional-wards` | Factory with 3-5 DI deps |
| Orchestrator | `events-service` | Factory with cache + collector deps |
| Config | `wards.js`, `additional-ward-configs.js` | Constants and config builders |

**Key modules:**
- `src/server/text-utils.js` — Japanese text normalization, sanitization (9 functions)
- `src/server/date-utils.js` — JST date parsing, time range extraction (~20 functions)
- `src/server/html-utils.js` — HTML tag stripping, anchor/detail parsing
- `src/server/venue-utils.js` — Venue name inference from titles/URLs
- `src/server/address-utils.js` — Tokyo address extraction from HTML text
- `src/server/fetch-utils.js` — HTTP fetch with UTF-8/Shift-JIS auto-detection, PDF proxy
- `src/server/ward-parsing.js` — Generic ward list/detail page parsing, geocoding candidate builder
- `src/server/facility-master.js` — Facility address/point cache and event address/point resolution
- `src/server/geo-utils.js` — GSI geocoding API, Haversine distance, ward boundary validation
- `src/server/events-service.js` — Aggregation orchestrator
- `src/config/wards.js` — Ward source definitions, regex patterns, constants
- `src/config/additional-ward-configs.js` — Per-ward scraping configs

### Location resolution pipeline

1. `extractTokyoAddress()` / `extractWardAddressFromText()` (address-utils) — Pull addresses from HTML text
2. `sanitizeAddressText()` / `sanitizeGeoQueryText()` (text-utils) — Clean for geocoding
3. `geocodeForWard()` (geo-utils) — Query GSI API with 12s timeout
4. `sanitizeWardPoint()` (geo-utils) — Validate point is within ward radius
5. `resolveEventAddress()` / `resolveEventPoint()` (facility-master) — Cache-aware resolution with facility master lookup

Three in-memory Maps cache results: `geoCache`, `facilityAddressMaster`, `facilityPointMaster`.

### Frontend (public/)

Single-page app: `index.html` + `app.js` + `styles.css`. Uses Leaflet.js (CDN) with OpenStreetMap tiles. No build tools.

- Ward filter checkboxes (23 wards) with bulk select/deselect
- Date range slider (1-90 days)
- Event list panel (max 250 items) + map markers
- Fetches `GET /api/events?days=N`

### API

| Endpoint | Purpose |
|---|---|
| `GET /api/events` | Fetch events (default 30 days) |
| `GET /api/events?days=N` | Custom range 1-90 |
| `GET /api/events?refresh=1` | Force cache refresh |

Response includes `items[]` array with `{id, source, title, starts_at, ends_at, venue_name, address, point: {lat, lng}, url}` and `debug_counts` per ward.

### Caching

- In-memory cache with TTL; snapshot persisted to `data/events_snapshot.json`
- Loaded on startup; background refresh if stale

## Adding a New Ward

1. Add source definition in `src/config/wards.js` (key, label, baseUrl, center coords)
2. Add scraping config in `src/config/additional-ward-configs.js` (listUrls, parseOpts with regex patterns)
3. Wire into `additional-wards.js` and `events-service.js`

## Commit Style

Follow existing pattern: `feat:`, `fix:`, `chore:`, `refactor:` prefixes.
