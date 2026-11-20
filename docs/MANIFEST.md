# Documentation Manifest (`docs/MANIFEST.md`)

> **Last Updated:** 2026-11-19  
> **Directory Scope:** Complete end-user guides (`docs.vib.tools`), developer & architecture documentation (`developer.vibtools.io`), technical references, and forensic coverage report for `vib-apps-hub`.

---

## File & Subfolder Registry

| Path / Name | Type | Status | Description |
| :--- | :--- | :--- | :--- |
| `index.md` | File | Active | Top-level documentation homepage and navigation hub. |
| `MANIFEST.md` | File | Active | Complete inventory and status registry for all files in `docs/`. |
| `README.md` | File | Active | Documentation directory purpose, authenticity principles, and tree overview. |
| `coverage-and-verification-report.md` | File | Active | Forensic audit coverage matrix, feature maturity table, reconciled mismatches, and verified findings. |
| `app-config-schema.md` | File | Active / Standard | Reconciled `.vibtools/apps/app.config.json` & `.vibtools/installer.ps1` specification. |
| `deployment.md` | File | Active / Guide | Reconciled Cloudflare Pages deployment, `GITHUB_TOKEN`, dual-domain binding, and R2 operations guide. |
| `users/index.md` | File | Active / `docs.vib.tools` | End-user portal root (`order: 0`, `version: 1.0.0`). |
| `users/01-getting-started.md` | File | Active / `docs.vib.tools` | First-time experience, routes, dark/light theme, and PWA installation (`order: 1`). |
| `users/02-browsing-and-filtering.md` | File | Active / `docs.vib.tools` | 3-zone cards, `/` search & `?q=`, category navigation, and license filtering (`order: 2`). |
| `users/03-cli-installer.md` | File | Active / `docs.vib.tools` | `get.vib.tools` PowerShell one-liners, version pinning, and direct `/dl/` downloads (`order: 3`). |
| `users/04-downloads-and-verification.md` | File | Active / `docs.vib.tools` | Two-column detail page, version selector, docs tabs, and SHA256 `Get-FileHash` verification (`order: 4`). |
| `users/05-workflows.md` | File | Active / `docs.vib.tools` | Task workflows and complete keyboard shortcut reference (`order: 5`). |
| `users/06-troubleshooting-and-faq.md` | File | Active / `docs.vib.tools` | Verified error states, offline behavior, clipboard fallback, and FAQ (`order: 6`). |
| `dev/index.md` | File | Active / `developer.vibtools.io` | Developer portal root, Frozen Schema v1 stack summary, and 8-guide navigation map (`order: 0`, `version: 1.0.0`). |
| `dev/01-architecture.md` | File | Active / `developer.vibtools.io` | System architecture, Mermaid diagrams, SPA lifecycle, 4-tier caching, and fallback flow (`order: 1`). |
| `dev/02-codebase-structure.md` | File | Active / `developer.vibtools.io` | Complete file-by-file and symbol-level module inventory (`order: 2`). |
| `dev/03-app-onboarding.md` | File | Active / `developer.vibtools.io` | Frozen Schema v1 `.vibtools/apps/app.config.json`, per-version installers, and URL-only `registry.json` (`order: 3`). |
| `dev/04-api-and-edge-routing.md` | File | Active / `developer.vibtools.io` | `/api/apps` Mode A/B contracts, domain isolation, `get.vib.tools` routing, version normalization, and public AI/Schema endpoints (`order: 4`). |
| `dev/05-security-and-validation.md` | File | Active / `developer.vibtools.io` | Secret isolation, host allowlists, Frozen v1 strict invariants, DOMPurify, and resolved audit record (`order: 5`). |
| `dev/06-local-setup-and-deployment.md` | File | Active / `developer.vibtools.io` | Node.js 22 `server.js` emulator, Wrangler, Cloudflare Pages, secrets, domains, and R2 (`order: 6`). |
| `dev/07-testing-and-contributing.md` | File | Active / `developer.vibtools.io` | Native `node:test` suites (`npm test`), syntax checks, UI guardrails (`vib-apps-hub-v3`), and doc sync rules (`order: 7`). |
| `dev/08-vib-apps-engine-ai-guide.md` | File | Active / `developer.vibtools.io` | Public AI-readable URLs, ready-to-paste AI agent prompt, hard schema invariants, and 12-point checklist (`order: 8`). |
| `reference/index.md` | File | Active | Technical reference hub. |
| `reference/configuration-reference.md` | File | Active | Complete configuration files, environment variables, scripts, and browser storage reference. |
| `reference/design-tokens-and-components.md` | File | Active | CSS tokens (`tokens.css`), breakpoints (`globals.css`), and UI primitives API (`components/ui/`). |
| `reference/dependencies.md` | File | Active | Zero-npm audit, pinned CDN scripts (`marked@15.0.7`, `dompurify@3.2.4`), and external services. |
| `reference/glossary.md` | File | Active | Canonical terminology and system identifiers. |
| `api/`, `features/`, `user-guide/` | Directories | Legacy Empty Scaffolds | Retained `.gitkeep` placeholders from initial repository scaffold (canonical content resides in `users/`, `dev/`, and `reference/`). |
