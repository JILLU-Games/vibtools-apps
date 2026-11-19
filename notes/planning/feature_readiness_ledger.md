# Actual Feature Implementation & Readiness Ledger (Cycle 2 — Baseline v2.0)

> **Document Location:** `notes/planning/feature_readiness_ledger.md`  
> **Baseline Reference:** [`notes/planning/baseline_freeze.md`](./baseline_freeze.md) (`v2.0`, 2026-11-19)  
> **Forensic Audit Source:** [`notes/production_forensic_audit_report.md`](../production_forensic_audit_report.md)  
> **Purpose:** Maintain 100% honest, live-verified tracking of (1) what features are **actually working right now** in the frozen baseline, (2) what features are **added/fixed after each phase**, and (3) what features are **still pending** before 100% production launch.

---

## 1. Master Feature Status Matrix (Baseline v2.0 vs Production Target)

| # | Feature / Capability | Primary File(s) | Actual Status Today (Baseline v2.0) | Blocking Bug(s) | Delivery Phase |
| :-: | :--- | :--- | :---: | :---: | :---: |
| 1 | **Live App Catalog Discovery (`GET /api/apps`)** | `registry.json`, `functions/api/apps.js` | ✅ **Hardened (Phase 1)** (env-gated mock fallback; zero cache poisoning; `X-Catalog-Source`) | None *(populate real repos in `registry.json` at deploy)* | **Phase 1 (Completed)** |
| 2 | **Single App Detail & Docs API (`GET /api/apps?slug=...`)** | `functions/api/apps.js` | ✅ **Actual Working (Phase 2)** (live-only Mode B edge cache `300s` + `X-Cache-Status` + `X-Catalog-Source`) | None | **Phase 2 (Completed)** |
| 3 | **PowerShell CLI Installer (`get.vib.tools/<slug>[/<ver>]`)** | `functions/[[path]].js`, `functions/_lib/mockData.js` | ✅ **Actual Working (Phase 1)** (`$APP_NAME` injected, real `Invoke-WebRequest` + SHA256, `isValidSlug`, `Object.hasOwn`) | None | **Phase 1 (Completed)** |
| 4 | **Direct Binary Download (`get.vib.tools/dl/<slug>[/<ver>]`)** | `functions/[[path]].js` | ✅ **Actual Working (Phase 1)** (`isValidSlug` + `isTrustedDownloadUrl` host allowlist + `403` guard) | None | **Phase 1 (Completed)** |
| 5 | **Malformed URL Resilience (`/%E0%A4%A`)** | `functions/[[path]].js`, `server.js` | ✅ **Actual Working (Phase 1)** (`400 Bad Request`, zero `URIError`) | None | **Phase 1 (Completed)** |
| 6 | **Version Prefix Normalization (`v1.0.3` <-> `1.0.3`)** | `functions/[[path]].js` | ✅ **Actual Working** | None | Baseline |
| 7 | **Browser → Storefront Redirect on `get.vib.tools`** | `functions/[[path]].js` | ✅ **Actual Working (Phase 2)** (works on `/`, `/cli`, `/<slug>`, and `/<slug>/<version>` with `isValidSlug` guard) | None | **Phase 1 & Phase 2 (Completed)** |
| 8 | **Domain Isolation (`apps.vib.tools` vs `get.vib.tools`)** | `functions/api/apps.js`, `functions/[[path]].js` | ✅ **Actual Working (Phase 2)** (`/api/apps` `GET`/`OPTIONS` returns `404` on `get.vib.tools` & `?mode=get`) | None | **Phase 2 (Completed)** |
| 9 | **SPA Reload-Safe Routing (`apps.vib.tools`)** | `functions/[[path]].js` | ✅ **Actual Working (Phase 2)** (single clean `Content-Type`; dot-containing SPA routes like `/category/Node.js` return `200`) | None | **Phase 2 (Completed)** |
| 10 | **GitHub Config Schema Validation & HTTP Method Parity** | `functions/_lib/github.js`, `server.js` | ✅ **Actual Working (Phase 2)** (`validateAppConfig()` deep `422` validation; `server.js` enforces `405` + `Allow: GET, HEAD`) | None | **Phase 2 (Completed)** |
| 11 | **App Catalog Grid, Category Sidebar & Mobile Chips** | `AppGrid.js`, `Sidebar.js`, `appMeta.js` | ✅ **Actual Working** (live counts, `CSS.escape` safe, lazy icons + monogram fallback) | None | Baseline |
| 12 | **License / Access Tier Filter (`All / Free / Paid`)** | `AppGrid.js`, `appMeta.js` | ✅ **Actual Working** | None | Baseline |
| 13 | **Instant Search (`/` shortcut + `?q=` URL sync)** | `Header.js`, `app.js`, `router.js` | ✅ **Actual Working (Phase 3)** (debounce + `?q=` `popstate` restore + full `pathname+search` Logo/`All Apps` reset) | None | **Phase 3 (Completed)** |
| 14 | **Version Selector + Live Download/CLI/Size/Date/SHA256** | `AppDetailView.js`, `appMeta.js` | ✅ **Actual Working (Phase 3)** (`AbortController` + `isConnected` race guard + env-aware local/prod `buildDownloadUrl`) | None | **Phase 3 (Completed)** |
| 15 | **OS (`platforms`) & Architecture (`architectures`) Display** | `AppDetailView.js` | ✅ **Actual Working (Phase 3)** (honest read-only specification rows rendered conditionally from real metadata) | None | **Phase 3 (Completed)** |
| 16 | **SHA256 Expandable (`Full`/`Hide`) & One-Click Copy** | `AppDetailView.js`, `clipboard.js` | ✅ **Actual Working** (Async Clipboard + iframe textarea fallback + Toast) | None | Baseline |
| 17 | **Sanitized Markdown Tabs (`Features` & `Changelog`)** | `AppDetailView.js` | ✅ **Actual Working** (`DOMPurify.sanitize(marked.parse(...))` + `<pre>` fallback) | None | Baseline |
| 18 | **Dual Theme Engine (`Dark` / `Light`) + Toast Feedback** | `theme.js`, `Toast.js`, `Header.js`, `MobileNav.js` | ✅ **Actual Working** | None | Baseline |
| 19 | **Clean Public Deployment Output (`public/`)** | `public/` | ✅ **Actual Working (Phase 3)** (`public/assets/aistudio/`, `"MyWebSite"` `site.webmanifest`, and unused `styles.css` removed; `Modal.js` retained) | None | **Phase 3 (Completed)** |
| 20 | **PWA Service Worker & Full Automated Test Suite** | `public/sw.js`, `package.json`, `*.test.js` | ✅ **Actual Working (Phase 4)** (`vib-apps-hub-v3` with full manifest icon precache + `GET`/HTTP guard; `npm test` runs `29/29` regression tests) | None | **Phase 4 (Completed)** |

