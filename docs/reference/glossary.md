# Glossary

Canonical definitions of identifiers, routes, and architectural terms used across `vib-apps-hub`.

| Term | Definition |
| :--- | :--- |
| **`vib-apps-hub`** | Repository and Cloudflare Pages project name (`wrangler.toml`) powering both `apps.vib.tools` and `get.vib.tools`. |
| **`apps.vib.tools`** | Production hostname for the visual web catalog Single Page Application served from `public/` and `/api/apps`. |
| **`get.vib.tools`** | Production hostname for the edge CLI installer and `/dl/` binary redirect router handled by `functions/[[path]].js`. |
| **`dl.vib.tools`** | Cloudflare R2 custom domain hosting application icons and versioned binary installers targeted by HTTP `302` redirects. |
| **`?mode=get`** | Query parameter supported by `functions/[[path]].js:72` allowing local developers on `localhost` to emulate `Host: get.vib.tools`. |
| **`.vibtools/` Standard** | Convention where each registered app repository stores `.vibtools/apps/app.config.json`, `.vibtools/installer.ps1`, `.vibtools/features.md`, and `.vibtools/changelog.md`. |
| **`registry.json`** | Root JSON manifest listing the GitHub repositories (`slug`, `repo`, `branch`, `featured`) aggregated by `/api/apps`. |
| **Mode A (`/api/apps`)** | Catalog aggregation mode returning `{ apps, count }` cached for 300 seconds in `caches.default`. |
| **Mode B (`/api/apps?slug=<slug>`)** | Single-application detail mode returning `{ app, docs: { features, changelog } }`. |
| **Mock / Fallback Catalog (`mockData.js`)** | Built-in schema-compliant dataset of 3 sample apps (`calgrid`, `devprompt`, `vibclip`) returned automatically when live GitHub repositories are unavailable or unconfigured. |
| **`$APP_SLUG` & `$APP_VERSION`** | The two sanitized PowerShell variables prepended by `functions/[[path]].js:292` to every streamed installer script. |
| **Version Normalization (`resolveVersion`)** | Edge router logic in `functions/[[path]].js:20–51` that resolves both `v`-prefixed and bare semver strings (`v1.0.3` ↔ `1.0.3`) case-insensitively. |
| **SPA Fallback** | Edge behavior in `functions/[[path]].js:78–97` serving `/index.html` with HTTP `200 OK` on extensionless non-`/api/` 404 routes so browser refreshes preserve `/app/:slug`, `/category/:name`, and `/cli`. |
| **Zero-Build Architecture** | Design constraint avoiding compilers/bundlers; browser modules load directly via ES Modules (`<script type="module">`) and tokenized CSS (`tokens.css` / `globals.css`). |
| **Vib Docs Engine** | Dual-portal documentation router configured via `.vibtools/docs.config.json` serving `docs/users` (`docs.vib.tools`) and `docs/dev` (`developer.vibtools.io`). |

## Related References

- [Configuration Reference](./configuration-reference.md)
- [Dependencies & External Services](./dependencies.md)
- [Documentation Home](../index.md)
