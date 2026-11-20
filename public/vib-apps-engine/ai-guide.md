# AI Agent Execution Playbook — Vib Apps Engine (`.vibtools/apps/`)

> **Single-URL AI Master Bundle:** `https://apps.vib.tools/llms-full.txt`  
> **Shareable Prompt URL:** `https://apps.vib.tools/vib-apps-engine/ai-guide.md`  
> **Compact Spec URL:** `https://apps.vib.tools/vib-apps-engine/llms.txt`  
> **Frozen JSON Schema URL:** `https://apps.vib.tools/schemas/vibtools-app.schema.json`

---

## Ready-to-Paste Prompts for Any AI Coding Agent

Copy and paste the appropriate prompt below into any AI coding assistant (Gemini, Claude, ChatGPT, Cursor, Windsurf, Copilot, Codex) inside your application repository:

### A. First-Time Setup Prompt (Create `.vibtools/apps/` from Scratch)

```text
MANDATORY PRE-FLIGHT (FAIL-CLOSED):
Fetch and read BOTH Vib Apps Engine Frozen v1 specs first (use web fetch or run `curl -sS` in terminal):
- Single-URL Master Bundle: https://apps.vib.tools/llms-full.txt
- Frozen JSON Schema: https://apps.vib.tools/schemas/vibtools-app.schema.json
If you cannot fetch these URLs, STOP immediately and ask me to paste them — NEVER guess or invent schema fields.

Audit this repository and configure it for apps.vib.tools and get.vib.tools by:
1. Inspecting our real codebase (README, project/build files, `.vibtools/logo.*`, release assets/tags) so zero fake metadata or invented features are written.
2. Creating `.vibtools/apps/app.config.json` strictly matching `schemaVersion: 1` (`additionalProperties: false`):
   - ONLY allowed root keys: `$schema`, `schemaVersion`, `slug`, `name`, `tagline`, `category`, `access`, `icon`, `latest`, `installer`, `docs`, `platforms`, `architectures`, `requirements`, `screenshots`, `links`, `versions`.
   - ONLY allowed `versions.<ver>` keys: `url`, `installer`, `size`, `sha256`, `released_at`, `channel`, `deprecated`.
   - STRICTLY FORBIDDEN keys (cause HTTP 422): `description`, `license`, `artifacts`, `platforms` inside `versions.<ver>`, `releaseDate`, `downloadUrl`. Use `"access": "Free" | "Paid"`, `"tagline"`, root `"platforms"`/`"architectures"`, and flat `"url"` directly on each version entry.
   - Enforce lowercase `slug`, exact `latest` key match inside `versions`, calendar-valid `YYYY-MM-DD` `released_at`, trusted HTTPS binary URLs, and 64-char hex `sha256` (omit `sha256` if not computed yet — never write placeholders like "TBD").
   - Verify with `curl -sSI` (when network is available) that every `https://` URL (`versions.<ver>.url`, remote `installer`, `icon`, `links.*`) returns HTTP 200/302/308 — never point `installer` or `links` to a 404 URL.
3. Configuring the master installer script (saved as UTF-8 without BOM) using the edge-injected `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` variables:
   - RECOMMENDED (Clean Repo): If a verified master installer is hosted on Cloudflare R2 (e.g. `https://dl.vib.tools/<App>/installer.ps1`), point root `installer.script` to that HTTPS URL and omit `.vibtools/apps/installer.ps1` from the repo (add per-version `versions.<ver>.installer` only for releases with a verified separate script).
   - FALLBACK (Repo-Local): Only create `.vibtools/apps/installer.ps1` in the repo if no verified R2 master installer URL exists yet.
4. Creating factual `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` matching the real app and every version key in `versions`.
5. Running a programmatic key-whitelist & JSON validation check on `.vibtools/apps/app.config.json`, verifying all 12 items in the Self-Verification Checklist, and printing the exact GitHub repo URL to add to `registry.json`.
```

### B. Audit & Fix Prompt (Fix Existing `.vibtools/apps/` Config)

```text
MANDATORY PRE-FLIGHT (FAIL-CLOSED):
Fetch and read BOTH Vib Apps Engine Frozen v1 specs first (use web fetch or run `curl -sS` in terminal):
- Single-URL Master Bundle: https://apps.vib.tools/llms-full.txt
- Frozen JSON Schema: https://apps.vib.tools/schemas/vibtools-app.schema.json
If you cannot fetch these URLs, STOP immediately and ask me to paste them — NEVER guess or invent schema fields.

