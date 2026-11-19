# Production Deployment & Operation Guide

> **Target Systems:** Cloudflare Pages, Cloudflare Pages Functions, Cloudflare R2  
> **Hostnames:** `apps.vib.tools` (Web Catalog SPA), `get.vib.tools` (Edge CLI & Download Router), `dl.vib.tools` (Binary Storage)  
> **Status:** Verified Against Live Code (`wrangler.toml`, `functions/`, `server.js`, `registry.json`)  
> **Related:** [Local Setup & Cloudflare Deployment](./dev/06-local-setup-and-deployment.md)

---

## 1. System Overview

`vib-apps-hub` runs as a unified, zero-build Cloudflare Pages application backed by Pages Functions (Workers runtime). A single deployment serves both the visual storefront and the edge installer router:

```text
                  ┌──────────────────────┐
                  │ Cloudflare Pages Hub │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   apps.vib.tools                      get.vib.tools
  (Web Catalog SPA)             (CLI Streamer & Downloads)
        │                                     │
        ▼                                     ▼
Static Assets (public/)             Pages Function ([[path]].js)
  + API (/api/apps)                           │
        │                                     ├── Browser HTML -> 302 to apps.vib.tools
        ▼                                     ├── CLI /        -> Plain-text usage manual
  GitHub Contents API                         ├── CLI /<slug>  -> .vibtools/installer.ps1
  + caches.default (300s)                     └── /dl/<slug>   -> 302 to versions.<ver>.url
  + mockData.js fallback                                              │
                                                                      ▼
                                                                dl.vib.tools
                                                           (Cloudflare R2 Storage)
```

---

## 2. Cloudflare Pages Project Setup

### A. Create Project via Cloudflare Dashboard
1. Log in to the Cloudflare Dashboard and navigate to **Workers & Pages → Create application → Pages → Connect to Git**.
2. Select the `vib-apps-hub` repository (`branch: main`).
3. Configure zero-build **Build Settings** matching `wrangler.toml`:
   - **Framework preset:** `None`
   - **Build command:** *(Leave blank)*
   - **Build output directory:** `public`
   - **Root directory:** `/`
4. Click **Save and Deploy**.

### B. Wrangler CLI Deployment
Ensure compatibility date `2026-09-04` (locked in `wrangler.toml`):

```bash
npx wrangler pages deploy public --project-name=vib-apps-hub --compatibility-date=2026-09-04
```

---

## 3. Environment Variables & Secrets

`functions/_lib/github.js` optionally authenticates with the GitHub REST API using `env.GITHUB_TOKEN` (required for private repositories and for avoiding GitHub's 60 req/hr unauthenticated rate limit).

### Required Secret (for Private Repos): `GITHUB_TOKEN`
- **Recommended Scope:** GitHub Fine-Grained Personal Access Token with **Contents: Read-only** across registered app repositories.

### Setting the Secret
- **Cloudflare Dashboard:** Pages project → **Settings → Environment variables** → add `GITHUB_TOKEN` as an **Encrypted** variable for Production and Preview, then redeploy.
- **Wrangler CLI:**
  ```bash
  npx wrangler pages secret put GITHUB_TOKEN --project-name=vib-apps-hub
  ```

> **Security Note:** `GITHUB_TOKEN` is strictly isolated in `functions/_lib/github.js`. It is never returned in API JSON responses or bundled into `public/`.

---

## 4. Dual Custom Domain Configuration

Attach both hostnames to the **same** Cloudflare Pages project under **Custom domains**:

1. `apps.vib.tools` — Serves the static catalog UI (`public/`) and `/api/apps`.
2. `get.vib.tools` — Intercepted by `functions/[[path]].js` to stream PowerShell installers and `302` direct binary redirects.

---

## 5. Cloudflare R2 Binary Storage (`dl.vib.tools`)

1. Navigate to **R2 → Create bucket** (e.g. `vib-tools-binaries`) and attach custom domain `dl.vib.tools`.
2. Organize artifacts consistently by slug and version:
   ```text
   dl.vib.tools/
   └── <app-slug>/
       ├── icon.png
       └── <version>/
           └── <installer-file>
   ```
3. Configure each release's direct `https://` download URL under `versions.<versionKey>.url` in `.vibtools/apps/app.config.json`:
   ```json
   {
     "latest": "v1.2.0",
     "versions": {
       "v1.2.0": {
         "url": "https://dl.vib.tools/my-app/v1.2.0/MyApp-Setup-1.2.0.exe",
         "size": "24.6 MB",
         "sha256": "<64-char-hex-sha256>",
         "released_at": "2026-11-15"
       }
     }
   }
   ```
   `get.vib.tools/dl/<slug>` and `get.vib.tools/dl/<slug>/<version>` validate that `url` starts with `https://` and return HTTP `302 Found` directly to that URL.

---

## 6. Onboarding a New Application (4-Step Checklist)

1. **Prepare `.vibtools/` in the app repository:**
   - `.vibtools/apps/app.config.json` — Manifest with required `slug`, `name`, `latest`, `versions` (see [`docs/app-config-schema.md`](./app-config-schema.md)).
   - `.vibtools/installer.ps1` — PowerShell installer consuming `$APP_SLUG` and `$APP_VERSION`.
   - `.vibtools/features.md` and `.vibtools/changelog.md` — Optional Markdown documentation.
2. **Upload binaries to R2 (`dl.vib.tools`):**
   Compute SHA256 before publishing:
   ```powershell
   Get-FileHash -Algorithm SHA256 .\MyApp-Setup-1.2.0.exe
   ```
3. **Register the repository in `registry.json`:**
   ```json
   {
     "slug": "my-app",
     "repo": "vib-tools/my-app",
     "branch": "main",
     "featured": true
   }
   ```
4. **Deploy updates:** Push to `main`. Edge caches (`Cache-Control: public, max-age=300`) refresh automatically within 5 minutes, after which the app is live on `apps.vib.tools` and installable via:
   ```powershell
   irm "https://get.vib.tools/my-app" | iex
   ```

---

## 7. Operational Troubleshooting

| Symptom | Verified Cause | Resolution |
| :--- | :--- | :--- |
| Catalog shows only 3 sample apps (`CalGrid`, `DevPrompt`, `VibClip`) | Zero live repositories resolved (missing `GITHUB_TOKEN`, placeholder `example-app`, or missing `.vibtools/apps/app.config.json`), activating `functions/_lib/mockData.js` fallback. | Register real repositories in `registry.json`, confirm `.vibtools/apps/app.config.json`, and configure `GITHUB_TOKEN` for private repos. |
| `404 Not Found` on `/api/apps?slug=<slug>` | Slug is absent from `registry.json` (and fallback catalog) or live repo fetch failed. | Verify `registry.json` entry and GitHub repository `.vibtools/apps/app.config.json`. |
| `502` on `get.vib.tools/<slug>` | App config loaded, but `fetchAppInstaller()` could not fetch `.vibtools/installer.ps1` (or fallback `.vibtools/install.ps1`). | Verify the installer file exists in the target repo and check `GITHUB_TOKEN` permissions. |
| SPA inner route reload returns `404` | `functions/[[path]].js` not deployed or bypassed. | Confirm `functions/[[path]].js` is active and serves `env.ASSETS.fetch("/index.html")` on extensionless non-`/api/` 404 routes. |
| Direct download `/dl/<slug>` returns `404` | Version key missing in `versions` or `versions.<ver>.url` does not start with `https://`. | Verify `versions.<ver>.url` in `.vibtools/apps/app.config.json`. |
