---
title: "Codebase Structure & Module Inventory"
description: "Complete file-by-file and symbol-level inventory of every runtime, frontend, test, and configuration module in vib-apps-hub."
order: 2
draft: false
---

# Codebase Structure & Module Inventory

This reference maps every source file in the repository to its exact role and exported symbols.

## 1. Root Files & Configuration

| File | Role | Status |
| :--- | :--- | :--- |
| `server.js` | Zero-dependency Node.js 22 HTTP server & Cloudflare Pages Functions emulator (`handleEdgeRequest`, `serveStaticAsset`, in-memory `caches.default` polyfill, listens on `0.0.0.0:3000`). | Active (Local Dev & Tests) |
| `server.test.js` | 7 `node:test` integration & unit tests covering slug validation, mock catalog, `/api/apps`, SPA fallback, CLI script injection, and `/dl/` 302 redirects. | Active |
| `package.json` | Declares `"type": "module"` and npm scripts (`dev`, `start`, `build`, `lint`, `test`); zero npm runtime dependencies. | Active |
| `wrangler.toml` | Cloudflare Pages config (`name = "vib-apps-hub"`, `pages_build_output_dir = "public"`, `compatibility_date = "2026-09-04"`). | Active |
| `registry.json` | Central JSON array of connected GitHub app repositories (currently contains placeholder `example-app`). | Active |
| `metadata.json` | Workspace applet name and description metadata. | Active |
| `.vibtools/docs.config.json` | Vib Docs Engine v1 dual-portal configuration (`docsType: "both"` → `docs/users` & `docs/dev`). | Active |
| `.vibtools/logo.png` | Official Vib Tools PNG logo (`164,017` bytes) referenced by `.vibtools/docs.config.json`. | Active |
| `.gitignore` | Ignores `node_modules/`, `.wrangler/`, `.dev.vars`, `.DS_Store`, `Thumbs.db`, `_worker.bundle`. | Active |

## 2. Edge Runtime (`functions/`)

| File | Exported Symbols | Responsibility |
| :--- | :--- | :--- |
| `functions/api/apps.js` | `onRequestGet(context)`, `onRequestOptions()` | Store API for Mode A catalog list (`/api/apps`) and Mode B single app detail + docs (`/api/apps?slug=<slug>`). |
| `functions/[[path]].js` | `onRequestGet(context)` *(internal: `resolveVersion`)* | Wildcard dual-domain host dispatcher (`apps.vib.tools` static + SPA fallback vs `get.vib.tools` browser redirect, CLI manual, PowerShell streamer, `/dl/` 302 redirector). |
| `functions/_lib/github.js` | `isValidSlug`, `getRegistry`, `findAppEntry`, `fetchRepoFile`, `fetchAppConfig`, `fetchAppInstaller`, `fetchAppDoc` | Registry lookup, slug/path traversal validation, authenticated GitHub Contents API fetcher, and `caches.default` wrapper. |
| `functions/_lib/mockData.js` | `MOCK_APPS`, `getMockApps`, `findMockApp`, `getMockDoc`, `getMockInstaller` | 3 offline/fallback applications (`calgrid`, `devprompt`, `vibclip`) with versions, Markdown docs, and sample installer scripts. |

## 3. Frontend Core & Libraries (`public/`)

| File | Exported Symbols / Role | Responsibility |
| :--- | :--- | :--- |
| `public/index.html` | HTML5 entry point | Loads `/manifest.json`, brand favicons, OpenGraph/Twitter meta tags, `/styles/globals.css`, `marked@15.0.7`, `dompurify@3.2.4`, and `<script type="module" src="/app.js">`. |
| `public/app.js` | `bootstrap()` *(internal)* | Initializes theme, registers `/sw.js`, wires debounced search & `?q=` URL sync, manages view switching, dynamic titles, and catalog loading. |
| `public/manifest.json` | Web App Manifest | Standalone PWA config (`start_url: "/"`, `#0d1117`, SVG + 192/512 PNG icons). |
| `public/sw.js` | Service Worker (`vib-apps-hub-v2`) | Precaches 33 shell files; Network-First for `/api/*` (503 offline JSON) and navigation; Stale-While-Revalidate for static assets. |
| `public/lib/api.js` | `fetchAppsCatalog`, `fetchAppDetail` | Browser client for `/api/apps` with session `catalogCache` and structured error messages. |
| `public/lib/appMeta.js` | `getAppMonogram`, `getPackageFormat`, `formatReleaseDate`, `formatVersionLabel`, `buildInstallCommand`, `buildDownloadUrl`, `filterApps`, `computeCategoryCounts` | Pure, unit-tested metadata derivation and deterministic catalog filtering helpers. |
| `public/lib/appMeta.test.js` | 5 `node:test` suites | Unit tests for all pure helpers in `public/lib/appMeta.js`. |
| `public/lib/clipboard.js` | `copyToClipboard(text)` | Async Clipboard API wrapper with hidden `<textarea class="ui-sr-copy">` + `execCommand("copy")` fallback for restricted/iframe contexts. |
| `public/lib/cn.js` | `cn(...classes)` | Utility joining non-empty CSS class strings. |
| `public/lib/router.js` | `parseRoute`, `getCurrentRoute`, `navigate`, `onRouteChange` | History API SPA router supporting `/`, `/app/:slug`, `/category/:name`, `/cli`, `popstate`, and global relative `<a>` interception. |
| `public/lib/theme.js` | `getTheme`, `setTheme`, `toggleTheme`, `initTheme` | Persists `vib_theme` (`dark`/`light`) in `localStorage`, updates `[data-theme]` + `<meta name="theme-color">`, and dispatches `themechange`. |

