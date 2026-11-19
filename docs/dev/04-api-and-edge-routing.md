---
title: "Store API & Edge Routing Reference"
description: "Complete HTTP contract for /api/apps, Cloudflare Edge Cache behavior, get.vib.tools host routing, version normalization, and SPA fallback."
order: 4
draft: false
---

# Store API & Edge Routing Reference

All HTTP endpoints are implemented as Cloudflare Pages Functions inside `functions/` and mirrored identically in `server.js` for local development.

## 1. Store API (`functions/api/apps.js`)

### Supported Methods & CORS

- `GET /api/apps` — Catalog aggregation (Mode A) or single app details (Mode B).
- `HEAD /api/apps` — Handled in `server.js` (empty body) and Cloudflare Pages Functions.
- `OPTIONS /api/apps` — Returns `204 No Content` with:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`
  - `Access-Control-Max-Age: 86400`
- Other HTTP methods return `405 Method Not Allowed` in `server.js`.

### Mode A: Catalog Aggregation (`GET /api/apps`)

1. Checks `caches.default` under synthetic key `https://apps.vib.tools/__cache/api/apps/catalog`.
2. On cache hit, returns `200 OK` with `X-Cache-Status: HIT`.
3. On cache miss, iterates `getRegistry()` via `Promise.allSettled(entries.map(fetchAppConfig))`, logs warnings for failed entries, and falls back to `getMockApps()` when `apps.length === 0`.
4. Stores the serialized payload in `caches.default` with `Cache-Control: public, max-age=300` via `context.waitUntil()` and returns `200 OK` with `X-Cache-Status: MISS`.

**Response Schema (`200 OK`):**

```json
{
  "apps": [
    {
      "slug": "calgrid",
      "name": "CalGrid",
      "tagline": "Minimalist desktop calendar widget and event scheduler",
      "icon": "https://dl.vib.tools/calgrid/icon.png",
      "category": "Productivity",
      "access": "Free",
      "featured": true,
      "latest": "v1.0.3",
      "installer": { "type": "powershell", "script": ".vibtools/installer.ps1" },
      "docs": { "features": "features.md", "changelog": "changelog.md" },
      "versions": {
        "v1.0.3": {
          "url": "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe",
          "size": "42.8 MB",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "released_at": "2026-11-15"
        }
      }
    }
  ],
  "count": 1
}
```

### Mode B: Single App Details (`GET /api/apps?slug=<slug>`)

1. Validates `slug` using `isValidSlug()` (`/^[a-z0-9][a-z0-9-_]{0,63}$/i`). Invalid or empty slugs return `400 Bad Request`.
2. Looks up `findAppEntry(slug)` in `registry.json`; if found and `fetchAppConfig()` succeeds, fetches `docs.features` and `docs.changelog` concurrently via `Promise.all()`.
3. If live config is unavailable, checks `findMockApp(slug)` and `getMockDoc(slug, "features" | "changelog")`.
4. If still not found, returns `404 Not Found`.

**Response Schema (`200 OK`):**

```json
{
  "app": { "...": "app.config.json fields" },
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
| `404` | App slug absent in registry and fallback catalog | `{ "error": "Not Found", "message": "App with slug '...' was not found in registry or catalog." }` |
| `500` | Unhandled server exception | `{ "error": "Internal Server Error", "message": "..." }` |

## 2. Wildcard Host & Edge Router (`functions/[[path]].js`)

`onRequestGet(context)` normalizes `request.headers.get("host")` (lowercase, port stripped) and computes:

```js
const isGetDomain = host === "get.vib.tools" || url.searchParams.get("mode") === "get";
```

### Branch A: `apps.vib.tools` (Default Storefront)

1. Calls `await context.next()` to serve static files from `public/`.
2. If the response status is `404`, `pathname` is neither `/api` nor `/api/*`, and `pathname` has no file extension (`!/\.[a-zA-Z0-9]+$/`), fetches `/index.html` from `env.ASSETS.fetch()` and returns `200 OK` (`text/html; charset=utf-8`).

### Branch B: `get.vib.tools` (or `?mode=get`)

| Route | Request Condition | Status | Response |
| :--- | :--- | :---: | :--- |
| `/` | `Accept` includes `text/html` | `302` | Redirects to `https://apps.vib.tools` |
| `/cli` | `Accept` includes `text/html` | `302` | Redirects to `https://apps.vib.tools/cli` |
| `/<slug>` | `Accept` includes `text/html` (`slug !== "dl"`) | `302` | Redirects to `https://apps.vib.tools/app/<slug>` |
| `/` | Non-HTML CLI (`irm`, `curl`) | `200` | Plain-text usage instructions (`Cache-Control: public, max-age=3600`) |
| `/dl/<slug>` | Any | `302` | Redirects to `versions[latest].url` (validated `https://`) |
| `/dl/<slug>/<version>` | Any | `302` | Redirects to `versions[resolved].url` (validated `https://`) |
| `/<slug>` | Non-HTML CLI | `200` | `text/plain` PowerShell script with `$APP_SLUG` + latest `$APP_VERSION` (`max-age=300`) |
| `/<slug>/<version>` | Non-HTML CLI | `200` | `text/plain` PowerShell script with `$APP_SLUG` + resolved `$APP_VERSION` (`max-age=300`) |
| `/dl` (no slug) | Any | `400` | `Missing app slug in download path. Usage: /dl/<slug>[/<version>]` |
| Unknown path / >3 segments / missing app or version | Any | `404` | Plain-text error message |
| Missing installer script for valid app | Non-HTML CLI | `502` | `Failed to load installer script for '<slug>'.` |

### Version Normalization (`resolveVersion()`)

`resolveVersion(versions, requestedVersion, latestKey)` resolves keys in four ordered steps:

1. Direct exact key match (`versions[target]`).
2. Add leading `v` (`v${target.replace(/^v/i, "")}`).
3. Strip leading `v` (`target.replace(/^v/i, "")`).
4. Case-insensitive match ignoring optional leading `v`.

## Related Guides

- [System Architecture & Data Flow](./01-architecture.md)
- [Security, Validation & Audited Findings](./05-security-and-validation.md)
- [Local Setup & Cloudflare Deployment](./06-local-setup-and-deployment.md)
