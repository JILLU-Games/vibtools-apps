import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  getAppMonogram,
  getPackageFormat,
  formatReleaseDate,
  formatVersionLabel,
  buildInstallCommand,
  buildDownloadUrl,
  filterApps,
  computeCategoryCounts,
  sortApps,
  getSupportedPlatforms,
  getSupportedArchitectures
} from "./appMeta.js";
import { parseRoute } from "./router.js";
import { fetchAppDetail } from "./api.js";

test("getAppMonogram derives clean 2-character fallbacks from CamelCase, multi-word, and single-word names", () => {
  assert.equal(getAppMonogram({ name: "CalGrid", slug: "calgrid" }), "CG");
  assert.equal(getAppMonogram({ name: "DevPrompt", slug: "devprompt" }), "DP");
  assert.equal(getAppMonogram({ name: "VibClip", slug: "vibclip" }), "VC");
  assert.equal(getAppMonogram({ name: "Edge Router", slug: "edge-router" }), "ER");
  assert.equal(getAppMonogram({ slug: "calgrid" }), "CA");
});

test("getPackageFormat derives real extension labels without fabricating unsupported formats", () => {
  assert.equal(getPackageFormat({ url: "https://dl.vib.tools/calgrid/1.0.3/calgrid-1.0.3.exe" }), "EXE");
  assert.equal(getPackageFormat({ url: "https://dl.vib.tools/devprompt/2.1.0/devprompt-2.1.0.zip" }), "ZIP");
  assert.equal(getPackageFormat({ url: "https://dl.vib.tools/app/release.tar.gz?sig=1" }), "TAR.GZ");
  assert.equal(getPackageFormat({ url: "https://dl.vib.tools/app/no-ext" }), null);
  assert.equal(getPackageFormat(null), null);
});

test("formatReleaseDate formats ISO YYYY-MM-DD dates deterministically and returns null on empty", () => {
  assert.equal(formatReleaseDate("2026-04-10"), "Apr 10, 2026");
  assert.equal(formatReleaseDate("2026-02-15"), "Feb 15, 2026");
  assert.equal(formatReleaseDate(""), null);
  assert.equal(formatReleaseDate(undefined), null);
});

test("formatVersionLabel, buildInstallCommand, and buildDownloadUrl preserve exact get.vib.tools contracts", () => {
  assert.equal(formatVersionLabel("1.0.3"), "v1.0.3");
  assert.equal(formatVersionLabel("v2.1.0"), "v2.1.0");
  assert.equal(
    buildInstallCommand("calgrid", "1.0.3", "1.0.3"),
    'irm "https://get.vib.tools/calgrid" | iex'
  );
  assert.equal(
    buildInstallCommand("calgrid", "1.0.2", "1.0.3"),
    'irm "https://get.vib.tools/calgrid/1.0.2" | iex'
  );
  assert.equal(
    buildDownloadUrl("calgrid", "1.0.3"),
    "https://get.vib.tools/dl/calgrid/1.0.3"
  );
});

test("filterApps and computeCategoryCounts filter accurately by category, access, and search query", () => {
  const sample = [
    { slug: "calgrid", name: "CalGrid", tagline: "Desktop calendar widget", category: "Utilities", access: "Free" },
    { slug: "devprompt", name: "DevPrompt", tagline: "Terminal prompt manager", category: "Developer Tools", access: "Free" },
    { slug: "vibclip", name: "VibClip", tagline: "Encrypted clipboard history", category: "Utilities", access: "Paid" }
  ];

  const { categories, counts, total } = computeCategoryCounts(sample);
  assert.deepEqual(categories, ["Developer Tools", "Utilities"]);
  assert.deepEqual(counts, { Utilities: 2, "Developer Tools": 1 });
  assert.equal(total, 3);

  assert.equal(filterApps(sample, { access: "paid" }).length, 1);
  assert.equal(filterApps(sample, { access: "paid" })[0].slug, "vibclip");
  assert.equal(filterApps(sample, { category: "utilities", access: "free" }).length, 1);
  assert.equal(filterApps(sample, { query: "prompt" }).length, 1);
  assert.equal(filterApps(sample, { query: "nonexistent" }).length, 0);
});

// --- Cycle 2 Frontend Regression Suite (BUG-12, BUG-14, BUG-15, BUG-16) ---

