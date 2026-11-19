# Forensic Implementation Specifications, Exact Code Proofs & Phase Scope Locks (Cycle 2)

> **Document Location:** `notes/planning/phase_implementation_specs.md`  
> **Baseline Reference:** [`notes/planning/baseline_freeze.md`](./baseline_freeze.md) (`v2.0`, 2026-11-19)  
> **Audit Reference:** [`notes/production_forensic_audit_report.md`](../production_forensic_audit_report.md) (18 Verified Bugs)  
> **Rule:** Every bug entry below cites **exact file paths**, **exact line numbers**, **verbatim baseline code proof**, and the **exact target patch blueprint**. Each phase is governed by a non-negotiable **Scope Lock**.

---

## PHASE 1 SPECIFICATION — Production Data, Security & Crash Hardening

### Phase 1 Scope Lock
- **Bugs Addressed (5):** `BUG-01`, `BUG-02`, `BUG-03`, `BUG-04`, `BUG-05`
- **Allowed Files (ONLY these files may be modified):**
  1. `functions/api/apps.js`
  2. `functions/[[path]].js`
  3. `functions/_lib/mockData.js`
  4. `server.js`
  5. `.env.example`
- **Forbidden Files (MUST NOT TOUCH):**
  - ALL files in `public/` (`styles/`, `components/`, `lib/`, `app.js`, `sw.js`, `index.html`, `manifest.json`)
  - `functions/_lib/github.js` (locked until Phase 2)
  - `package.json`, `wrangler.toml`, `docs/`, `project/`
- **Unchanged Features Guarantee:** Frontend UI, routing, themes, Mode A/B response shapes for valid apps, and local demo development UX remain 100% intact.

---

### `BUG-01` [CRITICAL] — Env-Gated Mock Fallback & Stop Edge Cache Poisoning

- **Exact File & Lines:**
  - `functions/api/apps.js:67–76` (Mode B fallback)
  - `functions/api/apps.js:150–188` (Mode A fallback + `caches.default` write)
  - `functions/[[path]].js:184–190`, `251–259` (`get.vib.tools` fallback)
  - `.env.example:1–3`
- **Baseline Code Proof (`functions/api/apps.js:150–180`):**
  ```javascript
  // If no live apps were loaded (offline dev, mock repos, or GitHub rate limits), activate fallback catalog
  if (apps.length === 0) {
    const mockApps = getMockApps();
    apps.push(...mockApps);
  }

  const payloadText = JSON.stringify({
    apps,
    count: apps.length
  });

  // 2. Store aggregated catalog in Edge Cache with 300s TTL
  if (cache) {
    try {
      const cacheResponse = new Response(payloadText, { ... });
      context.waitUntil(cache.put(cacheKey, cacheResponse));
    } catch (_) {}
  }
  ```
- **Target Code Patch Blueprint:**
  1. Add shared helper (in `functions/api/apps.js` and `functions/[[path]].js`, or exported from `functions/_lib/mockData.js`):
     ```javascript
     export function isMockFallbackEnabled(request, env) {
       const flag = String(env?.ENABLE_MOCK_FALLBACK || "").trim().toLowerCase();
       if (flag === "true" || flag === "1") return true;
       if (flag === "false" || flag === "0") return false;
       const host = (request.headers.get("host") || new URL(request.url).host || "")
         .toLowerCase()
         .replace(/:\d+$/, "");
       return host === "localhost" || host === "127.0.0.1" || host.endsWith(".pages.dev");
     }
     ```
  2. In `functions/api/apps.js` (Mode A):
     ```javascript
     const allowMock = isMockFallbackEnabled(request, env);
     let catalogSource = "live";
     if (apps.length === 0 && allowMock) {
       apps.push(...getMockApps());
       catalogSource = "mock";
     }

     // ONLY cache real live catalogs in Cloudflare caches.default — NEVER poison cache with mock/empty fallback
     if (cache && catalogSource === "live" && apps.length > 0) {
       ...
     }

     return new Response(payloadText, {
       status: 200,
       headers: {
         ...headers,
         "Cache-Control": catalogSource === "live" ? "public, max-age=300" : "no-store",
         "X-Cache-Status": catalogSource === "live" ? "MISS" : "BYPASS",
         "X-Catalog-Source": catalogSource
       }
     });
     ```
  3. Apply the same `isMockFallbackEnabled(request, env)` guard to `functions/api/apps.js:68` (Mode B) and `functions/[[path]].js:185,252` (`/dl/` and `/<slug>`), plus add `ENABLE_MOCK_FALLBACK=` and `ALLOWED_DOWNLOAD_HOSTS=dl.vib.tools` to `.env.example`.

