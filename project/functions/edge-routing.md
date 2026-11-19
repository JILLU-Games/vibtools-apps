# Dual-Domain Edge Router: `functions/[[path]].js`

> **Module Role:** Intercepts incoming requests and implements host-based routing across `apps.vib.tools` and `get.vib.tools`.  
> **Last Updated:** 2026-11-19 (Cycle 2 Phase 2 SPA Header, Dot-Route & Versioned Browser Redirect Parity Applied)

---

## Domain Routing Logic

1. **Domain Detection:**
   - Host inspection: `request.headers.get("host")` or `url.host`, normalized to lowercase and stripped of port numbers.
   - Matching: Target is `get.vib.tools` if `host === "get.vib.tools"` or `url.searchParams.get("mode") === "get"`.

2. **`apps.vib.tools` Flow:**
   - Calls `context.next()`.
   - Passes execution to Cloudflare Pages static file server (`public/`) and `/api/*` endpoints.
   - **Reload-Safe Dot-Aware SPA Guarantee (`BUG-07`, `BUG-10`):**
     - If static asset lookup returns `404 Not Found` for a non-API path that is either a known SPA route (`/cli`, `/app/*`, `/category/*` — including dot-containing names like `/category/Node.js` or `/category/.NET`) or does not match `STATIC_ASSET_EXT_RE`, fetches `/index.html` via `env.ASSETS.fetch`.
     - Clones headers with `new Headers(indexRes.headers)` and sets a single clean `"Content-Type": "text/html; charset=utf-8"` header (zero duplicate header values), returning `200 OK`.
     - Real missing static assets (`.js`, `.css`, `.png`, `.ico`, etc.) continue to return `404 Not Found`.

3. **`get.vib.tools` Flow:**
   - **Safe URL Decoding (`BUG-03`):** Path segment `decodeURIComponent()` is wrapped in `try/catch`; malformed percent-encoding returns `400 Bad Request` (`Bad Request: Malformed URL encoding.`) instead of throwing `URIError`.
   - **Browser Navigation Redirect (`BUG-05`, `BUG-08`):**
     - Inspects `Accept: text/html` header.
     - Root (`/`): Redirects `302` to `https://apps.vib.tools`.
     - `/cli`: Redirects `302` to `https://apps.vib.tools/cli`.
     - `/<slug>` AND `/<slug>/<version>` (where `segments[0] !== "dl"`): Validates `isValidSlug(segments[0])` (`400 Bad Request` if invalid) before redirecting `302` to `https://apps.vib.tools/app/<slug>`.
     - Direct downloads (`/dl/<slug>[/<version>]`) and terminal/CLI requests (PowerShell `irm`, curl, wget) bypass HTML redirects.
   - **Root (`/`) for CLI:**
     - Returns `200 OK` plain-text quick reference for one-line PowerShell commands and direct download URLs.
   - **Direct Download (`/dl/<slug>` & `/dl/<slug>/<version>`):**
     - Enforces `isValidSlug(slug)` (`400 Bad Request` on invalid slugs).
     - Looks up app and loads `app.config.json` (activates `mockData.js` fallback **only** when `isMockFallbackEnabled(request, env)` is true).
     - Normalizes requested version using `resolveVersion()` guarded with `Object.hasOwn()` (accepts both `v1.0.3` and `1.0.3`, blocks prototype lookups).
     - Validates target binary URL via `isTrustedDownloadUrl(downloadUrl, env)` against the trusted HTTPS allowlist (`403 Forbidden` on untrusted/malformed targets).
     - Issues `302 Found` redirect directly to verified storage URL.
   - **PowerShell Installer Script (`/<slug>` & `/<slug>/<version>`):**
     - Enforces `isValidSlug(slug)` (`400 Bad Request` on invalid slugs).
     - Looks up app and loads `app.config.json` + `.vibtools/installer.ps1` (with env-gated `mockData.js` fallback).
     - Injects sanitized `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` at the top of the script.
     - Returns `200 OK` with `Content-Type: text/plain; charset=utf-8`, `X-Catalog-Source: live | mock`, and `Cache-Control: public, max-age=300` (live) or `no-store` (mock).
   - **Method Parity (`BUG-11`):** Local `server.js` enforces `405 Method Not Allowed` (`Allow: GET, HEAD`) for non-`GET`/`HEAD` requests matching Cloudflare Pages `onRequestGet`.
   - **Fallback:**
     - Returns `404 Not Found` plain-text for unknown endpoints.
