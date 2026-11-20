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

const AI_PROMPTS = {
  setup: {
    label: "First-Time Setup",
    toastLabel: "Copied AI setup prompt",
    text: [
      "MANDATORY PRE-FLIGHT (FAIL-CLOSED):",
      "Fetch and read BOTH Vib Apps Engine Frozen v1 specs first (use web fetch or run `curl -sS` in terminal):",
      "- Single-URL Master Bundle: https://apps.vib.tools/llms-full.txt",
      "- Frozen JSON Schema: https://apps.vib.tools/schemas/vibtools-app.schema.json",
      "If you cannot fetch these URLs, STOP immediately and ask me to paste them — NEVER guess or invent schema fields.",
      "",
      "Audit this repository and configure it for apps.vib.tools and get.vib.tools by:",
      "1. Inspecting our real codebase (README, project/build files, `.vibtools/logo.*`, release assets/tags) so zero fake metadata or invented features are written.",
      "2. Creating `.vibtools/apps/app.config.json` strictly matching `schemaVersion: 1` (`additionalProperties: false`):",
      "   - ONLY allowed root keys: `$schema`, `schemaVersion`, `slug`, `name`, `tagline`, `category`, `access`, `icon`, `latest`, `installer`, `docs`, `platforms`, `architectures`, `requirements`, `screenshots`, `links`, `versions`.",
      "   - ONLY allowed `versions.<ver>` keys: `url`, `installer`, `size`, `sha256`, `released_at`, `channel`, `deprecated`.",
      "   - STRICTLY FORBIDDEN keys (cause HTTP 422): `description`, `license`, `artifacts`, `platforms` inside `versions.<ver>`, `releaseDate`, `downloadUrl`. Use `\"access\": \"Free\" | \"Paid\"`, `\"tagline\"`, root `\"platforms\"`/`\"architectures\"`, and flat `\"url\"` directly on each version entry.",
      "   - Enforce lowercase `slug`, exact `latest` key match inside `versions`, calendar-valid `YYYY-MM-DD` `released_at`, trusted HTTPS binary URLs, and 64-char hex `sha256` (omit `sha256` if not computed yet — never write placeholders like \"TBD\").",
      "   - Verify with `curl -sSI` (when network is available) that every `https://` URL (`versions.<ver>.url`, remote `installer`, `icon`, `links.*`) returns HTTP 200/302/308 — never point `installer` or `links` to a 404 URL (use `\".vibtools/apps/installer.ps1\"` for repo scripts).",
      "3. Creating `.vibtools/apps/installer.ps1` (saved as UTF-8 without BOM) using the edge-injected `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME` variables (add per-version `installer` override only if a specific version has a verified working separate script).",
      "4. Creating factual `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` matching the real app and every version key in `versions`.",
      "5. Running a programmatic key-whitelist & JSON validation check on `.vibtools/apps/app.config.json`, verifying all 12 items in the Self-Verification Checklist, and printing the exact GitHub repo URL to add to `registry.json`."
    ].join("\n")
  },
  audit: {
    label: "Audit & Fix",
    toastLabel: "Copied AI audit & fix prompt",
    text: [
      "MANDATORY PRE-FLIGHT (FAIL-CLOSED):",
      "Fetch and read BOTH Vib Apps Engine Frozen v1 specs first (use web fetch or run `curl -sS` in terminal):",
      "- Single-URL Master Bundle: https://apps.vib.tools/llms-full.txt",
      "- Frozen JSON Schema: https://apps.vib.tools/schemas/vibtools-app.schema.json",
      "If you cannot fetch these URLs, STOP immediately and ask me to paste them — NEVER guess or invent schema fields.",
      "",
      "Perform a strict forensic audit and fix of `.vibtools/apps/` in this repository:",
      "1. Validate `.vibtools/apps/app.config.json` strictly against Frozen v1 (`schemaVersion: 1`, `additionalProperties: false`):",
      "   - Reject and remove/migrate any unknown root keys (e.g. `description` -> `tagline`/`features.md`, `license` -> `access: \"Free\" | \"Paid\"`).",
      "   - Reject and flatten any invalid nested version structures (e.g. `versions.<ver>.artifacts[]` or `versions.<ver>.platforms` -> flat `url`, `size`, `sha256`, `released_at`, `installer`, `channel`, `deprecated` directly on `versions.<ver>`, with `platforms` and `architectures` at root).",
      "   - Verify lowercase `slug`, exact `latest` key match, calendar-valid `YYYY-MM-DD` `released_at`, valid 64-hex `sha256` (or omitted), valid HTTPS `icon` (use repo logo raw HTTPS URL or uploaded asset if available), and safe repo-relative `docs` paths.",
      "2. Live-probe every `https://` URL (`versions.<ver>.url`, root/per-version `installer`, `icon`, `links.*`) via `curl -sSI` when network is available; fix or remove any 404/broken URLs (never keep a 404 remote `installer` when `.vibtools/apps/installer.ps1` exists in the repo).",
      "3. Verify `.vibtools/apps/installer.ps1` (saved as UTF-8 without BOM) cleanly uses `$APP_SLUG`, `$APP_VERSION`, and `$APP_NAME`, handles optional leading `v` safely, and works with `get.vib.tools/<slug>[/<version>]`.",
      "4. Verify `.vibtools/apps/features.md` and `.vibtools/apps/changelog.md` match the real app and every version listed in `versions` with consistent SHA256/requirements.",
      "5. Run a programmatic JSON & Frozen v1 key-whitelist check, fix every HTTP 422/403/404 risk, and report a pass/fail summary against all 12 checklist items."
    ].join("\n")
  }
};

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

  // 4. Ready-to-Paste AI Prompt Card (Setup + Audit/Fix)
  const promptCard = document.createElement("section");
  promptCard.className = "app-schema__panel";

  let activePromptKey = "setup";

  const promptHead = document.createElement("div");
  promptHead.className = "app-cli-guide__card-head";

  const promptTitle = document.createElement("h2");
  promptTitle.className = "app-cli-guide__title";
  promptTitle.textContent = "Ready-to-Paste AI Agent Prompts";
  promptHead.appendChild(promptTitle);

  const promptActions = document.createElement("div");
  promptActions.className = "app-schema__btn-group";

  const promptSwitchGroup = document.createElement("div");
  promptSwitchGroup.className = "app-segmented";
  promptSwitchGroup.setAttribute("role", "group");
  promptSwitchGroup.setAttribute("aria-label", "Select AI prompt mode");

  const promptPre = document.createElement("pre");
  promptPre.className = "app-schema__prompt";
  promptPre.textContent = AI_PROMPTS[activePromptKey].text;

  const promptModeButtons = new Map();
  Object.entries(AI_PROMPTS).forEach(([key, entry]) => {
    const modeBtn = document.createElement("button");
    modeBtn.type = "button";
    modeBtn.className = `app-segmented__btn${key === activePromptKey ? " is-active" : ""}`;
    modeBtn.textContent = entry.label;
    modeBtn.setAttribute("aria-pressed", key === activePromptKey ? "true" : "false");
    modeBtn.addEventListener("click", () => {
      activePromptKey = key;
      promptPre.textContent = AI_PROMPTS[key].text;
      promptModeButtons.forEach((btn, k) => {
        const isCurrent = k === key;
        btn.classList.toggle("is-active", isCurrent);
        btn.setAttribute("aria-pressed", isCurrent ? "true" : "false");
      });
    });
    promptModeButtons.set(key, modeBtn);
    promptSwitchGroup.appendChild(modeBtn);
  });

  promptActions.appendChild(promptSwitchGroup);

  promptActions.appendChild(
    Button({
      label: "Copy AI Prompt",
      icon: "copy",
      variant: "primary",
      size: "sm",
      ariaLabel: "Copy active ready-to-paste AI prompt",
      onClick: async () => {
        const activeEntry = AI_PROMPTS[activePromptKey];
        const ok = await copyToClipboard(activeEntry.text);
        if (ok) {
          toast.success(activeEntry.toastLabel);
        } else {
          toast.error("Failed to copy prompt");
        }
      }
    })
  );
  promptHead.appendChild(promptActions);
  promptCard.appendChild(promptHead);
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
