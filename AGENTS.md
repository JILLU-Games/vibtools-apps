# AGENTS.md — AI Agent Operating Instructions & Repository Guardrails

> **Scope:** These rules govern all AI coding agents, software engineers, and automated tools working on the `vib-apps-hub` (`apps.vib.tools` & `get.vib.tools`) codebase. Every agent must strictly adhere to these mandates during all phases of development.

---

## 1. Core Operating Principles & Guardrails (কঠোর নীতিমালা)

### A. Single Source of Truth
- **Mandatory Pre-Flight Read:** Before proposing, designing, or modifying any file, the agent **MUST** read and adhere to:
  1. `project/MISSION.md` (Project problem statement, mission, and functional usage)
  2. `project/ARCHITECTURE.md` (System architecture, edge routing, caching, and data flow)
  3. `project/DESIGN_SYSTEM.md` (Design tokens, geometry, color palette, and layout specifications)
  4. `MEMORY.md` (Active phase state, completed work, and architectural decisions)
- Never deviate from the architectures or design tokens locked in these documents.

### B. Zero-Freedom & Strict Scope Lock
- Implement **ONLY** the specific files, features, or fixes explicitly requested for the active phase.
- **NO Unrequested Improvements:** Do not refactor unrelated files, create premature abstractions, introduce extra dependencies, add speculative features, or perform cosmetic cleanups.
- A small task must remain a small task. Stop immediately once the requested scope is implemented and verified.

### C. Technology Stack Lock (Strict Zero-Build)
- **Frontend:** Pure HTML5, Tailwind CSS (loaded via CDN), and Vanilla JavaScript utilizing native ES Modules (`type="module"`).
  - **Forbidden:** React, Vue, Svelte, Next.js, Vite, Webpack, Bun/Rollup bundlers, or any Node-based compilation step.
- **Markdown & Sanitation:** Marked.js (CDN) for Markdown parsing and DOMPurify (CDN) for mandatory HTML sanitization.
- **Icons:** Lucide Icons (CDN or inline SVG).
- **Backend / Edge Runtime:** Cloudflare Pages Functions (JavaScript Workers).
- **Storage & State:** Config-driven via central `registry.json` and GitHub repository `.vibtools/` metadata. Binary assets hosted on Cloudflare R2 (`dl.vib.tools`). No external SQL or NoSQL databases.

### D. Security & Edge Safety Rules
- **Server-Side Secret Isolation:** Never expose the `GITHUB_TOKEN` environment variable to client browsers, responses, or logs. All GitHub API requests must originate strictly within Cloudflare Pages Functions.
- **XSS Prevention:** Every piece of Markdown rendered on the client (`features.md`, `changelog.md`) must pass through `DOMPurify.sanitize(marked.parse(content))`.
- **Input Validation:** Strictly sanitize and validate all app slugs and version strings (regex matching alphanumeric, hyphen, underscore, and semver patterns) before querying the GitHub API, reading cache, or issuing 302 redirects.
- **Safe Open Redirect Protection:** Download redirects (`/dl/<slug>` and `/dl/<slug>/<version>`) must only resolve to verified URLs matching configured R2 or trusted storage hosts.

### E. Memory & State Synchronization
- Always update `MEMORY.md` upon the successful completion of each development phase, recording completed milestones, current status, and the immediate next phase.

---

## 2. Global UI Component Guardrails (NON-NEGOTIABLE)

Strictly enforce the standards defined in `project/DESIGN_SYSTEM.md` across every frontend file:

1. **Zero Page-Level / Inline Styling:**
   - No view, page, section, or component may define inline `style="..."` attributes or private page-scoped CSS.
   - All visual styling must use CSS custom properties defined in `public/styles/tokens.css` or shared utility classes in `public/styles/globals.css`.
2. **Global Component Single Source of Truth:**
   - All UI primitives (buttons, inputs, cards, modals, badges, toasts, icons) MUST be imported exclusively from `public/components/ui/`.
   - All page layouts (Header, Sidebar, MobileNav, Footer, MainLayout) MUST be imported from `public/components/layout/`.
   - Updating a single component file must automatically reflect across the entire app.
3. **Typography Discipline (`Segoe UI` Only):**
   - Strictly use `"Segoe UI", system-ui, sans-serif` for all UI text.
   - Monospace font is restricted strictly to CLI commands, version strings, and SHA256 hashes.
   - Body font weight is strictly `400`. Headings and labels must not exceed `500`–`600`.
4. **Flat Surface & Zero Visual Noise:**
   - **NO `box-shadow` anywhere** in the app.
   - **NO neon glow**, gradients, or noisy borders.
   - Strictly `4px` radius for buttons, inputs, and badges; `6px` for cards and modals.
   - Zero noise text: never add `subTitle`, `extraDescription`, or promotional fluff.
5. **Dual Theme Token Parity (Dark & Light):**
   - Both Dark (`[data-theme="dark"]`) and Light (`[data-theme="light"]`) themes must be fully supported.
   - Toggling theme must ONLY swap color tokens—layout, typography, and spacing must remain identical.
6. **URL Routing & Reload State Preservation:**
   - Every page and inner view (`/`, `/app/:slug`, `/category/:name`, `/cli`) must have its own unique URL handled by `public/lib/router.js`.
   - Browser refresh on any inner route must preserve the active view and never default-redirect to `/`.
7. **Accurate Toast Feedback:**
   - User actions (copying commands, theme changes, API errors) must emit exact status messages via `public/components/ui/Toast.js`.

---

## 3. Documentation & Knowledge Architecture Rules

Every agent working on this codebase must maintain the designated roles of three primary directories:

### A. Development Working Memory: `notes/`
- Scratchpads, pre-implementation planning, impact analyses, and chronological execution logs.
- Prior to editing code, record plans in `notes/planning/` or `notes/phases/`.
- Record timestamped execution logs in `notes/logs/`.

### B. Internal Technical Truth: `project/`
- Tracked in Git as the permanent internal technical reference.
- Maintain live synchronization: when code or logic changes, immediately update corresponding technical documentation in `project/`.
- Catalog functions, file roles, setup guides, logic mappings, module rationales, and architecture decisions.

### C. End-User Guidelines & Manuals: `docs/`
- 100% authentic, exact, and complete user-facing guides, feature manuals, and API specifications.
- Zero speculation: every detail must be verified against working code.
- Detailed UI walkthroughs (e.g., how to browse, copy PowerShell scripts, select versions, and download binaries).

---

## 4. Directory Manifest Maintenance (`MANIFEST.md` / `MINIFEST.md`)

- Every core folder (`notes/`, `project/`, `docs/`) contains a `README.md` and a `MANIFEST.md` (mirrored by `MINIFEST.md`).
- When creating, renaming, or deleting files in these directories, update the corresponding manifest immediately.
