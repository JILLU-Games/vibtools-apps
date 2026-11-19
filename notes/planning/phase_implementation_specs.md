# Phase Implementation Specifications & Scope Locks

> **Document Location:** `notes/planning/phase_implementation_specs.md`  
> **Status:** Specification Complete (Pre-Implementation)  
> **Principle:** Minimum necessary changes + Maximum required correctness. Strict Scope Lock per phase.

---

## Phase 1 Specification: Mock/Demo Fallback Engine

### 1. Scope Lock
- **Allowed Files:**
  - `functions/_lib/mockData.js` (NEW)
  - `functions/api/apps.js` (MODIFIED)
  - `functions/[[path]].js` (MODIFIED)
- **Forbidden Files:** ALL files in `public/`, `docs/`, `styles/`, and `registry.json`.

### 2. Code Reference & Patch Design

#### File: `functions/_lib/mockData.js` (New File)
- **Role:** Pure data module containing complete, schema-compliant sample applications (`calgrid`, `devprompt`, `vibclip`).
- **Structure:**
  ```javascript
  export const SAMPLE_APPS = [
    {
      slug: "calgrid",
      name: "CalGrid",
      tagline: "Minimalist desktop calendar widget and event scheduler",
      category: "Productivity",
      access: "Free",
      icon: "https://dl.vib.tools/calgrid/icon.png",
      featured: true,
      latest: "v1.0.3",
      installer: { type: "powershell", script: ".vibtools/installer.ps1" },
      docs: { features: "features.md", changelog: "changelog.md" },
      versions: {
        "v1.0.3": {
          url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe",
          size: "42.8 MB",
          sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          released_at: "2026-11-15"
        }
      }
    },
    ...
  ];
  ```

#### File: `functions/api/apps.js` (Lines 80–105)
- **Patch Target:** If `apps.length === 0` after fetching `registry.json` entries (e.g. rate limit, offline dev, or missing GitHub repo), automatically populate with `SAMPLE_APPS`.
- **Code Patch Blueprint:**
  ```javascript
  if (apps.length === 0) {
    apps.push(...SAMPLE_APPS);
  }
  ```
- **Single App Mode B Target:** In `slugParam` check, if `findAppEntry(slug)` returns null, check `SAMPLE_APPS.find(a => a.slug === slug)`. If found in sample apps, return the sample app metadata and sample docs.

#### File: `functions/[[path]].js` (Lines 113 & 157)
- **Patch Target:** If `findAppEntry(slug)` returns null, check `SAMPLE_APPS.find(a => a.slug === slug)`. If matched, return the sample app's installer script or redirect to the sample app's download URL.

---

## Phase 2 Specification: Edge Routing, CORS & CLI Normalization

### 1. Scope Lock
- **Allowed Files:**
  - `functions/[[path]].js` (MODIFIED)
  - `functions/api/apps.js` (MODIFIED)
  - `functions/_lib/github.js` (MODIFIED)
- **Forbidden Files:** ALL files in `public/`.

### 2. Code Reference & Patch Design

#### File: `functions/[[path]].js` (Version Lookup Normalization)
- **Problem Line:** Lines 133 & 178 (`config.versions[requestedVersion]` fails if `"v"` prefix is omitted).
- **Code Patch Blueprint:**
  ```javascript
  function resolveVersionObject(versions, requestedVersion, latestKey) {
    if (!versions || typeof versions !== "object") return null;
    const target = requestedVersion || latestKey;
    if (versions[target]) return { key: target, data: versions[target] };
    const withV = `v${target.replace(/^v/i, "")}`;
    if (versions[withV]) return { key: withV, data: versions[withV] };
    const withoutV = target.replace(/^v/i, "");
    if (versions[withoutV]) return { key: withoutV, data: versions[withoutV] };
    return null;
  }
  ```

#### File: `functions/[[path]].js` (Browser HTML Redirect on `get.vib.tools`)
- **Problem Line:** Lines 63–70 & 153–165 (`get.vib.tools/cli` and `get.vib.tools/<slug>` return raw text in browsers).
- **Code Patch Blueprint:**
  ```javascript
  const accept = request.headers.get("accept") || "";
  const isHtml = accept.includes("text/html");

  if (isHtml) {
    if (segments[0] === "cli") {
      return Response.redirect("https://apps.vib.tools/cli", 302);
    }
    if (segments.length === 1 && segments[0] !== "dl") {
      return Response.redirect(`https://apps.vib.tools/app/${segments[0]}`, 302);
    }
  }
  ```

#### File: `functions/api/apps.js` (CORS Headers)
- **Problem Line:** Line 24.
- **Code Patch Blueprint:**
  ```javascript
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS"
  };
  ```

#### File: `functions/_lib/github.js` (Synthetic Cache Key URL)
- **Problem Line:** Line 87 (`https://cache.vib-apps-hub.internal/...`).
- **Code Patch Blueprint:** Use the request origin or `https://apps.vib.tools` to maintain zone affinity.

