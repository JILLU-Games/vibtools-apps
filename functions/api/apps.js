import {
  getRegistry,
  findAppEntry,
  isValidSlug,
  fetchAppConfig,
  fetchAppDoc
} from "../_lib/github.js";
import {
  getMockApps,
  findMockApp,
  getMockDoc
} from "../_lib/mockData.js";

/**
 * Cloudflare Pages Function: Store API handler (/api/apps).
 *
 * Supported modes:
 * - GET /api/apps -> Catalog list of all apps with their config metadata.
 * - GET /api/apps?slug=<slug> -> Single app metadata with full markdown documentation (features + changelog).
 *
 * @param {EventContext} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const slugParam = url.searchParams.get("slug");

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  try {
    // Mode B: Single App Details & Markdown Docs
    if (slugParam !== null) {
      const slug = slugParam.trim();
      if (!slug || !isValidSlug(slug)) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: `Invalid slug format '${slugParam}'. Slugs must be 1-64 alphanumeric characters, hyphens, or underscores.`
          }),
          { status: 400, headers }
        );
      }

      const entry = findAppEntry(slug);
      let config = null;
      let featuresMd = null;
      let changelogMd = null;

      if (entry) {
        const cfgRes = await fetchAppConfig(entry, env, context);
        if (cfgRes.ok) {
          config = cfgRes.config;
          [featuresMd, changelogMd] = await Promise.all([
            fetchAppDoc(entry, config.docs?.features, env, context),
            fetchAppDoc(entry, config.docs?.changelog, env, context)
          ]);
        }
      }

      // Fallback to sample app if live repository is offline, unconfigured, or missing
      if (!config) {
        const mockApp = findMockApp(slug);
        if (mockApp) {
          const { installerScript, docsData, ...cleanMockConfig } = mockApp;
          config = cleanMockConfig;
          featuresMd = getMockDoc(slug, "features");
          changelogMd = getMockDoc(slug, "changelog");
        }
      }

      if (!config) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: `App with slug '${slug}' was not found in registry or catalog.`
          }),
          { status: 404, headers }
        );
      }

      return new Response(
        JSON.stringify({
          app: config,
          docs: {
            features: featuresMd,
            changelog: changelogMd
          }
        }),
        { status: 200, headers }
      );
    }

    // Mode A: Catalog List of All Registered Apps
    // 1. Check Cloudflare Edge Cache for aggregated catalog
    let cache = null;
    try {
      if (typeof caches !== "undefined" && caches?.default) {
        cache = caches.default;
      }
    } catch (_) {}

    const cacheKeyUrl = "https://apps.vib.tools/__cache/api/apps/catalog";
    const cacheKey = new Request(cacheKeyUrl);

    if (cache) {
      try {
        const cachedRes = await cache.match(cacheKey);
        if (cachedRes) {
          const cachedJson = await cachedRes.text();
          return new Response(cachedJson, {
            status: 200,
            headers: {
              ...headers,
              "X-Cache-Status": "HIT"
            }
          });
        }
      } catch (_) {}
    }

    const entries = getRegistry();

    const results = await Promise.allSettled(
      entries.map((entry) => fetchAppConfig(entry, env, context))
    );

    const apps = [];
    results.forEach((res, index) => {
      const entry = entries[index];
      if (res.status === "fulfilled" && res.value?.ok && res.value?.config) {
        apps.push(res.value.config);
      } else {
        const errorDetail =
          res.status === "fulfilled"
            ? res.value?.error
            : res.reason?.message || "Unknown rejection";
        console.warn(
          `[Store API] Skipping app '${entry?.slug || index}' (${entry?.repo}): ${errorDetail}`
        );
      }
    });

    // If no live apps were loaded (offline dev, mock repos, or GitHub rate limits), activate fallback catalog
    if (apps.length === 0) {
      const mockApps = getMockApps();
      apps.push(...mockApps);
    }

    const payloadText = JSON.stringify({
      apps,
      count: apps.length
    });

    // 2. Store aggregated catalog in Edge Cache with 300s TTL
    if (cache) {
      try {
        const cacheResponse = new Response(payloadText, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
        if (context.waitUntil) {
          context.waitUntil(cache.put(cacheKey, cacheResponse));
        } else {
          await cache.put(cacheKey, cacheResponse);
        }
      } catch (_) {}
    }

    return new Response(payloadText, {
      status: 200,
      headers: {
        ...headers,
        "X-Cache-Status": "MISS"
      }
    });
  } catch (err) {
    console.error("[Store API Error]", err);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: err?.message || "An unexpected error occurred."
      }),
      { status: 500, headers }
    );
  }
}

/**
 * Handles CORS preflight OPTIONS requests for /api/apps.
 * @returns {Response}
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    }
  });
}