---

## 2. Phase-by-Phase Working Feature Progression Record

### Current Frozen Baseline (Before Cycle 2 Phase 1)
- **Fully Working Right Now (7 Core Areas):**
  1. Version prefix normalization (`v1.0.3` <-> `1.0.3`) on `get.vib.tools`.
  2. Catalog grid, responsive cards, icon lazy-loading + monogram fallback, desktop sidebar with live counts, and mobile category chips.
  3. License/Access tier filtering (`All / Free / Paid`).
  4. SHA256 expandable toggle (`Full` / `Hide`) and iframe-safe one-click copy with Toast feedback.
  5. XSS-sanitized Markdown tabs (`Features & Overview` + `Release Changelog`) via Marked.js + DOMPurify.
  6. Conditional screenshots gallery, system requirements, and validated external resource links (`https?://`).
  7. Dual theme engine (`Dark` / `Light`) with `localStorage` persistence and `<meta name="theme-color">` sync.
- **Currently Broken / Partial / Pending (18 Verified Bugs Across 4 Phases):**
  - Mock cache poisoning & missing prod gate (`BUG-01`), broken demo installer `$APP_NAME` (`BUG-02`), `URIError` crash (`BUG-03`), unvalidated `/dl/` redirect host (`BUG-04`), missing `isValidSlug` on `get.vib.tools` (`BUG-05`), uncached Mode B (`BUG-06`), duplicate `Content-Type` (`BUG-07`), versioned browser redirect (`BUG-08`), `/api/apps` leak on `get.vib.tools` (`BUG-09`), dot-route SPA `404` (`BUG-10`), shallow config validation & `405` parity (`BUG-11`), non-functional OS/Arch `<select>` (`BUG-12`), exposed non-runtime `public/` files (`BUG-13`), broken `?q=` `popstate` & Logo reset (`BUG-14`), uncancelled `fetchAppDetail` race (`BUG-15`), hardcoded prod download URL in local dev (`BUG-16`), SW precache/guard gaps (`BUG-17`), incomplete `npm test` (`BUG-18`).

