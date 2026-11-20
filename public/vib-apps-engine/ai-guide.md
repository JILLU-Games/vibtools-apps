# AI Agent Execution Playbook — Vib Apps Engine (`.vibtools/apps/`)

> **Single-URL AI Master Bundle:** `https://apps.vib.tools/llms-full.txt`  
> **Shareable Prompt URL:** `https://apps.vib.tools/vib-apps-engine/ai-guide.md`  
> **Compact Spec URL:** `https://apps.vib.tools/vib-apps-engine/llms.txt`  
> **Frozen JSON Schema URL:** `https://apps.vib.tools/schemas/vibtools-app.schema.json`

---

## Ready-to-Paste Prompt for Any AI Coding Agent

Copy and paste the prompt below into any AI coding assistant (Gemini, Claude, ChatGPT, Cursor, Windsurf, Copilot) inside your application repository:

```text
Read the complete Vib Apps Engine Frozen v1 specification from:
- Single-URL Master Bundle: https://apps.vib.tools/llms-full.txt
- Frozen JSON Schema: https://apps.vib.tools/schemas/vibtools-app.schema.json

Audit this repository and configure it for apps.vib.tools and get.vib.tools by:
1. Creating `.vibtools/apps/app.config.json` conforming strictly to `schemaVersion: 1` (`additionalProperties: false`) using real project metadata, versions, calendar-valid `released_at` dates, and trusted HTTPS binary URLs.
2. Creating `.vibtools/apps/installer.ps1` using injected `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` variables (plus per-version `installer` overrides only if specific versions require a different install flow).
3. Creating accurate `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` from actual codebase features and release history (zero invented features).
4. Verifying all 12 items in the Self-Verification Checklist before finishing and printing the GitHub repo URL to add to `registry.json`.
```

---

## Deterministic Execution Protocol for AI Agents

When asked to onboard any repository to `apps.vib.tools`, execute these exact steps in order:

### Step 1 — Inspect Target Repository Ground Truth
- Read `README.md`, `package.json` / `Cargo.toml` / `pyproject.toml` / `.csproj` / release workflow files to extract the true app `name`, `slug`, `tagline`, current version, supported `platforms`/`architectures`, and binary release URLs.
- Never fabricate download URLs or SHA256 hashes. If release binaries are not uploaded yet, clearly mark placeholder URLs on `https://dl.vib.tools/<slug>/<version>/...` and omit `sha256` until computed from the real binary (never write invalid non-64-hex placeholder strings like `"TBD"`, because `validateAppConfig()` rejects them with HTTP 422).

### Step 2 — Generate `.vibtools/apps/app.config.json`
- Always set:
  - `"$schema": "https://apps.vib.tools/schemas/vibtools-app.schema.json"`
  - `"schemaVersion": 1`
- Use ONLY keys listed in the Frozen Schema (`additionalProperties: false`):
  - **Root:** `$schema`, `schemaVersion`, `slug`, `name`, `tagline`, `category`, `access`, `icon`, `latest`, `installer`, `docs`, `platforms`, `architectures`, `requirements`, `screenshots`, `links`, `versions`
  - **Version:** `url`, `installer`, `size`, `sha256`, `released_at`, `channel`, `deprecated`
- **MUST rules:**
  - `slug` MUST be lowercase `^[a-z0-9][a-z0-9-_]{0,63}$`.
  - `latest` MUST be an exact key match inside `versions`.
  - Version keys MUST start with a digit after optional `v` (e.g. `v1.0.0`, `1.2.0-beta.1`).
  - `url`, `icon`, `screenshots`, `links` MUST start with `https://`.
  - `released_at` MUST be `"YYYY-MM-DD"`.
- **MUST NOT rules:**
  - MUST NOT use `releaseDate`, `downloadUrl`, `version`, or custom root/version keys.
  - MUST NOT put non-64-hex text in `sha256`.
  - MUST NOT point `url` or remote `installer` to `http://` or untrusted hosts.

### Step 3 — Configure Default & Per-Version Installers
- Default shared installer: place at `.vibtools/apps/installer.ps1` and reference `"installer": { "type": "powershell", "script": ".vibtools/apps/installer.ps1" }`.
- Version-specific installer (only when a version needs a different script): add `"installer": ".vibtools/apps/installers/<ver>.ps1"` or `"installer": "https://dl.vib.tools/<slug>/<ver>/install.ps1"` inside that specific version entry.
- Always derive the download endpoint inside the script as `"https://get.vib.tools/dl/$APP_SLUG/$APP_VERSION"` so every version works automatically.

### Step 4 — Write Accurate Markdown Docs
- `.vibtools/apps/features.md`: factual product overview, key highlights, and usage notes verified from the repo.
- `.vibtools/apps/changelog.md`: reverse-chronological release history matching the keys inside `versions`.

### Step 5 — Run Local JSON Sanity Check & Checklist
- Validate JSON syntax (`node -e 'JSON.parse(require("fs").readFileSync(".vibtools/apps/app.config.json","utf8"))'`).
- Confirm all 12 items of the Self-Verification Checklist in `https://apps.vib.tools/vib-apps-engine/llms.txt`.
- Report the exact GitHub repository URL for the user to paste into `registry.json` in `vib-apps-hub`.
