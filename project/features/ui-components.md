# Frontend UI Components & Layout Specifications

> **Module Role:** Pure zero-build Vanilla JS (ES Modules) UI components and sections.
> **Design Standard:** Strictly complies with `project/DESIGN_SYSTEM.md` (zero box-shadow, zero inline styles, Segoe UI typography, WCAG AA dark/light dual-theme parity).

---

## 1. Shared Primitives (`public/components/ui/`) & Metadata Helpers (`public/lib/appMeta.js`)

1. **`Button.js`:** Flat accessible button (`sm` / `md` / `lg`, optional `fullWidth`) that renders a semantic `<a>` when `href` is supplied (eliminating `window.open` for external links and binary downloads).
2. **`Badge.js`:** Flat badge supporting `neutral`, `accent`, `success`, `paid`, `warn`, and `mono` (tabular monospace) variants.
3. **`Card.js`:** Semantic `<article>` surface with keyboard navigation (`tabindex="0"`, `Enter`/`Space`) when `clickable` is true.
4. **`Icon.js`:** Consistent inline SVG vector icons with `aria-hidden="true"` and `focusable="false"`.
5. **`appMeta.js`:** Pure, evidence-based helpers (`getAppMonogram`, `getPackageFormat`, `formatReleaseDate`, `formatVersionLabel`, `buildInstallCommand`, `buildDownloadUrl`, `filterApps`, `computeCategoryCounts`) verified by `public/lib/appMeta.test.js`. `buildDownloadUrl(slug, version, options)` automatically routes to local `${origin}/dl/<slug>/<version>?mode=get` on `localhost`/`127.0.0.1` while defaulting to `https://get.vib.tools/dl/<slug>/<version>` in production and non-browser environments.

---

## 2. Application Layout Hierarchy (`public/components/layout/`)

1. **`Header.js`:**
   - 56px sticky header with non-wrapping brand lockup, 480px max-width debounced search input with `/` `<kbd>` indicator, semantic external Docs link (`docs.vib.tools`), and dual-theme switcher.
   - Global `/` keyboard shortcut guarded against active modals (`.ui-modal`, `.ui-modal-backdrop`) and form controls.
2. **`Sidebar.js`:**
   - 240px desktop navigation rail organized into **Discover** (`All Apps` with real total count, `CLI Installer`), **Categories** (dynamic sorted list with real per-category counts and `CSS.escape()` active sync), and **Resources** (`Documentation`, `Edge Installer`).
3. **`MobileNav.js`:**
   - Fixed 56px mobile bottom navigation (`<= 768px`) with `aria-current="page"` state for Apps (`/`), CLI (`/cli`), and Theme toggle.
4. **`Footer.js`:**
   - Minimal bottom footer with Vib Tools mark, copyright, and links to `vib.tools`, `docs.vib.tools`, and `get.vib.tools`.
5. **`MainLayout.js`:**
   - Responsive shell orchestrating Header, Sidebar, main view root (`#view-root`), Footer, and MobileNav.

---

## 3. Section Views (`public/components/sections/`)

1. **`AppGrid.js`:**
   - Catalog Discovery Header displaying active view title, subtitle, and real tabular application count.
   - License/Access segmented filter (`All`, `Free`, `Paid`), horizontal scrollable mobile category chips with counts (`.app-category-bar`), and one-click filter reset.
   - Pinned `get.vib.tools` CLI banner with monospace `<code>` command pill, Copy, and CLI Guide actions.
   - Loading skeleton cards matching 3-zone geometry and actionable empty states.
   - 3-zone Application Cards (`repeat(auto-fill, minmax(300px, 1fr))`): 44×44px icon container with restrained 2-letter monogram fallback on image error, 2-line clamped tagline, real version & package/installer metadata badges, and aligned footer actions (`View Details` + `Copy CLI`).
2. **`AppDetailView.js`:**
   - Breadcrumb navigation (`All Apps / <Category> / <App Name>`) and compact app header with 56×56px icon container and immediately grouped metadata badges.
   - Responsive two-column layout (`minmax(0, 1fr) 340px` desktop, stacked with Download Panel first below `1024px`).
   - Left column: ARIA-compliant `Features & Overview` / `Release Changelog` tabs rendered strictly via `DOMPurify.sanitize(marked.parse(...))`, plus conditional Screenshots, System Requirements, and Resource Links rendered only when supplied in real app metadata.
   - Right sticky Download & Install Panel: Accessible version `<select>` with release dates, semantic `<a href="/dl/...">` primary download CTA (environment-aware for local dev vs production `get.vib.tools`), monospace PowerShell CLI copy box, and Release Details `<dl>` (Version, Released date, Package format, File Size, conditional read-only **Platforms** & **Architecture** specification rows when present in real metadata, and expandable/copyable SHA256 checksum).
   - **Async Race Protection:** Uses `AbortController` (`container.cleanup = () => controller.abort()`), passes `{ signal }` into `fetchAppDetail()`, and guards `.then()` / `.catch()` with `controller.signal.aborted || !container.isConnected` so rapid navigation never overwrites `document.title` or triggers spurious error toasts.
3. **`CliGuideSection.js`:**
   - Breadcrumb-linked terminal reference manual with `PowerShell` / `302 Redirect` badges, template syntax, live examples, and copy buttons.

---

## 4. SPA Router, Search Sync & Asset Hygiene (`public/lib/router.js`, `public/app.js`, `public/lib/api.js`)

1. **Full Path + Query Navigation (`router.js`):** `navigate(path)` compares `${window.location.pathname}${window.location.search}` against `path`, ensuring clicking the Brand Logo or `All Apps` from `/?q=...` cleanly resets to `/`.
2. **`popstate` Search Restoration (`app.js`):** `onRouteChange()` cancels pending search debounce timers, restores `?q=` from `window.location.search` into both `currentSearchQuery` and `layout.setSearchValue(urlQuery)` on Home/Category views, and invokes `activeViewCleanup?.()` before swapping views.
3. **Clean `public/` Deployment Hygiene:** Only runtime frontend files, brand icons, `manifest.json`, and `sw.js` reside in `public/` (non-runtime design references, placeholder `site.webmanifest`, and unused `styles.css` removed; shared primitive `Modal.js` retained).

---

## 5. PWA Service Worker & Automated Verification (`public/sw.js`, `package.json`)

1. **Service Worker (`public/sw.js`):** Uses cache version `vib-apps-hub-v3`, precaches every runtime shell module plus all `manifest.json` icons (`/vib.tools.Branding/favicon.svg`, `favicon-96x96.png`, `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`, and `/icons/icon.svg`), and exits early on non-`GET` or non-HTTP(S) requests before URL/cache logic runs.
2. **Unified Regression Test Suite (`npm test`):** Executes both `server.test.js` and `public/lib/appMeta.test.js` via `node --test` (29 automated tests covering all 18 Cycle 2 security, caching, routing, frontend state, asset hygiene, and PWA invariants).
