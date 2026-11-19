---
title: "CLI Installer Guide"
description: "Install latest or version-pinned Vib Tools applications from PowerShell or download release binaries directly via get.vib.tools."
order: 3
draft: false
---

# CLI Installer Guide

`get.vib.tools` is the dedicated edge installer and download router paired with `apps.vib.tools`. You can also view copyable syntax cards anytime inside the web app at `https://apps.vib.tools/cli`.

## 1. Install the Latest Version (PowerShell)

Open **Windows PowerShell** (5.1 or 7+) and run:

```powershell
irm "https://get.vib.tools/<slug>" | iex
```

Example:

```powershell
irm "https://get.vib.tools/calgrid" | iex
```

`irm` (`Invoke-RestMethod`) fetches the plain-text PowerShell installer script from `get.vib.tools`, and `| iex` (`Invoke-Expression`) executes it immediately.

## 2. Install a Specific Version (PowerShell)

Append the release version after the application slug:

```powershell
irm "https://get.vib.tools/<slug>/<version>" | iex
```

Example:

```powershell
irm "https://get.vib.tools/calgrid/1.0.3" | iex
```

Both `v`-prefixed and bare semver versions are normalized automatically by the edge router — `v1.0.3` and `1.0.3` resolve to the exact same release.

## 3. Direct Binary Downloads (`/dl/`)

If you prefer to download the release binary directly without piping a script to `iex`, use the `/dl/` prefix. The edge router responds with an HTTP `302 Found` redirect directly to the hosted binary URL (typically on `dl.vib.tools`):

### Latest Release Binary

```powershell
Invoke-WebRequest -Uri "https://get.vib.tools/dl/<slug>" -OutFile "<slug>-latest.exe"
```

```bash
curl -fL "https://get.vib.tools/dl/<slug>" -o "<slug>-latest.exe"
```

### Specific Version Binary

```powershell
Invoke-WebRequest -Uri "https://get.vib.tools/dl/<slug>/<version>" -OutFile "<slug>-<version>.exe"
```

```bash
curl -fL "https://get.vib.tools/dl/<slug>/<version>" -o "<slug>-<version>.exe"
```

## 4. Built-In Terminal Usage Manual

Requesting the root of `get.vib.tools` from a terminal client returns a quick reference in plain text:

```powershell
irm "https://get.vib.tools"
```

```bash
curl -s https://get.vib.tools
```

## What Happens When You Run `irm | iex`

1. The edge router validates the requested `<slug>` and resolves `<version>` (or the app's configured `latest` release).
2. It retrieves the application's installer script from its registered GitHub repository (`.vibtools/installer.ps1`, cached at the edge for 5 minutes).
3. It prepends two sanitized PowerShell variables (`$APP_SLUG` and `$APP_VERSION`) at the top of the response and serves it as `text/plain; charset=utf-8`.
4. PowerShell runs the script to download and install the matching release.

> **Security Tip:** Want to inspect an installer script before running it? Run `irm "https://get.vib.tools/<slug>"` **without** `| iex` to print the entire script in your terminal first.

## Related Guides

- [Downloads & SHA256 Verification](./04-downloads-and-verification.md)
- [End-to-End Workflows & Shortcuts](./05-workflows.md)
- [Troubleshooting & FAQ](./06-troubleshooting-and-faq.md)
