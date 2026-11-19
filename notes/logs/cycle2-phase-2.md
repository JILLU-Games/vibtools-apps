# Execution Log — Cycle 2 Phase 2: Backend Edge Engine, Caching & Routing Parity

> **Timestamp:** 2026-11-19  
> **Phase:** Cycle 2 — Phase 2 of 4  
> **Bugs Closed:** `BUG-06`, `BUG-07`, `BUG-08`, `BUG-09`, `BUG-10`, `BUG-11`  
> **Status:** Completed & Verified

---

## 1. Scope Lock Compliance Verification

### Allowed Files Modified (4 / 4 — 100% Within Scope Lock)
1. `functions/api/apps.js`
2. `functions/[[path]].js`
3. `functions/_lib/github.js`
4. `server.js`

### Protected / Untouched Files Verified
- **0 files** modified in `public/` (UI, CSS, components, layouts, themes, router, SW untouched).
- **0 files** modified in `functions/_lib/mockData.js`, `registry.json`, `package.json`, `wrangler.toml`, `.env.example`.

---

## 2. Implemented Changes & Exact Proof

1. **`BUG-06` (Mode B Response-Level Edge Caching):**
   - Added `getEdgeCache()` in `functions/api/apps.js` and wrapped Mode B (`GET /api/apps?slug=<slug>`) with `caches.default` keyed on `https://apps.vib.tools/__cache/api/apps/detail/<lowercase-slug>` (`300s` TTL).
   - Emits `X-Cache-Status: HIT | MISS | BYPASS` and `X-Catalog-Source: live | mock`; strictly caches live responses only (never caches mock/404/error responses).
2. **`BUG-07` (Single Clean `Content-Type` Header on SPA Fallback):**
   - Replaced object-spread header merge in `functions/[[path]].js` with `new Headers(indexRes.headers)` + `spaHeaders.set("Content-Type", "text/html; charset=utf-8")`, eliminating duplicate `text/html; charset=utf-8, text/html; charset=utf-8`.
3. **`BUG-08` (Versioned Browser Redirect on `get.vib.tools`):**
   - Extended `isHtml` redirect condition in `functions/[[path]].js` to `(segments.length === 1 || segments.length === 2) && segments[0] !== "dl"` (with `isValidSlug` guard), redirecting browsers visiting `get.vib.tools/<slug>/<version>` to `https://apps.vib.tools/app/<slug>` (`302`) while keeping CLI scripts and `/dl/` downloads intact.
4. **`BUG-09` (`/api/apps` Isolation from `get.vib.tools`):**
   - Added `isGetDomainRequest(request, url)` in `functions/api/apps.js` (`onRequestGet` and `onRequestOptions`), returning `404 Not Found` (`Cache-Control: no-store`) on `get.vib.tools` (and `?mode=get`).
5. **`BUG-10` (Dot-Safe SPA Fallback):**
   - Replaced broad `/\.[a-zA-Z0-9]+$/` in `functions/[[path]].js` with `isKnownSpaRoute` (`/cli`, `/app/*`, `/category/*`) + explicit `STATIC_ASSET_EXT_RE`, so dot-containing routes (`/category/Node.js`, `/category/.NET`, `/app/my.app`) reload with `200 OK` HTML shell while real missing static files (`.js`, `.png`, `.css`) still return `404`.
6. **`BUG-11` (Deep `validateAppConfig()` & `405` Parity in `server.js`):**
   - Exported `validateAppConfig(config)` in `functions/_lib/github.js` verifying plain object root, non-empty string `slug`/`name`/`latest`, non-empty plain object `versions`, and matching `latest` entry (`422` on violations).
   - Added `405 Method Not Allowed` (`Allow: GET, HEAD`) guard for non-`GET`/`HEAD` requests before `wildcardGet(context)` in `server.js`.

---

## 3. Verification Proof

- `npm run build` & `npm run lint`: **PASS**
- `node --test server.test.js public/lib/appMeta.test.js`: **12 / 12 PASS**
- Post-patch Phase 2 live edge audit probes: **27 / 27 PASS** (covering Mode B `HIT`/`BYPASS`, single `Content-Type`, versioned `get.vib.tools` HTML redirect vs CLI/DL preservation, `get.vib.tools/api/apps` `404`, `/category/Node.js` + `/category/.NET` `200` vs `/missing-script.js` `404`, all 7 `validateAppConfig` cases, and `POST`/`DELETE`/`PUT` `405` parity).
