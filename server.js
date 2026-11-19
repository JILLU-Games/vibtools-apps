import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  onRequestGet as apiAppsGet,
  onRequestOptions as apiAppsOptions
} from "./functions/api/apps.js";
import { onRequestGet as wildcardGet } from "./functions/[[path]].js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

// Provide in-memory Cloudflare Cache API (caches.default) polyfill for Node.js edge emulation
if (typeof globalThis.caches === "undefined") {
  const memoryCache = new Map();
  globalThis.caches = {
    default: {
      async match(request) {
        const key = typeof request === "string" ? request : request.url;
        const entry = memoryCache.get(key);
        if (!entry) return undefined;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          memoryCache.delete(key);
          return undefined;
        }
        return new Response(entry.body, {
          status: entry.status,
          headers: entry.headers
        });
      },
      async put(request, response) {
        const key = typeof request === "string" ? request : request.url;
        const cloned = response.clone();
        const body = await cloned.arrayBuffer();
        const cc = cloned.headers.get("Cache-Control") || "";
        const maxAgeMatch = cc.match(/max-age=(\d+)/);
        const ttlMs = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 300_000;
        memoryCache.set(key, {
          body,
          status: cloned.status,
          headers: Object.fromEntries(cloned.headers.entries()),
          expiresAt: Date.now() + ttlMs
        });
      }
    }
  };
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

/**
 * Resolves and reads a static file from public/ matching Cloudflare Pages ASSETS.fetch behavior.
 *
 * @param {Request|URL|string} input
 * @returns {Promise<Response>}
 */
export async function serveStaticAsset(input) {
  const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const parsedUrl = new URL(urlStr, "http://localhost:3000");
  let pathname;
  try {
    pathname = decodeURIComponent(parsedUrl.pathname);
  } catch (_) {
    return new Response("Bad Request: Malformed URL encoding.\n", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  if (pathname === "/" || pathname === "") {
    pathname = "/index.html";
  }

  // Prevent path traversal outside PUBLIC_DIR
  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.join(PUBLIC_DIR, safePath);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const stat = await fs.stat(fullPath);
    let targetFile = fullPath;
    if (stat.isDirectory()) {
      targetFile = path.join(fullPath, "index.html");
    }

    const content = await fs.readFile(targetFile);
    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache"
      }
    });
  } catch (_) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

/**
 * Handles an incoming Web Request by routing it through the Cloudflare Pages Functions pipeline.
 *
 * @param {Request} webRequest
 * @returns {Promise<Response>}
 */
export async function handleEdgeRequest(webRequest) {
  const url = new URL(webRequest.url);
  const env = {
    ...process.env,
    ASSETS: {
      fetch: (reqOrUrl) => serveStaticAsset(reqOrUrl)
    }
  };

  const context = {
    request: webRequest,
    env,
    waitUntil(promise) {
      Promise.resolve(promise).catch(() => {});
    },
    next() {
      return serveStaticAsset(webRequest);
    }
  };

  // Route /api/apps to functions/api/apps.js
  if (url.pathname === "/api/apps" || url.pathname === "/api/apps/") {
    if (webRequest.method === "OPTIONS") {
      return await apiAppsOptions(context);
    }
    if (webRequest.method === "GET" || webRequest.method === "HEAD") {
      return await apiAppsGet(context);
    }
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  // Enforce read-only GET/HEAD parity with Cloudflare Pages onRequestGet handler
  if (webRequest.method !== "GET" && webRequest.method !== "HEAD") {
    return new Response("Method Not Allowed\n", {
      status: 405,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Allow": "GET, HEAD"
      }
    });
  }

  // All other GET/HEAD routes pass through functions/[[path]].js wildcard handler
  return await wildcardGet(context);
}

/**
 * Starts the HTTP server when executed directly.
 */
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const server = http.createServer(async (req, res) => {
    try {
      const hostHeader = req.headers.host || `localhost:${PORT}`;
      const fullUrl = `http://${hostHeader}${req.url || "/"}`;

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else if (typeof value === "string") {
          headers.set(key, value);
        }
      }

      const webRequest = new Request(fullUrl, {
        method: req.method || "GET",
        headers
      });

      const webResponse = await handleEdgeRequest(webRequest);

      res.statusCode = webResponse.status;
      webResponse.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      if (req.method === "HEAD" || webResponse.status === 204 || webResponse.status === 302) {
        res.end();
        return;
      }

      const arrayBuf = await webResponse.arrayBuffer();
      res.end(Buffer.from(arrayBuf));
    } catch (err) {
      console.error("[Server Error]", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Internal Server Error");
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`vib-apps-hub dev server running at http://${HOST}:${PORT}`);
  });
}
