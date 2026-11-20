# Forensic Production SEO & AI Indexing Audit Report (Cycle 3)

> **Audit Baseline:** `BASELINE-V3.0-2026-11-20`  
> **Audit Scope:** Search Engine Optimization (Google/Bing), Social Share Previews (OpenGraph/Twitter), Non-JS AI Crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`), Edge HTTP Semantics (`404`, `HEAD`, `X-Robots-Tag`), and Dynamic Sitemap/Discovery  
> **Status:** VERIFIED AGAINST LIVE SOURCE CODE (No code modified yet)

---

## 1. Executive Scorecard

| Dimension | Baseline v3.0 Score | Target Post-Cycle 3 |
| :--- | :---: | :---: |
| **AI Spec & Schema Machine Readability** | 9.0 / 10 | 10 / 10 |
| **Homepage Static Technical SEO** | 7.5 / 10 | 10 / 10 |
| **Per-App & Inner-Page Search / Social SEO** | 4.0 / 10 | 10 / 10 |
| **Edge Crawler Semantics (`404`, `HEAD`, `X-Robots-Tag`, `<noscript>`)** | 4.5 / 10 | 10 / 10 |

---

## 2. Verified Forensic Findings (`SEO-01` through `SEO-08`)

### `SEO-01` — Static `<canonical>`, `<title>`, `<meta description>`, & OpenGraph Tags on All Inner Routes
- **Severity:** **CRITICAL**
- **Location:** `functions/[[path]].js:80-104`, `public/index.html:6-28`
- **Root Cause:** Every SPA route (`/cli`, `/schema`, `/category/:name`, `/app/:slug`) receives the unmodified static `public/index.html` from `env.ASSETS.fetch("/index.html")`. That HTML always emits `<link rel="canonical" href="https://apps.vib.tools/">` and homepage-only `<title>`, `description`, `og:*`, and `twitter:*` tags.
- **Production Impact:**
  1. Googlebot sees `rel="canonical"` pointing to `/` on every `/app/<slug>` page and can de-index individual app pages as duplicates of the homepage.
  2. Social platforms (WhatsApp, Discord, X/Twitter, Facebook, LinkedIn) do not execute client JS, so sharing `https://apps.vib.tools/app/<slug>` shows generic homepage branding instead of the app's name, tagline, and icon.
- **Exact Fix Blueprint:** Create a pure, XSS-safe edge HTML rewriter (`functions/_lib/seo.js`) invoked by `functions/[[path]].js` for HTML storefront routes to inject route-specific `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:url`, `og:title`, `og:description`, `og:image`, `twitter:title`, `twitter:description`, and `twitter:image`.

---

### `SEO-02` — Generic `WebApplication` JSON-LD on Every Route Instead of Per-App `SoftwareApplication` Schema
- **Severity:** **HIGH**
- **Location:** `public/index.html:31-51`, `functions/[[path]].js:80-104`
- **Root Cause:** `public/index.html` embeds a single hardcoded `WebApplication` Schema.org block for the entire marketplace, even on `/app/<slug>`, `/category/<name>`, `/cli`, and `/schema`.
- **Production Impact:** Google Rich Results cannot extract per-app structured data (`SoftwareApplication`: `name`, `softwareVersion`, `applicationCategory`, `operatingSystem`, `offers` with `price: "0"` for Free apps, `downloadUrl`, `image`, `url`) or `BreadcrumbList` / `TechArticle` signals.
- **Exact Fix Blueprint:** Dynamically generate and inject safe JSON-LD (`escapeJsonLd` escaping `<` to `\u003c`) per route inside `functions/_lib/seo.js`:
  - `/`: `WebApplication` + `WebSite` (`SearchAction` targeting `https://apps.vib.tools/?q={search_term_string}`)
  - `/app/:slug`: `SoftwareApplication` + `BreadcrumbList` populated from live `resolveAppBySlug()` config
  - `/category/:name`: `CollectionPage` + `BreadcrumbList`
  - `/cli` & `/schema`: `TechArticle` + `BreadcrumbList`

