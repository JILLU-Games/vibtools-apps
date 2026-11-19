# vib-apps-hub (`apps.vib.tools` & `get.vib.tools`)

A single, zero-maintenance, config-driven static and edge web platform hosted on Cloudflare Pages and Pages Functions.

`vib-apps-hub` powers two domains from a single codebase:
1. **`apps.vib.tools`** — Central App Store & Catalog UI: Instant search, category/access filters, version picker, SHA256 copy, and rendered changelogs.
2. **`get.vib.tools`** — Edge CLI & Direct Download Router: Edge Worker serving dynamic PowerShell installer scripts and 302 redirects to binaries stored on Cloudflare R2 (`dl.vib.tools`).

---

## ⚡ Quick Usage

### 1. PowerShell One-Line Installation

Install the latest version of any app:
```powershell
irm "https://get.vib.tools/calgrid" | iex
```

Install a specific pinned version:
```powershell
irm "https://get.vib.tools/calgrid/v1.0.3" | iex
```

### 2. Direct Binary Downloads

Download the latest installer directly via browser or curl (returns a `302 Found` redirect to Cloudflare R2):
```text
https://get.vib.tools/dl/calgrid
```

Download a specific pinned version:
```text
https://get.vib.tools/dl/calgrid/v1.0.3
```

---

## 📦 Registering a New Application

To register an application into the hub, add an entry to [`registry.json`](file:///d:/VibTools_Workspace/14_Vib.Tools/apps.vib.tools/registry.json):

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

### Target Repo Requirement
The target repository must maintain a `.vibtools/` root directory containing:
- `.vibtools/apps/app.config.json` (metadata, versions, direct download URLs, SHA256 hashes)
- `.vibtools/installer.ps1` (PowerShell installer handling `$APP_VERSION`)
- `.vibtools/features.md` (Markdown features documentation)
- `.vibtools/changelog.md` (Markdown release history)

See [`docs/app-config-schema.md`](file:///d:/VibTools_Workspace/14_Vib.Tools/apps.vib.tools/docs/app-config-schema.md) for the complete schema specification and examples.

---

## 🔐 Environment Variables

For discovering metadata from private repositories via the GitHub REST API, `GITHUB_TOKEN` is required:

| Variable | Description |
| :--- | :--- |
| `GITHUB_TOKEN` | GitHub Personal Access Token (`repo` scope for private repos). Never exposed to the browser. |

- **Local Development:** Create `.dev.vars` in the project root:
  ```env
  GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
  ```
- **Production (Cloudflare Pages):** Set `GITHUB_TOKEN` under **Settings > Environment variables** in your Cloudflare Pages dashboard.

---

## 🛠️ Local Development

`vib-apps-hub` requires zero compilation, bundling, or build tools. Run locally using the Wrangler CLI:

```bash
npx wrangler pages dev
```

- Web UI will be accessible at `http://localhost:8788`.
- Pages functions will run locally at `http://localhost:8788/api/apps`.
