# Actual Implementation Ledger — Working vs. Pending Features

> **Baseline Reference:** `BASELINE-V3.0-2026-11-20`  
> **Purpose:** Ground-truth inventory tracking (1) every feature actually working right now, (2) features added after each Cycle 3 phase, and (3) features still pending implementation.

---

## 1. Features Currently 100% Actually Working (Baseline v3.0 Verified)

| # | Feature Area | Exact Working Capabilities | Verified By |
| :-: | :--- | :--- | :--- |
| 1 | **100% Pure Repo-Only Catalog** | Zero mock/demo apps; `registry.json` (`[]`) synced to `functions/_lib/registry.js` via `scripts/sync-registry.js`; auto-collects live apps from GitHub repo URLs (`https://github.com/owner/repo`, `/tree/<branch>`, shorthand, or object). | `npm test` (37/37) |
| 2 | **Frozen Schema v1 Engine** | Draft 2020-12 JSON Schema (`/schemas/vibtools-app.schema.json`, `schemaVersion: 1`, `additionalProperties: false`) + 100% runtime validation parity (`validateAppConfig` returning `422` on violations). | `npm test` |
| 3 | **Storefront JSON API (`/api/apps`)** | Mode A catalog aggregation (`Promise.allSettled`, slug dedup, 300s Edge Cache on non-empty live catalogs, `no-store` when empty) + Mode B single app details with parallel `features.md`/`changelog.md` fetching + CORS `*` + `OPTIONS` + `HEAD` + `get.vib.tools` `404` isolation. | `npm test` + Live CF Pages |
| 4 | **Dual-Domain Edge Router (`get.vib.tools`)** | Streams repo or per-version trusted HTTPS PowerShell scripts with sanitized `$APP_SLUG`, `$APP_VERSION` (semver `+` preserved), `$APP_NAME`; `/dl/<slug>[/<version>]` 302 redirects to trusted HTTPS hosts (`dl.vib.tools`, GitHub Releases, `ALLOWED_DOWNLOAD_HOSTS`); human browsers redirected `302` to `apps.vib.tools`. | `npm test` + Live CF Pages |
| 5 | **Wrangler 3 / Cloudflare Pages Build** | Clean `npm run build` (`sync-registry.js` + syntax checks), zero JSON import attributes in `functions/`, deployed live on `https://apps.vib.tools/` & `https://get.vib.tools/`. | Live CF Pages Build |
| 6 | **Clean Public Storefront UI (Option B)** | Desktop Sidebar (`All Apps`, `CLI Installer`, auto-hiding `Categories`, `Resources`), 3-tab Mobile Bottom Nav (`Apps`, `CLI`, `Theme`), public-friendly empty state (`No applications published yet` + `CLI Installer Guide`), single subtle Footer `Developers` SPA link to `/schema`. | Playwright Desktop & Mobile |
| 7 | **Matte Typography & Dual Theme** | `Inter` + `JetBrains Mono` (Google Fonts), matte zero-glare dark palette (`#cdd6e0` / `#8f9ba8` / `#6ca0dc` / `#2663c7`) + full light theme token parity, flat zero-`box-shadow` surfaces, zero inline styles. | Playwright Visual Audit |
| 8 | **Compact Progressive Responsive Layout** | Smooth breakpoints at `<=1120px` (`188px` sidebar), `<=900px` (`168px` sidebar), `<=768px` (mobile bottom nav, 1-col grids, scrollable markdown tables), `<=480px` (single-line header); `0px` horizontal overflow across desktop, split-screen, and mobile. | Playwright `900×760` & `390×844` |
| 9 | **Interactive App Catalog & Detail Views** | Live debounced search (`/` shortcut, `?q=` URL sync), category filtering, `All / Free / Paid` access tier filter, pinned CLI banner, detail view with version switcher, SHA256 Full/Hide + copy, sanitized Marked+DOMPurify `Features` & `Changelog` tabs, reload-safe History API SPA router. | `npm test` + Browser |
| 10 | **Direct AI & Developer Schema Hub** | Direct URLs `/schema`, `/vib-apps-engine`, `/llms.txt`, `/llms-full.txt`, `/schemas/vibtools-app.schema.json`, `/vib-apps-engine/llms.txt`, `/vib-apps-engine/vibtools-app-config.md`, `/vib-apps-engine/ai-guide.md` all serving `200 OK` with CORS `*`. | `npm test` + Live CF Pages |
| 11 | **PWA Offline Shell (`sw.js` v7)** | Network-First for HTML/CSS/JS/API, Stale-While-Revalidate for local icons, skips all cross-origin requests (Google Fonts/CDN), offline `503` JSON API fallback, precaches all manifest icons. | `npm test` (`BUG-17`) |
| 12 | **Base Static SEO** | `public/robots.txt`, static `public/sitemap.xml`, `og-default.png`, homepage OpenGraph/Twitter tags, homepage `WebApplication` JSON-LD, `<link rel="alternate" href="/llms.txt">`. | Verified on Disk |

