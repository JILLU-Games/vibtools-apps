# Cycle 2 — Phase 3 Execution Log (`BUG-12` to `BUG-16`)

> **Date:** 2026-11-19  
> **Phase:** Cycle 2 — Phase 3: Frontend Real Functionality, SPA State & Public Asset Hygiene  
> **Status:** ✅ Completed, Audited & Browser-Verified  
> **Baseline Reference:** [`notes/planning/baseline_freeze.md`](../planning/baseline_freeze.md) (`v2.0`)  
> **Specification Reference:** [`notes/planning/phase_implementation_specs.md`](../planning/phase_implementation_specs.md)

---

## 1. Strict Scope Lock Audit

| File Path | Action | Scope Lock Status |
| :--- | :---: | :---: |
| `public/components/sections/AppDetailView.js` | Modified | ✅ Allowed (1/8) |
| `public/lib/api.js` | Modified | ✅ Allowed (2/8) |
| `public/lib/router.js` | Modified | ✅ Allowed (3/8) |
| `public/lib/appMeta.js` | Modified | ✅ Allowed (4/8) |
| `public/app.js` | Modified | ✅ Allowed (5/8) |
| `public/styles.css` | Deleted | ✅ Allowed (6/8) |
| `public/vib.tools.Branding/site.webmanifest` | Deleted | ✅ Allowed (7/8) |
| `public/assets/aistudio/` (and now-empty `public/assets/`) | Deleted | ✅ Allowed (8/8) |

- **Zero Scope Creep Confirmed:** No files in `functions/`, `server.js`, `registry.json`, `wrangler.toml`, `package.json`, `public/sw.js`, `public/styles/tokens.css`, `public/components/layout/*`, or `public/components/ui/*` were modified (`public/components/ui/Modal.js` retained intact as documented primitive).

---

## 2. Implemented Fixes Summary

1. **`BUG-12` (`public/components/sections/AppDetailView.js`):**
   - Removed non-functional `#app-platform-select` and `#app-arch-select` `<select>` dropdowns that had zero `change` listeners.
   - Added truthful read-only `<dl>` metadata specification rows (`Platforms` with `"monitor"` icon, `Architecture` with `"cpu"` icon, joined with `" · "`) inside `metaList`, rendered conditionally only when real metadata arrays are present.
2. **`BUG-13` (`public/` asset hygiene):**
   - Verified zero runtime references across `public/`, `functions/`, and `server.js` via `grep`.
   - Removed `public/assets/aistudio/` (20 exposed design reference files + empty `public/assets/`), `public/vib.tools.Branding/site.webmanifest` (`"MyWebSite"` placeholder), and unused `public/styles.css`.
   - Retained `public/components/ui/Modal.js`.
3. **`BUG-14` (`public/lib/router.js`, `public/app.js`):**
   - Updated `navigate(path)` to compare full `${window.location.pathname}${window.location.search}` against `path`, fixing Logo and `All Apps` clicks from `/?q=...`.
   - Updated `onRouteChange()` in `public/app.js` to clear pending search debounce timers and restore `?q=` via `layout.setSearchValue(urlQuery)` on Home/Category views (fixing Browser Back/Forward `popstate` desync).
4. **`BUG-15` (`public/lib/api.js`, `public/components/sections/AppDetailView.js`, `public/app.js`):**
   - Added optional `{ signal }` support to `fetchAppDetail(slug, { signal } = {})` with clean `AbortError` passthrough.
   - Created `AbortController` in `AppDetailView()`, exposed `container.cleanup = () => controller.abort()`, and guarded both `.then()` and `.catch()` with `controller.signal.aborted || !container.isConnected`.
   - Tracked and invoked `activeViewCleanup?.()` at the start of `renderCurrentView()` in `public/app.js`.
5. **`BUG-16` (`public/lib/appMeta.js`):**
   - Updated `buildDownloadUrl(slug, version, options = {})` to return `${runtimeLoc.origin}/dl/<slug>/<version>?mode=get` when `hostname` is `localhost` or `127.0.0.1`, while preserving `https://get.vib.tools/dl/<slug>/<version>` as default for production `apps.vib.tools` and non-browser unit tests.

---

## 3. Verification & Browser Audit Results

| Verification Check | Command / Tool | Result |
| :--- | :--- | :---: |
| Existing Automated Test Suite | `node --test server.test.js public/lib/appMeta.test.js` | **12 / 12 PASS** |
| Syntax Check (All 5 Modified Frontend Modules) | `node --check ...` | **PASS** |
| Production Build & Lint | `compile_applet` + `lint_applet` | **PASS** |
| Dev Server Restart | `restart_dev_server` | **PASS** |
| Phase 3 Node/HTTP Logic Probes | `buildDownloadUrl` (prod/localhost/127.0.0.1), deleted asset checks, local `302` `/dl/` | **PASS** |
| Live Chromium Browser Verification (`1440×900`) | `playwright-cli` across all 3 Phase 3 user journeys + desktop visual inspection (`p3-r1-home-desktop.png`, `p3-r2-detail-desktop.png`, `p3-r4-detail-platforms.png`) | **25 / 25 PASS** |

- **Playwright Verified Scenarios (25/25):**
  - Search `"cal"` → URL syncs to `/?q=cal`, filters to `1` card (`CalGrid`).
  - Logo click → resets URL to `/`, clears search input, restores all `3` cards.
  - Browser Back (`popstate`) → restores `/?q=cal`, `"cal"` in search input, and `1` filtered card.
  - `All Apps` click → resets `/?q=cal` to `/` and clears search input.
  - `/app/calgrid` → zero `#app-platform-select`/`#app-arch-select`, clean read-only `Platforms` (`Windows 11 · Windows 10`) & `Architecture` (`x64 · ARM64`) rows when provided, hidden cleanly when absent.
  - Download button `href` routes to `http://localhost:3000/dl/calgrid/v1.0.3?mode=get` and dynamically updates to `v1.0.2` (alongside CLI command) on version change.
  - Rapid navigation from delayed `/app/devprompt` → `/cli` preserves `"CLI Guide — Vib Apps"`, zero stale detail DOM, zero error toasts.
  - Deleted assets (`/styles.css`, `/vib.tools.Branding/site.webmanifest`, `/assets/aistudio/*.pdf`, `/assets/aistudio/*.png`) all return `404`.
  - Zero JavaScript runtime errors in console.
