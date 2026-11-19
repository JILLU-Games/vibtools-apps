# Production Deployment & Operation Guide

> **Target Systems:** Cloudflare Pages, Cloudflare Pages Functions, Cloudflare R2  
> **Hostnames:** `apps.vib.tools` (Web Catalog SPA), `get.vib.tools` (CLI Quickstart & Streamer), `dl.vib.tools` (Binary Storage)  
> **Status:** Production Ready

---

## 1. System Overview

`vib-apps-hub` runs as a unified, zero-build Cloudflare Pages application backed by Pages Functions (Workers runtime). A single deployment serves both the visual web store and the command-line installation engine:

```text
                  ┌──────────────────────┐
                  │ Cloudflare Pages Hub │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   apps.vib.tools                      get.vib.tools
 (Web Catalog SPA)              (CLI Streamer & Downloads)
        │                                     │
        ▼                                     ▼
Static Assets (`public/`)           Pages Function (`[[path]].js`)
  + API (`/api/apps`)                         │
        │                                     ├── irm get.vib.tools -> CLI Manual
        ▼                                     ├── irm get.vib.tools/<slug> -> install.ps1
  GitHub API Cache                            └── get.vib.tools/dl/<slug> -> 302 to R2
(Private Repos: `.vibtools/`)                         │
                                                      ▼
                                                dl.vib.tools
                                           (Cloudflare R2 Storage)
```

---

## 2. Cloudflare Pages Project Setup

### A. Create Project via Cloudflare Dashboard
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select the `apps.vib.tools` repository (`vib-apps-hub`).
3. Configure the **Build Settings**:
   - **Framework preset:** `None`
   - **Build command:** *(Leave empty / blank)*
   - **Build output directory:** `public`
   - **Root directory:** `/`
4. Click **Save and Deploy**.

### B. Compatibility Date
Ensure the project uses compatibility date `2026-09-04` (as specified in `wrangler.toml`). If deploying via Wrangler CLI:
```bash
npx wrangler pages deploy public --project-name=vib-apps-hub --compatibility-date=2026-09-04
```

---

## 3. Environment Variables & Secrets

The backend Pages Functions require a GitHub Personal Access Token to access `.vibtools/` metadata and `install.ps1` scripts from private repositories.

### Required Secret: `GITHUB_TOKEN`
- **Scope required:** `repo` (Full control of private repositories) or a fine-grained token with **Read access to metadata and contents** across your organization's app repositories.

### Setting the Secret:
#### Method 1: Cloudflare Dashboard
1. Go to your Pages project: **Settings** > **Environment variables**.
2. Under **Production**, click **Add variable**.
3. Variable name: `GITHUB_TOKEN`
4. Value: `<your-github-pat>`
5. Click **Encrypt** and **Save**.

#### Method 2: Wrangler CLI
```bash
npx wrangler pages secret put GITHUB_TOKEN --project-name=vib-apps-hub
```

> **Security Note:** `GITHUB_TOKEN` is strictly isolated within the server-side Cloudflare Pages Functions runtime (`functions/_lib/github.js`). It is never returned in client JSON responses, never exposed in client bundles, and never printed to browser logs.

---

## 4. Custom Domain Configuration

A single Pages project handles both public hostnames via Cloudflare's edge DNS:

1. In the Pages project dashboard, open the **Custom domains** tab.
2. Click **Set up a custom domain** and add:
   - `apps.vib.tools` (Primary web catalog UI)
3. Click **Set up a custom domain** again and add:
   - `get.vib.tools` (CLI installer & binary redirect domain)
4. Cloudflare automatically provisions edge SSL/TLS certificates and configures DNS CNAME records for both domains.

---

## 5. Cloudflare R2 Binary Storage (`dl.vib.tools`)

All compiled desktop binaries (`.zip`, `.exe`, `.msi`, `.dmg`) are hosted on Cloudflare R2 to eliminate GitHub Release limits and bandwidth costs.

