# Global Design System & UI/UX Specifications — `vib-apps-hub`

> **Document Status:** Active & Strictly Locked Specification  
> **Philosophy:** High-Density Flat UI, Zero Noise, Pure Component Architecture, Native PWA

---

## 1. Visual & Minimalist Rules (100% Mandatory)

### A. Compact & Clean Layout
- **High Information Density:** Small-scale UI, compact paddings (`8px`–`12px`), tight grid gaps (`8px`–`12px`).
- **Zero Visual Noise & Noise Text:**
  - **ABSOLUTELY NO** `extraText`, `subTitle`, `subDescription`, `extraIntro`, or filler marketing promotional copy anywhere.
  - Every element must be self-explanatory by its label, icon, and placement.

### B. Typography (`Segoe UI` Only)
- **Universal Font Stack:** Strictly `"Segoe UI", system-ui, -apple-system, sans-serif` across the entire application.
- **Monospace Exception:** Monospace (`JetBrains Mono`, `ui-monospace`, `Consolas`, monospace) is permitted **ONLY** for CLI commands, version tags, and SHA256 hashes.
- **No Heavy / Mixed Fonts:** Never use heavy fonts. Standard body is `font-weight: 400`; headings and action labels are `font-weight: 500` or `font-weight: 600` maximum. Text must feel clean, soft, and balanced.

### C. Flat Surface Architecture (Zero Effects)
- **Zero Box-Shadow:** `box-shadow: none` across all cards, modals, dropdowns, headers, and buttons.
- **Strict Border Radiuses:**
  - `4px` (`rounded-sm`): Buttons, input fields, badges, pill tags.
  - `6px` (`rounded-md`): Cards, modals, containers.
  - Never use oversized pill buttons or excessive border radiuses.
- **Zero Neon Glow & Gradients:** No glowing borders, no animated gradient mesh backgrounds, and no harsh highlights.
- **Color Discipline:** 1–2 soft, clean accent colors across the entire application.
- **Scrollbar Discipline (Compact & Clean):**
  - **Global Scrollbars:** All scrollable surfaces (`html`, `body`, code boxes, modals, category bars) use a flat `1px` scrollbar (`--scrollbar-size: 1px`) with a transparent track (`--scrollbar-track`), flat square thumb (`border-radius: 0`, `--scrollbar-thumb` / `--scrollbar-thumb-hover`), and hidden scrollbar arrows/corners. Non-WebKit engines fall back to `scrollbar-width: thin` via `@supports not selector(::-webkit-scrollbar)`.
  - **Sidebar Scrollbar Removed:** `.app-sidebar` and its descendants hide scrollbars completely (`scrollbar-width: none`, `-ms-overflow-style: none`, `::-webkit-scrollbar { display: none; width: 0; height: 0; }`) while preserving vertical scrollability when content overflows.

---

## 2. Dual Theme System (Dark & Light)

Theme values are declared as CSS custom properties in `public/styles/tokens.css` under `[data-theme="dark"]` and `[data-theme="light"]`.

> **Rule:** Toggling themes MUST ONLY alter color tokens. Typography, spacing, borders, layouts, and component structures must remain 100% identical.

| CSS Variable | Dark Theme (`[data-theme="dark"]`) | Light Theme (`[data-theme="light"]`) | Usage / Semantic Role |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#0d1117` | `#f6f8fa` | Page root background |
| `--bg-surface` | `#161b22` | `#ffffff` | Card, sidebar, header, modal backgrounds |
| `--bg-subtle` | `#1b2028` | `#eaeef2` | Input fields, code containers, active/hover states |
| `--border-default` | `#30363d` | `#d0d7de` | 1px border for containers, cards, dividers |
| `--border-muted` | `#21262d` | `#e1e4e8` | Subtle interior borders and tab rules |
| `--accent-primary` | `#1d6cf6` | `#0969da` | Action buttons, active navigation, focus rings |
| `--accent-hover` | `#317df8` | `#0854b0` | Hover state for accent actions |
| `--text-primary` | `#e6edf3` | `#1f2328` | Main body text, titles, headings |
| `--text-muted` | `#7d8590` | `#656d76` | Secondary labels, timestamps, metadata |
| `--badge-free-bg` | `#238636` | `#1a7f37` | Free tier badge |
| `--badge-paid-bg` | `#8957e5` | `#8250df` | Paid/License badge |
| `--scrollbar-size` | `1px` | `1px` | Global compact scrollbar width/height |
| `--scrollbar-track` | `transparent` | `transparent` | Global scrollbar track background |
| `--scrollbar-thumb` | `var(--border-color)` (`#30363d`) | `var(--border-color)` (`#d0d7de`) | Global flat 1px scrollbar thumb |
| `--scrollbar-thumb-hover` | `var(--border-strong)` (`#484f58`) | `var(--border-strong)` (`#afb8c1`) | Hover state for global scrollbar thumb |

---

## 3. Global Component-Based Design (Single Source of Truth)

### Zero Page-Level Styling Rule
- **No Page-Specific CSS:** No individual page, view, table, form, card, or modal may define private, inline, or page-scoped CSS rules.
- **Single Point of Update:**
  - All visual tokens live in `public/styles/tokens.css`.
  - All reusable UI elements (Button, Input, Card, Modal, Badge, Toast, Icon) reside in `public/components/ui/`.
  - All structural containers (Header, Sidebar, MobileNav, Footer, MainLayout) reside in `public/components/layout/`.
  - Any future visual or design modification must be executed inside these shared components, automatically updating the entire application.

---

## 4. Responsive & PWA Architecture

### Desktop Layout
- **Fixed Left Sidebar (`240px`):** Houses all navigation links (`Catalog`, `Categories`, `CLI Guide`, `Docs`, `Theme Toggle`).
- **Compact Sticky Top Header (`48px`):** Houses brand logo, `/` shortcut search input, and global status.
- **Main Content Area:** Scrollable viewport hosting the view router and responsive app grids.

### Mobile & Native PWA View
- **Bottom Navigation / Drawer:** Mobile-friendly bottom bar replacing the desktop sidebar on screens `< 768px`.
- **PWA Capabilities:** Complete offline shell, web app manifest (`public/manifest.json`), and service worker (`public/sw.js`) supporting standalone display.

---

## 5. URL Routing & Reload Persistence

- **SPA Client Router (`public/lib/router.js`):**
  - Manages HTML5 History API (`pushState`, `popstate`).
  - Distinct URL routes:
    - `/` — Main App Store Catalog
    - `/app/:slug` — App Details & Version Installer View
    - `/category/:name` — Filtered Category View
    - `/cli` — Edge CLI & PowerShell Utility Guide
- **Reload State Preservation:** Refreshing any route (e.g. `/app/calgrid`) must re-render that specific view directly without redirecting to `/`. Cloudflare Pages wildcard functions pass unmatched paths to `index.html`.

---

## 6. Toast & Accurate Status Feedback

- **Global Toast Component (`public/components/ui/Toast.js`):**
  - Displays original, accurate, and non-generic status reports for every user interaction:
    - Clipboard copy (PowerShell command, SHA256 checksum, download URL).
    - Theme switch confirmation.
    - API fetch outcomes (network errors, rate limits, 404s).
  - Placed at bottom-right (desktop) or top-center (mobile) with zero box-shadow and flat 1px border.
