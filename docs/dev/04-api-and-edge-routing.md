---
title: "Store API & Edge Routing Reference"
description: "Complete HTTP contract for /api/apps, Cloudflare Edge Cache behavior, get.vib.tools host routing, per-version installer resolution, and public AI/Schema endpoints."
order: 4
draft: false
---

# Store API & Edge Routing Reference

All HTTP endpoints are implemented as Cloudflare Pages Functions inside `functions/` and mirrored identically in `server.js` for local development.

## 1. Store API (`functions/api/apps.js`)

### Domain Isolation & Supported Methods

- **Domain Isolation:** Requests targeting `get.vib.tools` (or `?mode=get`) to `/api/apps` (`GET` or `OPTIONS`) return `404 Not Found` (`Cache-Control: no-store`) so the Store JSON API is strictly isolated to `apps.vib.tools`.
- `GET /api/apps` — Catalog aggregation (Mode A) or single app details (Mode B).
- `HEAD /api/apps` — Handled in `server.js` (empty body) and Cloudflare Pages Functions.
- `OPTIONS /api/apps` — Returns `204 No Content` with:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`
  - `Access-Control-Max-Age: 86400`
- Non-`GET`/`HEAD` requests to non-API edge routes return `405 Method Not Allowed` (`Allow: GET, HEAD`) in `server.js`.

### Mode A: Catalog Aggregation (`GET /api/apps`)

1. Checks `caches.default` under synthetic key `https://apps.vib.tools/__cache/api/apps/catalog`.
2. On cache hit, returns `200 OK` with `X-Cache-Status: HIT` and `X-Catalog-Source: live`.
3. On cache miss, reads deduplicated repository entries from `getRegistry()`, fetches each repo's `.vibtools/apps/app.config.json` (falling back to `.vibtools/app.config.json` on `404`) via `Promise.allSettled(entries.map(fetchAppConfig))`, validates strictly with `validateAppConfig()`, and deduplicates by normalized `slug` (first valid repo wins).
4. **Pure Repo-Only / Never Poisons Edge Cache:** There is zero demo/mock fallback. Verified live catalogs with `apps.length > 0` are written to `caches.default` (`Cache-Control: public, max-age=300`, `X-Cache-Status: MISS`, `X-Catalog-Source: live`). Empty catalogs (`{ apps: [], count: 0 }`) return `Cache-Control: no-store`, `X-Cache-Status: BYPASS`, and `X-Catalog-Source: live`.

**Response Schema (`200 OK`):**

```json
{
  "apps": [
    {
      "$schema": "https://apps.vib.tools/schemas/vibtools-app.schema.json",
      "schemaVersion": 1,
      "slug": "calgrid",
      "name": "CalGrid",
      "tagline": "Minimalist desktop calendar widget and event scheduler",
      "icon": "https://dl.vib.tools/calgrid/icon.png",
      "category": "Productivity",
      "access": "Free",
      "featured": true,
      "latest": "v1.0.3",
      "installer": { "type": "powershell", "script": ".vibtools/apps/installer.ps1" },
      "docs": {
        "features": ".vibtools/apps/features.md",
        "changelog": ".vibtools/apps/changelog.md"
      },
      "versions": {
        "v1.0.3": {
          "url": "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe",
          "size": "42.8 MB",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "released_at": "2026-11-15",
          "channel": "stable"
        }
      }
    }
  ],
  "count": 1
}
```

### Mode B: Single App Details (`GET /api/apps?slug=<slug>`)

1. Validates `slug` using `isValidSlug()` (`/^[a-z0-9][a-z0-9-_]{0,63}$/i`). Invalid or blank slugs return `400 Bad Request` (`Cache-Control: no-store`).
2. Checks `caches.default` under `https://apps.vib.tools/__cache/api/apps/detail/<encoded-slug>`. Returns `200 OK` (`X-Cache-Status: HIT`, `X-Catalog-Source: live`) on hit.
3. Resolves the repository via `resolveAppBySlug(slug, env, context)` — matching explicit registry `slug`, repo name fast-path, or scanning `.vibtools/apps/app.config.json` across URL-only registry entries when the repo name differs from `slug`.
4. Fetches `docs.features` and `docs.changelog` concurrently via `fetchAppDoc()` (bare filenames resolve under `.vibtools/apps/` first, then `.vibtools/`).
5. Returns `404 Not Found` (`Cache-Control: no-store`) if the slug is not registered in `registry.json` (zero mock fallback).
6. Caches verified live responses (`300s` TTL, `X-Cache-Status: MISS`, `X-Catalog-Source: live`).

**Response Schema (`200 OK`):**

```json
{
  "app": { "...": "validated app.config.json fields" },
  "docs": {
    "features": "# Features Markdown or null",
    "changelog": "# Changelog Markdown or null"
  }
}
```

**Error Responses:**

| HTTP Status | Trigger | JSON Body |
| :---: | :--- | :--- |
| `400` | Invalid or blank `slug` query param | `{ "error": "Bad Request", "message": "Invalid slug format ..." }` |
| `404` | App slug absent in registry and allowed fallback, or requested via `get.vib.tools` | `{ "error": "Not Found", "message": "..." }` (or plain-text on `get.vib.tools`) |
| `500` | Unhandled server exception | `{ "error": "Internal Server Error", "message": "..." }` |

## 2. Wildcard Host & Edge Router (`functions/[[path]].js`)

`onRequestGet(context)` validates percent-encoding (`decodeURIComponent`, returning `400` on malformed sequences), normalizes `host` (lowercase, port stripped), and dispatches:

