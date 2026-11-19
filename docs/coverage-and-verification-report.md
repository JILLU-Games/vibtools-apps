# Forensic Audit Coverage & Verification Report

> **Audit Scope:** Full static source inspection of `vib-apps-hub` (`apps.vib.tools` & `get.vib.tools`)  
> **Primary Source of Truth:** Live implementation files in `functions/`, `public/`, `server.js`, `registry.json`, `wrangler.toml`, `package.json`, and `.vibtools/`  
> **Code Modifications:** Zero (strict documentation-only scope preserved)

---

## 1. Repository Inspection Summary

Every executable source file, configuration file, stylesheet, test suite, and primary documentation file in the repository was read line-by-line:

| Area | Inspected Files | Notes |
| :--- | :---: | :--- |
| **Root Config & Server** | 9 | `server.js`, `server.test.js`, `package.json`, `wrangler.toml`, `registry.json`, `metadata.json`, `.gitignore`, `.vibtools/docs.config.json`, `README.md` |
| **Edge Runtime (`functions/`)** | 4 | `functions/api/apps.js`, `functions/[[path]].js`, `functions/_lib/github.js`, `functions/_lib/mockData.js` |
| **Frontend Entry, PWA & Styles (`public/`)** | 6 | `public/index.html`, `public/app.js`, `public/manifest.json`, `public/sw.js`, `public/styles/tokens.css`, `public/styles/globals.css`, `public/styles.css` *(7 total)* |
| **Frontend Libraries (`public/lib/`)** | 7 | `api.js`, `appMeta.js`, `appMeta.test.js`, `clipboard.js`, `cn.js`, `router.js`, `theme.js` |
| **UI Primitives (`public/components/ui/`)** | 8 | `index.js`, `Icon.js`, `Button.js`, `Input.js`, `Badge.js`, `Card.js`, `Modal.js`, `Toast.js` |
| **Layout & Sections (`public/components/`)** | 8 | `Header.js`, `Sidebar.js`, `MobileNav.js`, `Footer.js`, `MainLayout.js`, `AppGrid.js`, `AppDetailView.js`, `CliGuideSection.js` |
| **Existing Documentation Audited** | 6 | `docs/README.md`, `docs/MANIFEST.md`, `docs/app-config-schema.md`, `docs/deployment.md`, `MEMORY.md`, `project/ARCHITECTURE.md` |
| **Excluded Non-Code Directories** | — | `node_modules/`, binary image assets in `public/vib.tools.Branding/` (except `site.webmanifest` inspected), uploaded design references in `public/assets/aistudio/`, historical scratchpad logs in `notes/` |

Total directly inspected source, test, config, and documentation files: **49 files** (100% of executable source code and runtime configuration).

---

## 2. Feature Audit & Documentation Coverage Matrix