---

### `BUG-02` [CRITICAL] — Fix Demo PowerShell Installer (`$APP_NAME` & Real Download Flow)

- **Exact File & Lines:**
  - `functions/[[path]].js:288–293`
  - `functions/_lib/mockData.js:40–52`, `106–117`, `161–172`
- **Baseline Code Proof (`functions/[[path]].js:289–293` & `functions/_lib/mockData.js:40–52`):**
  ```javascript
  // functions/[[path]].js:289-293
  const safeSlug = (canonicalSlug || slug).replace(/[^a-zA-Z0-9._-]/g, "");
  const safeVersion = String(targetVersion).replace(/[^a-zA-Z0-9._-]/g, "");

  const injectedHeader = `$APP_SLUG = "${safeSlug}"\r\n$APP_VERSION = "${safeVersion}"\r\n\r\n`;
  const fullScript = injectedHeader + installerScript;
  ```
  ```powershell
  # functions/_lib/mockData.js:40-52
  Write-Host "Installing $APP_NAME ($APP_VERSION)..." -ForegroundColor Cyan
  ...
  Write-Host "Downloading $APP_NAME from https://get.vib.tools/dl/$APP_SLUG/$APP_VERSION..."
  # Binary extraction and desktop shortcut creation logic
  Write-Host "$APP_NAME installation complete!" -ForegroundColor Green
  ```
- **Target Code Patch Blueprint:**
  1. Keep `$APP_SLUG` and `$APP_VERSION` contract exact, and also inject sanitized `$APP_NAME` in `functions/[[path]].js:292`:
     ```javascript
     const safeName = String(config.name || canonicalSlug || slug).replace(/[^a-zA-Z0-9 ._()-]/g, "");
     const injectedHeader = `$APP_SLUG = "${safeSlug}"\r\n$APP_VERSION = "${safeVersion}"\r\n$APP_NAME = "${safeName}"\r\n\r\n`;
     ```
  2. Update all 3 scripts in `functions/_lib/mockData.js` (`calgrid`, `devprompt`, `vibclip`) to provide a clean, complete PowerShell download & verification template using `Invoke-WebRequest -Uri $DownloadUrl -OutFile $TargetFile -UseBasicParsing` and `Get-FileHash -Algorithm SHA256`, with a clear `$APP_NAME` fallback (`if (-not $APP_NAME) { $APP_NAME = "CalGrid" }`).

---

### `BUG-03` [CRITICAL] — Safe `decodeURIComponent()` Wrapper (Stop HTTP 500 `URIError` Crash)

- **Exact File & Lines:**
  - `functions/[[path]].js:103–104`
  - `server.js:75`
- **Baseline Code Proof:**
  ```javascript
  // functions/[[path]].js:103-104
  const cleanPath = url.pathname.replace(/^\/+|\/+$/g, "");
  const segments = cleanPath ? cleanPath.split("/").map((s) => decodeURIComponent(s).trim()) : [];
  ```
  ```javascript
  // server.js:75
  let pathname = decodeURIComponent(parsedUrl.pathname);
  ```
- **Target Code Patch Blueprint:**
  1. In `functions/[[path]].js:103–105`:
     ```javascript
     let segments = [];
     if (cleanPath) {
       try {
         segments = cleanPath.split("/").map((s) => decodeURIComponent(s).trim());
       } catch (_) {
         return new Response("Bad Request: Malformed URL encoding.\n", {
           status: 400,
           headers: { "Content-Type": "text/plain; charset=utf-8" }
         });
       }
     }
     ```
  2. In `server.js:75`:
     ```javascript
     let pathname;
     try {
       pathname = decodeURIComponent(parsedUrl.pathname);
     } catch (_) {
       return new Response("Bad Request: Malformed URL encoding.", {
         status: 400,
         headers: { "Content-Type": "text/plain; charset=utf-8" }
       });
     }
     ```

---

### `BUG-04` [HIGH] — Strict `new URL()` + Trusted Host Allowlist on `/dl/` Redirect

