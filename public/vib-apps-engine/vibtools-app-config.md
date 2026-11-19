# Vib Apps Engine — `.vibtools/apps/app.config.json` Specification (v1)

> **Frozen Schema URL:** `https://apps.vib.tools/schemas/vibtools-app.schema.json`  
> **Schema Version:** `1` (Frozen)  
> **Applies To:** `apps.vib.tools` (Storefront & API) and `get.vib.tools` (CLI Installer & Direct Download Router)

---

## 1. Zero-Touch Onboarding Flow

To publish an application on `apps.vib.tools` and `get.vib.tools`:

1. Place `.vibtools/apps/app.config.json`, installer script, and Markdown docs in your app repository.
2. Add your GitHub repository URL to `registry.json` in `vib-apps-hub`:
   ```json
   [
     "https://github.com/vib-tools/calgrid"
   ]
   ```
   *(Optional object form if you need a non-`main` branch or featured flag: `{ "repo": "https://github.com/vib-tools/calgrid", "branch": "release", "featured": true }`.)*

The edge hub automatically parses `owner/repo`, reads `.vibtools/apps/app.config.json`, maps your `slug`, renders Markdown tabs, and serves every version's download redirect and installer script.

---

## 2. Recommended Repository Structure

```text
<app-repo>/
└── .vibtools/
    └── apps/
        ├── app.config.json        # Required frozen v1 manifest
        ├── installer.ps1          # Default PowerShell installer (or use HTTPS URL)
        ├── features.md            # Overview & Features tab Markdown
        └── changelog.md           # Release Changelog tab Markdown
```

Backward-compatible fallbacks:
- Config fallback: `.vibtools/app.config.json` (checked if `.vibtools/apps/app.config.json` returns 404).
- Installer fallback: `.vibtools/installer.ps1` -> `.vibtools/install.ps1`.
- Bare doc filenames (e.g. `"features.md"`): resolved in `.vibtools/apps/features.md` first, then `.vibtools/features.md`.

---

## 3. Per-Version Inheritance & Override Model

- Define your shared installer once at root (`installer`).
- For any version that needs a different script (e.g., a legacy setup flow or hosted script on R2/GitHub Releases), add `"installer"` directly inside `versions.<ver>`.
- Both **repository-relative paths** (e.g. `".vibtools/apps/installers/v1.0.2.ps1"`) and **trusted HTTPS URLs** (`dl.vib.tools`, `github.com`, `raw.githubusercontent.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, or `ALLOWED_DOWNLOAD_HOSTS`) are supported.

---

## 4. AI Agent Self-Verification Checklist (10 Checks)

1. `.vibtools/apps/app.config.json` exists and is valid UTF-8 JSON.
2. `"$schema"` points to `"https://apps.vib.tools/schemas/vibtools-app.schema.json"` and `"schemaVersion"` is `1`.
3. No extra/unrecognized properties exist on root or any version object (`additionalProperties: false`).
4. `"slug"` matches `^[a-z0-9][a-z0-9-_]{0,63}$` and `"name"` is non-empty.
5. `"latest"` matches an exact key inside `"versions"`.
6. Every version entry has a valid `"url"` starting with `https://` on a trusted host.
7. Every `"released_at"` uses strict `"YYYY-MM-DD"` format (never `releaseDate`).
8. Every `"sha256"` (if present) is an exact 64-character hexadecimal string.
9. Default `"installer"` and any per-version `"installer"` overrides point to an existing repo file or trusted `https://` URL, and consume `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME`.
10. `"docs.features"` and `"docs.changelog"` point to valid Markdown files with clean headings and no raw unsafe HTML.
