# Baseline Freeze v3.0 — `vib-apps-hub` (`apps.vib.tools` & `get.vib.tools`)

> **Freeze ID:** `BASELINE-V3.0-2026-11-20`  
> **Cycle:** Pre-Cycle 3 (Production SEO, Dynamic Sitemap, Edge Meta/SSR & AI Indexing)  
> **Status:** FROZEN (Reference Snapshot Before Any Cycle 3 Code Changes)  
> **Automated Verification at Freeze:** `37 / 37` Unit & Regression Tests PASS (`npm test`), Build PASS (`npm run build`), Lint PASS (`npm run lint`)

---

## 1. Purpose of This Baseline Freeze

This document locks the verified state of `vib-apps-hub` prior to beginning **Cycle 3** updates. Every Cycle 3 phase MUST preserve 100% of the working invariants below without regressing existing functionality, UI/UX, styling, or Pure Repo-Only architecture.

---

## 2. Verified Baseline v3.0 State (What Exists Right Now)

### A. Architecture & Runtime
- **Zero-Build Stack:** Pure HTML5, Vanilla JS native ES Modules (`type="module"`), CSS custom properties (`tokens.css` + `globals.css`), Marked.js (CDN), DOMPurify (CDN). Zero React/Vite/Webpack/bundler steps.
- **Cloudflare Pages + Functions:** Deployed from `/public` (`wrangler.toml` `pages_build_output_dir = "public"`) and `/functions`.
- **Wrangler 3 / esbuild 0.17 Compatibility:** `scripts/sync-registry.js` compiles `registry.json` into `functions/_lib/registry.js` during `npm run build` and `npm test` (zero JSON import attributes `with { type: "json" }` inside `functions/`).
- **Local Edge Emulator:** `server.js` runs on port `3000` with Cloudflare `caches.default` polyfill and `handleEdgeRequest()`.

### B. 100% Pure Repo-Only Engine & Frozen Schema v1
- `functions/_lib/mockData.js` permanently deleted; `registry.json` is `[]` (clean live-only state).
- `public/schemas/vibtools-app.schema.json` frozen at Draft 2020-12 (`schemaVersion: 1`, `additionalProperties: false`).
- `functions/_lib/github.js` enforces 100% runtime parity with the frozen JSON Schema (`validateAppConfig`, `parseRepoIdentifier`, `getRegistry`, `resolveAppBySlug`, `fetchAppConfig`, `fetchAppInstaller`, `fetchAppDoc`, `isTrustedInstallerUrl`).
- `functions/api/apps.js` exports `onRequestGet`, `onRequestOptions`, and `onRequestHead`; isolates `/api/apps` away from `get.vib.tools` (`404`); caches only non-empty live catalogs/details for `300s`.
- `functions/[[path]].js` handles dual-domain routing (`apps.vib.tools` storefront + CORS-enabled AI/schema docs vs. `get.vib.tools` PowerShell installer streaming & `/dl/` trusted HTTPS 302 redirects).

### C. Frontend Storefront UI (Option B + Matte Typography + Compact Responsive)
- **Typography:** `Inter` (`400;500;600`) + `JetBrains Mono` (`400;500`) loaded cleanly from Google Fonts (`public/index.html`).
- **Palette:** Matte zero-glare dark theme (`#cdd6e0` primary, `#8f9ba8` secondary, `#6c7785` muted, `#6ca0dc` steel-blue accent, `#2663c7` primary button) + full light theme token parity (`public/styles/tokens.css`).
- **Flat Geometry:** Zero `box-shadow`, zero inline `style="..."` attributes, `4px`/`6px` border radii, compact `1px` scrollbars.
- **Compact Responsive Scaling:** Progressive breakpoints at `<=1120px` (`188px` sidebar), `<=900px` (`168px` sidebar), `<=768px` (mobile bottom nav + 1-col grids + scrollable markdown tables), and `<=480px` (compact single-line header). Empty `Categories` section auto-hides in `Sidebar.js`.
- **Option B Public Storefront Navigation:**
  - Desktop Sidebar: `All Apps`, `CLI Installer`, dynamic `Categories`, `Resources` (`Documentation`, `Edge Installer`).
  - Mobile Bottom Nav: 3-tab (`Apps`, `CLI`, `Theme`).
  - Empty Catalog State: `"No applications published yet"` + `"CLI Installer Guide"` CTA.
  - Footer: Single subtle `"Developers"` SPA link → `/schema`, alongside `vib.tools`, `docs.vib.tools`, `get.vib.tools`.
