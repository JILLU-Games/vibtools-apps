# Project Mission & Specifications — `vib-apps-hub`

> **Document Status:** Active & Locked Specification  
> **Platform Name:** `vib-apps-hub`  
> **Dual Domains:** `apps.vib.tools` (App Catalog) & `get.vib.tools` (Edge CLI & Direct Download Router)

---

## 1. Why We Are Building This (The Problem)

1. **Private & Paid App Distribution Barrier:**
   - Proprietary, private, and paid applications created within the Vib Tools ecosystem do not have public GitHub repositories. As a result, they cannot use standard GitHub Releases for binary hosting or distribution.
2. **User Friction & Cluttered Download Experiences:**
   - End-users and developers need a frictionless, developer-friendly way to browse all Vib Tools apps, retrieve verified direct download links, and install apps instantly via a single PowerShell command.
   - Traditional download flows involve ad-walls, third-party hosting, registration walls, captchas, and multi-step manual file extractions.
3. **Unscalable Operational Overhead:**
   - Building and maintaining individual websites, landing pages, or manual download portals for every micro-tool or utility is unsustainable and leads to fragmented versioning, broken links, and high maintenance costs.

---

## 2. Project Mission & Objective

The mission of **`vib-apps-hub`** is to provide a single, zero-maintenance, config-driven static and edge web platform hosted entirely on Cloudflare Pages and Pages Functions.

- **The `docscaffold` Mental Model:**  
  Mirroring the architecture of `docs.vib.tools`, whenever an application needs to be listed, developers add a single repository entry into a central `registry.json`. The edge system automatically discovers metadata, installer scripts, version manifests, and documentation from that repository's `.vibtools/` directory.
- **Dual Domain Orchestration via Single Codebase:**
  1. **`apps.vib.tools`** — Central App Store & Catalog UI: Instant search, category/access filtering, version switching, hash verification, and rendered release notes.
  2. **`get.vib.tools`** — Edge Installer Script & Direct Download Router: Edge Worker serving dynamic PowerShell installer scripts and 302 HTTP redirects to Cloudflare R2 storage.

---

## 3. Core Features

- **Central Registry (`registry.json`):** Single point of registration for any public or private GitHub repository.
- **Automatic Asset Discovery:** Server-side fetching of `.vibtools/apps/app.config.json`, `.vibtools/installer.ps1`, `.vibtools/features.md`, and `.vibtools/changelog.md`.
- **Private Repository Support:** Edge-level GitHub API integration using a secure server-side `GITHUB_TOKEN` environment variable that is never exposed to client browsers.
- **One-Line PowerShell Installation:** Instant installation commands supporting both latest stable releases and specific version pins.
- **Clean Direct Download URLs:** Clean endpoints (`/dl/<slug>` and `/dl/<slug>/<version>`) issuing `302 Found` redirects directly to binary assets hosted on Cloudflare R2 or designated storage.
- **CLI Utility Integration Card:** A persistent helper card on `apps.vib.tools` explaining `get.vib.tools` CLI flags and one-line usage.
- **Rich Client-Side Catalog Experience:** Millisecond search, category tags (e.g., Developer Tools, Productivity), access tiers (Free / Paid), SHA256 checksum copying, and sanitized Markdown rendering for changelogs and features.

---

## 4. How It Will Be Used (Concrete Examples)

### A. One-Line PowerShell Installation (CLI)

- **Install Latest Version:**
  ```powershell
  irm "https://get.vib.tools/calgrid" | iex
  ```
  *Behavior:* Edge detects route `/calgrid`, loads `calgrid` metadata, injects `$APP_VERSION = "latest"`, and returns the raw PowerShell installer script with `Content-Type: text/plain`.

- **Install Specific Pinned Version:**
  ```powershell
  irm "https://get.vib.tools/calgrid/v1.0.3" | iex
  ```
  *Behavior:* Edge detects route `/calgrid/v1.0.3`, resolves version `1.0.3` assets, prepends `$APP_VERSION = "1.0.3"`, and streams the installer script.

---

### B. Direct Download URLs (Browser & Automation)

- **Direct Download Latest Binary:**
  ```text
  GET https://get.vib.tools/dl/calgrid
  ```
  *Response:*
  ```http
  HTTP/1.1 302 Found
  Location: https://dl.vib.tools/calgrid/calgrid-setup-latest.exe
  ```

- **Direct Download Specific Version:**
  ```text
  GET https://get.vib.tools/dl/calgrid/v1.0.2
  ```
  *Response:*
  ```http
  HTTP/1.1 302 Found
  Location: https://dl.vib.tools/calgrid/v1.0.2/calgrid-setup-1.0.2.exe
  ```

---

### C. Browse, Inspect & Download via Web UI

1. The user navigates to `https://apps.vib.tools`.
2. The user sees a responsive, ultra-fast grid of apps. The user can press `/` to instantly search by name, slug, or tagline, or filter by category (`Productivity`, `DevTools`) or access tier (`Free`, `Paid`).
3. Clicking on an app card (e.g., **CalGrid**) opens the **Details & Download Modal**:
   - Displays current version badge (`v1.0.3`), license type, and release date.
   - Allows selecting previous versions via a dropdown.
   - Automatically generates the copy-ready PowerShell command for the selected version (`irm "https://get.vib.tools/calgrid/v1.0.3" | iex`).
   - Provides a one-click **Direct Download (.exe/.zip)** button linking to `/dl/calgrid/v1.0.3`.
   - Offers 1-click copy for the verified SHA256 checksum.
   - Renders tabbed Markdown views for **Features** (`features.md`) and **Changelog** (`changelog.md`).