test("BUG-16: buildDownloadUrl routes localhost/127.0.0.1 to local ?mode=get and preserves production get.vib.tools default", () => {
  assert.equal(buildDownloadUrl("calgrid", "v1.0.3"), "https://get.vib.tools/dl/calgrid/v1.0.3");
  assert.equal(
    buildDownloadUrl("calgrid", "v1.0.3", {
      location: { hostname: "apps.vib.tools", origin: "https://apps.vib.tools" }
    }),
    "https://get.vib.tools/dl/calgrid/v1.0.3"
  );
  assert.equal(
    buildDownloadUrl("calgrid", "v1.0.3", {
      location: { hostname: "localhost", origin: "http://localhost:3000" }
    }),
    "http://localhost:3000/dl/calgrid/v1.0.3?mode=get"
  );
  assert.equal(
    buildDownloadUrl("calgrid", "v1.0.3", {
      location: { hostname: "127.0.0.1", origin: "http://127.0.0.1:3000" }
    }),
    "http://127.0.0.1:3000/dl/calgrid/v1.0.3?mode=get"
  );
});

test("BUG-12 & BUG-15: AppDetailView removes fake OS/Arch selects, renders read-only metadata rows, and wires AbortController", () => {
  const detailSrc = fs.readFileSync(
    path.join(process.cwd(), "public/components/sections/AppDetailView.js"),
    "utf8"
  );
  assert.equal(detailSrc.includes("app-platform-select"), false);
  assert.equal(detailSrc.includes("app-arch-select"), false);
  assert.ok(detailSrc.includes('createMetaRow("Platforms", "monitor")'));
  assert.ok(detailSrc.includes('createMetaRow("Architecture", "cpu")'));
  assert.ok(detailSrc.includes("new AbortController()"));
  assert.ok(detailSrc.includes("container.isConnected"));
});

test("BUG-14: parseRoute handles dot-containing categories safely and router compares full pathname+search", () => {
  assert.deepEqual(parseRoute("/"), { view: "home" });
  assert.deepEqual(parseRoute("/category/Node.js"), { view: "category", category: "Node.js" });
  assert.deepEqual(parseRoute("/app/my.app"), { view: "app", slug: "my.app" });
  assert.deepEqual(parseRoute("/cli"), { view: "cli" });
  assert.deepEqual(parseRoute("/category/%E0%A4%A"), { view: "category", category: "%E0%A4%A" });

  const routerSrc = fs.readFileSync(path.join(process.cwd(), "public/lib/router.js"), "utf8");
  assert.ok(routerSrc.includes("${window.location.pathname}${window.location.search}"));
});

test("BUG-15: fetchAppDetail passes through AbortError cleanly without wrapping", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_url, init) => {
      assert.ok(init?.signal, "AbortSignal must be forwarded to fetch");
      const abortErr = new Error("The operation was aborted.");
      abortErr.name = "AbortError";
      return Promise.reject(abortErr);
    };
    const controller = new AbortController();
    await assert.rejects(
      () => fetchAppDetail("calgrid", { signal: controller.signal }),
      (err) => err?.name === "AbortError"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sortApps sorts deterministically by name-asc, name-desc, and latest release date without mutating input", () => {
  const sample = [
    {
      slug: "vibclip",
      name: "VibClip",
      latest: "v1.2.0",
      versions: { "v1.2.0": { released_at: "2026-06-01" } }
    },
    {
      slug: "calgrid",
      name: "CalGrid",
      latest: "v1.0.3",
      versions: { "v1.0.3": { released_at: "2026-11-15" } }
    },
    {
      slug: "devprompt",
      name: "DevPrompt",
      latest: "v2.0.0",
      versions: { "v2.0.0": { released_at: "2026-09-20" } }
    }
  ];

  const asc = sortApps(sample, "name-asc");
  assert.deepEqual(
    asc.map((a) => a.slug),
    ["calgrid", "devprompt", "vibclip"]
  );

  const desc = sortApps(sample, "name-desc");
  assert.deepEqual(
    desc.map((a) => a.slug),
    ["vibclip", "devprompt", "calgrid"]
  );

  const recent = sortApps(sample, "recent");
  assert.deepEqual(
    recent.map((a) => a.slug),
    ["calgrid", "devprompt", "vibclip"]
  );

  // Original order must remain untouched
  assert.equal(sample[0].slug, "vibclip");
});

test("getSupportedPlatforms and getSupportedArchitectures extract trimmed real metadata only", () => {
  assert.deepEqual(getSupportedPlatforms({ platforms: [" Windows ", "", "Linux"] }), [
    "Windows",
    "Linux"
  ]);
  assert.deepEqual(getSupportedPlatforms({}), []);
  assert.deepEqual(getSupportedArchitectures({ architectures: [" x64 ", "arm64"] }), [
    "x64",
    "arm64"
  ]);
  assert.deepEqual(getSupportedArchitectures(null), []);
});

