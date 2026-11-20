---
title: "Security, Validation & Audited Findings"
description: "Verified security controls, Frozen Schema v1 validation invariants, trusted host allowlists, XSS defenses, and audit status across vib-apps-hub."
order: 5
draft: false
---

# Security, Validation & Audited Findings

This document catalogs every live security control, strict schema validation rule, and resolved audit finding verified directly against the current codebase.

## 1. Implemented Security Controls

| Control Area | Implementation | Source Location |
| :--- | :--- | :--- |
| **Server-Side Secret Isolation** | `GITHUB_TOKEN` is read exclusively from `env.GITHUB_TOKEN` inside Pages Functions and sent as `Authorization: Bearer <token>` to `api.github.com`. Never serialized to clients, JSON responses, logs, or `public/`. | `functions/_lib/github.js` (`fetchRepoFile`) |
| **Strict Slug & Repo Identifier Validation** | `isValidSlug()` enforces `/^[a-z0-9][a-z0-9-_]{0,63}$/i` on API/edge inputs. Frozen v1 configs enforce strictly lowercase `^[a-z0-9][a-z0-9-_]{0,63}$`. `parseRepoIdentifier()` accepts only `github.com` / `www.github.com` URLs or `owner/repo` shorthands with safe segment characters (`^[A-Za-z0-9._-]+$`) and rejects `.` / `..`. | `functions/_lib/github.js` (`isValidSlug`, `parseRepoIdentifier`) |
| **Directory Traversal & Percent-Encoding Protection** | `functions/[[path]].js` catches malformed percent-encoding (`URIError`) and returns `400 Bad Request`. `fetchRepoFile()` and `hasPathTraversal()` decode paths and reject any `..` segment with `400`/`422`; every path segment is individually `encodeURIComponent`-encoded before querying GitHub. `server.js` enforces `fullPath.startsWith(PUBLIC_DIR)` (`403 Forbidden`). | `functions/_lib/github.js`, `functions/[[path]].js`, `server.js` |
| **Trusted Host Allowlists (Open Redirect & SSRF Guard)** | `isTrustedDownloadUrl()` restricts `/dl/` 302 redirects to HTTPS URLs without credentials on `dl.vib.tools`, `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, or `env.ALLOWED_DOWNLOAD_HOSTS` (`403` otherwise). `isTrustedInstallerUrl()` applies the same allowlist plus `raw.githubusercontent.com` for remote installer scripts (`403` otherwise). | `functions/_lib/github.js`, `functions/[[path]].js` |
| **PowerShell Variable Sanitization** | Before prepending `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` to streamed installer scripts, `$APP_SLUG` and `$APP_VERSION` strip `/[^a-zA-Z0-9._-]/g`, and `$APP_NAME` strips `/[^a-zA-Z0-9 ._-]/g`. | `functions/[[path]].js` (`onRequestGet`) |
| **Prototype-Chain Version Key Guard** | `resolveVersion()` uses `Object.hasOwn(versions, ...)` exclusively and Frozen v1 requires version keys to match `^[vV]?[0-9][0-9A-Za-z._+-]{0,47}$` — preventing `constructor`, `toString`, or `__proto__` collisions. | `functions/_lib/github.js`, `functions/[[path]].js` |
| **API Domain Isolation & Anti-Cache-Poisoning** | `/api/apps` returns `404` on `get.vib.tools`. Pure Repo-Only Mode serves strictly live GitHub repositories (zero mock fallback), and `caches.default` never caches empty catalogs (`Cache-Control: no-store`, `X-Cache-Status: BYPASS`, `X-Catalog-Source: live`). | `functions/api/apps.js`, `functions/[[path]].js` |
| **Catalog & Registry Deduplication** | `getRegistry()` deduplicates identical `repo@branch` entries (regardless of URL/shorthand form), and `GET /api/apps` deduplicates identical normalized `slug` values across different repositories (first valid entry wins). | `functions/_lib/github.js`, `functions/api/apps.js` |
| **XSS Prevention (Markdown, Modal & Links)** | `AppDetailView.js` passes `marked.parse(rawMd)` through `DOMPurify.sanitize()` (with plain `.textContent` `<pre>` offline fallback). `Modal.js` sanitizes string `content`/`footer` with `DOMPurify.sanitize()`. External links enforce `rel="noopener noreferrer"` and `^https?://`; screenshots enforce `^https://`. | `public/components/sections/AppDetailView.js`, `public/components/ui/Modal.js`, `public/components/ui/Button.js` |
| **No Client Auth / No Tracking Cookies** | Zero authentication tokens, session cookies, or analytics scripts. Browser storage is strictly limited to `localStorage.getItem("vib_theme")`. | `public/lib/theme.js` |

