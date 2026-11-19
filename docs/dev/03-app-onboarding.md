---
title: "App Onboarding & .vibtools Schema"
description: "Authoritative .vibtools directory layout, app.config.json field validation rules, PowerShell installer contract, and registry.json entry format."
order: 3
draft: false
---

# App Onboarding & `.vibtools/` Schema

Applications are onboarded into `vib-apps-hub` purely through Git metadata—no database migrations or admin UI are required.

## 1. Required Directory Layout in Target App Repo

Place metadata, installer script, and documentation inside `.vibtools/` at the root of your application repository:

```text
<app-repo>/
└── .vibtools/
    ├── apps/
    │   └── app.config.json   # Primary manifest (fallback checked on 404: .vibtools/app.config.json)
    ├── installer.ps1         # Default installer (fallback checked on 404: .vibtools/install.ps1)
    ├── features.md           # Features & Overview Markdown (referenced via docs.features)
    └── changelog.md          # Release Changelog Markdown (referenced via docs.changelog)
```

Path resolution rules implemented in `functions/_lib/github.js`:

- `fetchAppConfig()` checks `.vibtools/apps/app.config.json` first, falling back to `.vibtools/app.config.json` only on HTTP `404`.
- `fetchAppInstaller()` checks `config.installer` (string) or `config.installer.script` (object), defaulting to `.vibtools/installer.ps1`. If a filename contains no `/`, `.vibtools/` is prepended automatically. When the default `.vibtools/installer.ps1` returns `404`, `.vibtools/install.ps1` is tried as a fallback.
- `fetchAppDoc()` reads `config.docs.features` and `config.docs.changelog`. Filenames without `/` automatically resolve under `.vibtools/`.

## 2. `app.config.json` Field Specification

### Strictly Required vs Optional Fields

`fetchAppConfig()` (`functions/_lib/github.js:229`) enforces **4 required top-level fields**. All other fields are optional and conditionally rendered by the UI only when present:

| Field | Strictly Required | Type | Consumed By | Notes |
| :--- | :---: | :--- | :--- | :--- |
| `slug` | **Yes** | `string` | `github.js`, `[[path]].js`, `AppGrid.js`, `AppDetailView.js` | Must match `/^[a-z0-9][a-z0-9-_]{0,63}$/i`. |
| `name` | **Yes** | `string` | `AppGrid.js`, `AppDetailView.js`, `app.js` | Display title and browser tab title. |
| `latest` | **Yes** | `string` | `[[path]].js`, `AppGrid.js`, `AppDetailView.js` | Key in `versions` used for default installs/downloads. |
| `versions` | **Yes** | `object` | `[[path]].js`, `AppGrid.js`, `AppDetailView.js` | Map of version keys to release objects. |
| `tagline` | No | `string` | `AppGrid.js`, `AppDetailView.js`, `filterApps()` | 2-line card summary; defaults to `"No description available."` on cards if omitted. |
| `category` | No | `string` | `Sidebar.js`, `AppGrid.js`, `AppDetailView.js`, `computeCategoryCounts()` | Drives dynamic sidebar categories, counts, and `/category/:name` routes. |
| `access` | No | `string` | `AppGrid.js`, `AppDetailView.js`, `filterApps()` | `"Free"` (green badge) or `"Paid"` (purple badge); drives the segmented license filter. |
| `icon` | No | `string` | `AppGrid.js`, `AppDetailView.js` | HTTPS icon URL; falls back to 2-letter monogram (`getAppMonogram()`) if omitted or broken. |
| `installer` | No | `string \| { type?: string, script?: string }` | `github.js`, `AppGrid.js`, `AppDetailView.js` | Controls installer path and card/detail installer badge (e.g. `PowerShell`). |
| `docs` | No | `{ features?: string, changelog?: string }` | `api/apps.js`, `github.js`, `AppDetailView.js` | Paths to Markdown files rendered in ARIA tabs. |
| `platforms` | No | `string[]` | `AppDetailView.js` | Renders an informational **Operating System** `<select>` when non-empty. *(Currently informational; does not alter download URL.)* |
| `architectures` | No | `string[]` | `AppDetailView.js` | Renders an informational **Architecture** `<select>` when non-empty. *(Currently informational; does not alter download URL.)* |
| `screenshots` | No | `(string \| { url: string, alt?: string })[]` | `AppDetailView.js` | Renders a lazy-loaded **Screenshots** gallery card. |
| `requirements` | No | `string[] \| Record<string, string>` | `AppDetailView.js` | Renders a **System Requirements** bulleted list card. |
| `links` | No | `Record<string, string>` | `AppDetailView.js` | Filters for `https?://` URLs and renders external buttons under **Resources & Links**. |

