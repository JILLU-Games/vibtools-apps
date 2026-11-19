# Dual-Domain Edge Router: `functions/[[path]].js`

> **Module Role:** Intercepts incoming requests and implements host-based routing across `apps.vib.tools` and `get.vib.tools`.

---

## Domain Routing Logic

1. **Domain Detection:**
   - Host inspection: `request.headers.get("host")` or `url.host`, normalized to lowercase and stripped of port numbers.
   - Matching: Target is `get.vib.tools` if `host === "get.vib.tools"` or `url.searchParams.get("mode") === "get"`.

2. **`apps.vib.tools` Flow:**
   - Calls `context.next()`.
   - Passes execution to Cloudflare Pages static file server (`public/`) and `/api/*` endpoints.
   - **Reload-Safe SPA Guarantee:** If static asset returns `404 Not Found` for a non-API route without file extension (e.g., `/app/calgrid`, `/category/utilities`, `/cli`), transparently fetches and serves `/index.html` with `200 OK` preserving the active URL and inner view.

3. **`get.vib.tools` Flow:**
   - **Browser Navigation Redirect:**
     - Inspects `Accept: text/html` header.
     - Root (`/`): Redirects `302` to `https://apps.vib.tools`.
     - `/cli`: Redirects `302` to `https://apps.vib.tools/cli`.
     - `/<slug>`: Redirects `302` to `https://apps.vib.tools/app/<slug>`.
     - Terminal/CLI requests (PowerShell `irm`, curl, wget) bypass this and receive raw text/scripts.
   - **Root (`/`) for CLI:**
     - Returns `200 OK` plain-text quick reference for one-line PowerShell commands and direct download URLs.
   - **Direct Download (`/dl/<slug>` & `/dl/<slug>/<version>`):**
     - Looks up app and loads `app.config.json` (or sample app fallback from `mockData.js`).
     - Normalizes requested version using `resolveVersion()` (accepts both `v1.0.3` and `1.0.3`).
     - Validates version existence and `https://` binary URL.
     - Issues `302 Found` redirect directly to Cloudflare R2 storage (`dl.vib.tools`).
   - **PowerShell Installer Script (`/<slug>` & `/<slug>/<version>`):**
     - Looks up app and loads `app.config.json` (or sample app fallback from `mockData.js`).
     - Normalizes requested version using `resolveVersion()`.
     - Fetches raw `.vibtools/installer.ps1` via `fetchAppInstaller` (or mock installer from `mockData.js`).
     - Injects sanitized variables at the top of the script:
       ```powershell
       $APP_SLUG = "<slug>"
       $APP_VERSION = "<version>"
       ```
     - Returns `200 OK` with `Content-Type: text/plain; charset=utf-8` and `Cache-Control: public, max-age=300`.
   - **Fallback:**
     - Returns `404 Not Found` plain-text for unknown endpoints.
