import {
  isValidSlug,
  resolveAppBySlug,
  fetchAppInstaller,
  isTrustedDownloadUrl
} from "./_lib/github.js";

export { isTrustedDownloadUrl };

const STATIC_ASSET_EXT_RE =
  /\.(css|js|mjs|cjs|json|webmanifest|svg|png|jpe?g|gif|webp|ico|txt|xml|pdf|woff2?|ttf|eot|map|wasm|md)$/i;

/**
 * Resolves a version object from config.versions supporting both 'v'-prefixed
 * and raw semver keys (e.g. 'v1.0.3' <-> '1.0.3').
 *
 * @param {Object} versions - config.versions map
 * @param {string|null} requestedVersion - User specified version parameter
 * @param {string} latestKey - config.latest
 * @returns {{ versionKey: string, versionData: Object }|null}
 */
function resolveVersion(versions, requestedVersion, latestKey) {
  if (!versions || typeof versions !== "object") return null;
  const target = (requestedVersion && requestedVersion.trim()) || latestKey;
  if (!target) return null;

  // 1. Direct match
  if (Object.hasOwn(versions, target)) {
    return { versionKey: target, versionData: versions[target] };
  }

  // 2. Try adding 'v' prefix
  const withV = `v${target.replace(/^v/i, "")}`;
  if (Object.hasOwn(versions, withV)) {
    return { versionKey: withV, versionData: versions[withV] };
  }

  // 3. Try removing 'v' prefix
  const withoutV = target.replace(/^v/i, "");
  if (Object.hasOwn(versions, withoutV)) {
    return { versionKey: withoutV, versionData: versions[withoutV] };
  }

  // 4. Case-insensitive key match
  const lower = target.toLowerCase();
  for (const key of Object.keys(versions)) {
    if (key.toLowerCase() === lower || key.toLowerCase().replace(/^v/, "") === lower.replace(/^v/, "")) {
      return { versionKey: key, versionData: versions[key] };
    }
  }

  return null;
}