---

### After Phase 1 *(Completed & Verified — 2026-11-19)*
- **Features Upgraded to 100% Actual Working:**
  - Production-safe catalog & fallback isolation (zero mock cache poisoning, explicit `X-Catalog-Source` header, `ENABLE_MOCK_FALLBACK` control, `Cache-Control: no-store` on mock/error responses).
  - Complete, valid PowerShell installer scripts (`$APP_NAME` injected + real `Invoke-WebRequest` + SHA256 verification template).
  - Crash-proof URL decoding (`400 Bad Request` on malformed percent-encoding).
  - Hardened `/dl/` direct downloads restricted to trusted HTTPS hosts (`dl.vib.tools`, GitHub Releases, configurable `ALLOWED_DOWNLOAD_HOSTS`) and strict `isValidSlug()` + `Object.hasOwn()` validation on all `get.vib.tools` routes.
- **Still Remaining After Phase 1:** Phase 2 (`6 bugs`), Phase 3 (`5 bugs`), Phase 4 (`2 bugs`).

---

### After Phase 2 *(Completed & Verified — 2026-11-19)*
- **Features Upgraded to 100% Actual Working:**
  - Full edge caching parity across both Mode A (`/api/apps`) and Mode B (`/api/apps?slug=<slug>`).
  - Clean single `Content-Type: text/html; charset=utf-8` header and dot-safe SPA reload routing (`/category/Node.js`).
  - Complete browser-to-storefront redirection on `get.vib.tools` including versioned URLs (`/<slug>/<version>`).
  - Strict domain isolation (`/api/apps` blocked on `get.vib.tools`).
  - Deep `app.config.json` validation (`422`) and `405 Method Not Allowed` parity in `server.js`.
- **Still Remaining After Phase 2:** Phase 3 (`5 bugs`), Phase 4 (`2 bugs`).

---

### After Phase 3 *(Completed & Verified — 2026-11-19)*
- **Features Upgraded to 100% Actual Working:**
  - 100% truthful App Detail UI (zero non-functional `<select>` boxes; honest read-only platform/architecture metadata rows).
  - Clean `public/` deployment folder (zero leaked design screenshots/PDFs or `"MyWebSite"` placeholder files).
  - Flawless search URL sync across Browser Back/Forward (`popstate`) and Logo / `All Apps` resets from `/?q=...`.
  - Race-free `AppDetailView` async fetching with `AbortController` cleanup.
  - Local dev-aware download link routing while keeping production `https://get.vib.tools/dl/...` untouched.
- **Still Remaining After Phase 3:** Phase 4 (`2 bugs`).

---

### After Phase 4 *(Completed & Verified — 2026-11-19 — Final Target Reached)*
- **Features Upgraded to 100% Actual Working:**
  - Complete PWA manifest/service-worker parity (`vib-apps-hub-v3` with all manifest icons precached + `GET`/HTTP fetch guard).
  - Unified `npm test` running both backend and frontend test suites with full 18-bug automated regression coverage.
- **Still Remaining After Phase 4:** **0 code bugs** *(only operational production onboarding: populate `registry.json` with real published Vib Tools app repositories and set `GITHUB_TOKEN` in Cloudflare Pages secrets)*.
