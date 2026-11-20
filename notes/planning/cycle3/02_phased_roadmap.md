# A–Z Phased Production Update Roadmap (Cycle 3 — SEO & AI Indexing)

> **Baseline:** `BASELINE-V3.0-2026-11-20`  
> **Total Phases:** 4 Sequential, Strictly Scope-Locked Phases  
> **Target Coverage:** 8 / 8 Forensic Findings (`SEO-01` through `SEO-08`)  
> **Constraint:** 100% Zero-Build Cloudflare Pages Architecture + Zero UI/Visual Regressions

---

## 1. Phase Dependency Graph

```text
BASELINE v3.0 (Frozen & Verified: 37/37 Tests)
   │
   ▼
Phase 1: Edge Meta Injection, Canonical, OpenGraph/Twitter & JSON-LD
   │  (Creates functions/_lib/seo.js + upgrades index.html & [[path]].js)
   │  Closes: SEO-01, SEO-02, SEO-08 (HTML head)
   ▼
Phase 2: Non-JS <noscript> Fallback, Strict HTTP 404, X-Robots-Tag & HEAD Parity
   │  (Extends functions/_lib/seo.js & functions/[[path]].js)
   │  Closes: SEO-04, SEO-05, SEO-06, SEO-07
   ▼
Phase 3: Dynamic Edge sitemap.xml & Live Published Apps in llms.txt
   │  (Adds functions/sitemap.xml.js, functions/llms.txt.js + server.js routing)
   │  Closes: SEO-03, SEO-08 (dynamic llms.txt)
   ▼
Phase 4: Automated SEO/AI Regression Suite, Live Browser Audit & Doc Sync
      (Extends server.test.js, runs full verification, updates tracker & MEMORY.md)
      Closes: Full Cycle 3 Sign-Off
```

---

## 2. Step-by-Step Phase Specifications

### Phase 1 — Edge Dynamic Meta, Canonical, Social Cards & Structured Data
- **Closes:** `SEO-01`, `SEO-02`, `SEO-08` (HTML Head Polish)
- **Objective:** Guarantee that every storefront URL (`/`, `/cli`, `/schema`, `/vib-apps-engine`, `/category/:name`, `/app/:slug`) returns exact, route-specific `<title>`, `<meta name="description">`, `<link rel="canonical">`, OpenGraph (`og:*`), Twitter Card (`twitter:*`), and Schema.org JSON-LD directly from the Cloudflare Edge HTML response.
- **Concrete Deliverables:**
  1. `public/index.html`: Add `<meta name="robots" content="index, follow">`, `<meta name="theme-color" content="#0d1117">`, `og:image:width` (`1200`), `og:image:height` (`630`), and `og:image:alt`.
  2. `functions/_lib/seo.js` (new pure module):
     - `escapeHtml(str)` & `escapeJsonLd(obj)` (XSS-safe serialization escaping `<`, `>`, `&`, `"`, `'`).
     - `buildRouteSeoMetadata(pathname, resolvedApp)` generating exact title, description, canonical URL, robots directive, OG/Twitter tags, and route-specific JSON-LD (`WebApplication`+`WebSite` for `/`, `SoftwareApplication`+`BreadcrumbList` for `/app/:slug`, `CollectionPage`+`BreadcrumbList` for `/category/:name`, `TechArticle`+`BreadcrumbList` for `/cli` & `/schema`).
     - `injectSeoIntoHtml(html, seoMeta)` performing deterministic, non-destructive `<head>` rewriting (preserving all stylesheets, scripts, icons, and fonts intact).
  3. `functions/[[path]].js`: Wire `injectSeoIntoHtml()` on `apps.vib.tools` HTML responses (both root `/` and SPA routes `/cli`, `/schema`, `/vib-apps-engine`, `/category/:name`, `/app/:slug`), calling `resolveAppBySlug()` for `/app/:slug`.
- **Scope Lock:**
  - **Allowed:** `public/index.html`, `functions/_lib/seo.js`, `functions/[[path]].js`.
  - **Forbidden:** Any edits to `public/styles/*`, `public/components/*`, `public/app.js`, `public/sw.js`, `functions/_lib/github.js`, `functions/api/apps.js`, or `registry.json`.
- **Exit Gate:** `npm test` + `npm run build` + `npm run lint` PASS; verified HTML response on `/`, `/cli`, `/schema`, `/category/productivity`, and mocked `/app/calgrid` contains exact canonical URL, unique `<title>`, and valid JSON-LD.

---

### Phase 2 — Non-JS Crawler `<noscript>`, Strict HTTP 404, `X-Robots-Tag` & `HEAD` Parity
- **Closes:** `SEO-04`, `SEO-05`, `SEO-06`, `SEO-07`
- **Objective:** Make the storefront 100% readable by non-JS AI/search crawlers, eliminate Soft 404s, prevent raw PowerShell scripts from outranking storefront pages, and guarantee `HEAD` method parity on all edge routes.
- **Concrete Deliverables:**
  1. `functions/_lib/seo.js`:
     - Add `buildNoscriptHtml(routeType, contextData)` producing minimal, clean semantic `<noscript>` markup (heading, description, version/CLI command/download link for `/app/:slug`, navigation links for `/`, `/cli`, `/schema`).
     - Inject `<noscript>` right after `<div id="app"></div>` in `injectSeoIntoHtml()`.
  2. `functions/[[path]].js`:
     - **Strict HTTP 404:** Return `status: 404` + `Cache-Control: no-store` + `<meta name="robots" content="noindex, nofollow">` for unknown routes outside the known SPA route table AND for `/app/:slug` when `!isValidSlug(slug)` or `resolveAppBySlug()` returns `null`.
     - **CLI Noindex:** Add `"X-Robots-Tag": "noindex, nofollow"` on `get.vib.tools` plain-text usage, PowerShell script, and plain-text error responses.
     - **`HEAD` Parity:** Export `export async function onRequestHead(context)` returning headers + status with empty body.
