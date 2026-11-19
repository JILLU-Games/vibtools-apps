# Error Handling Inventory & Production Hardening Matrix (Cycle 2 — Baseline v2.0)

> **Document Location:** `notes/planning/error_handling_matrix.md`  
> **Baseline Reference:** [`notes/planning/baseline_freeze.md`](./baseline_freeze.md) (`v2.0`, 2026-11-19)  
> **Forensic Source:** [`notes/production_forensic_audit_report.md`](../production_forensic_audit_report.md)  
> **Purpose:** Complete source-verified record of (1) every error-handling mechanism currently active in the frozen baseline, (2) every missing or weak error-handling / security gap to add across Phases 1–4, and (3) the standardized HTTP & UI error contract.

---

## 1. Currently Active Error Handling in Frozen Baseline (Source-Verified)

| Layer / File & Lines | Subsystem | Verified Active Mechanism | Status |
| :--- | :--- | :--- | :---: |
| `functions/_lib/github.js:10–15` | Slug Validation | `isValidSlug()` enforces `/^[a-z0-9][a-z0-9-_]{0,63}$/i` against injection & traversal. | ✅ Active *(not yet called in `[[path]].js`)* |
| `functions/_lib/github.js:65–81` | Repo & Path Traversal Guard | Rejects invalid repo format, empty paths, and `..` traversal (both raw and `decodeURIComponent`-wrapped in `try/catch`) with `{ ok: false, status: 400 }`. | ✅ Active |
| `functions/_lib/github.js:90–110,151–169` | Edge Cache Resilience | Wraps `caches.default` detection, `cache.match`, and `cache.put` in `try/catch` so cache errors never fail requests. | ✅ Active |
| `functions/_lib/github.js:123–146` | Upstream GitHub API | Wraps `fetch(apiUrl)` in `try/catch` (`502` on network failure), maps `404` & `401`/`403` into structured error strings without ever exposing `GITHUB_TOKEN`. | ✅ Active |
| `functions/_lib/github.js:213–237` | Config JSON Parsing | Wraps `JSON.parse()` in `try/catch` (`500`), verifies object type (`422`), checks presence of `slug`, `name`, `latest`, `versions`. | ⚠️ Partial *(needs deep `versions` validation — `BUG-11`)* |
| `functions/api/apps.js:41–49,78–86,130–148,189–198` | Store API Errors | Returns `400` on invalid `?slug=`, `404` on missing app, `500` catch-all JSON error; uses `Promise.allSettled()` in Mode A so one broken repo never crashes the catalog. | ⚠️ Partial *(silent mock fallback + cache poisoning — `BUG-01`)* |
| `functions/[[path]].js:158–173,192–222,261–286` | Edge CLI & `/dl/` Errors | Guards `/dl/` max segment depth (`<= 3`), missing slug (`400`), missing app/version (`404`), missing installer (`502`). | ⚠️ Partial *(missing `URIError` catch, `isValidSlug`, trusted host allowlist — `BUG-03`/`04`/`05`)* |
| `server.js:81–87,89–112,149–152,199–204` | Local Dev Edge Emulator | Blocks static path traversal (`403`), missing files (`404`), non-`GET`/`OPTIONS` on `/api/apps` (`405`), HTTP server catch-all (`500`). | ⚠️ Partial *(missing `URIError` catch & `405` on wildcard — `BUG-03`/`11`)* |
| `public/lib/router.js:18–24,83–89` | Client SPA Router | Wraps `decodeURIComponent(segment)` and listener callbacks in `try/catch` so malformed routes/listeners never crash the SPA. | ✅ Active |
| `public/lib/api.js:19–33,47–65` | Client API Fetch | Validates slug, catches network failures, parses server JSON `message` field into user-friendly `Error` messages. | ⚠️ Partial *(needs `AbortError` passthrough — `BUG-15`)* |
| `public/lib/clipboard.js:9–36` | Clipboard Fallback | Falls back cleanly from `navigator.clipboard.writeText` to iframe-safe hidden `<textarea>` + `execCommand("copy")`, returning boolean status. | ✅ Active |
| `public/components/sections/AppDetailView.js:54–62,93–123,188` | Detail View Fallbacks | Markdown falls back to `<pre>` `textContent` if CDN offline; `renderError()` shows recovery button + error toast; icon falls back to 2-char monogram on `onerror`. | ⚠️ Partial *(needs `AbortController`/`isConnected` guard — `BUG-15`)* |
| `public/components/layout/Sidebar.js` & `Header.js:33–35,73–88` | Layout Guards | `CSS.escape()` guards category selectors; logo falls back to SVG icon on `onerror`; `/` shortcut guarded against inputs & open modals. | ✅ Active |
| `public/components/ui/Toast.js` | User Error Feedback | Renders dismissible error/info/success toasts with safe parent removal and timer cleanup. | ✅ Active |
| `public/sw.js:64–77,80–85,104` | PWA Offline Fallback | Returns `503 Offline` JSON for failed `/api/` requests; falls back to cached `/index.html` for failed navigations; falls back to cached static asset on network error. | ⚠️ Partial *(needs early non-`GET`/non-HTTP guard — `BUG-17`)* |