/**
 * Cloudflare Pages Wildcard Route Handler ([[path]].js).
 *
 * Implements dual-domain host routing:
 * 1. apps.vib.tools -> Passes through to static public/ files and /api routes.
 * 2. get.vib.tools  -> Serves edge CLI installer scripts and 302 direct download redirects.
 *
 * @param {EventContext} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Extract hostname, normalize to lowercase, and strip port
  const rawHost = request.headers.get("host") || url.host || "";
  const host = rawHost.toLowerCase().replace(/:\d+$/, "");

  // Detect get.vib.tools domain (support ?mode=get on localhost for local testing)
  const isGetDomain = host === "get.vib.tools" || url.searchParams.get("mode") === "get";

  // If request is for apps.vib.tools (or default frontend dev server), handle static assets & SPA fallback
  if (!isGetDomain) {
    const res = await context.next();

    // Guarantee reload-safe SPA routing: If asset is 404 and is an SPA route, serve /index.html with 200 OK
    if (res.status === 404) {
      const pathname = url.pathname;
      const isApi = pathname === "/api" || pathname.startsWith("/api/");
      const isKnownSpaRoute =
        pathname === "/cli" ||
        pathname === "/schema" ||
        pathname === "/vib-apps-engine" ||
        pathname.startsWith("/app/") ||
        pathname.startsWith("/category/");
      const isStaticAssetPath = !isKnownSpaRoute && STATIC_ASSET_EXT_RE.test(pathname);

      if (!isApi && !isStaticAssetPath && env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
        const indexUrl = new URL("/index.html", request.url);
        const indexRes = await env.ASSETS.fetch(indexUrl);
        if (indexRes && (indexRes.status === 200 || indexRes.ok)) {
          const spaHeaders = new Headers(indexRes.headers);
          spaHeaders.set("Content-Type", "text/html; charset=utf-8");
          return new Response(indexRes.body, {
            status: 200,
            headers: spaHeaders
          });
        }
      }
    }

    // Attach public CORS headers for machine-readable schema & AI spec endpoints
    if (
      res.status === 200 &&
      (url.pathname === "/llms.txt" ||
        url.pathname === "/llms-full.txt" ||
        url.pathname.startsWith("/schemas/") ||
        url.pathname.startsWith("/vib-apps-engine/"))
    ) {
      const publicHeaders = new Headers(res.headers);
      publicHeaders.set("Access-Control-Allow-Origin", "*");
      if (url.pathname.endsWith(".schema.json")) {
        publicHeaders.set("Content-Type", "application/schema+json; charset=utf-8");
      }
      return new Response(res.body, {
        status: res.status,
        headers: publicHeaders
      });
    }

    return res;
  }

  // Parse path segments from pathname safely (prevent uncaught URIError 500)
  const cleanPath = url.pathname.replace(/^\/+|\/+$/g, "");
  let segments = [];
  if (cleanPath) {
    try {
      segments = cleanPath.split("/").map((s) => decodeURIComponent(s).trim());
    } catch (_) {
      return new Response("Bad Request: Malformed URL encoding.\n", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  }

  const accept = request.headers.get("accept") || "";
  const isHtml = accept.includes("text/html");

  // Browser navigation -> redirect human visitors from get.vib.tools to the visual app store
  if (isHtml) {
    if (segments.length === 0) {
      return Response.redirect("https://apps.vib.tools", 302);
    }
    if (segments[0] === "cli") {
      return Response.redirect("https://apps.vib.tools/cli", 302);
    }
    if ((segments.length === 1 || segments.length === 2) && segments[0] !== "dl") {
      if (!isValidSlug(segments[0])) {
        return new Response("Invalid app slug format.\n", {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
      return Response.redirect(`https://apps.vib.tools/app/${encodeURIComponent(segments[0])}`, 302);
    }
  }

  // =========================================================================
  // Route 1: Root (/) on get.vib.tools
  // =========================================================================
  if (segments.length === 0) {
    // CLI / PowerShell / curl -> return usage instructions
    const usage = [
      "vib-apps-hub installer & download router (get.vib.tools)",
      "",
      "Install Latest Version (PowerShell):",
      "  irm \"https://get.vib.tools/<app>\" | iex",
      "",
      "Install Specific Version (PowerShell):",
      "  irm \"https://get.vib.tools/<app>/<version>\" | iex",
      "",
      "Direct Binary Download:",
      "  https://get.vib.tools/dl/<app>",
      "  https://get.vib.tools/dl/<app>/<version>",
      "",
      "Browse Catalog UI:",
      "  https://apps.vib.tools",
      ""
    ].join("\n");

    return new Response(usage, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    });
  }

  // =========================================================================
  // Route 2: Direct Download Redirect (/dl/<slug> or /dl/<slug>/<version>)
  // =========================================================================
  if (segments[0] === "dl") {
    if (segments.length > 3) {
      return new Response("Not Found\n", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const slug = segments[1];
    const requestedVersion = segments[2] || null;

    if (!slug) {
      return new Response("Missing app slug in download path. Usage: /dl/<slug>[/<version>]\n", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (!isValidSlug(slug)) {
      return new Response("Invalid app slug format. Usage: /dl/<slug>[/<version>]\n", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const resolvedApp = await resolveAppBySlug(slug, env, context);
    const config = resolvedApp?.config || null;

    if (!config) {
      return new Response(`App '${slug}' was not found in registry.\n`, {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // Resolve version object with automatic 'v' prefix normalization (v1.0.3 <-> 1.0.3)
    const resolved = resolveVersion(config.versions, requestedVersion, config.latest);
    if (!resolved || !resolved.versionData?.url) {
      return new Response(
        `Version '${requestedVersion || config.latest}' or verified download URL not found for app '${slug}'.\n`,
        {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        }
      );
    }

    const downloadUrl = resolved.versionData.url;

    // Validate that download URL is a syntactically valid HTTPS endpoint on a trusted storage host
    if (!isTrustedDownloadUrl(downloadUrl, env)) {
      return new Response(
        `Untrusted or invalid download URL configured for app '${slug}'.\n`,
        {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        }
      );
    }

    return Response.redirect(downloadUrl, 302);
  }

  // =========================================================================
  // Route 3: Dynamic PowerShell Installer Script (/<slug> or /<slug>/<version>)
  // =========================================================================
  if (segments.length === 1 || segments.length === 2) {
    const slug = segments[0];
    const requestedVersion = segments[1] || null;

    if (!isValidSlug(slug)) {
      return new Response("Invalid app slug format.\n", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const resolvedApp = await resolveAppBySlug(slug, env, context);
    if (!resolvedApp) {
      return new Response(`App '${slug}' was not found in registry.\n`, {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const entry = resolvedApp.entry;
    const config = resolvedApp.config;
    const canonicalSlug = config.slug || entry.slug || slug;

    // Resolve target version (latest or explicit) BEFORE loading installer so per-version overrides apply
    const resolvedVer = resolveVersion(config.versions, requestedVersion, config.latest);
    if (!resolvedVer) {
      return new Response(
        `Version '${requestedVersion || config.latest}' not found for app '${slug}'.\n`,
        {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        }
      );
    }

    const targetVersion = resolvedVer.versionKey;
    const versionData = resolvedVer.versionData;

    let installerScript = null;
    const instRes = await fetchAppInstaller(entry, config, env, context, versionData);
    if (instRes.ok) {
      installerScript = instRes.script;
    } else if (instRes.status === 403) {
      return new Response(`Untrusted or invalid installer URL configured for app '${slug}'.\n`, {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    if (!installerScript) {
      return new Response(`Failed to load installer script for '${slug}'.\n`, {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // Sanitize canonical slug, targetVersion (preserving valid semver '+' build metadata), and appName
    const safeSlug = (canonicalSlug || slug).replace(/[^a-zA-Z0-9._-]/g, "");
    const safeVersion = String(targetVersion).replace(/[^a-zA-Z0-9._+-]/g, "");
    const safeName = String(config.name || canonicalSlug || slug).replace(/[^a-zA-Z0-9 ._()-]/g, "");

    const injectedHeader = `$APP_SLUG = "${safeSlug}"\r\n$APP_VERSION = "${safeVersion}"\r\n$APP_NAME = "${safeName}"\r\n\r\n`;
    const fullScript = injectedHeader + installerScript;

    return new Response(fullScript, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "X-Catalog-Source": "live"
      }
    });
  }

  // =========================================================================
  // Fallback: Unknown Path on get.vib.tools
  // =========================================================================
  return new Response("Not Found\n", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
