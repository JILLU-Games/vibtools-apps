import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { handleEdgeRequest } from "./server.js";
import {
  isValidSlug,
  validateAppConfig,
  parseRepoIdentifier,
  normalizeRegistryEntry,
  getRegistry,
  resolveAppBySlug,
  fetchAppInstaller,
  fetchAppDoc,
  isTrustedInstallerUrl
} from "./functions/_lib/github.js";
import { isTrustedDownloadUrl } from "./functions/[[path]].js";
import { onRequestGet as appsApiGet, onRequestOptions as appsApiOptions } from "./functions/api/apps.js";
import { buildRouteSeoMetadata, injectSeoIntoHtml } from "./functions/_lib/seo.js";
import { escapeXml } from "./functions/sitemap.xml.js";

/**
 * Helper to execute an async test against the real GitHub auto-collection pipeline
 * using an in-memory registry override and mocked GitHub Contents API responses.
 */
async function withMockedGitHubRepo(fn) {
  const originalFetch = globalThis.fetch;
  const testRepo = "vib-tools/calgrid-live-test";
  const testEnv = {
    __REGISTRY_OVERRIDE: [`https://github.com/${testRepo}`]
  };
  const testConfig = {
    $schema: "https://apps.vib.tools/schemas/vibtools-app.schema.json",
    schemaVersion: 1,
    slug: "calgrid",
    name: "CalGrid",
    tagline: "Minimalist desktop calendar widget and event scheduler",
    category: "Productivity",
    access: "Free",
    icon: "https://dl.vib.tools/calgrid/icon.png",
    latest: "v1.0.3",
    installer: { type: "powershell", script: ".vibtools/apps/installer.ps1" },
    docs: { features: ".vibtools/apps/features.md", changelog: ".vibtools/apps/changelog.md" },
    versions: {
      "v1.0.3": {
        url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe",
        size: "42.8 MB",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        released_at: "2026-11-15",
        channel: "stable"
      },
      "v1.0.3+build.9": {
        url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3-build9.exe",
        size: "42.9 MB",
        released_at: "2026-11-16",
        channel: "beta"
      }
    }
  };
  const testInstaller = [
    "$ErrorActionPreference = 'Stop'",
    'Write-Host "Installing $APP_NAME ($APP_VERSION)..."',
    '$DownloadUrl = "https://get.vib.tools/dl/$APP_SLUG/$APP_VERSION"',
    'Invoke-WebRequest -Uri $DownloadUrl -OutFile "$env:TEMP\\setup.exe"',
    'Get-FileHash -Path "$env:TEMP\\setup.exe" -Algorithm SHA256'
  ].join("\n");

  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes(`${testRepo}/contents/.vibtools/apps/app.config.json`)) {
      return new Response(JSON.stringify(testConfig), { status: 200 });
    }
    if (u.includes(`${testRepo}/contents/.vibtools/apps/installer.ps1`)) {
      return new Response(testInstaller, { status: 200 });
    }
    if (u.includes(`${testRepo}/contents/.vibtools/apps/features.md`)) {
      return new Response("# CalGrid Features\n\nFast keyboard-first calendar.", { status: 200 });
    }
    if (u.includes(`${testRepo}/contents/.vibtools/apps/changelog.md`)) {
      return new Response("# Changelog\n\n## v1.0.3\n- Initial release", { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  };

  try {
    return await fn(testEnv);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("slug validation rejects traversal and accepts valid slugs", () => {
  assert.equal(isValidSlug("calgrid"), true);
  assert.equal(isValidSlug("dev-prompt_2"), true);
  assert.equal(isValidSlug("../etc/passwd"), false);
  assert.equal(isValidSlug(""), false);
});

test("Pure Repo-Only & Wrangler 3 invariant: mockData.js deleted, registry.json synced to registry.js, and zero import attributes in functions/", async () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), "functions/_lib/mockData.js")), false);
  const rawRegistry = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "registry.json"), "utf8")
  );
  assert.ok(Array.isArray(rawRegistry));
  for (const item of rawRegistry) {
    assert.ok(normalizeRegistryEntry(item), `Invalid registry.json entry: ${JSON.stringify(item)}`);
  }

  const { default: syncedRegistry } = await import("./functions/_lib/registry.js");
  assert.deepEqual(syncedRegistry, rawRegistry);

  for (const relPath of [
    "functions/_lib/github.js",
    "functions/_lib/registry.js",
    "functions/_lib/seo.js",
    "functions/api/apps.js",
    "functions/sitemap.xml.js",
    "functions/llms.txt.js",
    "functions/[[path]].js"
  ]) {
    const src = fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
    assert.equal(/\b(with|assert)\s*\{\s*type\s*:\s*["']json["']\s*\}/.test(src), false, `${relPath} must not use JSON import attributes (breaks Wrangler 3 esbuild)`);
  }
});

test("Pure Repo-Only default: GET /api/apps returns empty live catalog with no-store and unregistered slugs return 404 everywhere", async () => {
  const emptyEnv = { __REGISTRY_OVERRIDE: [] };
  for (const url of ["http://localhost:3000/api/apps", "https://apps.vib.tools/api/apps"]) {
    const res = await handleEdgeRequest(new Request(url), emptyEnv);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("X-Catalog-Source"), "live");
    assert.equal(res.headers.get("Cache-Control"), "no-store");
    assert.equal(res.headers.get("X-Cache-Status"), "BYPASS");
    const data = await res.json();
    assert.deepEqual(data, { apps: [], count: 0 });
  }

  const missingDetail = await handleEdgeRequest(
    new Request("http://localhost:3000/api/apps?slug=calgrid"),
    emptyEnv
  );
  assert.equal(missingDetail.status, 404);

  const missingCli = await handleEdgeRequest(
    new Request("http://localhost:3000/calgrid?mode=get"),
    emptyEnv
  );
  assert.equal(missingCli.status, 404);

  const missingDl = await handleEdgeRequest(
    new Request("http://localhost:3000/dl/calgrid?mode=get"),
    emptyEnv
  );
  assert.equal(missingDl.status, 404);
});

test("Live Repo Auto-Collection: GET /api/apps and Mode B fetch config and docs from registered GitHub repo", async () => {
  await withMockedGitHubRepo(async (testEnv) => {
    const listRes = await handleEdgeRequest(
      new Request("http://localhost:3000/api/apps"),
      testEnv
    );
    assert.equal(listRes.status, 200);
    assert.equal(listRes.headers.get("X-Catalog-Source"), "live");
    const listData = await listRes.json();
    assert.equal(listData.count, 1);
    assert.equal(listData.apps[0].slug, "calgrid");
    assert.equal(listData.apps[0].latest, "v1.0.3");

    const detailRes = await handleEdgeRequest(
      new Request("http://localhost:3000/api/apps?slug=calgrid"),
      testEnv
    );
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.headers.get("X-Catalog-Source"), "live");
    assert.equal(detailRes.headers.get("X-Cache-Status"), "BYPASS");
    const detailData = await detailRes.json();
    assert.equal(detailData.app.slug, "calgrid");
    assert.ok(detailData.docs.features.includes("CalGrid Features"));
    assert.ok(detailData.docs.changelog.includes("v1.0.3"));
  });
});

