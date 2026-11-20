/**
 * Edge SEO, OpenGraph/Twitter & Schema.org JSON-LD Helper (functions/_lib/seo.js).
 *
 * Generates XSS-safe route-specific metadata and rewrites the static public/index.html
 * shell on Cloudflare Pages Functions so search engines, social share bots, and AI
 * crawlers receive accurate per-route <title>, <meta>, <link rel="canonical">, and
 * Schema.org structured data without any build step.
 */

const SITE_ORIGIN = "https://apps.vib.tools";
const GET_ORIGIN = "https://get.vib.tools";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/vib.tools.Branding/og-default.png`;
const DEFAULT_TITLE = "Vib Apps — Apps Catalog & Edge Installer";
const DEFAULT_DESCRIPTION =
  "Browse Vib Tools applications, install software with one-line PowerShell commands via get.vib.tools, and verify SHA256 direct binary downloads.";

/**
 * Escapes HTML special characters for safe interpolation inside HTML text or attributes.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Serializes a JSON-LD object safely for embedding inside a <script type="application/ld+json"> tag.
 * Escapes `<`, `>`, `&`, and Unicode line separators so untrusted repo strings can never break out.
 *
 * @param {Object} data
 * @returns {string}
 */
export function escapeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Validates that an image URL is a syntactically valid HTTPS URL safe for OG/Twitter cards.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function resolveSafeOgImage(value) {
  if (typeof value !== "string") return DEFAULT_OG_IMAGE;
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return DEFAULT_OG_IMAGE;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" && parsed.hostname) {
      return parsed.toString();
    }
  } catch (_) {}
  return DEFAULT_OG_IMAGE;
}

/**
 * Formats a version string with a clean leading 'v' when numeric-led (e.g. 1.0.3 -> v1.0.3).
 *
 * @param {string} ver
 * @returns {string}
 */
function formatVersionTag(ver) {
  if (!ver || typeof ver !== "string") return "";
  const trimmed = ver.trim();
  if (!trimmed) return "";
  return /^[vV]/.test(trimmed) ? trimmed : `v${trimmed}`;
}

/**
 * Builds the publisher Organization node reused across Schema.org JSON-LD blocks.
 *
 * @returns {Object}
 */
function buildPublisherNode() {
  return {
    "@type": "Organization",
    name: "Vib Tools",
    url: "https://vib.tools"
  };
}

/**
 * Builds a Schema.org BreadcrumbList node.
 *
 * @param {Array<{ name: string, item: string }>} items
 * @returns {Object}
 */
function buildBreadcrumbList(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item
    }))
  };
}

/**
 * Parses a storefront pathname into a structured route descriptor.
 * Returns `{ malformed: true }` if percent-decoding fails.
 *
 * @param {string} rawPathname
 * @returns {{ type: string, slug?: string, category?: string, pathname: string, malformed?: boolean }}
 */
export function parseStorefrontSeoRoute(rawPathname) {
  const pathStr = typeof rawPathname === "string" ? rawPathname : "/";
  const normalized = pathStr.replace(/\/+$/, "") || "/";

  // Catch malformed percent-encoding on any path (e.g. /%E0%A4%A) before routing
  try {
    decodeURIComponent(normalized);
  } catch (_) {
    return { type: "malformed", pathname: normalized, malformed: true };
  }

  if (normalized === "/" || normalized === "/index.html") {
    return { type: "home", pathname: "/" };
  }
  if (normalized === "/cli") {
    return { type: "cli", pathname: "/cli" };
  }
  if (normalized === "/schema" || normalized === "/vib-apps-engine") {
    return { type: "schema", pathname: "/schema" };
  }

  if (normalized.startsWith("/app/")) {
    const rawSlug = normalized.slice(5);
    if (!rawSlug || rawSlug.includes("/")) {
      return { type: "unknown", pathname: normalized };
    }
    try {
      const slug = decodeURIComponent(rawSlug).trim();
      if (!slug) return { type: "unknown", pathname: normalized };
      return { type: "app", slug, pathname: `/app/${encodeURIComponent(slug)}` };
    } catch (_) {
      return { type: "malformed", pathname: normalized, malformed: true };
    }
  }

  if (normalized.startsWith("/category/")) {
    const rawCategory = normalized.slice(10);
    if (!rawCategory || rawCategory.includes("/")) {
      return { type: "unknown", pathname: normalized };
    }
    try {
      const category = decodeURIComponent(rawCategory).trim();
      if (!category) return { type: "unknown", pathname: normalized };
      return {
        type: "category",
        category,
        pathname: `/category/${encodeURIComponent(category.toLowerCase())}`
      };
    } catch (_) {
      return { type: "malformed", pathname: normalized, malformed: true };
    }
  }

  return { type: "unknown", pathname: normalized };
}

/**
 * Builds route-specific SEO metadata, OpenGraph/Twitter tags, and Schema.org JSON-LD.
 *
 * @param {string} rawPathname
 * @param {Object} [options]
 * @param {Object|null} [options.resolvedApp] - Resolved `{ entry, config }` from resolveAppBySlug()
 * @returns {Object}
 */
export function buildRouteSeoMetadata(rawPathname, { resolvedApp = null } = {}) {
  const route = parseStorefrontSeoRoute(rawPathname);

  // 1. Home (/)
  if (route.type === "home") {
    return {
      routeType: "home",
      httpStatus: 200,
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonical: `${SITE_ORIGIN}/`,
      robots: "index, follow",
      ogType: "website",
      image: DEFAULT_OG_IMAGE,
      imageAlt: "Vib Apps — Apps Catalog and Edge Installer",
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            name: "Vib Apps",
            url: `${SITE_ORIGIN}/`,
            description: DEFAULT_DESCRIPTION,
            publisher: buildPublisherNode(),
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_ORIGIN}/?q={search_term_string}`,
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@type": "WebApplication",
            name: "Vib Apps",
            url: `${SITE_ORIGIN}/`,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Windows, macOS, Linux",
            description:
              "Central software catalog, frozen .vibtools schema engine, PowerShell CLI installer router, and verified direct binary download hub for Vib Tools applications.",
            publisher: buildPublisherNode(),
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD"
            }
          }
        ]
      }
    };
  }

  // 2. CLI Guide (/cli)
  if (route.type === "cli") {
    const title = "CLI Installer Guide — Vib Apps";
    const description =
      "Install Vib Tools applications with one PowerShell command via get.vib.tools, pin release versions, and use verified direct binary downloads.";
    const canonical = `${SITE_ORIGIN}/cli`;
    return {
      routeType: "cli",
      httpStatus: 200,
      title,
      description,
      canonical,
      robots: "index, follow",
      ogType: "article",
      image: DEFAULT_OG_IMAGE,
      imageAlt: "get.vib.tools PowerShell CLI Installer Guide",
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "TechArticle",
            headline: "get.vib.tools PowerShell CLI Installer Guide",
            description,
            url: canonical,
            publisher: buildPublisherNode()
          },
          buildBreadcrumbList([
            { name: "All Apps", item: `${SITE_ORIGIN}/` },
            { name: "CLI Installer", item: canonical }
          ])
        ]
      }
    };
  }

  // 3. Schema & AI Docs (/schema and /vib-apps-engine alias)
  if (route.type === "schema") {
    const title = "Vib Apps Engine — Frozen Schema (v1) & AI Docs — Vib Apps";
    const description =
      "Official frozen .vibtools/apps/app.config.json schema (v1), complete A–Z setup guide, and machine-readable AI agent instructions for Vib Apps Engine.";
    const canonical = `${SITE_ORIGIN}/schema`;
    return {
      routeType: "schema",
      httpStatus: 200,
      title,
      description,
      canonical,
      robots: "index, follow",
      ogType: "article",
      image: DEFAULT_OG_IMAGE,
      imageAlt: "Vib Apps Engine Frozen Schema v1 and AI Documentation",
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "TechArticle",
            headline: "Vib Apps Engine — Frozen Schema (v1) & AI Docs",
            description,
            url: canonical,
            publisher: buildPublisherNode()
          },
          buildBreadcrumbList([
            { name: "All Apps", item: `${SITE_ORIGIN}/` },
            { name: "Schema & AI Docs", item: canonical }
          ])
        ]
      }
    };
  }

  // 4. Category (/category/:name)
  if (route.type === "category" && route.category) {
    const displayCategory =
      route.category.charAt(0).toUpperCase() + route.category.slice(1);
    const title = `${displayCategory} Applications — Vib Apps`;
    const description = `Browse ${displayCategory} desktop applications and developer utilities distributed through Vib Apps and get.vib.tools.`;
    const canonical = `${SITE_ORIGIN}${route.pathname}`;
    return {
      routeType: "category",
      httpStatus: 200,
      category: displayCategory,
      title,
      description,
      canonical,
      robots: "index, follow",
      ogType: "website",
      image: DEFAULT_OG_IMAGE,
      imageAlt: `${displayCategory} Applications on Vib Apps`,
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            name: `${displayCategory} Applications`,
            description,
            url: canonical,
            isPartOf: { "@type": "WebSite", name: "Vib Apps", url: `${SITE_ORIGIN}/` }
          },
          buildBreadcrumbList([
            { name: "All Apps", item: `${SITE_ORIGIN}/` },
            { name: displayCategory, item: canonical }
          ])
        ]
      }
    };
  }

  // 5. Single App Detail (/app/:slug)
  if (route.type === "app" && route.slug) {
    const config = resolvedApp?.config || null;
    if (config) {
      const appSlug = config.slug || route.slug;
      const appName = config.name || appSlug;
      const latestTag = formatVersionTag(config.latest);
      const title = latestTag ? `${appName} (${latestTag}) — Vib Apps` : `${appName} — Vib Apps`;
      const description =
        config.tagline ||
        `Install ${appName} via get.vib.tools PowerShell CLI or direct SHA256-verified binary download on Vib Apps.`;
      const canonical = `${SITE_ORIGIN}/app/${encodeURIComponent(appSlug)}`;
      const image = resolveSafeOgImage(config.icon);
      const latestVerObj = config.latest ? config.versions?.[config.latest] : null;
      const operatingSystem =
        Array.isArray(config.platforms) && config.platforms.length > 0
          ? config.platforms.join(", ")
          : "Windows";
      const isFree = !config.access || String(config.access).toLowerCase() === "free";

      const softwareNode = {
        "@type": "SoftwareApplication",
        name: appName,
        url: canonical,
        description,
        applicationCategory: config.category || "DeveloperApplication",
        operatingSystem,
        image,
        downloadUrl: `${GET_ORIGIN}/dl/${encodeURIComponent(appSlug)}`,
        publisher: buildPublisherNode()
      };
      if (latestTag) {
        softwareNode.softwareVersion = latestTag;
      }
      if (latestVerObj?.released_at) {
        softwareNode.dateModified = latestVerObj.released_at;
      }
      if (latestVerObj?.size) {
        softwareNode.fileSize = latestVerObj.size;
      }
      if (isFree) {
        softwareNode.offers = {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD"
        };
      }

      const crumbs = [{ name: "All Apps", item: `${SITE_ORIGIN}/` }];
      if (config.category) {
        crumbs.push({
          name: config.category,
          item: `${SITE_ORIGIN}/category/${encodeURIComponent(config.category.toLowerCase())}`
        });
      }
      crumbs.push({ name: appName, item: canonical });

      return {
        routeType: "app",
        httpStatus: 200,
        appSlug,
        appName,
        latestTag,
        category: config.category || "",
        access: config.access || "Free",
        operatingSystem,
        releasedAt: latestVerObj?.released_at || "",
        fileSize: latestVerObj?.size || "",
        sha256: latestVerObj?.sha256 || "",
        title,
        description,
        canonical,
        robots: "index, follow",
        ogType: "website",
        image,
        imageAlt: `${appName} — Vib Apps`,
        jsonLd: {
          "@context": "https://schema.org",
          "@graph": [softwareNode, buildBreadcrumbList(crumbs)]
        }
      };
    }

    // Unregistered or invalid app slug -> strict HTTP 404 + noindex, nofollow
    const canonical = `${SITE_ORIGIN}/app/${encodeURIComponent(route.slug)}`;
    return {
      routeType: "app-not-found",
      httpStatus: 404,
      appSlug: route.slug,
      title: `Application Not Found — Vib Apps`,
      description: `The requested application '${route.slug}' is not currently published in the Vib Apps catalog.`,
      canonical,
      robots: "noindex, nofollow",
      ogType: "website",
      image: DEFAULT_OG_IMAGE,
      imageAlt: "Vib Apps — Application Not Found",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Application Not Found",
        url: canonical
      }
    };
  }

  // 6. Unknown path -> strict HTTP 404 + noindex, nofollow
  const canonical = `${SITE_ORIGIN}${route.pathname}`;
  return {
    routeType: "unknown",
    httpStatus: 404,
    title: "Page Not Found — Vib Apps",
    description: "The requested page could not be found on Vib Apps.",
    canonical,
    robots: "noindex, nofollow",
    ogType: "website",
    image: DEFAULT_OG_IMAGE,
    imageAlt: "Vib Apps — Page Not Found",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Page Not Found",
      url: canonical
    }
  };
}

