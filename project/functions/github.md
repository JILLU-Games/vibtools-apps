# Backend Core: `functions/_lib/github.js`

> **Module Role:** GitHub Contents API client, slug validation, central registry parsing, and Cloudflare Cache API integration.

---

## Exported Functions & Utilities

### 1. `isValidSlug(slug)`
- **Purpose:** Ensures the application slug contains only safe lowercase alphanumeric characters, hyphens, and underscores (`/^[a-z0-9][a-z0-9-_]{0,63}$/i`).
- **Security:** Prevents path traversal (`../`) and URL injection attacks.
- **Input:** `slug` (string)
- **Output:** `boolean`

### 2. `getRegistry()`
- **Purpose:** Loads and normalizes `registry.json` entries into an array of application configurations.
- **Input:** None
- **Output:** `Array<Object>`

### 3. `findAppEntry(slug)`
- **Purpose:** Performs a case-insensitive search in `registry.json` for a registered app by slug after validating format.
- **Input:** `slug` (string)
- **Output:** `Object | null`

### 4. `fetchRepoFile(repo, branch, filePath, env, ctx, options)`
- **Purpose:** Fetches raw file contents from public and private GitHub repositories using the GitHub Contents API (`application/vnd.github.raw+json`).
- **Authentication:** Injects `Authorization: Bearer ${env.GITHUB_TOKEN}` if configured.
- **Edge Caching:** Checks and writes to Cloudflare Cache API (`caches.default`) with a 5-minute default TTL (keyed on `https://cache.vib-apps-hub.internal/...`).
- **Error Handling:** Safe `try...catch` wrapper returning `{ ok: boolean, text?: string, status: number, error?: string, cached?: boolean }`.

### 5. `fetchAppConfig(entry, env, ctx)`
- **Purpose:** Fetches and parses `.vibtools/apps/app.config.json` for a registered app.
- **Validation:** Verifies required fields (`slug`, `name`, `latest`, `versions`) and attaches `featured` flag.
- **Output:** `Promise<{ ok: boolean, config?: Object, status?: number, error?: string }>`

### 6. `fetchAppInstaller(entry, config, env, ctx)`
- **Purpose:** Fetches the raw PowerShell installer script (`.vibtools/installer.ps1`).
- **Output:** `Promise<{ ok: boolean, script?: string, status?: number, error?: string }>`

### 7. `fetchAppDoc(entry, docPath, env, ctx)`
- **Purpose:** Fetches documentation markdown files (e.g. `features.md`, `changelog.md`).
- **Output:** `Promise<string | null>`
