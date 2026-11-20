import { Button, Badge, Icon, toast } from "../ui/index.js";
import { navigate } from "../../lib/router.js";
import { copyToClipboard } from "../../lib/clipboard.js";

const CANONICAL_ORIGIN = "https://apps.vib.tools";

const SHAREABLE_RESOURCES = [
  {
    id: "llms-full",
    title: "Single-URL AI Master Bundle",
    badge: "Best for AI",
    badgeVariant: "accent",
    path: "/llms-full.txt",
    purpose: "Complete frozen v1 spec, step matrix, templates & 12-point checklist in one file."
  },
  {
    id: "schema-json",
    title: "Frozen JSON Schema (v1)",
    badge: "Draft 2020-12",
    badgeVariant: "neutral",
    path: "/schemas/vibtools-app.schema.json",
    purpose: "IDE autocomplete and strict schemaVersion: 1 contract (additionalProperties: false)."
  },
  {
    id: "az-guide",
    title: "Complete A–Z Setup Guide",
    badge: "Basic → Advanced",
    badgeVariant: "neutral",
    path: "/vib-apps-engine/vibtools-app-config.md",
    purpose: "Step-by-step Levels 1–3, field reference, PowerShell template & troubleshooting."
  },
  {
    id: "ai-guide",
    title: "AI Agent Execution Playbook",
    badge: "AI Protocol",
    badgeVariant: "neutral",
    path: "/vib-apps-engine/ai-guide.md",
    purpose: "Deterministic MUST / MUST NOT execution steps and copy-paste onboarding prompt."
  },
  {
    id: "compact-spec",
    title: "Compact Engine Spec",
    badge: "Low-Token",
    badgeVariant: "neutral",
    path: "/vib-apps-engine/llms.txt",
    purpose: "Token-efficient specification for fast context injection inside AI coding tools."
  },
  {
    id: "root-llms",
    title: "Root AI Discovery Index",
    badge: "llms.txt",
    badgeVariant: "neutral",
    path: "/llms.txt",
    purpose: "Top-level directory of all machine-readable specs and live platform endpoints."
  }
];

const AI_READY_PROMPT = [
  "Read https://apps.vib.tools/llms-full.txt and https://apps.vib.tools/schemas/vibtools-app.schema.json completely.",
  "Inspect this repository and create a strictly valid Vib Apps Engine v1 setup inside `.vibtools/apps/`:",
  "1. `.vibtools/apps/app.config.json` (schemaVersion: 1, zero unknown keys, lowercase slug, exact `latest` key match, calendar-valid `released_at` YYYY-MM-DD, valid trusted HTTPS binary URLs, and per-version `installer` overrides only if needed).",
  "2. `.vibtools/apps/installer.ps1` using injected `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` dynamically.",
  "3. `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` with clean Markdown and zero unsafe raw HTML.",
  "Verify all 12 items of the Self-Verification Checklist and output the exact GitHub repo URL to paste into `registry.json` in `vib-apps-hub`."
].join("\n");

const DOC_TABS = [
  { id: "guide", label: "A–Z Setup Guide", path: "/vib-apps-engine/vibtools-app-config.md", format: "markdown" },
  { id: "ai-playbook", label: "AI Playbook", path: "/vib-apps-engine/ai-guide.md", format: "markdown" },
  { id: "llms-full", label: "llms-full.txt", path: "/llms-full.txt", format: "markdown" },
  { id: "schema", label: "Frozen JSON Schema", path: "/schemas/vibtools-app.schema.json", format: "json" }
];

/**
 * Safely renders Markdown via Marked.js + DOMPurify with plain-text fallback.
 *
 * @param {string} rawMd
 * @param {HTMLElement} targetEl
 */
function renderSafeMarkdown(rawMd, targetEl) {
  targetEl.innerHTML = "";
  if (
    typeof window !== "undefined" &&
    window.marked &&
    typeof window.marked.parse === "function" &&
    window.DOMPurify &&
    typeof window.DOMPurify.sanitize === "function"
  ) {
    const html = window.marked.parse(rawMd);
    targetEl.innerHTML = window.DOMPurify.sanitize(html);
  } else {
    const pre = document.createElement("pre");
    pre.className = "app-schema__pre";
    pre.textContent = rawMd;
    targetEl.appendChild(pre);
  }
}

/**
 * Frozen Schema v1 & AI-Readable Setup Docs Section (/schema).
 *
 * @returns {HTMLElement}
 */
