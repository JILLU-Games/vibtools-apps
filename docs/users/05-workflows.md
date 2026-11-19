---
title: "End-to-End Workflows & Shortcuts"
description: "Step-by-step task workflows for discovering, installing, pinning versions, and sharing searches on Vib Apps, plus all supported keyboard shortcuts."
order: 5
draft: false
---

# End-to-End Workflows & Shortcuts

This guide walks through common user tasks using the exact controls available in `apps.vib.tools` and `get.vib.tools`.

## Workflow 1: Find & Install an App in Under 10 Seconds

1. Open `https://apps.vib.tools`.
2. Press `/` to focus the header search bar and type the app name, slug, or keyword (for example, `calendar` or `calgrid`).
3. Click **Copy CLI** on the matching card.
4. Confirm the green toast message `Copied: irm "https://get.vib.tools/calgrid" | iex`.
5. Paste and run the command in PowerShell.

## Workflow 2: Install an Older / Pinned Release

1. Click an application card (or **View Details**) to open `/app/<slug>`.
2. In the **Download & Install** panel on the right, open the **Release Version** dropdown and select an older release (for example, `v1.0.2`).
3. Either:
   - Click the primary **Download v1.0.2 (...)** button to download the binary directly, or
   - Click the **Copy** icon inside the **PowerShell CLI** box to copy `irm "https://get.vib.tools/<slug>/<version>" | iex`.

## Workflow 3: Inspect Before Executing (Security-First Install)

1. Open `/app/<slug>` and review the **Features & Overview** and **Release Changelog** tabs.
2. Print the installer script in PowerShell without executing it:
   ```powershell
   irm "https://get.vib.tools/<slug>"
   ```
3. Or download the binary directly via the **Download** button, copy the **SHA256** checksum from the metadata panel, and verify it with `Get-FileHash` (see [Downloads & SHA256 Verification](./04-downloads-and-verification.md)).

## Workflow 4: Share a Pre-Filtered Search or Direct App Link

- **Direct Application Page:** Copy the browser URL on `/app/<slug>` — reloading or opening it in a new browser loads that application directly.
- **Category View:** Share `/category/<category-name>` (for example, `https://apps.vib.tools/category/developer%20tools`).
- **Search Results:** Type a query in the search bar and copy the URL containing `?q=<query>` (for example, `https://apps.vib.tools/?q=clipboard`).

## Supported Keyboard Shortcuts & Accessibility Controls

| Key / Input | Scope | Behavior |
| :--- | :--- | :--- |
| `/` | Global (when focus is not inside `<input>`, `<textarea>`, or `<select>`, and no modal is open) | Focuses and selects text in the header search input. |
| `Tab` / `Shift+Tab` | Global | Moves keyboard focus across links, cards, tabs, buttons, and selects with visible focus outlines (`:focus-visible`). |
| `Enter` / `Space` | Focused application card | Opens `/app/<slug>` for the focused card. |
| `Escape` | Active modal dialog (if shown) | Closes the modal and restores page scroll. |
| Click toast | Any visible toast notification | Dismisses the notification immediately instead of waiting for auto-dismiss (`3.5s` info/success, `4.5s` error). |

> Vib Apps also respects the operating system's **Reduced Motion** preference (`prefers-reduced-motion: reduce`) by eliminating animations and transitions automatically.

## Related Guides

- [Browsing & Filtering the Catalog](./02-browsing-and-filtering.md)
- [Troubleshooting & FAQ](./06-troubleshooting-and-faq.md)
