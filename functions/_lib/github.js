import registry from "./registry.js";

export const DEFAULT_TRUSTED_DOWNLOAD_HOSTS = [
  "dl.vib.tools",
  "github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com"
];

export const DEFAULT_TRUSTED_INSTALLER_HOSTS = [
  ...DEFAULT_TRUSTED_DOWNLOAD_HOSTS,
  "raw.githubusercontent.com"
];

const FROZEN_ROOT_KEYS = new Set([
  "$schema",
  "schemaVersion",
  "slug",
  "name",
  "tagline",
  "category",
  "access",
  "icon",
  "latest",
  "installer",
  "docs",
  "platforms",
  "architectures",
  "requirements",
  "screenshots",
  "dependencies",
  "links",
  "versions"
]);

const FROZEN_VERSION_KEYS = new Set([
  "url",
  "installer",
  "size",
  "sha256",
  "released_at",
  "channel",
  "deprecated"
]);

const ALLOWED_INSTALLER_TYPES = new Set(["powershell", "bash", "sh", "cmd"]);
const ALLOWED_CHANNELS = new Set(["stable", "beta", "alpha"]);
const ALLOWED_ACCESS = new Set(["Free", "Paid", "Forge"]);
const STRICT_LOWER_SLUG_RE = /^[a-z0-9][a-z0-9-_]{0,63}$/;
const VERSION_KEY_RE = /^[vV]?[0-9][0-9A-Za-z._+-]{0,47}$/;
const SHA256_RE = /^[a-fA-F0-9]{64}$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const GITHUB_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

function isValidIsoCalendarDate(value) {
  if (typeof value !== "string") return false;
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

function hasPathTraversal(pathStr) {
  let decoded = pathStr;
  try {
    decoded = decodeURIComponent(pathStr);
  } catch (_) {}
  return decoded.split(/[/\\]/).includes("..") || pathStr.includes("..");
}

function isValidHttpsUrl(value) {
  if (typeof value !== "string" || !value.startsWith("https://")) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      Boolean(parsed.hostname) &&
      !parsed.username &&
      !parsed.password
    );
  } catch (_) {
    return false;
  }
}

/**
 * Validates a slug against safe alphanumeric & hyphen naming standards.
 * Prevents directory traversal and injection attacks.
 *
 * @param {string} slug
 * @returns {boolean}
 */
export function isValidSlug(slug) {
  if (typeof slug !== "string") {
    return false;
  }
  return /^[a-z0-9][a-z0-9-_]{0,63}$/i.test(slug.trim());
}

/**
 * Validates that a remote binary download URL is a syntactically valid HTTPS URL
 * pointing strictly to an allowlisted binary storage host (prevents open redirects).
 *
 * @param {string} rawUrl
 * @param {Object} [env]
 * @returns {boolean}
 */
export function isTrustedDownloadUrl(rawUrl, env) {
  return isTrustedHostUrl(rawUrl, DEFAULT_TRUSTED_DOWNLOAD_HOSTS, env);
}

/**
 * Validates that a remote installer script URL is a syntactically valid HTTPS URL
 * pointing strictly to an allowlisted host (includes raw.githubusercontent.com).
 *
 * @param {string} rawUrl
 * @param {Object} [env]
 * @returns {boolean}
 */
export function isTrustedInstallerUrl(rawUrl, env) {
  return isTrustedHostUrl(rawUrl, DEFAULT_TRUSTED_INSTALLER_HOSTS, env);
}

function isTrustedHostUrl(rawUrl, baseHosts, env) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return false;

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (_) {
    return false;
  }

  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;

  const extraHosts = String(env?.ALLOWED_DOWNLOAD_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  const allowedHosts = new Set([...baseHosts, ...extraHosts]);
  return allowedHosts.has(parsed.hostname.toLowerCase());
}

/**
 * Parses a GitHub repository URL or "owner/repo" shorthand into canonical form.
 * Supports:
 * - "https://github.com/owner/repo"
 * - "https://github.com/owner/repo.git"
 * - "https://github.com/owner/repo/tree/<branch>"
 * - "github.com/owner/repo"
 * - "owner/repo"
 *
 * @param {string} input
 * @returns {{ repo: string, owner: string, name: string, branch?: string } | null}
 */
export function parseRepoIdentifier(input) {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  let owner = "";
  let name = "";
  let branch = undefined;

  if (/^https?:\/\//i.test(raw) || /^github\.com\//i.test(raw)) {
    const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let parsed;
    try {
      parsed = new URL(normalizedUrl);
    } catch (_) {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") {
      return null;
    }

    const parts = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;

    owner = parts[0];
    name = parts[1].replace(/\.git$/i, "");

    if (parts[2] === "tree" && parts[3]) {
      branch = parts.slice(3).join("/");
    }
  } else {
    const parts = raw.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    owner = parts[0];
    name = parts[1].replace(/\.git$/i, "");
  }

  if (
    !owner ||
    !name ||
    owner === "." ||
    owner === ".." ||
    name === "." ||
    name === ".." ||
    !GITHUB_SEGMENT_RE.test(owner) ||
    !GITHUB_SEGMENT_RE.test(name)
  ) {
    return null;
  }

  return {
    repo: `${owner}/${name}`,
    owner,
    name,
    ...(branch ? { branch } : {})
  };
}

