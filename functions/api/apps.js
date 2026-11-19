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
  getMockDoc,
  isMockFallbackEnabled
} from "../_lib/mockData.js";

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
      if (cache) {
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

      const allowMock = isMockFallbackEnabled(request, env);
      let catalogSource = "live";

      // Fallback to sample app ONLY when mock fallback is explicitly enabled (or local/preview dev)
      if (!config && allowMock) {
        const mockApp = findMockApp(slug);
        if (mockApp) {
          const { installerScript, docsData, ...cleanMockConfig } = mockApp;
          config = cleanMockConfig;
          featuresMd = getMockDoc(slug, "features");
          changelogMd = getMockDoc(slug, "changelog");
          catalogSource = "mock";
        }
      }

      if (!config) {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: `App with slug '${slug}' was not found in registry or catalog.`
          }),
          { status: 404, headers: { ...headers, "Cache-Control": "no-store" } }
        );
      }

      const detailPayloadText = JSON.stringify({
        app: config,
        docs: {
          features: featuresMd,
          changelog: changelogMd
        }
      });

      const isCacheableLiveDetail = catalogSource === "live";

      // 2. Store ONLY verified live single-app detail responses in Edge Cache (300s TTL)
      if (cache && isCacheableLiveDetail) {
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
          "Cache-Control": isCacheableLiveDetail ? "public, max-age=300" : "no-store",
          "X-Cache-Status": isCacheableLiveDetail ? "MISS" : "BYPASS",
          "X-Catalog-Source": catalogSource
        }
      });
    }

    // Mode A: Catalog List of All Registered Apps
    // 1. Check Cloudflare Edge Cache for aggregated catalog
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
              "X-Cache-Status": "HIT",
              "X-Catalog-Source": "live"
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

    // Activate fallback catalog ONLY when permitted (never leak demo apps on live prod domains)
    const allowMock = isMockFallbackEnabled(request, env);
    let catalogSource = "live";
    if (apps.length === 0 && allowMock) {
      const mockApps = getMockApps();
      apps.push(...mockApps);
      catalogSource = "mock";
    }

    const payloadText = JSON.stringify({
      apps,
      count: apps.length
    });

    const isCacheableLiveCatalog = catalogSource === "live" && apps.length > 0;

    // 2. Store ONLY verified live catalogs in Edge Cache with 300s TTL (never poison cache with mock/empty data)
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
        "X-Catalog-Source": catalogSource
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
