# Error Handling Matrix — Baseline v3.0 Inventory & Cycle 3 Additions

> **Baseline Reference:** `BASELINE-V3.0-2026-11-20`  
> **Scope:** Complete audit of all existing error handlers in `vib-apps-hub` + new edge SEO/routing/crawler error handling planned for Cycle 3.

---

## 1. Existing Error Handling Currently Working in Baseline v3.0

### A. Edge Backend & GitHub Auto-Collection (`functions/_lib/github.js`, `functions/api/apps.js`, `functions/[[path]].js`, `server.js`)

| Error Scenario | Where Handled | Exact Behavior / HTTP Contract | Status |
| :--- | :--- | :--- | :---: |
| Malformed percent-encoding (`/%E0%A4%A`) | `server.js:78-84`, `functions/[[path]].js:132-139` | Caught cleanly with `try/catch`; returns `400 Bad Request` plain text without uncaught `URIError` crash | Working |
| Invalid or traversal app slug (`../etc`, `bad!slug`) | `github.js` (`isValidSlug`), `apps.js:76-84`, `[[path]].js:154-159, 217-222, 269-274` | Returns `400 Bad Request` (`Cache-Control: no-store`) | Working |
| Invalid or unknown app slug in `/api/apps?slug=` or `get.vib.tools` | `apps.js:109-117`, `[[path]].js:227-232, 277-282` | Returns `404 Not Found` (`Cache-Control: no-store`) | Working |
| Prototype-chain or missing version key (`toString`, `constructor`, `v9.9.9`) | `[[path]].js:22-53` (`Object.hasOwn`), `236-244, 290-298` | Returns `404 Not Found` | Working |
| Frozen Schema v1 validation failure (unknown keys, bad slug, impossible date `2026-02-31`, bad sha256, non-HTTPS URL, traversal in `docs`/`installer`) | `github.js` (`validateAppConfig`) | Returns `{ ok: false, status: 422, error }` and skips broken repo cleanly in Mode A catalog (`Promise.allSettled`) | Working |
| Untrusted or non-HTTPS binary / remote installer URL (Open Redirect & SSRF guard) | `[[path]].js:249-257` (`isTrustedDownloadUrl`), `github.js` (`isTrustedInstallerUrl`), `[[path]].js:307-312` | Blocks with `403 Forbidden` | Working |
| Missing installer script or upstream GitHub 5xx | `[[path]].js:314-319` | Returns `502 Bad Gateway` plain text | Working |
| Store API `/api/apps` accessed on `get.vib.tools` | `apps.js:49-57, 276-284` | Domain-isolated; returns `404 Not Found` (`no-store`) on `GET` & `OPTIONS` | Working |
| Non-`GET`/`HEAD` HTTP methods (`POST`, `PUT`, `DELETE`) | `server.js:160-175` | Returns `405 Method Not Allowed` with `Allow: GET, HEAD` | Working |
| Empty or mocked catalog caching poison prevention | `apps.js:223-255` | Empty catalogs bypass Edge Cache (`Cache-Control: no-store`, `X-Cache-Status: BYPASS`) | Working |
| Cloudflare Cache API unavailable or throws | `apps.js:13-20, 91-106, 170-185`, `github.js` | Silent graceful fallback to live fetch | Working |
| Unexpected runtime exception in `/api/apps` or `server.js` | `apps.js:256-265`, `server.js:221-226` | Logs server-side error; returns safe `500 Internal Server Error` without leaking `GITHUB_TOKEN` | Working |
| Path traversal outside `public/` on local emulator | `server.js:90-96` | Normalized & prefix-checked; returns `403 Forbidden` | Working |
| Missing static asset (`.js`, `.css`, `.png`) | `[[path]].js:90-92`, `server.js:116-121` | Returns real `404 Not Found` (does not serve `index.html`) | Working |

### B. Client Frontend & PWA (`public/lib/*`, `public/components/*`, `public/sw.js`)

