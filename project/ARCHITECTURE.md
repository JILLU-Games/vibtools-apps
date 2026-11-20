# System Architecture Specification — `vib-apps-hub`

> **Document Status:** Active & Locked Architectural Blueprint  
> **Platform Runtime:** Cloudflare Pages & Pages Functions (Edge V8 Workers)

---

## 1. Technology Stack (Strict Zero-Build Architecture)

To eliminate build overhead, toolchain rot, and dependency sprawl, `vib-apps-hub` enforces a zero-build client and server architecture:

| Tier | Component / Technology | Specification & Constraint |
| :--- | :--- | :--- |
| **Frontend Core** | Pure HTML5 & Vanilla JavaScript | Native ES Modules (`type="module"`). No React, Vue, Next.js, Vite, or Webpack. |
| **Styling** | Tailwind CSS (CDN) | Utility-first stylesheet loaded via CDN; custom dark developer theme overrides. |
| **Markdown Parser** | Marked.js (CDN) | Fast, standards-compliant Markdown rendering for `features.md` and `changelog.md`. |
| **XSS Sanitizer** | DOMPurify (CDN) | Strict sanitization of parsed HTML before rendering into the DOM. |
| **Iconography** | Lucide Icons (CDN / Inline SVG) | Lightweight vector iconography. |
| **Edge Compute** | Cloudflare Pages Functions | JavaScript Workers running on Cloudflare's global edge network. |
| **Edge Caching** | Cloudflare Cache API (`caches.default`) | In-memory edge cache with 5–15 min TTL to prevent GitHub API rate limits. |
| **Binary Storage** | Cloudflare R2 (`dl.vib.tools`) | S3-compatible, zero-egress fee object storage for installers and binaries. |
| **Data Layer** | Config-Driven (`registry.json` + GitHub) | No SQL or NoSQL database. Single source of truth is Git repositories. |

---

## 2. Host & Deployment Target

- **Unified Infrastructure:** Deployed as a single Cloudflare Pages project. No physical servers or VPS required.
- **Dual Domain Host Routing:** Both `apps.vib.tools` and `get.vib.tools` DNS records route to the same Cloudflare Pages deployment.
- **Edge Routing Mechanism:**  
  `functions/[[path]].js` intercepts every incoming request, inspects the `Host` header via `request.headers.get("host")`, and dispatches handling:
  - If `Host` matches `get.vib.tools` (or local testing alias):
    - Routes `/dl/<slug>` and `/dl/<slug>/<version>` to 302 redirect handlers targeting Cloudflare R2 download URLs (with `X-Robots-Tag: noindex, nofollow`).
    - Routes `/<slug>` and `/<slug>/<version>` to the dynamic PowerShell installer script streamer (with `X-Robots-Tag: noindex, nofollow`).
    - Returns `404 Not Found` or simple plaintext usage manual for root `/` (with `X-Robots-Tag: noindex, nofollow`).
  - If `Host` matches `apps.vib.tools`:
    - Static assets from `public/` are served by Pages CDN.
    - Storefront HTML routes (`/`, `/cli`, `/schema`, `/vib-apps-engine`, `/category/:name`, `/app/:slug`) are rewritten at the edge via `functions/_lib/seo.js` to inject XSS-safe route-specific `<title>`, `<meta name="description">`, `<meta name="robots">`, `<link rel="canonical">`, OpenGraph/Twitter tags, Schema.org JSON-LD (`WebSite` + `WebApplication`, `SoftwareApplication` + `BreadcrumbList`, `CollectionPage`, `TechArticle`), and semantic `<noscript>` summaries for non-JS crawlers.
    - Unknown storefront paths and unregistered `/app/:slug` routes return strict HTTP **`404 Not Found`** with `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, and `<meta name="robots" content="noindex, nofollow">` while still serving the SPA shell for human browsers.
    - `functions/[[path]].js` exports both `onRequestGet` and `onRequestHead` for full HTTP `HEAD` parity across both domains.
    - `/sitemap.xml` is served dynamically by `functions/sitemap.xml.js` (canonical static pages + live `/app/<slug>` with `<lastmod>` + deduplicated `/category/<name>`, 300s Edge Cache when non-empty, `404` on `get.vib.tools`).
    - `/llms.txt` is served dynamically by `functions/llms.txt.js` (CORS `*`, canonical spec index + auto-appended `## Published Applications` when live apps exist, `404` on `get.vib.tools`).
    - `/api/apps` is routed to `functions/api/apps.js` returning JSON metadata aggregated from registered apps.