```js
const isGetDomain = host === "get.vib.tools" || url.searchParams.get("mode") === "get";
```

### Branch A: `apps.vib.tools` (Default Storefront & Public Schema/AI Endpoints)

1. Serves static files from `public/` via `await context.next()`.
2. **Public CORS & Schema Headers:** For `/llms.txt`, `/schemas/*`, and `/vib-apps-engine/*`, attaches `Access-Control-Allow-Origin: *` and sets `Content-Type: application/schema+json; charset=utf-8` for `*.schema.json` so IDEs and AI coding agents can fetch specifications directly over HTTP.
3. **SPA Fallback:** If the static lookup returns `404`, `pathname` is neither `/api` nor `/api/*`, and the final path segment does **not** match a static asset extension (`js`, `mjs`, `css`, `json`, `xml`, `txt`, `md`, `html`, `png`, `jpg`, `jpeg`, `gif`, `svg`, `ico`, `webp`, `woff`, `woff2`, `ttf`, `map`, `webmanifest`), fetches `/index.html` and returns `200 OK` with a single clean `Content-Type: text/html; charset=utf-8`. Dot-containing SPA routes like `/category/Node.js`, `/category/.NET`, and `/app/my.app` resolve cleanly to the SPA shell while real missing assets return `404`.

### Branch B: `get.vib.tools` (or `?mode=get`)

| Route | Request Condition | Status | Response |
| :--- | :--- | :---: | :--- |
| `/` | `Accept` includes `text/html` | `302` | Redirects to `https://apps.vib.tools` |
| `/cli` | `Accept` includes `text/html` | `302` | Redirects to `https://apps.vib.tools/cli` |
| `/<slug>` or `/<slug>/<version>` | `Accept` includes `text/html` (`slug !== "dl"`, valid slug) | `302` | Redirects to `https://apps.vib.tools/app/<slug>` |
| `/` | Non-HTML CLI (`irm`, `curl`) | `200` | Plain-text usage instructions (`Cache-Control: public, max-age=3600`) |
| `/dl/<slug>` | Any | `302` | Redirects to `versions[latest].url` (verified via `isTrustedDownloadUrl()`) |
| `/dl/<slug>/<version>` | Any | `302` | Redirects to `versions[resolved].url` (verified via `isTrustedDownloadUrl()`) |
| `/dl/<slug>[/<version>]` | Untrusted host or non-`https://` binary URL | `403` | `Untrusted or invalid download URL for '<slug>' (<version>).` |
| `/<slug>` | Non-HTML CLI | `200` | `text/plain` installer script (resolving `versions[latest].installer` -> root `installer` -> repo fallback) with `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` prepended (`max-age=300`) |
| `/<slug>/<version>` | Non-HTML CLI | `200` | `text/plain` installer script (resolving `versions[resolved].installer` -> root `installer` -> repo fallback) with `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` prepended (`max-age=300`) |
| `/dl` (no slug) or invalid slug | Any | `400` | Plain-text validation error |
| Unknown path / >3 segments / missing app or version | Any | `404` | Plain-text error message |
| Untrusted remote installer URL or missing script | Non-HTML CLI | `403` / `502` | Plain-text error message |

### Version Normalization (`resolveVersion()`)

`resolveVersion(versions, requestedVersion, latestKey)` uses `Object.hasOwn()` (blocking prototype-chain names like `constructor` and `toString`) and resolves keys in four ordered steps:

1. Direct exact own-key match (`Object.hasOwn(versions, target)`).
2. Add leading `v` (`v${target.replace(/^v/i, "")}`).
3. Strip leading `v` (`target.replace(/^v/i, "")`).
4. Case-insensitive own-key match ignoring optional leading `v`.

## 3. Public AI & SEO Discovery Endpoints (`apps.vib.tools`)

| Endpoint | Content-Type | CORS | Purpose |
| :--- | :--- | :---: | :--- |
| `/llms.txt` | `text/plain; charset=utf-8` | `*` | Root AI discovery index pointing to schema, guides, and endpoints |
| `/llms-full.txt` | `text/plain; charset=utf-8` | `*` | Complete single-fetch AI master bundle (rules, step matrix, templates, checklist) |
| `/schemas/vibtools-app.schema.json` | `application/schema+json; charset=utf-8` | `*` | Frozen JSON Schema (Draft 2020-12, `schemaVersion: 1`) |
| `/vib-apps-engine/llms.txt` | `text/plain; charset=utf-8` | `*` | Compact AI Agent Master Specification & templates |
| `/vib-apps-engine/vibtools-app-config.md` | `text/markdown; charset=utf-8` | `*` | Complete A–Z Basic-to-Advanced setup manual |
| `/vib-apps-engine/ai-guide.md` | `text/markdown; charset=utf-8` | `*` | AI Execution Playbook & ready-to-paste prompt |
| `/robots.txt` | `text/plain; charset=utf-8` | — | Search & AI crawler permissions + sitemap pointer |
| `/sitemap.xml` | `application/xml; charset=utf-8` | — | Canonical XML sitemap of storefront, schema, and guides |

## Related Guides

- [System Architecture & Data Flow](./01-architecture.md)
- [App Onboarding & `.vibtools/` Schema](./03-app-onboarding.md)
- [Security, Validation & Audited Findings](./05-security-and-validation.md)
- [Vib Apps Engine AI Guide & Playbook](./08-vib-apps-engine-ai-guide.md)
