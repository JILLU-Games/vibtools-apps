import { getRegistry, fetchAppConfig } from "./_lib/github.js";

const SITE_ORIGIN = "https://apps.vib.tools";
const GET_ORIGIN = "https://get.vib.tools";

const BASE_LLMS_TXT = `# Vib Apps (\`apps.vib.tools\` & \`get.vib.tools\`)

> Central zero-build software marketplace, frozen \`.vibtools/apps/app.config.json\` schema engine, PowerShell CLI installer router, and direct binary download gateway for Vib Tools applications.

## Machine-Readable Schema & AI Agent Specs
- [Single-URL AI Master Bundle (\`llms-full.txt\`)](https://apps.vib.tools/llms-full.txt): Complete self-contained specification, step matrix, templates, and 12-point checklist in ONE file for single-fetch AI agents.
- [Frozen JSON Schema (v1)](https://apps.vib.tools/schemas/vibtools-app.schema.json): Canonical Draft 2020-12 JSON Schema (\`schemaVersion: 1\`, \`additionalProperties: false\`) for \`.vibtools/apps/app.config.json\`.
- [Vib Apps Engine AI Spec (\`llms.txt\`)](https://apps.vib.tools/vib-apps-engine/llms.txt): Compact single-file instruction sheet for AI coding agents to create and verify \`.vibtools/apps/\` inside any project repository.
- [Complete A–Z Setup Guide](https://apps.vib.tools/vib-apps-engine/vibtools-app-config.md): Basic-to-advanced step-by-step guide covering repo URL registration, per-version installers, Markdown docs, SHA256 checksums, and security rules.
- [AI Agent Execution Playbook](https://apps.vib.tools/vib-apps-engine/ai-guide.md): Deterministic MUST/MUST NOT rules, templates, and copy-paste prompt for AI-assisted onboarding.

## Live Platform Endpoints
- Storefront UI: https://apps.vib.tools
- Interactive Schema & AI Docs UI: https://apps.vib.tools/schema
- Store Catalog API: https://apps.vib.tools/api/apps
- Single App Detail API: https://apps.vib.tools/api/apps?slug=<slug>
- PowerShell CLI Installer (Latest): \`irm "https://get.vib.tools/<slug>" | iex\`
- PowerShell CLI Installer (Pinned Version): \`irm "https://get.vib.tools/<slug>/<version>" | iex\`
- Direct Binary Download Redirect: https://get.vib.tools/dl/<slug>/<version>
`;

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
 * Collapses newlines and trims text so single-line Markdown bullets stay well-formed.
 * @param {unknown} value
 * @returns {string}
 */
function sanitizeLine(value) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Formats a version tag with a clean leading 'v' when numeric-led.
 * @param {string} ver
 * @returns {string}
 */
function formatVersionTag(ver) {
  const trimmed = sanitizeLine(ver);
  if (!trimmed) return "";
  return /^[vV]/.test(trimmed) ? trimmed : `v${trimmed}`;
}

/**
 * Cloudflare Pages Function: Dynamic AI Discovery Index (/llms.txt).
 * Serves the canonical spec directory with CORS * and automatically appends
 * a `## Published Applications` directory whenever live apps are registered.
 *
 * @param {EventContext} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Isolate /llms.txt strictly away from get.vib.tools to prevent cross-domain duplication
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

  const baseHeaders = {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  };

  const cache = getEdgeCache();
  const hasCustomRegistry = Array.isArray(env?.__REGISTRY_OVERRIDE);
  const cacheKey = new Request(`${SITE_ORIGIN}/__cache/llms.txt`);

  if (cache && !hasCustomRegistry) {
    try {
      const cachedRes = await cache.match(cacheKey);
      if (cachedRes) {
        const cachedText = await cachedRes.text();
        return new Response(cachedText, {
          status: 200,
          headers: {
            ...baseHeaders,
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

  const liveApps = [];
  const seenSlugs = new Set();

  results.forEach((res, index) => {
    const entry = entries[index];
    if (res.status === "fulfilled" && res.value?.ok && res.value?.config) {
      const config = res.value.config;
      const slug = sanitizeLine(config.slug);
      const slugKey = slug.toLowerCase();
      if (!slug || seenSlugs.has(slugKey)) return;
      seenSlugs.add(slugKey);
      liveApps.push(config);
    } else {
      const errorDetail =
        res.status === "fulfilled"
          ? res.value?.error
          : res.reason?.message || "Unknown rejection";
      console.warn(
        `[llms.txt] Skipping app '${entry?.slug || entry?.repo || index}': ${errorDetail}`
      );
    }
  });

  let output = BASE_LLMS_TXT;
  if (liveApps.length > 0) {
    const appLines = liveApps.map((app) => {
      const slug = sanitizeLine(app.slug);
      const encodedSlug = encodeURIComponent(slug);
      const name = sanitizeLine(app.name || slug);
      const version = formatVersionTag(app.latest);
      const label = version ? `${name} (${version})` : name;
      const tagline = sanitizeLine(app.tagline || "Vib Tools desktop application.");
      const category = sanitizeLine(app.category || "Utilities");
      const access = sanitizeLine(app.access || "Free");
      return `- [${label}](${SITE_ORIGIN}/app/${encodedSlug}): ${tagline} | Category: ${category} | Access: ${access} | CLI: \`irm "${GET_ORIGIN}/${slug}" | iex\` | Download: ${GET_ORIGIN}/dl/${encodedSlug}`;
    });

    output += `\n## Published Applications\n${appLines.join("\n")}\n`;
  }

  const isCacheableLiveIndex = liveApps.length > 0 && !hasCustomRegistry;

  if (cache && isCacheableLiveIndex) {
    try {
      const cacheRes = new Response(output, {
        status: 200,
        headers: {
          ...baseHeaders,
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

  return new Response(output, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Cache-Control": isCacheableLiveIndex ? "public, max-age=300" : "no-store",
      "X-Cache-Status": isCacheableLiveIndex ? "MISS" : "BYPASS"
    }
  });
}

/**
 * HEAD parity handler for /llms.txt.
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