test("SPA routes on apps.vib.tools return index.html with 200 OK", async () => {
  await withMockedGitHubRepo(async (testEnv) => {
    for (const spaPath of ["/cli", "/app/calgrid"]) {
      const req = new Request(`http://localhost:3000${spaPath}`, {
        headers: { Accept: "text/html" }
      });
      const res = await handleEdgeRequest(req, testEnv);
      assert.equal(res.status, 200, `${spaPath} should return 200 OK`);
      const html = await res.text();
      assert.ok(html.includes("<div id=\"app\"></div>"));
    }
  });
});

test("CLI installer route on get.vib.tools streams repo PowerShell script with injected vars and semver + metadata", async () => {
  await withMockedGitHubRepo(async (testEnv) => {
    const req = new Request("http://localhost:3000/calgrid/1.0.3?mode=get");
    const res = await handleEdgeRequest(req, testEnv);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("X-Catalog-Source"), "live");
    const script = await res.text();
    assert.ok(script.includes('$APP_NAME = "CalGrid"'));
    assert.ok(script.includes('$APP_SLUG = "calgrid"'));
    assert.ok(script.includes('$APP_VERSION = "v1.0.3"'));
    assert.ok(script.includes("Invoke-WebRequest"));
    assert.ok(script.includes("Get-FileHash"));

    const buildMetaRes = await handleEdgeRequest(
      new Request("http://localhost:3000/calgrid/1.0.3%2Bbuild.9?mode=get"),
      testEnv
    );
    assert.equal(buildMetaRes.status, 200);
    const buildMetaScript = await buildMetaRes.text();
    assert.ok(buildMetaScript.includes('$APP_VERSION = "v1.0.3+build.9"'));
  });
});

test("Direct download route on get.vib.tools returns 302 redirect to R2 binary from live repo config", async () => {
  await withMockedGitHubRepo(async (testEnv) => {
    const req = new Request("http://localhost:3000/dl/calgrid/1.0.3?mode=get");
    const res = await handleEdgeRequest(req, testEnv);
    assert.equal(res.status, 302);
    assert.equal(
      res.headers.get("location"),
      "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe"
    );
  });
});

// --- Cycle 2 Regression Suite (BUG-01 through BUG-11, BUG-13, BUG-17) ---

test("BUG-01: Live and local hosts never serve mock data and never cache empty payloads", async () => {
  const emptyEnv = { __REGISTRY_OVERRIDE: [] };
  const prodRes = await appsApiGet({
    request: new Request("https://apps.vib.tools/api/apps", {
      headers: { Host: "apps.vib.tools" }
    }),
    env: emptyEnv,
    waitUntil: () => {}
  });
  assert.equal(prodRes.status, 200);
  assert.equal(prodRes.headers.get("X-Catalog-Source"), "live");
  assert.equal(prodRes.headers.get("Cache-Control"), "no-store");
  assert.equal(prodRes.headers.get("X-Cache-Status"), "BYPASS");
  const prodBody = await prodRes.json();
  assert.deepEqual(prodBody.apps, []);

  const localRes = await appsApiGet({
    request: new Request("http://localhost:3000/api/apps"),
    env: emptyEnv,
    waitUntil: () => {}
  });
  assert.equal(localRes.status, 200);
  assert.equal(localRes.headers.get("X-Catalog-Source"), "live");
  assert.equal(localRes.headers.get("Cache-Control"), "no-store");
  assert.equal(localRes.headers.get("X-Cache-Status"), "BYPASS");
  const localBody = await localRes.json();
  assert.deepEqual(localBody.apps, []);
});

test("BUG-03: Malformed percent-encoding returns 400 Bad Request without crashing on both domains", async () => {
  const resStore = await handleEdgeRequest(new Request("http://localhost:3000/%E0%A4%A"));
  assert.equal(resStore.status, 400);

  const resGet = await handleEdgeRequest(new Request("http://localhost:3000/%E0%A4%A?mode=get"));
  assert.equal(resGet.status, 400);
});

test("BUG-04: isTrustedDownloadUrl allows trusted HTTPS hosts and rejects untrusted/HTTP/credentialed/malformed URLs", () => {
  assert.equal(isTrustedDownloadUrl("https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe"), true);
  assert.equal(isTrustedDownloadUrl("https://github.com/vib-tools/calgrid/releases/download/v1.0.3/calgrid.exe"), true);
  assert.equal(isTrustedDownloadUrl("https://objects.githubusercontent.com/github-production-release-asset/foo.exe"), true);
  assert.equal(
    isTrustedDownloadUrl("https://cdn.custom-partner.test/app.exe", { ALLOWED_DOWNLOAD_HOSTS: "cdn.custom-partner.test" }),
    true
  );

  assert.equal(isTrustedDownloadUrl("https://evil.example.com/payload.exe"), false);
  assert.equal(isTrustedDownloadUrl("http://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe"), false);
  assert.equal(isTrustedDownloadUrl("https://user:pass@dl.vib.tools/calgrid/v1.0.3/CalGrid.exe"), false);
  assert.equal(isTrustedDownloadUrl("https://"), false);
  assert.equal(isTrustedDownloadUrl(""), false);
});

test("BUG-05: get.vib.tools rejects invalid/traversal slugs with 400 and prototype-chain versions with 404", async () => {
  const resTraversalDl = await handleEdgeRequest(new Request("http://localhost:3000/dl/..%2Fetc?mode=get"));
  assert.equal(resTraversalDl.status, 400);

  const resBadSlugCli = await handleEdgeRequest(new Request("http://localhost:3000/bad!slug?mode=get"));
  assert.equal(resBadSlugCli.status, 400);

  const resBadSlugHtml = await handleEdgeRequest(
    new Request("http://localhost:3000/bad!slug?mode=get", { headers: { Accept: "text/html" } })
  );
  assert.equal(resBadSlugHtml.status, 400);

  await withMockedGitHubRepo(async (testEnv) => {
    const resProtoCli = await handleEdgeRequest(
      new Request("http://localhost:3000/calgrid/toString?mode=get"),
      testEnv
    );
    assert.equal(resProtoCli.status, 404);

    const resProtoDl = await handleEdgeRequest(
      new Request("http://localhost:3000/dl/calgrid/constructor?mode=get"),
      testEnv
    );
    assert.equal(resProtoDl.status, 404);
  });
});

test("BUG-07: SPA fallback emits single clean Content-Type: text/html; charset=utf-8 header", async () => {
  const cliRes = await handleEdgeRequest(
    new Request("http://localhost:3000/cli", { headers: { Accept: "text/html" } })
  );
  assert.equal(cliRes.status, 200);
  assert.equal(cliRes.headers.get("content-type"), "text/html; charset=utf-8");

  const missingAppRes = await handleEdgeRequest(
    new Request("http://localhost:3000/app/calgrid", { headers: { Accept: "text/html" } }),
    { __REGISTRY_OVERRIDE: [] }
  );
  assert.equal(missingAppRes.status, 404);
  assert.equal(missingAppRes.headers.get("content-type"), "text/html; charset=utf-8");
});

