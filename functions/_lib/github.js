import registry from "../../registry.json";

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
 * Returns the normalized array of registered app repositories from registry.json.
 *
 * @returns {Array<Object>}
 */
export function getRegistry() {
  if (Array.isArray(registry)) {
    return registry;
  }
  if (registry && Array.isArray(registry.apps)) {
    return registry.apps;
  }
  return [];
}

/**
 * Case-insensitive search for a registered app entry by its slug.
 *
 * @param {string} slug
 * @returns {Object|null}
 */
export function findAppEntry(slug) {
  if (!isValidSlug(slug)) {
    return null;
  }
  const clean = slug.trim().toLowerCase();
  const list = getRegistry();
  const found = list.find(
    (item) => item && typeof item.slug === "string" && item.slug.toLowerCase() === clean
  );
  return found || null;
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

  // 2. Fetch from GitHub API
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(targetBranch)}`;
  const headers = {
    "Accept": "application/vnd.github.raw+json",
    "User-Agent": "vib-apps-hub"
  };

  if (env && typeof env.GITHUB_TOKEN === "string" && env.GITHUB_TOKEN.trim()) {
    headers["Authorization"] = `Bearer ${env.GITHUB_TOKEN.trim()}`;
  }

  let res;
  try {
    res = await fetch(apiUrl, { headers });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: `Network error requesting ${cleanPath}: ${err?.message || "Unknown error"}`
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
 * Fetches and validates the .vibtools/apps/app.config.json file for an app entry.
 *
 * @param {Object} entry - Entry from registry.json
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

  if (!config || typeof config !== "object") {
    return { ok: false, status: 422, error: "app.config.json root must be an object" };
  }

  // Validate minimum required fields per schema
  const required = ["slug", "name", "latest", "versions"];
  const missing = required.filter((field) => !config[field]);
  if (missing.length > 0) {
    return {
      ok: false,
      status: 422,
      error: `Missing required fields in app.config.json: ${missing.join(", ")}`
    };
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
 * Fetches the raw PowerShell installer script for an app entry.
 *
 * @param {Object} entry - Entry from registry.json
 * @param {Object} config - Parsed app.config.json
 * @param {Object} env - Worker environment
 * @param {Object} ctx - Worker context
 * @returns {Promise<{ ok: boolean, script?: string, status?: number, error?: string }>}
 */
export async function fetchAppInstaller(entry, config, env, ctx) {
  if (!entry || typeof entry.repo !== "string") {
    return { ok: false, status: 400, error: "Invalid app entry" };
  }

  let installerPath = ".vibtools/installer.ps1";
  if (config && typeof config.installer === "string" && config.installer.trim()) {
    installerPath = config.installer.trim();
  } else if (config && config.installer && typeof config.installer === "object" && config.installer.script) {
    installerPath = config.installer.script.trim();
  }

  // Normalize path to .vibtools/ if no directory is specified
  if (!installerPath.startsWith(".vibtools/") && !installerPath.includes("/")) {
    installerPath = `.vibtools/${installerPath}`;
  }

  let res = await fetchRepoFile(
    entry.repo,
    entry.branch || "main",
    installerPath,
    env,
    ctx
  );

  // Fallback to install.ps1 if default installer.ps1 was not found
  if (!res.ok && res.status === 404 && installerPath === ".vibtools/installer.ps1") {
    const fallbackRes = await fetchRepoFile(
      entry.repo,
      entry.branch || "main",
      ".vibtools/install.ps1",
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

  return { ok: true, script: res.text };
}

/**
 * Fetches a documentation file (e.g., features.md, changelog.md) for an app entry.
 * Returns raw text content if found, or null on any error or missing path.
 *
 * @param {Object} entry - Entry from registry.json
 * @param {string} docPath - Relative path to the markdown file
 * @param {Object} env - Worker environment
 * @param {Object} ctx - Worker context
 * @returns {Promise<string|null>}
 */
export async function fetchAppDoc(entry, docPath, env, ctx) {
  if (!entry || typeof entry.repo !== "string" || typeof docPath !== "string" || !docPath.trim()) {
    return null;
  }

  let cleanDocPath = docPath.trim();
  if (!cleanDocPath.startsWith(".vibtools/") && !cleanDocPath.includes("/")) {
    cleanDocPath = `.vibtools/${cleanDocPath}`;
  }

  const res = await fetchRepoFile(
    entry.repo,
    entry.branch || "main",
    cleanDocPath,
    env,
    ctx
  );

  if (!res.ok) {
    return null;
  }

  return res.text;
}
