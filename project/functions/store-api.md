# Store API: `functions/api/apps.js`

> **Module Role:** Public JSON API endpoint serving application catalogue data and single app details with rendered Markdown documentation.

---

## Endpoint Details

### 1. Catalog List: `GET /api/apps`
- **Trigger:** Request to `/api/apps` without a `slug` query parameter.
- **Workflow:**
  1. Checks Cloudflare Edge Cache (`caches.default`) for synthetic key `https://apps.vib.tools/__cache/api/apps/catalog`.
  2. If found (Cache HIT), returns the aggregated catalog JSON immediately with header `X-Cache-Status: HIT` without querying GitHub API.
  3. If missing (Cache MISS), reads all registered app entries via `getRegistry()`.
  4. Concurrently fetches `.vibtools/apps/app.config.json` for each entry via `fetchAppConfig` wrapped in `Promise.allSettled`.
  5. Omits inaccessible or invalid repositories gracefully with a console warning.
  6. If 0 live apps are resolved, activates fallback catalog (`getMockApps()`).
  7. Stores aggregated JSON in Cloudflare Edge Cache with a 300-second TTL via `context.waitUntil()`.
  8. Returns HTTP `200 OK` with header `X-Cache-Status: MISS`.
- **Response:**
  - Status: `200 OK`
  - Headers:
    - `Content-Type: application/json; charset=utf-8`
    - `Cache-Control: public, max-age=300`
    - `Access-Control-Allow-Origin: *`
    - `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
    - `Access-Control-Allow-Headers: Content-Type, Authorization`
  - Body:
    ```json
    {
      "apps": [ ...configs ],
      "count": 1
    }
    ```
  - **Fallback:** If 0 apps are resolved from live GitHub repositories (due to unconfigured repos, rate-limits, or offline dev), automatically returns schema-compliant sample apps (`CalGrid`, `DevPrompt`, `VibClip`).

### 2. Single App Details + Documentation: `GET /api/apps?slug=<slug>`
- **Trigger:** Request with `?slug=<slug>`.
- **Workflow:**
  1. Validates and finds repository entry via `findAppEntry(slug)` (or sample app fallback `findMockApp(slug)`). Returns `404` JSON if not found.
  2. Fetches `app.config.json` via `fetchAppConfig` (or mock metadata).
  3. Fetches `features.md` (`config.docs?.features`) and `changelog.md` (`config.docs?.changelog`) in parallel via `fetchAppDoc` (or mock docs).
- **Response:**
  - Status: `200 OK`
  - Headers:
    - `Content-Type: application/json; charset=utf-8`
    - `Cache-Control: public, max-age=300`
    - `Access-Control-Allow-Origin: *`
    - `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
    - `Access-Control-Allow-Headers: Content-Type, Authorization`
  - Body:
    ```json
    {
      "app": { ...config },
      "docs": {
        "features": "...markdown...",
        "changelog": "...markdown..."
      }
    }
    ```

### 3. Preflight Handling: `OPTIONS /api/apps`
- **Response:**
  - Status: `204 No Content`
  - Headers:
    - `Access-Control-Allow-Origin: *`
    - `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
    - `Access-Control-Allow-Headers: Content-Type, Authorization`
    - `Access-Control-Max-Age: 86400`
