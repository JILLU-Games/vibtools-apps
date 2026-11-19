import { Button, Badge, Icon, toast } from "../ui/index.js";
import { fetchAppDetail } from "../../lib/api.js";
import { navigate } from "../../lib/router.js";

/**
 * App Detail View Section (/app/:slug).
 *
 * @param {Object} options
 * @param {string} options.slug - App slug from route
 * @returns {HTMLElement}
 */
export function AppDetailView({ slug } = {}) {
  const container = document.createElement("div");
  container.className = "app-detail-view";

  // Loading state
  const loadingEl = document.createElement("div");
  loadingEl.className = "app-grid__empty";
  loadingEl.textContent = "Loading application details...";
  container.appendChild(loadingEl);

  fetchAppDetail(slug)
    .then((data) => {
      container.innerHTML = "";
      renderDetail(container, data.app, data.docs || {});
    })
    .catch((err) => {
      container.innerHTML = "";
      renderError(container, err.message);
    });

  return container;
}

function renderError(container, errorMessage) {
  const errorBox = document.createElement("div");
  errorBox.className = "app-grid__empty";

  const msg = document.createElement("p");
  msg.textContent = errorMessage || "Application not found.";
  errorBox.appendChild(msg);

  const backBtn = Button({
    label: "Back to All Apps",
    icon: "arrow-left",
    variant: "primary",
    size: "sm",
    onClick: () => navigate("/")
  });
  errorBox.appendChild(backBtn);

  container.appendChild(errorBox);
  toast.error(errorMessage || "Failed to load application");
}

