# Project Memory — `vib-apps-hub`

> **Active Project:** `vib-apps-hub`  
> **Target Domains:** `apps.vib.tools` (App Catalog) & `get.vib.tools` (Edge CLI & Direct Download Router)  
> **Last Updated:** 2026-11-19 (Pre-Implementation Architecture & Planning Locked)

---

## 1. Current Status

- **Project Status:** Production Ready & Hardened (All 4 Phases Completed — 4/4)
- **Active / Next Phase:** Ready for Production Deployment to Cloudflare Pages
- **Completed BugFix Phases:**
  - Phase 1 (Mock/Demo Fallback Engine)
  - Phase 2 (Edge Routing, CORS & CLI Normalization)
  - Phase 3 (Frontend UI Parity & Mobile Experience)
  - Phase 4 (Caching Scalability, Dynamic Titles & PWA Polish)
- **Execution Strategy:** 4-Phase Sequential Roadmap with Strict Scope Locks (100% Successfully Completed)

---

## 2. Completed Phases

- **Phase 1: Project Structure & Base Configuration**
  - Created zero-build repository skeleton (`public/`, `functions/`, `docs/`, `notes/`, `project/`).
  - Configured minimal Cloudflare Pages setup in `wrangler.toml` (`name = "vib-apps-hub"`, `pages_build_output_dir = "public"`).
  - Seeded initial `registry.json` schema and comprehensive `.gitignore`.
- **Project Specifications Lock**
  - Formulated `project/MISSION.md` (Mission, problem statement, features, and concrete usage scenarios).
  - Authored `project/ARCHITECTURE.md` (Zero-build tech stack, Cloudflare edge routing, caching, and `.vibtools/` standard).
  - Defined `project/DESIGN_SYSTEM.md` (Developer dark mode tokens, typography, component geometry, and modal blueprint).
- **Phase 2: Documentation, Repository Guardrails & App Config Schema**
  - Updated `AGENTS.md` with strict AI guardrails (Tech Stack Lock, Zero-Freedom, UI/UX Lock, Security Rules).
  - Created `docs/app-config-schema.md` detailing the `.vibtools/` repository standard with real-world `calgrid` examples.
  - Written comprehensive `README.md` with quickstart, PowerShell usage, and local dev guides.
  - Initialized `MEMORY.md` as the living project tracker.
- **Phase 3: Backend Core (`functions/_lib/github.js`)**
  - Implemented `getRegistry()`, `isValidSlug()`, and `findAppEntry()`.
  - Implemented `fetchRepoFile()` supporting private repos (`GITHUB_TOKEN`), path traversal guards, and Cloudflare Cache API (`caches.default`) with synthetic key generation and graceful offline fallback.
  - Implemented high-level helpers: `fetchAppConfig()` with schema field validation, `fetchAppInstaller()` for PowerShell script streaming, and `fetchAppDoc()` for markdown docs.
- **Phase 4: Edge Routing & Store API (`functions/api/apps.js` & `functions/[[path]].js`)**
  - Implemented `functions/api/apps.js`: Mode A (catalog aggregation via `Promise.allSettled`) and Mode B (single app details with parallel markdown docs fetching).
  - Implemented `functions/[[path]].js`: Dual-domain host routing (`apps.vib.tools` passthrough vs `get.vib.tools` routes), terminal usage text, `/dl/<slug>` direct 302 redirects to R2, and dynamic PowerShell installer streamer with prepended `$APP_SLUG` and `$APP_VERSION` variable headers.
  - Compiled and verified successfully using Cloudflare Pages compiler (`wrangler pages functions build`).
