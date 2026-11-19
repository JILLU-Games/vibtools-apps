# Frontend UI Components & Layout Specifications

> **Module Role:** Pure zero-build Vanilla JS (ES Modules) UI components and sections.
> **Design Standard:** Strictly complies with `project/DESIGN_SYSTEM.md` (zero box-shadow, zero inline styles, Segoe UI typography).

---

## 1. Application Layout Hierarchy (`public/components/layout/`)

1. **`Header.js`:**
   - 48px sticky header with branding, global debounced search input, external documentation link (`docs.vib.tools`), and dual-theme switcher.
   - Global `/` keyboard shortcut guarded against active modals (`.ui-modal`, `.ui-modal-backdrop`).
2. **`Sidebar.js`:**
   - Desktop fixed navigation sidebar with "All Apps", "CLI Installer", and dynamically generated category links.
   - Attribute selectors hardened with `CSS.escape()` for special character category names.
3. **`MobileNav.js`:**
   - Fixed mobile bottom navigation with quick access to Apps (`/`), CLI (`/cli`), and Theme toggle.
4. **`Footer.js`:**
   - Minimal bottom footer with brand copyright and external links.
5. **`MainLayout.js`:**
   - Responsive shell orchestrating Header, Sidebar, main view root (`#view-root`), and MobileNav.

---

## 2. Section Views (`public/components/sections/`)

1. **`AppGrid.js`:**
   - Displays application cards in a responsive CSS grid (`repeat(auto-fill, minmax(280px, 1fr))`).
   - Pinned `get.vib.tools` CLI banner on the home view.
   - **App Card Icon:** 22x22px icon displayed alongside the application title with lazy-loading and vector SVG fallback.
   - **Mobile Category Bar:** Responsive horizontal scrollable category filter pill bar (`.app-category-bar`) active on mobile screens (`<= 768px`).
2. **`AppDetailView.js`:**
   - Detail view for single applications with version selector, live PowerShell updater, direct R2 download link, and sanitized markdown documentation tabs (`Features` and `Changelog`).
   - **Header Row & Icon:** 44x44px icon with surface background and border displayed alongside application title and tagline.
3. **`CliGuideSection.js`:**
   - Clean terminal reference manual covering one-line PowerShell execution, version targeting, and direct binary downloads.