## 2. Frozen Schema v1 Validation Invariants (`validateAppConfig()`)

When a repository declares `"schemaVersion": 1` in `.vibtools/apps/app.config.json`, `validateAppConfig()` in `functions/_lib/github.js` enforces 100% parity with `public/schemas/vibtools-app.schema.json` (returning HTTP `422` on any violation):

1. **Closed Schema (`additionalProperties: false`):** Any unrecognized key on the root object or inside `versions.<key>` is rejected.
2. **Required Root Fields:** `slug` (lowercase `^[a-z0-9][a-z0-9-_]{0,63}$`), `name` (1–80 chars), `latest` (must match an **exact** own key inside `versions`), and non-empty `versions` map.
3. **Version Key & Release Field Checks:**
   - Every version key matches `^[vV]?[0-9][0-9A-Za-z._+-]{0,47}$`.
   - `url` is mandatory and must start with `https://`.
   - `released_at` (optional) must be a real ISO calendar date `YYYY-MM-DD` (impossible dates like `"2026-02-31"` are rejected; leap dates like `"2024-02-29"` are accepted).
   - `sha256` (optional) must match `^[a-fA-F0-9]{64}$`.
   - `size` (optional) must be a 1–32 char string; `channel` must be `"stable" | "beta" | "alpha"`; `deprecated` must be boolean.
4. **Installer & Docs Path Safety:**
   - Root `installer` and per-version `versions.<k>.installer` reject `..` traversal segments and reject any non-`https://` URI scheme (`http://`, `javascript:`, `ftp:`, etc.). Allowed `installer.type` values: `"powershell"`, `"bash"`, `"sh"`, `"cmd"`.
   - `docs.features` and `docs.changelog` must be safe repo-relative paths without `..` traversal or URI schemes.
5. **Optional Metadata Parity:**
   - `platforms` and `architectures` must be arrays of non-empty **unique** strings (`uniqueItems: true`).
   - `requirements` must be a non-empty string array (`minItems: 1`) or non-empty string-valued object.
   - `icon`, `screenshots`, and `links` values must start with `https://`.

## 3. Historical Audit Remediation Record

All five legacy findings from the initial pre-hardening audit have been fully resolved and locked under automated regression tests in `server.test.js`:

| Former Finding | Resolution Verified in Code |
| :--- | :--- |
| Uninjected `$APP_NAME` in installer scripts | **Resolved:** `functions/[[path]].js` injects sanitized `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` before streaming every script. |
| No-op OS / Architecture `<select>` controls | **Resolved:** Replaced with clean read-only specification rows (`Platforms`, `Architectures`) in `AppDetailView.js`. |
| `/dl/` lacked trusted host allowlist | **Resolved:** Enforced `isTrustedDownloadUrl()` (`403` on untrusted hosts, HTTP, or credentialed URLs) and `isTrustedInstallerUrl()` for remote installer scripts. |
| `npm test` omitted `appMeta.test.js` | **Resolved:** `package.json` runs `node --test server.test.js public/lib/appMeta.test.js` in a single command. |
| Dead files in `public/` (`styles.css`, `site.webmanifest`, `assets/aistudio`) | **Resolved:** Unused non-runtime files removed and verified by automated regression assertions; `Modal.js` retained as an active UI primitive. |

## Related Guides

- [App Onboarding & `.vibtools/` Schema](./03-app-onboarding.md)
- [Store API & Edge Routing Reference](./04-api-and-edge-routing.md)
- [Testing & Contributing](./07-testing-and-contributing.md)
- [Vib Apps Engine AI Guide & Playbook](./08-vib-apps-engine-ai-guide.md)