| # | Feature / Capability | Maturity Status | Primary Source Files | Documented In |
| :-: | :--- | :--- | :--- | :--- |
| 1 | Dual-domain host routing (`apps.vib.tools` vs `get.vib.tools` & `?mode=get`) | **Fully Implemented** | `functions/[[path]].js` | `dev/01-architecture.md`, `dev/04-api-and-edge-routing.md`, `users/index.md` |
| 2 | SPA reload-safe fallback & History API router (`/`, `/app/:slug`, `/category/:name`, `/cli`) | **Fully Implemented** | `functions/[[path]].js`, `public/lib/router.js`, `public/app.js` | `dev/01-architecture.md`, `dev/04-api-and-edge-routing.md`, `users/01-getting-started.md` |
| 3 | Store Catalog API (`GET /api/apps` Mode A + 300s `caches.default` + CORS/OPTIONS) | **Fully Implemented** | `functions/api/apps.js`, `functions/_lib/github.js` | `dev/01-architecture.md`, `dev/04-api-and-edge-routing.md` |
| 4 | Single App Detail & Markdown Docs API (`GET /api/apps?slug=<slug>` Mode B) | **Fully Implemented** | `functions/api/apps.js`, `functions/_lib/github.js` | `dev/04-api-and-edge-routing.md`, `dev/03-app-onboarding.md` |
| 5 | Dynamic PowerShell installer streamer (`$APP_SLUG`, `$APP_VERSION` injection + `resolveVersion`) | **Fully Implemented** | `functions/[[path]].js`, `functions/_lib/github.js` | `users/03-cli-installer.md`, `dev/03-app-onboarding.md`, `dev/04-api-and-edge-routing.md` |
| 6 | Direct binary download 302 redirector (`/dl/<slug>[/<version>]`) | **Fully Implemented** | `functions/[[path]].js` | `users/03-cli-installer.md`, `dev/04-api-and-edge-routing.md` |
| 7 | Browser-vs-CLI content negotiation on `get.vib.tools` | **Fully Implemented** | `functions/[[path]].js` | `users/06-troubleshooting-and-faq.md`, `dev/04-api-and-edge-routing.md` |
| 8 | Offline/fallback sample catalog (`calgrid`, `devprompt`, `vibclip`) | **Fully Implemented** | `functions/_lib/mockData.js`, `functions/api/apps.js`, `functions/[[path]].js` | `dev/01-architecture.md`, `dev/05-security-and-validation.md`, `dev/06-local-setup-and-deployment.md` |
| 9 | 3-zone catalog cards, monogram fallback, skeleton loaders & quick CLI banner | **Fully Implemented** | `public/components/sections/AppGrid.js`, `public/lib/appMeta.js` | `users/01-getting-started.md`, `users/02-browsing-and-filtering.md`, `dev/02-codebase-structure.md` |
| 10 | Instant search (150ms debounce, `/` shortcut, `?q=` URL persistence) | **Fully Implemented** | `public/components/layout/Header.js`, `public/app.js`, `public/lib/appMeta.js` | `users/02-browsing-and-filtering.md`, `users/05-workflows.md` |
| 11 | Dynamic category navigation with live counts & `All/Free/Paid` license filter | **Fully Implemented** | `public/components/layout/Sidebar.js`, `public/components/sections/AppGrid.js`, `public/lib/appMeta.js` | `users/02-browsing-and-filtering.md`, `dev/02-codebase-structure.md` |
| 12 | Two-column sticky detail page, version selector, DOMPurify tabs & SHA256 Full/Hide + Copy | **Fully Implemented** | `public/components/sections/AppDetailView.js` | `users/04-downloads-and-verification.md`, `dev/02-codebase-structure.md` |
| 13 | Interactive `/cli` syntax & copyable command guide | **Fully Implemented** | `public/components/sections/CliGuideSection.js` | `users/03-cli-installer.md`, `dev/02-codebase-structure.md` |
| 14 | Dual-theme system (Dark/Light `localStorage` + `theme-color` sync) | **Fully Implemented** | `public/lib/theme.js`, `public/styles/tokens.css` | `users/01-getting-started.md`, `reference/design-tokens-and-components.md` |
| 15 | Iframe-safe clipboard helper & toast stack | **Fully Implemented** | `public/lib/clipboard.js`, `public/components/ui/Toast.js` | `users/06-troubleshooting-and-faq.md`, `dev/02-codebase-structure.md` |
| 16 | PWA Manifest & Service Worker (`vib-apps-hub-v2`) | **Fully Implemented** | `public/manifest.json`, `public/sw.js` | `users/01-getting-started.md`, `users/06-troubleshooting-and-faq.md`, `reference/configuration-reference.md` |
| 17 | Node.js 22 local edge emulator & native `node:test` suites | **Fully Implemented** | `server.js`, `server.test.js`, `public/lib/appMeta.test.js` | `dev/06-local-setup-and-deployment.md`, `dev/07-testing-and-contributing.md` |
| 18 | Conditional `platforms` & `architectures` dropdowns on detail view | **Partially Implemented** | `public/components/sections/AppDetailView.js:315–358` | `users/04-downloads-and-verification.md`, `dev/03-app-onboarding.md`, `dev/05-security-and-validation.md` |
| 19 | Accessible Modal dialog component (`openModal` / `closeModal`) | **Implemented (Unused)** | `public/components/ui/Modal.js` | `dev/02-codebase-structure.md`, `dev/05-security-and-validation.md`, `reference/design-tokens-and-components.md` |
| 20 | `public/styles.css` & `public/vib.tools.Branding/site.webmanifest` | **Unused Legacy** | `public/styles.css`, `public/vib.tools.Branding/site.webmanifest` | `dev/02-codebase-structure.md`, `dev/05-security-and-validation.md` |
| 21 | Database / User Accounts / Authentication / RBAC | **Not Applicable** | None (config-driven architecture; server-side `GITHUB_TOKEN` only) | `dev/01-architecture.md`, `dev/05-security-and-validation.md` |

