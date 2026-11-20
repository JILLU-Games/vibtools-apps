---
title: "App Onboarding & Frozen .vibtools Schema (v1)"
description: "Complete A-Z onboarding guide covering Frozen Schema v1 (.vibtools/apps/app.config.json), zero-config GitHub URL registry, per-version installers, and AI-readable specs."
order: 3
draft: false
---

# App Onboarding & Frozen `.vibtools/` Schema (v1)

Applications are onboarded into `vib-apps-hub` purely through Git metadata—no database migrations or admin UI are required. Simply add `.vibtools/apps/app.config.json` inside your repository and paste your GitHub repository URL into `registry.json`.

> **Public Machine-Readable Specifications (CORS `*`):**
> - Frozen JSON Schema (Draft 2020-12): `https://apps.vib.tools/schemas/vibtools-app.schema.json`
> - Root AI Discovery Index: `https://apps.vib.tools/llms.txt`
> - Compact AI Agent Spec: `https://apps.vib.tools/vib-apps-engine/llms.txt`
> - Complete A–Z Setup Guide: `https://apps.vib.tools/vib-apps-engine/vibtools-app-config.md`
> - AI Execution Playbook & Prompt: `https://apps.vib.tools/vib-apps-engine/ai-guide.md`

---

## 1. Repository Directory Layout

Place metadata, installer scripts, and Markdown docs inside `.vibtools/apps/` at the root of your application repository:

```text
<app-repo>/
└── .vibtools/
    └── apps/
        ├── app.config.json    # Required Frozen v1 manifest (404 fallback: .vibtools/app.config.json)
        ├── installer.ps1      # Default PowerShell installer (404 fallback: .vibtools/installer.ps1 -> install.ps1)
        ├── features.md        # Features & Overview Markdown tab
        ├── changelog.md       # Release Changelog Markdown tab
        └── installers/        # Optional per-version installer scripts
            └── v1.0.0.ps1
```

