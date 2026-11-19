# Production Readiness & Backend Engine Forensic Audit Report

> **Audit Target:** `vib-apps-hub` (`apps.vib.tools` & `get.vib.tools`)  
> **Audit Date:** 2026-11-19  
> **Audit Methodology:** 100% Direct Source Code Inspection + Live Runtime Edge Probing (`handleEdgeRequest` in `server.js`)  
> **Evidence Policy:** Zero assumptions, zero reliance on existing Markdown docs. Every finding below cites exact file paths, line numbers, literal source code, and observed runtime outputs.

---

## 1. Executive Audit Summary

| Metric | Count |
| :--- | :---: |
| **Executable Source & Config Files Audited** | **43 files** (`functions/` 4, `public/` 33 code/style/manifest files, root 6: `server.js`, `server.test.js`, `package.json`, `wrangler.toml`, `registry.json`, `metadata.json`) |
| **Live Runtime Edge Probes Executed** | **21 HTTP request probes** against `handleEdgeRequest()` |
| **Total Verified Bugs, Gaps & Production Blockers Found** | **18** |
| — **Critical (Production Blockers / Crashes / Broken Demo Engine)** | **3** (`BUG-01`, `BUG-02`, `BUG-03`) |
| — **High (Security / Non-Functional UI / Edge Caching)** | **4** (`BUG-04`, `BUG-05`, `BUG-06`, `BUG-12`) |
| — **Medium (Routing / Header / SPA State / Validation / Dead Code)** | **9** (`BUG-07`, `BUG-08`, `BUG-09`, `BUG-10`, `BUG-11`, `BUG-13`, `BUG-14`, `BUG-15`, `BUG-16`) |
| — **Low (PWA Precache & Test Runner Coverage)** | **2** (`BUG-17`, `BUG-18`) |

**Production Verdict:** **NOT READY FOR PRODUCTION RELEASE AS-IS.**  
The storefront UI, routing skeleton, and GitHub API client are well-structured, **but** live production traffic will currently serve hardcoded demo apps (`CalGrid`, `DevPrompt`, `VibClip`) due to a placeholder `registry.json` and unguarded mock fallback caching, uncaught `URIError` crashes exist on malformed URLs, conditional OS/Architecture dropdowns are visually interactive but wired to nothing, and several edge-router/SPA edge cases fail under real-world inputs.

---

## 2. Real Production vs. Demo-Only Feature Verification Matrix

Every feature in the codebase was traced end-to-end from UI trigger → client library → edge handler → upstream source:

