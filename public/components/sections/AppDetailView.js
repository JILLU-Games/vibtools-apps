import { Button, Badge, Icon, toast } from "../ui/index.js";
import { fetchAppDetail } from "../../lib/api.js";
import { navigate } from "../../lib/router.js";
import { copyToClipboard } from "../../lib/clipboard.js";
import {
  getAppMonogram,
  getPackageFormat,
  formatReleaseDate,
  formatVersionLabel,
  buildInstallCommand,
  buildDownloadUrl
} from "../../lib/appMeta.js";

/**
 * Renders a two-column detail loading skeleton while app metadata fetches.
 *
 * @returns {HTMLDivElement}
 */
function renderDetailSkeleton() {
  const skel = document.createElement("div");
  skel.className = "app-detail-skeleton";
  skel.setAttribute("aria-busy", "true");
  skel.setAttribute("aria-label", "Loading application details");
  skel.innerHTML = `
    <div class="ui-skeleton app-detail-skeleton__crumb"></div>
    <div class="app-detail-skeleton__header">
      <div class="ui-skeleton app-detail-skeleton__icon"></div>
      <div class="app-detail-skeleton__titles">
        <div class="ui-skeleton app-detail-skeleton__title"></div>
        <div class="ui-skeleton app-detail-skeleton__sub"></div>
      </div>
    </div>
    <div class="app-detail__layout">
      <div class="ui-card app-detail-skeleton__panel">
        <div class="ui-skeleton app-detail-skeleton__line"></div>
        <div class="ui-skeleton app-detail-skeleton__line app-detail-skeleton__line--md"></div>
        <div class="ui-skeleton app-detail-skeleton__line app-detail-skeleton__line--sm"></div>
      </div>
      <div class="ui-card app-detail-skeleton__panel">
        <div class="ui-skeleton app-detail-skeleton__line"></div>
        <div class="ui-skeleton app-detail-skeleton__cta"></div>
      </div>
    </div>
  `;
  return skel;
}

/**
 * Safely renders Markdown via Marked.js + DOMPurify (XSS protected).
 *
 * @param {string} rawMd
 * @returns {string}
 */