- **Scope Lock:**
  - **Allowed:** `functions/_lib/seo.js`, `functions/[[path]].js`.
  - **Forbidden:** Any edits to `public/*`, `functions/api/apps.js`, `functions/_lib/github.js`, or `registry.json`.
- **Exit Gate:** `npm test` + `npm run build` + `npm run lint` PASS; `GET /unknown-route` and `GET /app/nonexistent` return HTTP `404` with `noindex`; `GET /calgrid?mode=get` includes `X-Robots-Tag: noindex, nofollow`; `HEAD` works identically to `GET`.

---

### Phase 3 — Dynamic Edge `sitemap.xml` & Live Published Apps in `/llms.txt`
- **Closes:** `SEO-03`, `SEO-08` (Dynamic AI Catalog Discovery)
- **Objective:** Automatically expose every registered app (`/app/<slug>` + `lastmod`) and category (`/category/<name>`) to search engines via `/sitemap.xml` and to AI agents via `/llms.txt` with zero manual file edits whenever `registry.json` changes.
- **Concrete Deliverables:**
  1. `functions/sitemap.xml.js` (new):
     - Exports `onRequestGet` and `onRequestHead`.
     - Serves `application/xml; charset=utf-8` with `Cache-Control: public, max-age=300` (and `300s` Cloudflare Edge Cache when live apps exist; `no-store` if empty/custom override).
     - Includes all canonical static storefront/spec URLs plus auto-collected `/app/<slug>` (with `<lastmod>` from latest `released_at` when present) and deduplicated `/category/<name>` entries.
     - Isolates `get.vib.tools` (returns `404` on CLI domain).
  2. `functions/llms.txt.js` (new):
     - Exports `onRequestGet` and `onRequestHead`.
     - Serves `text/plain; charset=utf-8` with `Access-Control-Allow-Origin: *`.
     - Preserves the exact specification index from `public/llms.txt` and dynamically appends a `## Published Applications` list (name, slug, latest version, storefront URL, CLI command) whenever live apps exist in `registry.json`.
  3. `server.js`: Route `/sitemap.xml` and `/llms.txt` to the new Functions so local `npm test` and dev server have 100% parity with Cloudflare Pages.
  4. `package.json`: Add `node --check functions/_lib/seo.js && node --check functions/sitemap.xml.js && node --check functions/llms.txt.js` to `build` and `lint` scripts.
- **Scope Lock:**
  - **Allowed:** `functions/sitemap.xml.js`, `functions/llms.txt.js`, `server.js`, `package.json`.
  - **Forbidden:** Any edits to UI components, CSS, `public/app.js`, `functions/_lib/github.js`, `registry.json`.
- **Exit Gate:** `npm test` + `npm run build` + `npm run lint` PASS; `/sitemap.xml` returns valid XML with dynamic `<url>` entries for mocked live repos; `/llms.txt` returns `200 OK` with CORS `*` and lists live apps cleanly.

---

### Phase 4 — Comprehensive SEO/AI Regression Tests, Live Browser Audit & Documentation Sync
- **Closes:** Full Cycle 3 Verification & Operational Readiness
- **Objective:** Lock every single Cycle 3 fix permanently under automated `node:test` coverage, visually verify zero UI regressions in Chromium, and synchronize all project logs and docs.
- **Concrete Deliverables:**
  1. `server.test.js`: Add dedicated Cycle 3 regression tests (`SEO-01` through `SEO-08`) covering:
     - Dynamic canonical, `<title>`, OG/Twitter, and JSON-LD on `/`, `/cli`, `/schema`, `/category/productivity`, and mocked `/app/calgrid`
     - XSS escaping inside injected metadata and JSON-LD
     - `<noscript>` semantic output on `/` and `/app/calgrid`
     - Real HTTP `404` + `noindex` on unknown paths and unknown `/app/missing`
     - `X-Robots-Tag: noindex, nofollow` on `get.vib.tools`
     - `onRequestHead` parity across `[[path]].js`, `sitemap.xml.js`, and `llms.txt.js`
     - Dynamic `/sitemap.xml` and `/llms.txt` with mocked live GitHub repos + `get.vib.tools` isolation
     - Wrangler 3 zero-import-attribute guard extended to new `functions/` files
  2. Live Playwright Chromium check across desktop & mobile ensuring zero visual changes, zero console errors, and valid DOM `<head>` tags.
  3. Final sync of `notes/phases/cycle3_phase_tracker.md`, `notes/planning/cycle3/03_error_handling_matrix.md`, `notes/planning/cycle3/04_actual_implementation_ledger.md`, `project/ARCHITECTURE.md`, and `MEMORY.md`.
- **Scope Lock:**
  - **Allowed:** `server.test.js`, documentation & tracker Markdown files.
  - **Forbidden:** Unrequested runtime feature changes outside fixing a verified test failure.