Perform a strict forensic audit and fix of `.vibtools/apps/` in this repository:
1. Validate `.vibtools/apps/app.config.json` strictly against Frozen v1 (`schemaVersion: 1`, `additionalProperties: false`):
   - Reject and remove/migrate any unknown root keys (e.g. `description` -> `tagline`/`features.md`, `license` -> `access: "Free" | "Paid"`).
   - Reject and flatten any invalid nested version structures (e.g. `versions.<ver>.artifacts[]` or `versions.<ver>.platforms` -> flat `url`, `size`, `sha256`, `released_at`, `installer`, `channel`, `deprecated` directly on `versions.<ver>`, with `platforms` and `architectures` at root).
   - Verify lowercase `slug`, exact `latest` key match, calendar-valid `YYYY-MM-DD` `released_at`, valid 64-hex `sha256` (or omitted), valid HTTPS `icon` (use repo logo raw HTTPS URL or uploaded asset if available), and safe repo-relative `docs` paths.
2. Live-probe every `https://` URL (`versions.<ver>.url`, root/per-version `installer`, `icon`, `links.*`) via `curl -sSI` when network is available; fix or remove any 404/broken URLs (never keep a 404 remote `installer`).
3. Audit installer hosting & script hygiene:
   - If a verified R2 master installer URL exists (e.g. `https://dl.vib.tools/<App>/installer.ps1`), root `installer.script` may point directly to it so the repo stays clean without `.vibtools/apps/installer.ps1`.
   - Verify the active master/override installer script (saved as UTF-8 without BOM) cleanly uses `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME`, handles optional leading `v` safely, and works with both `get.vib.tools/<slug>[/<version>]` and `?download=1`.
4. Verify `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` match the real app and every version listed in `versions` with consistent SHA256/requirements.
5. Run a programmatic JSON & Frozen v1 key-whitelist check, fix every HTTP 422/403/404 risk, and report a pass/fail summary against all 12 checklist items.
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
  - MUST NOT use `description`, `license`, `artifacts`, `platforms` inside `versions.<ver>`, `releaseDate`, `downloadUrl`, `version`, or any custom root/version keys.
  - MUST NOT put non-64-hex text in `sha256`.
  - MUST NOT point `url` or remote `installer` to `http://`, untrusted hosts, or 404 URLs.

### Step 3 — Configure Default & Per-Version Installers
- **Recommended (Clean Repo — R2 Master Installer):** Upload the shared master `installer.ps1` (UTF-8 without BOM) to Cloudflare R2 (`https://dl.vib.tools/<App>/installer.ps1`) and reference `"installer": { "type": "powershell", "script": "https://dl.vib.tools/<App>/installer.ps1" }` at root — no installer script needs to be committed inside `.vibtools/apps/`.
- **Repo-Local Alternative:** If you prefer keeping the script in Git, place it at `.vibtools/apps/installer.ps1` and reference `"installer": { "type": "powershell", "script": ".vibtools/apps/installer.ps1" }`.
- **Per-Version Override (Optional):** Only when a specific version needs a different flow, add `"installer": "https://dl.vib.tools/<App>/<ver>/installer.ps1"` (or a repo path) inside that specific version entry.
- Always derive the download endpoint inside the script as `"https://get.vib.tools/dl/$APP_SLUG/$APP_VERSION"` so every version works automatically via both `irm "https://get.vib.tools/<slug>[/<version>]" | iex` and manual script download (`https://get.vib.tools/<slug>/<version>?download=1`).

### Step 4 — Write Accurate Markdown Docs
- `.vibtools/apps/features.md`: factual product overview, key highlights, and usage notes verified from the repo.
- `.vibtools/apps/changelog.md`: reverse-chronological release history matching the keys inside `versions`.

### Step 5 — Run Local JSON Sanity Check & Checklist
- Validate JSON syntax (`node -e 'JSON.parse(require("fs").readFileSync(".vibtools/apps/app.config.json","utf8"))'`).
- Confirm all 12 items of the Self-Verification Checklist in `https://apps.vib.tools/vib-apps-engine/llms.txt`.
- Report the exact GitHub repository URL for the user to paste into `registry.json` in `vib-apps-hub`.
