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

## 2. Ready-to-Paste Prompt for Any AI Coding Assistant

Paste this prompt into any AI coding agent inside your application's repository:

```text
Read https://apps.vib.tools/vib-apps-engine/llms.txt and https://apps.vib.tools/schemas/vibtools-app.schema.json completely.
Then inspect this repository and create a complete, strictly valid Vib Apps Engine v1 setup inside `.vibtools/apps/`:
1. `.vibtools/apps/app.config.json` (strict schemaVersion: 1, zero unknown keys, lowercase slug, exact `latest` key match, calendar-valid `released_at` YYYY-MM-DD, trusted HTTPS binary URLs, and per-version `installer` overrides if any version needs a separate installer script).
2. `.vibtools/apps/installer.ps1` (consuming injected `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` dynamically).
3. `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` (clean Markdown, zero unsafe raw HTML).
Verify every item in the 12-Point Self-Verification Checklist before finishing, and print the exact GitHub repository URL line to paste into `registry.json` in `vib-apps-hub`.
```

## 3. Hard Frozen Schema Invariants (`schemaVersion: 1`)

Violating any rule below triggers HTTP `422 Unprocessable Entity` in `validateAppConfig()` and excludes the app from `apps.vib.tools`:

- **Closed Object Contract:** `additionalProperties: false` on root and every `versions.<key>` entry — zero invented or misspelled keys (e.g. always `released_at`, never `releaseDate`).
- **Schema Declaration:** Include `"$schema": "https://apps.vib.tools/schemas/vibtools-app.schema.json"` and `"schemaVersion": 1`.
- **Required Root Keys:** `slug` (strict lowercase `^[a-z0-9][a-z0-9-_]{0,63}$`), `name` (1–80 chars), `latest` (exact key in `versions`), and non-empty `versions`.
- **Version Keys:** Every key in `versions` must match `^[vV]?[0-9][0-9A-Za-z._+-]{0,47}$` (must begin with a digit after optional `v`).
- **Calendar-Valid Dates:** `released_at` must be a real `YYYY-MM-DD` calendar date (e.g. `"2026-02-31"` is rejected).
- **Strict Hashes & HTTPS:** `sha256` must be 64 hex chars; `url`, `icon`, `screenshots`, and `links` must use `https://`.
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
11. `.vibtools/apps/installer.ps1` dynamically uses `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME`.
12. `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` exist with clean Markdown headings and zero raw unsafe HTML.

## Related Guides

- [App Onboarding & `.vibtools/` Schema](./03-app-onboarding.md)
- [Store API & Edge Routing Reference](./04-api-and-edge-routing.md)
- [Security, Validation & Audited Findings](./05-security-and-validation.md)
