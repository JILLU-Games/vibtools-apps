import {
  getRegistry,
  resolveAppBySlug,
  isValidSlug,
  fetchAppConfig,
  fetchAppDoc
} from "../_lib/github.js";

/**
 * Returns Cloudflare Edge Cache (caches.default) when available in the runtime.
 * @returns {Cache|null}
 */
function getEdgeCache() {
  try {
    if (typeof caches !== "undefined" && caches?.default) {
      return caches.default;
    }
  } catch (_) {}
  return null;
}

/**
 * Checks whether the request targets the CLI-only get.vib.tools domain.
 * @param {Request} request
 * @param {URL} url
 * @returns {boolean}
 */
function isGetDomainRequest(request, url) {
  const rawHost = request?.headers?.get("host") || url?.host || "";
  const host = rawHost.toLowerCase().replace(/:\d+$/, "");
  return host === "get.vib.tools" || url?.searchParams?.get("mode") === "get";
}

/**
 * Cloudflare Pages Function: Pure Repo-Only Store API handler (/api/apps).
 *
 * Supported modes:
 * - GET /api/apps -> Catalog list of all apps auto-collected from registry.json GitHub repos.
 * - GET /api/apps?slug=<slug> -> Single app metadata with full markdown documentation (features + changelog).
 *
 * @param {EventContext} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Isolate Store JSON API strictly away from the CLI-only get.vib.tools domain
  if (isGetDomainRequest(request, url)) {
    return new Response("Not Found\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  const slugParam = url.searchParams.get("slug");

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=300",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  try {
    const cache = getEdgeCache();
    const hasCustomRegistry = Array.isArray(env?.__REGISTRY_OVERRIDE);

    // Mode B: Single App Details & Markdown Docs
    if (slugParam !== null) {
      const slug = slugParam.trim();
      if (!slug || !isValidSlug(slug)) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: `Invalid slug format '${slugParam}'. Slugs must be 1-64 alphanumeric characters, hyphens, or underscores.`
          }),
          { status: 400, headers: { ...headers, "Cache-Control": "no-store" } }
        );
      }

      const detailCacheKey = new Request(
        `https://apps.vib.tools/__cache/api/apps/detail/${encodeURIComponent(slug.toLowerCase())}`
      );

      // 1. Check Cloudflare Edge Cache for single-app detail response
      if (cache && !hasCustomRegistry) {
        try {
          const cachedDetail = await cache.match(detailCacheKey);
          if (cachedDetail) {
            const cachedJson = await cachedDetail.text();
            return new Response(cachedJson, {
              status: 200,
              headers: {
                ...headers,
                "X-Cache-Status": "HIT",
                "X-Catalog-Source": "live"
              }
            });
          }
        } catch (_) {}
      }

      const resolvedApp = await resolveAppBySlug(slug, env, context);
      if (!resolvedApp) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: `App with slug '${slug}' was not found in registry.`
          }),
          { status: 404, headers: { ...headers, "Cache-Control": "no-store" } }
        );
      }

      const config = resolvedApp.config;
      const [featuresMd, changelogMd] = await Promise.all([
        fetchAppDoc(resolvedApp.entry, config.docs?.features, env, context, "features.md"),
        fetchAppDoc(resolvedApp.entry, config.docs?.changelog, env, context, "changelog.md")
      ]);

      const detailPayloadText = JSON.stringify({
        app: config,
        docs: {
          features: featuresMd,
          changelog: changelogMd
        }
      });

      // 2. Store verified live single-app detail response in Edge Cache (300s TTL)
      if (cache && !hasCustomRegistry) {
        try {
          const cacheResponse = new Response(detailPayloadText, {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=300",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "X-Catalog-Source": "live"
            }
          });
          if (context.waitUntil) {
            context.waitUntil(cache.put(detailCacheKey, cacheResponse));
          } else {
            await cache.put(detailCacheKey, cacheResponse);
          }
        } catch (_) {}
      }

      return new Response(detailPayloadText, {
        status: 200,
        headers: {
          ...headers,
          "Cache-Control": "public, max-age=300",
          "X-Cache-Status": hasCustomRegistry ? "BYPASS" : "MISS",
          "X-Catalog-Source": "live"
        }
      });
    }

    // Mode A: Catalog List of All Registered GitHub Repositories
    const cacheKeyUrl = "https://apps.vib.tools/__cache/api/apps/catalog";
    const cacheKey = new Request(cacheKeyUrl);

    if (cache && !hasCustomRegistry) {
      try {
        const cachedRes = await cache.match(cacheKey);
        if (cachedRes) {
          const cachedJson = await cachedRes.text();
          return new Response(cachedJson, {
            status: 200,
            headers: {
              ...headers,
              "X-Cache-Status": "HIT",
              "X-Catalog-Source": "live"
            }
          });
        }
      } catch (_) {}
    }

    const entries = hasCustomRegistry ? getRegistry(env.__REGISTRY_OVERRIDE) : getRegistry();

    const results = await Promise.allSettled(
      entries.map((entry) => fetchAppConfig(entry, env, context))
    );

    const apps = [];
    const seenSlugs = new Set();
    results.forEach((res, index) => {
      const entry = entries[index];
      if (res.status === "fulfilled" && res.value?.ok && res.value?.config) {
        const slugKey = String(res.value.config.slug || "").trim().toLowerCase();
        if (seenSlugs.has(slugKey)) {
          console.warn(
            `[Store API] Skipping duplicate slug '${slugKey}' from repository '${entry?.repo}'`
          );
          return;
        }
        seenSlugs.add(slugKey);
        apps.push(res.value.config);
      } else {
        const errorDetail =
          res.status === "fulfilled"
            ? res.value?.error
            : res.reason?.message || "Unknown rejection";
        console.warn(
          `[Store API] Skipping app '${entry?.slug || entry?.repo || index}' (${entry?.repo}): ${errorDetail}`
        );
      }
    });

    const payloadText = JSON.stringify({
      apps,
      count: apps.length
    });

    const isCacheableLiveCatalog = apps.length > 0 && !hasCustomRegistry;

    // Store ONLY non-empty live catalogs in Edge Cache with 300s TTL (never cache empty catalogs)
    if (cache && isCacheableLiveCatalog) {
      try {
        const cacheResponse = new Response(payloadText, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "X-Catalog-Source": "live"
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
        "Cache-Control": isCacheableLiveCatalog ? "public, max-age=300" : "no-store",
        "X-Cache-Status": isCacheableLiveCatalog ? "MISS" : "BYPASS",
        "X-Catalog-Source": "live"
      }
    });
  } catch (err) {
    console.error("[Store API Error]", err);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: err?.message || "An unexpected error occurred."
      }),
      { status: 500, headers: { ...headers, "Cache-Control": "no-store" } }
    );
  }
}

/**
 * Handles CORS preflight OPTIONS requests for /api/apps.
 * @param {EventContext} [context]
 * @returns {Promise<Response>}
 */
export async function onRequestOptions(context) {
  if (context?.request) {
    const url = new URL(context.request.url);
    if (isGetDomainRequest(context.request, url)) {
      return new Response("Not Found\n", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
  }

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

/**
 * Handles HEAD requests for /api/apps on Cloudflare Pages Functions.
 * @param {EventContext} context
 * @returns {Promise<Response>}
 */
export async function onRequestHead(context) {
  const res = await onRequestGet(context);
  return new Response(null, {
    status: res.status,
    headers: res.headers
  });
}