Path resolution rules implemented in `functions/_lib/github.js`:
- `fetchAppConfig()` checks `.vibtools/apps/app.config.json` first, falling back to `.vibtools/app.config.json` on `404`.
- `fetchAppInstaller()` checks `versions[ver].installer` first (per-version override), then root `config.installer`, then `.vibtools/apps/installer.ps1` -> `.vibtools/installer.ps1` -> `.vibtools/install.ps1`. Both repo-relative paths and trusted `https://` URLs (`dl.vib.tools`, `github.com`, `raw.githubusercontent.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, or `ALLOWED_DOWNLOAD_HOSTS`) are supported.
- `fetchAppDoc()` reads `config.docs.features` / `config.docs.changelog` (defaulting to `"features.md"` and `"changelog.md"`). Bare filenames resolve in `.vibtools/apps/` first, then `.vibtools/`.

---

## 2. Frozen `app.config.json` Field Specification (`schemaVersion: 1`)

When `"schemaVersion": 1` is declared, both `public/schemas/vibtools-app.schema.json` and `validateAppConfig()` enforce `additionalProperties: false` on root and version objects, strictly lowercase `slug`, exact `latest` key matching, HTTPS URLs, ISO `YYYY-MM-DD` dates, and 64-char hex SHA256 hashes.

| Field | Required | Type | Consumed By | Purpose & Notes |
| :--- | :---: | :--- | :--- | :--- |
| `$schema` | Recommended | `https://...` | IDEs / AI Agents | Canonical schema URI (`https://apps.vib.tools/schemas/vibtools-app.schema.json`). |
| `schemaVersion` | Recommended | `1` | `validateAppConfig()` | Activates strict Frozen v1 schema enforcement. |
| `slug` | **Yes** | `^[a-z0-9][a-z0-9-_]{0,63}$` | `github.js`, `[[path]].js`, UI | Permanent URL slug (`/app/<slug>`, `get.vib.tools/<slug>`). Lowercase in v1. |
| `name` | **Yes** | `string` (1–80 chars) | UI, `[[path]].js` | Display title, browser `<title>`, and injected `$APP_NAME`. |
| `latest` | **Yes** | Exact key in `versions` | `github.js`, `[[path]].js`, UI | Default release for storefront, `/dl/<slug>`, and `get.vib.tools/<slug>`. |
| `versions` | **Yes** | Non-empty map | `github.js`, `[[path]].js`, UI | Keys must match `^[vV]?[0-9][0-9A-Za-z._+-]{0,47}$`. |
| `tagline` | No | `string` (max 160) | `AppGrid.js`, `AppDetailView.js` | Concise summary displayed on cards and detail header. |
| `category` | No | `string` (max 48) | `Sidebar.js`, `computeCategoryCounts()` | Drives dynamic sidebar categories and `/category/:name`. |
| `access` | No | `"Free" \| "Paid"` | `AppGrid.js`, `AppDetailView.js` | Access badge and Free/Paid catalog filter. |
| `icon` | No | `https://...` | `AppGrid.js`, `AppDetailView.js` | Direct icon URL (falls back to 2-letter monogram). |
| `installer` | No | `string \| { type?, script }` | `github.js`, `AppDetailView.js` | Shared default installer path or trusted `https://` script URL. |
| `docs` | No | `{ features?, changelog? }` | `api/apps.js`, `github.js` | Repo-relative Markdown paths for ARIA documentation tabs. |
| `platforms` | No | `string[]` | `AppDetailView.js` | Renders read-only **Platforms** specification row on `/app/:slug`. |
| `architectures` | No | `string[]` | `AppDetailView.js` | Renders read-only **Architecture** specification row on `/app/:slug`. |
| `screenshots` | No | `(https:// \| { url, alt? })[]` | `AppDetailView.js` | Renders lazy-loaded **Screenshots** gallery (strictly `https://`). |
| `requirements` | No | `string[] \| Record<string, string>` | `AppDetailView.js` | Renders structured **System Requirements** card. |
| `links` | No | `Record<string, https://>` | `AppDetailView.js` | Renders external buttons under **Resources & Links**. |

### Version Object (`versions.<versionKey>`)

| Field | Required | Type | Description |
| :--- | :---: | :--- | :--- |
| `url` | **Yes** | Trusted `https://` URL | Direct binary download target for `/dl/<slug>/<ver>` (validated by `isTrustedDownloadUrl()`). |
| `installer` | No | `string \| { type?, script }` | Optional **per-version installer override** (repo path or trusted `https://` URL). |
| `size` | No | `string` (max 32) | Human-readable file size (e.g. `"42.8 MB"`). |
| `sha256` | No | `^[a-fA-F0-9]{64}$` | 64-char hex checksum displayed with **Full/Hide** toggle and copy button. |
| `released_at` | No | `YYYY-MM-DD` | Strict UTC ISO release date formatted via `formatReleaseDate()`. |
| `channel` | No | `"stable" \| "beta" \| "alpha"` | Shows `[beta]` / `[alpha]` tag in the version dropdown when non-stable. |
| `deprecated` | No | `boolean` | Shows `(deprecated)` tag in the version dropdown when `true`. |

---

## 3. PowerShell Installer Contract

When serving `GET https://get.vib.tools/<slug>` or `GET https://get.vib.tools/<slug>/<version>`, `functions/[[path]].js` resolves the concrete target version, selects `versions[version].installer` (or root `installer`), and prepends **three** sanitized PowerShell variables (CRLF):

```powershell
$APP_SLUG = "calgrid"
$APP_VERSION = "v1.0.3"
$APP_NAME = "CalGrid"
```

---

## 4. Zero-Config Registration in `registry.json`

Paste only the GitHub repository URL into root `registry.json` in `vib-apps-hub`:

```json
[
  "https://github.com/vib-tools/calgrid",
  "https://github.com/vib-tools/devprompt"
]
```

Supported entry forms (deduplicated automatically by `repo@branch` in `getRegistry()`):
- `"https://github.com/owner/repo"` (or `.git` / `/tree/<branch>`)
- `"owner/repo"`
- `{ "repo": "https://github.com/owner/repo", "branch": "main", "featured": true, "slug": "optional-override" }`

When `slug` is omitted, `resolveAppBySlug()` automatically discovers the app's `slug` from `.vibtools/apps/app.config.json`.

## Related Guides

- [Store API & Edge Routing Reference](./04-api-and-edge-routing.md)
- [Security, Validation & Audited Findings](./05-security-and-validation.md)
- [Local Setup & Cloudflare Deployment](./06-local-setup-and-deployment.md)
