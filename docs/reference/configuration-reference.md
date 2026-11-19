# Configuration Reference

Every configuration file, environment variable, and browser storage key used by `vib-apps-hub` is documented below directly from the repository source.

## 1. Environment Variables

| Variable | Scope | Required | Default | Consumed By | Purpose |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GITHUB_TOKEN` | Server-side (`env.GITHUB_TOKEN` / `process.env.GITHUB_TOKEN`) | Optional (required for private GitHub repos & >60 req/hr) | *(none)* | `functions/_lib/github.js:119–121` | Sent as `Authorization: Bearer <token>` to `api.github.com`. Never exposed to browser clients. |
| `PORT` | Local Node.js server (`process.env.PORT`) | Optional | `3000` | `server.js:162` | TCP port bound on `0.0.0.0` by the local Node.js 22 edge emulator. |

> Local Wrangler development reads `GITHUB_TOKEN` from `.dev.vars` (gitignored). Local Node.js (`server.js`) reads `process.env`.

## 2. Cloudflare Pages Configuration (`wrangler.toml`)

```toml
name = "vib-apps-hub"
pages_build_output_dir = "public"
compatibility_date = "2026-09-04"
```

| Key | Value | Meaning |
| :--- | :--- | :--- |
| `name` | `"vib-apps-hub"` | Cloudflare Pages project identifier. |
| `pages_build_output_dir` | `"public"` | Static asset output directory served for `apps.vib.tools`. |
| `compatibility_date` | `"2026-09-04"` | Cloudflare Workers runtime compatibility date. |

## 3. Application Registry (`registry.json`)

Imported statically as a JSON ES module in `functions/_lib/github.js:1` (`import registry from "../../registry.json" with { type: "json" };`).

Accepts either a top-level array `[ ... ]` or `{ "apps": [ ... ] }` (`getRegistry()`):

| Field | Required | Type | Default | Description |
| :--- | :---: | :--- | :--- | :--- |
| `slug` | Yes | `string` | — | Case-insensitive app slug matching `isValidSlug()`. |
| `repo` | Yes | `string` | — | GitHub repository (`owner/repo`). |
| `branch` | No | `string` | `"main"` | Git ref passed to GitHub Contents API (`?ref=`). |
| `featured` | No | `boolean` | `false` | Passed through to API output as `featured`. |

Current committed entry in `registry.json`:
```json
[
  {
    "slug": "example-app",
    "repo": "vib-tools/example-app",
    "branch": "main",
    "featured": true
  }
]
```

## 4. Package Scripts (`package.json`)

| Script | Exact Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `node server.js` | Starts local Node.js 22 edge emulator on port `3000`. |
| `npm start` | `node server.js` | Production-compatible Node.js start command. |
| `npm run build` | `node --check server.js && node --check public/app.js && node --check functions/api/apps.js && node --check "functions/[[path]].js"` | Zero-build JavaScript syntax check across core entry points. |
| `npm run lint` | Same as `build` | Syntax check across core entry points. |
| `npm test` | `node --test server.test.js` | Runs the 7 server/edge tests *(run `node --test server.test.js public/lib/appMeta.test.js` for all 12 tests)*. |

## 5. PWA Manifest (`public/manifest.json`) & Service Worker (`public/sw.js`)

| File | Key Setting | Value |
| :--- | :--- | :--- |
| `public/manifest.json` | `name` / `short_name` | `"Vib Apps"` |
| `public/manifest.json` | `start_url` / `display` | `"/"` / `"standalone"` |
| `public/manifest.json` | `background_color` / `theme_color` | `"#0d1117"` |
| `public/manifest.json` | `icons` | `/vib.tools.Branding/favicon.svg`, `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`, `/icons/icon.svg` |
| `public/sw.js` | `CACHE_NAME` | `"vib-apps-hub-v2"` |
| `public/sw.js` | `STATIC_ASSETS` | 33 precached shell paths |

## 6. Vib Docs Engine Configuration (`.vibtools/docs.config.json`)

Conforms strictly to `https://docs.vib.tools/schemas/vibtools-docs.schema.json` (`schemaVersion: 1`, `additionalProperties: false`):

| Key | Value |
| :--- | :--- |
| `docsType` | `"both"` |
| `slug` / `title` / `version` | `"vib-apps"` / `"Vib Apps"` / `"1.0.0"` |
| `accentColor` | `"#1D6CF6"` |
| `logoPath` | `".vibtools/logo.png"` |
| `branch` | `"main"` |
| `targets.users.docsPath` | `"docs/users"` (`docs.vib.tools`) |
| `targets.developer.docsPath` | `"docs/dev"` (`developer.vibtools.io`) |

## 7. Browser Storage & URL State

| Mechanism | Key / Param | Allowed Values | Source |
| :--- | :--- | :--- | :--- |
| `localStorage` | `vib_theme` | `"dark"` (default) \| `"light"` | `public/lib/theme.js:7–8` |
| URL Query Param | `?q=` | URL-encoded search string | `public/app.js:28–44` |
| URL Query Param (Edge) | `?mode=get` | `"get"` (emulates `Host: get.vib.tools` locally) | `functions/[[path]].js:72` |

## Related References

- [Design Tokens & UI Component Reference](./design-tokens-and-components.md)
- [Dependencies & External Services](./dependencies.md)
- [Documentation Home](../index.md)
