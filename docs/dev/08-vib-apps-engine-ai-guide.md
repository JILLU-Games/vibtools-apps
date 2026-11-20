---
title: "Vib Apps Engine AI Guide & Frozen Schema Playbook"
description: "Shareable AI-readable URLs, ready-to-paste AI agent prompt, hard validation invariants, and 12-point verification checklist for auto-generating .vibtools/apps/ configurations."
order: 8
draft: false
---

# Vib Apps Engine AI Guide & Frozen Schema Playbook

`vib-apps-hub` publishes dedicated, CORS-enabled, machine-readable endpoints on `https://apps.vib.tools` so **any AI coding assistant** (Cursor, Claude, ChatGPT, Gemini, Windsurf, Copilot) can read the Frozen Schema v1 rules directly from a URL and generate a 100% valid `.vibtools/apps/` setup for any repository in one pass.

## 1. Public Shareable URLs (CORS `*`, AI & IDE Ready)

| URL | Audience / Purpose |
| :--- | :--- |
| `https://apps.vib.tools/llms-full.txt` | **Single-URL AI Master Bundle** — Complete self-contained spec, step matrix, templates & 12-point checklist in ONE file. |
| `https://apps.vib.tools/llms.txt` | **Root AI Index** — Single entry point linking all Vib Apps Engine specs and routes. |
| `https://apps.vib.tools/schemas/vibtools-app.schema.json` | **Frozen JSON Schema (`schemaVersion: 1`)** — Machine-enforceable Draft 2020-12 contract (`additionalProperties: false`). |
| `https://apps.vib.tools/vib-apps-engine/llms.txt` | **Compact AI Agent Specification** — Token-efficient rules, hard invariants, and production templates. |
| `https://apps.vib.tools/vib-apps-engine/vibtools-app-config.md` | **Complete A–Z Setup Guide** — Step-by-step Levels 1–3, field reference, PowerShell guide, and troubleshooting. |
| `https://apps.vib.tools/vib-apps-engine/ai-guide.md` | **AI Execution Playbook** — 6-phase autonomous workflow and ready-to-paste prompt. |

## 2. Ready-to-Paste Prompts for Any AI Coding Assistant

### A. First-Time Setup Prompt (Create `.vibtools/apps/`)

Paste this prompt into any AI coding agent inside your application's repository:

```text
MANDATORY PRE-FLIGHT (FAIL-CLOSED):
Fetch and read BOTH Vib Apps Engine Frozen v1 specs first (use web fetch or run `curl -sS` in terminal):
- Single-URL Master Bundle: https://apps.vib.tools/llms-full.txt
- Frozen JSON Schema: https://apps.vib.tools/schemas/vibtools-app.schema.json
If you cannot fetch these URLs, STOP immediately and ask me to paste them — NEVER guess or invent schema fields.

Audit this repository and configure it for apps.vib.tools and get.vib.tools by:
1. Inspecting our real codebase (README, project/build files, `.vibtools/logo.*`, release assets/tags) so zero fake metadata or invented features are written.
2. Creating `.vibtools/apps/app.config.json` strictly matching `schemaVersion: 1` (`additionalProperties: false`):
   - ONLY allowed root keys: `$schema`, `schemaVersion`, `slug`, `name`, `tagline`, `category`, `access`, `icon`, `latest`, `installer`, `docs`, `platforms`, `architectures`, `requirements`, `screenshots`, `dependencies`, `links`, `versions`.
   - ONLY allowed `versions.<ver>` keys: `url`, `installer`, `size`, `sha256`, `released_at`, `channel`, `deprecated`.
   - STRICTLY FORBIDDEN keys (cause HTTP 422): `description`, `license`, `artifacts`, `platforms` inside `versions.<ver>`, `releaseDate`, `downloadUrl`. Use `"access": "Free" | "Paid" | "Forge"` (`Free` = first-party free/OSS, `Paid` = first-party commercial, `Forge` = third-party / reverse-engineered utility), `"tagline"`, root `"platforms"`/`"architectures"`, and flat `"url"` directly on each version entry.
   - If the app requires extra third-party tools/runtimes when installed manually via ZIP (e.g. Chromium, FFmpeg, VC++ Redistributable), declare optional `"dependencies": [{ "name", "url", "version"?, "note"?, "required"? }]` with strict `https://` URLs (omit `dependencies` completely if the app is standalone).
   - Enforce lowercase `slug`, exact `latest` key match inside `versions`, calendar-valid `YYYY-MM-DD` `released_at`, trusted HTTPS binary URLs, and 64-char hex `sha256` (omit `sha256` if not computed yet — never write placeholders like "TBD").
   - Verify with `curl -sSI` (when network is available) that every `https://` URL (`versions.<ver>.url`, remote `installer`, `icon`, `dependencies[].url`, `links.*`) returns HTTP 200/302/308 — never point `installer` or `links` to a 404 URL.
