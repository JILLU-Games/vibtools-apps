# Backend Core: `functions/_lib/github.js`

> **Module Role:** GitHub Contents API client, slug validation, central registry parsing, schema validation, and Cloudflare Cache API integration.  
> **Last Updated:** 2026-11-19 (Cycle 2 Phase 2 Deep `validateAppConfig` Schema Validation Applied)

---

## Exported Functions & Utilities

### 1. `isValidSlug(slug)`
- **Purpose:** Ensures the application slug contains only safe alphanumeric characters, hyphens, and underscores (`/^[a-z0-9][a-z0-9-_]{0,63}$/i`).
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
- **Edge Caching:** Checks and writes to Cloudflare Cache API (`caches.default`) with a 5-minute default TTL using zone-aligned synthetic key `https://apps.vib.tools/__cache/gh/<repo>/<branch>/<path>`.
- **Error Handling:** Safe `try...catch` wrapper returning `{ ok: boolean, text?: string, status: number, error?: string, cached?: boolean }`.

### 5. `validateAppConfig(config)` (`BUG-11`)
- **Purpose:** Performs deep structural validation of parsed `app.config.json` objects before exposing them to the catalog or installer pipeline.
- **Checks Enforced (returns `{ ok: false, status: 422, error }` on failure):**
  - Root must be a non-null plain object (rejects arrays and primitives).
  - Required fields (`slug`, `name`, `latest`, `versions`) must exist.
  - `slug`, `name`, and `latest` must be non-empty strings.
  - `versions` must be a non-null, non-array object with at least one release key.
  - `latest` must match an entry inside `versions` (supporting `v`-prefix and case-insensitive normalization).

### 6. `fetchAppConfig(entry, env, ctx)`
- **Purpose:** Fetches `.vibtools/apps/app.config.json` (with fallback to `.vibtools/app.config.json`), parses JSON, validates via `validateAppConfig()`, and attaches the `featured` flag from `registry.json`.
- **Output:** `Promise<{ ok: boolean, config?: Object, status?: number, error?: string }>`

### 7. `fetchAppInstaller(entry, config, env, ctx)`
- **Purpose:** Fetches the raw PowerShell installer script (`.vibtools/installer.ps1`, with fallback to `.vibtools/install.ps1`).
- **Output:** `Promise<{ ok: boolean, script?: string, status?: number, error?: string }>`

### 8. `fetchAppDoc(entry, docPath, env, ctx)`
- **Purpose:** Fetches documentation markdown files (e.g., `features.md`, `changelog.md`).
- **Output:** `Promise<string | null>`
