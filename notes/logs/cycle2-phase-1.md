# Execution Log — Cycle 2 Phase 1: Production Data, Security & Crash Hardening

> **Timestamp:** 2026-11-19  
> **Phase:** Cycle 2 — Phase 1 of 4  
> **Bugs Closed:** `BUG-01`, `BUG-02`, `BUG-03`, `BUG-04`, `BUG-05` (+ bonus post-audit hardening: `Object.hasOwn` in `resolveVersion` & `Cache-Control: no-store` on API errors)  
> **Status:** Completed & Verified

---

## 1. Scope Lock Compliance Verification

### Allowed Files Modified (5 / 5 — 100% Within Scope Lock)
1. `functions/_lib/mockData.js`
2. `functions/api/apps.js`
3. `functions/[[path]].js`
4. `server.js`
5. `.env.example`

### Protected / Untouched Files Verified
- **0 files** modified in `public/` (UI, CSS, components, layouts, themes, router, SW untouched).
- **0 files** modified in `functions/_lib/github.js`, `registry.json`, `package.json`, `wrangler.toml`.

---

## 2. Implemented Changes & Exact Proof

1. **`BUG-01` (Env-Gated Mock Fallback & Zero Edge Cache Poisoning):**
   - Exported `isMockFallbackEnabled(request, env)` from `functions/_lib/mockData.js`: honors explicit `ENABLE_MOCK_FALLBACK` (`true`/`1` or `false`/`0`), defaults `true` on `localhost`, `127.0.0.1`, `*.pages.dev`, `*.run.app`, and defaults `false` on live custom domains (`apps.vib.tools`, `get.vib.tools`).
   - Updated `functions/api/apps.js` (Mode A & Mode B) and `functions/[[path]].js` (`/dl/` & `/<slug>`) to gate mock lookups with `isMockFallbackEnabled`.
   - Restricted `caches.default.put(...)` in `functions/api/apps.js` strictly to `catalogSource === "live" && apps.length > 0`, emitting `X-Catalog-Source: live | mock`, `X-Cache-Status: HIT | MISS | BYPASS`, and `Cache-Control: no-store` for mock/empty/error responses.
   - Documented `ENABLE_MOCK_FALLBACK` and `ALLOWED_DOWNLOAD_HOSTS` in `.env.example`.
2. **`BUG-02` (Demo PowerShell Installer Hardening):**
   - Updated `functions/[[path]].js` to inject sanitized `$APP_NAME` alongside `$APP_SLUG` and `$APP_VERSION`.
   - Upgraded all 3 mock PowerShell scripts (`calgrid`, `devprompt`, `vibclip`) in `functions/_lib/mockData.js` with safe variable fallbacks, real `Invoke-WebRequest -Uri $DownloadUrl -OutFile $TargetFile -UseBasicParsing`, `Get-FileHash -Algorithm SHA256`, and `try/catch` error handling.
3. **`BUG-03` (`URIError` Crash Protection):**
   - Wrapped `decodeURIComponent()` in `try/catch` in both `functions/[[path]].js` and `server.js` (`serveStaticAsset`), returning `400 Bad Request` on malformed percent-encoding (`/%E0%A4%A`).
4. **`BUG-04` (`/dl/` Open-Redirect Host Allowlist):**
   - Added & exported `isTrustedDownloadUrl(rawUrl, env)` in `functions/[[path]].js`: parses via `new URL()`, requires `https:`, rejects embedded credentials, and enforces trusted host allowlist (`dl.vib.tools`, `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, plus optional `env.ALLOWED_DOWNLOAD_HOSTS`). Rejects untrusted targets with `403 Forbidden`.
5. **`BUG-05` (`isValidSlug()` Enforcement on `get.vib.tools`):**
   - Imported `isValidSlug` in `functions/[[path]].js` and enforced it on HTML browser redirects, `/dl/<slug>`, and `/<slug>[/<version>]` (`400 Bad Request` on invalid slugs).
6. **Post-Patch Scope-Locked Audit Additions:**
   - Replaced bracket lookup with `Object.hasOwn(versions, ...)` in `resolveVersion()` (`functions/[[path]].js`) to prevent prototype property lookup (`toString`, `constructor`).
   - Added `Cache-Control: no-store` to `400`/`404`/`500` error responses in `functions/api/apps.js`.

---

## 3. Verification Proof

- `npm run build` & `npm run lint`: **PASS**
- `node --test server.test.js public/lib/appMeta.test.js`: **12 / 12 PASS**
- Post-patch live edge audit probes: **26 / 26 PASS** (verified live prod isolation, zero cache poisoning across requests, `$APP_NAME` + `Invoke-WebRequest`, `400` on `/%E0%A4%A`, `403` on untrusted download hosts, `400` on invalid slugs, `404` on prototype keys `toString`/`constructor`, `no-store` on API error responses).
