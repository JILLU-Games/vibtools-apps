---
title: "Troubleshooting & FAQ"
description: "Solutions for verified error states, offline behavior, clipboard permissions, and common questions about apps.vib.tools and get.vib.tools."
order: 6
draft: false
---

# Troubleshooting & FAQ

All error states and recovery steps below are verified directly against the Vib Apps frontend, service worker, and edge router.

## Common Issues & Recovery

### 1. "No matching applications" Shown in Catalog

- **Cause:** Active combinations of a category route (`/category/<name>`), license filter (`Free` / `Paid`), or search query (`?q=...`) matched zero apps.
- **Fix:** Click **Clear all filters** inside the empty-state panel (or **Reset filters** in the toolbar) to reset search, license tier, and category back to all applications.

### 2. "Unable to load application" on `/app/<slug>`

- **Cause:** The requested slug is invalid (`400 Bad Request`), not registered in the catalog (`404 Not Found`), or your device lost network connectivity (`503` offline response from the service worker).
- **Fix:** Click **Back to All Apps** to return to `/`, verify the slug spelling, or refresh once internet connectivity returns.

### 3. Toast Shows "Failed to copy..."

- **Cause:** Vib Apps first tries the browser's Async Clipboard API (`navigator.clipboard.writeText`) and automatically falls back to a hidden textarea + `document.execCommand("copy")`. If both are blocked by strict browser security policies, the error toast appears.
- **Fix:** Click directly inside the monospace command box or SHA256 box — the text uses `user-select: all`, so a single click selects the entire string for manual `Ctrl+C` / `Cmd+C` copying.

### 4. `irm "https://get.vib.tools/<slug>/<version>" | iex` Returns `404`

- **Cause:** Either `<slug>` is not registered (`App '<slug>' was not found in registry.`) or `<version>` does not exist in that app's manifest (`Version '<version>' not found for app '<slug>'.`).
- **Fix:** Visit `https://apps.vib.tools/app/<slug>` and check the **Release Version** dropdown for exact published version numbers.

### 5. App Icons Show Two Letters Instead of an Image

- **Cause:** The app's configured icon URL did not specify an image or failed to load (for example, while offline or if the remote asset host is temporarily unreachable).
- **Behavior:** This is intentional graceful degradation — Vib Apps displays a two-character monogram (`CG`, `DP`, `VC`) so layout and readability remain intact.

### 6. Offline Usage Behavior

- **What works offline:** Previously visited app shell assets (layout, styles, UI scripts, `/cli` guide) load from the PWA service worker cache (`vib-apps-hub-v2`).
- **What requires a network connection:** Fetching live catalog metadata (`/api/apps`), loading an app's features/changelog (`/api/apps?slug=<slug>`), running `get.vib.tools` PowerShell installers, and downloading binaries from `dl.vib.tools`. When offline, `/api/*` requests return HTTP `503` (`Network unavailable`) and an error toast is shown.

---

## Frequently Asked Questions (FAQ)

### Do I need to create an account to use Vib Apps?
No. Vib Apps has no login, user accounts, or tracking cookies. Only your light/dark theme preference is stored locally in `localStorage` (`vib_theme`).

### Why did opening `https://get.vib.tools/calgrid` in Chrome redirect me to `apps.vib.tools`?
`get.vib.tools` inspects the HTTP `Accept` header. Human browser visits (`Accept: text/html`) are redirected (`302`) to the visual storefront at `https://apps.vib.tools/app/<slug>`, while terminal clients (`irm`, `curl`) receive the plain-text PowerShell installer script.

### Does the version number need a `v` prefix in CLI commands?
No. The edge router normalizes version keys automatically, so `https://get.vib.tools/calgrid/1.0.3` and `https://get.vib.tools/calgrid/v1.0.3` resolve to the same release.

### Are application documentation pages safe from script injection?
Yes. Every app's `features.md` and `changelog.md` is parsed with Marked.js and passed through `DOMPurify.sanitize()` before being inserted into the page. If CDN scripts are unavailable offline, raw Markdown falls back safely to plain text inside a `<pre>` element.

### Where are application binaries hosted?
Installers and archives are hosted on Cloudflare R2 (`dl.vib.tools`) or verified `https://` storage endpoints configured in each app's manifest. The `/dl/` routes issue direct HTTP `302` redirects to the binary URL.

## Related Guides

- [Vib Apps User Guide Overview](./index.md)
- [CLI Installer Guide](./03-cli-installer.md)
- [Downloads & SHA256 Verification](./04-downloads-and-verification.md)