- **Phase 4.5: Lock Global Component-Based UI/UX Rules & Scaffold Frontend Structure**
  - Locked comprehensive rules in `project/DESIGN_SYSTEM.md`: High-density flat UI, zero box-shadow, `"Segoe UI"` font only, dual theme parity (`[data-theme="dark"]` / `[data-theme="light"]`), zero page-level styling, native PWA, and reload-persistent SPA router.
  - Updated `AGENTS.md` with non-negotiable Global UI Component Guardrails.
  - Scaffolded frontend component hierarchy in `public/` (`styles/`, `lib/`, `components/ui/`, `components/layout/`, `components/sections/`, `manifest.json`, `sw.js`).
- **Phase 5A: Global Design Tokens, Core Utilities & UI Components**
  - Implemented `tokens.css`: Typography (`Segoe UI`), spacing, radii (`4px`/`6px`), layout dimensions, and Dark/Light dual theme palette.
  - Implemented `globals.css`: Zero `box-shadow` CSS reset and component class library (`.ui-btn`, `.ui-input`, `.ui-card`, `.ui-badge`, `.ui-modal`, `.ui-toast`, `.ui-code-box`, `.ui-markdown`, `.ui-no-scroll`).
  - Implemented `public/lib/`: `cn.js` (class joining), `theme.js` (theme manager with localStorage sync), `router.js` (SPA History router), `api.js` (catalog and detail fetcher with descriptive errors).
  - Implemented `public/components/ui/`: `Icon.js` (vector SVGs), `Button.js`, `Input.js`, `Badge.js`, `Card.js`, `Modal.js`, `Toast.js`, and `index.js`. Verified zero inline styles and zero `box-shadow`.
- **Phase 5B: Layout, Page Sections, PWA & Main App (`apps.vib.tools`)**
  - Implemented `public/components/layout/`: `Header.js` (with `/` shortcut search and theme switcher), `Sidebar.js` (with dynamic category filters and route sync), `MobileNav.js` (bottom PWA navigation), `Footer.js`, and `MainLayout.js`.
  - Implemented `public/components/sections/`: `AppGrid.js` (home & category catalog with pinned `get.vib.tools` banner), `AppDetailView.js` (reload-safe single app view with version selector, live PowerShell updater, direct R2 download link, and sanitized markdown tabs), and `CliGuideSection.js` (scannable terminal usage guide).
  - Implemented root PWA files: `public/index.html` (with root-relative paths and Marked/DOMPurify CDNs), `public/app.js` (app bootstrap and route orchestration), `public/manifest.json` (PWA manifest), and `public/sw.js` (stale-while-revalidate service worker).
  - Appended layout styling to `public/styles/globals.css`. Verified zero inline styles and zero `box-shadow`.
- **Phase 6: Final Audit, SPA Reload Guarantee, Local Verification & Deployment Guide**
  - Audited code quality: 100% compliance with zero inline styles, zero `box-shadow`, font locked to `"Segoe UI"`, server-side secret isolation (`GITHUB_TOKEN`), and mandatory DOMPurify sanitation.
  - Verified SPA reload guarantee on `apps.vib.tools`: `functions/[[path]].js` serves `env.ASSETS.fetch("/index.html")` with 200 OK for any 404 navigation route.
  - Executed local verification with Cloudflare Pages Dev server on port 8788: verified API JSON endpoints, CLI streamer plain-text responses, and SPA HTML responses.
  - Created `docs/deployment.md` covering Cloudflare Pages configuration, secret setup, dual domain binding, R2 binary bucket conventions, and a 4-step app onboarding workflow.
  - Updated all manifests across `docs/` and `notes/`.