3. Configuring the master installer script (saved as UTF-8 without BOM) using the edge-injected `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` variables:
   - RECOMMENDED (Clean Repo): If a verified master installer is hosted on Cloudflare R2 (e.g. `https://dl.vib.tools/<App>/installer.ps1`), point root `installer.script` to that HTTPS URL and omit `.vibtools/apps/installer.ps1` from the repo (add per-version `versions.<ver>.installer` only for releases with a verified separate script).
   - FALLBACK (Repo-Local): Only create `.vibtools/apps/installer.ps1` in the repo if no verified R2 master installer URL exists yet.
4. Creating factual `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` matching the real app and every version key in `versions`.
5. Running a programmatic key-whitelist & JSON validation check on `.vibtools/apps/app.config.json`, verifying all 12 items in the Self-Verification Checklist, and printing the exact GitHub repo URL to add to `registry.json`.
```

### B. Audit & Fix Prompt (Fix Existing `.vibtools/apps/`)

```text
MANDATORY PRE-FLIGHT (FAIL-CLOSED):
Fetch and read BOTH Vib Apps Engine Frozen v1 specs first (use web fetch or run `curl -sS` in terminal):
- Single-URL Master Bundle: https://apps.vib.tools/llms-full.txt
- Frozen JSON Schema: https://apps.vib.tools/schemas/vibtools-app.schema.json
If you cannot fetch these URLs, STOP immediately and ask me to paste them — NEVER guess or invent schema fields.

Perform a strict forensic audit and fix of `.vibtools/apps/` in this repository:
1. Validate `.vibtools/apps/app.config.json` strictly against Frozen v1 (`schemaVersion: 1`, `additionalProperties: false`):
   - Reject and remove/migrate any unknown root keys (e.g. `description` -> `tagline`/`features.md`, `license` -> `access: "Free" | "Paid" | "Forge"` where `Forge` = third-party / reverse-engineered utility).
   - Reject and flatten any invalid nested version structures (e.g. `versions.<ver>.artifacts[]` or `versions.<ver>.platforms` -> flat `url`, `size`, `sha256`, `released_at`, `installer`, `channel`, `deprecated` directly on `versions.<ver>`, with `platforms` and `architectures` at root).
   - Validate optional `dependencies[]` (Companion Tools) if present: non-empty array of `{ name, url, version?, note?, required? }` with strict `https://` URLs and zero unknown keys (omit `dependencies` if none apply).
   - Verify lowercase `slug`, exact `latest` key match, calendar-valid `YYYY-MM-DD` `released_at`, valid 64-hex `sha256` (or omitted), valid HTTPS `icon` (use repo logo raw HTTPS URL or uploaded asset if available), and safe repo-relative `docs` paths.
2. Live-probe every `https://` URL (`versions.<ver>.url`, root/per-version `installer`, `icon`, `dependencies[].url`, `links.*`) via `curl -sSI` when network is available; fix or remove any 404/broken URLs (never keep a 404 remote `installer`).
3. Audit installer hosting & script hygiene:
   - If a verified R2 master installer URL exists (e.g. `https://dl.vib.tools/<App>/installer.ps1`), root `installer.script` may point directly to it so the repo stays clean without `.vibtools/apps/installer.ps1`.
   - Verify the active master/override installer script (saved as UTF-8 without BOM) cleanly uses `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME`, handles optional leading `v` safely, and works with both `get.vib.tools/<slug>[/<version>]` and `?download=1`.