test("BUG-08: Browser visiting get.vib.tools/<slug>/<version> redirects 302 to storefront while CLI & /dl/ remain intact", async () => {
  await withMockedGitHubRepo(async (testEnv) => {
    const resBrowser = await handleEdgeRequest(
      new Request("http://localhost:3000/calgrid/1.0.3?mode=get", {
        headers: { Accept: "text/html,application/xhtml+xml" }
      }),
      testEnv
    );
    assert.equal(resBrowser.status, 302);
    assert.equal(resBrowser.headers.get("location"), "https://apps.vib.tools/app/calgrid");

    const resCli = await handleEdgeRequest(
      new Request("http://localhost:3000/calgrid/1.0.3?mode=get", {
        headers: { Accept: "*/*" }
      }),
      testEnv
    );
    assert.equal(resCli.status, 200);
    assert.ok((await resCli.text()).includes('$APP_VERSION = "v1.0.3"'));
  });
});

test("BUG-09: /api/apps is isolated from get.vib.tools (GET and OPTIONS return 404)", async () => {
  const getRes = await appsApiGet({
    request: new Request("https://get.vib.tools/api/apps", {
      headers: { Host: "get.vib.tools" }
    }),
    env: {},
    waitUntil: () => {}
  });
  assert.equal(getRes.status, 404);
  assert.equal(getRes.headers.get("Cache-Control"), "no-store");

  const optRes = await appsApiOptions({
    request: new Request("https://get.vib.tools/api/apps", {
      method: "OPTIONS",
      headers: { Host: "get.vib.tools" }
    })
  });
  assert.equal(optRes.status, 404);

  const localModeGetRes = await handleEdgeRequest(new Request("http://localhost:3000/api/apps?mode=get"));
  assert.equal(localModeGetRes.status, 404);
});

test("BUG-10: Dot-containing SPA routes return HTML shell while real missing static assets return plain 404", async () => {
  for (const spaPath of ["/category/Node.js", "/category/.NET"]) {
    const res = await handleEdgeRequest(
      new Request(`http://localhost:3000${spaPath}`, { headers: { Accept: "text/html" } })
    );
    assert.equal(res.status, 200, `${spaPath} should serve 200 SPA shell`);
    assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
  }

  // Dot-containing unregistered app slug returns strict 404 HTML shell (not treated as missing static asset)
  const dotAppRes = await handleEdgeRequest(
    new Request("http://localhost:3000/app/my.app", { headers: { Accept: "text/html" } })
  );
  assert.equal(dotAppRes.status, 404);
  assert.equal(dotAppRes.headers.get("content-type"), "text/html; charset=utf-8");
  assert.ok((await dotAppRes.text()).includes("<div id=\"app\"></div>"));

  for (const missingAsset of ["/missing-script.js", "/assets/nonexistent.png", "/styles.css"]) {
    const res = await handleEdgeRequest(new Request(`http://localhost:3000${missingAsset}`));
    assert.equal(res.status, 404, `${missingAsset} should return 404`);
    assert.equal(res.headers.get("content-type"), "text/plain; charset=utf-8");
  }
});

test("BUG-11: validateAppConfig rejects malformed schemas with 422 and server.js returns 405 for non-GET/HEAD", async () => {
  assert.equal(
    validateAppConfig({
      slug: "calgrid",
      name: "CalGrid",
      latest: "v1.0.3",
      versions: { "v1.0.3": { url: "https://dl.vib.tools/calgrid/v1.0.3/calgrid.exe" } }
    }).ok,
    true
  );

  for (const invalid of [
    null,
    [],
    { slug: "a", name: "A", latest: "1.0.0", versions: [] },
    { slug: "a", name: "A", latest: "1.0.0", versions: {} },
    { slug: 123, name: "A", latest: "1.0.0", versions: { "1.0.0": {} } },
    { slug: "a", name: "A", latest: "2.0.0", versions: { "1.0.0": {} } }
  ]) {
    const verdict = validateAppConfig(invalid);
    assert.equal(verdict.ok, false);
    assert.equal(verdict.status, 422);
  }

  for (const method of ["POST", "PUT", "DELETE"]) {
    const res = await handleEdgeRequest(
      new Request("http://localhost:3000/calgrid?mode=get", { method })
    );
    assert.equal(res.status, 405);
    assert.equal(res.headers.get("Allow"), "GET, HEAD");
  }
});

test("BUG-13: Non-runtime assets removed from public/ and Modal.js primitive retained", () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), "public/assets/aistudio")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "public/vib.tools.Branding/site.webmanifest")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "public/styles.css")), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), "public/components/ui/Modal.js")), true);
});

test("BUG-17: Service worker uses vib-apps-hub-v7, skips cross-origin fonts/CDNs, precaches all existing manifest icons, and guards non-GET/non-HTTP fetches", () => {
  const swSource = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/manifest.json"), "utf8"));

  assert.ok(swSource.includes('const CACHE_NAME = "vib-apps-hub-v7"'));
  assert.ok(swSource.includes('if (event.request.method !== "GET") return;'));
  assert.ok(swSource.includes('if (!url.protocol.startsWith("http")) return;'));
  assert.ok(swSource.includes('if (url.origin !== self.location.origin) return;'));

  const assetsMatch = swSource.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/);
  assert.ok(assetsMatch, "STATIC_ASSETS array must exist in public/sw.js");
  const precachedPaths = [...assetsMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  // Every icon in manifest.json must be precached in sw.js
  for (const icon of manifest.icons) {
    assert.ok(precachedPaths.includes(icon.src), `Manifest icon ${icon.src} must be precached in sw.js`);
  }

  // Every precached path (except root "/") must exist on disk inside public/
  for (const assetPath of precachedPaths) {
    if (assetPath === "/") continue;
    const diskPath = path.join(process.cwd(), "public", assetPath.replace(/^\/+/, ""));
    assert.equal(fs.existsSync(diskPath), true, `Precached asset ${assetPath} must exist at ${diskPath}`);
  }
});

// --- Frozen Vib Apps Engine Schema (v1), URL-only Registry & Per-Version Installer Tests ---

test("Frozen JSON Schema and Vib Apps Engine spec endpoints serve with 200 OK and CORS headers", async () => {
  const schemaRes = await handleEdgeRequest(
    new Request("http://localhost:3000/schemas/vibtools-app.schema.json")
  );
  assert.equal(schemaRes.status, 200);
  assert.equal(schemaRes.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(schemaRes.headers.get("Content-Type"), "application/schema+json; charset=utf-8");
  const schema = await schemaRes.json();
  assert.equal(schema.$id, "https://apps.vib.tools/schemas/vibtools-app.schema.json");
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.schemaVersion.const, 1);
  assert.ok(schema.$defs.versionRelease.properties.installer);

  const llmsRes = await handleEdgeRequest(
    new Request("http://localhost:3000/vib-apps-engine/llms.txt")
  );
  assert.equal(llmsRes.status, 200);
  assert.equal(llmsRes.headers.get("Access-Control-Allow-Origin"), "*");
  assert.ok((await llmsRes.text()).includes("vibtools-app.schema.json"));

  const guideRes = await handleEdgeRequest(
    new Request("http://localhost:3000/vib-apps-engine/vibtools-app-config.md")
  );
  assert.equal(guideRes.status, 200);
  assert.equal(guideRes.headers.get("Access-Control-Allow-Origin"), "*");
  assert.ok((await guideRes.text()).includes("12-Point Self-Verification Checklist"));
});

