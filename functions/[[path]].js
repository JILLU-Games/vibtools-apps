import {
  findAppEntry,
  fetchAppConfig,
  fetchAppInstaller
} from "./_lib/github.js";
import {
  findMockApp,
  getMockInstaller
} from "./_lib/mockData.js";

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
  if (versions[target]) {
    return { versionKey: target, versionData: versions[target] };
  }

  // 2. Try adding 'v' prefix
  const withV = `v${target.replace(/^v/i, "")}`;
  if (versions[withV]) {
    return { versionKey: withV, versionData: versions[withV] };
  }

  // 3. Try removing 'v' prefix
  const withoutV = target.replace(/^v/i, "");
  if (versions[withoutV]) {
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
      const hasExtension = /\.[a-zA-Z0-9]+$/.test(pathname);

      if (!isApi && !hasExtension && env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
        const indexUrl = new URL("/index.html", request.url);
        const indexRes = await env.ASSETS.fetch(indexUrl);
        if (indexRes && (indexRes.status === 200 || indexRes.ok)) {
          return new Response(indexRes.body, {
            status: 200,
            headers: {
              ...Object.fromEntries(indexRes.headers.entries()),
              "Content-Type": "text/html; charset=utf-8"
            }
          });
        }
      }
    }

    return res;
  }

  // Parse path segments from pathname
  const cleanPath = url.pathname.replace(/^\/+|\/+$/g, "");
  const segments = cleanPath ? cleanPath.split("/").map((s) => decodeURIComponent(s).trim()) : [];

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
    if (segments.length === 1 && segments[0] !== "dl") {
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

    let config = null;
    const entry = findAppEntry(slug);
    if (entry) {
      const cfgRes = await fetchAppConfig(entry, env, context);
      if (cfgRes.ok) {
        config = cfgRes.config;
      }
    }

    // Fallback to sample app if live repository is offline or unconfigured
    if (!config) {
      const mockApp = findMockApp(slug);
      if (mockApp) {
        config = mockApp;
      }
    }

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

    // Validate that download URL exists and is a valid https:// endpoint
    if (typeof downloadUrl !== "string" || !downloadUrl.startsWith("https://")) {
      return new Response(
        `Invalid download URL configured for app '${slug}'.\n`,
        {
          status: 404,
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

    let config = null;
    let installerScript = null;
    let canonicalSlug = slug;
    const entry = findAppEntry(slug);

    if (entry) {
      canonicalSlug = entry.slug;
      const cfgRes = await fetchAppConfig(entry, env, context);
      if (cfgRes.ok) {
        config = cfgRes.config;
        const instRes = await fetchAppInstaller(entry, config, env, context);
        if (instRes.ok) {
          installerScript = instRes.script;
        }
      }
    }

    // Fallback to sample app if live repository is offline or unconfigured
    if (!config) {
      const mockApp = findMockApp(slug);
      if (mockApp) {
        config = mockApp;
        canonicalSlug = mockApp.slug;
        installerScript = getMockInstaller(mockApp.slug);
      }
    }

    if (!config) {
      return new Response(`App '${slug}' was not found in registry.\n`, {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    let targetVersion = config.latest;

    if (requestedVersion) {
      const resolved = resolveVersion(config.versions, requestedVersion, config.latest);
      if (!resolved) {
        return new Response(`Version '${requestedVersion}' not found for app '${slug}'.\n`, {
          status: 404,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
      targetVersion = resolved.versionKey;
    }

    if (!installerScript) {
      return new Response(`Failed to load installer script for '${slug}'.\n`, {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // Sanitize canonical slug and targetVersion before interpolating into PowerShell variables
    const safeSlug = (canonicalSlug || slug).replace(/[^a-zA-Z0-9._-]/g, "");
    const safeVersion = String(targetVersion).replace(/[^a-zA-Z0-9._-]/g, "");

    const injectedHeader = `$APP_SLUG = "${safeSlug}"\r\n$APP_VERSION = "${safeVersion}"\r\n\r\n`;
    const fullScript = injectedHeader + installerScript;

    return new Response(fullScript, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300"
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