---

## 3. Repository Structure (`vib-apps-hub`)

```text
apps.vib.tools/
├── .gitignore                     # Ignores local environment files & caches
├── wrangler.toml                  # Cloudflare Pages deployment configuration
├── registry.json                  # Central registry of connected app repositories
├── README.md                      # Project overview and quickstart
├── AGENTS.md                      # AI agent operating protocols and rules
├── MEMORY.md                      # Active workspace memory and state
├── docs/                          # End-user documentation and manuals
│   ├── app-config-schema.md       # JSON schema specification for app configs
│   ├── MANIFEST.md                # Docs manifest
│   ├── MINIFEST.md                # Docs minifest reference
│   ├── api/                       # API integration guides
│   ├── features/                  # User feature guides
│   └── user-guide/                # UI walkthroughs
├── public/                        # Static assets served for apps.vib.tools
│   ├── index.html                 # Single page application markup
│   ├── app.js                     # Vanilla JavaScript client controller
│   └── styles.css                 # Custom CSS variables & overrides
├── functions/                     # Cloudflare Pages Functions (Edge API)
│   ├── [[path]].js                # Wildcard host, SPA fallback, Edge SEO injector & get.vib.tools router
│   ├── sitemap.xml.js             # Dynamic Edge XML sitemap (static + live apps + categories, HEAD parity)
│   ├── llms.txt.js                # Dynamic AI discovery index (CORS *, static specs + live Published Applications)
│   ├── _lib/                      # Private internal utilities
│   │   ├── github.js              # GitHub REST API client, Frozen v1 validator & cache layer
│   │   ├── registry.js            # Auto-generated Wrangler-3-safe ES module mirror of registry.json
│   │   └── seo.js                 # XSS-safe per-route SEO meta, OG/Twitter, JSON-LD & <noscript> engine
│   └── api/                       # REST endpoints
│       └── apps.js                # Aggregator for app catalogue metadata
├── project/                       # Internal technical specifications & logs
│   ├── MISSION.md                 # Mission, goals, and features
│   ├── ARCHITECTURE.md            # System architecture and data flow blueprint
│   ├── DESIGN_SYSTEM.md           # UI/UX design tokens and layout rules
│   ├── README.md                  # Project folder overview
│   ├── MANIFEST.md                # Project manifest
│   └── MINIFEST.md                # Project minifest reference
└── notes/                         # Scratchpads, planning drafts, and phase logs
    ├── README.md                  # Notes directory overview
    ├── MANIFEST.md                # Notes manifest
    └── MINIFEST.md                # Notes minifest reference
```

---

## 4. Per-App `.vibtools/` Standard Structure (Frozen v1 Schema)

Every application repository connected via `registry.json` (by pasting its GitHub repository URL or object entry) maintains a `.vibtools/apps/` directory adhering to `https://apps.vib.tools/schemas/vibtools-app.schema.json` (`schemaVersion: 1`):

```text
<app-repository-root>/
└── .vibtools/
    └── apps/
        ├── app.config.json        # Frozen v1 application manifest (fallback: .vibtools/app.config.json)
        ├── installer.ps1          # Default PowerShell installer (or trusted HTTPS URL; per-version override supported)
        ├── features.md            # Detailed markdown summary of features
        └── changelog.md           # Version-by-version release history
```