/**
 * Normalizes a raw registry.json item (bare GitHub URL string, "owner/repo" string,
 * or full config object) into a uniform internal registry entry.
 *
 * @param {string|Object} rawEntry
 * @returns {{ repo: string, repoName: string, slug: string|null, branch: string, featured: boolean } | null}
 */
export function normalizeRegistryEntry(rawEntry) {
  if (typeof rawEntry === "string") {
    const parsed = parseRepoIdentifier(rawEntry);
    if (!parsed) return null;
    return {
      repo: parsed.repo,
      repoName: parsed.name,
      slug: null,
      branch: parsed.branch || "main",
      featured: false
    };
  }

  if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
    return null;
  }

  const repoInput =
    typeof rawEntry.repo === "string" && rawEntry.repo.trim()
      ? rawEntry.repo
      : typeof rawEntry.url === "string" && rawEntry.url.trim()
        ? rawEntry.url
        : "";

  const parsed = parseRepoIdentifier(repoInput);
  if (!parsed) return null;

  const explicitSlug =
    typeof rawEntry.slug === "string" && isValidSlug(rawEntry.slug)
      ? rawEntry.slug.trim().toLowerCase()
      : null;

  const explicitBranch =
    typeof rawEntry.branch === "string" && rawEntry.branch.trim()
      ? rawEntry.branch.trim()
      : null;

  return {
    repo: parsed.repo,
    repoName: parsed.name,
    slug: explicitSlug,
    branch: explicitBranch || parsed.branch || "main",
    featured: Boolean(rawEntry.featured)
  };
}

/**
 * Returns the normalized array of registered app repositories from registry.json.
 *
 * @param {Array|Object} [source=registry]
 * @returns {Array<{ repo: string, repoName: string, slug: string|null, branch: string, featured: boolean }>}
 */
