---
title: "Testing & Contributing"
description: "Run the full automated Node.js test suite and syntax checks, follow zero-build UI and security guardrails, and keep documentation synchronized."
order: 7
draft: false
---

# Testing & Contributing

`vib-apps-hub` uses Node.js 22's built-in test runner (`node:test`) and syntax validator (`node --check`) with zero external test frameworks.

## 1. Running Automated Tests & Syntax Checks

### Syntax & Build Validation

```bash
npm run build
# Equivalent to npm run lint:
# node --check server.js && node --check public/app.js && node --check functions/api/apps.js && node --check "functions/[[path]].js"
```

### Full Automated Test Suite

Run both backend/edge and frontend helper suites with a single command:

```bash
npm test
# Runs: node --test server.test.js public/lib/appMeta.test.js
```

### Test Coverage Breakdown

| Test File | Verified Behaviors |
| :--- | :--- |
| `server.test.js` | Slug validation, mock catalog engine, Mode A & Mode B `/api/apps` (live/mock isolation, caching, slug deduplication), SPA routing & dot-containing routes, `get.vib.tools` PowerShell injection (`$APP_SLUG`, `$APP_VERSION`, `$APP_NAME`), trusted host allowlists (`isTrustedDownloadUrl`, `isTrustedInstallerUrl`), Frozen v1 `validateAppConfig()` parity (calendar dates, `uniqueItems`, traversal/scheme blocks, prototype keys, `additionalProperties: false`), URL-only `registry.json` auto-discovery (`parseRepoIdentifier`, `getRegistry`, `resolveAppBySlug`), per-version installer inheritance/overrides, `public/sw.js` precache integrity, and all public AI/SEO endpoints (`/llms.txt`, `/schemas/vibtools-app.schema.json`, `/vib-apps-engine/*`, `/robots.txt`, `/sitemap.xml`). |
| `public/lib/appMeta.test.js` | `getAppMonogram()`, `getPackageFormat()`, `formatReleaseDate()`, `formatVersionLabel()`, `buildInstallCommand()`, `buildDownloadUrl()`, `filterApps()`, `computeCategoryCounts()`, and edge-case formatting/sorting helpers. |

## 2. Repository Guardrails for Contributors

Contributions must adhere strictly to `AGENTS.md` and `project/DESIGN_SYSTEM.md`:

1. **Zero-Build Stack Lock:** Pure HTML5, tokenized CSS (`public/styles/tokens.css` & `public/styles/globals.css`), and native ES Modules (`type="module"`). Do not introduce React, Vue, Vite, Webpack, or build compilation steps.
2. **Global Component Single Source of Truth:** Import all UI primitives from `public/components/ui/` and layouts from `public/components/layout/`. Avoid inline `style="..."` attributes and page-scoped CSS.
3. **Flat Surface & Typography Discipline:** Keep `"Segoe UI", system-ui, -apple-system, sans-serif` for UI text, monospace strictly for commands/versions/SHA256, zero `box-shadow`, `4px` (`--radius-sm`) for buttons/inputs/badges, and `6px` (`--radius-md`) for cards/modals.
4. **Dual-Theme Parity:** Every visual token must have matching definitions under `[data-theme="dark"]` and `[data-theme="light"]` in `public/styles/tokens.css`.
5. **Security Rules:**
   - Never expose `GITHUB_TOKEN` outside `functions/`.
   - Sanitize all rendered Markdown through `DOMPurify.sanitize(marked.parse(...))`.
   - Validate slugs, version keys, paths, and redirect/installer hosts before querying GitHub or redirecting.
6. **Service Worker Cache Versioning:** When adding or renaming files under `public/`, update `STATIC_ASSETS` and bump `CACHE_NAME` in `public/sw.js` (currently `vib-apps-hub-v3`).

## 3. Documentation Maintenance Rules

- End-user docs live in `docs/users/` (`docs.vib.tools`) and developer docs live in `docs/dev/` (`developer.vibtools.io`), routed via `.vibtools/docs.config.json`.
- Public AI-readable & SEO specifications live in `public/llms.txt`, `public/schemas/vibtools-app.schema.json`, and `public/vib-apps-engine/`. Keep them synchronized with `docs/dev/` whenever schema or routing behavior changes.
- Keep YAML frontmatter valid (`title`, `description`, `order`, unquoted boolean `draft: false`) and ensure relative links inside `docs/users/` and `docs/dev/` stay strictly within their respective target `docsPath`.
- Update `docs/MANIFEST.md` whenever files inside `docs/` are added, renamed, or removed.

## Related Guides

- [Codebase Structure & Module Inventory](./02-codebase-structure.md)
- [Security, Validation & Audited Findings](./05-security-and-validation.md)
- [Local Setup & Cloudflare Deployment](./06-local-setup-and-deployment.md)
- [Vib Apps Engine AI Guide & Playbook](./08-vib-apps-engine-ai-guide.md)
