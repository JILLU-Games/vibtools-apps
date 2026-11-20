/**
 * Pure Application Metadata & Catalog Filter Helpers.
 * Strictly evidence-based: derives display cues only from verified app metadata
 * without fabricating versions, platforms, hashes, or installation statuses.
 */

const PACKAGE_EXTENSION_MAP = [
  { suffix: ".tar.gz", label: "TAR.GZ" },
  { suffix: ".tar.xz", label: "TAR.XZ" },
  { suffix: ".appimage", label: "AppImage" },
  { suffix: ".exe", label: "EXE" },
  { suffix: ".msi", label: "MSI" },
  { suffix: ".msix", label: "MSIX" },
  { suffix: ".zip", label: "ZIP" },
  { suffix: ".dmg", label: "DMG" },
  { suffix: ".pkg", label: "PKG" },
  { suffix: ".deb", label: "DEB" },
  { suffix: ".rpm", label: "RPM" }
];

/**
 * Generates a restrained 2-character uppercase monogram fallback for an app
 * when its remote icon asset is unavailable or fails to load.
 *
 * @param {Object} app
 * @returns {string}
 */
export function getAppMonogram(app) {
  const raw = String(app?.name || app?.slug || "VA").trim();
  if (!raw) return "VA";

  // Check for CamelCase capitals (e.g., CalGrid -> CG, DevPrompt -> DP, VibClip -> VC)
  const camelCapitals = raw.match(/[A-Z]/g);
  if (camelCapitals && camelCapitals.length >= 2) {
    return `${camelCapitals[0]}${camelCapitals[1]}`;
  }

  // Split by whitespace, hyphen, or underscore
  const words = raw.split(/[\s\-_]+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return raw.slice(0, 2).toUpperCase();
}

/**
 * Extracts a real package file format cue from a version's binary download URL.
 * Returns null if no recognized extension exists.
 *
 * @param {Object} versionObj
 * @returns {string|null}
 */
export function getPackageFormat(versionObj) {
  const rawUrl = versionObj?.url;
  if (!rawUrl || typeof rawUrl !== "string") return null;

  let pathname = rawUrl;
  try {
    pathname = new URL(rawUrl).pathname;
  } catch (_) {
    pathname = rawUrl.split("?")[0].split("#")[0];
  }

  const lower = pathname.toLowerCase();
  for (const entry of PACKAGE_EXTENSION_MAP) {
    if (lower.endsWith(entry.suffix)) {
      return entry.label;
    }
  }
  return null;
}

/**
 * Formats an ISO YYYY-MM-DD release date into a crisp readable date (e.g. "Apr 10, 2026").
 * Returns null when no date is present in metadata.
 *
 * @param {string|undefined|null} rawDate
 * @returns {string|null}
 */
export function formatReleaseDate(rawDate) {
  if (!rawDate || typeof rawDate !== "string") return null;
  const trimmed = rawDate.trim();
  if (!trimmed) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const date = new Date(Date.UTC(year, month, day));
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
      }).format(date);
    }
  }

  return trimmed;
}

/**
 * Formats an app version label consistently with a leading "v" if missing.
 *
 * @param {string|undefined|null} ver
 * @returns {string}
 */
export function formatVersionLabel(ver) {
  if (!ver || typeof ver !== "string") return "";
  const trimmed = ver.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("v") || trimmed.startsWith("V") ? trimmed : `v${trimmed}`;
}

/**
 * Builds the exact PowerShell installer command for an application.
 *
 * @param {string} slug
 * @param {string} [version]
 * @param {string} [latest]
 * @returns {string}
 */
export function buildInstallCommand(slug, version, latest) {
  if (!version || version === latest) {
    return `irm "https://get.vib.tools/${slug}" | iex`;
  }
  return `irm "https://get.vib.tools/${slug}/${version}" | iex`;
}

/**
 * Builds the exact edge direct download endpoint URL for a binary version.
 * Uses the local edge emulator (`?mode=get`) on localhost/127.0.0.1 and
 * defaults to `https://get.vib.tools/dl/...` in production and non-browser environments.
 *
 * @param {string} slug
 * @param {string} version
 * @param {Object} [options]
 * @param {Location|{ hostname?: string, origin?: string }} [options.location]
 * @returns {string}
 */
export function buildDownloadUrl(slug, version, options = {}) {
  const encodedPath = `/dl/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`;
  const runtimeLoc = options.location || (typeof window !== "undefined" ? window.location : null);
  const host = runtimeLoc?.hostname?.toLowerCase() || "";
  if (host === "localhost" || host === "127.0.0.1") {
    return `${runtimeLoc.origin}${encodedPath}?mode=get`;
  }
  return `https://get.vib.tools${encodedPath}`;
}

/**
 * Resolves the shell script file extension for an application's active installer.
 *
 * @param {Object|null} app
 * @param {Object|null} [versionObj=null]
 * @returns {"ps1"|"sh"|"cmd"}
 */
export function getInstallerExtension(app, versionObj = null) {
  const activeSpec = versionObj?.installer ?? app?.installer;
  const rawType =
    activeSpec && typeof activeSpec === "object" && typeof activeSpec.type === "string"
      ? activeSpec.type.trim().toLowerCase()
      : "";

  if (rawType === "bash" || rawType === "sh") return "sh";
  if (rawType === "cmd") return "cmd";
  if (rawType === "powershell") return "ps1";

  const rawTarget =
    typeof activeSpec === "string"
      ? activeSpec.trim().toLowerCase()
      : activeSpec && typeof activeSpec === "object" && typeof activeSpec.script === "string"
        ? activeSpec.script.trim().toLowerCase()
        : "";

  if (rawTarget.endsWith(".sh")) return "sh";
  if (rawTarget.endsWith(".cmd") || rawTarget.endsWith(".bat")) return "cmd";
  return "ps1";
}

