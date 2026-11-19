---
title: "Vib Apps User Guide"
description: "Discover, filter, install, and verify Vib Tools applications using apps.vib.tools and the get.vib.tools PowerShell and direct-download edge router."
version: "1.0.0"
order: 0
draft: false
---

# Vib Apps User Guide

**Vib Apps** (`vib-apps-hub`) is the official software catalog and edge installer hub for Vib Tools applications. It operates across two coordinated domains from a single platform:

| Surface | URL | Purpose |
| :--- | :--- | :--- |
| **Visual Web Catalog** | `https://apps.vib.tools` | Browse applications, search in real time, filter by category and license tier, read features and changelogs, and download verified binaries. |
| **Edge CLI & Download Router** | `https://get.vib.tools` | Stream PowerShell installation scripts (`irm \| iex`) or follow direct HTTP `302` redirects to release installers hosted on Cloudflare R2 (`dl.vib.tools`). |

## Quick Start

Install the latest version of any registered application from Windows PowerShell:

```powershell
irm "https://get.vib.tools/<slug>" | iex
```

Install a specific pinned release version:

```powershell
irm "https://get.vib.tools/<slug>/<version>" | iex
```

Download the release binary directly without running a script:

```text
https://get.vib.tools/dl/<slug>
https://get.vib.tools/dl/<slug>/<version>
```

> Navigating to `https://get.vib.tools`, `https://get.vib.tools/cli`, or `https://get.vib.tools/<slug>` in a standard web browser automatically redirects you (`302`) to the matching page on `https://apps.vib.tools`.

## User Documentation Map

1. [Getting Started & PWA Setup](./01-getting-started.md) — First-time experience, routes, dark/light theme setup, and installing Vib Apps as a Progressive Web App.
2. [Browsing & Filtering the Catalog](./02-browsing-and-filtering.md) — Reading application cards, using `/` instant search and `?q=` URLs, category navigation, and license filtering.
3. [CLI Installer Guide](./03-cli-installer.md) — Using `get.vib.tools` PowerShell one-liners, pinning versions, and running direct `/dl/` downloads.
4. [Downloads & SHA256 Verification](./04-downloads-and-verification.md) — Using the two-column detail page, switching release versions, inspecting docs tabs, and verifying SHA256 checksums.
5. [End-to-End Workflows & Shortcuts](./05-workflows.md) — Task-oriented recipes for common tasks plus every supported keyboard shortcut.
6. [Troubleshooting & FAQ](./06-troubleshooting-and-faq.md) — Verified error states, clipboard and offline recovery, and frequently asked questions.