---

## Phase 3 Specification: Frontend UI Parity & Mobile Experience

### 1. Scope Lock
- **Allowed Files:**
  - `public/components/sections/AppGrid.js` (MODIFIED)
  - `public/components/sections/AppDetailView.js` (MODIFIED)
  - `public/components/layout/MobileNav.js` (MODIFIED)
  - `public/components/layout/Sidebar.js` (MODIFIED)
  - `public/components/layout/Header.js` (MODIFIED)
  - `public/app.js` (MODIFIED)
  - `public/styles/globals.css` (MODIFIED only for necessary mobile category styles)
- **Forbidden Files:** ALL files in `functions/`.

### 2. Code Reference & Patch Design

#### File: `public/components/sections/AppGrid.js` (Icon Rendering)
- **Problem Line:** Line 102 (App icon missing from card).
- **Code Patch Blueprint:**
  ```javascript
  const iconWrap = document.createElement("div");
  iconWrap.className = "app-card__icon";
  if (app.icon) {
    const img = document.createElement("img");
    img.src = app.icon;
    img.alt = `${app.name} icon`;
    img.loading = "lazy";
    img.onerror = () => {
      iconWrap.innerHTML = "";
      iconWrap.appendChild(Icon("layers", 22));
    };
    iconWrap.appendChild(img);
  } else {
    iconWrap.appendChild(Icon("layers", 22));
  }
  headerEl.prepend(iconWrap);
  ```

#### File: `public/components/sections/AppDetailView.js` (Icon Rendering)
- **Problem Line:** Line 93 (App icon missing from detail header).
- **Code Patch Blueprint:** Render app icon side-by-side with `app.name`.

#### File: `public/components/sections/AppGrid.js` / `MobileNav.js` (Mobile Category Selector)
- **Problem Line:** Mobile users cannot see or filter categories.
- **Code Patch Blueprint:** Add a horizontal scrollable category filter pill bar at the top of `AppGrid` when categories are present.

#### File: `public/app.js` (Search History Flooding Fix & Debounce)
- **Problem Line:** Lines 33–41 (`navigate("/")` pushed on every keypress).
- **Code Patch Blueprint:**
  ```javascript
  let searchDebounceTimer = null;
  onSearch: (query) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentSearchQuery = query;
      const route = getCurrentRoute();
      if (route.view !== "home" && route.view !== "category") {
        window.history.replaceState({}, "", "/");
      }
      renderCurrentView(getCurrentRoute());
    }, 150);
  }
  ```

#### File: `public/components/layout/Sidebar.js` (`CSS.escape()`)
- **Problem Line:** Line 99 (`catListContainer.querySelector('[data-category="' + route.category + '"]')`).
- **Code Patch Blueprint:**
  ```javascript
  const safeCat = CSS.escape(route.category.toLowerCase());
  const target = catListContainer.querySelector(`[data-category="${safeCat}"]`);
  ```

---

## Phase 4 Specification: Caching Scalability, Dynamic Titles & PWA Polish

### 1. Scope Lock
- **Allowed Files:**
  - `functions/api/apps.js` (MODIFIED)
  - `public/app.js` (MODIFIED)
  - `public/manifest.json` (MODIFIED)
  - `public/icons/icon.svg` (NEW)
- **Forbidden Files:** ALL layout, UI primitive, and section files.

### 2. Code Reference & Patch Design

#### File: `public/app.js` (Dynamic `document.title`)
- **Problem Line:** Line 50.
- **Code Patch Blueprint:**
  ```javascript
  function updateDocumentTitle(route, extra) {
    if (route.view === "app" && extra?.name) {
      document.title = `${extra.name} — Vib Apps`;
    } else if (route.view === "category" && route.category) {
      document.title = `${route.category} — Vib Apps`;
    } else if (route.view === "cli") {
      document.title = "CLI Guide — Vib Apps";
    } else {
      document.title = "Vib Apps — Apps Catalog & Edge Installer";
    }
  }
  ```

#### File: `functions/api/apps.js` (Catalog Edge Caching)
- **Problem Line:** Line 77 (Uncached fan-out to GitHub API).
- **Code Patch Blueprint:** Wrap `GET /api/apps` response in Cloudflare `caches.default` with a 300-second TTL.

#### File: `public/manifest.json` (Static Icon Standard)
- **Problem Line:** Line 10 (Data URI icon).
- **Code Patch Blueprint:** Create `public/icons/icon.svg` and reference `src: "/icons/icon.svg"`.