## 4. UI Primitives, Layout & Sections (`public/components/`)

### UI Primitives (`public/components/ui/`)

| File | Exports | Notes |
| :--- | :--- | :--- |
| `ui/index.js` | Barrel export | Re-exports `Icon`, `Button`, `Input`, `Badge`, `Card`, `Modal`, `openModal`, `closeModal`, `toast`. |
| `ui/Icon.js` | `Icon(name, size = 16)` | 27 inline SVG icons (`search`, `download`, `terminal`, `copy`, `check`, `sun`, `moon`, `grid`, `layers`, `close`, `arrow-left`, `external`, `shield`, `alert`, `info`, `menu`, `calendar`, `package`, `file`, `rotate`, `chevron-right`, `eye`, `eye-off`, `book`, `monitor`, `cpu`, `globe`). |
| `ui/Button.js` | `Button(opts)` | Renders `<button>` or semantic `<a>` (when `href` is supplied); variants `default`, `primary`, `secondary`, `ghost`, `danger`; sizes `sm`, `md`, `lg`; `fullWidth`. |
| `ui/Input.js` | `Input(opts)` | Renders `<input>` or icon-wrapped `<div class="ui-input-wrap">` exposing `.input`. |
| `ui/Badge.js` | `Badge(opts)` | Variants `neutral`, `accent`, `success`, `paid`, `warn`, `mono`; optional leading icon. |
| `ui/Card.js` | `Card(opts)` | Semantic `<article class="ui-card">` with `header`, `body`, `footer`, keyboard (`Enter`/`Space`) and click handling that ignores interactive child clicks. |
| `ui/Modal.js` | `Modal`, `openModal`, `closeModal` | **Implemented but currently unused** by active views. Supports Escape close, backdrop click, DOMPurify sanitization, and `ui-no-scroll`. |
| `ui/Toast.js` | `toast` (`success`, `error`, `info`) | Global `aria-live="polite"` toast stack with click-to-dismiss and auto-dismiss (`3500ms` info/success, `4500ms` error). |

### Layout (`public/components/layout/`) & Sections (`public/components/sections/`)

| File | Exports | Responsibility |
| :--- | :--- | :--- |
| `layout/MainLayout.js` | `MainLayout(opts)` | Composes `Header`, `Sidebar`, `<main id="view-root">`, `Footer`, and `MobileNav`; exposes `updateActiveRoute`, `updateCategories`, `resetSearch`, `setSearchValue`. |
| `layout/Header.js` | `Header(opts)` | Sticky 56px top bar with brand logo, search bar + `/` shortcut listener, **Docs** link (`https://docs.vib.tools`), and theme toggle. |
| `layout/Sidebar.js` | `Sidebar(opts)` | 240px desktop sidebar with **Discover** (`All Apps` with count, `CLI Installer`), dynamic **Categories** with counts, and **Resources** (`Documentation`, `Edge Installer`). |
| `layout/MobileNav.js` | `MobileNav(opts)` | Fixed 56px bottom bar (`<= 768px`) with **Apps**, **CLI**, and **Theme** controls. |
| `layout/Footer.js` | `Footer()` | Compact footer with brand icon, dynamic copyright year, and external links (`vib.tools`, `docs.vib.tools`, `get.vib.tools`). |
| `sections/AppGrid.js` | `AppGrid(opts)` | Catalog header, mobile category chips, `All/Free/Paid` filter, unfiltered CLI banner, 3-zone app cards, skeleton loaders, and empty state. |
| `sections/AppDetailView.js` | `AppDetailView({ slug })` | Detail skeleton/error state, breadcrumb, header, 2-column sticky Download & Install panel, version selector, SHA256 Full/Hide + copy, ARIA Features/Changelog tabs, and conditional Screenshots/Requirements/Links. |
| `sections/CliGuideSection.js` | `CliGuideSection()` | `/cli` page with 4 syntax & copyable example cards. |

## 5. Stylesheets & Legacy/Unused Assets

| File | Status | Notes |
| :--- | :--- | :--- |
| `public/styles/tokens.css` | Active | Imported at line 1 of `globals.css`. Defines typography (`Segoe UI`), spacing, radii (`4px`/`6px`), layout sizes, and dark/light palettes. |
| `public/styles/globals.css` | Active | 1,947 lines covering reset, UI primitives, shell, catalog, detail view, CLI guide, responsive breakpoints (`1024px`, `768px`, `480px`), and `prefers-reduced-motion`. |
| `public/styles.css` | **Unused Legacy** | 1-line `@import "./styles/globals.css";` not referenced by `public/index.html`. |
| `public/vib.tools.Branding/site.webmanifest` | **Unused Legacy** | Generic placeholder (`"name": "MyWebSite"`) unused by `public/index.html` (which loads `/manifest.json`). |
| `public/assets/aistudio/` | Non-Runtime | Uploaded design reference images and PDF from UI design review; not imported by application code. |

## Related Guides

- [System Architecture & Data Flow](./01-architecture.md)
- [App Onboarding & `.vibtools/` Schema](./03-app-onboarding.md)
- [Testing & Contributing](./07-testing-and-contributing.md)
