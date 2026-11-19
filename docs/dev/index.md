---
title: "Vib Apps Developer Guide"
description: "Complete architectural, API, security, onboarding, and deployment documentation for the vib-apps-hub codebase."
version: "1.0.0"
order: 0
draft: false
---

# Vib Apps Developer Guide

`vib-apps-hub` is a **zero-build, config-driven** web storefront and edge installer platform deployed on **Cloudflare Pages** and **Cloudflare Pages Functions** (with a built-in zero-dependency Node.js 22 edge emulator for local development).

A single repository powers two public hostnames:

- **`apps.vib.tools`** — Pure HTML5 + Custom Tokenized CSS + Vanilla ES Module Single Page Application (`public/`) backed by `/api/apps`.
- **`get.vib.tools`** — Edge wildcard router (`functions/[[path]].js`) streaming PowerShell installer scripts and issuing `302` direct binary redirects to Cloudflare R2 (`dl.vib.tools`).

## Verified Technology Stack

| Layer | Actual Implementation | Verified Source |
| :--- | :--- | :--- |
| **Frontend Runtime** | Pure HTML5 + Vanilla ES Modules (`type="module"`) | `public/index.html`, `public/app.js` |
| **Styling System** | Custom CSS Custom Properties + BEM-style utility/component classes (zero Tailwind CDN, zero build step) | `public/styles/tokens.css`, `public/styles/globals.css` |
| **Iconography** | 27 inline SVG definitions rendered via `Icon(name, size)` (zero external icon CDN) | `public/components/ui/Icon.js` |
| **Markdown & XSS** | `marked@15.0.7` + `dompurify@3.2.4` via jsDelivr CDN with `<pre>` offline fallback | `public/index.html`, `public/components/sections/AppDetailView.js` |
| **Edge Compute** | Cloudflare Pages Functions (`onRequestGet`, `onRequestOptions`) | `functions/api/apps.js`, `functions/[[path]].js` |
| **Edge Caching** | Cloudflare Cache API (`caches.default`, 300s TTL) + Node.js in-memory polyfill | `functions/_lib/github.js`, `functions/api/apps.js`, `server.js` |
| **Data Model** | Config-driven (`registry.json` + GitHub Contents API + `mockData.js` fallback); **no SQL/NoSQL database** | `registry.json`, `functions/_lib/github.js`, `functions/_lib/mockData.js` |
| **Local Dev & Tests** | Node.js 22 HTTP edge emulator (`server.js`, port `3000`) + native `node:test` | `server.js`, `server.test.js`, `public/lib/appMeta.test.js` |

## Developer Documentation Map

1. [System Architecture & Data Flow](./01-architecture.md) — Mermaid architecture diagrams, dual-domain dispatch, multi-layer caching, and PWA lifecycle.
2. [Codebase Structure & Module Inventory](./02-codebase-structure.md) — Complete file-by-file inventory of `functions/`, `public/`, `server.js`, and assets.
3. [App Onboarding & `.vibtools/` Schema](./03-app-onboarding.md) — Authoritative `.vibtools/apps/app.config.json` contract, `.vibtools/installer.ps1` variables, and `registry.json`.
4. [Store API & Edge Routing Reference](./04-api-and-edge-routing.md) — Exact HTTP contracts, status codes, CORS headers, version normalization, and SPA fallback logic.
5. [Security, Validation & Audited Findings](./05-security-and-validation.md) — Secret isolation, traversal/slug guards, DOMPurify sanitization, and verified implementation gaps.
6. [Local Setup & Cloudflare Deployment](./06-local-setup-and-deployment.md) — Running `server.js` or Wrangler locally, Cloudflare Pages zero-build deployment, secrets, domains, and R2 layout.
7. [Testing & Contributing](./07-testing-and-contributing.md) — Running all 12 `node:test` cases, syntax checks, zero-build UI guardrails, and documentation sync rules.