---

## 2. Missing / Weak Error Handling & Hardening Matrix (To Add in Cycle 2)

| # | Bug ID | File(s) & Exact Lines | Failure / Abuse Scenario | Current Baseline Behavior (Defect) | Required Production Error Handling / Safeguard | Target Phase | Status |
| :-: | :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| 1 | `BUG-01` | `functions/api/apps.js:68–76,150–180`, `functions/[[path]].js:185,252` | GitHub outage, invalid token, or empty live `registry.json` on production host. | Silently serves 3 fake demo apps and caches them in `caches.default` for `300s`. | Gate mock fallback behind `ENABLE_MOCK_FALLBACK` (default OFF on live prod, ON on `localhost`/`.pages.dev`/`.run.app`); never cache mock/empty/error responses; emit `X-Catalog-Source: live\|mock` & `Cache-Control: no-store` on mock/errors. | **Phase 1** | ✅ Completed (Phase 1) |
| 2 | `BUG-02` | `functions/_lib/mockData.js:40–52,106–117,161–172`, `functions/[[path]].js:292` | User runs demo PowerShell installer via `irm ... \| iex`. | `$APP_NAME` is undefined (`Installing  (v1.0.3)...`); script does not download binary. | Inject sanitized `$APP_NAME` in `[[path]].js` and provide complete `try/catch` + `Invoke-WebRequest` + SHA256 check template in `mockData.js`. | **Phase 1** | ✅ Completed (Phase 1) |
| 3 | `BUG-03` | `functions/[[path]].js:104`, `server.js:75` | Request with malformed percent-encoding (e.g. `/%E0%A4%A`). | Uncaught `URIError: URI malformed` crashes Worker / Node handler (`500`). | Wrap `decodeURIComponent()` in `try/catch` in both files and return `400 Bad Request` (`Bad Request: Malformed URL encoding.`). | **Phase 1** | ✅ Completed (Phase 1) |
| 4 | `BUG-04` | `functions/[[path]].js:211–224` | Compromised or malformed `versions.<ver>.url` (e.g. `https://evil.com/x.exe` or `"https://"`). | Open `302` redirect to arbitrary `https://` host or uncaught `TypeError` in `Response.redirect()`. | Parse via `new URL()` inside `try/catch`, enforce `protocol === "https:"`, reject credentials, and validate `hostname` against trusted allowlist (`dl.vib.tools`, `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, + `env.ALLOWED_DOWNLOAD_HOSTS`); reject untrusted URLs with `403 Forbidden`. | **Phase 1** | ✅ Completed (Phase 1) |
| 5 | `BUG-05` | `functions/[[path]].js:117–119,165–174,231–237` | Malformed/traversal slug on `get.vib.tools` (`/dl/..%2Fetc`, `/bad!slug`) or prototype key version (`toString`). | Skips `isValidSlug()`, reflects raw segment in `404` or issues `302` redirect to invalid slug. | Import and enforce `isValidSlug()` on HTML redirects, `/dl/<slug>`, and `/<slug>[/<ver>]`; harden `resolveVersion` with `Object.hasOwn()`; return `400 Bad Request` on invalid slugs. | **Phase 1** | ✅ Completed (Phase 1) |
| 6 | `BUG-06` | `functions/api/apps.js:39–98` | Repeated traffic to `/api/apps?slug=<slug>`. | Uncached Mode B response repeats per-file cache reads & JSON build on every call (`x-cache=null`). | Wrap live Mode B responses in `caches.default` (`300s` TTL, `X-Cache-Status: HIT\|MISS`), keeping cache ops wrapped in `try/catch` and bypassing cache on `404`/`500`/mock. | **Phase 2** | ✅ Completed (Phase 2) |
| 7 | `BUG-07` | `functions/[[path]].js:88–94` | SPA reload fallback serving `/index.html`. | Merges lowercase `content-type` + `"Content-Type"`, emitting malformed duplicate header. | Clone headers with `new Headers(indexRes.headers)` and call `headers.set("Content-Type", "text/html; charset=utf-8")`. | **Phase 2** | ✅ Completed (Phase 2) |
| 8 | `BUG-08` | `functions/[[path]].js:110–120` | Human browser opens `get.vib.tools/<slug>/<version>`. | Dumps raw `text/plain` PowerShell script into browser window. | Extend `isHtml` redirect condition to `(segments.length === 1 \|\| segments.length === 2) && segments[0] !== "dl"` (with `isValidSlug` guard). | **Phase 2** | ✅ Completed (Phase 2) |
| 9 | `BUG-09` | `functions/api/apps.js:24–36` | Request to `https://get.vib.tools/api/apps`. | Leaks Store API JSON on CLI-only domain. | Reject `host === "get.vib.tools"` in `functions/api/apps.js` with `404 Not Found` plain text. | **Phase 2** | ✅ Completed (Phase 2) |
| 10 | `BUG-10` | `functions/[[path]].js:82` | Browser reloads SPA route containing a dot (`/category/Node.js`). | Broad `/\.[a-zA-Z0-9]+$/` treats route as missing file and returns `404`. | Match only real static asset extensions (`css|js|mjs|json|svg|png|ico|...`), preserving `404` for real missing files and `200 /index.html` for SPA routes. | **Phase 2** | ✅ Completed (Phase 2) |
| 11 | `BUG-11` | `functions/_lib/github.js:224–238`, `server.js:155–156` | Malformed `app.config.json` (`versions: []` or `{}` or non-string `latest`); `POST`/`DELETE` on `server.js`. | Shallow check passes invalid `versions`; `server.js` returns `200 OK` for `POST /calgrid`. | Enforce plain non-empty object for `versions` and string types for `slug`/`name`/`latest` (`422`); return `405 Method Not Allowed` with `Allow: GET, HEAD` in `server.js`. | **Phase 2** | ✅ Completed (Phase 2) |
| 12 | `BUG-12` | `public/components/sections/AppDetailView.js:315–358` | User selects different OS/Arch in conditional `<select>`. | Silent no-op: UI pretends to switch target while downloading default binary. | Replace non-functional `<select>` elements with truthful read-only metadata specification rows so UI never misleads users. | **Phase 3** | ✅ Completed (Phase 3) |
| 13 | `BUG-14` & `BUG-15` | `public/app.js:147–154`, `public/lib/router.js:61–67`, `public/components/sections/AppDetailView.js:77–88`, `public/lib/api.js:46–56` | Browser Back to `/?q=cal`, clicking Logo on `/?q=cal`, or rapid `/app/:slug` → `/cli` navigation before fetch resolves. | Search input desyncs from URL; Logo click does nothing; stale fetch overwrites `document.title` or triggers unrelated error toast. | Sync `?q=` on `popstate`, compare full `pathname + search` in `navigate()`, cancel stale `fetchAppDetail` via `AbortController` + `container.isConnected` guard. | **Phase 3** | ✅ Completed (Phase 3) |
| 14 | `BUG-17` | `public/sw.js:60–62` | Non-`GET` request or `chrome-extension://` URL intercepted by SW `fetch` listener. | Runs URL/cache logic unnecessarily on non-`GET` or non-HTTP requests. | Add early guard: `if (event.request.method !== "GET") return;` and `if (!url.protocol.startsWith("http")) return;`. | **Phase 4** | ✅ Completed (Phase 4) |

---

## 3. Standardized Production HTTP Error Contract

| HTTP Status | JSON API (`/api/apps`) | Edge CLI / Router (`get.vib.tools`) | Trigger Condition |
| :---: | :--- | :--- | :--- |
| `400 Bad Request` | `{ "error": "Bad Request", "message": "..." }` | Plain-text error line (`text/plain; charset=utf-8`) | Invalid slug format (`!isValidSlug`), missing slug in `/dl/`, or malformed percent-encoding (`URIError`). |
| `403 Forbidden` | — | Plain-text error line (`text/plain; charset=utf-8`) | Untrusted `/dl/` download host outside allowlist, or static path traversal outside `public/`. |
| `404 Not Found` | `{ "error": "Not Found", "message": "..." }` | Plain-text error line (`text/plain; charset=utf-8`) | Unknown app slug, unknown release version, `/api/apps` called on `get.vib.tools`, or missing static asset file. |
| `405 Method Not Allowed` | `{ "error": "Method Not Allowed" }` | `Method Not Allowed\n` (`Allow: GET, HEAD`) | `POST`, `PUT`, `PATCH`, `DELETE` requests to read-only endpoints. |
| `422 Unprocessable Entity` | Internal validation (`fetchAppConfig` skips broken repo in Mode A) | Logged & skipped cleanly | Malformed `app.config.json` (missing required fields, non-object/empty `versions`, non-string `slug`/`name`/`latest`). |
| `500 Internal Server Error` | `{ "error": "Internal Server Error", "message": "..." }` | `Internal Server Error` | Unexpected unhandled runtime exception. |
| `502 Bad Gateway` | Internal upstream error (`fetchRepoFile`) | `Failed to load installer script for '<slug>'.\n` | GitHub network failure or missing `.vibtools/installer.ps1`. |
| `503 Service Unavailable` | `{ "error": "Offline", "message": "Network unavailable" }` *(from `sw.js`)* | — | Client browser offline when calling `/api/*`. |