| # | Feature | Works in Demo Mode? | Works in Real Production? | Verified Status & Exact Evidence |
| :-: | :--- | :---: | :---: | :--- |
| 1 | **Live App Catalog Discovery (`GET /api/apps`)** | Yes (`mockData.js`) | **Blocked (Demo Only Right Now)** | `registry.json:1–8` only has placeholder `vib-tools/example-app`. Live fetch 404s → `functions/api/apps.js:151–154` silently serves 3 mock apps and caches them for `300s` (`BUG-01`). |
| 2 | **Single App Detail & Markdown Docs (`GET /api/apps?slug=...`)** | Yes (`mockData.js`) | **Partial** | Works for valid live repos (`functions/api/apps.js:56–65`), but has no Mode B edge cache (`BUG-06`) and falls back silently to mock apps on any live lookup miss (`functions/api/apps.js:68–76`). |
| 3 | **PowerShell CLI Installer (`get.vib.tools/<slug>[/<ver>]`)** | **Broken in Demo** | **Works for Real Repos** | Real repos stream `.vibtools/installer.ps1` with `$APP_SLUG` & `$APP_VERSION`. Demo scripts in `functions/_lib/mockData.js:40–52,106–117,161–172` reference uninjected `$APP_NAME` and contain no download/install code (`BUG-02`). |
| 4 | **Direct Binary Download (`get.vib.tools/dl/<slug>[/<ver>]`)** | Redirects to unverified `dl.vib.tools` URLs | **Works (With Security Gap)** | Returns `302` to `versions.<ver>.url` (`functions/[[path]].js:224`), but lacks trusted host allowlist (`BUG-04`) and slug regex check (`BUG-05`). |
| 5 | **Browser → Storefront Redirect on `get.vib.tools`** | Partial | **Broken for Versioned URLs** | Works on `/`, `/cli`, `/<slug>`, but fails on `/<slug>/<version>` (`segments.length === 2`), dumping raw PowerShell text into browsers (`BUG-08`). |
| 6 | **SPA Reload-Safe Routing (`apps.vib.tools`)** | Partial | **Partial** | Works for `/app/calgrid`, `/category/utilities`, `/cli`, but returns duplicate `Content-Type` header (`BUG-07`) and 404s on slugs/categories containing `.` (`BUG-10`). |
| 7 | **Instant Search (`/` shortcut + `?q=` URL sync)** | Partial | **Partial** | Debounced search works (`public/app.js:51–62`), but Browser Back (`popstate`) fails to restore `?q=` into input/state and clicking Logo / `All Apps` while on `/?q=...` fails to reset (`BUG-14`). |
| 8 | **Category Sidebar, Live Counts & Mobile Chips** | Yes | **Yes** | `computeCategoryCounts()` (`public/lib/appMeta.js:191–210`), `Sidebar.js:127–205`, and `AppGrid.js:161–187` derive categories purely from loaded catalog data. |
| 9 | **License Tier Filter (`All / Free / Paid`)** | Yes | **Yes** | `AppGrid.js:193–219` + `filterApps()` (`public/lib/appMeta.js:164–169`). *(Note: all 3 mock apps are `"Free"`, so `"Paid"` always yields empty state in demo mode.)* |
| 10 | **Version Selector & Live Download/CLI/Metadata Sync** | Yes | **Yes** | `AppDetailView.js:284–312,553–619` dynamically updates Download `href`, CLI command, date, package format, size, and SHA256. |
| 11 | **Operating System (`platforms`) & Architecture (`architectures`) Selectors** | Hidden in Demo (fields absent) | **Visible But Non-Functional** | `AppDetailView.js:315–358` renders `<select>` elements with **zero `change` listeners** and zero effect on download URL or CLI command (`BUG-12`). |
| 12 | **SHA256 Expandable (`Full`/`Hide`) & One-Click Copy** | Yes | **Yes** | `AppDetailView.js:464–551` + `public/lib/clipboard.js:9–36` (Async Clipboard API + iframe-safe hidden textarea fallback). |
| 13 | **Sanitized Markdown Tabs (`Features` & `Changelog`)** | Yes | **Yes (Degrades Offline)** | `AppDetailView.js:54–62` uses `DOMPurify.sanitize(marked.parse(rawMd))` with `<pre>` textContent fallback if CDN unavailable. |
| 14 | **Conditional Screenshots, Requirements & Links** | Hidden in Demo | **Yes** | `AppDetailView.js:693–790` renders only when real array/object data exists; validates `links` with `/^https?:\/\//i`. |
| 15 | **Dual Theme (Dark / Light) + Persistence** | Yes | **Yes** | `public/lib/theme.js:7–71` persists `vib_theme` in `localStorage`, updates `[data-theme]` & `<meta name="theme-color">`, syncs Header + MobileNav. |
| 16 | **Toast Notifications** | Yes | **Yes** | `public/components/ui/Toast.js:23–100` (`success`, `error`, `info`, click-to-dismiss, responsive mobile top-center placement). |
| 17 | **Modal Dialog Component (`Modal.js`)** | Unused | **Unused** | `public/components/ui/Modal.js` is exported (`ui/index.js:11`) and checked in `Header.js:74`, but zero views call `openModal()` (`BUG-13`). |
| 18 | **PWA Manifest & Service Worker (`vib-apps-hub-v2`)** | Partial | **Partial** | Precaches 33 assets (`public/sw.js:7–40`), but misses 3 manifest icons and external CDN scripts (`BUG-17`). |

---

## 3. Detailed Forensic Bug & Engine Discrepancy Catalog

Every finding below is backed by direct code excerpts and verified behavior.

---

### Category A — Critical Production Blockers, Demo Leakage & Runtime Crashes

#### `BUG-01` [CRITICAL] — Placeholder `registry.json` + Unguarded Production Mock Fallback & Edge Cache Poisoning
- **Files & Lines:**
  - `registry.json:1–8`
  - `functions/api/apps.js:68–76`, `150–180`
  - `functions/[[path]].js:185–190`, `252–259`
