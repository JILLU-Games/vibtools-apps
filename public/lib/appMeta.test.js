import test from "node:test";
import assert from "node:assert/strict";
import {
  getAppMonogram,
  getPackageFormat,
  formatReleaseDate,
  formatVersionLabel,
  buildInstallCommand,
  buildDownloadUrl,
  filterApps,
  computeCategoryCounts
} from "./appMeta.js";

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
