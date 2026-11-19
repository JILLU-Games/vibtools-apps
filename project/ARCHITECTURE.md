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
    - Routes `/dl/<slug>` and `/dl/<slug>/<version>` to 302 redirect handlers targeting Cloudflare R2 download URLs.
    - Routes `/<slug>` and `/<slug>/<version>` to the dynamic PowerShell installer script streamer.
    - Returns `404 Not Found` or simple plaintext usage manual for root `/`.
  - If `Host` matches `apps.vib.tools`:
    - Static assets from `public/` are served by Pages CDN.
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
│   ├── [[path]].js                # Wildcard host and route dispatcher
│   ├── _lib/                      # Private internal utilities
│   │   ├── github.js              # GitHub REST API client & cache layer
│   │   └── mockData.js            # Offline sample fallback catalog & installer engine
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

## 4. Per-App `.vibtools/` Standard Structure

Every application repository connected via `registry.json` must maintain a `.vibtools/` root directory adhering to this structure:

```text
<app-repository-root>/
└── .vibtools/
    ├── apps/
    │   └── app.config.json        # Primary application manifest
    ├── installer.ps1              # Standard PowerShell installation script
    ├── features.md                # Detailed markdown summary of features
    └── changelog.md               # Version-by-version release history
```

### Complete Example: `calgrid` (`.vibtools/apps/app.config.json`)

```json
{
  "slug": "calgrid",
  "name": "CalGrid",
  "tagline": "Minimalist desktop calendar widget and event scheduler",
  "category": "Productivity",
  "access": "Free",
  "icon": "https://dl.vib.tools/calgrid/icon.png",
  "latest": "v1.0.3",
  "installer": {
    "type": "powershell",
    "script": "installer.ps1"
  },
  "docs": {
    "features": "features.md",
    "changelog": "changelog.md"
  },
  "versions": {
    "v1.0.3": {
      "releaseDate": "2026-11-15",
      "url": "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe",
      "size": "42.8 MB",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    "v1.0.2": {
      "releaseDate": "2026-10-20",
      "url": "https://dl.vib.tools/calgrid/v1.0.2/CalGrid-Setup-1.0.2.exe",
      "size": "41.5 MB",
      "sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
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
