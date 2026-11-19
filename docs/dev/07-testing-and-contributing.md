---
title: "Testing & Contributing"
description: "Run all automated Node.js tests and syntax checks, follow zero-build UI and security guardrails, and keep documentation synchronized."
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

### Full Automated Test Suite (All 12 Tests)

Run both test files together:

```bash
node --test server.test.js public/lib/appMeta.test.js
```

> **Note:** `npm test` executes `node --test server.test.js` (7 tests only). Always include `public/lib/appMeta.test.js` to verify all 12 tests.

### Test Coverage Breakdown

| Test File | Tests | Verified Behaviors |
| :--- | :---: | :--- |
| `server.test.js` | 7 | `isValidSlug()` traversal rejection, `mockData.js` catalog integrity, `GET /api/apps` Mode A fallback JSON, `GET /api/apps?slug=calgrid` Mode B detail + docs, SPA `/app/calgrid` 200 OK HTML fallback, `get.vib.tools` PowerShell `$APP_SLUG`/`$APP_VERSION` injection + version normalization, and `/dl/` 302 redirect. |
| `public/lib/appMeta.test.js` | 5 | `getAppMonogram()`, `getPackageFormat()`, `formatReleaseDate()`, `formatVersionLabel()` / `buildInstallCommand()` / `buildDownloadUrl()`, and `filterApps()` / `computeCategoryCounts()`. |

## 2. Repository Guardrails for Contributors

Contributions must adhere strictly to `AGENTS.md` and `project/DESIGN_SYSTEM.md`:

1. **Zero-Build Stack Lock:** Pure HTML5, tokenized CSS (`public/styles/tokens.css` & `public/styles/globals.css`), and native ES Modules (`type="module"`). Do not introduce React, Vue, Vite, Webpack, or build compilation steps.
2. **Global Component Single Source of Truth:** Import all UI primitives from `public/components/ui/` and layouts from `public/components/layout/`. Avoid inline `style="..."` attributes and page-scoped CSS.
3. **Flat Surface & Typography Discipline:** Keep `"Segoe UI", system-ui, -apple-system, sans-serif` for UI text, monospace strictly for commands/versions/SHA256, zero `box-shadow`, `4px` (`--radius-sm`) for buttons/inputs/badges, and `6px` (`--radius-md`) for cards/modals.
4. **Dual-Theme Parity:** Every visual token must have matching definitions under `[data-theme="dark"]` and `[data-theme="light"]` in `public/styles/tokens.css`.
5. **Security Rules:**
   - Never expose `GITHUB_TOKEN` outside `functions/`.
   - Sanitize all rendered Markdown through `DOMPurify.sanitize(marked.parse(...))`.
   - Validate slugs and paths against traversal before querying GitHub or reading local files.
6. **Service Worker Cache Versioning:** When adding or renaming files under `public/`, update `STATIC_ASSETS` and bump `CACHE_NAME` in `public/sw.js` (currently `vib-apps-hub-v2`).

## 3. Documentation Maintenance Rules

- End-user docs live in `docs/users/` (`docs.vib.tools`) and developer docs live in `docs/dev/` (`developer.vibtools.io`), routed via `.vibtools/docs.config.json`.
- Keep YAML frontmatter valid (`title`, `description`, `order`, unquoted boolean `draft: false`) and ensure relative links inside `docs/users/` and `docs/dev/` stay strictly within their respective target `docsPath`.
- Update `docs/MANIFEST.md` whenever files inside `docs/` are added, renamed, or removed.

## Related Guides

- [Codebase Structure & Module Inventory](./02-codebase-structure.md)
- [Security, Validation & Audited Findings](./05-security-and-validation.md)
- [Local Setup & Cloudflare Deployment](./06-local-setup-and-deployment.md)