### Version Object (`versions.<versionKey>`)

| Field | Required for `/dl/` | Type | Description |
| :--- | :---: | :--- | :--- |
| `url` | **Yes** | `string` | Direct `https://` download URL (validated with `startsWith("https://")` in `functions/[[path]].js:214`). Extension determines the package format badge (`getPackageFormat()`). |
| `sha256` | No | `string` | Hex SHA256 digest displayed with **Full/Hide** toggle (when length > 20) and one-click copy. |
| `size` | No | `string` | Human-readable file size (e.g., `"42.8 MB"`). |
| `released_at` | No | `string` | ISO date `YYYY-MM-DD`, formatted deterministically in UTC (e.g., `"Nov 15, 2026"`) via `formatReleaseDate()`. |

### Complete Verified Example

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
    }
  }
}
```

## 3. PowerShell Installer Contract (`.vibtools/installer.ps1`)

When serving `GET https://get.vib.tools/<slug>` or `GET https://get.vib.tools/<slug>/<version>`, `functions/[[path]].js:292` prepends **exactly two** sanitized PowerShell variables (CRLF line endings):

```powershell
$APP_SLUG = "calgrid"
$APP_VERSION = "v1.0.3"
```

- `$APP_VERSION` is always resolved to the concrete version key (e.g., `v1.0.3`), never the literal string `"latest"`.
- `$APP_NAME` and `$DOWNLOAD_URL` are **NOT** injected by `functions/[[path]].js`. Scripts must derive download URLs from `$APP_SLUG` and `$APP_VERSION`:

```powershell
$ErrorActionPreference = "Stop"

$downloadUrl = "https://get.vib.tools/dl/$APP_SLUG/$APP_VERSION"
$tempFile = Join-Path $env:TEMP "$APP_SLUG-$APP_VERSION-setup.exe"

Write-Host "Downloading $APP_SLUG ($APP_VERSION)..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile
Start-Process -FilePath $tempFile -Wait
Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
Write-Host "$APP_SLUG ($APP_VERSION) installed." -ForegroundColor Green
```

## 4. Registering in `registry.json`

Add an entry to the root `registry.json` array in `vib-apps-hub` (`getRegistry()` also accepts `{ "apps": [...] }` object wrapping):

```json
[
  {
    "slug": "calgrid",
    "repo": "vib-tools/calgrid",
    "branch": "main",
    "featured": true
  }
]
```

| Field | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `slug` | Yes | — | Case-insensitive lookup slug matching `app.config.json`. |
| `repo` | Yes | — | GitHub `owner/name` repository path. |
| `branch` | No | `"main"` | Target Git branch or ref passed as `?ref=` to GitHub Contents API. |
| `featured` | No | `false` | Merged into the returned config object as `Boolean(entry.featured)`. |

## Related Guides

- [Store API & Edge Routing Reference](./04-api-and-edge-routing.md)
- [Security, Validation & Audited Findings](./05-security-and-validation.md)
- [Local Setup & Cloudflare Deployment](./06-local-setup-and-deployment.md)