---

## 3. Existing Documentation Mismatches Reconciled

### Corrected Inside `docs/`

| File | Previous Inaccurate Claim | Verified Code Reality | Resolution |
| :--- | :--- | :--- | :--- |
| `docs/deployment.md` | Used `"downloads": { "windows": { "x64": "..." } }` schema | `functions/[[path]].js:201` reads `versions.<versionKey>.url` | Rewrote `docs/deployment.md` & `docs/dev/06-local-setup-and-deployment.md` |
| `docs/deployment.md` | Listed `.vibtools/app.config.json`, `.vibtools/install.ps1`, `$APP_NAME`, `$DOWNLOAD_URL` as primary | Primary paths are `.vibtools/apps/app.config.json` & `.vibtools/installer.ps1`; only `$APP_SLUG` & `$APP_VERSION` are injected | Rewrote `docs/deployment.md` & `docs/dev/03-app-onboarding.md` |
| `docs/deployment.md` | Showed `name`, `category`, `tier` inside `registry.json` | `registry.json` entries use `slug`, `repo`, `branch`, `featured` | Rewrote `docs/deployment.md` & `docs/reference/configuration-reference.md` |
| `docs/deployment.md` | Claimed `s-maxage=300`, empty `[]` without `GITHUB_TOKEN`, and `502` on missing config | Sets `Cache-Control: public, max-age=300`; falls back to 3 `mockData.js` apps; returns `404` on missing slug | Rewrote `docs/deployment.md` & `docs/dev/04-api-and-edge-routing.md` |
| `docs/app-config-schema.md` | Marked all 10 top-level fields and 4 version subfields as Required; claimed `$APP_VERSION = "latest"` is injected; omitted `platforms`, `architectures`, `screenshots`, `requirements`, `links` | `fetchAppConfig()` requires only `slug`, `name`, `latest`, `versions`; `[[path]].js` injects `$APP_SLUG` + resolved concrete `$APP_VERSION`; `AppDetailView.js` supports all 5 optional fields | Rewrote `docs/app-config-schema.md` & `docs/dev/03-app-onboarding.md` |
| `docs/dev/index.md` | Mentioned CDN Tailwind CSS | `public/index.html` loads **zero** Tailwind CDN and **zero** Lucide CDN; uses custom `tokens.css` + `globals.css` and inline SVG `Icon.js` | Corrected in `docs/dev/index.md` & `docs/reference/dependencies.md` |

### Out-of-Scope Pre-Existing Docs Flagged (Not Modified Per Scope Control)

The following files outside `docs/` still contain legacy references and were intentionally left untouched under strict documentation-only scope control:

- `README.md` — Contains absolute Windows `file:///d:/...` links on lines 41 & 61 and omits the `npm run dev` (`server.js`) workflow.
- `project/ARCHITECTURE.md` — Lists Tailwind CSS CDN, Lucide CDN, `MINIFEST.md`, and `releaseDate` (code uses `released_at`).
- `AGENTS.md` — Mentions Tailwind CSS CDN and Lucide Icons CDN in §1C while actual implementation uses pure custom CSS tokens (`tokens.css` / `globals.css`) and inline SVG `Icon.js`.

---

## 4. Verified Implementation Defects / Unverified Areas

1. **Verified Implementation Defect (Not Silently Modified):** `functions/_lib/mockData.js` installer scripts reference `$APP_NAME`, which is never injected by `functions/[[path]].js:292` (only `$APP_SLUG` and `$APP_VERSION` are injected).
2. **Verified Partial Implementation:** `AppDetailView.js` renders `platforms` and `architectures` dropdowns when provided in metadata, but neither alters the download URL or CLI command.
3. **Unverified External Runtime Areas:** Live production Cloudflare Pages deployment, live Cloudflare R2 `dl.vib.tools` bucket contents, and live private GitHub repositories (since `registry.json` currently holds placeholder `vib-tools/example-app` and no `GITHUB_TOKEN` is provisioned in the local environment) cannot be verified against production network state and are documented from verified code contracts only.