/**
 * Builds the browser-downloadable installer script endpoint URL (`?download=1`)
 * for a selected version, returning the version-injected script as a file attachment.
 *
 * @param {string} slug
 * @param {string} [version]
 * @param {Object} [options]
 * @param {Location|{ hostname?: string, origin?: string }} [options.location]
 * @returns {string}
 */
export function buildInstallerDownloadUrl(slug, version, options = {}) {
  const encodedPath = version
    ? `/${encodeURIComponent(slug)}/${encodeURIComponent(version)}`
    : `/${encodeURIComponent(slug)}`;
  const runtimeLoc = options.location || (typeof window !== "undefined" ? window.location : null);
  const host = runtimeLoc?.hostname?.toLowerCase() || "";
  if (host === "localhost" || host === "127.0.0.1") {
    return `${runtimeLoc.origin}${encodedPath}?mode=get&download=1`;
  }
  return `https://get.vib.tools${encodedPath}?download=1`;
}

/**
 * Filters the loaded catalog deterministically by category, license/access tier, and search query.
 *
 * @param {Array<Object>} apps
 * @param {Object} filters
 * @param {string} [filters.category]
 * @param {"all"|"free"|"paid"} [filters.access="all"]
 * @param {string} [filters.query=""]
 * @returns {Array<Object>}
 */
export function filterApps(apps = [], { category = "", access = "all", query = "" } = {}) {
  let result = Array.isArray(apps) ? apps.slice() : [];

  if (category && typeof category === "string") {
    const targetCat = category.trim().toLowerCase();
    result = result.filter(
      (app) => app.category && app.category.trim().toLowerCase() === targetCat
    );
  }

  if (access && access !== "all") {
    const targetAccess = access.trim().toLowerCase();
    result = result.filter(
      (app) => app.access && app.access.trim().toLowerCase() === targetAccess
    );
  }

  if (query && typeof query === "string" && query.trim()) {
    const q = query.trim().toLowerCase();
    result = result.filter((app) => {
      const matchName = app.name && app.name.toLowerCase().includes(q);
      const matchSlug = app.slug && app.slug.toLowerCase().includes(q);
      const matchTag = app.tagline && app.tagline.toLowerCase().includes(q);
      const matchCat = app.category && app.category.toLowerCase().includes(q);
      return Boolean(matchName || matchSlug || matchTag || matchCat);
    });
  }

  return result;
}

/**
 * Extracts sorted unique categories and real per-category app counts from loaded catalog data.
 *
 * @param {Array<Object>} apps
 * @returns {{ categories: string[], counts: Record<string, number>, total: number }}
 */
export function computeCategoryCounts(apps = []) {
  const counts = {};
  const list = Array.isArray(apps) ? apps : [];

  list.forEach((app) => {
    if (app?.category && typeof app.category === "string") {
      const cat = app.category.trim();
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }
  });

  const categories = Object.keys(counts).sort((a, b) => a.localeCompare(b));
  return {
    categories,
    counts,
    total: list.length
  };
}

/**
 * Extracts real supported platform labels from an application's metadata.
 * Returns an empty array if no platform data is provided (never fabricates).
 *
 * @param {Object} app
 * @returns {string[]}
 */
export function getSupportedPlatforms(app) {
  if (!Array.isArray(app?.platforms)) return [];
  return app.platforms
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

/**
 * Extracts real supported CPU architecture labels from an application's metadata.
 * Returns an empty array if no architecture data is provided (never fabricates).
 *
 * @param {Object} app
 * @returns {string[]}
 */
export function getSupportedArchitectures(app) {
  if (!Array.isArray(app?.architectures)) return [];
  return app.architectures
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

/**
 * Extracts a sortable UTC timestamp (ms) for an application's latest release date.
 * Returns 0 when no valid release date exists.
 *
 * @param {Object} app
 * @returns {number}
 */
function getLatestReleaseTimestamp(app) {
  const versions = app?.versions;
  if (!versions || typeof versions !== "object") return 0;

  const latestObj = app.latest && Object.hasOwn(versions, app.latest) ? versions[app.latest] : null;
  const candidateDate = latestObj?.released_at;
  if (typeof candidateDate === "string" && candidateDate.trim()) {
    const parsed = Date.parse(candidateDate.trim());
    if (!Number.isNaN(parsed)) return parsed;
  }

  let newest = 0;
  for (const key of Object.keys(versions)) {
    const raw = versions[key]?.released_at;
    if (typeof raw === "string" && raw.trim()) {
      const parsed = Date.parse(raw.trim());
      if (!Number.isNaN(parsed) && parsed > newest) {
        newest = parsed;
      }
    }
  }
  return newest;
}

/**
 * Sorts an application list deterministically without mutating the input array.
 *
 * @param {Array<Object>} apps
 * @param {"name-asc"|"name-desc"|"recent"} [sortBy="name-asc"]
 * @returns {Array<Object>}
 */
export function sortApps(apps = [], sortBy = "name-asc") {
  const list = Array.isArray(apps) ? apps.slice() : [];
  const labelOf = (app) => String(app?.name || app?.slug || "").trim().toLowerCase();

  if (sortBy === "name-desc") {
    return list.sort((a, b) => labelOf(b).localeCompare(labelOf(a)));
  }

  if (sortBy === "recent") {
    return list.sort((a, b) => {
      const diff = getLatestReleaseTimestamp(b) - getLatestReleaseTimestamp(a);
      if (diff !== 0) return diff;
      return labelOf(a).localeCompare(labelOf(b));
    });
  }

  return list.sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
}

