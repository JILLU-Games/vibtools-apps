# Baseline Freeze v2.0 — Production Hardening Snapshot & Audit Alignment

> **Document Location:** `notes/planning/baseline_freeze.md`  
> **Freeze Timestamp:** 2026-11-19  
> **Baseline Version:** `v2.0` (Post-UI Marketplace Refinement & Vib Docs Engine Dual-Portal Setup)  
> **Forensic Audit Source:** [`notes/production_forensic_audit_report.md`](../production_forensic_audit_report.md)  
> **Purpose:** Lock the exact pre-update state of `vib-apps-hub` (`apps.vib.tools` & `get.vib.tools`), record all verified invariants that must never regress, and map the frozen baseline 1-to-1 against all 18 verified forensic bugs before executing Phase 1.

---

## 1. Frozen Runtime File Inventory (Verified 2026-11-19)

### A. Root & Backend Edge Engine Files

| File Path | Line Count | Active Role in Frozen Baseline | Targeted in Cycle 2? |
| :--- | :---: | :--- | :---: |
| `registry.json` | 9 | App repository registry (currently placeholder `vib-tools/example-app`) | Phase 1 (Config note / guard) |
| `wrangler.toml` | 4 | Cloudflare Pages config (`pages_build_output_dir = "public"`) | Protected (Read-only) |
| `.env.example` | 3 | Environment variable documentation (`GITHUB_TOKEN=`) | Phase 1 (`ENABLE_MOCK_FALLBACK`, `ALLOWED_DOWNLOAD_HOSTS`) |
| `package.json` | 14 | NPM scripts (`dev`, `start`, `build`, `lint`, `test`) | Phase 4 (`npm test` all suites) |
| `server.js` | 211 | Local Node.js 22 edge emulator (`handleEdgeRequest`, `serveStaticAsset`, in-memory `caches.default`) | Phase 1 (`BUG-03`), Phase 2 (`BUG-09`, `BUG-11`) |
| `server.test.js` | 70 | Automated `node:test` backend test suite (7 tests currently passing) | Phase 4 (Full regression tests) |
| `functions/_lib/github.js` | 337 | Registry loader, `isValidSlug`, `fetchRepoFile`, `fetchAppConfig`, `fetchAppInstaller`, `fetchAppDoc` | Phase 2 (`BUG-11`) |
| `functions/_lib/mockData.js` | 234 | Demo catalog (`calgrid`, `devprompt`, `vibclip`), mock docs & mock PowerShell scripts | Phase 1 (`BUG-02`) |
| `functions/api/apps.js` | 216 | Store API (`/api/apps` Mode A catalog & Mode B single app + CORS) | Phase 1 (`BUG-01`), Phase 2 (`BUG-06`, `BUG-09`) |
| `functions/[[path]].js` | 312 | Dual-domain edge router (`apps.vib.tools` SPA fallback vs `get.vib.tools` CLI & `/dl/` 302) | Phase 1 (`BUG-01`, `BUG-03`, `BUG-04`, `BUG-05`), Phase 2 (`BUG-07`, `BUG-08`, `BUG-10`) |

### B. Frontend Application Files (`public/`)

