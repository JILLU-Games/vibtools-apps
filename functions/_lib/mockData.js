/**
 * Mock & Fallback Catalog Data Engine for vib-apps-hub.
 *
 * Provides schema-compliant sample applications for offline preview,
 * local development without GITHUB_TOKEN, and edge resilience if GitHub API rate limits.
 */

export const MOCK_APPS = [
  {
    slug: "calgrid",
    name: "CalGrid",
    tagline: "Minimalist desktop calendar widget and event scheduler",
    icon: "https://dl.vib.tools/calgrid/icon.png",
    category: "Productivity",
    access: "Free",
    featured: true,
    latest: "v1.0.3",
    installer: {
      type: "powershell",
      script: ".vibtools/installer.ps1"
    },
    docs: {
      features: "features.md",
      changelog: "changelog.md"
    },
    versions: {
      "v1.0.3": {
        url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe",
        size: "42.8 MB",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        released_at: "2026-11-15"
      },
      "v1.0.2": {
        url: "https://dl.vib.tools/calgrid/v1.0.2/CalGrid-Setup-1.0.2.exe",
        size: "41.5 MB",
        sha256: "9f83c605d4c82c3dd9e3b909c29fca53ca74c70284c717ec010746ff79c57c4c",
        released_at: "2026-10-28"
      }
    },
    installerScript: `# CalGrid Automated PowerShell Installer
$ErrorActionPreference = 'Stop'
Write-Host "Installing $APP_NAME ($APP_VERSION)..." -ForegroundColor Cyan

$InstallDir = "$env:LOCALAPPDATA\\Programs\\$APP_SLUG"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "Downloading $APP_NAME from https://get.vib.tools/dl/$APP_SLUG/$APP_VERSION..."
# Binary extraction and desktop shortcut creation logic
Write-Host "$APP_NAME installation complete!" -ForegroundColor Green
`,
    docsData: {
      features: `# CalGrid Features

CalGrid is a minimalist desktop calendar widget designed for developers and power users.

## Key Highlights
- **Glanceable Timeline:** Always visible on your desktop without cluttering your workflow.
- **Keyboard First:** Complete navigation with vim-like \`hjkl\` and arrow key navigation.
- **Zero Resource Footprint:** Uses under 25 MB RAM running natively on Windows.
- **Offline Capable:** Stores your event schedule locally in an encrypted SQLite database.

## System Requirements
- Windows 10 / Windows 11 (64-bit)
- PowerShell 5.1 or PowerShell 7+
`,
      changelog: `# CalGrid Release History

## v1.0.3 (2026-11-15)
- Added global hotkey support (\`Win + Alt + C\`) to toggle calendar focus.
- Improved multi-monitor high-DPI scaling on 4K displays.
- Reduced initial startup latency by 40%.

## v1.0.2 (2026-10-28)
- Initial public release of CalGrid.
- Local event reminders with native Windows notifications.
`
    }
  },
  {
    slug: "devprompt",
    name: "DevPrompt",
    tagline: "Developer prompt workbench and token optimization studio",
    icon: "https://dl.vib.tools/devprompt/icon.png",
    category: "Developer Tools",
    access: "Free",
    featured: true,
    latest: "v2.1.0",
    installer: {
      type: "powershell",
      script: ".vibtools/installer.ps1"
    },
    docs: {
      features: "features.md",
      changelog: "changelog.md"
    },
    versions: {
      "v2.1.0": {
        url: "https://dl.vib.tools/devprompt/v2.1.0/DevPrompt-2.1.0.zip",
        size: "28.4 MB",
        sha256: "b2a1a8c9e4210d798a3b5c8f1e29384756019283746501928374650192837465",
        released_at: "2026-11-10"
      }
    },
    installerScript: `# DevPrompt Automated PowerShell Installer
$ErrorActionPreference = 'Stop'
Write-Host "Installing $APP_NAME ($APP_VERSION)..." -ForegroundColor Cyan

$InstallDir = "$env:LOCALAPPDATA\\Programs\\$APP_SLUG"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "Downloading $APP_NAME from https://get.vib.tools/dl/$APP_SLUG/$APP_VERSION..."
Write-Host "$APP_NAME installation complete!" -ForegroundColor Green
`,
    docsData: {
      features: `# DevPrompt Features

DevPrompt is a native desktop prompt engineer workbench for crafting, debugging, and estimating token budgets.

## Features
- **Token Counter:** Real-time token counts across Gemini, Claude, and GPT tokenizer models.
- **Diff Comparison:** Side-by-side prompt output diffing with highlighting.
- **Local Secret Vault:** Securely stores API keys in Windows Credential Manager.
`,
      changelog: `# DevPrompt Release History

## v2.1.0 (2026-11-10)
- Added support for Gemini 3.8 and Claude 3.7 tokenizers.
- Export prompt test suites to JSON and YAML.
`
    }
  },
  {
    slug: "vibclip",
    name: "VibClip",
    tagline: "Lightning-fast clipboard manager with instant search and snippet expansion",
    icon: "https://dl.vib.tools/vibclip/icon.png",
    category: "Utilities",
    access: "Free",
    featured: false,
    latest: "v1.4.0",
    installer: {
      type: "powershell",
      script: ".vibtools/installer.ps1"
    },
    docs: {
      features: "features.md",
      changelog: "changelog.md"
    },
    versions: {
      "v1.4.0": {
        url: "https://dl.vib.tools/vibclip/v1.4.0/VibClip-1.4.0.exe",
        size: "18.2 MB",
        sha256: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
        released_at: "2026-11-01"
      }
    },
    installerScript: `# VibClip Automated PowerShell Installer
$ErrorActionPreference = 'Stop'
Write-Host "Installing $APP_NAME ($APP_VERSION)..." -ForegroundColor Cyan

$InstallDir = "$env:LOCALAPPDATA\\Programs\\$APP_SLUG"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Write-Host "Downloading $APP_NAME from https://get.vib.tools/dl/$APP_SLUG/$APP_VERSION..."
Write-Host "$APP_NAME installation complete!" -ForegroundColor Green
`,
    docsData: {
      features: `# VibClip Features

VibClip is a lightweight, zero-latency clipboard manager with snippet expansion.

## Features
- **Instant Search:** Press \`Ctrl + Shift + V\` to fuzzy-search past clips.
- **Snippet Triggers:** Auto-expand abbreviations into boilerplate snippets.
- **Privacy Lock:** Excludes passwords and sensitive 1Password/Bitwarden copies.
`,
      changelog: `# VibClip Release History

## v1.4.0 (2026-11-01)
- Added image and file copy history.
- Improved clipboard polling efficiency with zero CPU idle wakeups.
`
    }
  }
];

/**
 * Returns the normalized array of mock application configs (without internal raw scripts/docs).
 * @returns {Array<Object>}
 */
export function getMockApps() {
  return MOCK_APPS.map(({ installerScript, docsData, ...app }) => app);
}

/**
 * Finds a mock application by its slug (case-insensitive).
 * @param {string} slug
 * @returns {Object|null}
 */
export function findMockApp(slug) {
  if (!slug || typeof slug !== "string") return null;
  const clean = slug.trim().toLowerCase();
  const found = MOCK_APPS.find((a) => a.slug.toLowerCase() === clean);
  return found || null;
}

/**
 * Returns mock documentation for a given app and document type (features or changelog).
 * @param {string} slug
 * @param {"features"|"changelog"} docType
 * @returns {string|null}
 */
export function getMockDoc(slug, docType) {
  const app = findMockApp(slug);
  if (!app || !app.docsData) return null;
  return app.docsData[docType] || null;
}

/**
 * Returns the mock installer script for a given app.
 * @param {string} slug
 * @returns {string|null}
 */
export function getMockInstaller(slug) {
  const app = findMockApp(slug);
  return app ? app.installerScript || null : null;
}