test("parseRepoIdentifier and getRegistry normalize bare GitHub URLs, /tree/<branch>, shorthands, and objects", () => {
  assert.deepEqual(parseRepoIdentifier("https://github.com/vib-tools/calgrid"), {
    repo: "vib-tools/calgrid",
    owner: "vib-tools",
    name: "calgrid"
  });
  assert.deepEqual(parseRepoIdentifier("https://github.com/vib-tools/calgrid.git/"), {
    repo: "vib-tools/calgrid",
    owner: "vib-tools",
    name: "calgrid"
  });
  assert.deepEqual(parseRepoIdentifier("https://github.com/vib-tools/calgrid/tree/release/v2"), {
    repo: "vib-tools/calgrid",
    owner: "vib-tools",
    name: "calgrid",
    branch: "release/v2"
  });
  assert.deepEqual(parseRepoIdentifier("vib-tools/devprompt"), {
    repo: "vib-tools/devprompt",
    owner: "vib-tools",
    name: "devprompt"
  });

  // Reject non-GitHub hosts and traversal
  assert.equal(parseRepoIdentifier("https://gitlab.com/vib-tools/calgrid"), null);
  assert.equal(parseRepoIdentifier("../etc/passwd"), null);
  assert.equal(parseRepoIdentifier("https://github.com/only-owner"), null);

  const normalized = getRegistry([
    "https://github.com/vib-tools/calgrid",
    "https://github.com/vib-tools/devprompt/tree/beta",
    { url: "https://github.com/vib-tools/vibclip.git", featured: true },
    { slug: "custom-slug", repo: "vib-tools/my-app-repo", branch: "main" },
    "https://evil.example.com/nope/repo"
  ]);

  assert.equal(normalized.length, 4);
  assert.deepEqual(normalized[0], {
    repo: "vib-tools/calgrid",
    repoName: "calgrid",
    slug: null,
    branch: "main",
    featured: false
  });
  assert.equal(normalized[1].branch, "beta");
  assert.equal(normalized[2].featured, true);
  assert.equal(normalized[2].repo, "vib-tools/vibclip");
  assert.equal(normalized[3].slug, "custom-slug");
  assert.equal(normalizeRegistryEntry(null), null);
});

test("validateAppConfig enforces strict frozen v1 rules (schemaVersion: 1)", () => {
  const validV1 = {
    $schema: "https://apps.vib.tools/schemas/vibtools-app.schema.json",
    schemaVersion: 1,
    slug: "calgrid",
    name: "CalGrid",
    tagline: "Minimalist desktop calendar widget",
    category: "Productivity",
    access: "Free",
    icon: "https://dl.vib.tools/calgrid/icon.png",
    latest: "v1.0.3",
    installer: { type: "powershell", script: ".vibtools/apps/installer.ps1" },
    docs: { features: ".vibtools/apps/features.md", changelog: ".vibtools/apps/changelog.md" },
    versions: {
      "v1.0.3": {
        url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe",
        size: "42.8 MB",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        released_at: "2026-11-15",
        channel: "stable",
        deprecated: false
      },
      "v1.0.2": {
        url: "https://dl.vib.tools/calgrid/v1.0.2/CalGrid.exe",
        installer: "https://dl.vib.tools/calgrid/v1.0.2/install.ps1",
        released_at: "2026-10-28",
        deprecated: true
      }
    }
  };
  assert.equal(validateAppConfig(validV1).ok, true);

  // Reject unsupported schemaVersion
  assert.equal(validateAppConfig({ ...validV1, schemaVersion: 2 }).ok, false);

  // Reject unknown root field (additionalProperties: false)
  assert.equal(validateAppConfig({ ...validV1, customExtra: true }).ok, false);

  // Reject typo releaseDate instead of released_at inside frozen v1 version
  assert.equal(
    validateAppConfig({
      ...validV1,
      versions: {
        "v1.0.3": {
          url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe",
          releaseDate: "2026-11-15"
        }
      }
    }).ok,
    false
  );

  // Reject bad sha256 or non-HTTPS url in frozen v1
  assert.equal(
    validateAppConfig({
      ...validV1,
      versions: {
        "v1.0.3": {
          url: "http://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe"
        }
      }
    }).ok,
    false
  );
  assert.equal(
    validateAppConfig({
      ...validV1,
      versions: {
        "v1.0.3": {
          url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe",
          sha256: "not-a-valid-hex"
        }
      }
    }).ok,
    false
  );
});

