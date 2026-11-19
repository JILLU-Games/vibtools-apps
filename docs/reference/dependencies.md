# Dependencies & External Services

`vib-apps-hub` follows a strict zero-build philosophy with **zero npm runtime or dev dependencies** in `package.json`.

## 1. npm Dependencies (`package.json`)

| Dependency Type | Count | Packages |
| :--- | :---: | :--- |
| `dependencies` | `0` | None |
| `devDependencies` | `0` | None |

Local execution relies solely on **Node.js 22** built-in modules (`node:http`, `node:fs/promises`, `node:path`, `node:url`, `node:test`, `node:assert/strict`) and standard Web APIs (`Request`, `Response`, `Headers`, `URL`, `fetch`).

## 2. Browser CDN Dependencies (`public/index.html`)

Only two pinned scripts are loaded in the browser via jsDelivr:

| Library | Version | CDN URL | Purpose & Fallback |
| :--- | :---: | :--- | :--- |
| **Marked.js** | `15.0.7` | `https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js` | Converts `features.md` and `changelog.md` Markdown into HTML in `AppDetailView.js:56–57`. |
| **DOMPurify** | `3.2.4` | `https://cdn.jsdelivr.net/npm/dompurify@3.2.4/dist/purify.min.js` | Sanitizes HTML output from Marked.js (and optional string content in `Modal.js`) to prevent XSS. |

> **Offline Degradation:** If `window.marked` or `window.DOMPurify` is unavailable (for example, offline before CDN caching), `renderSafeMarkdown()` (`AppDetailView.js:59–61`) safely escapes raw Markdown inside a `<pre>` element using `.textContent`.
>
> **Note:** Tailwind CSS CDN and Lucide Icons CDN are **not** loaded. All styles reside in `public/styles/tokens.css` and `public/styles/globals.css`, and all icons are inline SVGs in `public/components/ui/Icon.js`.

## 3. External Services & Platform Runtimes

| Service | Integration Point | Protocol / Auth | Purpose |
| :--- | :--- | :--- | :--- |
| **Cloudflare Pages & Pages Functions** | `wrangler.toml`, `functions/` | Native platform hosting + V8 Workers + `caches.default` | Hosts static assets (`public/`) and edge compute (`apps.vib.tools` & `get.vib.tools`). |
| **GitHub Contents REST API** | `functions/_lib/github.js:113` | `HTTPS GET`, `Accept: application/vnd.github.raw+json`, optional `Bearer GITHUB_TOKEN` | Reads `.vibtools/apps/app.config.json`, `.vibtools/installer.ps1`, `features.md`, and `changelog.md` from registered repos. |
| **Cloudflare R2 (`dl.vib.tools`)** | `functions/[[path]].js:224` | HTTP `302 Found` redirect | Serves compiled application installers and app icons without Worker egress costs. |
| **Vib Tools Web Ecosystem** | `Header.js`, `Sidebar.js`, `Footer.js` | Outbound HTTPS links | Links to `https://vib.tools`, `https://docs.vib.tools`, and `https://get.vib.tools`. |

## Related References

- [Configuration Reference](./configuration-reference.md)
- [Glossary](./glossary.md)
- [Documentation Home](../index.md)