4. Verify `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` match the real app and every version listed in `versions` with consistent SHA256/requirements.
5. Run a programmatic JSON & Frozen v1 key-whitelist check, fix every HTTP 422/403/404 risk, and report a pass/fail summary against all 12 checklist items.
```

## 3. Hard Frozen Schema Invariants (`schemaVersion: 1`)

Violating any rule below triggers HTTP `422 Unprocessable Entity` in `validateAppConfig()` and excludes the app from `apps.vib.tools`:

- **Closed Object Contract:** `additionalProperties: false` on root and every `versions.<key>` entry — zero invented or misspelled keys (e.g. always `released_at`, never `releaseDate`).
- **Schema Declaration:** Include `"$schema": "https://apps.vib.tools/schemas/vibtools-app.schema.json"` and `"schemaVersion": 1`.
- **Required Root Keys:** `slug` (strict lowercase `^[a-z0-9][a-z0-9-_]{0,63}$`), `name` (1–80 chars), `latest` (exact key in `versions`), and non-empty `versions`.
- **Version Keys:** Every key in `versions` must match `^[vV]?[0-9][0-9A-Za-z._+-]{0,47}$` (must begin with a digit after optional `v`).
- **Calendar-Valid Dates:** `released_at` must be a real `YYYY-MM-DD` calendar date (e.g. `"2026-02-31"` is rejected).
- **Strict Hashes & HTTPS:** `sha256` must be 64 hex chars; `url`, `icon`, `screenshots`, `dependencies[].url`, and `links` must use strict `https://` (no embedded credentials).
- **Access / Origin Tiers:** `access` must be `"Free"` (first-party free/OSS), `"Paid"` (first-party commercial), or `"Forge"` (curated third-party / reverse-engineered utility).
- **Optional Companion Tools (`dependencies`):** When present, must be a non-empty array of `{ name, url, version?, note?, required? }` objects (renders the conditional **Companion Tools** card on `/app/<slug>`).
- **Trusted Hosts Only:** Binary `url` must point to `dl.vib.tools`, `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com` (or `ALLOWED_DOWNLOAD_HOSTS`). Remote `installer` URLs may also use `raw.githubusercontent.com`.
- **Path Safety & Uniqueness:** Installer/doc repo paths must never contain `..` traversal or non-`https://` URI schemes; `platforms` and `architectures` must contain unique non-empty strings.

## 4. Zero-Config Onboarding via `registry.json`

Once `.vibtools/apps/` is committed to the app repository, onboarding into `vib-apps-hub` requires adding only the GitHub repository URL to `registry.json`:

```json
[
  "https://github.com/owner/repo"
]
```

`apps.vib.tools` automatically parses the repository URL, fetches `.vibtools/apps/app.config.json`, validates it against Frozen Schema v1, discovers the app's `slug` (even if it differs from the GitHub repo name), loads `features.md` / `changelog.md`, and activates both `get.vib.tools/<slug>[/<version>]` and `get.vib.tools/dl/<slug>[/<version>]`.

## 5. Mandatory 12-Point Verification Checklist

1. `.vibtools/apps/app.config.json` is valid UTF-8 JSON (no comments, no trailing commas).
2. `"$schema"` is `"https://apps.vib.tools/schemas/vibtools-app.schema.json"` and `"schemaVersion"` is `1`.
3. Every root key and version key belongs to the exact frozen key set.
4. `"slug"` is strictly lowercase matching `^[a-z0-9][a-z0-9-_]{0,63}$`.
5. `"latest"` matches an exact own key inside `"versions"`.
6. Every key in `"versions"` starts with a digit after optional `v`.
7. Every version `"url"` is `https://` on a trusted download host.
8. Every `"released_at"` is a real calendar `"YYYY-MM-DD"` date.
9. Every `"sha256"` (if present) is an exact 64-character hex string.
10. Root and per-version `"installer"` targets and `"docs"` paths contain no `..` traversal and use valid repo paths or trusted `https://` URLs.
11. The active master installer script (R2-hosted HTTPS URL or repo `.vibtools/apps/installer.ps1`, UTF-8 without BOM) dynamically uses `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME`.
12. `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` exist with clean Markdown headings and zero raw unsafe HTML.

## Related Guides

- [App Onboarding & `.vibtools/` Schema](./03-app-onboarding.md)
- [Store API & Edge Routing Reference](./04-api-and-edge-routing.md)
- [Security, Validation & Audited Findings](./05-security-and-validation.md)