- **Source Code Evidence:**
  ```json
  // registry.json:1-8
  [
    {
      "slug": "example-app",
      "repo": "vib-tools/example-app",
      "branch": "main",
      "featured": true
    }
  ]
  ```
  ```js
  // functions/api/apps.js:150-180
  if (apps.length === 0) {
    const mockApps = getMockApps();
    apps.push(...mockApps);
  }
  const payloadText = JSON.stringify({ apps, count: apps.length });
  // 2. Store aggregated catalog in Edge Cache with 300s TTL
  if (cache) {
    ...
    context.waitUntil(cache.put(cacheKey, cacheResponse));
  }
  ```
- **Runtime Proof:**
  - Probe #1 (`GET /api/apps`): `[Store API] Skipping app 'example-app' (vib-tools/example-app): File '.vibtools/apps/app.config.json' not found` → returned `200 OK` with `calgrid`, `devprompt`, `vibclip`, `X-Cache-Status: MISS`.
  - Probe #2 (`GET /api/apps`): Returned the **cached mock payload** with `X-Cache-Status: HIT`.
- **Production Impact:**
  1. Deploying right now serves 3 fake demo applications (`CalGrid`, `DevPrompt`, `VibClip`) on live `apps.vib.tools` and `get.vib.tools`.
  2. Even after real apps are added to `registry.json`, any transient GitHub outage or expired `GITHUB_TOKEN` causes `apps.length === 0`, which writes the fake demo catalog into Cloudflare's global edge cache (`caches.default`) for **5 full minutes (`max-age=300`)** with no `X-Catalog-Source` indicator and no environment switch to disable mock fallback in production.

---

#### `BUG-02` [CRITICAL] — Demo PowerShell Installer Scripts Reference Undefined `$APP_NAME` & Contain No Real Download Logic
- **Files & Lines:**
  - `functions/[[path]].js:292`
  - `functions/_lib/mockData.js:40–52`, `106–117`, `161–172`
- **Source Code Evidence:**
  ```js
  // functions/[[path]].js:292
  const injectedHeader = `$APP_SLUG = "${safeSlug}"\r\n$APP_VERSION = "${safeVersion}"\r\n\r\n`;
  ```
  ```powershell
  # functions/_lib/mockData.js:40-52
  $ErrorActionPreference = 'Stop'
  Write-Host "Installing $APP_NAME ($APP_VERSION)..." -ForegroundColor Cyan

  $InstallDir = "$env:LOCALAPPDATA\Programs\$APP_SLUG"
  if (-not (Test-Path $InstallDir)) {
      New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  }

  Write-Host "Downloading $APP_NAME from https://get.vib.tools/dl/$APP_SLUG/$APP_VERSION..."
  # Binary extraction and desktop shortcut creation logic
  Write-Host "$APP_NAME installation complete!" -ForegroundColor Green
  ```
- **Runtime Proof:** Probe #6 (`GET http://get.vib.tools/calgrid`) returned `$APP_SLUG = "calgrid"\r\n$APP_VERSION = "v1.0.3"\r\n\r\n# CalGrid Automated PowerShell Installer...` — `$APP_NAME` is never defined anywhere in the header or body, and no `Invoke-WebRequest` call exists.
- **Production Impact:** Anyone testing the CLI installer in demo mode gets broken output (`Installing  (v1.0.3)...`) and a fake "installation complete!" message with an empty directory. Also misleads developers inspecting demo output into thinking `$APP_NAME` is injected by the edge router.

---

#### `BUG-03` [CRITICAL] — Uncaught `URIError: URI malformed` Crashes Both `functions/[[path]].js` and `server.js`
- **Files & Lines:**
  - `functions/[[path]].js:104`
  - `server.js:75`
- **Source Code Evidence:**
  ```js
  // functions/[[path]].js:104
  const segments = cleanPath ? cleanPath.split("/").map((s) => decodeURIComponent(s).trim()) : [];
  ```
  ```js
  // server.js:75
  let pathname = decodeURIComponent(parsedUrl.pathname);
  ```
- **Runtime Proof:**
  - `handleEdgeRequest(new Request("http://get.vib.tools/%E0%A4%A"))` → **THREW UNCAUGHT `URIError: URI malformed`**.
  - `handleEdgeRequest(new Request("http://apps.vib.tools/%E0%A4%A"))` → **THREW UNCAUGHT `URIError: URI malformed`**.
