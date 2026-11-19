# Store API: `functions/api/apps.js`

> **Module Role:** Public JSON API endpoint serving application catalogue data and single app details with rendered Markdown documentation.  
> **Last Updated:** 2026-11-19 (Cycle 2 Phase 2 Mode B Edge Caching & `get.vib.tools` Host Isolation Applied)

---

## Host Isolation (`BUG-09`)

- `isGetDomainRequest(request, url)` checks `host === "get.vib.tools"` (and local `?mode=get`).
- Both `onRequestGet` and `onRequestOptions` reject requests targeting `get.vib.tools` with `404 Not Found` (`text/plain; charset=utf-8`, `Cache-Control: no-store`), keeping the CLI domain strictly isolated from the Store JSON API.

---

## Endpoint Details

### 1. Catalog List: `GET /api/apps`
- **Trigger:** Request to `/api/apps` on `apps.vib.tools` (or local dev) without a `slug` query parameter.
- **Workflow:**
  1. Checks Cloudflare Edge Cache (`caches.default`) for synthetic key `https://apps.vib.tools/__cache/api/apps/catalog`.
  2. If found (Cache HIT), returns the aggregated live catalog JSON immediately with `X-Cache-Status: HIT` and `X-Catalog-Source: live` without querying GitHub API.
  3. If missing (Cache MISS), reads all registered app entries via `getRegistry()`.
  4. Concurrently fetches `.vibtools/apps/app.config.json` for each entry via `fetchAppConfig` wrapped in `Promise.allSettled`.
  5. Omits inaccessible or invalid repositories gracefully with a console warning.
  6. If 0 live apps are resolved, activates `getMockApps()` **only when `isMockFallbackEnabled(request, env)` is true** (enabled by default on `localhost`, `127.0.0.1`, `*.pages.dev`, `*.run.app`, and disabled by default on live production custom domains unless `ENABLE_MOCK_FALLBACK=true`).
  7. Writes to `caches.default` (`300s` TTL) **strictly when `catalogSource === "live" && apps.length > 0`** — mock and empty fallback responses never poison the edge cache (`Cache-Control: no-store`, `X-Cache-Status: BYPASS`).
  8. Returns HTTP `200 OK` with `X-Catalog-Source: live | mock` and `X-Cache-Status: HIT | MISS | BYPASS`.
- **Response:**
  - Status: `200 OK`
  - Headers:
    - `Content-Type: application/json; charset=utf-8`
    - `Cache-Control: public, max-age=300` *(live non-empty)* or `no-store` *(mock/empty/error)*
    - `X-Cache-Status: HIT | MISS | BYPASS`
    - `X-Catalog-Source: live | mock`
    - `Access-Control-Allow-Origin: *`
    - `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
    - `Access-Control-Allow-Headers: Content-Type, Authorization`

### 2. Single App Details + Documentation: `GET /api/apps?slug=<slug>` (`BUG-06`)
- **Trigger:** Request with `?slug=<slug>` on `apps.vib.tools` (or local dev).
- **Workflow:**
  1. Validates `isValidSlug(slug)` (`400 Bad Request` with `Cache-Control: no-store` on failure).
  2. Checks Cloudflare Edge Cache (`caches.default`) for synthetic key `https://apps.vib.tools/__cache/api/apps/detail/<lowercase-slug>`. On hit, immediately returns `200 OK` with `X-Cache-Status: HIT` and `X-Catalog-Source: live`.
  3. On miss, finds repository entry via `findAppEntry(slug)` and fetches `app.config.json` + parallel Markdown docs (`features.md`, `changelog.md`).
  4. Falls back to `findMockApp(slug)` **only when `isMockFallbackEnabled(request, env)` is true**.
  5. Returns `404 Not Found` (`Cache-Control: no-store`) if neither live nor permitted mock entry exists.
  6. Stores verified live detail payloads in `caches.default` (`300s` TTL via `context.waitUntil`); bypasses cache (`X-Cache-Status: BYPASS`, `Cache-Control: no-store`) for mock responses.
- **Response:**
  - Status: `200 OK`
  - Headers:
    - `Content-Type: application/json; charset=utf-8`
    - `Cache-Control: public, max-age=300` *(live)* or `no-store` *(mock)*
    - `X-Cache-Status: HIT | MISS | BYPASS`
    - `X-Catalog-Source: live | mock`
    - CORS headers (`*`, `GET, HEAD, OPTIONS`)

### 3. Preflight Handling: `OPTIONS /api/apps`
- Returns `404 Not Found` on `get.vib.tools`; returns `204 No Content` with CORS headers (`Access-Control-Max-Age: 86400`) on `apps.vib.tools`.
