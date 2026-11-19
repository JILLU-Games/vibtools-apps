---
title: "Security, Validation & Audited Findings"
description: "Security architecture, input validation rules, XSS controls, and verified implementation limitations discovered during forensic audit."
order: 5
draft: false
---

# Security, Validation & Audited Findings

This document catalogs every implemented security control alongside verified limitations and implementation findings observed directly in source code.

## 1. Implemented Security Controls

| Control Area | Implementation | Source Location |
| :--- | :--- | :--- |
| **Server-Side Secret Isolation** | `GITHUB_TOKEN` is read exclusively from `env.GITHUB_TOKEN` inside Pages Functions and sent as `Authorization: Bearer <token>` to `api.github.com`. Never serialized to clients, responses, or `public/`. | `functions/_lib/github.js:119–121` |
| **Slug Validation** | Strict regex `/^[a-z0-9][a-z0-9-_]{0,63}$/i` rejects empty strings, path separators, special characters, and oversized slugs. | `functions/_lib/github.js:10–15`, `functions/api/apps.js:41` |
| **Directory Traversal Protection** | `fetchRepoFile()` URI-decodes paths and rejects any path containing `..` segments with status `400`. `serveStaticAsset()` normalizes paths and enforces `fullPath.startsWith(PUBLIC_DIR)` (`403 Forbidden`). | `functions/_lib/github.js:73–81`, `server.js:81–87` |
| **PowerShell Variable Sanitization** | Before interpolating `$APP_SLUG` and `$APP_VERSION` into streamed `.ps1` scripts, both values strip all characters matching `/[^a-zA-Z0-9._-]/g`. | `functions/[[path]].js:289–292` |
| **Download Scheme Verification** | `/dl/*` validates `typeof downloadUrl === "string" && downloadUrl.startsWith("https://")` before issuing a `302` redirect. | `functions/[[path]].js:214` |
| **XSS Prevention (Markdown & Modal)** | `AppDetailView.js` passes `marked.parse(rawMd)` through `DOMPurify.sanitize()`; if CDNs are unavailable offline, renders raw text inside `<pre>` using `.textContent`. `Modal.js` also sanitizes string `content`/`footer` through `DOMPurify.sanitize()`. | `public/components/sections/AppDetailView.js:54–62`, `public/components/ui/Modal.js:89–110` |
| **Safe External Links & Tabnabbing Prevention** | External `target="_blank"` anchors set `rel="noopener noreferrer"` automatically in `Button.js`, `Sidebar.js`, `Footer.js`, and `AppDetailView.js`. `AppDetailView.js` validates `app.links` values against `/^https?:\/\//i`. | `public/components/ui/Button.js:46–50`, `public/components/sections/AppDetailView.js:758` |
| **No Client Auth / No Cookies** | Zero user authentication, session cookies, or tracking scripts. Browser storage is limited to `localStorage.getItem("vib_theme")`. | `public/lib/theme.js:7–46` |

## 2. Verified Implementation Findings & Limitations

The following findings were identified directly in source code during forensic audit and are documented transparently for maintainers:

### Finding 1: Mock Installer Scripts Reference Uninjected `$APP_NAME`
- **Where:** `functions/_lib/mockData.js` (lines `42`, `49`, `51`, `108`, `115`, `116`, `163`, `170`, `171`) vs `functions/[[path]].js` (line `292`).
- **Observed Behavior:** `functions/[[path]].js` injects only `$APP_SLUG` and `$APP_VERSION`. The fallback sample installer scripts in `mockData.js` print `$APP_NAME`, which evaluates to an empty string in PowerShell.
- **Guidance for App Authors:** Never rely on `$APP_NAME` or `$DOWNLOAD_URL` in `.vibtools/installer.ps1`; use only `$APP_SLUG` and `$APP_VERSION` (or define your own `$AppName` literal inside the script).

### Finding 2: Conditional `platforms` and `architectures` Selectors Are Informational Only
- **Where:** `public/components/sections/AppDetailView.js:315–358`.
- **Observed Behavior:** If an app manifest includes `platforms` or `architectures` arrays, the UI renders **Operating System** and **Architecture** `<select>` controls, but neither attaches a `change` listener and neither modifies `dlLink.href` or the CLI command (the schema maps each version key to a single `url`).

### Finding 3: `/dl/` Redirect Checks HTTPS Scheme Without Host Allowlist
- **Where:** `functions/[[path]].js:214`.
- **Observed Behavior:** Redirect targets are checked with `downloadUrl.startsWith("https://")` rather than restricted to a fixed host allowlist (such as `dl.vib.tools`). Because download URLs originate strictly from repositories listed in `registry.json`, repository maintainers must ensure `registry.json` only registers trusted GitHub repositories.

### Finding 4: `npm test` Only Runs `server.test.js`
- **Where:** `package.json:11`.
- **Observed Behavior:** `"test": "node --test server.test.js"` executes 7 server/edge tests and omits the 5 frontend helper unit tests in `public/lib/appMeta.test.js`. Run `node --test server.test.js public/lib/appMeta.test.js` to execute all 12 tests.

### Finding 5: Implemented-but-Unused Modules & Placeholder Registry
- `public/components/ui/Modal.js` is fully implemented and exported from `public/components/ui/index.js`, but not currently invoked by any active page.
- `public/styles.css` and `public/vib.tools.Branding/site.webmanifest` exist on disk but are not loaded by `public/index.html`.
- `registry.json` currently contains only a placeholder entry (`example-app` → `vib-tools/example-app`), causing `/api/apps` to serve the 3 fallback apps from `functions/_lib/mockData.js` until real repositories are registered.

## Related Guides

- [App Onboarding & `.vibtools/` Schema](./03-app-onboarding.md)
- [Store API & Edge Routing Reference](./04-api-and-edge-routing.md)
- [Testing & Contributing](./07-testing-and-contributing.md)