- **PWA Shell:** `public/sw.js` (`vib-apps-hub-v7`) bypasses cross-origin requests (Google Fonts/CDN), uses Network-First for `.css`/`.js`/navigation, and precaches manifest icons.

### D. Existing AI & SEO Assets
- `public/robots.txt`, `public/sitemap.xml` (static), `public/llms.txt`, `public/llms-full.txt`, `public/vib-apps-engine/llms.txt`, `public/vib-apps-engine/vibtools-app-config.md`, `public/vib-apps-engine/ai-guide.md`, `public/schemas/vibtools-app.schema.json`, `public/vib.tools.Branding/og-default.png`.

---

## 3. Protected Invariants (DO NOT BREAK During Cycle 3)

| Invariant ID | Rule | Verification Method |
| :--- | :--- | :--- |
| `INV-01` | Zero-build frontend & Wrangler 3 compatible `functions/` (zero `with { type: "json" }`) | `npm run build` + `npm test` |
| `INV-02` | 100% Pure Repo-Only Mode (no mock data fallback; empty `registry.json` returns `count: 0`, `no-store`) | `server.test.js` (`BUG-01`) |
| `INV-03` | Frozen Schema v1 validation parity (`schemaVersion: 1`, `422` on invalid config) | `server.test.js` (Forensic Passes 1–3) |
| `INV-04` | Server-side `GITHUB_TOKEN` isolation & trusted HTTPS host allowlist for `/dl/` and installers | `server.test.js` (`BUG-04`, `fetchAppInstaller`) |
| `INV-05` | Flat UI, zero `box-shadow`, zero inline `style="..."`, Inter + JetBrains Mono, matte dark/light tokens | Static check + Playwright visual check |
| `INV-06` | Option B storefront chrome (clean Sidebar, 3-tab MobileNav, public empty state, single Footer `Developers` link) | Playwright desktop & mobile check |
| `INV-07` | All direct AI/Schema URLs (`/schema`, `/llms.txt`, `/llms-full.txt`, `/schemas/vibtools-app.schema.json`, `/vib-apps-engine/*`) remain `200 OK` with `Access-Control-Allow-Origin: *` | `server.test.js` |
| `INV-08` | Zero non-runtime files in `public/` (`public/assets/aistudio` must not exist) | `server.test.js` (`BUG-13`) |

---

## 4. Baseline v3.0 ↔ Cycle 3 Forensic Alignment Matrix

| Audit ID | Severity | Baseline File(s) & Exact Lines | Target Cycle 3 Phase |
| :--- | :--- | :--- | :--- |
| `SEO-01` | **Critical** | `functions/[[path]].js:80-104`, `public/index.html:6-28` | Phase 1 |
| `SEO-02` | **High** | `public/index.html:31-51`, `functions/[[path]].js:80-104` | Phase 1 |
| `SEO-03` | **High** | `public/sitemap.xml:1-49`, `server.js:131-179` | Phase 3 |
| `SEO-04` | **Medium** | `public/index.html:65-67`, `functions/[[path]].js:80-104` | Phase 2 |
| `SEO-05` | **Medium** | `functions/[[path]].js:81-104` | Phase 2 |
| `SEO-06` | **Medium** | `functions/[[path]].js:187-194, 329-336` | Phase 2 |
| `SEO-07` | **Medium** | `functions/[[path]].js:65-346` | Phase 2 |
| `SEO-08` | **Low** | `public/index.html:5-29`, `public/llms.txt:1-20` | Phase 1 & Phase 3 |
