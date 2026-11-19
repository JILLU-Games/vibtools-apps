---
title: "Local Setup & Cloudflare Deployment"
description: "Run vib-apps-hub locally with Node.js 22 or Wrangler, deploy zero-build to Cloudflare Pages, isolate GITHUB_TOKEN, bind dual domains, and structure R2 binaries."
order: 6
draft: false
---

# Local Setup & Cloudflare Deployment

`vib-apps-hub` requires zero compilation or bundling in both development and production.

## 1. Local Development

### Prerequisites
- **Node.js 22+** (uses ES module JSON import attributes `with { type: "json" }`, native Fetch API, and `node:test`).
- *(Optional)* **Cloudflare Wrangler** via `npx wrangler` for Cloudflare-native local emulation.

### Option A: Built-In Node.js 22 Edge Emulator (`server.js`)

Start the local server on `http://0.0.0.0:3000`:

```bash
npm run dev
# or: npm start
# or: node server.js
```

`server.js` faithfully emulates:
- Static asset serving from `public/` (`serveStaticAsset`)
- In-memory Cloudflare Cache API (`globalThis.caches.default` with `max-age` TTL)
- `/api/apps` (`GET`, `HEAD`, `OPTIONS`)
- `functions/[[path]].js` wildcard routing including SPA fallback and `?mode=get`

Set a custom port with `PORT=8080 node server.js`, and optionally export `GITHUB_TOKEN` in your shell to query private repositories:

```bash
export GITHUB_TOKEN="ghp_your_read_only_token"
npm run dev
```

### Option B: Cloudflare Wrangler

```bash
npx wrangler pages dev public --port 8788
```

For Wrangler local secrets, create `.dev.vars` (gitignored) in the repository root:

```env
GITHUB_TOKEN=ghp_your_read_only_token
```

### Local Verification Commands

```bash
# Store API (Catalog Mode A & Detail Mode B)
curl http://localhost:3000/api/apps
curl "http://localhost:3000/api/apps?slug=calgrid"

# SPA Reload Fallback (200 OK HTML)
curl -I http://localhost:3000/app/calgrid

# get.vib.tools Edge Router Emulation (?mode=get)
curl "http://localhost:3000/?mode=get"
curl "http://localhost:3000/calgrid?mode=get"
curl "http://localhost:3000/calgrid/1.0.3?mode=get"
curl -I "http://localhost:3000/dl/calgrid/1.0.3?mode=get"
```

## 2. Production Deployment on Cloudflare Pages

### Dashboard Setup

1. Open **Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git**.
2. Select your `vib-apps-hub` GitHub repository (`branch: main`).
3. Configure zero-build settings matching `wrangler.toml`:

| Setting | Value |
| :--- | :--- |
| **Project name** | `vib-apps-hub` |
| **Framework preset** | `None` |
| **Build command** | *(leave empty)* |
| **Build output directory** | `public` |
| **Compatibility date** | `2026-09-04` |

### Wrangler Direct Deploy

```bash
npx wrangler pages deploy public --project-name=vib-apps-hub --compatibility-date=2026-09-04
```

## 3. Production Secret (`GITHUB_TOKEN`)

To access private application repositories and raise GitHub API rate limits beyond 60 req/hr:

1. Create a GitHub Fine-Grained Personal Access Token with **Contents: Read-only** access on target app repositories.
2. Add `GITHUB_TOKEN` as an **Encrypted** environment variable in **Pages Project → Settings → Environment variables** (Production & Preview), or run:
   ```bash
   npx wrangler pages secret put GITHUB_TOKEN --project-name=vib-apps-hub
   ```
3. Redeploy so Pages Functions pick up the new binding.

## 4. Dual Custom Domain Binding

Attach both custom domains to the **same** Cloudflare Pages project under **Custom domains**:

1. `apps.vib.tools` — Serves the static catalog UI (`public/`) and `/api/apps`.
2. `get.vib.tools` — Dispatched by `functions/[[path]].js` for PowerShell installers and `/dl/` 302 redirects.

## 5. Cloudflare R2 Binary Hosting (`dl.vib.tools`)

1. Create an R2 bucket (for example, `vib-tools-binaries`) and attach the custom domain `dl.vib.tools`.
2. Upload versioned artifacts and icons:
   ```text
   https://dl.vib.tools/<slug>/icon.png
   https://dl.vib.tools/<slug>/<version>/<installer-file>
   ```
3. Copy the exact `https://dl.vib.tools/...` URL and SHA256 hash (`Get-FileHash -Algorithm SHA256`) into each release entry under `versions.<version>` in `.vibtools/apps/app.config.json`.

## 6. Operational Troubleshooting

| Symptom | Verified Cause | Resolution |
| :--- | :--- | :--- |
| Only 3 sample apps (`CalGrid`, `DevPrompt`, `VibClip`) appear | All `registry.json` repos failed to fetch (placeholder `example-app`, missing `GITHUB_TOKEN`, or missing `.vibtools/apps/app.config.json`), activating `mockData.js` fallback. | Register real repositories in `registry.json`, verify `.vibtools/apps/app.config.json`, and configure `GITHUB_TOKEN` for private repos. |
| New release not immediately visible | Cloudflare `caches.default` caches GitHub files and `/api/apps` Mode A for `300s` (`max-age=300`). | Wait up to 5 minutes or purge Cloudflare cache. |
| `404` on `/dl/<slug>/<version>` | Version missing from `versions` or `versions.<ver>.url` missing / not starting with `https://`. | Check `versions` keys and ensure `url` begins with `https://`. |
| `502` on `get.vib.tools/<slug>` | App config loaded, but `fetchAppInstaller()` failed to fetch `.vibtools/installer.ps1` (and fallback `.vibtools/install.ps1`). | Verify installer file path in the app repository and `GITHUB_TOKEN` permissions. |

## Related Guides

- [App Onboarding & `.vibtools/` Schema](./03-app-onboarding.md)
- [Store API & Edge Routing Reference](./04-api-and-edge-routing.md)
- [Testing & Contributing](./07-testing-and-contributing.md)