- **Production Impact:** Any malformed percent-encoded URL (from bots, crawlers, or typos) crashes the Cloudflare Worker with an unhandled exception (`500`/`1101` Worker Exception) instead of returning `400 Bad Request`.

---

### Category B — High-Severity Security, Caching & Non-Functional UI Bugs

#### `BUG-04` [HIGH] — `/dl/` Open-Redirect Validation Only Checks `startsWith("https://")` (No Trusted Host Allowlist)
- **Files & Lines:** `functions/[[path]].js:211–224`
- **Source Code Evidence:**
  ```js
  const downloadUrl = resolved.versionData.url;

  // Validate that download URL exists and is a valid https:// endpoint
  if (typeof downloadUrl !== "string" || !downloadUrl.startsWith("https://")) {
    return new Response(`Invalid download URL configured for app '${slug}'.\n`, {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  return Response.redirect(downloadUrl, 302);
  ```
- **Production Impact:** Does not parse with `new URL()` or enforce a trusted host allowlist (such as `dl.vib.tools` or configured R2/GitHub Release hosts). If any registered repo config is compromised or misconfigured, `get.vib.tools/dl/<slug>` acts as an open redirect to arbitrary external `https://` domains (or fails with uncaught `TypeError` in `Response.redirect()` if `downloadUrl` is `"https://"` with invalid host syntax).

---

#### `BUG-05` [HIGH] — `get.vib.tools` Routes Skip `isValidSlug()` Validation Before Processing & Redirecting
- **Files & Lines:** `functions/[[path]].js:1–5`, `117–119`, `165–197`, `231–266`
- **Source Code Evidence:**
  ```js
  // functions/[[path]].js:1-5 — isValidSlug is NOT imported
  import {
    findAppEntry,
    fetchAppConfig,
    fetchAppInstaller
  } from "./_lib/github.js";

  // functions/[[path]].js:117-119
  if (segments.length === 1 && segments[0] !== "dl") {
    return Response.redirect(`https://apps.vib.tools/app/${encodeURIComponent(segments[0])}`, 302);
  }
  ```
- **Runtime Proof:**
  - Probe #11 (`GET http://get.vib.tools/dl/..%2Fetc`): returned `404 App '../etc' was not found in registry.` (reflects raw unsanitized path segment in plain text instead of rejecting with `400 Bad Request`).
  - Probe #16 (`GET http://get.vib.tools/nonexistent` with `Accept: text/html`): blindly returned `302` to `https://apps.vib.tools/app/nonexistent` without validating slug format.

---

#### `BUG-06` [HIGH] — Mode B (`GET /api/apps?slug=<slug>`) Lacks Response-Level Edge Caching
- **Files & Lines:** `functions/api/apps.js:39–98` (vs Mode A at `101–188`)
- **Source Code Evidence:** Mode B immediately runs `findAppEntry()` → `fetchAppConfig()` → `Promise.all([fetchAppDoc(features), fetchAppDoc(changelog)])` and builds a fresh JSON `Response` without checking `caches.default` or setting `X-Cache-Status`.
- **Runtime Proof:** Probe #3 (`GET /api/apps?slug=calgrid`) returned `x-cache=null` on every call, whereas Probe #2 (`GET /api/apps`) returned `x-cache=HIT`.
- **Production Impact:** High-traffic detail pages (`/app/<slug>`) repeat 3 per-file cache reads and JSON serialization on every edge hit instead of serving a cached Mode B response directly from `caches.default`.

---

#### `BUG-12` [HIGH] — Visible `Operating System` & `Architecture` Dropdowns in `AppDetailView.js` Are Completely Non-Functional
- **Files & Lines:** `public/components/sections/AppDetailView.js:315–358`
- **Source Code Evidence:**
  ```js
  // public/components/sections/AppDetailView.js:315-358
  if (Array.isArray(app.platforms) && app.platforms.length > 0) {
    ...
    const platSelect = document.createElement("select");
    platSelect.id = "app-platform-select";
    platSelect.className = "app-detail__select";
    app.platforms.forEach((plat) => {
      const opt = document.createElement("option");
      opt.value = String(plat);
      opt.textContent = String(plat);
      platSelect.appendChild(opt);
    });
    platField.appendChild(platSelect);
    installCard.appendChild(platField);
  }

  if (Array.isArray(app.architectures) && app.architectures.length > 0) {
    ...
    const archSelect = document.createElement("select");
    archSelect.id = "app-arch-select";
    ...
  }
  ```