- **Exact File & Lines:** `functions/[[path]].js:211–224`
- **Baseline Code Proof (`functions/[[path]].js:211–224`):**
  ```javascript
  const downloadUrl = resolved.versionData.url;

  // Validate that download URL exists and is a valid https:// endpoint
  if (typeof downloadUrl !== "string" || !downloadUrl.startsWith("https://")) {
    return new Response(
      `Invalid download URL configured for app '${slug}'.\n`,
      {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      }
    );
  }

  return Response.redirect(downloadUrl, 302);
  ```
- **Target Code Patch Blueprint:**
  ```javascript
  function isTrustedDownloadUrl(rawUrl, env) {
    if (typeof rawUrl !== "string") return false;
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch (_) {
      return false;
    }
    if (parsed.protocol !== "https:") return false;

    const extraHosts = String(env?.ALLOWED_DOWNLOAD_HOSTS || "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    const allowedHosts = new Set(["dl.vib.tools", "github.com", "objects.githubusercontent.com", ...extraHosts]);
    return allowedHosts.has(parsed.hostname.toLowerCase());
  }
  ```
  If `!isTrustedDownloadUrl(downloadUrl, env)`, return `403 Forbidden` (plain text: `Untrusted or invalid download URL configured for app '${slug}'.\n`).

---

### `BUG-05` [HIGH] — Enforce `isValidSlug()` on All `get.vib.tools` Routes

- **Exact File & Lines:** `functions/[[path]].js:1–5`, `117–119`, `165–174`, `230–237`
- **Baseline Code Proof (`functions/[[path]].js:1–5`, `117–119`, `165–173`):**
  ```javascript
  import {
    findAppEntry,
    fetchAppConfig,
    fetchAppInstaller
  } from "./_lib/github.js";
  ...
  if (segments.length === 1 && segments[0] !== "dl") {
    return Response.redirect(`https://apps.vib.tools/app/${encodeURIComponent(segments[0])}`, 302);
  }
  ```
- **Target Code Patch Blueprint:**
  1. Import `isValidSlug` from `"./_lib/github.js"`.
  2. Before HTML redirect (`line 117`): require `isValidSlug(segments[0])`, otherwise return `400 Bad Request` (`Invalid app slug format.\n`).
  3. In `/dl/<slug>` (`line 168`): if `!slug || !isValidSlug(slug)`, return `400 Bad Request` (`Invalid app slug format. Usage: /dl/<slug>[/<version>]\n`).
  4. In `/<slug>[/<version>]` (`line 231`): if `!isValidSlug(slug)`, return `400 Bad Request` (`Invalid app slug format.\n`).

---

## PHASE 2 SPECIFICATION — Backend Edge Engine, Caching & Routing Parity

### Phase 2 Scope Lock
- **Bugs Addressed (6):** `BUG-06`, `BUG-07`, `BUG-08`, `BUG-09`, `BUG-10`, `BUG-11`
- **Allowed Files (ONLY these files may be modified):**
  1. `functions/api/apps.js`
  2. `functions/[[path]].js`
  3. `functions/_lib/github.js`
  4. `server.js`
- **Forbidden Files (MUST NOT TOUCH):**
  - ALL files in `public/`, `functions/_lib/mockData.js`, `registry.json`, `package.json`, `wrangler.toml`, `docs/`, `project/`
- **Unchanged Features Guarantee:** All Phase 1 security hardening, mock gating, CLI `$APP_SLUG`/`$APP_VERSION`/`$APP_NAME` output, and frontend UI remain 100% untouched.

---

### `BUG-06` [HIGH] — Mode B (`GET /api/apps?slug=<slug>`) Response-Level Edge Caching

- **Exact File & Lines:** `functions/api/apps.js:39–98`
- **Baseline Code Proof:** Lines `39–98` build and return `{ app, docs }` without checking `caches.default`, writing to edge cache, or emitting `X-Cache-Status`.
- **Target Code Patch Blueprint:**
  1. Construct normalized cache key `https://apps.vib.tools/__cache/api/apps/detail/${encodeURIComponent(slug.toLowerCase())}`.
  2. Check `caches.default.match(detailCacheKey)` before hitting `fetchAppConfig`/`fetchAppDoc`; on hit return `200` with `X-Cache-Status: HIT` and `X-Catalog-Source: live`.
  3. On live miss (`source === "live"`), store response in `caches.default` (`max-age=300`) and return `X-Cache-Status: MISS`; on mock fallback, bypass cache (`Cache-Control: no-store`, `X-Cache-Status: BYPASS`, `X-Catalog-Source: mock`).

