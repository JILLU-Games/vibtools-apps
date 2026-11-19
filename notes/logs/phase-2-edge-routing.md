# Phase 2 Execution Log — Edge Routing, CORS & CLI Normalization

> **Date:** 2026-11-19  
> **Phase:** Phase 2 (Completed)  
> **Status:** Verified & Passed (8/8 Tests Pass)  
> **Author:** Antigravity (Senior Software Engineer & Architect)

---

## 1. Scope Lock Compliance
- **Allowed Files:**
  - `functions/_lib/github.js` (Modified)
  - `functions/api/apps.js` (Modified)
  - `functions/[[path]].js` (Modified)
- **Forbidden Files:** ALL files in `public/`, `docs/`, `project/`, and `registry.json` remained 100% untouched.

---

## 2. Deliverables & Features Added
1. **`functions/_lib/github.js` (Zone-Aligned Edge Cache URL):**
   - Replaced synthetic host `https://vibtools.internal/...` with zone-aligned `https://apps.vib.tools/__cache/gh/${repo}/${branch}/${cleanPath}`.
   - Prevents Cloudflare Edge Cache API partition failures where requests outside the active zone are dropped.
2. **`functions/api/apps.js` (CORS Integration & Preflight Handling):**
   - Injected standard CORS headers (`Access-Control-Allow-Origin: *`, `Methods: GET, HEAD, OPTIONS`, `Headers: Content-Type, Authorization`) across all GET responses.
   - Added exported `onRequestOptions()` returning HTTP `204 No Content` with `Access-Control-Max-Age: 86400` to properly handle CORS preflight checks from external clients, third-party dashboards, or web tools.
3. **`functions/[[path]].js` (Version Normalization & Browser Redirect):**
   - Implemented helper `resolveVersion(versions, requestedVersion, latestKey)` supporting:
     - Direct key matches
     - Auto-prepending `"v"` (e.g. user passes `"1.0.3"`, matched against `"v1.0.3"`)
     - Auto-stripping `"v"` (e.g. user passes `"v1.0.3"`, matched against `"1.0.3"`)
     - Case-insensitive key comparison
   - Integrated `resolveVersion()` into Route 2 (`/dl/<slug>[/<version>]`) and Route 3 (`/<slug>[/<version>]`).
   - Implemented Browser HTML Navigation Redirect: Checks `Accept: text/html` header on `get.vib.tools`. If a browser requests `/`, `/cli`, or `/<slug>`, issues a 302 redirect to `https://apps.vib.tools`, `https://apps.vib.tools/cli`, or `https://apps.vib.tools/app/<slug>`. CLI callers (PowerShell `irm`) omit `text/html` and seamlessly receive the installer script.

---

## 3. Automated Verification Results (8/8 Passed)
Dev server test suite executed against `http://127.0.0.1:8788`:
```text
[PASS] 1. Version normalization in /dl (without v: 1.0.3) -> Status: 302 Location: https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe
[PASS] 2. Version normalization in /dl (with v: v1.0.3) -> Status: 302 Location: https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe
[PASS] 3. Version normalization in script streaming (without v: 1.0.3) -> Status: 200 Location: none
[PASS] 4. Browser HTML redirect for /cli on get.vib.tools -> Status: 302 Location: https://apps.vib.tools/cli
[PASS] 5. Browser HTML redirect for /calgrid on get.vib.tools -> Status: 302 Location: https://apps.vib.tools/app/calgrid
[PASS] 6. CLI request for /calgrid is NOT redirected to HTML -> Status: 200 Location: none
[PASS] 7. CORS header present on GET /api/apps -> Status: 200 Location: none
[PASS] 8. CORS preflight OPTIONS /api/apps returns 204 -> Status: 204 Location: none
Result: 8 out of 8 tests passed.
```
