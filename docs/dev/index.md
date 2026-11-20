---
title: "Vib Apps Developer Guide"
description: "Complete architectural, Frozen Schema v1, API, security, onboarding, AI playbook, and deployment documentation for the vib-apps-hub codebase."
version: "1.0.0"
order: 0
draft: false
---

# Vib Apps Developer Guide

`vib-apps-hub` is a **zero-build, config-driven** web storefront and edge installer platform deployed on **Cloudflare Pages** and **Cloudflare Pages Functions** (with a built-in zero-dependency Node.js 22 edge emulator for local development).

A single repository powers two public hostnames:

- **`apps.vib.tools`** — Pure HTML5 + Custom Tokenized CSS + Vanilla ES Module Single Page Application (`public/`), `/api/apps`, and public Frozen Schema / AI specifications (`/llms.txt`, `/schemas/vibtools-app.schema.json`, `/vib-apps-engine/*`).
- **`get.vib.tools`** — Edge wildcard router (`functions/[[path]].js`) streaming PowerShell installer scripts (with per-version override support) and issuing `302` direct binary redirects to Cloudflare R2 (`dl.vib.tools`) or GitHub Releases.

## Verified Technology Stack

| Layer | Actual Implementation | Verified Source |
| :--- | :--- | :--- |
| **Frontend Runtime** | Pure HTML5 + Vanilla ES Modules (`type="module"`) | `public/index.html`, `public/app.js` |
| **Styling System** | Custom CSS Custom Properties + BEM-style utility/component classes (zero Tailwind CDN, zero build step) | `public/styles/tokens.css`, `public/styles/globals.css` |
| **Iconography** | Inline SVG definitions rendered via `Icon(name, size)` (zero external icon CDN) | `public/components/ui/Icon.js` |
| **Markdown & XSS** | `marked@15.0.7` + `dompurify@3.2.4` via jsDelivr CDN with `<pre>` offline fallback | `public/index.html`, `public/components/sections/AppDetailView.js` |
| **Frozen Schema Engine** | Draft 2020-12 JSON Schema (`schemaVersion: 1`) + strict runtime parity validator | `public/schemas/vibtools-app.schema.json`, `functions/_lib/github.js` |
| **Edge Compute** | Cloudflare Pages Functions (`onRequestGet`, `onRequestOptions`) | `functions/api/apps.js`, `functions/[[path]].js` |
| **Edge Caching** | Cloudflare Cache API (`caches.default`, 300s TTL, live-only) + Node.js in-memory polyfill | `functions/_lib/github.js`, `functions/api/apps.js`, `server.js` |
| **Data Model** | 100% Pure Repo-Only config-driven (URL-only `registry.json` + GitHub Contents API, zero mock fallback); **no SQL/NoSQL database** | `registry.json`, `functions/_lib/github.js` |
| **Local Dev & Tests** | Node.js 22 HTTP edge emulator (`server.js`, port `3000`) + native `node:test` (`npm test`) | `server.js`, `server.test.js`, `public/lib/appMeta.test.js` |

## Developer Documentation Map

1. [System Architecture & Data Flow](./01-architecture.md) — Mermaid architecture diagrams, dual-domain dispatch, multi-layer caching, and PWA lifecycle.
2. [Codebase Structure & Module Inventory](./02-codebase-structure.md) — Complete file-by-file inventory of `functions/`, `public/`, `server.js`, and assets.
3. [App Onboarding & `.vibtools/` Schema](./03-app-onboarding.md) — Authoritative Frozen Schema v1 (`.vibtools/apps/app.config.json`), per-version installers, and URL-only `registry.json`.
4. [Store API & Edge Routing Reference](./04-api-and-edge-routing.md) — Exact HTTP contracts, domain isolation, edge caching, version normalization, and public AI/Schema endpoints.
5. [Security, Validation & Audited Findings](./05-security-and-validation.md) — Secret isolation, host allowlists, Frozen v1 strict invariants, DOMPurify sanitization, and resolved audit record.
6. [Local Setup & Cloudflare Deployment](./06-local-setup-and-deployment.md) — Running `server.js` or Wrangler locally, Cloudflare Pages zero-build deployment, secrets, domains, and R2 layout.
7. [Testing & Contributing](./07-testing-and-contributing.md) — Running `npm test` and `npm run lint`, zero-build UI guardrails, and documentation sync rules.
8. [Vib Apps Engine AI Guide & Frozen Schema Playbook](./08-vib-apps-engine-ai-guide.md) — Shareable AI-readable URLs, ready-to-paste AI prompt, hard invariants, and 12-point checklist.
