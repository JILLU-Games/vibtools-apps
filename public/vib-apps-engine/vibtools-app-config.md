# Vib Apps Engine — Complete A–Z Setup Guide (Basic to Advanced)

> **Frozen JSON Schema:** `https://apps.vib.tools/schemas/vibtools-app.schema.json`  
> **Single-URL AI Master Bundle:** `https://apps.vib.tools/llms-full.txt`  
> **AI Quick Spec:** `https://apps.vib.tools/vib-apps-engine/llms.txt`  
> **AI Execution Playbook:** `https://apps.vib.tools/vib-apps-engine/ai-guide.md`  
> **Schema Version:** `1` (Frozen, `additionalProperties: false`)  
> **Applies To:** `apps.vib.tools` (Storefront & JSON API) and `get.vib.tools` (CLI Installer & Direct Download Router)

---

## Table of Contents

1. [What Is Vib Apps Engine & How Auto-Collection Works](#1-what-is-vib-apps-engine--how-auto-collection-works)
2. [Directory Structure Inside Your App Repository](#2-directory-structure-inside-your-app-repository)
3. [Level 1 (Basic): Minimal 2-Minute App Setup](#3-level-1-basic-minimal-2-minute-app-setup)
4. [Level 2 (Standard): Complete Production Storefront Listing](#4-level-2-standard-complete-production-storefront-listing)
5. [Level 3 (Advanced): Multi-Version Control & Per-Version Installers](#5-level-3-advanced-multi-version-control--per-version-installers)
6. [Complete Field-by-Field Reference (Purpose, Rules & Usage)](#6-complete-field-by-field-reference-purpose-rules--usage)
7. [Writing the PowerShell Installer Script](#7-writing-the-powershell-installer-script)
8. [Writing Features & Changelog Markdown Docs](#8-writing-features--changelog-markdown-docs)
9. [Registering Your Repository in `registry.json`](#9-registering-your-repository-in-registryjson)
10. [Security, Trusted Hosts & Edge Caching Rules](#10-security-trusted-hosts--edge-caching-rules)
11. [Troubleshooting & Common Mistakes](#11-troubleshooting--common-mistakes)
12. [12-Point Self-Verification Checklist](#12-12-point-self-verification-checklist)

---

## 1. What Is Vib Apps Engine & How Auto-Collection Works

### Purpose (Why This Exists)
Vib Apps Engine eliminates databases and manual app-store dashboards. Your Git repository is the **single source of truth**. Once you add `.vibtools/apps/app.config.json` to your repository and paste your GitHub repository URL into `registry.json`, `apps.vib.tools` and `get.vib.tools` automatically collect, validate, cache, and publish your app.

### Quick A–Z Step Matrix (What Each Step Does, Purpose & Usage)

| Step | Action / File | What It Does (Task) | Purpose (Why Needed) | How To Use |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Create `.vibtools/apps/` | Isolates all marketplace configs, installers & docs in one folder. | Keeps release metadata clean and separate from source code. | Place at the root of your application's GitHub repository. |
| **2** | Author `app.config.json` | Defines app metadata, versions, binary URLs, hashes & docs paths. | Powers catalog cards, detail view, version picker & routing. | Lock `"schemaVersion": 1` and `"$schema"` for IDE & edge checks. |
| **3** | Author `installer.ps1` | Downloads and executes the target version binary in PowerShell. | Enables one-command CLI install via `get.vib.tools/<slug>`. | Use injected `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` variables. |
| **4** | Per-Version `installer` | Overrides root installer strictly for a specific version entry. | Lets legacy or beta versions run custom or R2-hosted scripts. | Set `versions.<ver>.installer` to repo path or trusted `https://` URL. |
| **5** | Author `features.md` & `changelog.md` | Stores product highlights and reverse-chronological release notes. | Populates sanitized **Features** and **Changelog** tabs in UI. | Write clean Markdown (zero raw `<script>`/unsafe HTML). |
| **6** | Register URL in `registry.json` | Adds `"https://github.com/owner/repo"` to `vib-apps-hub`. | Connects your repo to the live auto-collection edge pipeline. | Paste repo URL only; `slug` and versions auto-discover in <=5m. |

### End-to-End Auto-Collection Flow
```text
1. registry.json entry: "https://github.com/owner/my-app"
        │
        ▼  parseRepoIdentifier() + getRegistry() (deduplicated by repo@branch)
2. Canonical Repo: owner/my-app (branch: "main")
        │
        ▼  fetchAppConfig() via GitHub Contents API (+ 300s Edge Cache)
3. Fetches .vibtools/apps/app.config.json (404 fallback: .vibtools/app.config.json)
        │
        ▼  validateAppConfig() (Frozen v1 strict rules -> 422 on mismatch)
4. Auto-discovers slug, metadata, versions, docs, and installers:
   ├── apps.vib.tools/api/apps               -> Deduplicated catalog cards & category counts
   ├── apps.vib.tools/api/apps?slug=<slug>   -> Full metadata + features.md + changelog.md
   ├── get.vib.tools/<slug>[/<version>]      -> Streams version's installer script + injected vars
   └── get.vib.tools/dl/<slug>[/<version>]   -> 302 redirect to verified HTTPS binary URL
```

Even if your GitHub repository name differs from your app `slug` (for example, repo `my-org/calgrid-desktop` with `"slug": "calgrid"`), `resolveAppBySlug()` automatically discovers the match from `app.config.json` without requiring a manual `slug` entry in `registry.json`.

---

## 2. Directory Structure Inside Your App Repository

**Purpose:** Keeps all marketplace metadata, scripts, and release docs isolated inside one clean folder without cluttering your application source code.

```text
<your-app-repository>/
└── .vibtools/
    └── apps/
        ├── app.config.json        # REQUIRED: Frozen v1 manifest (metadata + versions)
        ├── installer.ps1          # Default PowerShell installer (optional if using HTTPS URL)
        ├── features.md            # Rendered in the "Features & Overview" tab
        ├── changelog.md           # Rendered in the "Release Changelog" tab
        └── installers/            # Optional: per-version legacy or specialized scripts
            └── v1.0.0.ps1
```

### Backward-Compatible Fallbacks
- **Manifest:** `.vibtools/apps/app.config.json` -> on 404, checks `.vibtools/app.config.json`.
- **Default Installer:** `.vibtools/apps/installer.ps1` -> `.vibtools/installer.ps1` -> `.vibtools/install.ps1`.
- **Bare Doc Filenames:** `"features.md"` checks `.vibtools/apps/features.md` first, then `.vibtools/features.md`. If `docs` is omitted completely, the engine still attempts `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md`.

---

## 3. Level 1 (Basic): Minimal 2-Minute App Setup

**When to use:** Quickly publishing a single-version app with zero unnecessary fields.

1. Create `.vibtools/apps/app.config.json`:
   ```json
   {
     "$schema": "https://apps.vib.tools/schemas/vibtools-app.schema.json",
     "schemaVersion": 1,
     "slug": "quicknote",
     "name": "QuickNote",
     "latest": "v1.0.0",
     "versions": {
       "v1.0.0": {
         "url": "https://dl.vib.tools/quicknote/v1.0.0/QuickNote-1.0.0.exe"
       }
     }
   }
   ```
2. Create `.vibtools/apps/installer.ps1` (see [Section 7](#7-writing-the-powershell-installer-script)).
3. Add `"https://github.com/<owner>/quicknote"` to `registry.json` in `vib-apps-hub`.

**Result:** Your app immediately gets a catalog card (with a clean `QN` monogram fallback), a detail page at `/app/quicknote`, a direct download redirect at `https://get.vib.tools/dl/quicknote`, and a one-line installer at `irm "https://get.vib.tools/quicknote" | iex`.

---

## 4. Level 2 (Standard): Complete Production Storefront Listing

**When to use:** Production releases with icon, category filtering, SHA256 verification, release dates, platform cues, and Markdown documentation tabs.

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
  "platforms": ["Windows 10/11"],
  "architectures": ["x64"],
  "requirements": [
    "Windows 10 / Windows 11 (64-bit)",
    "PowerShell 5.1 or PowerShell 7+"
  ],
  "links": {
    "docs": "https://docs.vib.tools/calgrid",
    "source": "https://github.com/vib-tools/calgrid"
  },
  "versions": {
    "v1.0.3": {
      "url": "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe",
      "size": "42.8 MB",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "released_at": "2026-11-15",
      "channel": "stable"
    }
  }
}
```

---

## 5. Level 3 (Advanced): Multi-Version Control & Per-Version Installers

**Purpose:** Maintain complete version history, run beta previews alongside stable releases, deprecate old builds, and attach different installer scripts (either inside the repo OR hosted on R2 / GitHub Releases) to individual versions without breaking any other version.

### How Inheritance & Override Works
- **Root `installer`** acts as the shared default for all versions.
- **Version `installer`** (inside `versions.<ver>`) overrides the root installer **only for that version**.
- Both **repo-relative paths** (`.vibtools/apps/installers/v1.0.0.ps1`) and **trusted HTTPS URLs** (`https://dl.vib.tools/.../install.ps1` or `https://raw.githubusercontent.com/.../install.ps1`) are supported.

### Releasing a New Version (30-Second Workflow)
1. Upload the new binary to Cloudflare R2 (`dl.vib.tools`) or GitHub Releases.
2. Compute its SHA256 hash (`(Get-FileHash .\Setup.exe -Algorithm SHA256).Hash.ToLower()`).
3. Add a new 5-line version entry at the top of `versions` and update `"latest"`.
4. Commit & push — Cloudflare Edge updates within 5 minutes (300s TTL).

### Advanced Multi-Version Example
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
  "latest": "v1.1.0",
  "installer": {
    "type": "powershell",
    "script": ".vibtools/apps/installer.ps1"
  },
  "docs": {
    "features": ".vibtools/apps/features.md",
    "changelog": ".vibtools/apps/changelog.md"
  },
  "versions": {
    "v1.2.0-beta.1": {
      "url": "https://dl.vib.tools/calgrid/v1.2.0-beta.1/CalGrid-Setup-1.2.0-beta.1.exe",
      "size": "44.1 MB",
      "sha256": "1111111111111111111111111111111111111111111111111111111111111111",
      "released_at": "2026-11-20",
      "channel": "beta"
    },
    "v1.1.0": {
      "url": "https://dl.vib.tools/calgrid/v1.1.0/CalGrid-Setup-1.1.0.exe",
      "size": "43.2 MB",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "released_at": "2026-11-15",
      "channel": "stable"
    },
    "v1.0.2": {
      "url": "https://dl.vib.tools/calgrid/v1.0.2/CalGrid-Setup-1.0.2.exe",
      "installer": "https://dl.vib.tools/calgrid/v1.0.2/install-legacy.ps1",
      "size": "41.5 MB",
      "sha256": "9f83c605d4c82c3dd9e3b909c29fca53ca74c70284c717ec010746ff79c57c4c",
      "released_at": "2026-10-28",
      "deprecated": true
    },
    "v1.0.0": {
      "url": "https://github.com/vib-tools/calgrid/releases/download/v1.0.0/CalGrid-1.0.0.zip",
      "installer": {
        "type": "powershell",
        "script": ".vibtools/apps/installers/v1.0.0.ps1"
      },
      "size": "39.0 MB",
      "released_at": "2026-09-12",
      "deprecated": true
    }
  }
}
```

How `get.vib.tools` routes each version above:
- `irm "https://get.vib.tools/calgrid" | iex` -> runs `.vibtools/apps/installer.ps1` with `$APP_VERSION = "v1.1.0"`.
- `irm "https://get.vib.tools/calgrid/v1.2.0-beta.1" | iex` -> runs `.vibtools/apps/installer.ps1` with `$APP_VERSION = "v1.2.0-beta.1"`.
- `irm "https://get.vib.tools/calgrid/v1.0.2" | iex` -> fetches & streams `https://dl.vib.tools/calgrid/v1.0.2/install-legacy.ps1` with `$APP_VERSION = "v1.0.2"`.
- `irm "https://get.vib.tools/calgrid/v1.0.0" | iex` -> fetches & streams `.vibtools/apps/installers/v1.0.0.ps1` with `$APP_VERSION = "v1.0.0"`.

---

## 6. Complete Field-by-Field Reference (Purpose, Rules & Usage)

### Root Properties (`additionalProperties: false`)

| Field | Required | Type / Rule | Purpose & Where It Appears |
| :--- | :---: | :--- | :--- |
| `$schema` | Recommended | `https://apps.vib.tools/schemas/vibtools-app.schema.json` | Enables instant VS Code / IDE autocomplete and schema error checking. |
| `schemaVersion` | Recommended | `1` (exact integer) | Locks strict Frozen v1 validation in `validateAppConfig()`. |
| `slug` | **Yes** | `^[a-z0-9][a-z0-9-_]{0,63}$` | Permanent URL identifier for `/app/<slug>` and `get.vib.tools/<slug>`. |
| `name` | **Yes** | `string` (1–80 chars) | App title on catalog cards, detail header, browser tab, and `$APP_NAME`. |
| `latest` | **Yes** | Exact key in `versions` | Default version selected in UI, `/dl/<slug>`, and `get.vib.tools/<slug>`. |
| `versions` | **Yes** | Non-empty map (`^[vV]?[0-9]...`) | Complete version catalog (download URLs, sizes, checksums, per-version installers). |
| `tagline` | No | `string` (1–160 chars) | Short 1-line summary on catalog cards and app detail header. |
| `category` | No | `string` (1–48 chars) | Groups the app into dynamic sidebar categories and `/category/<name>` views. |
| `access` | No | `"Free" \| "Paid"` | Renders access badge and activates the catalog Free/Paid filter. |
| `icon` | No | `https://...` URL | App icon on cards and detail page (falls back to 2-letter monogram if omitted). |
| `installer` | No | `string \| { type?, script }` | Shared default installer script (repo path or trusted `https://` URL). |
| `docs` | No | `{ features?, changelog? }` | Repo-relative Markdown paths rendered in sanitized ARIA tabs. |
| `platforms` | No | `string[]` (unique) | Read-only OS specification row on `/app/<slug>` (e.g. `["Windows 10/11"]`). |
| `architectures` | No | `string[]` (unique) | Read-only CPU architecture row on `/app/<slug>` (e.g. `["x64", "arm64"]`). |
| `requirements` | No | `string[] \| Record<string, string>` | Renders a structured **System Requirements** card on `/app/<slug>`. |
| `screenshots` | No | `(https:// \| { url, alt? })[]` | Renders a lazy-loaded **Screenshots** gallery card on `/app/<slug>`. |
| `links` | No | `Record<string, https://>` | Renders external buttons under **Resources & Links** in the detail sidebar. |

### Version Release Properties (`versions.<key>`, `additionalProperties: false`)

| Field | Required | Type / Rule | Purpose & Where It Appears |
| :--- | :---: | :--- | :--- |
| `url` | **Yes** | Trusted `https://` URL | Target for `302` redirect on `get.vib.tools/dl/<slug>/<version>`; file extension derives package badge (`EXE`, `MSI`, `ZIP`, etc.). |
| `installer` | No | `string \| { type?, script }` | Overrides root `installer` strictly for this version (safe repo path without `..`, or trusted `https://` URL). |
| `size` | No | `string` (1–32 chars) | Displayed in the **File Size** metadata row (e.g. `"42.8 MB"`). |
| `sha256` | No | `^[a-fA-F0-9]{64}$` | Displayed in the **SHA256** row with **Full/Hide** toggle and one-click copy. |
| `released_at` | No | Calendar-valid `YYYY-MM-DD` | Formatted in UTC (`Nov 15, 2026`) in the version selector and **Released** row (impossible dates like `2026-02-31` return `422`). |
| `channel` | No | `"stable" \| "beta" \| "alpha"` | Shows `[beta]` or `[alpha]` tag in the version selector when non-stable. |
| `deprecated` | No | `boolean` | Shows `(deprecated)` tag in the version selector for legacy releases. |

---

## 7. Writing the PowerShell Installer Script

**Purpose:** Provides a reliable, zero-click terminal installation experience via `irm "https://get.vib.tools/<slug>" | iex`.

`get.vib.tools` automatically prepends three sanitized variables at the top of the streamed script:
```powershell
$APP_SLUG = "calgrid"
$APP_VERSION = "v1.1.0"
$APP_NAME = "CalGrid"
```

### Best-Practice Template (`.vibtools/apps/installer.ps1`)
```powershell
$ErrorActionPreference = "Stop"

# Fallback defaults if executed directly outside get.vib.tools
if (-not $APP_SLUG) { $APP_SLUG = "calgrid" }
if (-not $APP_VERSION) { $APP_VERSION = "v1.1.0" }
if (-not $APP_NAME) { $APP_NAME = "CalGrid" }

$DownloadUrl = "https://get.vib.tools/dl/$APP_SLUG/$APP_VERSION"
$TempFile = Join-Path $env:TEMP "$APP_SLUG-$APP_VERSION-setup.exe"

Write-Host "==> Downloading $APP_NAME ($APP_VERSION)..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempFile -UseBasicParsing
    $Hash = (Get-FileHash -Path $TempFile -Algorithm SHA256).Hash.ToLower()
    Write-Host "==> SHA256: $Hash" -ForegroundColor DarkGray
    Write-Host "==> Launching installer..." -ForegroundColor Green
    Start-Process -FilePath $TempFile -Wait
} catch {
    Write-Error "Failed to install $APP_NAME ($APP_VERSION): $_"
    exit 1
} finally {
    if (Test-Path $TempFile) {
        Remove-Item -Path $TempFile -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "==> $APP_NAME ($APP_VERSION) installation complete." -ForegroundColor Green
```

---

## 8. Writing Features & Changelog Markdown Docs

**Purpose:** Renders clean, XSS-sanitized (`Marked.js` + `DOMPurify`) documentation tabs on `apps.vib.tools/app/<slug>`.

- **`.vibtools/apps/features.md`:** Start with `# <App Name>`, followed by a concise overview, `## Key Highlights` bullets, and `## Quick Usage` or `## System Requirements`.
- **`.vibtools/apps/changelog.md`:** Order newest version first (`## v1.1.0 (2026-11-15)`), grouping bullet points by Added / Changed / Fixed.
- **Safety Rule:** Avoid raw `<script>`, `<iframe>`, or inline CSS — DOMPurify strips unsafe HTML automatically.

---

## 9. Registering Your Repository in `registry.json`

**Purpose:** Tells `vib-apps-hub` which GitHub repositories to auto-collect from.

### Simplest Form (Recommended — Paste GitHub URL Only)
```json
[
  "https://github.com/vib-tools/calgrid",
  "https://github.com/vib-tools/devprompt"
]
```

### Supported Formats in `registry.json`
- Full HTTPS URL: `"https://github.com/owner/repo"` (or `.git`)
- Branch-pinned URL: `"https://github.com/owner/repo/tree/release"`
- Shorthand: `"owner/repo"`
- Object with overrides:
  ```json
  {
    "repo": "https://github.com/owner/repo",
    "branch": "main",
    "featured": true
  }
  ```

Duplicate `repo@branch` entries are automatically deduplicated by `getRegistry()`.

---

## 10. Security, Trusted Hosts & Edge Caching Rules

- **Private Repositories:** Supported automatically when `GITHUB_TOKEN` (fine-grained PAT with `Contents: Read-only`) is configured as a Cloudflare Pages secret. The token never leaves the edge worker.
- **Trusted Binary Hosts (`/dl/`):** Only `https://` URLs on `dl.vib.tools`, `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, or custom hosts listed in `env.ALLOWED_DOWNLOAD_HOSTS` are permitted (untrusted URLs return `403`).
- **Trusted Remote Installer Hosts:** All binary hosts above **plus** `raw.githubusercontent.com` (untrusted URLs return `403`).
- **Directory Traversal Protection:** Any path containing `..` (raw or URL-encoded) is rejected with `400`.
- **Edge Caching:** Live GitHub files, catalog JSON, and single-app details cache for `300s` (5 minutes) via Cloudflare Cache API (`caches.default`). Mock/empty responses are never cached (`Cache-Control: no-store`).

---

## 11. Troubleshooting & Common Mistakes

| Symptom | Root Cause | Fix |
| :--- | :--- | :--- |
| App does not appear in `/api/apps` | `app.config.json` failed `validateAppConfig()` (`422`) or repo returned `404`/`403`. | Check exact allowed keys, lowercase `slug`, exact `latest` key match, and `GITHUB_TOKEN` for private repos. |
| `422: Unknown properties in versions.v1.0.0: releaseDate` | Used `releaseDate` instead of frozen field name `released_at`. | Rename `releaseDate` -> `released_at` with `"YYYY-MM-DD"` value. |
| `422: Latest version '1.0.3' must match an exact key in versions` | `latest` is `"1.0.3"` while `versions` key is `"v1.0.3"`. | Make `"latest"` match the exact key string (`"v1.0.3"`). |
| `403: Untrusted or invalid download URL` | Binary or remote installer URL uses `http://` or an unapproved domain. | Host on `dl.vib.tools` / GitHub Releases (`https://`), or add domain to `ALLOWED_DOWNLOAD_HOSTS`. |
| Docs tabs missing on `/app/<slug>` | `features.md` / `changelog.md` path typo or missing file. | Place files at `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md`. |

---

## 12. 12-Point Self-Verification Checklist

1. `.vibtools/apps/app.config.json` is valid UTF-8 JSON (zero comments or trailing commas).
2. `"$schema"` is `"https://apps.vib.tools/schemas/vibtools-app.schema.json"` and `"schemaVersion"` is `1`.
3. Zero unrecognized properties exist on root or any version object (`additionalProperties: false`).
4. `"slug"` is strictly lowercase (`^[a-z0-9][a-z0-9-_]{0,63}$`) and `"name"` is 1–80 chars.
5. `"latest"` matches an exact key inside `"versions"`.
6. Every key in `"versions"` starts with a digit after optional `v` (`^[vV]?[0-9][0-9A-Za-z._+-]{0,47}$`).
7. Every version `"url"` starts with `https://` on a trusted host.
8. Every `"released_at"` uses strict `"YYYY-MM-DD"` format.
9. Every `"sha256"` (if present) is an exact 64-character hexadecimal string.
10. Root `"installer"` and any per-version `"installer"` overrides point to valid repo files or trusted `https://` URLs.
11. PowerShell scripts consume `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` dynamically.
12. `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` exist with clean Markdown headings and zero raw unsafe HTML.