---

### `SEO-03` — Static `public/sitemap.xml` Never Lists Live Registered Apps or Categories
- **Severity:** **HIGH**
- **Location:** `public/sitemap.xml:1-49`, `server.js:131-179`
- **Root Cause:** `public/sitemap.xml` only lists 9 static URLs. When new GitHub repos are added to `registry.json`, neither `/app/<slug>` nor `/category/<name>` is ever added to `sitemap.xml`.
- **Production Impact:** Search engines have slow/incomplete discovery of newly published apps and release dates (`lastmod`).
- **Exact Fix Blueprint:** Add `functions/sitemap.xml.js` (with `onRequestGet` + `onRequestHead`, `300s` Cloudflare Edge Cache, and local routing parity in `server.js`) that merges canonical static routes with live apps (`/app/<slug>`, `lastmod` from latest `released_at`) and deduplicated categories (`/category/<name>`) from `getRegistry()` + `fetchAppConfig()`. Keep `public/sitemap.xml` as fallback documentation/baseline safety.

---

### `SEO-04` — Blank `<div id="app"></div>` Body for Non-JS AI Crawlers & Scrapers
- **Severity:** **MEDIUM**
- **Location:** `public/index.html:65-67`, `functions/[[path]].js:80-104`
- **Root Cause:** Without JS execution, crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `ChatGPT-User`, curl-based indexers) receive an empty `<div id="app"></div>`.
- **Production Impact:** AI answer engines summarizing `https://apps.vib.tools/app/<slug>` or `https://apps.vib.tools/` cannot read app descriptions, latest version, CLI install command, or direct download links from raw HTML.
- **Exact Fix Blueprint:** Inject a compact, XSS-escaped `<noscript>` semantic HTML summary inside `<body>` via `functions/_lib/seo.js` for `/`, `/app/:slug`, `/category/:name`, `/cli`, and `/schema`. Browser JS users never see `<noscript>`, so visual UI remains 100% untouched.

---

### `SEO-05` — Soft 404 on Unknown Routes and Unregistered App Slugs
- **Severity:** **MEDIUM**
- **Location:** `functions/[[path]].js:81-104`
- **Root Cause:** Any unknown path without a file extension (e.g., `/foo/bar`) and any `/app/<unknown-slug>` returns HTTP `200 OK` with `index.html` and default `index, follow` semantics.
- **Production Impact:** Google Search Console flags Soft 404 errors, wastes crawl budget, and risks indexing broken URLs.
- **Exact Fix Blueprint:**
  1. For unknown paths (not `/`, `/cli`, `/schema`, `/vib-apps-engine`, `/app/:slug`, `/category/:name`), return HTTP `404` with the SPA shell + `<meta name="robots" content="noindex, nofollow">` + `"Page Not Found — Vib Apps"` title.
  2. For `/app/:slug` when `!isValidSlug(slug)` or `resolveAppBySlug()` returns `null`, return HTTP `404` with `<meta name="robots" content="noindex, nofollow">` and `"Application Not Found — Vib Apps"` title (while still letting the SPA show its friendly Not Found UI to humans!).
  3. On `Cache-Control`, mark `404` HTML responses `no-store`.

---

### `SEO-06` — Missing `X-Robots-Tag: noindex, nofollow` on `get.vib.tools` Raw CLI Endpoints
- **Severity:** **MEDIUM**
- **Location:** `functions/[[path]].js:187-194, 329-336`
- **Root Cause:** `get.vib.tools` serves plain-text usage text and raw PowerShell `.ps1` scripts with `200 OK` without `X-Robots-Tag`.
- **Production Impact:** Search engines can index raw PowerShell code on `get.vib.tools/<slug>` and compete with the official storefront page `apps.vib.tools/app/<slug>`.
- **Exact Fix Blueprint:** Attach `"X-Robots-Tag": "noindex, nofollow"` to all non-redirect text/script/error responses on `get.vib.tools`.