/**
 * Safely replaces a regex match using a callback replacer so `$` tokens inside
 * dynamic app descriptions or titles never trigger JS String.replace backreferences.
 *
 * @param {string} html
 * @param {RegExp} pattern
 * @param {string} replacement
 * @returns {string}
 */
function safeReplace(html, pattern, replacement) {
  return html.replace(pattern, () => replacement);
}

/**
 * Builds clean, XSS-safe semantic <noscript> HTML for non-JS AI crawlers and search bots.
 * Ignored completely by JavaScript-enabled browsers (zero visual/UI impact).
 *
 * @param {Object} meta - Output of buildRouteSeoMetadata()
 * @returns {string}
 */
export function buildNoscriptHtml(meta) {
  if (!meta || typeof meta !== "object") return "";

  const navLinks = [
    `<a href="/">All Applications</a>`,
    `<a href="/cli">CLI Installer Guide</a>`,
    `<a href="/schema">Schema &amp; AI Docs</a>`,
    `<a href="/llms.txt">llms.txt</a>`,
    `<a href="/api/apps">Catalog JSON API</a>`
  ].join(" | ");

  if (meta.routeType === "home") {
    return [
      "<noscript><main>",
      "<h1>Vib Apps — Apps Catalog &amp; Edge Installer</h1>",
      `<p>${escapeHtml(meta.description)}</p>`,
      `<p>Install via PowerShell: <code>irm &quot;${GET_ORIGIN}/&lt;slug&gt;&quot; | iex</code></p>`,
      `<nav aria-label="Vib Apps Navigation">${navLinks}</nav>`,
      "</main></noscript>"
    ].join("");
  }

  if (meta.routeType === "cli") {
    return [
      "<noscript><main>",
      "<h1>get.vib.tools PowerShell CLI Installer Guide</h1>",
      `<p>${escapeHtml(meta.description)}</p>`,
      `<pre>irm &quot;${GET_ORIGIN}/&lt;slug&gt;&quot; | iex\nirm &quot;${GET_ORIGIN}/&lt;slug&gt;/&lt;version&gt;&quot; | iex</pre>`,
      `<p>Direct SHA256-verified binary download: <code>${GET_ORIGIN}/dl/&lt;slug&gt;</code></p>`,
      `<nav aria-label="Vib Apps Navigation">${navLinks}</nav>`,
      "</main></noscript>"
    ].join("");
  }

  if (meta.routeType === "schema") {
    return [
      "<noscript><main>",
      "<h1>Vib Apps Engine — Frozen Schema (v1) &amp; AI Docs</h1>",
      `<p>${escapeHtml(meta.description)}</p>`,
      "<ul>",
      `<li><a href="/llms-full.txt">Single-URL AI Master Bundle (llms-full.txt)</a></li>`,
      `<li><a href="/schemas/vibtools-app.schema.json">Frozen JSON Schema (v1)</a></li>`,
      `<li><a href="/vib-apps-engine/vibtools-app-config.md">Complete A-Z Setup Guide</a></li>`,
      `<li><a href="/vib-apps-engine/ai-guide.md">AI Agent Execution Playbook</a></li>`,
      `<li><a href="/vib-apps-engine/llms.txt">Compact Engine Spec</a></li>`,
      "</ul>",
      `<nav aria-label="Vib Apps Navigation">${navLinks}</nav>`,
      "</main></noscript>"
    ].join("");
  }

  if (meta.routeType === "category") {
    const safeCat = escapeHtml(meta.category || "Category");
    return [
      "<noscript><main>",
      `<h1>${safeCat} Applications — Vib Apps</h1>`,
      `<p>${escapeHtml(meta.description)}</p>`,
      `<nav aria-label="Vib Apps Navigation">${navLinks}</nav>`,
      "</main></noscript>"
    ].join("");
  }

  if (meta.routeType === "app") {
    const safeName = escapeHtml(meta.appName || meta.appSlug || "Application");
    const safeSlug = escapeHtml(meta.appSlug || "");
    const encodedSlug = encodeURIComponent(meta.appSlug || "");
    const safeVer = meta.latestTag ? ` (${escapeHtml(meta.latestTag)})` : "";
    const metaParts = [];
    if (meta.category) metaParts.push(`Category: ${escapeHtml(meta.category)}`);
    if (meta.access) metaParts.push(`License: ${escapeHtml(meta.access)}`);
    if (meta.operatingSystem) metaParts.push(`Platforms: ${escapeHtml(meta.operatingSystem)}`);
    if (meta.fileSize) metaParts.push(`Size: ${escapeHtml(meta.fileSize)}`);
    if (meta.releasedAt) metaParts.push(`Released: ${escapeHtml(meta.releasedAt)}`);

    const detailsLine = metaParts.length > 0 ? `<p>${metaParts.join(" · ")}</p>` : "";
    const shaLine = meta.sha256 ? `<p>SHA256: <code>${escapeHtml(meta.sha256)}</code></p>` : "";
    const catLink = meta.category
      ? ` | <a href="/category/${encodeURIComponent(meta.category.toLowerCase())}">${escapeHtml(meta.category)}</a>`
      : "";

    return [
      "<noscript><main>",
      `<h1>${safeName}${safeVer}</h1>`,
      `<p>${escapeHtml(meta.description)}</p>`,
      detailsLine,
      `<p>PowerShell Install: <code>irm &quot;${GET_ORIGIN}/${safeSlug}&quot; | iex</code></p>`,
      `<p>Direct Download: <a href="${GET_ORIGIN}/dl/${encodedSlug}">${GET_ORIGIN}/dl/${safeSlug}</a></p>`,
      shaLine,
      `<nav aria-label="Vib Apps Navigation"><a href="/">All Applications</a>${catLink} | <a href="/cli">CLI Installer Guide</a></nav>`,
      "</main></noscript>"
    ].join("");
  }

  // 404 (app-not-found or unknown)
  const heading = meta.routeType === "app-not-found" ? "404 — Application Not Found" : "404 — Page Not Found";
  return [
    "<noscript><main>",
    `<h1>${heading}</h1>`,
    `<p>${escapeHtml(meta.description)}</p>`,
    `<nav aria-label="Vib Apps Navigation"><a href="/">Browse All Applications</a> | <a href="/cli">CLI Installer Guide</a></nav>`,
    "</main></noscript>"
  ].join("");
}