Public machine-readable specifications served by `apps.vib.tools`:
- `https://apps.vib.tools/schemas/vibtools-app.schema.json` (Frozen JSON Schema Draft 2020-12)
- `https://apps.vib.tools/vib-apps-engine/llms.txt` (AI agent & developer quick spec)
- `https://apps.vib.tools/vib-apps-engine/vibtools-app-config.md` (Full onboarding & 10-point checklist)

### Complete Example: `calgrid` (`.vibtools/apps/app.config.json`)

```json
{
  "$schema": "https://apps.vib.tools/schemas/vibtools-app.schema.json",
  "schemaVersion": 1,
  "slug": "calgrid",
  "name": "CalGrid",
  "tagline": "Minimalist desktop calendar widget and event scheduler",
  "category": "Productivity",
  "access": "Free",
  "icon": "https://dl.vib.tools/calgrid/icon.png",
  "latest": "v1.0.3",
  "installer": {
    "type": "powershell",
    "script": ".vibtools/apps/installer.ps1"
  },
  "docs": {
    "features": ".vibtools/apps/features.md",
    "changelog": ".vibtools/apps/changelog.md"
  },
  "versions": {
    "v1.0.3": {
      "url": "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe",
      "size": "42.8 MB",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "released_at": "2026-11-15"
    },
    "v1.0.2": {
      "url": "https://dl.vib.tools/calgrid/v1.0.2/CalGrid-Setup-1.0.2.exe",
      "installer": "https://dl.vib.tools/calgrid/v1.0.2/install.ps1",
      "size": "41.5 MB",
      "sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
      "released_at": "2026-10-20"
    }
  }
}
```

### PowerShell Installer Standard (`.vibtools/installer.ps1`)

The script must accept an optional `$APP_VERSION` variable. If not passed or set to `"latest"`, it resolves to the application's declared `latest` version.

```powershell
# .vibtools/installer.ps1
param(
    [string]$TargetVersion = $env:APP_VERSION
)

if (-not $TargetVersion -or $TargetVersion -eq "latest") {
    $TargetVersion = "v1.0.3"
}

Write-Host "Installing CalGrid ($TargetVersion)..." -ForegroundColor Cyan
$DownloadUrl = "https://get.vib.tools/dl/calgrid/$TargetVersion"
$TempFile = Join-Path $env:TEMP "CalGrid-$TargetVersion-Setup.exe"

Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempFile
Start-Process -FilePath $TempFile -Wait
Remove-Item -Path $TempFile -Force
Write-Host "CalGrid installed successfully!" -ForegroundColor Green
```

---

## 5. End-to-End Data Flow

```mermaid
flowchart TD
    subgraph Client Requests
        A1["Browser Client (apps.vib.tools)"]
        A2["Terminal / curl (get.vib.tools/calgrid)"]
        A3["Direct Download (get.vib.tools/dl/calgrid)"]
    end

    subgraph Edge Layer (Cloudflare Pages Functions)
        B["functions/[[path]].js (Host Router)"]
        C["Host == apps.vib.tools"]
        D["Host == get.vib.tools"]
        E["functions/api/apps.js"]
        F["functions/_lib/github.js"]
        G["Cloudflare Cache API (5-15m TTL)"]
    end

    subgraph Upstream Storage & Repositories
        H["registry.json"]
        I["GitHub API (Public & Private Repos)"]
        J["Cloudflare R2 (dl.vib.tools)"]
    end

    A1 -->|Fetch Page & API| B
    A2 -->|PowerShell Request| B
    A3 -->|Binary Request| B

    B -->|Check Host| C
    B -->|Check Host| D

    C -->|GET /api/apps| E
    E --> F
    F <--> G
    F -->|Read Registry| H
    F -->|Fetch .vibtools/*| I

    D -->|GET /<slug>| F
    D -->|GET /dl/<slug>| J
```