- **Forensic Proof:** Neither `platSelect` nor `archSelect` is referenced anywhere below line `358`. Zero `addEventListener("change", ...)` calls exist, and `buildDownloadUrl(app.slug, ver)` (`line 560`) and `buildInstallCommand(app.slug, ver, app.latest)` (`line 570`) ignore both controls completely.
- **Production Impact:** Any production app that declares `platforms: ["Windows", "macOS"]` or `architectures: ["x64", "arm64"]` renders interactive `<select>` controls that mislead users—selecting `arm64` or `macOS` still downloads the single default `versions.<ver>.url` binary.

---

### Category C — Medium-Severity Edge Routing, Header, SPA State & Validation Bugs

#### `BUG-07` [MEDIUM] — SPA Fallback Emits Duplicate `Content-Type` Header (`text/html; charset=utf-8, text/html; charset=utf-8`)
- **Files & Lines:** `functions/[[path]].js:88–94`
- **Source Code Evidence:**
  ```js
  return new Response(indexRes.body, {
    status: 200,
    headers: {
      ...Object.fromEntries(indexRes.headers.entries()),
      "Content-Type": "text/html; charset=utf-8"
    }
  });
  ```
- **Runtime Proof:** Probe #13 (`GET http://apps.vib.tools/category/Developer%20Tools`) and Probe #15 (`GET http://apps.vib.tools/unknown/deep/route`) returned:
  `ct=text/html; charset=utf-8, text/html; charset=utf-8`.
- **Root Cause:** `indexRes.headers.entries()` produces lowercase key `"content-type"`. Merging PascalCase `"Content-Type"` puts both keys on the JS object, so `new Headers(...)` appends both values with a comma instead of overwriting.

---

#### `BUG-08` [MEDIUM] — Browser Visiting `get.vib.tools/<slug>/<version>` Dumps Raw PowerShell Script Instead of Redirecting to Storefront
- **Files & Lines:** `functions/[[path]].js:110–120`
- **Source Code Evidence:**
  ```js
  if (isHtml) {
    if (segments.length === 0) return Response.redirect("https://apps.vib.tools", 302);
    if (segments[0] === "cli") return Response.redirect("https://apps.vib.tools/cli", 302);
    if (segments.length === 1 && segments[0] !== "dl") {
      return Response.redirect(`https://apps.vib.tools/app/${encodeURIComponent(segments[0])}`, 302);
    }
  }
  ```
- **Runtime Proof:** Probe #8 (`GET http://get.vib.tools/calgrid/1.0.3` with `Accept: text/html`) returned `status=200 ct=text/plain` raw PowerShell script instead of redirecting to `https://apps.vib.tools/app/calgrid`.

---

#### `BUG-09` [MEDIUM] — `/api/apps` Endpoint Leaks on `get.vib.tools` Hostname
- **Files & Lines:** `functions/api/apps.js:24–36` & `server.js:142–153`
- **Source Code Evidence:** `functions/api/apps.js` never inspects the `Host` header, and in Cloudflare Pages Functions (as well as `server.js:142`), `/api/apps` matches before wildcard `[[path]].js`.
- **Runtime Proof:** Probe #12 (`GET http://get.vib.tools/api/apps`) returned `200 OK` JSON catalog on the CLI-only domain.

---

#### `BUG-10` [MEDIUM] — SPA Reload Fallback Returns `404` for Any Route Segment Containing a Dot (`.`)
- **Files & Lines:** `functions/[[path]].js:82`
- **Source Code Evidence:**
  ```js
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(pathname);
  ```
- **Runtime Proof:** Probe #14 (`GET http://apps.vib.tools/app/my.app` with `Accept: text/html`) returned `404 Not Found`. While `isValidSlug` currently disallows dots, any category containing a version/dot (e.g., `/category/.NET` or `/category/Node.js`) fails on browser reload with `404`.

---

