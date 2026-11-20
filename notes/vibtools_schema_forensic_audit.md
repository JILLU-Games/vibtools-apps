# Forensic Audit Report — Frozen `.vibtools/apps/app.config.json` Schema, Auto-Collection Pipeline & AI/SEO Setup Docs

> **Audit Date:** 2026-11-19 (Pass 1 + Pass 2 Deep Forensic Hardening)  
> **Scope:** `public/schemas/vibtools-app.schema.json`, `functions/_lib/github.js`, `functions/api/apps.js`, `functions/[[path]].js`, `public/components/sections/AppDetailView.js`, `server.js`, `public/index.html`, `public/vib-apps-engine/*`, `public/llms.txt`, `public/robots.txt`, `public/sitemap.xml`, and `docs/dev/*`.  
> **Status:** All Audited Defects (Pass 1 & Pass 2) Verified & Remediated

---

## 1. Forensic Audit Summary

| Audit Domain | Findings Identified | Severity | Remediation Status |
| :--- | :---: | :---: | :---: |
| **A. Frozen JSON Schema (`vibtools-app.schema.json`)** | 1 (`VERSION_KEY_RE` matched prototype words like `constructor`) | High | **Fixed & Tested** |
| **B. Runtime Validator (`validateAppConfig()`) Parity** | 7 (Pass 1: lowercase slug, exact `latest`, optional field type/HTTPS checks, `size` bounds; Pass 2: calendar-valid `released_at`, `uniqueItems` on `platforms`/`architectures`, traversal & non-HTTPS scheme rejection on `installer` & `docs`) | High | **Fixed & Tested** |
| **C. Repo URL Auto-Collection (`github.js`, `api/apps.js`, `[[path]].js`)** | 3 (Pass 1: duplicate `registry.json` entries, unencoded path segments in `fetchRepoFile`; Pass 2: Mode A cross-repo duplicate `slug` deduplication in `api/apps.js`) | Medium | **Fixed & Tested** |
| **D. Frontend Consumer (`AppDetailView.js`)** | 3 (per-version installer label, safe `selectedVersion` lookup, `https://` screenshot guard) | Medium | **Fixed & Tested** |
| **E. Setup Docs, AI Readability & SEO Discoverability** | 6 (Pass 1: stale `03-app-onboarding.md`, missing `/llms.txt`, missing `robots.txt`/`sitemap.xml`/JSON-LD, missing dedicated A–Z + AI playbook; Pass 2: stale `docs/dev/04`, `05`, `07`, `index.md`, plus dedicated `docs/dev/08-vib-apps-engine-ai-guide.md`) | High | **Fixed & Verified** |

---

## 2. Detailed Code-Proof Findings & Fixes

### Finding A1 — Version Key Regex Allowed Prototype Chain Identifiers (HIGH)
- **Evidence:** Both `public/schemas/vibtools-app.schema.json` (`patternProperties`) and `functions/_lib/github.js` (`VERSION_KEY_RE`) previously used `^[vV]?[0-9A-Za-z][0-9A-Za-z._+-]{0,47}$`, which matched non-numeric words like `"constructor"` and `"toString"`.
- **Fix:** Tightened both JSON Schema and `VERSION_KEY_RE` to `^[vV]?[0-9][0-9A-Za-z._+-]{0,47}$`, guaranteeing every version key begins with a digit (with optional `v`/`V` prefix).

### Finding B1 (Pass 1) — Schema-to-Runtime Validation Parity Gaps in `validateAppConfig()` (HIGH)
- **Evidence:** When `schemaVersion === 1`, `validateAppConfig()` previously did not enforce:
  1. Strict lowercase `slug` (`^[a-z0-9][a-z0-9-_]{0,63}$`) matching JSON Schema (`isValidSlug()` used `/i`).
  2. Exact key match `Object.hasOwn(config.versions, config.latest)` (allowing `"1.0.3"` vs `"v1.0.3"` drift).
  3. Type/HTTPS checks on optional root fields (`$schema`, `tagline`, `category`, `platforms`, `architectures`, `requirements`, `screenshots`, `links`) and `versions.<k>.size`.
- **Fix:** Implemented parity checks inside `validateAppConfig()` (`functions/_lib/github.js`) for frozen `schemaVersion: 1`, returning `422` on violations.

### Finding B2 (Pass 2) — Impossible ISO Dates, Non-Unique Arrays, and Config-Time Traversal/Scheme Bypass (HIGH)
- **Evidence:**
  1. `ISO_DATE_RE` only checked `/^\d{4}-\d{2}-\d{2}$/`, allowing impossible dates like `"2026-02-31"` into frozen v1 configs.
  2. `platforms` and `architectures` were validated as string arrays, but did not enforce `uniqueItems: true` from `vibtools-app.schema.json`.
  3. `validateInstallerSpec()` and `docs.*` accepted `"../secret.ps1"`, `"http://dl.vib.tools/install.ps1"`, or `"javascript:..."` at config validation time (deferring rejection until later runtime fetch).
- **Fix (`functions/_lib/github.js`):**
  1. Added `isValidIsoCalendarDate()` using `Date.UTC()` round-trip verification (rejects `"2026-02-31"`, accepts leap date `"2024-02-29"`).
  2. Enforced `new Set(arr).size === arr.length` on `platforms` and `architectures` in frozen v1.
  3. Added `hasPathTraversal()` and `validateInstallerTargetString()` so frozen v1 `installer` (root & per-version) and `docs.features` / `docs.changelog` fail fast with `422` on `..` traversal or non-`https://` URI schemes.