export function getRegistry(source = registry) {
  const rawList = Array.isArray(source)
    ? source
    : source && Array.isArray(source.apps)
      ? source.apps
      : [];

  const seen = new Set();
  const deduped = [];
  for (const rawItem of rawList) {
    const normalized = normalizeRegistryEntry(rawItem);
    if (!normalized) continue;
    const dedupeKey = `${normalized.repo.toLowerCase()}@${normalized.branch}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    deduped.push(normalized);
  }
  return deduped;
}

/**
 * Case-insensitive fast search for a registered app entry by explicit slug
 * or matching repository name.
 *
 * @param {string} slug
 * @param {Array} [entries]
 * @returns {Object|null}
 */
export function findAppEntry(slug, entries) {
  if (!isValidSlug(slug)) {
    return null;
  }
  const clean = slug.trim().toLowerCase();
  const list = Array.isArray(entries) ? entries : getRegistry();

  const exactSlugMatch = list.find((item) => item?.slug && item.slug.toLowerCase() === clean);
  if (exactSlugMatch) return exactSlugMatch;

  const repoNameMatch = list.find(
    (item) => !item?.slug && item?.repoName && item.repoName.toLowerCase() === clean
  );
  return repoNameMatch || null;
}

/**
 * Fetches a raw file from a GitHub repository via the GitHub Contents API.
 * Supports private repositories via env.GITHUB_TOKEN and integrates
 * Cloudflare Cache API (caches.default) to eliminate rate-limit bottlenecks.
 *
 * @param {string} repo - Repository owner/name (e.g. "vib-tools/calgrid")
 * @param {string} branch - Target git branch or commit ref
 * @param {string} filePath - Path to file within the repository
 * @param {Object} env - Worker environment variables
 * @param {Object} ctx - Worker execution context (provides waitUntil)
 * @param {Object} [options]
 * @param {number} [options.ttl=300] - Cache time-to-live in seconds (default 5 minutes)
 * @returns {Promise<{ ok: boolean, text?: string, status: number, error?: string, cached?: boolean }>}
 */
export async function fetchRepoFile(repo, branch, filePath, env, ctx, { ttl = 300 } = {}) {
  if (typeof repo !== "string" || !repo.includes("/")) {
    return { ok: false, status: 400, error: "Invalid repository format" };
  }

  if (typeof filePath !== "string" || !filePath.trim()) {
    return { ok: false, status: 400, error: "Invalid file path" };
  }

  // Reject directory traversal attempts (including URL-encoded)
  let decodedPath = filePath;
  try {
    decodedPath = decodeURIComponent(filePath);
  } catch (_) {}
  const segments = decodedPath.split(/[/\\]/);
  if (segments.includes("..") || filePath.includes("..")) {
    return { ok: false, status: 400, error: "Directory traversal is forbidden" };
  }

  const cleanPath = filePath.replace(/^[/\\]+/, "");
  const targetBranch = (branch && branch.trim()) || "main";

  // Construct synthetic cache key for Cloudflare Cache API (zone-aligned)
  const cacheKeyUrl = `https://apps.vib.tools/__cache/gh/${encodeURIComponent(repo)}/${encodeURIComponent(targetBranch)}/${cleanPath}`;
  const cacheKey = new Request(cacheKeyUrl);

  let cache = null;
  try {
    if (typeof caches !== "undefined" && caches?.default) {
      cache = caches.default;
    }
  } catch (_) {
    cache = null;
  }

  // 1. Check Edge Cache
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const text = await cached.text();
        return { ok: true, text, status: 200, cached: true };
      }
    } catch (_) {
      // Continue to fetch if cache lookup fails
    }
  }

  // 2. Fetch from GitHub Contents API (with automatic raw.githubusercontent.com fallback on 403/429/5xx/network errors)
  const encodedCleanPath = cleanPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${encodedCleanPath}?ref=${encodeURIComponent(targetBranch)}`;
  const rawUrl = `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(targetBranch)}/${encodedCleanPath}`;
  const headers = {
    "Accept": "application/vnd.github.raw+json",
    "User-Agent": "vib-apps-hub"
  };

  if (env && typeof env.GITHUB_TOKEN === "string" && env.GITHUB_TOKEN.trim()) {
    headers["Authorization"] = `Bearer ${env.GITHUB_TOKEN.trim()}`;
  }

  let res = null;
  let fetchError = null;
  try {
    res = await fetch(apiUrl, { headers });
  } catch (err) {
    fetchError = err;
  }

  // Fallback to raw.githubusercontent.com for public repos when GitHub REST API is rate-limited (403/429) or unreachable
  const shouldFallbackToRaw =
    !res || res.status === 403 || res.status === 429 || res.status >= 500;
  if (shouldFallbackToRaw) {
    try {
      const rawRes = await fetch(rawUrl, {
        headers: { "User-Agent": "vib-apps-hub" }
      });
      if (rawRes.ok) {
        res = rawRes;
        fetchError = null;
      }
    } catch (_) {
      // Preserve primary GitHub API error when fallback also fails
    }
  }

  if (!res) {
    return {
      ok: false,
      status: 502,
      error: `Network error requesting ${cleanPath}: ${fetchError?.message || "Unknown error"}`
    };
  }

  if (!res.ok) {
    let errorDetail = `GitHub API returned status ${res.status}`;
    if (res.status === 404) {
      errorDetail = `File '${cleanPath}' not found in repository ${repo}@${targetBranch}`;
    } else if (res.status === 401 || res.status === 403) {
      errorDetail = `Authentication or rate limit failure (${res.status}) accessing ${repo}`;
    }
    return {
      ok: false,
      status: res.status,
      error: errorDetail
    };
  }

  const text = await res.text();

  // 3. Cache the successful response
  if (cache) {
    try {
      const responseToCache = new Response(text, {
        status: 200,
        headers: {
          "Content-Type": res.headers.get("Content-Type") || "text/plain; charset=utf-8",
          "Cache-Control": `public, max-age=${ttl}`
        }
      });
      const putPromise = cache.put(cacheKey, responseToCache);
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(putPromise);
      } else {
        await putPromise;
      }
    } catch (_) {
      // Non-fatal if cache write encounters an error
    }
  }

  return { ok: true, text, status: 200 };
}

/**
 * Fetches a remote installer script from a trusted HTTPS URL with Edge Caching.
 *
 * @param {string} remoteUrl
 * @param {Object} env
 * @param {Object} ctx
 * @param {Object} [options]
 * @returns {Promise<{ ok: boolean, text?: string, status: number, error?: string, cached?: boolean }>}
 */
export async function fetchTrustedRemoteScript(remoteUrl, env, ctx, { ttl = 300 } = {}) {
  if (!isTrustedInstallerUrl(remoteUrl, env)) {
    return {
      ok: false,
      status: 403,
      error: `Untrusted or invalid remote installer URL: '${remoteUrl}'`
    };
  }

  const cacheKey = new Request(
    `https://apps.vib.tools/__cache/script/${encodeURIComponent(remoteUrl)}`
  );

  let cache = null;
  try {
    if (typeof caches !== "undefined" && caches?.default) {
      cache = caches.default;
    }
  } catch (_) {
    cache = null;
  }

  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const text = await cached.text();
        return { ok: true, text, status: 200, cached: true };
      }
    } catch (_) {}
  }

  let res;
  try {
    res = await fetch(remoteUrl, {
      headers: { "User-Agent": "vib-apps-hub" }
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: `Network error fetching remote installer: ${err?.message || "Unknown error"}`
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: `Remote installer endpoint returned status ${res.status}`
    };
  }

  const text = await res.text();

  if (cache) {
    try {
      const responseToCache = new Response(text, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": `public, max-age=${ttl}`
        }
      });
      const putPromise = cache.put(cacheKey, responseToCache);
      if (ctx && typeof ctx.waitUntil === "function") {
        ctx.waitUntil(putPromise);
      } else {
        await putPromise;
      }
    } catch (_) {}
  }

  return { ok: true, text, status: 200 };
}