---

## 2. Features Added Per Cycle 3 Phase (Live Update Log)

| Phase | Features Added / Activated | Actual Working Status |
| :--- | :--- | :---: |
| **Phase 1** | Edge dynamic `<title>`, `<meta description>`, `<link rel="canonical">`, OG/Twitter cards (with automatic custom app icon dimension strip), route-specific Schema.org JSON-LD (`SoftwareApplication`, `CollectionPage`, `TechArticle`, `WebSite` SearchAction, `BreadcrumbList`), `index.html` head polish (`robots`, `theme-color`, `og:image` dimensions/alt), XSS & `$`-token escaping, malformed URL `400` guard. | `Working (Phase 1)` |
| **Phase 2** | Non-JS crawler `<noscript>` semantic HTML summaries (`buildNoscriptHtml`), strict HTTP `404` + `noindex, nofollow` + `no-store` + `X-Robots-Tag` on unknown routes & unregistered `/app/:slug`, `X-Robots-Tag: noindex, nofollow` on `get.vib.tools`, and `onRequestHead` parity with stream cleanup in `functions/[[path]].js`. | `Working (Phase 2)` |
| **Phase 3** | Dynamic edge `functions/sitemap.xml.js` (auto-including live apps + `<lastmod>` + deduplicated categories, XML escaping, 300s Edge Cache, `get.vib.tools` `404`, `HEAD` parity) & dynamic `functions/llms.txt.js` (CORS `*`, auto-appending `## Published Applications`, 300s Edge Cache, `get.vib.tools` `404`, `HEAD` parity), wired into `server.js` and `package.json`. | `Working (Phase 3)` |
| **Phase 4** | Automated `node:test` SEO/AI regression suite (`server.test.js` — `42 / 42` PASS covering `SEO-01`–`SEO-08`, `ERR-SEO-01`–`ERR-SEO-09`, and Wrangler 3 guard across all `functions/`), live Desktop (`1440×900`) & Mobile (`390×844`) Chromium audit (`0` errors, `0px` overflow), and complete doc sync. | `Working (Phase 4)` |

---

## 3. Features Still Remaining / Pending Implementation

### A. Cycle 3 Engineering Work (In Queue)
- _None — All 4 Cycle 3 phases (`8 / 8` forensic SEO items, `9 / 9` error-handling contracts, `42 / 42` automated tests) are 100% implemented and verified._

### B. Operational Launch Steps (Owner Action After Cycle 3)
- Paste live application GitHub repository URLs into `registry.json` (each repo configured with `.vibtools/apps/app.config.json`).
- Configure `GITHUB_TOKEN` secret in Cloudflare Pages (required only for private repositories).
- Submit `https://apps.vib.tools/sitemap.xml` in Google Search Console & Bing Webmaster Tools.
