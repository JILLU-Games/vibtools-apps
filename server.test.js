import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { handleEdgeRequest } from "./server.js";
import { isValidSlug, validateAppConfig } from "./functions/_lib/github.js";
import { getMockApps, findMockApp } from "./functions/_lib/mockData.js";
import { isTrustedDownloadUrl } from "./functions/[[path]].js";
import { onRequestGet as appsApiGet, onRequestOptions as appsApiOptions } from "./functions/api/apps.js";

test("slug validation rejects traversal and accepts valid slugs", () => {
  assert.equal(isValidSlug("calgrid"), true);
  assert.equal(isValidSlug("dev-prompt_2"), true);
  assert.equal(isValidSlug("../etc/passwd"), false);
  assert.equal(isValidSlug(""), false);
});

test("mock catalog engine returns schema-valid sample apps", () => {
  const apps = getMockApps();
  assert.ok(Array.isArray(apps));
  assert.ok(apps.length >= 3);
  const calgrid = findMockApp("calgrid");
  assert.equal(calgrid?.name, "CalGrid");
  assert.equal(calgrid?.latest, "v1.0.3");
});

test("GET /api/apps returns fallback catalog JSON", async () => {
  const req = new Request("http://localhost:3000/api/apps");
  const res = await handleEdgeRequest(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.apps));
  assert.ok(data.apps.length >= 3);
});

test("GET /api/apps?slug=calgrid returns single app detail and docs", async () => {
  const req = new Request("http://localhost:3000/api/apps?slug=calgrid");
  const res = await handleEdgeRequest(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.app.slug, "calgrid");
  assert.ok(data.docs.features.includes("CalGrid"));
  assert.ok(data.docs.changelog.includes("v1.0.3"));
});

test("SPA routes on apps.vib.tools return index.html with 200 OK", async () => {
  const req = new Request("http://localhost:3000/app/calgrid", {
    headers: { Accept: "text/html" }
  });
  const res = await handleEdgeRequest(req);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.includes("<div id=\"app\"></div>"));
});

test("CLI installer route on get.vib.tools returns PowerShell script", async () => {
  const req = new Request("http://localhost:3000/calgrid/1.0.3?mode=get");
  const res = await handleEdgeRequest(req);
  assert.equal(res.status, 200);
  const script = await res.text();
  assert.ok(script.includes('$APP_SLUG = "calgrid"'));
  assert.ok(script.includes('$APP_VERSION = "v1.0.3"'));
});

test("Direct download route on get.vib.tools returns 302 redirect to R2 binary", async () => {
  const req = new Request("http://localhost:3000/dl/calgrid/1.0.3?mode=get");
  const res = await handleEdgeRequest(req);
  assert.equal(res.status, 302);
  assert.equal(
    res.headers.get("location"),
    "https://dl.vib.tools/calgrid/v1.0.3/CalGrid-Setup-1.0.3.exe"
  );
});

// --- Cycle 2 Regression Suite (BUG-01 through BUG-11, BUG-13, BUG-17) ---

test("BUG-01: Live prod host disables mock fallback by default, never caches mock/empty payloads, and honors ENABLE_MOCK_FALLBACK", async () => {
  const prodRes = await appsApiGet({
    request: new Request("https://apps.vib.tools/api/apps", {
      headers: { Host: "apps.vib.tools" }
    }),
    env: {},
    waitUntil: () => {}
  });
  assert.equal(prodRes.status, 200);
  assert.equal(prodRes.headers.get("X-Catalog-Source"), "live");
  assert.equal(prodRes.headers.get("Cache-Control"), "no-store");
  const prodBody = await prodRes.json();
  assert.deepEqual(prodBody.apps, []);

  const disabledLocalRes = await appsApiGet({
    request: new Request("http://localhost:3000/api/apps"),
    env: { ENABLE_MOCK_FALLBACK: "false" },
    waitUntil: () => {}
  });
  assert.equal(disabledLocalRes.status, 200);
  assert.equal(disabledLocalRes.headers.get("X-Catalog-Source"), "live");
  const disabledBody = await disabledLocalRes.json();
  assert.deepEqual(disabledBody.apps, []);

  const localMockRes = await appsApiGet({
    request: new Request("http://localhost:3000/api/apps"),
    env: {},
    waitUntil: () => {}
  });
  assert.equal(localMockRes.status, 200);
  assert.equal(localMockRes.headers.get("X-Catalog-Source"), "mock");
  assert.equal(localMockRes.headers.get("Cache-Control"), "no-store");
  assert.equal(localMockRes.headers.get("X-Cache-Status"), "BYPASS");
});