---

### `BUG-07` [MEDIUM] — Fix Duplicate `Content-Type` Header on SPA Fallback

- **Exact File & Lines:** `functions/[[path]].js:88–94`
- **Baseline Code Proof (`functions/[[path]].js:88–94`):**
  ```javascript
  return new Response(indexRes.body, {
    status: 200,
    headers: {
      ...Object.fromEntries(indexRes.headers.entries()),
      "Content-Type": "text/html; charset=utf-8"
    }
  });
  ```
- **Target Code Patch Blueprint:**
  ```javascript
  const spaHeaders = new Headers(indexRes.headers);
  spaHeaders.set("Content-Type", "text/html; charset=utf-8");
  return new Response(indexRes.body, {
    status: 200,
    headers: spaHeaders
  });
  ```

---

### `BUG-08` [MEDIUM] — Browser HTML Redirect on `get.vib.tools/<slug>/<version>`

- **Exact File & Lines:** `functions/[[path]].js:110–120`
- **Baseline Code Proof (`functions/[[path]].js:110–120`):**
  ```javascript
  if (isHtml) {
    if (segments.length === 0) {
      return Response.redirect("https://apps.vib.tools", 302);
    }
    if (segments[0] === "cli") {
      return Response.redirect("https://apps.vib.tools/cli", 302);
    }
    if (segments.length === 1 && segments[0] !== "dl") {
      return Response.redirect(`https://apps.vib.tools/app/${encodeURIComponent(segments[0])}`, 302);
    }
  }
  ```
- **Target Code Patch Blueprint:**
  ```javascript
  if (isHtml) {
    if (segments.length === 0) {
      return Response.redirect("https://apps.vib.tools", 302);
    }
    if (segments[0] === "cli") {
      return Response.redirect("https://apps.vib.tools/cli", 302);
    }
    if ((segments.length === 1 || segments.length === 2) && segments[0] !== "dl") {
      if (!isValidSlug(segments[0])) {
        return new Response("Invalid app slug format.\n", {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
      return Response.redirect(`https://apps.vib.tools/app/${encodeURIComponent(segments[0])}`, 302);
    }
  }
  ```

---

### `BUG-09` [MEDIUM] — Isolate `/api/apps` from `get.vib.tools` Host

- **Exact File & Lines:** `functions/api/apps.js:24–36` & `server.js:141–153`
- **Baseline Code Proof (`functions/api/apps.js:24–28`):** `onRequestGet` never checks `Host`, so `GET http://get.vib.tools/api/apps` returns `200 OK` JSON.
- **Target Code Patch Blueprint:**
  At top of `onRequestGet` (and `onRequestOptions`) in `functions/api/apps.js`:
  ```javascript
  const rawHost = request.headers.get("host") || url.host || "";
  const host = rawHost.toLowerCase().replace(/:\d+$/, "");
  if (host === "get.vib.tools") {
    return new Response("Not Found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
  ```

---

### `BUG-10` [MEDIUM] — Dot-Safe SPA Fallback (`/category/Node.js`, `/category/.NET`)

- **Exact File & Lines:** `functions/[[path]].js:82`
- **Baseline Code Proof (`functions/[[path]].js:82`):**
  ```javascript
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(pathname);
  ```
- **Target Code Patch Blueprint:**
  ```javascript
  const STATIC_ASSET_EXT_RE = /\.(css|js|mjs|cjs|json|webmanifest|svg|png|jpe?g|gif|webp|ico|txt|xml|pdf|woff2?|ttf|eot|map|wasm)$/i;
  const isStaticAssetPath = STATIC_ASSET_EXT_RE.test(pathname);
  ```
  Use `!isApi && !isStaticAssetPath` at line `84` so missing static assets still return `404` while SPA routes with dots (`/category/Node.js`) serve `/index.html` (`200 OK`).

---

### `BUG-11` [MEDIUM] — Deep `fetchAppConfig()` Schema Validation & `405` Method Parity in `server.js`

- **Exact File & Lines:**
  - `functions/_lib/github.js:224–238`
  - `server.js:155–156`
- **Baseline Code Proof (`functions/_lib/github.js:224–237` & `server.js:155–156`):**
  ```javascript
  // functions/_lib/github.js:224-237
  if (!config || typeof config !== "object") {
    return { ok: false, status: 422, error: "app.config.json root must be an object" };
  }
  const required = ["slug", "name", "latest", "versions"];
  const missing = required.filter((field) => !config[field]);
  ```
  ```javascript
  // server.js:155-156
  return await wildcardGet(context);
  ```
- **Target Code Patch Blueprint:**
  1. In `functions/_lib/github.js:224–238`:
     ```javascript
     if (!config || typeof config !== "object" || Array.isArray(config)) {
       return { ok: false, status: 422, error: "app.config.json root must be a plain object" };
     }
     const required = ["slug", "name", "latest", "versions"];
     const missing = required.filter((field) => !config[field]);
     if (missing.length > 0) {
       return { ok: false, status: 422, error: `Missing required fields in app.config.json: ${missing.join(", ")}` };
     }
     if (typeof config.slug !== "string" || typeof config.name !== "string" || typeof config.latest !== "string") {
       return { ok: false, status: 422, error: "Fields slug, name, and latest in app.config.json must be strings" };
     }
     if (typeof config.versions !== "object" || Array.isArray(config.versions) || Object.keys(config.versions).length === 0) {
       return { ok: false, status: 422, error: "Field versions in app.config.json must be a non-empty object map" };
     }
     ```
  2. In `server.js:155–156`:
     ```javascript
     if (webRequest.method !== "GET" && webRequest.method !== "HEAD") {
       return new Response("Method Not Allowed\n", {
         status: 405,
         headers: {
           "Content-Type": "text/plain; charset=utf-8",
           "Allow": "GET, HEAD"
         }
       });
     }
     return await wildcardGet(context);
     ```

---

## PHASE 3 SPECIFICATION — Frontend Real Functionality, SPA State & Public Asset Hygiene

### Phase 3 Scope Lock
- **Bugs Addressed (5):** `BUG-12`, `BUG-13`, `BUG-14`, `BUG-15`, `BUG-16`
- **Allowed Files (ONLY these files may be modified / removed):**
  1. `public/components/sections/AppDetailView.js` (MODIFY)
  2. `public/lib/api.js` (MODIFY)
  3. `public/lib/router.js` (MODIFY)
  4. `public/lib/appMeta.js` (MODIFY)
  5. `public/app.js` (MODIFY)
  6. `public/styles.css` (DELETE — unused legacy import)
  7. `public/vib.tools.Branding/site.webmanifest` (DELETE — `"MyWebSite"` placeholder)
  8. `public/assets/aistudio/*` (DELETE directory — 20 non-runtime design reference files)
- **Forbidden Files (MUST NOT TOUCH):**
  - ALL files in `functions/`, `server.js`, `registry.json`, `wrangler.toml`, `package.json`, `public/sw.js` (locked until Phase 4)
  - `public/styles/tokens.css`, `public/components/layout/*`, `public/components/ui/*` (keep `Modal.js` intact as documented design-system primitive)
- **Unchanged Features Guarantee:** Visual design tokens, card layouts, sidebar, mobile nav, dual themes, Markdown sanitization, and backend APIs remain 100% unchanged.

---

### `BUG-12` [HIGH] — Eliminate Non-Functional OS & Architecture `<select>` Controls

- **Exact File & Lines:** `public/components/sections/AppDetailView.js:314–358`, `441–445`
- **Baseline Code Proof (`public/components/sections/AppDetailView.js:315–358`):**
  ```javascript
  if (Array.isArray(app.platforms) && app.platforms.length > 0) {
    ...
    const platSelect = document.createElement("select");
    platSelect.id = "app-platform-select";
    ...
  }
  if (Array.isArray(app.architectures) && app.architectures.length > 0) {
    ...
    const archSelect = document.createElement("select");
    archSelect.id = "app-arch-select";
    ...
  }
  ```
  *(Zero `change` event listeners; zero effect on `dlLink.href` or `codeText.textContent`.)*
- **Target Code Patch Blueprint:**
  - Remove the misleading interactive `<select>` elements for `app.platforms` and `app.architectures` when single-URL releases are used, and instead render `app.platforms` (`Platforms`) and `app.architectures` (`Architecture`) honestly as read-only `<dl>` rows inside `metaList` (using existing `createMetaRow("Platforms", "monitor")` / `createMetaRow("Architecture", "cpu")` or `"layers"`, joined with `" · "`).
  - Zero fake controls, zero new CSS required, 100% truthful UI aligned with actual `versions.<ver>.url` delivery!

---

### `BUG-13` [MEDIUM] — Clean Non-Runtime / Placeholder Assets from `public/`

- **Exact Targets:**
  - `public/assets/aistudio/` (20 files: 19 `.jfif`/`.png` screenshots + `The_State_of_Platforms_2024_Report_1856b803.pdf`) → **DELETE DIRECTORY** (prevents Cloudflare Pages from exposing them at `https://apps.vib.tools/assets/aistudio/...`).
  - `public/vib.tools.Branding/site.webmanifest` (21 lines, `"name": "MyWebSite"`) → **DELETE FILE** (`public/manifest.json` is the canonical manifest).
  - `public/styles.css` (2 lines, unused `@import`) → **DELETE FILE**.
  - `public/components/ui/Modal.js` → **RETAIN** as documented design-system primitive (`project/DESIGN_SYSTEM.md`), confirmed no broken imports or dead runtime overhead.

---

### `BUG-14` [MEDIUM] — Fix `?q=` Restoration on `popstate` & Logo/`All Apps` Reset on `/?q=...`

- **Exact File & Lines:**
  - `public/lib/router.js:61–67`
  - `public/app.js:147–154`
- **Baseline Code Proof:**
  ```javascript
  // public/lib/router.js:61-67
  export function navigate(path) {
    if (typeof window === "undefined") return;
    if (window.location.pathname === path) return;
    window.history.pushState({}, "", path);
    notifyListeners();
  }
  ```
  ```javascript
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
- **Target Code Patch Blueprint:**
  1. In `public/lib/router.js:61–67`:
     ```javascript
     export function navigate(path) {
       if (typeof window === "undefined") return;
       const currentFull = `${window.location.pathname}${window.location.search}`;
       if (currentFull === path) return;
       window.history.pushState({}, "", path);
       notifyListeners();
     }
     ```
  2. In `public/app.js:147–155`:
     ```javascript
     onRouteChange((newRoute) => {
       if (newRoute.view === "home" || newRoute.view === "category") {
         const urlQuery = new URLSearchParams(window.location.search).get("q") || "";
         currentSearchQuery = urlQuery;
         layout.setSearchValue(urlQuery);
       } else {
         currentSearchQuery = "";
         activeAccessFilter = "all";
         layout.resetSearch();
       }
       renderCurrentView(newRoute);
     });
     ```

---

### `BUG-15` [MEDIUM] — Cancel Stale `fetchAppDetail()` on Rapid Navigation

- **Exact File & Lines:**
  - `public/lib/api.js:46–56`
  - `public/components/sections/AppDetailView.js:71–91`
  - `public/app.js:100–128`
- **Baseline Code Proof (`public/components/sections/AppDetailView.js:77–88`):**
  ```javascript
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
- **Target Code Patch Blueprint:**
  1. In `public/lib/api.js`: accept optional `{ signal } = {}` in `fetchAppDetail(slug, { signal } = {})` and pass `{ signal }` to `fetch(...)`, rethrowing `AbortError` cleanly without wrapping.
  2. In `public/components/sections/AppDetailView.js`: create `const controller = new AbortController()`, pass `{ signal: controller.signal }`, expose `container.cleanup = () => controller.abort()`, and guard both `.then()` and `.catch()` with `if (controller.signal.aborted || !container.isConnected) return;`.
  3. In `public/app.js`: call `activeViewCleanup?.()` at the start of `renderCurrentView()` before clearing `layout.viewRoot.innerHTML = ""`.

---

### `BUG-16` [MEDIUM] — Environment-Aware Download URL Helper (Production Default Preserved)

- **Exact File & Lines:** `public/lib/appMeta.js:140–142`
- **Baseline Code Proof (`public/lib/appMeta.js:140–142`):**
  ```javascript
  export function buildDownloadUrl(slug, version) {
    return `https://get.vib.tools/dl/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`;
  }
  ```
- **Target Code Patch Blueprint:**
  ```javascript
  export function buildDownloadUrl(slug, version, options = {}) {
    const encodedPath = `/dl/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`;
    const runtimeLoc = options.location || (typeof window !== "undefined" ? window.location : null);
    const host = runtimeLoc?.hostname?.toLowerCase() || "";
    if (host === "localhost" || host === "127.0.0.1") {
      return `${runtimeLoc.origin}${encodedPath}?mode=get`;
    }
    return `https://get.vib.tools${encodedPath}`;
  }
  ```
  *(Production `apps.vib.tools` and non-browser unit tests without `window` continue to emit `https://get.vib.tools/dl/<slug>/<version>`; local dev `localhost:3000` routes cleanly to the active local edge router!)*

---

## PHASE 4 SPECIFICATION — PWA Polish & Full Automated Regression Test Suite

### Phase 4 Scope Lock
- **Bugs Addressed (2):** `BUG-17`, `BUG-18`
- **Allowed Files (ONLY these files may be modified):**
  1. `public/sw.js`
  2. `package.json`
  3. `server.test.js`
  4. `public/lib/appMeta.test.js`
- **Forbidden Files (MUST NOT TOUCH):**
  - ALL files in `functions/`, `server.js`, `public/components/`, `public/styles/`, `public/app.js`, `registry.json`, `wrangler.toml`
- **Unchanged Features Guarantee:** Zero behavioral changes to application runtime or UI; purely PWA precache/guard hardening + comprehensive automated test coverage.

---

### `BUG-17` [LOW] — Sync `public/sw.js` Precache List + Add `GET`/HTTP Protocol Guard

- **Exact File & Lines:** `public/sw.js:5`, `7–40`, `60–64`
- **Baseline Code Proof (`public/sw.js:5,36–40,60–62`):**
  ```javascript
  const CACHE_NAME = "vib-apps-hub-v2";
  ...
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/vib.tools.Branding/favicon.svg",
    "/vib.tools.Branding/favicon-96x96.png"
  ];
  ...
  self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
  ```
- **Target Code Patch Blueprint:**
  1. Bump `CACHE_NAME` to `"vib-apps-hub-v3"`.
  2. Add missing `manifest.json` icons to `STATIC_ASSETS`:
     - `"/vib.tools.Branding/web-app-manifest-192x192.png"`
     - `"/vib.tools.Branding/web-app-manifest-512x512.png"`
     - `"/icons/icon.svg"`
  3. Add early request guard at top of `fetch` listener:
     ```javascript
     if (event.request.method !== "GET") return;
     const url = new URL(event.request.url);
     if (!url.protocol.startsWith("http")) return;
     ```

---

### `BUG-18` [LOW] — Run All Test Suites via `npm test` + Full 18-Bug Regression Suite

- **Exact File & Lines:** `package.json:11`, `server.test.js`, `public/lib/appMeta.test.js`
- **Baseline Code Proof (`package.json:11`):**
  ```json
  "test": "node --test server.test.js"
  ```
- **Target Code Patch Blueprint:**
  1. Update `package.json:11`:
     ```json
     "test": "node --test server.test.js public/lib/appMeta.test.js"
     ```
  2. Add targeted regression tests in `server.test.js` and `public/lib/appMeta.test.js` covering:
     - `BUG-01`: Live prod host never caches mock payload; `ENABLE_MOCK_FALLBACK=false` disables mock.
     - `BUG-02`: Demo PowerShell script defines `$APP_NAME`, `$APP_SLUG`, `$APP_VERSION` & `Invoke-WebRequest`.
     - `BUG-03`: Malformed `/%E0%A4%A` returns `400` on both `apps.vib.tools` and `get.vib.tools`.
     - `BUG-04`: Untrusted `/dl/` target host rejected cleanly.
     - `BUG-05`: Invalid slug `/dl/..%2Fetc` and `/bad!slug` return `400`.
     - `BUG-06`: Mode B emits `X-Cache-Status` header.
     - `BUG-07`: SPA fallback returns single `Content-Type: text/html; charset=utf-8`.
     - `BUG-08`: Browser `Accept: text/html` on `get.vib.tools/calgrid/1.0.3` returns `302` → `apps.vib.tools/app/calgrid`.
     - `BUG-09`: `GET get.vib.tools/api/apps` returns `404`.
     - `BUG-10`: `GET apps.vib.tools/category/Node.js` returns `200 OK` HTML shell.
     - `BUG-11`: `POST get.vib.tools/calgrid` returns `405 Method Not Allowed`; `fetchAppConfig` rejects array/empty `versions`.
     - `BUG-16`: `buildDownloadUrl()` returns prod `https://get.vib.tools/dl/...` by default and local `?mode=get` on `localhost`.