test("resolveAppBySlug auto-discovers apps from URL-only registry entries even when repo name != slug", async () => {
  const entries = getRegistry([
    "https://github.com/vib-tools/calgrid-desktop-repo",
    "https://github.com/vib-tools/devprompt"
  ]);

  const fakeFetcher = async (entry) => {
    if (entry.repo === "vib-tools/calgrid-desktop-repo") {
      return {
        ok: true,
        config: {
          schemaVersion: 1,
          slug: "calgrid",
          name: "CalGrid",
          latest: "v1.0.3",
          versions: { "v1.0.3": { url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe" } }
        }
      };
    }
    return {
      ok: true,
      config: {
        schemaVersion: 1,
        slug: "devprompt",
        name: "DevPrompt",
        latest: "v2.1.0",
        versions: { "v2.1.0": { url: "https://dl.vib.tools/devprompt/v2.1.0/DevPrompt.zip" } }
      }
    };
  };

  // Repo name differs from slug ("calgrid-desktop-repo" -> slug "calgrid")
  const foundRenamed = await resolveAppBySlug("calgrid", {}, {}, { entries, configFetcher: fakeFetcher });
  assert.equal(foundRenamed?.entry.repo, "vib-tools/calgrid-desktop-repo");
  assert.equal(foundRenamed?.config.slug, "calgrid");

  // Direct repo name match fast-path ("devprompt")
  const foundDirect = await resolveAppBySlug("devprompt", {}, {}, { entries, configFetcher: fakeFetcher });
  assert.equal(foundDirect?.entry.repo, "vib-tools/devprompt");
  assert.equal(foundDirect?.config.slug, "devprompt");

  // Unknown slug returns null
  const missing = await resolveAppBySlug("nonexistent", {}, {}, { entries, configFetcher: fakeFetcher });
  assert.equal(missing, null);
});

test("fetchAppInstaller resolves per-version repo path & trusted HTTPS overrides and blocks untrusted URLs", async () => {
  assert.equal(isTrustedInstallerUrl("https://raw.githubusercontent.com/vib-tools/calgrid/main/install.ps1"), true);
  assert.equal(isTrustedInstallerUrl("https://dl.vib.tools/calgrid/v1.0.2/install.ps1"), true);
  assert.equal(isTrustedInstallerUrl("https://evil.example.com/install.ps1"), false);
  assert.equal(isTrustedInstallerUrl("http://dl.vib.tools/calgrid/v1.0.2/install.ps1"), false);

  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    if (String(url) === "https://dl.vib.tools/calgrid/v1.0.2/install.ps1") {
      return new Response("# per-version remote script v1.0.2", { status: 200 });
    }
    if (String(url).includes("/contents/.vibtools/apps/installers/v1.0.1.ps1")) {
      return new Response("# per-version repo script v1.0.1", { status: 200 });
    }
    if (String(url).includes("/contents/.vibtools/apps/installer.ps1")) {
      return new Response("# root default script", { status: 200 });
    }
    if (String(url).includes("/contents/.vibtools/apps/features.md")) {
      return new Response("# Apps-folder features", { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  };

  try {
    const entry = { repo: "vib-tools/calgrid-test-inst", branch: "main", slug: null, featured: false };
    const config = {
      schemaVersion: 1,
      slug: "calgrid",
      name: "CalGrid",
      latest: "v1.0.3",
      installer: { type: "powershell", script: ".vibtools/apps/installer.ps1" },
      versions: {
        "v1.0.3": { url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe" },
        "v1.0.2": {
          url: "https://dl.vib.tools/calgrid/v1.0.2/CalGrid.exe",
          installer: "https://dl.vib.tools/calgrid/v1.0.2/install.ps1"
        },
        "v1.0.1": {
          url: "https://dl.vib.tools/calgrid/v1.0.1/CalGrid.exe",
          installer: ".vibtools/apps/installers/v1.0.1.ps1"
        },
        "v1.0.0": {
          url: "https://dl.vib.tools/calgrid/v1.0.0/CalGrid.exe",
          installer: "https://evil.example.com/pwn.ps1"
        }
      }
    };

    // 1. Inherits root installer when versionData.installer is omitted
    const resDefault = await fetchAppInstaller(entry, config, {}, {}, config.versions["v1.0.3"]);
    assert.equal(resDefault.ok, true);
    assert.equal(resDefault.script, "# root default script");

    // 2. Per-version trusted HTTPS URL override
    const resRemote = await fetchAppInstaller(entry, config, {}, {}, config.versions["v1.0.2"]);
    assert.equal(resRemote.ok, true);
    assert.equal(resRemote.script, "# per-version remote script v1.0.2");

    // 3. Per-version repo-relative path override
    const resRepoOverride = await fetchAppInstaller(entry, config, {}, {}, config.versions["v1.0.1"]);
    assert.equal(resRepoOverride.ok, true);
    assert.equal(resRepoOverride.script, "# per-version repo script v1.0.1");

    // 4. Rejects untrusted remote installer URL with 403
    const resUntrusted = await fetchAppInstaller(entry, config, {}, {}, config.versions["v1.0.0"]);
    assert.equal(resUntrusted.ok, false);
    assert.equal(resUntrusted.status, 403);

    // 5. Bare doc filename resolves inside .vibtools/apps/ first
    const docText = await fetchAppDoc(entry, "features.md", {}, {});
    assert.equal(docText, "# Apps-folder features");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Forensic parity: validateAppConfig strict v1 rejects uppercase slug, prototype version keys, non-exact latest, and malformed optional fields", () => {
  const baseV1 = {
    $schema: "https://apps.vib.tools/schemas/vibtools-app.schema.json",
    schemaVersion: 1,
    slug: "calgrid",
    name: "CalGrid",
    latest: "v1.0.3",
    versions: {
      "v1.0.3": {
        url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe"
      }
    }
  };
  assert.equal(validateAppConfig(baseV1).ok, true);

  const invalidCases = [
    // Uppercase slug rejected in strict v1
    { ...baseV1, slug: "CalGrid" },
    // Prototype-like version key rejected (must start with digit after optional v)
    {
      ...baseV1,
      latest: "constructor",
      versions: { constructor: { url: "https://dl.vib.tools/calgrid/c.exe" } }
    },
    // Non-exact latest key mismatch rejected in strict v1
    { ...baseV1, latest: "1.0.3" },
    // Malformed optional fields
    { ...baseV1, platforms: "Windows" },
    { ...baseV1, architectures: [""] },
    { ...baseV1, screenshots: ["javascript:alert(1)"] },
    { ...baseV1, links: { docs: "http://insecure.example.com" } },
    { ...baseV1, requirements: [] },
    { ...baseV1, icon: "http://dl.vib.tools/icon.png" }
  ];

  for (const invalid of invalidCases) {
    const verdict = validateAppConfig(invalid);
    assert.equal(verdict.ok, false, `Expected invalid v1 config to fail: ${JSON.stringify(invalid)}`);
    assert.equal(verdict.status, 422);
  }
});

test("Forensic parity: getRegistry deduplicates duplicate GitHub repo URLs and AI/SEO endpoints serve cleanly", async () => {
  const deduped = getRegistry([
    "https://github.com/vib-tools/calgrid",
    "vib-tools/calgrid",
    "https://github.com/VIB-TOOLS/CalGrid.git"
  ]);
  assert.equal(deduped.length, 1);

  const emptyEnv = { __REGISTRY_OVERRIDE: [] };
  const rootLlms = await handleEdgeRequest(new Request("http://localhost:3000/llms.txt"), emptyEnv);
  assert.equal(rootLlms.status, 200);
  assert.equal(rootLlms.headers.get("Access-Control-Allow-Origin"), "*");
  assert.ok((await rootLlms.text()).includes("vibtools-app.schema.json"));

  const aiGuide = await handleEdgeRequest(new Request("http://localhost:3000/vib-apps-engine/ai-guide.md"));
  assert.equal(aiGuide.status, 200);
  assert.equal(aiGuide.headers.get("Access-Control-Allow-Origin"), "*");
  assert.ok((await aiGuide.text()).includes("Ready-to-Paste Prompt"));

  const robots = await handleEdgeRequest(new Request("http://localhost:3000/robots.txt"));
  assert.equal(robots.status, 200);
  assert.ok((await robots.text()).includes("Sitemap: https://apps.vib.tools/sitemap.xml"));

  const sitemap = await handleEdgeRequest(new Request("http://localhost:3000/sitemap.xml"), emptyEnv);
  assert.equal(sitemap.status, 200);
  assert.equal(sitemap.headers.get("Content-Type"), "application/xml; charset=utf-8");
  const xml = await sitemap.text();
  assert.ok(xml.includes("https://apps.vib.tools/schemas/vibtools-app.schema.json"));
  assert.ok(xml.includes("https://apps.vib.tools/vib-apps-engine/ai-guide.md"));

  const indexHtml = fs.readFileSync(path.join(process.cwd(), "public/index.html"), "utf8");
  assert.ok(indexHtml.includes('rel="canonical"'));
  assert.ok(indexHtml.includes('href="/llms.txt"'));
  assert.ok(indexHtml.includes('application/ld+json'));
});

test("Forensic Pass 2: validateAppConfig rejects impossible calendar dates, duplicate platforms/architectures, and installer/docs traversal or non-HTTPS schemes", () => {
  const baseV1 = {
    $schema: "https://apps.vib.tools/schemas/vibtools-app.schema.json",
    schemaVersion: 1,
    slug: "calgrid",
    name: "CalGrid",
    latest: "v1.0.3",
    versions: {
      "v1.0.3": {
        url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe",
        released_at: "2024-02-29"
      }
    }
  };
  // Valid leap year date passes
  assert.equal(validateAppConfig(baseV1).ok, true);

  const invalidPass2Cases = [
    // Impossible calendar dates
    {
      ...baseV1,
      versions: {
        "v1.0.3": { url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe", released_at: "2026-02-31" }
      }
    },
    {
      ...baseV1,
      versions: {
        "v1.0.3": { url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe", released_at: "2025-02-29" }
      }
    },
    // Duplicate items violating uniqueItems: true
    { ...baseV1, platforms: ["Windows 10/11", "Windows 10/11"] },
    { ...baseV1, architectures: ["x64", "x64"] },
    // Traversal & non-HTTPS schemes on root installer
    { ...baseV1, installer: "../secret.ps1" },
    { ...baseV1, installer: "http://dl.vib.tools/calgrid/install.ps1" },
    { ...baseV1, installer: { type: "powershell", script: "javascript:alert(1)" } },
    // Traversal & non-HTTPS schemes on per-version installer
    {
      ...baseV1,
      versions: {
        "v1.0.3": {
          url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe",
          installer: ".vibtools/apps/../../etc/passwd"
        }
      }
    },
    {
      ...baseV1,
      versions: {
        "v1.0.3": {
          url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe",
          installer: "http://dl.vib.tools/calgrid/v1.0.3/install.ps1"
        }
      }
    },
    // Traversal & URI schemes on docs paths
    { ...baseV1, docs: { features: "../README.md" } },
    { ...baseV1, docs: { changelog: "https://evil.example.com/changelog.md" } }
  ];

  for (const invalid of invalidPass2Cases) {
    const verdict = validateAppConfig(invalid);
    assert.equal(verdict.ok, false, `Expected Pass 2 invalid config to fail: ${JSON.stringify(invalid)}`);
    assert.equal(verdict.status, 422);
  }
});

test("Forensic Pass 2: developer portal docs/dev/08-vib-apps-engine-ai-guide.md exists and is synced in index and manifest", () => {
  const aiDevGuide = fs.readFileSync(
    path.join(process.cwd(), "docs/dev/08-vib-apps-engine-ai-guide.md"),
    "utf8"
  );
  assert.ok(aiDevGuide.includes("order: 8"));
  assert.ok(aiDevGuide.includes("draft: false"));
  assert.ok(aiDevGuide.includes("https://apps.vib.tools/vib-apps-engine/llms.txt"));
  assert.ok(aiDevGuide.includes("https://apps.vib.tools/schemas/vibtools-app.schema.json"));

  const devIndex = fs.readFileSync(path.join(process.cwd(), "docs/dev/index.md"), "utf8");
  assert.ok(devIndex.includes("./08-vib-apps-engine-ai-guide.md"));

  const docsManifest = fs.readFileSync(path.join(process.cwd(), "docs/MANIFEST.md"), "utf8");
  assert.ok(docsManifest.includes("dev/08-vib-apps-engine-ai-guide.md"));

  const securityDoc = fs.readFileSync(
    path.join(process.cwd(), "docs/dev/05-security-and-validation.md"),
    "utf8"
  );
  assert.ok(securityDoc.includes("isValidIsoCalendarDate") || securityDoc.includes("2026-02-31"));
  assert.ok(securityDoc.includes("isTrustedDownloadUrl"));
});

test("Forensic Pass 3: rejects malformed https:// URLs, supports multi-branch resolveAppBySlug, and serves /llms-full.txt with CORS *", async () => {
  const baseV1 = {
    $schema: "https://apps.vib.tools/schemas/vibtools-app.schema.json",
    schemaVersion: 1,
    slug: "calgrid",
    name: "CalGrid",
    latest: "v1.0.3",
    versions: {
      "v1.0.3": { url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe" }
    }
  };

  // Malformed "https://" without hostname must fail 422
  for (const broken of [
    { ...baseV1, icon: "https://" },
    { ...baseV1, links: { docs: "https://" } },
    { ...baseV1, screenshots: ["https://"] },
    { ...baseV1, versions: { "v1.0.3": { url: "https://" } } },
    { ...baseV1, installer: "https://" }
  ]) {
    const verdict = validateAppConfig(broken);
    assert.equal(verdict.ok, false, `Expected malformed https:// URL to fail: ${JSON.stringify(broken)}`);
    assert.equal(verdict.status, 422);
  }

  // Multi-branch same-repo auto-discovery in resolveAppBySlug()
  const entries = getRegistry([
    "https://github.com/vib-tools/calgrid/tree/main",
    "https://github.com/vib-tools/calgrid/tree/beta"
  ]);
  assert.equal(entries.length, 2);

  const branchFetcher = async (entry) => {
    if (entry.branch === "main") {
      return {
        ok: true,
        config: {
          schemaVersion: 1,
          slug: "calgrid-legacy",
          name: "CalGrid Legacy",
          latest: "v1.0.0",
          versions: { "v1.0.0": { url: "https://dl.vib.tools/calgrid/v1.0.0/c.exe" } }
        }
      };
    }
    return {
      ok: true,
      config: {
        schemaVersion: 1,
        slug: "calgrid",
        name: "CalGrid Beta",
        latest: "v2.0.0-beta.1",
        versions: { "v2.0.0-beta.1": { url: "https://dl.vib.tools/calgrid/v2.0.0-beta.1/c.exe" } }
      }
    };
  };

  const resolvedBeta = await resolveAppBySlug("calgrid", {}, {}, { entries, configFetcher: branchFetcher });
  assert.equal(resolvedBeta?.entry.branch, "beta");
  assert.equal(resolvedBeta?.config.slug, "calgrid");

  // Single-URL AI Master Bundle /llms-full.txt serves 200 OK with CORS *
  const fullLlmsRes = await handleEdgeRequest(new Request("http://localhost:3000/llms-full.txt"));
  assert.equal(fullLlmsRes.status, 200);
  assert.equal(fullLlmsRes.headers.get("Access-Control-Allow-Origin"), "*");
  const fullText = await fullLlmsRes.text();
  assert.ok(fullText.includes("Step-by-Step Setup Matrix"));
  assert.ok(fullText.includes("12-Point Self-Verification Checklist"));

  // Frozen JSON Schema enforces traversal/scheme guard on docs.features & docs.changelog
  const schemaJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "public/schemas/vibtools-app.schema.json"), "utf8")
  );
  assert.ok(schemaJson.properties.docs.properties.features.not?.pattern);
  assert.ok(schemaJson.properties.docs.properties.changelog.not?.pattern);

  // Interactive /schema and /vib-apps-engine SPA routes return 200 OK HTML shell
  for (const routePath of ["/schema", "/vib-apps-engine"]) {
    const spaRes = await handleEdgeRequest(
      new Request(`http://localhost:3000${routePath}`, { headers: { Accept: "text/html" } })
    );
    assert.equal(spaRes.status, 200);
    assert.equal(spaRes.headers.get("content-type"), "text/html; charset=utf-8");
  }
});

// --- Cycle 3 Regression Suite (SEO-01 through SEO-08 & ERR-SEO-01 through ERR-SEO-09) ---

test("Cycle 3 SEO-01 & SEO-02: Edge injects per-route title, canonical, OG/Twitter, and Schema.org JSON-LD across all storefront routes", async () => {
  await withMockedGitHubRepo(async (testEnv) => {
    const cases = [
      {
        path: "/",
        title: "Vib Apps — Apps Catalog &amp; Edge Installer",
        canonical: "https://apps.vib.tools/",
        ldTypes: ["WebSite", "WebApplication"]
      },
      {
        path: "/cli",
        title: "CLI Installer Guide — Vib Apps",
        canonical: "https://apps.vib.tools/cli",
        ldTypes: ["TechArticle", "BreadcrumbList"]
      },
      {
        path: "/schema",
        title: "Vib Apps Engine — Frozen Schema (v1) &amp; AI Docs — Vib Apps",
        canonical: "https://apps.vib.tools/schema",
        ldTypes: ["TechArticle", "BreadcrumbList"]
      },
      {
        path: "/vib-apps-engine",
        title: "Vib Apps Engine — Frozen Schema (v1) &amp; AI Docs — Vib Apps",
        canonical: "https://apps.vib.tools/schema",
        ldTypes: ["TechArticle", "BreadcrumbList"]
      },
      {
        path: "/category/Productivity",
        title: "Productivity Applications — Vib Apps",
        canonical: "https://apps.vib.tools/category/productivity",
        ldTypes: ["CollectionPage", "BreadcrumbList"]
      },
      {
        path: "/app/calgrid",
        title: "CalGrid (v1.0.3) — Vib Apps",
        canonical: "https://apps.vib.tools/app/calgrid",
        ldTypes: ["SoftwareApplication", "BreadcrumbList"],
        customIcon: "https://dl.vib.tools/calgrid/icon.png"
      }
    ];

    for (const c of cases) {
      const res = await handleEdgeRequest(
        new Request(`http://localhost:3000${c.path}`, { headers: { Accept: "text/html" } }),
        testEnv
      );
      assert.equal(res.status, 200, `${c.path} should return 200`);
      const html = await res.text();
      assert.ok(html.includes(`<title>${c.title}</title>`), `${c.path} title mismatch`);
      assert.ok(html.includes(`<link rel="canonical" href="${c.canonical}">`), `${c.path} canonical mismatch`);
      assert.ok(html.includes('<meta name="robots" content="index, follow">'), `${c.path} robots mismatch`);
      assert.ok(html.includes('<meta name="theme-color" content="#0d1117">'), `${c.path} theme-color missing`);

      const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(ldMatch, `${c.path} JSON-LD missing`);
      const ld = JSON.parse(ldMatch[1]);
      assert.deepEqual(
        ld["@graph"].map((n) => n["@type"]),
        c.ldTypes,
        `${c.path} JSON-LD @graph mismatch`
      );

      if (c.customIcon) {
        assert.ok(html.includes(`<meta property="og:image" content="${c.customIcon}">`));
        assert.equal(html.includes('property="og:image:width"'), false, "custom icon should strip fixed 1200x630 width");
        assert.equal(html.includes('property="og:image:height"'), false, "custom icon should strip fixed 1200x630 height");
        assert.equal(ld["@graph"][0].softwareVersion, "v1.0.3");
        assert.equal(ld["@graph"][0].downloadUrl, "https://get.vib.tools/dl/calgrid");
      }
    }
  });
});

test("Cycle 3 SEO-04 & ERR-SEO-03: Semantic <noscript> crawler fallback and XSS/$-token escaping across head, JSON-LD, and noscript", async () => {
  const indexHtml = fs.readFileSync(path.join(process.cwd(), "public/index.html"), "utf8");
  const hostileMeta = buildRouteSeoMetadata("/app/calgrid", {
    resolvedApp: {
      entry: { slug: "calgrid" },
      config: {
        slug: "calgrid",
        name: "CalGrid <Pro> $& $1",
        tagline: "Fast </script><script>alert(1)</script> <img src=x onerror=alert(2)> $9.99",
        category: "Productivity",
        access: "Free",
        platforms: ["Windows"],
        latest: "1.0.3",
        versions: {
          "1.0.3": {
            url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe",
            size: "42 MB",
            sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            released_at: "2026-11-15"
          }
        }
      }
    }
  });

  const rewritten = injectSeoIntoHtml(indexHtml, hostileMeta);
  assert.ok(rewritten.includes("<title>CalGrid &lt;Pro&gt; $&amp; $1 (v1.0.3) — Vib Apps</title>"));
  assert.equal(rewritten.includes("<script>alert(1)</script>"), false);
  assert.equal(rewritten.includes("<img src=x onerror=alert(2)>"), false);
  assert.match(rewritten, /<div id="app"><\/div>\s*<noscript><main>/);
  assert.ok(rewritten.includes("https://get.vib.tools/calgrid"));
  assert.ok(rewritten.includes("https://get.vib.tools/dl/calgrid"));

  const ldRaw = rewritten.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  assert.equal(/<\/script>/i.test(ldRaw), false, "JSON-LD must escape </script>");
  assert.doesNotThrow(() => JSON.parse(ldRaw));
});

test("Cycle 3 SEO-05 & ERR-SEO-09: Unknown routes and unregistered /app/:slug return strict HTTP 404 + noindex + no-store; malformed URLs return 400", async () => {
  for (const notFoundPath of ["/unknown-route", "/foo/bar", "/app/nonexistent", "/app/bad!slug"]) {
    const res = await handleEdgeRequest(
      new Request(`http://localhost:3000${notFoundPath}`, { headers: { Accept: "text/html" } })
    );
    assert.equal(res.status, 404, `${notFoundPath} must return strict HTTP 404`);
    assert.equal(res.headers.get("Cache-Control"), "no-store");
    assert.equal(res.headers.get("X-Robots-Tag"), "noindex, nofollow");
    assert.equal(res.headers.get("Content-Type"), "text/html; charset=utf-8");
    const html = await res.text();
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
    assert.match(html, /<noscript><main><h1>404 — /);
  }

  for (const malformedPath of ["/%E0%A4%A", "/category/%E0%A4%A", "/app/%E0%A4%A"]) {
    const res = await handleEdgeRequest(new Request(`http://localhost:3000${malformedPath}`));
    assert.equal(res.status, 400, `${malformedPath} must return 400 Bad Request`);
  }
});

test("Cycle 3 SEO-06 & SEO-07: get.vib.tools attaches X-Robots-Tag: noindex, nofollow and HEAD parity works across all edge routes", async () => {
  await withMockedGitHubRepo(async (testEnv) => {
    const cliRoot = await handleEdgeRequest(new Request("http://localhost:3000/?mode=get"), testEnv);
    assert.equal(cliRoot.status, 200);
    assert.equal(cliRoot.headers.get("X-Robots-Tag"), "noindex, nofollow");

    const cliScript = await handleEdgeRequest(new Request("http://localhost:3000/calgrid?mode=get"), testEnv);
    assert.equal(cliScript.status, 200);
    assert.equal(cliScript.headers.get("X-Robots-Tag"), "noindex, nofollow");

    const dlRedirect = await handleEdgeRequest(new Request("http://localhost:3000/dl/calgrid?mode=get"), testEnv);
    assert.equal(dlRedirect.status, 302);
    assert.equal(dlRedirect.headers.get("X-Robots-Tag"), "noindex, nofollow");

    const missingCli = await handleEdgeRequest(new Request("http://localhost:3000/missing?mode=get"), testEnv);
    assert.equal(missingCli.status, 404);
    assert.equal(missingCli.headers.get("X-Robots-Tag"), "noindex, nofollow");

    for (const [route, expectedStatus] of [
      ["/", 200],
      ["/cli", 200],
      ["/app/calgrid", 200],
      ["/unknown-route", 404],
      ["/sitemap.xml", 200],
      ["/llms.txt", 200],
      ["/?mode=get", 200]
    ]) {
      const headRes = await handleEdgeRequest(
        new Request(`http://localhost:3000${route}`, { method: "HEAD" }),
        testEnv
      );
      assert.equal(headRes.status, expectedStatus, `HEAD ${route} status mismatch`);
      assert.equal(await headRes.text(), "", `HEAD ${route} must have empty body`);
    }
  });
});

test("Cycle 3 SEO-03 & SEO-08: Dynamic /sitemap.xml and /llms.txt list live apps, skip broken repos, escape XML, and isolate get.vib.tools", async () => {
  // 1. Empty registry defaults
  const emptyEnv = { __REGISTRY_OVERRIDE: [] };
  const emptySitemap = await handleEdgeRequest(new Request("http://localhost:3000/sitemap.xml"), emptyEnv);
  assert.equal(emptySitemap.status, 200);
  assert.equal(emptySitemap.headers.get("Content-Type"), "application/xml; charset=utf-8");
  const emptyXml = await emptySitemap.text();
  assert.equal((emptyXml.match(/<url>/g) || []).length, 9);

  const emptyLlms = await handleEdgeRequest(new Request("http://localhost:3000/llms.txt"), emptyEnv);
  assert.equal(emptyLlms.status, 200);
  assert.equal(emptyLlms.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal((await emptyLlms.text()).includes("## Published Applications"), false);

  // 2. Live multi-repo with one healthy repo ("Audio & Video") + one broken repo skipped cleanly
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("vib-tools/calgrid-seo") && u.includes("app.config.json")) {
      return new Response(
        JSON.stringify({
          $schema: "https://apps.vib.tools/schemas/vibtools-app.schema.json",
          schemaVersion: 1,
          slug: "calgrid",
          name: "CalGrid",
          tagline: "Fast calendar\nfor power users",
          category: "Audio & Video",
          access: "Free",
          latest: "v1.0.3",
          installer: { type: "powershell", script: ".vibtools/apps/installer.ps1" },
          versions: {
            "v1.0.3": {
              url: "https://dl.vib.tools/calgrid/v1.0.3/CalGrid.exe",
              released_at: "2026-11-15"
            }
          }
        }),
        { status: 200 }
      );
    }
    return new Response("Not Found", { status: 404 });
  };

  try {
    const testEnv = {
      __REGISTRY_OVERRIDE: [
        "https://github.com/vib-tools/calgrid-seo",
        "https://github.com/vib-tools/broken-seo-repo"
      ]
    };

    const liveSitemap = await handleEdgeRequest(new Request("http://localhost:3000/sitemap.xml"), testEnv);
    assert.equal(liveSitemap.status, 200);
    const liveXml = await liveSitemap.text();
    assert.ok(liveXml.includes("<loc>https://apps.vib.tools/app/calgrid</loc>"));
    assert.ok(liveXml.includes("<lastmod>2026-11-15</lastmod>"));
    assert.ok(liveXml.includes("<loc>https://apps.vib.tools/category/audio%20%26%20video</loc>"));
    assert.equal((liveXml.match(/<url>/g) || []).length, 11);
    assert.equal(escapeXml(`a&b<c>d"e'f`), "a&amp;b&lt;c&gt;d&quot;e&apos;f");

    const liveLlms = await handleEdgeRequest(new Request("http://localhost:3000/llms.txt"), testEnv);
    assert.equal(liveLlms.status, 200);
    assert.equal(liveLlms.headers.get("Access-Control-Allow-Origin"), "*");
    const liveLlmsText = await liveLlms.text();
    assert.ok(liveLlmsText.includes("## Published Applications"));
    assert.ok(liveLlmsText.includes("[CalGrid (v1.0.3)](https://apps.vib.tools/app/calgrid)"));
    assert.ok(liveLlmsText.includes('irm "https://get.vib.tools/calgrid" | iex'));
  } finally {
    globalThis.fetch = origFetch;
  }

  // 3. Domain isolation on get.vib.tools
  for (const isolatedPath of ["/sitemap.xml?mode=get", "/llms.txt?mode=get"]) {
    const res = await handleEdgeRequest(new Request(`http://localhost:3000${isolatedPath}`));
    assert.equal(res.status, 404);
    assert.equal(res.headers.get("X-Robots-Tag"), "noindex, nofollow");
    assert.equal(res.headers.get("Cache-Control"), "no-store");
  }
});

test("Edge CLI streamer strips leading UTF-8 BOM from repository PowerShell scripts before prepending injected variables", async () => {
  const originalFetch = globalThis.fetch;
  const bomRepo = "vib-tools/bom-ps1-test";
  const bomEnv = { __REGISTRY_OVERRIDE: [`https://github.com/${bomRepo}`] };

  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes(`${bomRepo}/contents/.vibtools/apps/app.config.json`)) {
      return new Response(
        JSON.stringify({
          $schema: "https://apps.vib.tools/schemas/vibtools-app.schema.json",
          schemaVersion: 1,
          slug: "bomapp",
          name: "BomApp",
          latest: "1.0.0",
          installer: ".vibtools/apps/installer.ps1",
          versions: {
            "1.0.0": { url: "https://dl.vib.tools/BomApp/v1.0.0/BomApp.zip" }
          }
        }),
        { status: 200 }
      );
    }
    if (u.includes(`${bomRepo}/contents/.vibtools/apps/installer.ps1`)) {
      return new Response("\uFEFF# BomApp Installer\r\nWrite-Host $APP_VERSION\r\n", { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  };

  try {
    const res = await handleEdgeRequest(new Request("http://localhost:3000/bomapp?mode=get"), bomEnv);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.equal(body.includes("\uFEFF"), false, "Streamed PowerShell script must not contain mid-file UTF-8 BOM");
    assert.ok(body.startsWith('$APP_SLUG = "bomapp"'));
    assert.ok(body.includes("# BomApp Installer"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});