---

### `SEO-07` — Missing `onRequestHead` Handler in `functions/[[path]].js`
- **Severity:** **MEDIUM**
- **Location:** `functions/[[path]].js:65-346` (compared against `functions/api/apps.js:303-309`)
- **Root Cause:** `functions/[[path]].js` only exports `onRequestGet`, not `onRequestHead`. On Cloudflare Pages, `HEAD` requests (`curl -I`, uptime monitors, link checkers, social bot pre-checks) bypass `onRequestGet` when `onRequestHead` is absent.
- **Production Impact:** `HEAD` probes on `/cli`, `/schema`, `/app/:slug`, `/llms.txt`, and `get.vib.tools/*` do not receive the Function's custom CORS, `X-Robots-Tag`, `404`, or `302` headers reliably in production.
- **Exact Fix Blueprint:** Export `onRequestHead(context)` in `functions/[[path]].js` (and `functions/sitemap.xml.js` / `functions/llms.txt.js`) returning `new Response(null, { status: res.status, headers: res.headers })`.

---

### `SEO-08` — Base HTML Meta Polish & Dynamic Live App Index in `/llms.txt`
- **Severity:** **LOW**
- **Location:** `public/index.html:5-29`, `public/llms.txt:1-20`
- **Root Cause:**
  1. `public/index.html` lacks `<meta name="robots" content="index, follow">`, `<meta name="theme-color" content="#0d1117">`, `og:image:width`, `og:image:height`, and `og:image:alt`.
  2. `public/llms.txt` is static; once apps are added to `registry.json`, AI agents reading `/llms.txt` won't see a live summary list of published apps unless they separately fetch `/api/apps`.
- **Exact Fix Blueprint:**
  1. Add the missing standard meta tags to `public/index.html` (Phase 1).
  2. Add a lightweight dynamic `functions/llms.txt.js` (with `300s` Edge Cache, `Access-Control-Allow-Origin: *`, and `server.js` parity) that serves the exact static `/llms.txt` specification plus an automatically appended `## Published Applications` section whenever `registry.json` has live apps (Phase 3).

---

## 3. Exact Phase Scope Lock Summary

| Phase | Included Audit IDs | Strictly Allowed Files | Strictly Forbidden Changes |
| :--- | :--- | :--- | :--- |
| **Phase 1** | `SEO-01`, `SEO-02`, `SEO-08` (HTML head) | `functions/_lib/seo.js` (new), `functions/[[path]].js`, `public/index.html` | Zero edits to CSS (`tokens.css`/`globals.css`), UI components (`public/components/*`), `registry.json`, `github.js` validation, or `sw.js` |
| **Phase 2** | `SEO-04`, `SEO-05`, `SEO-06`, `SEO-07` | `functions/_lib/seo.js`, `functions/[[path]].js` | Zero edits to UI components, CSS, `api/apps.js`, `sitemap.xml`, or `llms.txt` |
| **Phase 3** | `SEO-03`, `SEO-08` (dynamic `llms.txt`) | `functions/sitemap.xml.js` (new), `functions/llms.txt.js` (new), `server.js`, `package.json` (`lint`/`build` scripts if adding syntax check) | Zero edits to UI components, CSS, `AppGrid.js`, `Sidebar.js`, `Footer.js`, or `github.js` schema rules |
| **Phase 4** | Full Verification & Regression Lock | `server.test.js`, `notes/phases/cycle3_phase_tracker.md`, `notes/planning/cycle3/03_error_handling_matrix.md`, `notes/planning/cycle3/04_actual_implementation_ledger.md`, `MEMORY.md`, `project/ARCHITECTURE.md` | Zero unrequested feature additions or UI redesigns |
