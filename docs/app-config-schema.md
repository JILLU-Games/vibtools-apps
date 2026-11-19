# Application Configuration & `.vibtools/` Repository Standard (Frozen v1)

> **Frozen JSON Schema:** `https://apps.vib.tools/schemas/vibtools-app.schema.json`  
> **AI & Developer Spec:** `https://apps.vib.tools/vib-apps-engine/llms.txt`  
> **Verified Against Live Code:** `functions/_lib/github.js`, `functions/[[path]].js`, `functions/api/apps.js`, `public/components/sections/AppDetailView.js`  
> **Applies To:** All application repositories registered in `vib-apps-hub` (`registry.json`)

---

## 1. Zero-Touch Onboarding (`registry.json`)

To connect any GitHub repository (public or private) to `apps.vib.tools` and `get.vib.tools`, simply add its GitHub repository URL to `registry.json`:

```json
[
  "https://github.com/vib-tools/calgrid",
  "https://github.com/vib-tools/devprompt"
]
```

*(Optional object form when overriding branch or featured flag: `{ "repo": "https://github.com/vib-tools/calgrid", "branch": "main", "featured": true }`.)*

The edge hub automatically parses `owner/repo`, loads `.vibtools/apps/app.config.json`, discovers the app `slug`, renders Markdown documentation tabs, and routes every version's download URL and installer script.

---

## 2. Repository Directory Layout

```text
<app-repository-root>/
└── .vibtools/
    └── apps/
        ├── app.config.json        # Frozen v1 manifest (404 fallback: .vibtools/app.config.json)
        ├── installer.ps1          # Default PowerShell installer (404 fallback: .vibtools/installer.ps1 -> install.ps1)
        ├── features.md            # Features & Overview Markdown (auto-loaded or referenced via docs.features)
        └── changelog.md           # Release Changelog Markdown (auto-loaded or referenced via docs.changelog)
```

---

## 3. Frozen Schema Field Specification (`schemaVersion: 1`)

When `"schemaVersion": 1` is declared, both `public/schemas/vibtools-app.schema.json` and `validateAppConfig()` enforce `additionalProperties: false` on root and version objects so typos (e.g. `releaseDate` instead of `released_at`) are rejected immediately.

| Field | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `$schema` | `string` | Recommended | Canonical schema URI for IDE autocomplete & validation. | `"https://apps.vib.tools/schemas/vibtools-app.schema.json"` |
| `schemaVersion` | `1` | Recommended | Frozen schema version integer (`1`). | `1` |
| `slug` | `string` | **Yes** | Unique identifier matching `/^[a-z0-9][a-z0-9-_]{0,63}$/i`. | `"calgrid"` |
| `name` | `string` | **Yes** | Human-readable application display name. | `"CalGrid"` |
| `latest` | `string` | **Yes** | Default release version key matching a key in `versions`. | `"v1.0.3"` |
| `versions` | `object` | **Yes** | Non-empty map of version keys to release objects. | *See Version Object* |
| `tagline` | `string` | No | Concise one-line summary (max 160 chars). | `"Minimalist desktop calendar widget"` |
| `icon` | `string` | No | Direct `https://` URL to icon image (monogram fallback if omitted). | `"https://dl.vib.tools/calgrid/icon.png"` |
| `category` | `string` | No | Category label for sidebar filtering and `/category/<name>`. | `"Productivity"` |
| `access` | `"Free" \| "Paid"` | No | License tier badge and catalog filter. | `"Free"` |
| `installer` | `string \| object` | No | Default installer path (`.vibtools/apps/installer.ps1`), trusted `https://` script URL, or `{ "type": "powershell", "script": "..." }`. | `{"type": "powershell", "script": ".vibtools/apps/installer.ps1"}` |
| `docs` | `object` | No | Relative paths to Markdown docs (`features`, `changelog`). Bare filenames resolve in `.vibtools/apps/` first, then `.vibtools/`. | `{"features": ".vibtools/apps/features.md", "changelog": ".vibtools/apps/changelog.md"}` |
| `platforms` | `string[]` | No | Supported operating systems shown as read-only metadata. | `["Windows 10/11"]` |
| `architectures` | `string[]` | No | Supported CPU architectures shown as read-only metadata. | `["x64"]` |
| `screenshots` | `(string \| { url, alt? })[]` | No | Optional HTTPS screenshot gallery. | `["https://dl.vib.tools/calgrid/screen-1.png"]` |
| `requirements` | `string[] \| object` | No | Optional system requirements list or key-value map. | `["Windows 10/11 (64-bit)"]` |
| `links` | `object` | No | Optional external `https://` links (`docs`, `homepage`, `source`). | `{"docs": "https://docs.vib.tools/calgrid"}` |

### Version Object Fields (`versions.<versionKey>`)

| Field | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `url` | `string` | **Yes** | Direct `https://` download URL on a trusted host (`dl.vib.tools`, `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, or `ALLOWED_DOWNLOAD_HOSTS`). | `"https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe"` |
| `installer` | `string \| object` | No | Optional **per-version installer override** (repo path or trusted `https://` script URL including `raw.githubusercontent.com`). Inherits root `installer` when omitted. | `"https://dl.vib.tools/calgrid/v1.0.2/install.ps1"` |
| `size` | `string` | No | Human-readable binary size string. | `"42.8 MB"` |
| `sha256` | `string` | No | Exact 64-character hexadecimal SHA256 digest. | `"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"` |
| `released_at` | `string` | No | Strict ISO UTC date (`YYYY-MM-DD`). | `"2026-11-15"` |
| `channel` | `"stable" \| "beta" \| "alpha"` | No | Optional stability channel indicator shown in the version selector. | `"stable"` |
| `deprecated` | `boolean` | No | Optional deprecation marker shown in the version selector. | `false` |

---

## 4. Complete Frozen v1 Example: `.vibtools/apps/app.config.json`

```json
{
  "$schema": "https://apps.vib.tools/schemas/vibtools-app.schema.json",
  "schemaVersion": 1,
  "slug": "calgrid",
  "name": "CalGrid",
  "tagline": "Minimalist desktop calendar widget and event scheduler",
  "icon": "https://dl.vib.tools/calgrid/icon.png",
  "category": "Productivity",
  "access": "Free",
  "latest": "v1.0.3",
  "installer": {
    "type": "powershell",
    "script": ".vibtools/apps/installer.ps1"
  },
  "docs": {
    "features": ".vibtools/apps/features.md",
    "changelog": ".vibtools/apps/changelog.md"
  },
  "platforms": ["Windows 10/11"],
  "architectures": ["x64"],
  "versions": {
    "v1.0.3": {
      "url": "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe",
      "size": "42.8 MB",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "released_at": "2026-11-15"
    },
    "v1.0.2": {
      "url": "https://dl.vib.tools/calgrid/v1.0.2/CalGrid-Setup-1.0.2.exe",
      "installer": "https://dl.vib.tools/calgrid/v1.0.2/install.ps1",
      "size": "41.5 MB",
      "sha256": "9f83c605d4c82c3dd9e3b909c29fca53ca74c70284c717ec010746ff79c57c4c",
      "released_at": "2026-10-28"
    }
  }
}
```

---

## 5. PowerShell Installer Contract

When a client runs `irm "https://get.vib.tools/<slug>" | iex` or `irm "https://get.vib.tools/<slug>/<version>" | iex`, `functions/[[path]].js` resolves the target version, picks `versions[version].installer` (or root `installer`), and prepends three sanitized PowerShell variables:

```powershell
$APP_SLUG = "calgrid"
$APP_VERSION = "v1.0.3"
$APP_NAME = "CalGrid"
```