/**
 * Rewrites <head> SEO tags, Schema.org JSON-LD, and <noscript> crawler fallback inside public/index.html.
 *
 * @param {string} html
 * @param {Object} meta - Output of buildRouteSeoMetadata()
 * @returns {string}
 */
export function injectSeoIntoHtml(html, meta) {
  if (typeof html !== "string" || !meta) return html;

  const safeTitle = escapeHtml(meta.title || DEFAULT_TITLE);
  const safeDesc = escapeHtml(meta.description || DEFAULT_DESCRIPTION);
  const safeCanonical = escapeHtml(meta.canonical || `${SITE_ORIGIN}/`);
  const safeRobots = escapeHtml(meta.robots || "index, follow");
  const safeOgType = escapeHtml(meta.ogType || "website");
  const safeImage = escapeHtml(meta.image || DEFAULT_OG_IMAGE);
  const safeImageAlt = escapeHtml(meta.imageAlt || "Vib Apps");
  const safeJsonLd = escapeJsonLd(meta.jsonLd || {});
  const noscriptBlock = buildNoscriptHtml(meta);

  let out = html;
  out = safeReplace(out, /<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  out = safeReplace(
    out,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${safeDesc}">`
  );
  out = safeReplace(
    out,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${safeRobots}">`
  );
  out = safeReplace(
    out,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${safeCanonical}">`
  );
  out = safeReplace(
    out,
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${safeOgType}">`
  );
  out = safeReplace(
    out,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${safeCanonical}">`
  );
  out = safeReplace(
    out,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${safeTitle}">`
  );
  out = safeReplace(
    out,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${safeDesc}">`
  );
  out = safeReplace(
    out,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${safeImage}">`
  );
  // Strip fixed 1200x630 banner dimensions when an app provides a custom icon (usually square)
  if ((meta.image || DEFAULT_OG_IMAGE) !== DEFAULT_OG_IMAGE) {
    out = out.replace(/^[ \t]*<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>[ \t]*\r?\n?/im, "");
    out = out.replace(/^[ \t]*<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>[ \t]*\r?\n?/im, "");
  }
  out = safeReplace(
    out,
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:alt" content="${safeImageAlt}">`
  );
  out = safeReplace(
    out,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${safeTitle}">`
  );
  out = safeReplace(
    out,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${safeDesc}">`
  );
  out = safeReplace(
    out,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${safeImage}">`
  );
  out = safeReplace(
    out,
    /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json">${safeJsonLd}</script>`
  );

  if (noscriptBlock) {
    if (/<noscript>[\s\S]*?<\/noscript>/i.test(out)) {
      out = safeReplace(out, /<noscript>[\s\S]*?<\/noscript>/i, noscriptBlock);
    } else {
      out = safeReplace(out, /<div\s+id="app"><\/div>/i, `<div id="app"></div>\n  ${noscriptBlock}`);
    }
  }

  return out;
}
