---
title: "Getting Started & PWA Setup"
description: "First-time experience on apps.vib.tools, navigation routes, theme persistence, and installing Vib Apps as a Progressive Web App."
order: 1
draft: false
---

# Getting Started & PWA Setup

Vib Apps requires **no account, login, or subscription** to browse the catalog, copy installer commands, or download free software.

## First-Time Experience

When you open `https://apps.vib.tools`:

1. The application shell loads immediately in **Dark Mode** by default (`[data-theme="dark"]`).
2. While the catalog loads from `/api/apps`, three flat loading skeleton cards appear so the viewport never flashes blank.
3. Once loaded, the **All Applications** grid displays every available application along with live category counts in the navigation sidebar (or horizontal category chips on mobile).
4. On the unfiltered home view, a pinned **Edge CLI Installer** banner appears at the top displaying `irm "https://get.vib.tools/<slug>" | iex` with one-click **Copy** and **CLI Guide** buttons.

## Application Navigation & URLs

Every view in Vib Apps has a dedicated, reload-safe URL:

| Route | View | How to Reach It |
| :--- | :--- | :--- |
| `/` | **All Applications** | Click **Vib Apps** logo in header, **All Apps** in sidebar, or **Apps** in mobile bottom bar. |
| `/category/<name>` | **Category Catalog** | Click any category in the left sidebar (desktop) or category chip bar (mobile). |
| `/app/<slug>` | **Application Detail** | Click any application card or its **View Details** button. |
| `/cli` | **get.vib.tools CLI Guide** | Click **CLI Installer** in sidebar, **CLI Guide** in the home banner, or **CLI** in mobile bottom bar. |

Refreshing the browser on any inner route preserves the exact page and state without redirecting back to `/`.

## Switching Themes (Dark & Light)

- **Desktop:** Click the sun/moon icon button at the far right of the top header.
- **Mobile (`<= 768px`):** Tap **Theme** in the fixed bottom navigation bar.

Your choice is stored in browser `localStorage` under the key `vib_theme` (`"dark"` or `"light"`). A toast notification confirms `Theme set to light` or `Theme set to dark`, and the browser's `<meta name="theme-color">` updates automatically (`#0d1117` for dark, `#ffffff` for light).

## Installing as a Progressive Web App (PWA)

`apps.vib.tools` ships with a Web App Manifest (`/manifest.json`) and a Service Worker (`/sw.js`, cache `vib-apps-hub-v2`):

1. Open `https://apps.vib.tools` in a PWA-capable browser (Chrome, Edge, Safari on iOS, or Android Chrome).
2. Click the browser's **Install Vib Apps** icon in the address bar (or **Share → Add to Home Screen** on iOS).
3. Launch Vib Apps in standalone window mode (`display: "standalone"`).

The service worker precaches the core application shell (HTML, CSS, JavaScript modules, and brand icons) for instant repeat loads. Live catalog and detail API responses (`/api/apps`) always use network-first fetching so you see fresh versions when online.

## Next Steps

- Learn how to search and filter applications in [Browsing & Filtering the Catalog](./02-browsing-and-filtering.md).
- Jump straight to terminal installs in [CLI Installer Guide](./03-cli-installer.md).
