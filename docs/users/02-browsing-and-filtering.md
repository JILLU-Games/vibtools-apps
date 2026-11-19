---
title: "Browsing & Filtering the Catalog"
description: "Understand application cards, use instant search with the / shortcut and ?q= URLs, filter by category and license tier, and navigate on mobile."
order: 2
draft: false
---

# Browsing & Filtering the Catalog

The catalog grid (`/` and `/category/<name>`) is designed for rapid discovery across desktop and mobile viewports.

## Anatomy of an Application Card

Each application card is organized into three vertical zones:

1. **Header Zone:**
   - **44×44 px App Icon:** Lazy-loaded from the application's configured icon URL. If the icon is omitted or unreachable, a crisp two-letter uppercase monogram fallback (for example, `CG` for `CalGrid` or `DP` for `DevPrompt`) renders automatically.
   - **Name & Category:** Application display name with its category subtitle.
   - **License Badge:** `Free` (green) or `Paid` (purple) when declared in the app's metadata.
2. **Body Zone:**
   - **Tagline:** Concise summary clamped cleanly to two lines.
   - **Metadata Row:** Monospace latest version badge (for example, `v1.0.3`), package format badge derived from the binary file extension (`EXE`, `MSI`, `MSIX`, `ZIP`, `DMG`, `PKG`, `DEB`, `RPM`, `AppImage`, `TAR.GZ`, `TAR.XZ`), and installer badge (`PowerShell`) when declared.
3. **Footer Zone:**
   - **View Details** (primary button) — Navigates to `/app/<slug>`.
   - **Copy CLI** (secondary button) — Copies `irm "https://get.vib.tools/<slug>" | iex` directly to your clipboard and displays a confirmation toast.

Clicking anywhere on the card body (or pressing `Enter`/`Space` while focused on the card) also opens `/app/<slug>`.

## Instant Search & Shareable `?q=` Links

- Click the header search bar (`Search applications...`) or press `/` anywhere outside an input field to focus and select the search box.
- Typing filters the catalog automatically after a **150 ms debounce**.
- Search matches case-insensitively across **four fields**: application `name`, `slug`, `tagline`, and `category`.
- If you start searching while viewing `/app/<slug>` or `/cli`, Vib Apps switches cleanly back to `/` so results are immediately visible.
- Every active query is written to the browser URL as `?q=<query>` using `history.replaceState`. Refreshing the page or sharing the URL restores the search input and filtered results automatically.

## Category Filtering

Categories are computed dynamically from the loaded catalog (`computeCategoryCounts`) and sorted alphabetically:

- **Desktop (`> 768px`):** Select any category in the left sidebar under **Categories**. Each link shows the live application count beside it, and **All Apps** shows the total catalog count.
- **Mobile (`<= 768px`):** The sidebar collapses and a horizontally scrollable category chip bar (`All (N)`, `Developer Tools (N)`, `Productivity (N)`, `Utilities (N)`, etc.) appears above the filter toolbar.

## License Tier Filter (`All / Free / Paid`)

Above the card grid, the segmented control lets you filter applications by their declared `access` metadata:

- **All** — Shows all matching applications regardless of license tier.
- **Free** — Shows only applications with `access: "Free"`.
- **Paid** — Shows only applications with `access: "Paid"`.

The catalog header count badge updates dynamically to show either `<total> applications` or `<filtered> of <total> apps` whenever any category, license, or search filter is active.

## Resetting Filters

When any filter is active:

- Click **Reset filters** on the right side of the filter toolbar, or
- If zero applications match, click **Clear all filters** inside the empty state panel.

Both actions clear the search input, remove `?q=` from the URL, reset the license filter to **All**, and return to `/` if you were viewing a category route.

## Related Guides

- [Getting Started & PWA Setup](./01-getting-started.md)
- [Downloads & SHA256 Verification](./04-downloads-and-verification.md)
- [End-to-End Workflows & Shortcuts](./05-workflows.md)