- **Pre-Deployment Forensic Audit & 4-Phase Hardening Pass (Completed & Verified)**
  - **Phase 1 (Mock/Demo Fallback Engine):** Schema-compliant mock catalog engine in `functions/_lib/mockData.js`, integrated fallback in `functions/api/apps.js` and `functions/[[path]].js` providing 100% offline resilience and demo readiness.
  - **Phase 2 (Edge Routing, CORS & CLI Normalization):** Version normalization (`v1.0.3` <-> `1.0.3`), HTML browser navigation redirect on `get.vib.tools` to `apps.vib.tools`, CORS headers and OPTIONS 204 preflight on `/api/apps`, and zone-aligned cache key URLs.
  - **Phase 3 (Frontend UI Parity & Mobile Experience):** App icon lazy-loading and vector fallback on cards and detail view, responsive mobile category filter bar (`.app-category-bar`), 150ms search debouncing with history replaceState, `/` shortcut modal guard, and `CSS.escape` category selectors.
  - **Phase 4 (Caching Scalability, Dynamic Titles & PWA Polish):** Cloudflare Edge Cache API (`caches.default`) wrapping Mode A catalog aggregation with 300s TTL and `X-Cache-Status` header, contextual dynamic browser tab titles (`updateDocumentTitle`), and static vector SVG PWA icon (`/icons/icon.svg`).
  - Total test suites executed: 7/7 (Phase 1) + 8/8 (Phase 2) + 31/31 (Phase 3 static + HTTP) + 22/22 (Phase 4 static + HTTP) = **68/68 automated tests passed (100% pass rate)**.
- **Official Vib Tools Branding Integration (Completed & 100% Verified):**
  - Integrated official brand assets from `public/vib.tools.Branding/`:
    - Root `favicon.ico` and `apple-touch-icon.png` (180x180) for scrapers, iOS home screen, and browsers.
    - Official vector SVG icon (`public/icons/icon.svg`) from `Profile-Photo-Vib.Tools.svg`.
    - `public/index.html` updated with modern SVG favicon (`/vib.tools.Branding/favicon.svg`), 96x96 PNG favicon, Apple touch icon, and OpenGraph/Twitter social cards (`og-default.png`).
    - `public/manifest.json` configured with full PWA icon suite.
    - `public/components/layout/Header.js` & `Footer.js` updated to display the official SVG brand mark with zero `box-shadow` CSS classes.
    - `public/sw.js` updated to precache official brand icons.
    - Verified with 14/14 static tests + 7/7 live HTTP tests.

---

## 3. Key Architectural Decisions (Locked)

- **Single Codebase, Dual Domains:** Both `apps.vib.tools` and `get.vib.tools` deploy from one Cloudflare Pages project. The edge router `functions/[[path]].js` discriminates between domains via the `Host` header.
- **The `.vibtools/` Mental Model:** Following the `docs.vib.tools` (`docscaffold`) convention, all metadata, installer scripts, features, and changelogs reside inside the `.vibtools/` folder of target app repositories.
- **Zero-Build Frontend:** Pure HTML5, CDN-loaded Tailwind CSS, Vanilla JS (native ES Modules), Marked.js, and DOMPurify. No React, Next.js, Vite, or Webpack.
- **Global Component Single Source of Truth:** Zero page-level or inline styling. All visual tokens reside in `tokens.css`; all UI elements imported from shared `components/ui/` and `components/layout/`.
- **Pure "Segoe UI" Flat Design:** Zero `box-shadow`, zero neon glow, zero noise text, `4px` button/badge radius, `6px` card/modal radius.
- **Dual-Theme Parity:** Toggling between dark and light themes only changes color CSS custom properties; layout and geometry remain 100% identical.
- **Reload-Safe SPA Router:** Client-side HTML5 history router (`public/lib/router.js`) maintains state on page reload without home redirection.
- **Server-Side Token Isolation:** The GitHub token (`GITHUB_TOKEN`) is strictly handled inside Cloudflare Pages Functions to securely query private repos without exposing credentials to the client.
- **Aggressive Edge Caching:** Integrated Cloudflare Cache API (`caches.default`) with a 5–15 minute TTL to eliminate GitHub API rate limits and deliver millisecond response times.
- **Direct Binary Delivery:** Clean download endpoints (`/dl/<slug>` and `/dl/<slug>/<version>`) issue 302 redirects directly to Cloudflare R2 object storage (`dl.vib.tools`), avoiding worker CPU costs and bandwidth egress fees.