### A. Create R2 Bucket
1. Navigate to **R2** > **Create bucket**.
2. Name: `vib-tools-binaries`.
3. Connect a custom domain: `dl.vib.tools`.

### B. Recommended Directory Structure in R2
```text
dl.vib.tools/
├── <app-slug>/
│   ├── <semver>/
│   │   ├── <app-slug>-<version>-windows-x64.zip
│   │   ├── <app-slug>-<version>-windows-x64.exe
│   │   └── SHA256SUMS.txt
│   └── latest/
│       └── <app-slug>-latest-windows-x64.zip
```

### C. Download URL Mapping
In `.vibtools/app.config.json`, configure the download links targeting this bucket:
```json
{
  "downloads": {
    "windows": {
      "x64": "https://dl.vib.tools/my-app/1.2.0/my-app-1.2.0-windows-x64.zip"
    }
  }
}
```

The edge router at `get.vib.tools/dl/<slug>` will automatically issue a `302 Found` redirect to this URL.

---

## 6. Onboarding a New Application (Checklist)

To publish a new private or paid app on `apps.vib.tools` and `get.vib.tools`, complete these 4 steps:

### Step 1: Prepare `.vibtools/` in App Repository
Inside the application's GitHub repository (`vib-tools/<app-slug>`), create the `.vibtools/` folder:
- **`app.config.json`**: App metadata, category, version, and download links. (See [`docs/app-config-schema.md`](./app-config-schema.md))
- **`install.ps1`**: PowerShell installation script. Can use placeholders `$APP_SLUG`, `$APP_NAME`, `$APP_VERSION`, `$DOWNLOAD_URL`.
- **`features.md`**: Markdown detailing features, hotkeys, and system requirements.
- **`changelog.md`**: Markdown release notes per version.

### Step 2: Upload Binaries to R2
Upload the compiled binaries to `https://dl.vib.tools/<app-slug>/<version>/...`. Ensure the SHA256 hash in `app.config.json` matches the binary hash:
```powershell
Get-FileHash -Algorithm SHA256 ./my-app-1.0.0-windows-x64.zip
```

### Step 3: Register App in `registry.json`
Add the app entry to `registry.json` in the root of `vib-apps-hub`:
```json
{
  "slug": "my-app",
  "name": "My App Name",
  "category": "developer-tools",
  "repo": "vib-tools/my-app",
  "branch": "main",
  "tier": "free",
  "featured": true
}
```

### Step 4: Deploy Updates
Commit and push the changes to GitHub. Cloudflare Pages will automatically deploy the updated catalog:
```bash
git add registry.json
git commit -m "feat(registry): onboard my-app"
git push origin main
```
The edge cache automatically invalidates within 5 minutes (`s-maxage=300`), after which the app appears live on `apps.vib.tools` and is installable via:
```powershell
irm get.vib.tools/my-app | iex
```

---

## 7. Operational Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| Catalog returns `[]` empty list | Missing or invalid `GITHUB_TOKEN` | Verify `GITHUB_TOKEN` is set in Pages project settings with `repo` scope. |
| `404 App '<slug>' not found` | Slug is not in `registry.json` or typo in URL | Check `registry.json` spelling. Slugs are case-insensitive. |
| `502 Bad Gateway` on `/api/apps?slug=...` | GitHub API rate limit or `.vibtools/app.config.json` is missing | Check Pages function logs in Cloudflare Dashboard; verify `.vibtools/` directory exists in the target repository. |
| SPA reload returns 404 | Missing SPA fallback handling | Verify `functions/[[path]].js` is active and serves `env.ASSETS.fetch("/index.html")` for 404 HTML routes. |
| Direct download fails | Missing or malformed `downloads` URL | Ensure `downloads.windows.x64` in `app.config.json` points to an active R2 object on `dl.vib.tools`. |