function validateInstallerTargetString(target, label, isStrictV1) {
  const trimmed = target.trim();
  if (!trimmed) {
    return { ok: false, status: 422, error: `${label} must be a non-empty string` };
  }
  if (isStrictV1) {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      if (!isValidHttpsUrl(trimmed)) {
        return {
          ok: false,
          status: 422,
          error: `${label} remote URL must be a valid https:// URL`
        };
      }
    } else if (hasPathTraversal(trimmed)) {
      return {
        ok: false,
        status: 422,
        error: `${label} path must not contain directory traversal ('..')`
      };
    }
  }
  return { ok: true };
}

function validateInstallerSpec(spec, label, isStrictV1) {
  if (spec === undefined) return { ok: true };

  if (typeof spec === "string") {
    return validateInstallerTargetString(spec, label, isStrictV1);
  }

  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    return { ok: false, status: 422, error: `${label} must be a string or installer object` };
  }

  if (isStrictV1) {
    for (const key of Object.keys(spec)) {
      if (key !== "type" && key !== "script") {
        return { ok: false, status: 422, error: `Unknown property '${key}' in ${label}` };
      }
    }
  }

  if (typeof spec.script !== "string") {
    return { ok: false, status: 422, error: `${label}.script must be a non-empty string` };
  }

  const scriptCheck = validateInstallerTargetString(spec.script, `${label}.script`, isStrictV1);
  if (!scriptCheck.ok) return scriptCheck;

  if (spec.type !== undefined) {
    if (typeof spec.type !== "string" || (isStrictV1 && !ALLOWED_INSTALLER_TYPES.has(spec.type))) {
      return {
        ok: false,
        status: 422,
        error: `${label}.type must be one of: powershell, bash, sh, cmd`
      };
    }
  }

  return { ok: true };
}

/**
 * Validates a parsed app.config.json object against the frozen vibtools-app.schema.json (v1)
 * invariants. When schemaVersion === 1 is declared, strict frozen schema rules
 * (additionalProperties: false, HTTPS URLs, ISO dates, 64-hex SHA256) are enforced.
 *
 * @param {any} config
 * @returns {{ ok: boolean, status?: number, error?: string }}
 */