test("BUG-02: Demo PowerShell script defines $APP_NAME, $APP_SLUG, $APP_VERSION, Invoke-WebRequest, and SHA256 verification", async () => {
  const req = new Request("http://localhost:3000/calgrid/1.0.3?mode=get");
  const res = await handleEdgeRequest(req);
  assert.equal(res.status, 200);
  const script = await res.text();
  assert.ok(script.includes('$APP_NAME = "CalGrid"'));
  assert.ok(script.includes('$APP_SLUG = "calgrid"'));
  assert.ok(script.includes('$APP_VERSION = "v1.0.3"'));
  assert.ok(script.includes("Invoke-WebRequest"));
  assert.ok(script.includes("Get-FileHash"));
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

  const resProtoCli = await handleEdgeRequest(new Request("http://localhost:3000/calgrid/toString?mode=get"));
  assert.equal(resProtoCli.status, 404);

  const resProtoDl = await handleEdgeRequest(new Request("http://localhost:3000/dl/calgrid/constructor?mode=get"));
  assert.equal(resProtoDl.status, 404);
});

test("BUG-06: Mode B (/api/apps?slug=calgrid) emits X-Cache-Status and X-Catalog-Source headers", async () => {
  const res = await handleEdgeRequest(new Request("http://localhost:3000/api/apps?slug=calgrid"));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("X-Cache-Status"), "BYPASS");
  assert.equal(res.headers.get("X-Catalog-Source"), "mock");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
});

test("BUG-07: SPA fallback emits single clean Content-Type: text/html; charset=utf-8 header", async () => {
  const res = await handleEdgeRequest(
    new Request("http://localhost:3000/app/calgrid", { headers: { Accept: "text/html" } })
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
});

test("BUG-08: Browser visiting get.vib.tools/<slug>/<version> redirects 302 to storefront while CLI & /dl/ remain intact", async () => {
  const resBrowser = await handleEdgeRequest(
    new Request("http://localhost:3000/calgrid/1.0.3?mode=get", {
      headers: { Accept: "text/html,application/xhtml+xml" }
    })
  );
  assert.equal(resBrowser.status, 302);
  assert.equal(resBrowser.headers.get("location"), "https://apps.vib.tools/app/calgrid");

  const resCli = await handleEdgeRequest(
    new Request("http://localhost:3000/calgrid/1.0.3?mode=get", {
      headers: { Accept: "*/*" }
    })
  );
  assert.equal(resCli.status, 200);
  assert.ok((await resCli.text()).includes('$APP_VERSION = "v1.0.3"'));
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

test("BUG-10: Dot-containing SPA routes return 200 HTML shell while real missing static assets return 404", async () => {
  for (const spaPath of ["/category/Node.js", "/category/.NET", "/app/my.app"]) {
    const res = await handleEdgeRequest(
      new Request(`http://localhost:3000${spaPath}`, { headers: { Accept: "text/html" } })
    );
    assert.equal(res.status, 200, `${spaPath} should serve SPA shell`);
    assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
  }

  for (const missingAsset of ["/missing-script.js", "/assets/nonexistent.png", "/styles.css"]) {
    const res = await handleEdgeRequest(new Request(`http://localhost:3000${missingAsset}`));
    assert.equal(res.status, 404, `${missingAsset} should return 404`);
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

test("BUG-17: Service worker uses vib-apps-hub-v3, precaches all existing manifest icons, and guards non-GET/non-HTTP fetches", () => {
  const swSource = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/manifest.json"), "utf8"));

  assert.ok(swSource.includes('const CACHE_NAME = "vib-apps-hub-v3"'));
  assert.ok(swSource.includes('if (event.request.method !== "GET") return;'));
  assert.ok(swSource.includes('if (!url.protocol.startsWith("http")) return;'));

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