export function SchemaGuideSection() {
  const container = document.createElement("div");
  container.className = "app-schema-guide";

  const controller = new AbortController();
  const contentCache = new Map();

  // 1. Breadcrumb
  const breadcrumb = document.createElement("nav");
  breadcrumb.className = "app-detail__breadcrumb";
  breadcrumb.setAttribute("aria-label", "Breadcrumb");

  const homeLink = document.createElement("a");
  homeLink.href = "/";
  homeLink.className = "app-detail__crumb-link";
  homeLink.appendChild(Icon("arrow-left", 14));
  const homeText = document.createElement("span");
  homeText.textContent = "All Apps";
  homeLink.appendChild(homeText);
  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/");
  });
  breadcrumb.appendChild(homeLink);
  breadcrumb.appendChild(Icon("chevron-right", 13));

  const current = document.createElement("span");
  current.className = "app-detail__crumb-current";
  current.textContent = "Schema & AI Docs";
  current.setAttribute("aria-current", "page");
  breadcrumb.appendChild(current);
  container.appendChild(breadcrumb);

  // 2. Section Header
  const headerBar = document.createElement("div");
  headerBar.className = "app-catalog-header";

  const titleBox = document.createElement("div");
  titleBox.className = "app-catalog-header__text";

  const heading = document.createElement("h1");
  heading.className = "app-catalog-header__title";
  heading.textContent = "Vib Apps Engine — Frozen Schema & AI Docs";
  titleBox.appendChild(heading);

  const desc = document.createElement("p");
  desc.className = "app-catalog-header__subtitle";
  desc.textContent =
    "Share any URL below with an AI coding agent or read the A–Z guide to configure .vibtools/apps/ for zero-config GitHub auto-collection.";
  titleBox.appendChild(desc);
  headerBar.appendChild(titleBox);
  container.appendChild(headerBar);

  // 3. Shareable AI & Machine-Readable URLs Grid
  const urlCard = document.createElement("section");
  urlCard.className = "app-schema__panel";

  const urlPanelHead = document.createElement("div");
  urlPanelHead.className = "app-cli-guide__card-head";

  const urlPanelTitle = document.createElement("h2");
  urlPanelTitle.className = "app-cli-guide__title";
  urlPanelTitle.textContent = "Shareable AI & Schema URLs (CORS Enabled)";
  urlPanelHead.appendChild(urlPanelTitle);
  urlPanelHead.appendChild(Badge({ text: "schemaVersion: 1", variant: "accent" }));
  urlCard.appendChild(urlPanelHead);

  const urlGrid = document.createElement("div");
  urlGrid.className = "app-schema__url-grid";

  SHAREABLE_RESOURCES.forEach((item) => {
    const fullUrl = `${CANONICAL_ORIGIN}${item.path}`;

    const itemCard = document.createElement("div");
    itemCard.className = "app-schema__url-card";

    const topRow = document.createElement("div");
    topRow.className = "app-schema__url-head";

    const itemTitle = document.createElement("span");
    itemTitle.className = "app-schema__url-title";
    itemTitle.textContent = item.title;
    topRow.appendChild(itemTitle);
    topRow.appendChild(Badge({ text: item.badge, variant: item.badgeVariant }));
    itemCard.appendChild(topRow);

    const itemDesc = document.createElement("p");
    itemDesc.className = "app-schema__url-desc";
    itemDesc.textContent = item.purpose;
    itemCard.appendChild(itemDesc);

    const codeRow = document.createElement("div");
    codeRow.className = "app-schema__url-actions";

    const codeEl = document.createElement("code");
    codeEl.className = "app-schema__url-code";
    codeEl.textContent = fullUrl;
    codeRow.appendChild(codeEl);

    const btnGroup = document.createElement("div");
    btnGroup.className = "app-schema__btn-group";

    btnGroup.appendChild(
      Button({
        label: "Copy URL",
        icon: "copy",
        variant: "secondary",
        size: "sm",
        ariaLabel: `Copy URL for ${item.title}`,
        onClick: async () => {
          const ok = await copyToClipboard(fullUrl);
          if (ok) {
            toast.success(`Copied ${item.path}`);
          } else {
            toast.error("Failed to copy URL");
          }
        }
      })
    );

    const openLink = document.createElement("a");
    openLink.href = item.path;
    openLink.target = "_blank";
    openLink.rel = "noopener noreferrer";
    openLink.className = "ui-btn ui-btn--ghost ui-btn--sm";
    openLink.appendChild(Icon("external", 13));
    const openSpan = document.createElement("span");
    openSpan.textContent = "Raw";
    openLink.appendChild(openSpan);
    btnGroup.appendChild(openLink);

    codeRow.appendChild(btnGroup);
    itemCard.appendChild(codeRow);
    urlGrid.appendChild(itemCard);
  });

  urlCard.appendChild(urlGrid);
  container.appendChild(urlCard);

  // 4. Ready-to-Paste AI Prompt Card
  const promptCard = document.createElement("section");
  promptCard.className = "app-schema__panel";

  const promptHead = document.createElement("div");
  promptHead.className = "app-cli-guide__card-head";

  const promptTitle = document.createElement("h2");
  promptTitle.className = "app-cli-guide__title";
  promptTitle.textContent = "Ready-to-Paste AI Agent Prompt";
  promptHead.appendChild(promptTitle);

  promptHead.appendChild(
    Button({
      label: "Copy AI Prompt",
      icon: "copy",
      variant: "primary",
      size: "sm",
      ariaLabel: "Copy ready-to-paste AI prompt",
      onClick: async () => {
        const ok = await copyToClipboard(AI_READY_PROMPT);
        if (ok) {
          toast.success("Copied AI onboarding prompt");
        } else {
          toast.error("Failed to copy prompt");
        }
      }
    })
  );
  promptCard.appendChild(promptHead);

  const promptPre = document.createElement("pre");
  promptPre.className = "app-schema__prompt";
  promptPre.textContent = AI_READY_PROMPT;
  promptCard.appendChild(promptPre);
  container.appendChild(promptCard);

  // 5. Interactive Live Documentation Reader Tabs
  const docsCard = document.createElement("section");
  docsCard.className = "app-detail__docs-card";

  const tabBar = document.createElement("div");
  tabBar.className = "app-tabs app-schema__tabs";
  tabBar.setAttribute("role", "tablist");
  tabBar.setAttribute("aria-label", "Vib Apps Engine Documentation");

  const tabPanel = document.createElement("div");
  tabPanel.className = "app-tab-content";
  tabPanel.setAttribute("role", "tabpanel");

  const tabButtons = new Map();

  async function selectTab(tab) {
    tabButtons.forEach((btn, id) => {
      const isActive = id === tab.id;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    tabPanel.innerHTML = "";
    const loadingEl = document.createElement("p");
    loadingEl.className = "app-detail__tagline";
    loadingEl.textContent = `Loading ${tab.path}...`;
    tabPanel.appendChild(loadingEl);

    try {
      let text = contentCache.get(tab.path);
      if (text === undefined) {
        const res = await fetch(tab.path, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} loading ${tab.path}`);
        }
        text = await res.text();
        contentCache.set(tab.path, text);
      }

      if (!container.isConnected) return;

      tabPanel.innerHTML = "";

      const toolbar = document.createElement("div");
      toolbar.className = "app-schema__doc-toolbar";

      const pathTag = document.createElement("code");
      pathTag.className = "app-schema__doc-path";
      pathTag.textContent = `${CANONICAL_ORIGIN}${tab.path}`;
      toolbar.appendChild(pathTag);

      const actionGroup = document.createElement("div");
      actionGroup.className = "app-schema__btn-group";
      actionGroup.appendChild(
        Button({
          label: "Copy Raw",
          icon: "copy",
          variant: "secondary",
          size: "sm",
          onClick: async () => {
            const ok = await copyToClipboard(text);
            if (ok) {
              toast.success(`Copied raw ${tab.label}`);
            } else {
              toast.error("Failed to copy content");
            }
          }
        })
      );
      toolbar.appendChild(actionGroup);
      tabPanel.appendChild(toolbar);

      if (tab.format === "json") {
        const pre = document.createElement("pre");
        pre.className = "app-schema__pre";
        const code = document.createElement("code");
        code.textContent = text;
        pre.appendChild(code);
        tabPanel.appendChild(pre);
      } else {
        const mdBody = document.createElement("div");
        mdBody.className = "ui-markdown";
        renderSafeMarkdown(text, mdBody);
        tabPanel.appendChild(mdBody);
      }
    } catch (err) {
      if (err?.name === "AbortError" || !container.isConnected) return;
      tabPanel.innerHTML = "";
      const errEl = document.createElement("p");
      errEl.className = "app-detail__tagline";
      errEl.textContent = `Could not load ${tab.path}: ${err.message}`;
      tabPanel.appendChild(errEl);
    }
  }

  DOC_TABS.forEach((tab, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "app-tab-btn";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", idx === 0 ? "true" : "false");
    btn.textContent = tab.label;
    btn.addEventListener("click", () => selectTab(tab));
    tabButtons.set(tab.id, btn);
    tabBar.appendChild(btn);
  });

  docsCard.appendChild(tabBar);
  docsCard.appendChild(tabPanel);
  container.appendChild(docsCard);

  // Load initial tab once mounted
  queueMicrotask(() => {
    if (container.isConnected) {
      selectTab(DOC_TABS[0]);
    }
  });

  container.cleanup = () => {
    controller.abort();
  };

  return container;
}