export function validateAppConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { ok: false, status: 422, error: "app.config.json root must be a plain object" };
  }

  if (config.schemaVersion !== undefined && config.schemaVersion !== 1) {
    return {
      ok: false,
      status: 422,
      error: `Unsupported schemaVersion '${config.schemaVersion}'. Frozen Vib Apps schema requires schemaVersion: 1`
    };
  }

  const isStrictV1 = config.schemaVersion === 1;

  if (isStrictV1) {
    const unknownRootKeys = Object.keys(config).filter((k) => !FROZEN_ROOT_KEYS.has(k));
    if (unknownRootKeys.length > 0) {
      return {
        ok: false,
        status: 422,
        error: `Unknown properties in frozen v1 app.config.json: ${unknownRootKeys.join(", ")}`
      };
    }
  }

  const required = ["slug", "name", "latest", "versions"];
  const missing = required.filter((field) => !config[field]);
  if (missing.length > 0) {
    return {
      ok: false,
      status: 422,
      error: `Missing required fields in app.config.json: ${missing.join(", ")}`
    };
  }

  if (
    typeof config.slug !== "string" ||
    !config.slug.trim() ||
    !isValidSlug(config.slug) ||
    (isStrictV1 && !STRICT_LOWER_SLUG_RE.test(config.slug)) ||
    typeof config.name !== "string" ||
    !config.name.trim() ||
    (isStrictV1 && config.name.length > 80) ||
    typeof config.latest !== "string" ||
    !config.latest.trim() ||
    (isStrictV1 && !VERSION_KEY_RE.test(config.latest))
  ) {
    return {
      ok: false,
      status: 422,
      error: "Fields slug (lowercase in v1), name, and latest in app.config.json must be valid non-empty strings"
    };
  }

  if (isStrictV1) {
    if (config.$schema !== undefined && !isValidHttpsUrl(config.$schema)) {
      return { ok: false, status: 422, error: "Field $schema must be a valid https:// URI string" };
    }
    if (config.tagline !== undefined && (typeof config.tagline !== "string" || !config.tagline.trim() || config.tagline.length > 160)) {
      return { ok: false, status: 422, error: "Field tagline must be a non-empty string (max 160 chars)" };
    }
    if (config.category !== undefined && (typeof config.category !== "string" || !config.category.trim() || config.category.length > 48)) {
      return { ok: false, status: 422, error: "Field category must be a non-empty string (max 48 chars)" };
    }
    if (config.access !== undefined && !ALLOWED_ACCESS.has(config.access)) {
      return { ok: false, status: 422, error: "Field access in app.config.json must be 'Free', 'Paid', or 'Forge'" };
    }
    if (config.icon !== undefined && !isValidHttpsUrl(config.icon)) {
      return { ok: false, status: 422, error: "Field icon in app.config.json must be a valid https:// URL" };
    }
    if (config.platforms !== undefined) {
      if (
        !Array.isArray(config.platforms) ||
        config.platforms.some((p) => typeof p !== "string" || !p.trim() || p.length > 48) ||
        new Set(config.platforms).size !== config.platforms.length
      ) {
        return { ok: false, status: 422, error: "Field platforms must be an array of unique non-empty strings" };
      }
    }
    if (config.architectures !== undefined) {
      if (
        !Array.isArray(config.architectures) ||
        config.architectures.some((a) => typeof a !== "string" || !a.trim() || a.length > 24) ||
        new Set(config.architectures).size !== config.architectures.length
      ) {
        return { ok: false, status: 422, error: "Field architectures must be an array of unique non-empty strings" };
      }
    }
    if (config.requirements !== undefined) {
      const isValidArr =
        Array.isArray(config.requirements) &&
        config.requirements.length > 0 &&
        config.requirements.every((r) => typeof r === "string" && r.trim().length > 0);
      const isValidObj =
        !Array.isArray(config.requirements) &&
        config.requirements &&
        typeof config.requirements === "object" &&
        Object.keys(config.requirements).length > 0 &&
        Object.values(config.requirements).every((v) => typeof v === "string" && v.trim().length > 0);
      if (!isValidArr && !isValidObj) {
        return { ok: false, status: 422, error: "Field requirements must be a non-empty string array or string map" };
      }
    }
    if (config.screenshots !== undefined) {
      if (!Array.isArray(config.screenshots)) {
        return { ok: false, status: 422, error: "Field screenshots must be an array" };
      }
      for (const item of config.screenshots) {
        if (typeof item === "string") {
          if (!isValidHttpsUrl(item)) {
            return { ok: false, status: 422, error: "Each screenshot URL must be a valid https:// URL" };
          }
        } else if (item && typeof item === "object" && !Array.isArray(item)) {
          const itemKeys = Object.keys(item);
          if (itemKeys.some((k) => k !== "url" && k !== "alt")) {
            return { ok: false, status: 422, error: "Screenshot objects only allow 'url' and 'alt' properties" };
          }
          if (!isValidHttpsUrl(item.url)) {
            return { ok: false, status: 422, error: "Screenshot object url must be a valid https:// URL" };
          }
          if (item.alt !== undefined && (typeof item.alt !== "string" || item.alt.length > 160)) {
            return { ok: false, status: 422, error: "Screenshot object alt must be a string (max 160 chars)" };
          }
        } else {
          return { ok: false, status: 422, error: "Each screenshot entry must be an https:// string or { url, alt? } object" };
        }
      }
    }
    if (config.dependencies !== undefined) {
      if (!Array.isArray(config.dependencies) || config.dependencies.length === 0) {
        return { ok: false, status: 422, error: "Field dependencies must be a non-empty array of companion tool objects" };
      }
      const allowedDepKeys = new Set(["name", "url", "version", "note", "required"]);
      for (const dep of config.dependencies) {
        if (!dep || typeof dep !== "object" || Array.isArray(dep)) {
          return { ok: false, status: 422, error: "Each dependencies item must be a plain object with name and url" };
        }
        const unknownDepKeys = Object.keys(dep).filter((k) => !allowedDepKeys.has(k));
        if (unknownDepKeys.length > 0) {
          return { ok: false, status: 422, error: `Unknown properties in dependencies item: ${unknownDepKeys.join(", ")}` };
        }
        if (typeof dep.name !== "string" || !dep.name.trim() || dep.name.length > 80) {
          return { ok: false, status: 422, error: "Each dependencies item name must be a non-empty string (max 80 chars)" };
        }
        if (!isValidHttpsUrl(dep.url)) {
          return { ok: false, status: 422, error: "Each dependencies item url must be a valid https:// URL without credentials" };
        }
        if (dep.version !== undefined && (typeof dep.version !== "string" || !dep.version.trim() || dep.version.length > 32)) {
          return { ok: false, status: 422, error: "Each dependencies item version must be a non-empty string (max 32 chars)" };
        }
        if (dep.note !== undefined && (typeof dep.note !== "string" || !dep.note.trim() || dep.note.length > 140)) {
          return { ok: false, status: 422, error: "Each dependencies item note must be a non-empty string (max 140 chars)" };
        }
        if (dep.required !== undefined && typeof dep.required !== "boolean") {
          return { ok: false, status: 422, error: "Each dependencies item required flag must be a boolean" };
        }
      }
    }
    if (config.links !== undefined) {
      if (
        !config.links ||
        typeof config.links !== "object" ||
        Array.isArray(config.links) ||
        Object.keys(config.links).length === 0 ||
        Object.values(config.links).some((u) => !isValidHttpsUrl(u))
      ) {
        return { ok: false, status: 422, error: "Field links must be a non-empty object mapping names to valid https:// URLs" };
      }
    }
  }

  const rootInstCheck = validateInstallerSpec(config.installer, "installer", isStrictV1);
  if (!rootInstCheck.ok) return rootInstCheck;

  if (config.docs !== undefined) {
    if (!config.docs || typeof config.docs !== "object" || Array.isArray(config.docs)) {
      return { ok: false, status: 422, error: "Field docs in app.config.json must be an object" };
    }
    if (isStrictV1) {
      for (const docKey of Object.keys(config.docs)) {
        if (docKey !== "features" && docKey !== "changelog") {
          return {
            ok: false,
            status: 422,
            error: `Unknown property '${docKey}' in docs (allowed: features, changelog)`
          };
        }
        if (typeof config.docs[docKey] !== "string" || !config.docs[docKey].trim()) {
          return {
            ok: false,
            status: 422,
            error: `docs.${docKey} must be a non-empty string`
          };
        }
        const docVal = config.docs[docKey].trim();
        if (hasPathTraversal(docVal) || /^[a-z][a-z0-9+.-]*:/i.test(docVal)) {
          return {
            ok: false,
            status: 422,
            error: `docs.${docKey} must be a safe repo-relative Markdown path without traversal ('..') or URI schemes`
          };
        }
      }
    }
  }

  if (
    !config.versions ||
    typeof config.versions !== "object" ||
    Array.isArray(config.versions) ||
    Object.keys(config.versions).length === 0
  ) {
    return {
      ok: false,
      status: 422,
      error: "Field versions in app.config.json must be a non-empty object map"
    };
  }

  for (const [verKey, verObj] of Object.entries(config.versions)) {
    if (!VERSION_KEY_RE.test(verKey)) {
      return {
        ok: false,
        status: 422,
        error: `Invalid version key '${verKey}' in app.config.json`
      };
    }

    if (!verObj || typeof verObj !== "object" || Array.isArray(verObj)) {
      return {
        ok: false,
        status: 422,
        error: `Version entry '${verKey}' must be a plain object`
      };
    }

    if (isStrictV1) {
      const unknownVerKeys = Object.keys(verObj).filter((k) => !FROZEN_VERSION_KEYS.has(k));
      if (unknownVerKeys.length > 0) {
        return {
          ok: false,
          status: 422,
          error: `Unknown properties in versions.${verKey}: ${unknownVerKeys.join(", ")}`
        };
      }

      if (!isValidHttpsUrl(verObj.url)) {
        return {
          ok: false,
          status: 422,
          error: `versions.${verKey}.url is required and must be a valid https:// URL`
        };
      }

      if (verObj.size !== undefined && (typeof verObj.size !== "string" || !verObj.size.trim() || verObj.size.length > 32)) {
        return {
          ok: false,
          status: 422,
          error: `versions.${verKey}.size must be a non-empty string (max 32 chars)`
        };
      }

      if (verObj.sha256 !== undefined && (typeof verObj.sha256 !== "string" || !SHA256_RE.test(verObj.sha256))) {
        return {
          ok: false,
          status: 422,
          error: `versions.${verKey}.sha256 must be a 64-character hexadecimal string`
        };
      }

      if (verObj.released_at !== undefined && !isValidIsoCalendarDate(verObj.released_at)) {
        return {
          ok: false,
          status: 422,
          error: `versions.${verKey}.released_at must be a valid calendar date in strict YYYY-MM-DD format`
        };
      }
    }

    if (verObj.channel !== undefined && !ALLOWED_CHANNELS.has(verObj.channel)) {
      return {
        ok: false,
        status: 422,
        error: `versions.${verKey}.channel must be one of: stable, beta, alpha`
      };
    }

    if (verObj.deprecated !== undefined && typeof verObj.deprecated !== "boolean") {
      return {
        ok: false,
        status: 422,
        error: `versions.${verKey}.deprecated must be a boolean`
      };
    }

    const verInstCheck = validateInstallerSpec(
      verObj.installer,
      `versions.${verKey}.installer`,
      isStrictV1
    );
    if (!verInstCheck.ok) return verInstCheck;
  }

  if (isStrictV1) {
    if (!Object.hasOwn(config.versions, config.latest)) {
      return {
        ok: false,
        status: 422,
        error: `Latest version '${config.latest}' must match an exact key in versions`
      };
    }
  } else {
    const latestNorm = config.latest.trim().toLowerCase().replace(/^v/, "");
    const hasLatestEntry = Object.keys(config.versions).some(
      (k) => k.toLowerCase().replace(/^v/, "") === latestNorm
    );
    if (!hasLatestEntry) {
      return {
        ok: false,
        status: 422,
        error: `Latest version '${config.latest}' not found in app.config.json versions map`
      };
    }
  }

  return { ok: true };
}