function renderDetail(container, app, docs) {
  // Top Navigation Row
  const topNav = document.createElement("div");
  topNav.className = "app-detail__top";

  const backBtn = Button({
    label: "All Apps",
    icon: "arrow-left",
    variant: "ghost",
    size: "sm",
    onClick: () => navigate("/")
  });
  topNav.appendChild(backBtn);

  const badgesGroup = document.createElement("div");
  badgesGroup.className = "app-card__title-group";

  if (app.category) {
    const catBadge = Badge({
      text: app.category,
      variant: "neutral"
    });
    badgesGroup.appendChild(catBadge);
  }

  if (app.access) {
    const isFree = app.access.toLowerCase() === "free";
    const accessBadge = Badge({
      text: app.access,
      variant: isFree ? "success" : "warn"
    });
    badgesGroup.appendChild(accessBadge);
  }

  topNav.appendChild(badgesGroup);
  container.appendChild(topNav);

  // App Title, Icon & Tagline
  const titleBox = document.createElement("div");
  titleBox.className = "app-detail__title-box";

  const headerRow = document.createElement("div");
  headerRow.className = "app-detail__header-row";

  const iconWrap = document.createElement("div");
  iconWrap.className = "app-detail__icon";
  if (app.icon) {
    const img = document.createElement("img");
    img.src = app.icon;
    img.alt = `${app.name || app.slug} icon`;
    img.loading = "lazy";
    img.onerror = () => {
      iconWrap.innerHTML = "";
      iconWrap.appendChild(Icon("layers", 28));
    };
    iconWrap.appendChild(img);
  } else {
    iconWrap.appendChild(Icon("layers", 28));
  }
  headerRow.appendChild(iconWrap);

  const titleGroup = document.createElement("div");
  titleGroup.className = "app-detail__title-group";

  const nameEl = document.createElement("h1");
  nameEl.className = "app-detail__name";
  nameEl.textContent = app.name || app.slug;
  titleGroup.appendChild(nameEl);

  if (app.tagline) {
    const taglineEl = document.createElement("p");
    taglineEl.className = "app-detail__tagline";
    taglineEl.textContent = app.tagline;
    titleGroup.appendChild(taglineEl);
  }

  headerRow.appendChild(titleGroup);
  titleBox.appendChild(headerRow);
  container.appendChild(titleBox);

  // Versions logic
  const versionsObj = app.versions || {};
  const versionKeys = Object.keys(versionsObj);
  let selectedVersion = app.latest || (versionKeys.length > 0 ? versionKeys[0] : "latest");

  // Install Card
  const installCard = document.createElement("div");
  installCard.className = "app-detail__install-card";

  // Version Selector Row
  const verRow = document.createElement("div");
  verRow.className = "app-detail__version-row";

  const selectWrap = document.createElement("div");
  selectWrap.className = "app-detail__select-wrap";

  const selectLabel = document.createElement("label");
  selectLabel.className = "app-sidebar__title";
  selectLabel.textContent = "Version";
  selectWrap.appendChild(selectLabel);

  const versionSelect = document.createElement("select");
  versionSelect.className = "app-detail__select";

  versionKeys.forEach((ver) => {
    const opt = document.createElement("option");
    opt.value = ver;
    opt.textContent = ver === app.latest ? `${ver} (latest)` : ver;
    if (ver === selectedVersion) {
      opt.selected = true;
    }
    versionSelect.appendChild(opt);
  });

  selectWrap.appendChild(versionSelect);
  verRow.appendChild(selectWrap);

  // Direct Download Button
  const dlBtn = Button({
    label: "Download Binary",
    icon: "download",
    variant: "secondary",
    size: "md",
    onClick: () => {
      const dlUrl = `https://get.vib.tools/dl/${app.slug}/${selectedVersion}`;
      window.open(dlUrl, "_blank");
    }
  });
  verRow.appendChild(dlBtn);
  installCard.appendChild(verRow);

  // PowerShell Code Box
  const codeBox = document.createElement("div");
  codeBox.className = "ui-code-box";

  const codeText = document.createElement("div");
  codeText.className = "ui-code-box__text";

  function getInstallCommand(ver) {
    return ver === app.latest
      ? `irm "https://get.vib.tools/${app.slug}" | iex`
      : `irm "https://get.vib.tools/${app.slug}/${ver}" | iex`;
  }

  codeText.textContent = getInstallCommand(selectedVersion);
  codeBox.appendChild(codeText);

  const copyCodeBtn = Button({
    label: "Copy",
    icon: "copy",
    variant: "primary",
    size: "sm",
    onClick: async () => {
      const cmd = getInstallCommand(selectedVersion);
      try {
        await navigator.clipboard.writeText(cmd);
        toast.success(`Copied: ${cmd}`);
      } catch (_) {
        toast.error("Failed to copy command");
      }
    }
  });
  codeBox.appendChild(copyCodeBtn);
  installCard.appendChild(codeBox);

  // Metadata Strip (Size + SHA256)
  const metaStrip = document.createElement("div");
  metaStrip.className = "app-detail__meta-strip";

  const sizeEl = document.createElement("span");
  const hashBox = document.createElement("div");
  hashBox.className = "app-detail__hash-box";

  const hashText = document.createElement("span");
  hashBox.appendChild(hashText);

  const copyHashBtn = Button({
    icon: "copy",
    variant: "ghost",
    size: "sm",
    title: "Copy SHA256 checksum",
    onClick: async () => {
      const activeObj = versionsObj[selectedVersion];
      if (activeObj?.sha256) {
        try {
          await navigator.clipboard.writeText(activeObj.sha256);
          toast.success("SHA256 checksum copied");
        } catch (_) {
          toast.error("Failed to copy checksum");
        }
      }
    }
  });
  hashBox.appendChild(copyHashBtn);

  function syncVersionDetails(ver) {
    const verData = versionsObj[ver] || {};
    codeText.textContent = getInstallCommand(ver);

    sizeEl.textContent = verData.size ? `Size: ${verData.size}` : "";

    if (verData.sha256) {
      const short = verData.sha256.length > 16
        ? `${verData.sha256.substring(0, 16)}...`
        : verData.sha256;
      hashText.textContent = `SHA256: ${short}`;
      hashBox.classList.remove("ui-hidden");
    } else {
      hashBox.classList.add("ui-hidden");
    }
  }

  versionSelect.addEventListener("change", (e) => {
    selectedVersion = e.target.value;
    syncVersionDetails(selectedVersion);
  });

  metaStrip.appendChild(sizeEl);
  metaStrip.appendChild(hashBox);
  installCard.appendChild(metaStrip);

  syncVersionDetails(selectedVersion);
  container.appendChild(installCard);

  // Markdown Tabs (Features & Changelog)
  const hasFeatures = Boolean(docs.features);
  const hasChangelog = Boolean(docs.changelog);

  if (hasFeatures || hasChangelog) {
    const tabsContainer = document.createElement("div");

    const tabsHeader = document.createElement("div");
    tabsHeader.className = "app-tabs";

    let activeTab = hasFeatures ? "features" : "changelog";

    const featuresBtn = document.createElement("button");
    featuresBtn.type = "button";
    featuresBtn.className = "app-tab-btn";
    featuresBtn.textContent = "Features";

    const changelogBtn = document.createElement("button");
    changelogBtn.type = "button";
    changelogBtn.className = "app-tab-btn";
    changelogBtn.textContent = "Changelog";

    const tabContent = document.createElement("div");
    tabContent.className = "app-tab-content ui-markdown";

    function renderMarkdown(rawMd) {
      if (!rawMd) return "<p>No documentation provided.</p>";
      if (window.marked && window.DOMPurify) {
        return window.DOMPurify.sanitize(window.marked.parse(rawMd));
      }
      // Safe fallback if CDN fails
      const pre = document.createElement("pre");
      pre.textContent = rawMd;
      return pre.outerHTML;
    }

    function switchTab(tab) {
      activeTab = tab;
      if (tab === "features") {
        featuresBtn.classList.add("is-active");
        changelogBtn.classList.remove("is-active");
        tabContent.innerHTML = renderMarkdown(docs.features);
      } else {
        changelogBtn.classList.add("is-active");
        featuresBtn.classList.remove("is-active");
        tabContent.innerHTML = renderMarkdown(docs.changelog);
      }
    }

    if (hasFeatures) {
      featuresBtn.addEventListener("click", () => switchTab("features"));
      tabsHeader.appendChild(featuresBtn);
    }

    if (hasChangelog) {
      changelogBtn.addEventListener("click", () => switchTab("changelog"));
      tabsHeader.appendChild(changelogBtn);
    }

    tabsContainer.appendChild(tabsHeader);
    tabsContainer.appendChild(tabContent);
    container.appendChild(tabsContainer);

    switchTab(activeTab);
  }
}
