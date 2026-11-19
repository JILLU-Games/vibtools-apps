---
title: "Downloads & SHA256 Verification"
description: "Use the application detail page to switch release versions, read features and changelogs, download binaries, and verify SHA256 checksums."
order: 4
draft: false
---

# Downloads & SHA256 Verification

Opening any application at `https://apps.vib.tools/app/<slug>` displays a two-column workspace: documentation on the left and a sticky **Download & Install** panel on the right (which stacks above documentation on screens `<= 1024px`).

## Page Header & Breadcrumbs

At the top of every detail page:

- **Breadcrumb Trail:** `All Apps → <Category> → <App Name>` for one-click navigation back to the catalog or category view.
- **Application Header:** 56×56 px app icon (with monogram fallback), display name, license badge (`Free`/`Paid`), category badge, latest version badge, and full tagline.

## Download & Install Panel

The right-hand panel consolidates all release controls and verified metadata for the selected version:

### 1. Selecting a Release Version

Open the **Release Version** dropdown to view every version published in the app's manifest. Each option displays the version tag, `(latest)` for the current release, and the formatted release date (for example, `v1.0.3 (latest) — Nov 15, 2026`).

Changing the selected version immediately updates:

- **Primary Download Button:** Points to `https://get.vib.tools/dl/<slug>/<version>` (opens in a new tab with `rel="noopener noreferrer"`) and shows the detected file extension when available (e.g., `Download v1.0.3 (.exe)`).
- **PowerShell CLI Box:** Switches between `irm "https://get.vib.tools/<slug>" | iex` (when latest is selected) and `irm "https://get.vib.tools/<slug>/<version>" | iex` (when an older version is selected), with a one-click copy button.
- **Release Metadata Table:** Displays only real fields published by the app:
  - **Version** (with `(latest)` tag when applicable)
  - **Released** (formatted UTC date from ISO `YYYY-MM-DD`)
  - **Package** (binary extension + installer type, e.g., `EXE · PowerShell`)
  - **File Size** (human-readable size string, e.g., `42.8 MB`)
  - **SHA256** (truncated preview with **Full / Hide** toggle and **Copy** button)

> **Note on OS & Architecture Selectors:** If an application declares `platforms` or `architectures` arrays in its manifest, informational **Operating System** and **Architecture** dropdowns appear in the panel. Currently, the download link is governed by the selected release version.

### 2. Inspecting & Verifying SHA256 Checksums

When a release includes a `sha256` checksum:

1. Click **Full** beside the SHA256 row to reveal the full 64-character hexadecimal hash (click **Hide** to collapse it back to the compact `16…6` preview).
2. Click the **Copy** icon button to copy the full SHA256 string (toast confirms `SHA256 checksum copied`).
3. Verify the downloaded binary locally in PowerShell before running it:

```powershell
$expected = "<PASTE_COPIED_SHA256_HERE>"
$actual = (Get-FileHash -Path ".\CalGrid-Setup-1.0.3.exe" -Algorithm SHA256).Hash

if ($actual -eq $expected.ToUpper()) {
  Write-Host "MATCH — binary integrity verified." -ForegroundColor Green
} else {
  Write-Error "MISMATCH — expected $expected, got $actual"
}
```

## Documentation Tabs & Optional Sections

In the left column:

- **Features & Overview** and **Release Changelog** tabs render Markdown fetched from the application's repository and sanitized through DOMPurify before display.
- **Screenshots**, **System Requirements**, and **Resources & Links** cards appear automatically whenever the application provides those fields in its manifest (and remain hidden when not published).

## Related Guides

- [CLI Installer Guide](./03-cli-installer.md)
- [End-to-End Workflows & Shortcuts](./05-workflows.md)
- [Troubleshooting & FAQ](./06-troubleshooting-and-faq.md)