/**
 * Fetches and validates the .vibtools/apps/app.config.json file for an app entry.
 * Falls back to legacy .vibtools/app.config.json on 404.
 *
 * @param {Object} entry - Normalized entry from getRegistry()
 * @param {Object} env - Worker environment
 * @param {Object} ctx - Worker context
 * @returns {Promise<{ ok: boolean, config?: Object, status?: number, error?: string }>}
 */
export async function fetchAppConfig(entry, env, ctx) {
  if (!entry || typeof entry.repo !== "string") {
    return { ok: false, status: 400, error: "Invalid app entry" };
  }

  let res = await fetchRepoFile(
    entry.repo,
    entry.branch || "main",
    ".vibtools/apps/app.config.json",
    env,
    ctx
  );

  // Fallback: check root .vibtools/app.config.json if .vibtools/apps/ was 404
  if (!res.ok && res.status === 404) {
    const fallbackRes = await fetchRepoFile(
      entry.repo,
      entry.branch || "main",
      ".vibtools/app.config.json",
      env,
      ctx
    );
    if (fallbackRes.ok) {
      res = fallbackRes;
    }
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: res.error };
  }

  let config;
  try {
    config = JSON.parse(res.text);
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: `Invalid JSON in .vibtools/apps/app.config.json: ${err?.message || "Parse error"}`
    };
  }

  const validation = validateAppConfig(config);
  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    config: {
      ...config,
      featured: Boolean(entry.featured)
    }
  };
}