#### `BUG-11` [MEDIUM] — Shallow `fetchAppConfig()` Validation & Non-GET Method Leakage in `server.js`
- **Files & Lines:** `functions/_lib/github.js:229–237`, `server.js:155–156`
- **Source Code Evidence:**
  ```js
  // functions/_lib/github.js:229-237
  const required = ["slug", "name", "latest", "versions"];
  const missing = required.filter((field) => !config[field]);
  ```
  - Does not verify `typeof config.versions === "object" && !Array.isArray(config.versions)`, nor that `config.versions` has at least one entry or matches `config.latest`.
  - `server.js:156` routes non-`GET` methods (e.g., `POST`, `PUT`, `DELETE`) into `wildcardGet(context)` (Probe #18: `POST http://get.vib.tools/calgrid` returned `200 OK` instead of `405 Method Not Allowed`), creating a parity mismatch with Cloudflare Pages Functions.

---

#### `BUG-13` [MEDIUM] — Implemented-But-Unused `Modal.js` Primitive & Publicly Exposed Legacy/Placeholder Assets
- **Files & Lines:**
  - `public/components/ui/Modal.js:1–144` (exported in `public/components/ui/index.js:11`, referenced only as a selector check in `public/components/layout/Header.js:74`; zero invocations anywhere).
  - `public/styles.css:1–2` (`@import "./styles/globals.css";` — never loaded by `public/index.html`).
  - `public/vib.tools.Branding/site.webmanifest:1–21` (contains `"name": "MyWebSite"`, `"short_name": "MySite"`, broken `/favicon/...` icon paths, served publicly by Pages CDN at `/vib.tools.Branding/site.webmanifest`).
  - `public/assets/aistudio/` (19 uploaded design reference `.jfif`/`.png`/`.pdf` files sitting inside `public/`, which Cloudflare Pages (`pages_build_output_dir = "public"`) will deploy publicly to `https://apps.vib.tools/assets/aistudio/...`!).
- **Production Impact:** Deploying `public/` as-is publishes unrelated design screenshots and a PDF (`The_State_of_Platforms_2024_Report_1856b803.pdf`) plus a placeholder `MyWebSite` manifest on the live production domain!

---

#### `BUG-14` [MEDIUM] — Broken Search State on Browser Back/Forward (`popstate`) & Clicking Home/Logo While Filtered (`/?q=...`)
- **Files & Lines:**
  - `public/app.js:147–154`
  - `public/lib/router.js:61–67`
- **Source Code Evidence:**
  ```js
  // public/app.js:147-154
  onRouteChange((newRoute) => {
    if (newRoute.view !== "home" && newRoute.view !== "category") {
      currentSearchQuery = "";
      activeAccessFilter = "all";
      layout.resetSearch();
    }
    renderCurrentView(newRoute);
  });
  ```
  ```js
  // public/lib/router.js:61-67
  export function navigate(path) {
    if (typeof window === "undefined") return;
    if (window.location.pathname === path) return;
    window.history.pushState({}, "", path);
    notifyListeners();
  }
  ```
- **Observed Defects:**
  1. Navigating `/?q=cal` → `/app/calgrid` clears `currentSearchQuery` to `""`. Pressing **Browser Back** returns URL to `/?q=cal`, but `onRouteChange` never reads `window.location.search`, so the search input stays empty and all apps show while the address bar still displays `/?q=cal`.
  2. While on `/?q=cal`, clicking the **Vib Apps** header logo or **All Apps** sidebar link calls `navigate("/")`. Because `window.location.pathname === "/"` is already true, `navigate("/")` exits early—ignoring `window.location.search` and leaving the search filter stuck.

---

#### `BUG-15` [MEDIUM] — Uncancelled Async `fetchAppDetail()` Race Condition on Rapid Route Navigation
- **Files & Lines:** `public/components/sections/AppDetailView.js:77–88`
- **Source Code Evidence:**
  ```js
  fetchAppDetail(slug)
    .then((data) => {
      container.innerHTML = "";
      if (data?.app?.name) {
        document.title = `${data.app.name} — Vib Apps`;
      }
      renderDetail(container, data.app, data.docs || {});
    })
    .catch((err) => {
      container.innerHTML = "";
      renderError(container, err.message);
    });
  ```
- **Production Impact:** No `AbortController` or `container.isConnected` guard. Navigating away from `/app/<slug>` before `/api/apps?slug=<slug>` resolves allows the stale promise to overwrite `document.title` on the newly active route (or fire an unrelated `toast.error()` via `renderError()` on `/`).

---

#### `BUG-16` [MEDIUM] — Hardcoded Production `https://get.vib.tools` Links in Client Helpers Break Preview/Local Verification
- **Files & Lines:**
  - `public/lib/appMeta.js:126–142`
  - `public/components/sections/AppGrid.js:252,267`
  - `public/components/sections/CliGuideSection.js:67–92`
- **Source Code Evidence:**
  ```js
  export function buildDownloadUrl(slug, version) {
    return `https://get.vib.tools/dl/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`;
  }
  ```
- **Impact:** In Cloudflare Preview deployments (`*.pages.dev`) and local development (`localhost:3000`), clicking **Download** on `/app/<slug>` hits production `https://get.vib.tools/dl/...` instead of testing the active preview/local deployment's edge router.

