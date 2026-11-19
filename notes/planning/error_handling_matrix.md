# Error Handling Inventory & Hardening Matrix

> **Document Location:** `notes/planning/error_handling_matrix.md`  
> **Purpose:** Comprehensive record of existing error handling mechanisms and required production safeguards across edge runtime, store API, and client modules.

---

## 1. Existing Error Handling Architecture

| Layer / File | Subsystem | Existing Error Handling Mechanism | Current Status |
| :--- | :--- | :--- | :---: |
| **`functions/_lib/github.js`** | Traversal Guard | Decodes path segments; checks for `..` and blocks directory traversal with HTTP 400. | ✅ Active |
| **`functions/_lib/github.js`** | Network / GitHub API | Wraps `fetch(apiUrl)` in `try/catch`, maps 404/401/403 to structured JSON/status errors, never leaks tokens. | ✅ Active |
| **`functions/_lib/github.js`** | Cache API | Wraps `caches.default.match` and `cache.put` in `try/catch` to ignore cache failures gracefully. | ✅ Active |
| **`functions/_lib/github.js`** | Config JSON Parse | Wraps `JSON.parse` in `try/catch`, checks for object type and minimum schema fields (`slug`, `name`, `latest`, `versions`). | ✅ Active |
| **`functions/api/apps.js`** | Store API | Validates `isValidSlug(slug)`, returns 400 for malformed slugs, 404 for missing apps, 502 for upstream failures. Uses `Promise.allSettled` to isolate failures. | ✅ Active |
| **`functions/[[path]].js`** | Edge Router | Normalizes URLs, blocks path traversal, validates download URLs with `startsWith("https://")`, limits `/dl/` segments to <= 3. | ✅ Active |
| **`public/lib/router.js`** | SPA Router | Decodes path segments inside `try/catch` to prevent `URIError` crashes on malformed percent encoding. | ✅ Active |
| **`public/lib/api.js`** | Client API | Catches fetch network errors, parses server error messages, and throws clean user-facing error strings. | ✅ Active |
| **`public/components/ui/Toast.js`**| Toast Notifications | Dismisses cleanly with parent element check; auto-dismiss timers cancel safely. | ✅ Active |
| **`public/components/ui/Card.js`** | Card Sanitization | Assigns `textContent` for string inputs to prevent XSS injection. | ✅ Active |
| **`public/components/ui/Modal.js`**| Modal Sanitization | Uses `DOMPurify.sanitize()` with `textContent` fallback for string contents. | ✅ Active |
| **`public/components/sections/AppDetailView.js`** | Clipboard & Markdown | Catches clipboard permission failures and shows error toast; falls back to `<pre>` if CDN is offline. | ✅ Active |
| **`public/sw.js`** | Service Worker | Returns 503 offline JSON for failed `/api/` calls; guards `cache.put` with `method === "GET"`. | ✅ Active |

---

## 2. Identified Error Gaps & Required Hardening Matrix

| # | Subsystem / File | Error Scenario / Failure Mode | Current Behavior (Risk) | Required Hardening Safeguard | Target Phase |
| :-: | :--- | :--- | :--- | :--- | :---: |
| **1** | **`functions/api/apps.js`** | GitHub API completely offline or unauthenticated rate limit reached (60 req/hr). | Returns `{"apps":[],"count":0}`, causing blank UI. | Automatically fall back to built-in verified sample apps (`SAMPLE_APPS`). | **Phase 1** |
| **2** | **`functions/[[path]].js`** | Demo app requested on `get.vib.tools` when GitHub repo is not live. | Returns 404 plain text error. | Fall back to mock installer script and direct download link. | **Phase 1** |
| **3** | **`functions/[[path]].js`** | User requests version without `"v"` prefix (e.g. `/dl/app/1.0.3` vs `"v1.0.3"`). | Returns 404 because key `1.0.3` is not found. | Normalize version keys: attempt exact match, then `v${ver}`, then `ver.replace(/^v/, "")`. | **Phase 2** |
| **4** | **`functions/[[path]].js`** | Human user visits `get.vib.tools/cli` in a web browser. | Returns 404 plain text error: `App 'cli' not found`. | Inspect `Accept: text/html` and redirect to `https://apps.vib.tools/cli`. | **Phase 2** |
| **5** | **`functions/_lib/github.js`** | Cache API synthetic URL uses fake domain `cache.vib-apps-hub.internal`. | Risk of Cloudflare cache partition failure in production. | Use active request origin (`new URL("/__cache/gh/...", request.url)`). | **Phase 2** |
| **6** | **`public/components/layout/Sidebar.js`** | Category URL contains special CSS characters (e.g. `dev"tools`). | `catListContainer.querySelector` throws unhandled `DOMException`. | Wrap category name with `CSS.escape()`. | **Phase 3** |
| **7** | **`public/components/sections/AppGrid.js`** | App icon image fails to load or 404s on external CDN. | Broken image icon icon placeholder appears in card. | Add `onerror` handler falling back to SVG vector icon (`Icon("layers", 22)`). | **Phase 3** |
| **8** | **`public/app.js`** | Fast typing in search bar on inner views pushes dozens of history entries. | Pollutes history stack; breaks browser Back button. | Debounce search input (150ms) and use `window.history.replaceState`. | **Phase 3** |
| **9** | **`public/components/layout/Header.js`** | User presses `/` shortcut while a modal dialog is open or editing text. | Steals focus from modal into background search input. | Check if modal element exists or active element is `isContentEditable`. | **Phase 3** |
| **10** | **`functions/api/apps.js`** | High traffic spikes with cold cache hitting GitHub API repeatedly. | Secondary rate limit (429 Too Many Requests) from GitHub. | Cache aggregated `/api/apps` response in `caches.default` for 300 seconds. | **Phase 4** |
