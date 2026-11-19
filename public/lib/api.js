/**
 * Client API wrapper for /api/apps.
 * Includes in-memory caching for catalog requests and detailed error reporting.
 */

let catalogCache = null;

/**
 * Fetches the full apps catalog from /api/apps.
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<{ apps: Array<Object>, count: number }>}
 */
export async function fetchAppsCatalog(forceRefresh = false) {
  if (catalogCache && !forceRefresh) {
    return catalogCache;
  }

  let res;
  try {
    res = await fetch("/api/apps");
  } catch (netErr) {
    throw new Error(`Network failure connecting to catalog: ${netErr.message || "Failed to fetch"}`);
  }

  if (!res.ok) {
    let detail = `Status ${res.status}`;
    try {
      const data = await res.json();
      if (data.message) detail = data.message;
    } catch (_) {}
    throw new Error(`Failed to load app catalog: ${detail}`);
  }

  const data = await res.json();
  catalogCache = data;
  return data;
}

/**
 * Fetches details and documentation for a specific app.
 *
 * @param {string} slug
 * @returns {Promise<{ app: Object, docs: { features?: string, changelog?: string } }>}
 */
export async function fetchAppDetail(slug) {
  if (!slug || typeof slug !== "string") {
    throw new Error("A valid app slug must be specified.");
  }

  let res;
  try {
    res = await fetch(`/api/apps?slug=${encodeURIComponent(slug.trim())}`);
  } catch (netErr) {
    throw new Error(`Network failure requesting app '${slug}': ${netErr.message || "Failed to fetch"}`);
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data.message) detail = data.message;
    } catch (_) {}
    throw new Error(`Failed to load app '${slug}': ${detail}`);
  }

  return await res.json();
}
