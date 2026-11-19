# Design Tokens & UI Component Reference

All styling in `apps.vib.tools` is driven by CSS custom properties in `public/styles/tokens.css` (imported by `public/styles/globals.css`) and shared vanilla DOM factories in `public/components/ui/`. Zero inline `style="..."` attributes and zero `box-shadow` declarations are used.

## 1. Typography, Spacing & Geometry Tokens (`public/styles/tokens.css`)

| Category | Token | Value |
| :--- | :--- | :--- |
| **Fonts** | `--font-sans` | `"Segoe UI", system-ui, -apple-system, sans-serif` |
| **Fonts** | `--font-mono` | `ui-monospace, SFMono-Regular, Consolas, "JetBrains Mono", monospace` |
| **Sizes** | `--text-xs` / `sm` / `base` / `md` / `lg` / `xl` / `2xl` | `11px` / `12px` / `13px` / `15px` / `18px` / `22px` / `26px` |
| **Weights** | `--fw-normal` / `--fw-medium` / `--fw-semibold` | `400` / `500` / `600` |
| **Spacing** | `--sp-1` through `--sp-8` | `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `28px`, `32px` |
| **Radii** | `--radius-sm` / `--radius-md` | `4px` (buttons, inputs, badges) / `6px` (cards, modals) |
| **Layout** | `--header-h` / `--sidebar-w` / `--mobile-nav-h` | `56px` / `240px` / `56px` |
| **Z-Index** | `--z-header` / `--z-sidebar` / `--z-modal` / `--z-toast` | `40` / `50` / `100` / `150` |

## 2. Dual-Theme Color Palette (`public/styles/tokens.css`)

| Token | Dark Theme (`[data-theme="dark"]`) | Light Theme (`[data-theme="light"]`) |
| :--- | :--- | :--- |
| `--bg-page` | `#0d1117` | `#f6f8fa` |
| `--bg-surface` | `#161b22` | `#ffffff` |
| `--bg-elevated` | `#1c222b` | `#ffffff` |
| `--bg-hover` | `#21262d` | `#f0f3f6` |
| `--bg-subtle` | `#1b2028` | `#eaeef2` |
| `--border-color` / `--border-strong` | `#30363d` / `#484f58` | `#d0d7de` / `#afb8c1` |
| `--text-primary` / `--text-secondary` / `--text-muted` | `#e6edf3` / `#9198a1` / `#7d8590` | `#1f2328` / `#59636e` / `#656d76` |
| `--accent` / `--accent-hover` / `--accent-readable` | `#1d6cf6` / `#317df8` / `#58a6ff` | `#0969da` / `#0854b0` / `#0969da` |
| `--status-success` / `--status-success-text` | `#238636` / `#3fb950` | `#1a7f37` / `#1a7f37` |
| `--status-error` / `--status-warn` | `#f85149` / `#d29922` | `#cf222e` / `#9a6700` |
| `--badge-paid-bg` / `--badge-paid-text` | `#8957e5` / `#bc8cff` | `#8250df` / `#6639ba` |

## 3. Responsive Breakpoints (`public/styles/globals.css`)

| Breakpoint | Layout Adaptations |
| :--- | :--- |
| `<= 1024px` | `.app-detail__layout` collapses to 1 column; `.app-detail__aside` unsticks and moves above main documentation (`order: -1`). |
| `<= 768px` | Desktop `.app-sidebar` hidden; `.app-category-bar` horizontal chips shown; `.app-mobile-nav` bottom bar shown; `.app-grid` becomes 1 column; `/` shortcut hint hidden; `.ui-toast-stack` repositions to top-center below header. |
| `<= 480px` | Header **Docs** button collapses label to icon-only (`34px` square); logo text scales to `--text-base`. |

## 4. UI Primitives API (`public/components/ui/index.js`)

| Component | Signature & Options | Returns |
| :--- | :--- | :--- |
| `Icon` | `Icon(name, size = 16)` — 27 built-in SVG names; unknown names fall back to `info` | `SVGElement` |
| `Button` | `Button({ label, icon, variant, size, fullWidth, href, target, rel, onClick, type, title, className, disabled, ariaLabel })` — renders `<a>` when `href` is non-empty, otherwise `<button>` | `HTMLButtonElement \| HTMLAnchorElement` |
| `Input` | `Input({ placeholder, value, icon, onInput, onKeyDown, ariaLabel, className, autofocus, name, type })` — wraps in `.ui-input-wrap` with `.input` ref when `icon` is set | `HTMLDivElement \| HTMLInputElement` |
| `Badge` | `Badge({ text, variant = "neutral", icon, className })` — variants: `neutral`, `accent`, `success`, `paid`, `warn`, `mono` | `HTMLSpanElement` |
| `Card` | `Card({ header, body, footer, clickable, onClick, ariaLabel, className })` — `<article class="ui-card">` with `tabIndex = 0` & `Enter`/`Space` handling when clickable | `HTMLElement` |
| `Modal` | `openModal({ title, content, footer, onClose })` / `closeModal()` *(exported, currently unused in active views)* | `HTMLDivElement` |
| `toast` | `toast.success(msg, duration = 3500)`, `toast.error(msg, duration = 4500)`, `toast.info(msg, duration = 3500)` | `HTMLDivElement` |

## Related References

- [Configuration Reference](./configuration-reference.md)
- [Codebase Structure & Module Inventory](../dev/02-codebase-structure.md)
- [Documentation Home](../index.md)