---

### Category D — Low-Severity PWA & Test Coverage Gaps

#### `BUG-17` [LOW] — PWA Service Worker Precache Misses Manifest Icons, CDN Markdown Libraries & Non-GET Request Guard
- **Files & Lines:** `public/sw.js:7–40, 60–108` vs `public/manifest.json:17–33` and `public/index.html:30–31`
- **Source Code Evidence:**
  - `manifest.json` references `/vib.tools.Branding/web-app-manifest-192x192.png`, `/vib.tools.Branding/web-app-manifest-512x512.png`, and `/icons/icon.svg`, which are omitted from `STATIC_ASSETS` in `public/sw.js:7–40`.
  - `public/sw.js:60` runs `fetch` interception without an early `if (event.request.method !== "GET" || !url.protocol.startsWith("http")) return;` guard.
  - External CDN scripts (`marked@15.0.7`, `dompurify@3.2.4`) are not precached, so offline detail views degrade to raw `<pre>` Markdown until previously visited online.

---

#### `BUG-18` [LOW] — `npm test` Omits Frontend Helper Test Suite & Key Edge Cases Lack Regression Tests
- **Files & Lines:** `package.json:11`
- **Source Code Evidence:**
  ```json
  "test": "node --test server.test.js"
  ```
- **Impact:** Running `npm test` executes only 7 tests in `server.test.js` and skips the 5 unit tests in `public/lib/appMeta.test.js`. None of the bugs identified above (`URIError`, duplicate `Content-Type`, Mode B caching, `get.vib.tools/<slug>/<ver>` HTML redirect, `router.js` `?q=` handling, `fetchAppConfig` deep validation) currently have automated test coverage.

---

## 4. Recommended Fix Grouping (High-Level Phase Overview Only)

> *Note: Per audit instructions, no implementation plan or code patches are executed here. Below is a logical breakdown of how these 18 verified findings group cleanly into 4 sequential fix phases once approved:*

- **Phase 1 — Production Data, Security & Crash Hardening (5 issues):** `BUG-01` (production `registry.json` + gated mock fallback + prevent mock cache poisoning), `BUG-02` (fix demo installer script), `BUG-03` (safe `decodeURIComponent` wrapper), `BUG-04` (strict `new URL()` + trusted host allowlist on `/dl/`), `BUG-05` (`isValidSlug` enforcement on `get.vib.tools`).
- **Phase 2 — Backend Edge Engine, Caching & Routing Parity (6 issues):** `BUG-06` (Mode B edge caching + `X-Cache-Status`), `BUG-07` (fix duplicate `Content-Type` header), `BUG-08` (HTML redirect for versioned `get.vib.tools/<slug>/<ver>`), `BUG-09` (host-scope `/api/apps` or explicitly isolate `get.vib.tools`), `BUG-10` (dot-safe SPA fallback), `BUG-11` (deep `app.config.json` validation + `405` parity in `server.js`).
- **Phase 3 — Frontend Real Functionality, SPA State & Public Asset Hygiene (5 issues):** `BUG-12` (either wire real per-platform/arch download URLs or render read-only platform/arch metadata badges so UI never lies), `BUG-13` (remove/relocate non-runtime `public/assets/aistudio/` & placeholder `site.webmanifest` + decide fate of unused `Modal.js`/`public/styles.css`), `BUG-14` (fix `popstate` `?q=` restoration & `navigate("/")` query reset), `BUG-15` (add `AbortController`/`isConnected` guard to `AppDetailView.js`), `BUG-16` (optional local/preview `?mode=get` awareness for Download button during dev).
- **Phase 4 — PWA Polish & Full Automated Regression Test Suite (2 issues):** `BUG-17` (sync `sw.js` precache list + `GET`/protocol guard + bump cache version), `BUG-18` (update `npm test` to run all test suites + add regression tests covering all 18 findings).