| File Path | Line Count | Active Role in Frozen Baseline | Targeted in Cycle 2? |
| :--- | :---: | :--- | :---: |
| `public/index.html` | 40 | SPA shell, SEO/OG tags, favicons, Marked.js & DOMPurify CDNs | Protected (Read-only) |
| `public/app.js` | 192 | Main controller, bootstrap, catalog load, search debounce, route sync, `document.title` | Phase 3 (`BUG-14`) |
| `public/manifest.json` | 36 | PWA Web App Manifest (4 icons) | Protected (Read-only) |
| `public/sw.js` | 110 | Service Worker (`vib-apps-hub-v2`) | Phase 4 (`BUG-17`) |
| `public/styles/tokens.css` | — | CSS design tokens (`[data-theme="dark"]` & `[data-theme="light"]`) | Protected (Read-only) |
| `public/styles/globals.css` | — | Global zero-shadow CSS classes (`.ui-*`, `.app-*`) | Phase 3 (Only if needed for `BUG-12` read-only metadata badges) |
| `public/styles.css` | 2 | Unused legacy `@import "./styles/globals.css";` | Phase 3 (`BUG-13` removal) |
| `public/lib/api.js` | 69 | Client `/api/apps` fetcher (`fetchAppsCatalog`, `fetchAppDetail`) | Phase 3 (`BUG-15` `AbortSignal` support) |
| `public/lib/appMeta.js` | 211 | Pure metadata/filter helpers (`buildDownloadUrl`, `buildInstallCommand`, `filterApps`, etc.) | Phase 3 (`BUG-16`) |
| `public/lib/appMeta.test.js` | — | Pure helper `node:test` suite (5 tests currently passing, not in `npm test`) | Phase 4 (`BUG-18`) |
| `public/lib/router.js` | 116 | History API SPA router (`parseRoute`, `navigate`, `onRouteChange`) | Phase 3 (`BUG-14`) |
| `public/lib/theme.js` | — | Dark/Light theme switcher + `localStorage` persistence | Protected (Read-only) |
| `public/lib/clipboard.js` | — | Async clipboard + iframe-safe textarea fallback | Protected (Read-only) |
| `public/lib/cn.js` | — | Class joining helper | Protected (Read-only) |
| `public/components/sections/AppDetailView.js` | 796 | Detail view, version selector, conditional OS/Arch/screenshots/reqs/links, SHA256, Markdown tabs | Phase 3 (`BUG-12`, `BUG-15`) |
| `public/components/sections/AppGrid.js` | — | Catalog grid, mobile category chips, access tier filter, pinned CLI banner | Protected (Read-only) |
| `public/components/sections/CliGuideSection.js` | — | CLI usage guide section (`/cli`) | Protected (Read-only) |
| `public/components/layout/Header.js` | 143 | Header, `/` shortcut search, Docs link, theme toggle | Protected (Read-only) |
| `public/components/layout/MainLayout.js` | 63 | Shell orchestrator (`resetSearch`, `setSearchValue`, `updateActiveRoute`, `updateCategories`) | Protected (Read-only) |
| `public/components/layout/Sidebar.js` | — | Desktop sidebar (`CSS.escape` guarded) with live counts | Protected (Read-only) |
| `public/components/layout/MobileNav.js` | — | Bottom mobile navigation bar | Protected (Read-only) |
| `public/components/layout/Footer.js` | — | Global footer | Protected (Read-only) |
| `public/components/ui/*` | — | `Icon`, `Button`, `Input`, `Badge`, `Card`, `Modal`, `Toast`, `index.js` | Phase 3 (`BUG-13` `Modal.js` disposition documented/verified) |
| `public/assets/aistudio/*` | 20 files | Non-runtime design screenshots (19 images) + 1 PDF currently exposed in `public/` | Phase 3 (`BUG-13` delete from `public/`) |
| `public/vib.tools.Branding/site.webmanifest` | 21 | Legacy `"MyWebSite"` placeholder webmanifest exposed in `public/` | Phase 3 (`BUG-13` delete from `public/`) |

---

## 2. Frozen Baseline Verification Metrics

| Verification Check | Frozen Baseline Result | Command / Source |
| :--- | :---: | :--- |
| Syntax Check (`npm run build` / `npm run lint`) | **PASS** | `node --check server.js && ...` |
| Backend Tests (`npm test`) | **7 / 7 PASS** | `node --test server.test.js` |
| Frontend Helper Tests | **5 / 5 PASS** *(not wired into `npm test`)* | `node --test public/lib/appMeta.test.js` |
| Live Edge Probes (`handleEdgeRequest`) | **21 executed** — exposed 18 bugs/gaps | Recorded in `notes/production_forensic_audit_report.md` |

---

## 3. Protected Baseline Invariants (Zero-Regression Lock)

Every single phase (Phase 1 through Phase 4) MUST preserve all 9 architectural & UI invariants below without exception:

1. **Strict Zero-Build Stack:** Pure HTML5, Tailwind CDN, Vanilla JS native ES Modules, Marked.js CDN, DOMPurify CDN, Cloudflare Pages Functions. Zero npm runtime dependencies or bundlers.
2. **Server-Side Secret Isolation:** `env.GITHUB_TOKEN` is strictly consumed inside `functions/_lib/github.js:119–121` and NEVER returned in headers, JSON payloads, HTML, or error responses.
3. **XSS Sanitization Mandate:** All Markdown (`features.md`, `changelog.md`) passes exclusively through `DOMPurify.sanitize(marked.parse(rawMd))` (`public/components/sections/AppDetailView.js:57`) with `<pre>` `textContent` fallback.
4. **Zero Inline Styles & Zero `box-shadow`:** Zero `style="..."` attributes and zero non-`none` `box-shadow` declarations anywhere in `public/`.
5. **Typography Lock:** UI text strictly `"Segoe UI", system-ui, sans-serif`; monospace strictly for CLI commands, version labels, and SHA256 hashes.
6. **Dual Theme Token Parity:** Dark (`[data-theme="dark"]`) and Light (`[data-theme="light"]`) swap color tokens only; layout, geometry, and spacing remain identical.
7. **Reload-Safe SPA Routing:** Direct loads and browser refreshes on `/`, `/app/:slug`, `/category/:name`, and `/cli` return `200 OK` HTML shell and preserve active route.
8. **Global Component Single Source of Truth:** All UI primitives come from `public/components/ui/`; all layouts come from `public/components/layout/`.
9. **Accurate Toast Feedback:** Every user action (copy CLI, copy SHA256, theme switch, API error) emits accurate feedback via `public/components/ui/Toast.js`.