function renderSafeMarkdown(rawMd) {
  if (!rawMd) return "<p>No documentation provided.</p>";
  if (window.marked && window.DOMPurify) {
    return window.DOMPurify.sanitize(window.marked.parse(rawMd));
  }
  const pre = document.createElement("pre");
  pre.textContent = rawMd;
  return pre.outerHTML;
}

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

  container.appendChild(renderDetailSkeleton());

  fetchAppDetail(slug)
    .then((data) => {
      container.innerHTML = "";
      if (data?.app?.name) {
        document.title = `${data.app.name} — Vib Apps`;
      }
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

  const iconEl = document.createElement("div");
  iconEl.className = "app-grid__empty-icon";
  iconEl.appendChild(Icon("alert", 24));
  errorBox.appendChild(iconEl);

  const title = document.createElement("h2");
  title.className = "app-grid__empty-title";
  title.textContent = "Unable to load application";
  errorBox.appendChild(title);

  const msg = document.createElement("p");
  msg.className = "app-grid__empty-desc";
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
  // 1. Breadcrumb Navigation Row
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

  if (app.category) {
    breadcrumb.appendChild(Icon("chevron-right", 13));
    const catPath = `/category/${encodeURIComponent(app.category.toLowerCase())}`;
    const catLink = document.createElement("a");
    catLink.href = catPath;
    catLink.className = "app-detail__crumb-link";
    catLink.textContent = app.category;
    catLink.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(catPath);
    });
    breadcrumb.appendChild(catLink);
  }

  breadcrumb.appendChild(Icon("chevron-right", 13));
  const currentCrumb = document.createElement("span");
  currentCrumb.className = "app-detail__crumb-current";
  currentCrumb.textContent = app.name || app.slug;
  currentCrumb.setAttribute("aria-current", "page");
  breadcrumb.appendChild(currentCrumb);

  container.appendChild(breadcrumb);

  // 2. Compact App Header (Icon + Name + Tagline + Closely Grouped Metadata Badges)
  const headerPanel = document.createElement("header");
  headerPanel.className = "app-detail__header";

  const iconWrap = document.createElement("div");
  iconWrap.className = "app-detail__icon";

  const renderMonogram = () => {
    iconWrap.innerHTML = "";
    const mono = document.createElement("span");
    mono.className = "app-icon-monogram app-icon-monogram--lg";
    mono.textContent = getAppMonogram(app);
    mono.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(mono);
  };

  if (app.icon) {
    const img = document.createElement("img");
    img.src = app.icon;
    img.alt = "";
    img.loading = "eager";
    img.onerror = renderMonogram;
    iconWrap.appendChild(img);
  } else {
    renderMonogram();
  }
  headerPanel.appendChild(iconWrap);

  const titleGroup = document.createElement("div");
  titleGroup.className = "app-detail__title-group";

  const nameRow = document.createElement("div");
  nameRow.className = "app-detail__name-row";

  const nameEl = document.createElement("h1");
  nameEl.className = "app-detail__name";
  nameEl.textContent = app.name || app.slug;
  nameRow.appendChild(nameEl);

  if (app.access) {
    const isFree = app.access.toLowerCase() === "free";
    const isPaid = app.access.toLowerCase() === "paid";
    nameRow.appendChild(
      Badge({
        text: app.access,
        variant: isFree ? "success" : isPaid ? "paid" : "neutral"
      })
    );
  }

  if (app.category) {
    nameRow.appendChild(
      Badge({
        text: app.category,
        variant: "neutral"
      })
    );
  }

  if (app.latest) {
    nameRow.appendChild(
      Badge({
        text: formatVersionLabel(app.latest),
        variant: "mono"
      })
    );
  }

  titleGroup.appendChild(nameRow);

  if (app.tagline) {
    const taglineEl = document.createElement("p");
    taglineEl.className = "app-detail__tagline";
    taglineEl.textContent = app.tagline;
    titleGroup.appendChild(taglineEl);
  }

  headerPanel.appendChild(titleGroup);
  container.appendChild(headerPanel);

  // 3. Responsive Two-Column Layout (Main Documentation Left + Sticky Install Panel Right)
  const layout = document.createElement("div");
  layout.className = "app-detail__layout";

  const mainCol = document.createElement("div");
  mainCol.className = "app-detail__main";

  const asideCol = document.createElement("aside");
  asideCol.className = "app-detail__aside";
  asideCol.setAttribute("aria-label", "Download and installation options");

  // --- RIGHT COLUMN: Download & Install Panel ---
  const versionsObj = app.versions || {};
  const versionKeys = Object.keys(versionsObj);
  let selectedVersion = app.latest || (versionKeys.length > 0 ? versionKeys[0] : "");
  let isHashExpanded = false;

  const installCard = document.createElement("section");
  installCard.className = "app-detail__install-card";
  installCard.setAttribute("aria-labelledby", "install-panel-heading");

  const installHeading = document.createElement("h2");
  installHeading.id = "install-panel-heading";
  installHeading.className = "app-detail__panel-title";
  installHeading.textContent = "Download & Install";
  installCard.appendChild(installHeading);

  // Version Selector
  const selectField = document.createElement("div");
  selectField.className = "app-detail__field";

  const selectLabel = document.createElement("label");
  selectLabel.className = "app-detail__field-label";
  selectLabel.htmlFor = "app-version-select";
  selectLabel.textContent = "Release Version";
  selectField.appendChild(selectLabel);

  const versionSelect = document.createElement("select");
  versionSelect.id = "app-version-select";
  versionSelect.className = "app-detail__select";

  if (versionKeys.length > 0) {
    versionKeys.forEach((ver) => {
      const opt = document.createElement("option");
      const verInfo = versionsObj[ver];
      const dateStr = formatReleaseDate(verInfo?.released_at);
      opt.value = ver;
      const parts = [formatVersionLabel(ver)];
      if (ver === app.latest) parts.push("(latest)");
      if (dateStr) parts.push(`— ${dateStr}`);
      opt.textContent = parts.join(" ");
      if (ver === selectedVersion) {
        opt.selected = true;
      }
      versionSelect.appendChild(opt);
    });
  } else {
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "No releases available";
    versionSelect.appendChild(emptyOpt);
    versionSelect.disabled = true;
  }

  selectField.appendChild(versionSelect);
  installCard.appendChild(selectField);

  // Conditional OS / Platform selector (ONLY when app metadata provides real platforms)
  if (Array.isArray(app.platforms) && app.platforms.length > 0) {
    const platField = document.createElement("div");
    platField.className = "app-detail__field";
    const platLabel = document.createElement("label");
    platLabel.className = "app-detail__field-label";
    platLabel.htmlFor = "app-platform-select";
    platLabel.textContent = "Operating System";
    platField.appendChild(platLabel);

    const platSelect = document.createElement("select");
    platSelect.id = "app-platform-select";
    platSelect.className = "app-detail__select";
    app.platforms.forEach((plat) => {
      const opt = document.createElement("option");
      opt.value = String(plat);
      opt.textContent = String(plat);
      platSelect.appendChild(opt);
    });
    platField.appendChild(platSelect);
    installCard.appendChild(platField);
  }

  // Conditional Architecture selector (ONLY when app metadata provides real architectures)
  if (Array.isArray(app.architectures) && app.architectures.length > 0) {
    const archField = document.createElement("div");
    archField.className = "app-detail__field";
    const archLabel = document.createElement("label");
    archLabel.className = "app-detail__field-label";
    archLabel.htmlFor = "app-arch-select";
    archLabel.textContent = "Architecture";
    archField.appendChild(archLabel);

    const archSelect = document.createElement("select");
    archSelect.id = "app-arch-select";
    archSelect.className = "app-detail__select";
    app.architectures.forEach((arch) => {
      const opt = document.createElement("option");
      opt.value = String(arch);
      opt.textContent = String(arch);
      archSelect.appendChild(opt);
    });
    archField.appendChild(archSelect);
    installCard.appendChild(archField);
  }

  // Primary Direct Binary Download Link (semantic <a>, no window.open)
  const dlLinkLabel = document.createElement("span");
  const dlLink = Button({
    label: dlLinkLabel,
    icon: "download",
    variant: "primary",
    size: "lg",
    fullWidth: true,
    href: selectedVersion ? buildDownloadUrl(app.slug, selectedVersion) : "#",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "app-detail__dl-btn"
  });
  if (!selectedVersion) {
    dlLink.classList.add("ui-hidden");
  }
  installCard.appendChild(dlLink);

  // CLI Installer Block
  const cliBlock = document.createElement("div");
  cliBlock.className = "app-detail__cli-block";

  const cliLabel = document.createElement("div");
  cliLabel.className = "app-detail__field-label";
  cliLabel.textContent =
    app.installer?.type && app.installer.type.toLowerCase() !== "powershell"
      ? `${app.installer.type} CLI`
      : "PowerShell CLI";
  cliBlock.appendChild(cliLabel);

  const codeBox = document.createElement("div");
  codeBox.className = "ui-code-box";

  const codeText = document.createElement("code");
  codeText.className = "ui-code-box__text";
  codeBox.appendChild(codeText);

  const copyCodeBtn = Button({
    icon: "copy",
    variant: "secondary",
    size: "sm",
    title: "Copy CLI install command",
    ariaLabel: "Copy CLI install command",
    onClick: async () => {
      const cmd = buildInstallCommand(app.slug, selectedVersion, app.latest);
      const copied = await copyToClipboard(cmd);
      if (copied) {
        toast.success(`Copied: ${cmd}`);
      } else {
        toast.error("Failed to copy command");
      }
    }
  });
  codeBox.appendChild(copyCodeBtn);
  cliBlock.appendChild(codeBox);
  installCard.appendChild(cliBlock);

  // Release Metadata Specification List (<dl>)
  const metaList = document.createElement("dl");
  metaList.className = "app-detail__meta-list";

  function createMetaRow(label, iconName) {
    const row = document.createElement("div");
    row.className = "app-detail__meta-row";

    const dt = document.createElement("dt");
    dt.className = "app-detail__meta-key";
    if (iconName) dt.appendChild(Icon(iconName, 13));
    const keySpan = document.createElement("span");
    keySpan.textContent = label;
    dt.appendChild(keySpan);

    const dd = document.createElement("dd");
    dd.className = "app-detail__meta-val";

    row.appendChild(dt);
    row.appendChild(dd);
    metaList.appendChild(row);
    return { row, dd };
  }

  const versionMeta = createMetaRow("Version", "layers");
  const dateMeta = createMetaRow("Released", "calendar");
  const formatMeta = createMetaRow("Package", "package");
  const sizeMeta = createMetaRow("File Size", "file");

  // Checksum Row (with Show Full toggle + Copy button)
  const hashRow = document.createElement("div");
  hashRow.className = "app-detail__meta-row app-detail__meta-row--stack";

  const hashHeader = document.createElement("div");
  hashHeader.className = "app-detail__hash-header";

  const hashDt = document.createElement("dt");
  hashDt.className = "app-detail__meta-key";
  hashDt.appendChild(Icon("shield", 13));
  const hashKeyText = document.createElement("span");
  hashKeyText.textContent = "SHA256";
  hashDt.appendChild(hashKeyText);
  hashHeader.appendChild(hashDt);

  const hashActions = document.createElement("div");
  hashActions.className = "app-detail__hash-actions";

  const toggleHashBtn = Button({
    label: "Full",
    icon: "eye",
    variant: "ghost",
    size: "sm",
    title: "Show full SHA256 checksum",
    ariaLabel: "Show full SHA256 checksum",
    onClick: () => {
      isHashExpanded = !isHashExpanded;
      syncHashDisplay();
    }
  });

  const copyHashBtn = Button({
    icon: "copy",
    variant: "ghost",
    size: "sm",
    title: "Copy SHA256 checksum",
    ariaLabel: "Copy SHA256 checksum",
    onClick: async () => {
      const activeObj = versionsObj[selectedVersion];
      if (activeObj?.sha256) {
        const copied = await copyToClipboard(activeObj.sha256);
        if (copied) {
          toast.success("SHA256 checksum copied");
        } else {
          toast.error("Failed to copy checksum");
        }
      }
    }
  });

  hashActions.appendChild(toggleHashBtn);
  hashActions.appendChild(copyHashBtn);
  hashHeader.appendChild(hashActions);
  hashRow.appendChild(hashHeader);

  const hashDd = document.createElement("dd");
  hashDd.className = "app-detail__hash-value";
  const hashCode = document.createElement("code");
  hashDd.appendChild(hashCode);
  hashRow.appendChild(hashDd);

  metaList.appendChild(hashRow);
  installCard.appendChild(metaList);
  asideCol.appendChild(installCard);

  function syncHashDisplay() {
    const verData = versionsObj[selectedVersion] || {};
    if (!verData.sha256) {
      hashRow.classList.add("ui-hidden");
      return;
    }

    hashRow.classList.remove("ui-hidden");
    const full = verData.sha256;
    const canExpand = full.length > 20;

    if (!canExpand) {
      toggleHashBtn.classList.add("ui-hidden");
      hashCode.textContent = full;
      hashCode.classList.remove("is-expanded");
      return;
    }

    toggleHashBtn.classList.remove("ui-hidden");
    if (isHashExpanded) {
      hashCode.textContent = full;
      hashCode.classList.add("is-expanded");
      toggleHashBtn.innerHTML = "";
      toggleHashBtn.appendChild(Icon("eye-off", 13));
      const hideSpan = document.createElement("span");
      hideSpan.textContent = "Hide";
      toggleHashBtn.appendChild(hideSpan);
      toggleHashBtn.setAttribute("aria-label", "Hide full SHA256 checksum");
      toggleHashBtn.title = "Hide full SHA256 checksum";
    } else {
      hashCode.textContent = `${full.slice(0, 16)}…${full.slice(-6)}`;
      hashCode.classList.remove("is-expanded");
      toggleHashBtn.innerHTML = "";
      toggleHashBtn.appendChild(Icon("eye", 13));
      const showSpan = document.createElement("span");
      showSpan.textContent = "Full";
      toggleHashBtn.appendChild(showSpan);
      toggleHashBtn.setAttribute("aria-label", "Show full SHA256 checksum");
      toggleHashBtn.title = "Show full SHA256 checksum";
    }
  }

  function syncVersionDetails(ver) {
    const verData = versionsObj[ver] || {};
    const fmt = getPackageFormat(verData);
    const verLabel = formatVersionLabel(ver);

    // Update Download link href & label
    if (ver) {
      dlLink.href = buildDownloadUrl(app.slug, ver);
      dlLinkLabel.textContent = fmt
        ? `Download ${verLabel} (.${fmt.toLowerCase()})`
        : `Download ${verLabel}`;
      dlLink.classList.remove("ui-hidden");
    } else {
      dlLink.classList.add("ui-hidden");
    }

    // Update CLI command
    codeText.textContent = buildInstallCommand(app.slug, ver, app.latest);

    // Version row
    if (ver) {
      versionMeta.dd.textContent = ver === app.latest ? `${verLabel} (latest)` : verLabel;
      versionMeta.row.classList.remove("ui-hidden");
    } else {
      versionMeta.row.classList.add("ui-hidden");
    }

    // Release Date row
    const formattedDate = formatReleaseDate(verData.released_at);
    if (formattedDate) {
      dateMeta.dd.textContent = formattedDate;
      dateMeta.row.classList.remove("ui-hidden");
    } else {
      dateMeta.row.classList.add("ui-hidden");
    }

    // Package format row
    const installerCue =
      app.installer?.type && app.installer.type.toLowerCase() === "powershell"
        ? "PowerShell"
        : app.installer?.type || "";
    const packageParts = [fmt, installerCue].filter(Boolean);
    if (packageParts.length > 0) {
      formatMeta.dd.textContent = packageParts.join(" · ");
      formatMeta.row.classList.remove("ui-hidden");
    } else {
      formatMeta.row.classList.add("ui-hidden");
    }

    // File Size row
    if (verData.size) {
      sizeMeta.dd.textContent = verData.size;
      sizeMeta.row.classList.remove("ui-hidden");
    } else {
      sizeMeta.row.classList.add("ui-hidden");
    }

    isHashExpanded = false;
    syncHashDisplay();
  }

  versionSelect.addEventListener("change", (e) => {
    if (e.target.value && versionsObj[e.target.value]) {
      selectedVersion = e.target.value;
      syncVersionDetails(selectedVersion);
    }
  });

  syncVersionDetails(selectedVersion);

  // --- LEFT COLUMN: Documentation Tabs (Features & Changelog) + Conditional Sections ---
  const hasFeatures = Boolean(docs.features);
  const hasChangelog = Boolean(docs.changelog);

  if (hasFeatures || hasChangelog) {
    const docsCard = document.createElement("section");
    docsCard.className = "app-detail__docs-card";

    const tabsHeader = document.createElement("div");
    tabsHeader.className = "app-tabs";
    tabsHeader.setAttribute("role", "tablist");
    tabsHeader.setAttribute("aria-label", "Application documentation");

    let activeTab = hasFeatures ? "features" : "changelog";

    const featuresBtn = document.createElement("button");
    featuresBtn.type = "button";
    featuresBtn.id = "tab-features";
    featuresBtn.className = "app-tab-btn";
    featuresBtn.setAttribute("role", "tab");
    featuresBtn.setAttribute("aria-controls", "panel-docs");
    featuresBtn.textContent = "Features & Overview";

    const changelogBtn = document.createElement("button");
    changelogBtn.type = "button";
    changelogBtn.id = "tab-changelog";
    changelogBtn.className = "app-tab-btn";
    changelogBtn.setAttribute("role", "tab");
    changelogBtn.setAttribute("aria-controls", "panel-docs");
    changelogBtn.textContent = "Release Changelog";

    const tabContent = document.createElement("div");
    tabContent.id = "panel-docs";
    tabContent.className = "app-tab-content ui-markdown";
    tabContent.setAttribute("role", "tabpanel");

    function switchTab(tab) {
      activeTab = tab;
      const isFeatures = tab === "features";
      featuresBtn.classList.toggle("is-active", isFeatures);
      featuresBtn.setAttribute("aria-selected", String(isFeatures));
      changelogBtn.classList.toggle("is-active", !isFeatures);
      changelogBtn.setAttribute("aria-selected", String(!isFeatures));
      tabContent.setAttribute("aria-labelledby", isFeatures ? "tab-features" : "tab-changelog");
      tabContent.innerHTML = renderSafeMarkdown(isFeatures ? docs.features : docs.changelog);
    }

    if (hasFeatures) {
      featuresBtn.addEventListener("click", () => switchTab("features"));
      tabsHeader.appendChild(featuresBtn);
    }

    if (hasChangelog) {
      changelogBtn.addEventListener("click", () => switchTab("changelog"));
      tabsHeader.appendChild(changelogBtn);
    }

    docsCard.appendChild(tabsHeader);
    docsCard.appendChild(tabContent);
    mainCol.appendChild(docsCard);

    switchTab(activeTab);
  } else {
    const noDocs = document.createElement("div");
    noDocs.className = "app-grid__empty";
    noDocs.textContent = "No documentation or release notes have been published for this application yet.";
    mainCol.appendChild(noDocs);
  }

  // Conditional Screenshots Gallery (ONLY when real screenshot URLs exist in metadata)
  if (Array.isArray(app.screenshots) && app.screenshots.length > 0) {
    const galleryCard = document.createElement("section");
    galleryCard.className = "app-detail__section-card";

    const galleryTitle = document.createElement("h2");
    galleryTitle.className = "app-detail__panel-title";
    galleryTitle.textContent = "Screenshots";
    galleryCard.appendChild(galleryTitle);

    const galleryGrid = document.createElement("div");
    galleryGrid.className = "app-detail__gallery";

    app.screenshots.forEach((item, index) => {
      const src = typeof item === "string" ? item : item?.url;
      if (!src) return;
      const fig = document.createElement("figure");
      fig.className = "app-detail__gallery-item";
      const img = document.createElement("img");
      img.src = src;
      img.alt = (typeof item === "object" && item.alt) || `${app.name || app.slug} screenshot ${index + 1}`;
      img.loading = "lazy";
      fig.appendChild(img);
      galleryGrid.appendChild(fig);
    });

    if (galleryGrid.childNodes.length > 0) {
      galleryCard.appendChild(galleryGrid);
      mainCol.appendChild(galleryCard);
    }
  }

  // Conditional Structured System Requirements (ONLY when real app.requirements exists)
  if (app.requirements && (Array.isArray(app.requirements) ? app.requirements.length > 0 : Object.keys(app.requirements).length > 0)) {
    const reqCard = document.createElement("section");
    reqCard.className = "app-detail__section-card";

    const reqTitle = document.createElement("h2");
    reqTitle.className = "app-detail__panel-title";
    reqTitle.textContent = "System Requirements";
    reqCard.appendChild(reqTitle);

    const reqList = document.createElement("ul");
    reqList.className = "app-detail__req-list";

    if (Array.isArray(app.requirements)) {
      app.requirements.forEach((req) => {
        const li = document.createElement("li");
        li.textContent = String(req);
        reqList.appendChild(li);
      });
    } else {
      Object.entries(app.requirements).forEach(([k, v]) => {
        const li = document.createElement("li");
        li.textContent = `${k}: ${v}`;
        reqList.appendChild(li);
      });
    }

    reqCard.appendChild(reqList);
    mainCol.appendChild(reqCard);
  }

  // Conditional Additional Resource Links (ONLY when real app.links exists)
  if (app.links && typeof app.links === "object") {
    const validLinks = Object.entries(app.links).filter(
      ([, url]) => typeof url === "string" && /^https?:\/\//i.test(url)
    );
    if (validLinks.length > 0) {
      const linksCard = document.createElement("section");
      linksCard.className = "app-detail__section-card";

      const linksTitle = document.createElement("h2");
      linksTitle.className = "app-detail__panel-title";
      linksTitle.textContent = "Resources & Links";
      linksCard.appendChild(linksTitle);

      const linksList = document.createElement("div");
      linksList.className = "app-detail__links-row";

      validLinks.forEach(([key, url]) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        linksList.appendChild(
          Button({
            label,
            icon: "external",
            variant: "secondary",
            size: "sm",
            href: url,
            target: "_blank",
            rel: "noopener noreferrer"
          })
        );
      });

      linksCard.appendChild(linksList);
      asideCol.appendChild(linksCard);
    }
  }

  layout.appendChild(mainCol);
  layout.appendChild(asideCol);
  container.appendChild(layout);
}