/**
 * Resolves a registered application by slug, supporting both explicit registry slugs
 * and zero-config GitHub repo URL entries (auto-discovering slug from app.config.json).
 *
 * @param {string} slug
 * @param {Object} env
 * @param {Object} ctx
 * @param {Object} [options]
 * @param {Array} [options.entries] - Optional pre-normalized registry entries (for testing)
 * @param {Function} [options.configFetcher] - Optional fetcher override (for testing)
 * @returns {Promise<{ entry: Object, config: Object } | null>}
 */
export async function resolveAppBySlug(slug, env, ctx, options = {}) {
  if (!isValidSlug(slug)) return null;

  const clean = slug.trim().toLowerCase();
  const entries = Array.isArray(options.entries)
    ? options.entries
    : Array.isArray(env?.__REGISTRY_OVERRIDE)
      ? getRegistry(env.__REGISTRY_OVERRIDE)
      : getRegistry();
  const loadConfig = typeof options.configFetcher === "function" ? options.configFetcher : fetchAppConfig;

  const triedRepos = new Set();
  const entryKey = (item) => `${String(item.repo || "").toLowerCase()}@${item.branch || "main"}`;

  // 1. Fast path: explicit slug match or matching repo name
  const directCandidate = findAppEntry(clean, entries);
  if (directCandidate) {
    triedRepos.add(entryKey(directCandidate));
    const cfgRes = await loadConfig(directCandidate, env, ctx);
    if (cfgRes?.ok && cfgRes.config) {
      if (
        directCandidate.slug ||
        cfgRes.config.slug.trim().toLowerCase() === clean
      ) {
        return { entry: directCandidate, config: cfgRes.config };
      }
    }
  }

  // 2. Auto-discovery scan for URL-only registry entries whose repo name differs from app slug
  const remainingCandidates = entries.filter(
    (item) => !triedRepos.has(entryKey(item)) && (!item.slug || item.slug.toLowerCase() === clean)
  );

  if (remainingCandidates.length === 0) {
    return null;
  }

  const settled = await Promise.allSettled(
    remainingCandidates.map((item) => loadConfig(item, env, ctx))
  );

  for (let i = 0; i < settled.length; i += 1) {
    const res = settled[i];
    if (
      res.status === "fulfilled" &&
      res.value?.ok &&
      res.value.config &&
      res.value.config.slug.trim().toLowerCase() === clean
    ) {
      return {
        entry: remainingCandidates[i],
        config: res.value.config
      };
    }
  }

  return null;
}

