# Feature Readiness & Implementation Ledger

> **Document Location:** `notes/planning/feature_readiness_ledger.md`  
> **Purpose:** Tracking real actual working features versus pending/incomplete features across implementation phases.

---

## 1. Feature Status Matrix (Current Baseline vs Target)

| Feature / Capability | Subsystem | Current Status (Baseline) | Target Status | Delivery Phase |
| :--- | :--- | :---: | :---: | :---: |
| **Edge CLI Quickstart (irm get.vib.tools \| iex)** | `functions/[[path]].js` | ✅ Working (Static usage text) | ✅ Production Ready | Baseline |
| **PowerShell Installer Streaming** | `functions/[[path]].js` | ✅ Working (With Live Repo & Mock Fallback) | ✅ Production Ready | Phase 1 (Completed) |
| **Binary Download 302 Redirect (/dl/<slug>)** | `functions/[[path]].js` | ✅ Working (With Live Repo & Mock Fallback) | ✅ Production Ready | Phase 1 (Completed) |
| **Version Prefix Normalization (v1.0.3 vs 1.0.3)** | `functions/[[path]].js` | ✅ Working (Flexible semver resolver) | ✅ Production Ready | Phase 2 (Completed) |
| **Browser Redirect on get.vib.tools** | `functions/[[path]].js` | ✅ Working (Redirects /, /cli, /<slug> to apps.vib.tools) | ✅ Production Ready | Phase 2 (Completed) |
| **Store Catalog API (/api/apps)** | `functions/api/apps.js` | ✅ Working (With Live Repo & Mock Fallback) | ✅ Production Ready | Phase 1 (Completed) |
| **Store API CORS Header** | `functions/api/apps.js` | ✅ Working (CORS * and OPTIONS 204) | ✅ Production Ready | Phase 2 (Completed) |
| **Store API Edge Aggregation Cache** | `functions/api/apps.js` | ✅ Working (Cloudflare caches.default 300s TTL) | ✅ Production Ready | Phase 4 (Completed) |
| **App Grid Catalog Display** | `public/components/sections/AppGrid.js` | ✅ Working (Populated via fallback/live) | ✅ Production Ready | Phase 1 (Completed) |
| **App Icon Display on Cards** | `public/components/sections/AppGrid.js` | ✅ Working (Lazy img + fallback SVG) | ✅ Production Ready | Phase 3 (Completed) |
| **App Icon Display on Detail Header** | `public/components/sections/AppDetailView.js` | ✅ Working (Lazy img + fallback SVG) | ✅ Production Ready | Phase 3 (Completed) |
| **Version Selector & Live PS Script** | `public/components/sections/AppDetailView.js` | ✅ Working | ✅ Production Ready | Baseline |
| **Sanitized Markdown Tabs (Features & Changelog)** | `public/components/sections/AppDetailView.js` | ✅ Working (DOMPurify protected) | ✅ Production Ready | Baseline |
| **Desktop Category Browsing (Sidebar)** | `public/components/layout/Sidebar.js` | ✅ Working (CSS.escape safe) | ✅ Production Ready | Baseline |
| **Mobile Category Browsing** | `public/components/sections/AppGrid.js` | ✅ Working (Horizontal scrollable chips) | ✅ Production Ready | Phase 3 (Completed) |
| **Global Search Filter** | `public/components/layout/Header.js` | ✅ Working (150ms debounce + replaceState) | ✅ Production Ready | Phase 3 (Completed) |
| **Keyboard Shortcut ('/' to search)** | `public/components/layout/Header.js` | ✅ Working (Modal focus guarded) | ✅ Production Ready | Phase 3 (Completed) |
| **Dual Theme Switcher (Dark / Light)** | `public/lib/theme.js` | ✅ Working (localStorage + dynamic meta) | ✅ Production Ready | Baseline |
| **PWA Offline Shell & Service Worker** | `public/sw.js` | ✅ Working (Stale-while-revalidate) | ✅ Production Ready | Baseline |
| **Dynamic Browser Tab Title (document.title)** | `public/app.js` | ✅ Working (Contextual route tab titles) | ✅ Production Ready | Phase 4 (Completed) |
| **PWA Manifest Web URL Icon** | `public/manifest.json` | ✅ Working (Standard static /icons/icon.svg) | ✅ Production Ready | Phase 4 (Completed) |

---

## 2. Phase-by-Phase Working Feature Progression

### A. Current Baseline (Before Phase 1)
- **Currently Actual Working:**
  - Zero-build Single Page Application mounted on `#app`.
  - Client SPA routing across `/`, `/cli`, `/category/:name`, `/app/:slug` with browser back/forward support.
  - SPA reload fallback to `/index.html` via Cloudflare Pages Function.
  - Dual theme engine (Dark `#0d1117` / Light `#ffffff`) persisting to `localStorage`.
  - Terminal quickstart manual at `get.vib.tools` root for CLI callers.
  - Toast notifications system.
  - Markdown parser with DOMPurify sanitization.
- **Deficiencies:**
  - Entire app catalog is blank when running locally or without active GitHub repositories.
  - No icons on cards or detail headers.
  - Mobile users cannot browse categories.

### B. After Phase 1 (Target State)
- **New Working Features Added:**
  - **Offline/Local Resilience Engine:** App catalog immediately shows 3 realistic sample apps (`CalGrid`, `DevPrompt`, `VibClip`) when GitHub repositories are offline, unconfigured, or rate-limited.
  - **Local CLI Simulation:** `irm get.vib.tools/calgrid | iex` streams real mock installer script locally.
  - **Local Download Simulation:** `/dl/calgrid` issues real 302 redirect.

### C. After Phase 2 (Target State)
- **New Working Features Added:**
  - **CLI Version Flexibility:** `irm get.vib.tools/calgrid/1.0.3 | iex` works identically to `v1.0.3`.
  - **Human Web Redirects:** Browsing to `get.vib.tools/calgrid` or `get.vib.tools/cli` automatically redirects human visitors to the visual web store (`apps.vib.tools/app/calgrid` and `apps.vib.tools/cli`).
  - **Cross-Origin API:** Any web or CLI client can query `/api/apps` via CORS.

### D. After Phase 3 (Target State)
- **New Working Features Added:**
  - **Visual Iconography:** High-resolution vector/image icons rendered on all cards and detail views.
  - **Mobile Category Navigation:** Mobile users can filter by category seamlessly.
  - **Clean Search Navigation:** Instant search with 150ms debounce; no history stack pollution on inner views.
  - **Defensive DOM:** Category selection protected against `DOMException`.

### E. After Phase 4 (Final Production Target State)
- **New Working Features Added:**
  - **Dynamic Tab Metadata:** Browser tab title updates on every route (e.g. `CalGrid — Vib Apps`).
  - **Edge Aggregation Caching:** Fast, rate-limit-immune `/api/apps` responses served from Cloudflare cache.
  - **Standard PWA Icon:** Native PWA installability passing 100% of Chromium and Lighthouse checks.