---

## 4. Baseline-to-Forensic Audit 1-to-1 Alignment Matrix (All 18 Bugs)

| Bug ID | Severity | Baseline File(s) & Exact Lines | Audit Finding Summary | Assigned Phase |
| :---: | :---: | :--- | :--- | :---: |
| `BUG-01` | Critical | `registry.json:1–8`, `functions/api/apps.js:68–76,150–180`, `functions/[[path]].js:185–190,252–259` | Unguarded mock fallback runs in production & poisons `caches.default` (`max-age=300`) | **Phase 1** |
| `BUG-02` | Critical | `functions/_lib/mockData.js:40–52,106–117,161–172`, `functions/[[path]].js:292` | Demo PowerShell scripts reference undefined `$APP_NAME` & omit download logic | **Phase 1** |
| `BUG-03` | Critical | `functions/[[path]].js:104`, `server.js:75` | Unwrapped `decodeURIComponent()` throws uncaught `URIError` (HTTP 500 crash) | **Phase 1** |
| `BUG-04` | High | `functions/[[path]].js:211–224` | `/dl/` redirect checks only `startsWith("https://")` — no `new URL()` or trusted host allowlist | **Phase 1** |
| `BUG-05` | High | `functions/[[path]].js:1–5,117–119,165–197,231–266` | `isValidSlug()` not imported/enforced on `get.vib.tools` routes | **Phase 1** |
| `BUG-06` | High | `functions/api/apps.js:39–98` | Mode B (`GET /api/apps?slug=<slug>`) lacks response-level `caches.default` caching | **Phase 2** |
| `BUG-07` | Medium | `functions/[[path]].js:88–94` | SPA fallback merges lowercase `content-type` + `"Content-Type"` → duplicate header | **Phase 2** |
| `BUG-08` | Medium | `functions/[[path]].js:110–120` | Browser visiting `get.vib.tools/<slug>/<version>` receives raw PowerShell instead of 302 redirect | **Phase 2** |
| `BUG-09` | Medium | `functions/api/apps.js:24–36`, `server.js:142–153` | `/api/apps` leaks Store JSON on `get.vib.tools` host | **Phase 2** |
| `BUG-10` | Medium | `functions/[[path]].js:82` | `hasExtension = /\.[a-zA-Z0-9]+$/` breaks SPA reload for dot-containing routes (`/category/Node.js`) | **Phase 2** |
| `BUG-11` | Medium | `functions/_lib/github.js:229–237`, `server.js:155–156` | Shallow `fetchAppConfig()` validation (`versions` not verified as non-array object with `latest`); `server.js` routes `POST`/`DELETE` to `wildcardGet` | **Phase 2** |
| `BUG-12` | High | `public/components/sections/AppDetailView.js:315–358` | Conditional OS & Architecture `<select>` controls have zero `change` listeners and zero effect | **Phase 3** |
| `BUG-13` | Medium | `public/assets/aistudio/*` (20 files), `public/vib.tools.Branding/site.webmanifest`, `public/styles.css`, `public/components/ui/Modal.js` | Non-runtime design files & placeholder `"MyWebSite"` manifest exposed in `public/`; unused legacy `public/styles.css` | **Phase 3** |
| `BUG-14` | Medium | `public/app.js:147–154`, `public/lib/router.js:61–67` | Browser Back (`popstate`) ignores `?q=`, and clicking Logo / `All Apps` on `/?q=...` exits early | **Phase 3** |
| `BUG-15` | Medium | `public/components/sections/AppDetailView.js:77–88`, `public/lib/api.js:46–56` | Uncancelled `fetchAppDetail()` race overwrites `document.title` or emits stale error toast | **Phase 3** |
| `BUG-16` | Medium | `public/lib/appMeta.js:126–142` | Hardcoded `https://get.vib.tools/dl/...` prevents testing local/preview downloads on non-prod origins | **Phase 3** |
| `BUG-17` | Low | `public/sw.js:5,7–40,60–108` | SW misses 3 manifest icons & lacks early non-`GET`/protocol guard | **Phase 4** |
| `BUG-18` | Low | `package.json:11`, `server.test.js`, `public/lib/appMeta.test.js` | `npm test` skips `appMeta.test.js`; zero regression tests for the 18 verified findings | **Phase 4** |
