# Application Configuration & `.vibtools/` Repository Standard

> **Document Status:** Active Standard  
> **Applies to:** All application repositories registered in `vib-apps-hub` (`registry.json`)

---

## 1. Required Repository Layout

Any target application repository (public or private) integrated into `vib-apps-hub` must place its metadata and installer configuration within a `.vibtools/` root directory matching the following layout:

```text
<app-repository-root>/
└── .vibtools/
    ├── apps/
    │   └── app.config.json        # Core application manifest & version catalog
    ├── installer.ps1              # PowerShell installer script
    ├── features.md                # Feature highlights and documentation in Markdown
    └── changelog.md               # Version-by-version release history in Markdown
```

---

## 2. Field-by-Field Specification for `app.config.json`

The `app.config.json` file serves as the single source of truth for an application's catalog display, version history, and download links.

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `slug` | `string` | **Yes** | Unique, URL-safe identifier (lowercase alphanumeric, hyphens allowed). Used in `/dl/<slug>` and `/calgrid`. | `"calgrid"` |
| `name` | `string` | **Yes** | Human-readable application title. | `"CalGrid"` |
| `tagline` | `string` | **Yes** | Concise one-line summary of what the app does (1–2 sentences max). | `"Minimalist desktop calendar widget and event scheduler"` |
| `icon` | `string` | **Yes** | Direct URL to an application icon image (PNG, SVG, or WebP). | `"https://dl.vib.tools/calgrid/icon.png"` |
| `category` | `string` | **Yes** | Primary category classification (e.g., `Productivity`, `Developer Tools`, `Utilities`). | `"Productivity"` |
| `access` | `string` | **Yes** | License or monetization model: `"Free"` or `"Paid"`. | `"Free"` |
| `latest` | `string` | **Yes** | Identifier of the current latest stable version key present in `versions`. | `"v1.0.3"` |
| `installer` | `object` | **Yes** | Installer script configuration. Must contain `type` (`"powershell"`) and relative `script` path. | `{"type": "powershell", "script": "installer.ps1"}` |
| `docs` | `object` | **Yes** | Relative paths to Markdown documentation files inside `.vibtools/`. | `{"features": "features.md", "changelog": "changelog.md"}` |
| `versions` | `object` | **Yes** | Map of version objects keyed by version tag (e.g., `"v1.0.3"`). | *See Version Object below* |

### Version Object Fields (`versions.<versionKey>`)

| Field | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | **Yes** | Direct, public download URL to the binary/installer on Cloudflare R2 or storage. | `"https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe"` |
| `size` | `string` | **Yes** | Human-readable binary size string. | `"42.8 MB"` |
| `sha256` | `string` | **Yes** | 64-character hexadecimal SHA256 checksum for binary integrity verification. | `"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"` |
| `released_at` | `string` | **Yes** | Release date in ISO 8601 format (`YYYY-MM-DD`). | `"2026-11-15"` |

---

## 3. Complete Example: `calgrid` (`.vibtools/apps/app.config.json`)

```json
{
  "slug": "calgrid",
  "name": "CalGrid",
  "tagline": "Minimalist desktop calendar widget and event scheduler",
  "icon": "https://dl.vib.tools/calgrid/icon.png",
  "category": "Productivity",
  "access": "Free",
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
      "url": "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe",
      "size": "42.8 MB",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "released_at": "2026-11-15"
    },
    "v1.0.2": {
      "url": "https://dl.vib.tools/calgrid/v1.0.2/CalGrid-Setup-1.0.2.exe",
      "size": "41.5 MB",
      "sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
      "released_at": "2026-10-20"
    }
  }
}
```

---

## 4. Minimal Example: `.vibtools/installer.ps1`

When a client runs `irm "https://get.vib.tools/calgrid" | iex`, Cloudflare Pages Functions injects a prepended variable `$APP_VERSION = "latest"` (or the pinned version, e.g., `"v1.0.2"`).

The installer script must handle this parameter cleanly, defaulting to the latest version if the variable is omitted:

```powershell
# .vibtools/installer.ps1
[CmdletBinding()]
param(
    [string]$TargetVersion = $APP_VERSION
)

# Fallback to latest stable release if unspecified
if ([string]::IsNullOrWhiteSpace($TargetVersion) -or $TargetVersion -eq "latest") {
    $TargetVersion = "v1.0.3"
}

$AppName = "CalGrid"
$DownloadUrl = "https://get.vib.tools/dl/calgrid/$TargetVersion"
$TempPath = Join-Path $env:TEMP "$AppName-$TargetVersion-Setup.exe"

Write-Host "==> Downloading $AppName ($TargetVersion)..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempPath -UseBasicParsing
    Write-Host "==> Launching installer..." -ForegroundColor Green
    Start-Process -FilePath $TempPath -Wait
}
catch {
    Write-Error "Failed to install $AppName : $_"
    exit 1
}
finally {
    if (Test-Path $TempPath) {
        Remove-Item -Path $TempPath -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "==> $AppName ($TargetVersion) installation completed." -ForegroundColor Green
```
