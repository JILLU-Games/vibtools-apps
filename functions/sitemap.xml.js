import { getRegistry, fetchAppConfig } from "./_lib/github.js";

const SITE_ORIGIN = "https://apps.vib.tools";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const STATIC_SITEMAP_URLS = [
  { loc: `${SITE_ORIGIN}/`, changefreq: "daily", priority: "1.0" },
  { loc: `${SITE_ORIGIN}/cli`, changefreq: "weekly", priority: "0.8" },
  { loc: `${SITE_ORIGIN}/schema`, changefreq: "weekly", priority: "0.95" },
  { loc: `${SITE_ORIGIN}/schemas/vibtools-app.schema.json`, changefreq: "monthly", priority: "0.9" },
  { loc: `${SITE_ORIGIN}/llms.txt`, changefreq: "weekly", priority: "0.9" },
  { loc: `${SITE_ORIGIN}/llms-full.txt`, changefreq: "weekly", priority: "0.95" },
  { loc: `${SITE_ORIGIN}/vib-apps-engine/llms.txt`, changefreq: "weekly", priority: "0.9" },
  { loc: `${SITE_ORIGIN}/vib-apps-engine/vibtools-app-config.md`, changefreq: "weekly", priority: "0.9" },
  { loc: `${SITE_ORIGIN}/vib-apps-engine/ai-guide.md`, changefreq: "weekly", priority: "0.9" }
];

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
 * Escapes XML special characters for strict XML 1.0 compliance.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Formats a single <url> XML entry.
 * @param {{ loc: string, lastmod?: string, changefreq?: string, priority?: string }} entry
 * @returns {string}
 */
function formatUrlNode(entry) {
  const lines = ["  <url>", `    <loc>${escapeXml(entry.loc)}</loc>`];
  if (entry.lastmod && ISO_DATE_RE.test(entry.lastmod)) {
    lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
  }
  if (entry.changefreq) {
    lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
  }
  if (entry.priority) {
    lines.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
  }
  lines.push("  </url>");
  return lines.join("\n");
}

/**
 * Cloudflare Pages Function: Dynamic Edge Sitemap (/sitemap.xml).
 * Auto-includes canonical static pages + all live apps (/app/<slug> with <lastmod>)
 * and deduplicated categories (/category/<name>) from registry.json.
 *
 * @param {EventContext} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Isolate sitemap strictly away from get.vib.tools to avoid cross-domain duplication
  if (isGetDomainRequest(request, url)) {
    return new Response("Not Found\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  }

  const cache = getEdgeCache();
  const hasCustomRegistry = Array.isArray(env?.__REGISTRY_OVERRIDE);
  const cacheKey = new Request(`${SITE_ORIGIN}/__cache/sitemap.xml`);

  if (cache && !hasCustomRegistry) {
    try {
      const cachedRes = await cache.match(cacheKey);
      if (cachedRes) {
        const cachedXml = await cachedRes.text();
        return new Response(cachedXml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "X-Cache-Status": "HIT"
          }
        });
      }
    } catch (_) {}
  }

  const entries = hasCustomRegistry ? getRegistry(env.__REGISTRY_OVERRIDE) : getRegistry();
  const results = await Promise.allSettled(
    entries.map((entry) => fetchAppConfig(entry, env, context))
  );

  const appEntries = [];
  const seenSlugs = new Set();
  const seenCategories = new Set();
  const categoryEntries = [];

  results.forEach((res, index) => {
    const entry = entries[index];
    if (res.status === "fulfilled" && res.value?.ok && res.value?.config) {
      const config = res.value.config;
      const slug = String(config.slug || "").trim();
      const slugKey = slug.toLowerCase();
      if (!slug || seenSlugs.has(slugKey)) return;
      seenSlugs.add(slugKey);

      const latestVerObj = config.latest ? config.versions?.[config.latest] : null;
      const lastmod =
        typeof latestVerObj?.released_at === "string" && ISO_DATE_RE.test(latestVerObj.released_at.trim())
          ? latestVerObj.released_at.trim()
          : "";

      appEntries.push({
        loc: `${SITE_ORIGIN}/app/${encodeURIComponent(slug)}`,
        lastmod,
        changefreq: "weekly",
        priority: "0.9"
      });

      if (typeof config.category === "string" && config.category.trim()) {
        const catLower = config.category.trim().toLowerCase();
        if (!seenCategories.has(catLower)) {
          seenCategories.add(catLower);
          categoryEntries.push({
            loc: `${SITE_ORIGIN}/category/${encodeURIComponent(catLower)}`,
            changefreq: "weekly",
            priority: "0.75"
          });
        }
      }
    } else {
      const errorDetail =
        res.status === "fulfilled"
          ? res.value?.error
          : res.reason?.message || "Unknown rejection";
      console.warn(
        `[Sitemap] Skipping app '${entry?.slug || entry?.repo || index}': ${errorDetail}`
      );
    }
  });

  const allUrls = [...STATIC_SITEMAP_URLS, ...appEntries, ...categoryEntries];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...allUrls.map(formatUrlNode),
    "</urlset>",
    ""
  ].join("\n");

  const isCacheableLiveSitemap = appEntries.length > 0 && !hasCustomRegistry;

  if (cache && isCacheableLiveSitemap) {
    try {
      const cacheRes = new Response(xml, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
      if (context.waitUntil) {
        context.waitUntil(cache.put(cacheKey, cacheRes));
      } else {
        await cache.put(cacheKey, cacheRes);
      }
    } catch (_) {}
  }

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": isCacheableLiveSitemap ? "public, max-age=300" : "no-store",
      "X-Cache-Status": isCacheableLiveSitemap ? "MISS" : "BYPASS"
    }
  });
}

/**
 * HEAD parity handler for /sitemap.xml.
 * @param {EventContext} context
 * @returns {Promise<Response>}
 */
export async function onRequestHead(context) {
  const res = await onRequestGet(context);
  if (res.body && typeof res.body.cancel === "function") {
    try {
      await res.body.cancel();
    } catch (_) {}
  }
  return new Response(null, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers
  });
}