### Finding C1 (Pass 1) — Duplicate Registry Entries & Unencoded GitHub API Path Segments (MEDIUM)
- **Evidence:**
  1. `getRegistry()` previously returned duplicate entries if the same repo was listed twice in `registry.json` (e.g. `"https://github.com/owner/repo"` and `"owner/repo"`).
  2. `fetchRepoFile()` interpolated `cleanPath` directly into `https://api.github.com/repos/${repo}/contents/${cleanPath}` without per-segment URI encoding.
- **Fix:** Deduplicated `getRegistry()` by `${repo.toLowerCase()}@${branch}` and encoded every segment with `encodeURIComponent` in `fetchRepoFile()`.

### Finding C2 (Pass 2) — Mode A Cross-Repository Duplicate Slug Collision (MEDIUM)
- **Evidence:** In `functions/api/apps.js`, if two distinct GitHub repositories in `registry.json` declared the same `slug` inside `.vibtools/apps/app.config.json`, Mode A (`GET /api/apps`) emitted two duplicate catalog cards with conflicting `/app/<slug>` links.
- **Fix (`functions/api/apps.js`):** Added `seenSlugs` deduplication in Mode A so the first valid entry wins and duplicate slugs are skipped with a diagnostic warning.

### Finding D1 — Frontend Per-Version Installer Label & Screenshot HTTPS Guard (MEDIUM)
- **Evidence:** `AppDetailView.js` previously ignored per-version `versions[ver].installer.type`, lacked `^https://` guard on `app.screenshots`, and read `app.latest` without `Object.hasOwn()` check.
- **Fix:** Updated `AppDetailView.js` to resolve `verData.installer?.type || app.installer?.type` dynamically on version change, resolve `selectedVersion` safely, and enforce `^https://` on screenshot URLs.

### Finding E1 & E2 — Complete AI-Readable, SEO-Friendly & Developer Portal Documentation Sync (HIGH)
- **Evidence:**
  1. Pass 1: `docs/dev/03-app-onboarding.md` was stale, and `public/` lacked root `/llms.txt`, `/robots.txt`, `/sitemap.xml`, `/vib-apps-engine/ai-guide.md`, canonical URL, and JSON-LD.
  2. Pass 2: `docs/dev/04-api-and-edge-routing.md`, `docs/dev/05-security-and-validation.md`, `docs/dev/07-testing-and-contributing.md`, and `docs/dev/index.md` still contained pre-Cycle-2 contradictions (claiming `$APP_NAME` is uninjected, `/dl/` has no host allowlist, `npm test` runs 7 tests, `public/styles.css` exists, and `sw.js` uses `vib-apps-hub-v2`).
- **Fix:**
  1. Published full CORS-enabled (`*`) AI + SEO endpoints on `apps.vib.tools`: `/llms.txt`, `/llms-full.txt` (single-fetch master bundle), `/schemas/vibtools-app.schema.json` (`application/schema+json`), `/vib-apps-engine/llms.txt`, `/vib-apps-engine/vibtools-app-config.md`, `/vib-apps-engine/ai-guide.md`, `/robots.txt`, `/sitemap.xml`, and `public/index.html` canonical/llms/JSON-LD tags.
  2. Reconciled `docs/dev/03`, `04`, `05`, `07`, `index.md`, created dedicated `docs/dev/08-vib-apps-engine-ai-guide.md`, and updated `docs/MANIFEST.md`.

### Finding P3 (Pass 3 Deep Audit) — Malformed `https://` URLs, Multi-Branch Discovery, Semver `+` Metadata & Single-Fetch AI Bundle (MEDIUM-HIGH)
- **Evidence:**
  1. `validateAppConfig()` checked `.startsWith("https://")` without `new URL()` host parsing, allowing broken `"https://"` strings to pass validation.
  2. `resolveAppBySlug()` tracked `triedRepos` by `repo` alone instead of `repo@branch`, risking skipped lookup when two branches of the same repository were registered.
  3. `functions/[[path]].js` stripped `+` from `$APP_VERSION` (`[^a-zA-Z0-9._-]`), breaking valid Frozen Schema semver build metadata like `v1.0.3+build.42`.
  4. `public/schemas/vibtools-app.schema.json` lacked a JSON Schema `not.pattern` guard on `docs.features`/`docs.changelog` for `..` traversal and URI schemes.
  5. AI agents performing a single URL fetch benefited from a consolidated `/llms-full.txt` bundle alongside `/llms.txt`.
- **Fix:**
  1. Added `isValidHttpsUrl()` (`new URL` + `https:` + non-empty hostname) across `validateAppConfig()` and `validateInstallerTargetString()`.
  2. Keyed `triedRepos` in `resolveAppBySlug()` on `${repo.toLowerCase()}@${branch}`.
  3. Preserved `+` in `safeVersion` (`[^a-zA-Z0-9._+-]`) inside `functions/[[path]].js`.
  4. Added Draft 2020-12 `not.pattern` traversal/scheme guard to `docs.features` and `docs.changelog` in `vibtools-app.schema.json`.
  5. Published `public/llms-full.txt` with `CORS: *`, linked in `/llms.txt`, `/robots.txt`, `/sitemap.xml`, and added the A–Z Step Matrix (Task/Purpose/Usage) to `vibtools-app-config.md`.