/**
 * Extracts a script path or HTTPS URL from an installer spec (string or { type, script }).
 *
 * @param {string|Object|undefined|null} spec
 * @returns {string|null}
 */
export function extractInstallerTarget(spec) {
  if (typeof spec === "string" && spec.trim()) {
    return spec.trim();
  }
  if (spec && typeof spec === "object" && typeof spec.script === "string" && spec.script.trim()) {
    return spec.script.trim();
  }
  return null;
}

/**
 * Fetches the raw PowerShell installer script for an app entry and target version.
 * Priority:
 * 1. versionData.installer (per-version override: repo path or trusted HTTPS URL)
 * 2. config.installer (root default: repo path or trusted HTTPS URL)
 * 3. Default repo paths: .vibtools/apps/installer.ps1 -> .vibtools/installer.ps1 -> .vibtools/install.ps1
 *
 * @param {Object} entry - Normalized entry from getRegistry()
 * @param {Object} config - Parsed app.config.json
 * @param {Object} env - Worker environment
 * @param {Object} ctx - Worker context
 * @param {Object|null} [versionData=null] - Resolved version object from config.versions
 * @returns {Promise<{ ok: boolean, script?: string, status?: number, error?: string }>}
 */
export async function fetchAppInstaller(entry, config, env, ctx, versionData = null) {
  if (!entry || typeof entry.repo !== "string") {
    return { ok: false, status: 400, error: "Invalid app entry" };
  }

  const explicitTarget =
    extractInstallerTarget(versionData?.installer) ||
    extractInstallerTarget(config?.installer);

  // Remote HTTPS/HTTP URL installer (e.g. https://dl.vib.tools/.../install.ps1)
  if (explicitTarget && /^https?:\/\//i.test(explicitTarget)) {
    const remoteRes = await fetchTrustedRemoteScript(explicitTarget, env, ctx);
    if (!remoteRes.ok) {
      return { ok: false, status: remoteRes.status, error: remoteRes.error };
    }
    return { ok: true, script: remoteRes.text };
  }

  const branch = entry.branch || "main";
  const candidatePaths = [];

  if (explicitTarget) {
    if (!explicitTarget.includes("/")) {
      // Bare filename (e.g. "installer.ps1"): check .vibtools/apps/ first, then .vibtools/
      candidatePaths.push(`.vibtools/apps/${explicitTarget}`, `.vibtools/${explicitTarget}`);
    } else {
      candidatePaths.push(explicitTarget);
    }
  } else {
    candidatePaths.push(
      ".vibtools/apps/installer.ps1",
      ".vibtools/installer.ps1",
      ".vibtools/install.ps1"
    );
  }

  let lastRes = { ok: false, status: 404, error: "Installer script not found" };
  for (const candidatePath of candidatePaths) {
    const res = await fetchRepoFile(entry.repo, branch, candidatePath, env, ctx);
    if (res.ok) {
      return { ok: true, script: res.text };
    }
    lastRes = res;
    if (res.status !== 404) {
      break;
    }
  }

  return { ok: false, status: lastRes.status, error: lastRes.error };
}

/**
 * Fetches a documentation file (e.g., features.md, changelog.md) for an app entry.
 * Bare filenames resolve inside .vibtools/apps/ first, falling back to .vibtools/.
 * Returns raw text content if found, or null on any error or missing path.
 *
 * @param {Object} entry - Normalized entry from getRegistry()
 * @param {string|undefined|null} docPath - Relative path to the markdown file
 * @param {Object} env - Worker environment
 * @param {Object} ctx - Worker context
 * @param {string|null} [defaultFilename=null] - Fallback filename when docPath is omitted
 * @returns {Promise<string|null>}
 */
export async function fetchAppDoc(entry, docPath, env, ctx, defaultFilename = null) {
  if (!entry || typeof entry.repo !== "string") {
    return null;
  }

  const rawTarget =
    typeof docPath === "string" && docPath.trim()
      ? docPath.trim()
      : typeof defaultFilename === "string" && defaultFilename.trim()
        ? defaultFilename.trim()
        : "";

  if (!rawTarget) {
    return null;
  }

  const branch = entry.branch || "main";
  const candidatePaths = !rawTarget.includes("/")
    ? [`.vibtools/apps/${rawTarget}`, `.vibtools/${rawTarget}`]
    : [rawTarget];

  for (const candidatePath of candidatePaths) {
    const res = await fetchRepoFile(entry.repo, branch, candidatePath, env, ctx);
    if (res.ok) {
      return res.text;
    }
    if (res.status !== 404) {
      return null;
    }
  }

  return null;
}