| Error Scenario | Where Handled | Exact Behavior | Status |
| :--- | :--- | :--- | :---: |
| Catalog or App Detail network failure / non-2xx API response | `public/lib/api.js`, `public/app.js:200-208`, `AppDetailView.js` | Throws descriptive error, emits `toast.error()`, renders clean error/empty state | Working |
| Rapid route switching / stale detail fetch race condition | `public/lib/api.js`, `AppDetailView.js` (`AbortController`) | Passes `AbortError` cleanly without false error toast | Working |
| Malicious HTML / XSS in repository `features.md` or `changelog.md` | `AppDetailView.js`, `SchemaGuideSection.js` | Mandatory `DOMPurify.sanitize(marked.parse(content))` | Working |
| Missing/broken app icon or header logo image | `AppGrid.js:40`, `AppDetailView.js`, `Header.js:33-35` | Graceful fallback to 2-letter monogram tile or vector SVG icon | Working |
| Clipboard API unavailable or denied | `public/lib/clipboard.js` | Falls back to offscreen `<textarea>` selection (`ui-sr-copy`); reports exact success/error via `toast` | Working |
| Offline API fetch in Service Worker | `public/sw.js:72-85` | Returns clean JSON `503 Service Unavailable` (`{ error: "Offline", message: "Network unavailable" }`) | Working |
| Offline page navigation in Service Worker | `public/sw.js:88-93` | Network-first with fallback to cached `/index.html` | Working |
| Cross-origin Google Fonts / CDN requests in Service Worker | `public/sw.js:69` | Bypassed completely (`if (url.origin !== self.location.origin) return;`) so SW never blocks external fonts | Working |

---

## 2. New Error Handling & Resilience Gaps Planned for Cycle 3

| Gap ID | Scenario | Target Phase | Planned Handling & Contract | Status |
| :--- | :--- | :---: | :--- | :---: |
| `ERR-SEO-01` | Unknown SPA route (`/foo/bar`) returns Soft `200 OK` | Phase 2 | Returns real HTTP **`404 Not Found`** HTML shell + `<meta name="robots" content="noindex, nofollow">` + `X-Robots-Tag: noindex, nofollow` + `Cache-Control: no-store` | Working (Phase 2) |
| `ERR-SEO-02` | Unregistered or invalid `/app/<slug>` returns Soft `200 OK` | Phase 2 | Validates `isValidSlug(slug)` & `resolveAppBySlug()`; if missing/invalid returns HTTP **`404 Not Found`** HTML + `noindex, nofollow` + `X-Robots-Tag` + `no-store` (while SPA still renders friendly UI) | Working (Phase 2) |
| `ERR-SEO-03` | HTML / JSON-LD injection / XSS via repo `name`, `tagline`, or category name in edge-rewritten `<head>` / `<noscript>` | Phase 1 & 2 | Strict `escapeHtml()` on all interpolated attributes/text & `<noscript>`, callback `safeReplace()` against `$` backreferences, and `escapeJsonLd()` (escaping `<`, `>`, `&`, U+2028/U+2029) on all `<script type="application/ld+json">` payloads | Working (Phase 1 & 2) |
| `ERR-SEO-04` | `env.ASSETS.fetch("/index.html")` fails or HTML rewrite throws during edge rewrite | Phase 1 | Guarded `try/catch` fallback in `rewriteStorefrontHtml()` returning raw `index.html` or upstream response cleanly without crashing edge worker | Working (Phase 1) |
| `ERR-SEO-05` | Single repo fails GitHub fetch or schema validation during `/sitemap.xml` or `/llms.txt` generation | Phase 3 | Uses `Promise.allSettled()` — skips failing repo with `console.warn` and still returns valid `200 OK` XML / `llms.txt` for all healthy repos + static routes | Working (Phase 3) |
| `ERR-SEO-06` | Invalid XML characters (`&`, `<`, `>`, `"`, `'`) in dynamic category/slug URLs inside `sitemap.xml` | Phase 3 | Strict `escapeXml()` + `encodeURIComponent()` on every `<loc>` and `<lastmod>` entry | Working (Phase 3) |
| `ERR-SEO-07` | `/sitemap.xml` or `/llms.txt` requested on `get.vib.tools` domain | Phase 3 | Returns `404 Not Found` (`X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`) to prevent duplicate indexing across domains | Working (Phase 3) |
| `ERR-SEO-08` | `HEAD` request (`curl -I`) on Cloudflare Pages wildcard routes (`[[path]].js`), `/sitemap.xml`, `/llms.txt` | Phase 2 & 3 | Exported `onRequestHead(context)` across `functions/[[path]].js`, `functions/sitemap.xml.js`, and `functions/llms.txt.js` returning exact `status` + `headers` with `null` body and stream cleanup | Working (Phase 2 & 3) |
| `ERR-SEO-09` | Malformed percent-encoding (`/%E0%A4%A`, `/category/%E0%A4%A`, `/app/%E0%A4%A`) | Phase 1 | `try/catch` around `decodeURIComponent()` in `parseStorefrontSeoRoute()`; returns `400 Bad Request` cleanly instead of crashing | Working (Phase 1) |
