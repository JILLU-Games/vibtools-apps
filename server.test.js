import test from "node:test";
import assert from "node:assert/strict";
import { handleEdgeRequest } from "./server.js";
import { isValidSlug, getRegistry } from "./functions/_lib/github.js";
import { getMockApps, findMockApp } from "./functions/_lib/mockData.js";

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
