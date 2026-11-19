# Application Configuration & `.vibtools/` Repository Standard

> **Document Status:** Verified Against Live Code (`functions/_lib/github.js`, `functions/[[path]].js`, `public/components/sections/AppDetailView.js`)  
> **Applies To:** All application repositories registered in `vib-apps-hub` (`registry.json`)  
> **Related:** [Developer Onboarding Guide](./dev/03-app-onboarding.md)

---

## 1. Repository Directory Layout

Every target application repository (public or private) registered in `registry.json` stores its metadata, installer script, and documentation inside `.vibtools/`:

```text
<app-repository-root>/
└── .vibtools/
    ├── apps/
    │   └── app.config.json        # Primary manifest (404 fallback: .vibtools/app.config.json)
    ├── installer.ps1              # Default PowerShell installer (404 fallback: .vibtools/install.ps1)
    ├── features.md                # Features & Overview Markdown (referenced by docs.features)
    └── changelog.md               # Release Changelog Markdown (referenced by docs.changelog)
```

---

## 2. Field-by-Field Specification for `app.config.json`

`fetchAppConfig()` (`functions/_lib/github.js:229`) strictly requires **4 top-level fields** (`slug`, `name`, `latest`, `versions`). All remaining fields are optional and rendered conditionally by the storefront only when provided.

| Field | Type | Strictly Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `slug` | `string` | **Yes** | Unique identifier matching `/^[a-z0-9][a-z0-9-_]{0,63}$/i`. Used in `/app/<slug>` and `get.vib.tools/<slug>`. | `"calgrid"` |
| `name` | `string` | **Yes** | Human-readable application display name. | `"CalGrid"` |
| `latest` | `string` | **Yes** | Version key in `versions` representing the default release. | `"v1.0.3"` |
| `versions` | `object` | **Yes** | Map of version keys to release objects (see table below). | *See Version Object* |
| `tagline` | `string` | No | Concise summary displayed on catalog cards (clamped to 2 lines) and detail header. | `"Minimalist desktop calendar widget and event scheduler"` |
| `icon` | `string` | No | Direct HTTPS URL to an icon image (falls back to 2-letter monogram if omitted or unreachable). | `"https://dl.vib.tools/calgrid/icon.png"` |
| `category` | `string` | No | Category label used for dynamic sidebar counts and `/category/<name>` filtering. | `"Productivity"` |
| `access` | `string` | No | License tier (`"Free"` or `"Paid"`), surfaced as badges and the segmented license filter. | `"Free"` |
| `installer` | `string \| object` | No | Script path string or `{ "type": "powershell", "script": ".vibtools/installer.ps1" }`. Defaults to `.vibtools/installer.ps1`. | `{"type": "powershell", "script": ".vibtools/installer.ps1"}` |
| `docs` | `object` | No | Relative paths to Markdown docs (`features`, `changelog`). Filenames without `/` automatically resolve under `.vibtools/`. | `{"features": "features.md", "changelog": "changelog.md"}` |
| `platforms` | `string[]` | No | Optional OS labels rendered as an informational **Operating System** selector on `/app/<slug>`. | `["Windows 10/11"]` |
| `architectures` | `string[]` | No | Optional CPU labels rendered as an informational **Architecture** selector on `/app/<slug>`. | `["x64"]` |
| `screenshots` | `(string \| { url, alt? })[]` | No | Optional screenshot gallery displayed on `/app/<slug>`. | `["https://dl.vib.tools/calgrid/screen-1.png"]` |
| `requirements` | `string[] \| object` | No | Optional system requirements list displayed on `/app/<slug>`. | `["Windows 10/11 (64-bit)"]` |
| `links` | `object` | No | Optional `https?://` external resource links displayed in the detail sidebar. | `{"docs": "https://docs.vib.tools/calgrid"}` |

### Version Object Fields (`versions.<versionKey>`)

| Field | Type | Required for `/dl/` | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `url` | `string` | **Yes** | Direct `https://` download URL (validated with `startsWith("https://")` in `functions/[[path]].js:214`). | `"https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe"` |
| `size` | `string` | No | Human-readable binary size string. | `"42.8 MB"` |
| `sha256` | `string` | No | 64-character hexadecimal SHA256 digest displayed with **Full/Hide** toggle and copy button. | `"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"` |
| `released_at` | `string` | No | ISO 8601 date (`YYYY-MM-DD`) formatted deterministically in UTC (e.g. `Nov 15, 2026`). | `"2026-11-15"` |

---

## 3. Complete Example: `.vibtools/apps/app.config.json`

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
    "script": ".vibtools/installer.ps1"
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
      "sha256": "9f83c605d4c82c3dd9e3b909c29fca53ca74c70284c717ec010746ff79c57c4c",
      "released_at": "2026-10-28"
    }
  }
}
```

---

## 4. PowerShell Installer Contract: `.vibtools/installer.ps1`

When a client runs `irm "https://get.vib.tools/<slug>" | iex` or `irm "https://get.vib.tools/<slug>/<version>" | iex`, `functions/[[path]].js:292` resolves the concrete target version (defaulting to `config.latest`, never the literal `"latest"`) and prepends **exactly two** sanitized PowerShell variables:

```powershell
$APP_SLUG = "calgrid"
$APP_VERSION = "v1.0.3"
```

Write `.vibtools/installer.ps1` using `$APP_SLUG` and `$APP_VERSION` (do not assume `$APP_NAME` or `$DOWNLOAD_URL` are injected):

```powershell
# .vibtools/installer.ps1
$ErrorActionPreference = "Stop"

$AppName = "CalGrid"
$TargetSlug = if ([string]::IsNullOrWhiteSpace($APP_SLUG)) { "calgrid" } else { $APP_SLUG }
$TargetVersion = if ([string]::IsNullOrWhiteSpace($APP_VERSION)) { "v1.0.3" } else { $APP_VERSION }

$DownloadUrl = "https://get.vib.tools/dl/$TargetSlug/$TargetVersion"
$TempPath = Join-Path $env:TEMP "$AppName-$TargetVersion-Setup.exe"

Write-Host "==> Downloading $AppName ($TargetVersion)..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempPath
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
