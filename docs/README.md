# Project Documentation (`docs/`)

> **Notice:** This directory is tracked in Git and serves as the authoritative, source-verified documentation suite for `vib-apps-hub` (`apps.vib.tools` & `get.vib.tools`). Start at [`docs/index.md`](./index.md).

---

## Core Principles

1. **100% Source-Verified Details:** Every route, UI control, configuration field, header, and error message is verified directly against the working codebase with zero speculation.
2. **Dual-Portal Vib Docs Engine Routing:** `.vibtools/docs.config.json` routes `docs/users/` to `docs.vib.tools` and `docs/dev/` to `developer.vibtools.io`. Each portal directory is self-contained with valid YAML frontmatter and internal relative links.
3. **Transparent Audit Findings:** Implemented, partially implemented, and unused modules are explicitly distinguished in [`coverage-and-verification-report.md`](./coverage-and-verification-report.md).

---

## Directory Structure

```text
docs/
├── index.md                                # Top-level documentation homepage
├── MANIFEST.md                             # Complete file & subfolder registry
├── README.md                               # Directory purpose & maintenance rules
├── coverage-and-verification-report.md     # Forensic audit matrix & verified findings
├── app-config-schema.md                    # Reconciled .vibtools/ app config standard
├── deployment.md                           # Reconciled Cloudflare Pages & R2 deployment guide
├── users/                                  # Vib Docs Engine target: docs.vib.tools
│   ├── index.md
│   ├── 01-getting-started.md
│   ├── 02-browsing-and-filtering.md
│   ├── 03-cli-installer.md
│   ├── 04-downloads-and-verification.md
│   ├── 05-workflows.md
│   └── 06-troubleshooting-and-faq.md
├── dev/                                    # Vib Docs Engine target: developer.vibtools.io
│   ├── index.md
│   ├── 01-architecture.md
│   ├── 02-codebase-structure.md
│   ├── 03-app-onboarding.md
│   ├── 04-api-and-edge-routing.md
│   ├── 05-security-and-validation.md
│   ├── 06-local-setup-and-deployment.md
│   └── 07-testing-and-contributing.md
└── reference/                              # Cross-cutting technical references
    ├── index.md
    ├── configuration-reference.md
    ├── design-tokens-and-components.md
    ├── dependencies.md
    └── glossary.md
```

---

## Maintenance Rules

- Keep every file inside `docs/users/` and `docs/dev/` compliant with `.vibtools/docs.config.json` (valid YAML frontmatter, unquoted boolean `draft: false`, unique normalized slugs, and relative links staying strictly inside their respective target `docsPath`).
- Update `docs/MANIFEST.md` whenever files are added, renamed, or deleted inside `docs/`.
- Never add typo manifest files (such as `MINIFEST.md`) inside `docs/`.
