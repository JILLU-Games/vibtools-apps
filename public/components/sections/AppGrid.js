import { Card, Badge, Button, Icon, toast } from "../ui/index.js";
import { navigate } from "../../lib/router.js";
import { copyToClipboard } from "../../lib/clipboard.js";
import {
  getAppMonogram,
  getPackageFormat,
  formatVersionLabel,
  buildInstallCommand,
  filterApps,
  computeCategoryCounts
} from "../../lib/appMeta.js";

/**
 * Creates a restrained app icon container that loads the real icon asset
 * and falls back cleanly to a 2-letter monogram tile when unavailable.
 *
 * @param {Object} app
 * @param {string} className
 * @returns {HTMLDivElement}
 */
function createAppIconTile(app, className) {
  const iconWrap = document.createElement("div");
  iconWrap.className = className;

  const renderMonogram = () => {
    iconWrap.innerHTML = "";
    const mono = document.createElement("span");
    mono.className = "app-icon-monogram";
    mono.textContent = getAppMonogram(app);
    mono.setAttribute("aria-hidden", "true");
    iconWrap.appendChild(mono);
  };

  if (app.icon) {
    const img = document.createElement("img");
    img.src = app.icon;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.onerror = renderMonogram;
    iconWrap.appendChild(img);
  } else {
    renderMonogram();
  }

  return iconWrap;
}

/**
 * Renders loading skeleton cards matching the 3-zone application card geometry.
 *
 * @param {number} count
 * @returns {DocumentFragment}
 */
function renderSkeletonCards(count = 3) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const skel = document.createElement("div");
    skel.className = "ui-card app-card-skeleton";
    skel.setAttribute("aria-hidden", "true");
    skel.innerHTML = `
      <div class="app-card-skeleton__top">
        <div class="ui-skeleton app-card-skeleton__icon"></div>
        <div class="app-card-skeleton__titles">
          <div class="ui-skeleton app-card-skeleton__line app-card-skeleton__line--md"></div>
          <div class="ui-skeleton app-card-skeleton__line app-card-skeleton__line--sm"></div>
        </div>
      </div>
      <div class="app-card-skeleton__body">
        <div class="ui-skeleton app-card-skeleton__line app-card-skeleton__line--full"></div>
        <div class="ui-skeleton app-card-skeleton__line app-card-skeleton__line--lg"></div>
      </div>
      <div class="app-card-skeleton__footer">
        <div class="ui-skeleton app-card-skeleton__btn"></div>
        <div class="ui-skeleton app-card-skeleton__btn"></div>
      </div>
    `;
    frag.appendChild(skel);
  }
  return frag;
}

/**
 * App Catalog Grid Section (/ and /category/:name).
 *
 * @param {Object} options
 * @param {Array<Object>} options.apps - Full list of app configurations
 * @param {Object} [options.route] - Current active route
 * @param {string} [options.searchQuery=""] - Live search filter query
 * @param {"all"|"free"|"paid"} [options.activeAccess="all"] - License/access tier filter
 * @param {boolean} [options.isLoading=false] - Initial catalog loading state
 * @param {Function} [options.onAccessChange] - Callback when license filter changes
 * @param {Function} [options.onResetFilters] - Callback to clear active filters
 * @returns {HTMLElement}
 */
export function AppGrid({
  apps = [],
  route = { view: "home" },
  searchQuery = "",
  activeAccess = "all",
  isLoading = false,
  onAccessChange,
  onResetFilters
} = {}) {
  const container = document.createElement("div");
  container.className = "app-grid-section";

  const activeCategory = route.view === "category" && route.category ? route.category : "";
  const { categories, counts, total } = computeCategoryCounts(apps);
  const filtered = filterApps(apps, {
    category: activeCategory,
    access: activeAccess,
    query: searchQuery
  });

  const hasActiveFilters = Boolean(
    activeCategory || (searchQuery && searchQuery.trim()) || (activeAccess && activeAccess !== "all")
  );

  // Match canonical category casing if available
  const displayCategory = activeCategory
    ? categories.find((c) => c.toLowerCase() === activeCategory.toLowerCase()) ||
      activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)
    : "";

  // 1. Catalog Discovery Header
  const headerBar = document.createElement("div");
  headerBar.className = "app-catalog-header";

  const headingGroup = document.createElement("div");
  headingGroup.className = "app-catalog-header__text";

  const heading = document.createElement("h1");
  heading.className = "app-catalog-header__title";
  heading.textContent = displayCategory || "All Applications";
  headingGroup.appendChild(heading);

  const subtitle = document.createElement("p");
  subtitle.className = "app-catalog-header__subtitle";
  subtitle.textContent = displayCategory
    ? `Browse ${displayCategory} software distributed through Vib Apps and get.vib.tools.`
    : "Desktop applications, developer utilities, and edge PowerShell installers from Vib Tools.";
  headingGroup.appendChild(subtitle);
  headerBar.appendChild(headingGroup);

  if (!isLoading) {
    const countLabel = hasActiveFilters
      ? `${filtered.length} of ${total} ${total === 1 ? "app" : "apps"}`
      : `${total} ${total === 1 ? "application" : "applications"}`;
    const countBadge = Badge({
      text: countLabel,
      variant: "mono",
      className: "app-catalog-header__count"
    });
    headerBar.appendChild(countBadge);
  }

  container.appendChild(headerBar);

  // 2. Mobile Category Chips Bar (visible < 768px)
  if (categories.length > 0) {
    const categoryBar = document.createElement("div");
    categoryBar.className = "app-category-bar";
    categoryBar.setAttribute("role", "navigation");
    categoryBar.setAttribute("aria-label", "Filter by Category");

    const allChip = document.createElement("button");
    allChip.type = "button";
    allChip.className = `app-category-chip ${!activeCategory ? "is-active" : ""}`;
    allChip.textContent = `All (${total})`;
    allChip.addEventListener("click", () => navigate("/"));
    categoryBar.appendChild(allChip);

    categories.forEach((cat) => {
      const isCatActive = activeCategory.toLowerCase() === cat.toLowerCase();
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `app-category-chip ${isCatActive ? "is-active" : ""}`;
      chip.textContent = `${cat} (${counts[cat] || 0})`;
      chip.addEventListener("click", () =>
        navigate(`/category/${encodeURIComponent(cat.toLowerCase())}`)
      );
      categoryBar.appendChild(chip);
    });

    container.appendChild(categoryBar);
  }

  // 3. Filter & Controls Toolbar (Access Tier Filter + Active Reset)
  const controlsBar = document.createElement("div");
  controlsBar.className = "app-filter-bar";

  const accessGroup = document.createElement("div");
  accessGroup.className = "app-segmented";
  accessGroup.setAttribute("role", "group");
  accessGroup.setAttribute("aria-label", "Filter by License");

  const accessTiers = [
    { value: "all", label: "All" },
    { value: "free", label: "Free" },
    { value: "paid", label: "Paid" }
  ];

  accessTiers.forEach((tier) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isActive = activeAccess === tier.value;
    btn.className = `app-segmented__btn ${isActive ? "is-active" : ""}`;
    btn.setAttribute("aria-pressed", String(isActive));
    btn.textContent = tier.label;
    btn.addEventListener("click", () => {
      if (typeof onAccessChange === "function" && tier.value !== activeAccess) {
        onAccessChange(tier.value);
      }
    });
    accessGroup.appendChild(btn);
  });

  controlsBar.appendChild(accessGroup);

  if (hasActiveFilters && typeof onResetFilters === "function") {
    const resetBtn = Button({
      label: "Reset filters",
      icon: "rotate",
      variant: "ghost",
      size: "sm",
      onClick: onResetFilters
    });
    controlsBar.appendChild(resetBtn);
  }

  container.appendChild(controlsBar);

  // 4. Pinned Quick CLI Banner (home view when unfiltered and loaded)
  if (!isLoading && route.view === "home" && !hasActiveFilters) {
    const banner = document.createElement("div");
    banner.className = "app-cli-banner";

    const info = document.createElement("div");
    info.className = "app-cli-banner__info";

    const labelRow = document.createElement("div");
    labelRow.className = "app-cli-banner__label";
    labelRow.appendChild(Icon("terminal", 15));
    const labelText = document.createElement("span");
    labelText.textContent = "Edge CLI Installer";
    labelRow.appendChild(labelText);
    info.appendChild(labelRow);

    const cmdCode = document.createElement("code");
    cmdCode.className = "app-cli-banner__cmd";
    cmdCode.textContent = 'irm "https://get.vib.tools/<slug>" | iex';
    info.appendChild(cmdCode);

    banner.appendChild(info);

    const bannerActions = document.createElement("div");
    bannerActions.className = "app-cli-banner__actions";

    const copyBannerBtn = Button({
      label: "Copy",
      icon: "copy",
      size: "sm",
      variant: "secondary",
      ariaLabel: "Copy PowerShell installer template",
      onClick: async () => {
        const copied = await copyToClipboard('irm "https://get.vib.tools/<slug>" | iex');
        if (copied) {
          toast.success("Installer template copied to clipboard");
        } else {
          toast.error("Failed to copy command to clipboard");
        }
      }
    });

    const guideBtn = Button({
      label: "CLI Guide",
      icon: "chevron-right",
      size: "sm",
      variant: "ghost",
      onClick: () => navigate("/cli")
    });

    bannerActions.appendChild(copyBannerBtn);
    bannerActions.appendChild(guideBtn);
    banner.appendChild(bannerActions);

    container.appendChild(banner);
  }

  // 5. Application Cards Grid
  const grid = document.createElement("div");
  grid.className = "app-grid";

  if (isLoading) {
    grid.appendChild(renderSkeletonCards(3));
    container.appendChild(grid);
    return container;
  }

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "app-grid__empty";

    const isCatalogEmpty = total === 0 && !hasActiveFilters;

    const emptyIcon = document.createElement("div");
    emptyIcon.className = "app-grid__empty-icon";
    emptyIcon.appendChild(Icon(isCatalogEmpty ? "package" : "search", 24));
    empty.appendChild(emptyIcon);

    const emptyTitle = document.createElement("h2");
    emptyTitle.className = "app-grid__empty-title";
    emptyTitle.textContent = isCatalogEmpty
      ? "No applications registered yet"
      : "No matching applications";
    empty.appendChild(emptyTitle);

    const emptyDesc = document.createElement("p");
    emptyDesc.className = "app-grid__empty-desc";
    if (isCatalogEmpty) {
      emptyDesc.textContent =
        "Add any GitHub repository URL with .vibtools/apps/app.config.json to registry.json to auto-sync applications here.";
    } else if (searchQuery && searchQuery.trim()) {
      emptyDesc.textContent = `No applications matched "${searchQuery.trim()}" with the current filters.`;
    } else {
      emptyDesc.textContent = "No applications are currently available for this filter selection.";
    }
    empty.appendChild(emptyDesc);

    if (isCatalogEmpty) {
      const schemaCta = Button({
        label: "Schema & AI Setup Docs",
        icon: "file",
        variant: "primary",
        size: "sm",
        onClick: () => navigate("/schema")
      });
      empty.appendChild(schemaCta);
    } else if (hasActiveFilters && typeof onResetFilters === "function") {
      const clearBtn = Button({
        label: "Clear all filters",
        icon: "rotate",
        variant: "primary",
        size: "sm",
        onClick: onResetFilters
      });
      empty.appendChild(clearBtn);
    }

    grid.appendChild(empty);
  } else {
    filtered.forEach((app) => {
      const versionsObj = app.versions || {};
      const latestVersionObj = app.latest ? versionsObj[app.latest] : null;
      const pkgFormat = getPackageFormat(latestVersionObj);

      // TOP ZONE: 44px Icon + Name + Category + License Badge
      const headerEl = document.createElement("div");
      headerEl.className = "app-card__top";

      const identity = document.createElement("div");
      identity.className = "app-card__identity";

      identity.appendChild(createAppIconTile(app, "app-card__icon"));

      const titleStack = document.createElement("div");
      titleStack.className = "app-card__title-stack";

      const nameEl = document.createElement("h2");
      nameEl.className = "app-card__name";
      nameEl.textContent = app.name || app.slug;
      titleStack.appendChild(nameEl);

      if (app.category) {
        const catEl = document.createElement("span");
        catEl.className = "app-card__category";
        catEl.textContent = app.category;
        titleStack.appendChild(catEl);
      }

      identity.appendChild(titleStack);
      headerEl.appendChild(identity);

      if (app.access) {
        const isFree = app.access.toLowerCase() === "free";
        const isPaid = app.access.toLowerCase() === "paid";
        const accessBadge = Badge({
          text: app.access,
          variant: isFree ? "success" : isPaid ? "paid" : "neutral"
        });
        headerEl.appendChild(accessBadge);
      }

      // MIDDLE ZONE: 2-line Clamped Tagline + Real Version/Format Meta Row
      const bodyEl = document.createElement("div");
      bodyEl.className = "app-card__body-inner";

      const taglineEl = document.createElement("p");
      taglineEl.className = "app-card__tagline";
      taglineEl.textContent = app.tagline || "No description available.";
      bodyEl.appendChild(taglineEl);

      const metaRow = document.createElement("div");
      metaRow.className = "app-card__meta-row";

      if (app.latest) {
        metaRow.appendChild(
          Badge({
            text: formatVersionLabel(app.latest),
            variant: "mono"
          })
        );
      }

      if (pkgFormat) {
        metaRow.appendChild(
          Badge({
            text: pkgFormat,
            variant: "neutral",
            icon: "package"
          })
        );
      }

      if (app.installer?.type) {
        const installerLabel =
          app.installer.type.toLowerCase() === "powershell"
            ? "PowerShell"
            : app.installer.type;
        metaRow.appendChild(
          Badge({
            text: installerLabel,
            variant: "neutral",
            icon: "terminal"
          })
        );
      }

      if (metaRow.childNodes.length > 0) {
        bodyEl.appendChild(metaRow);
      }

      // BOTTOM ZONE: Primary Details Action + Secondary CLI Copy Action
      const footerEl = document.createElement("div");
      footerEl.className = "app-card__footer-inner";

      const detailsBtn = Button({
        label: "View Details",
        variant: "primary",
        size: "sm",
        onClick: (e) => {
          e.stopPropagation();
          navigate(`/app/${app.slug}`);
        }
      });

      const installBtn = Button({
        label: "Copy CLI",
        icon: "terminal",
        variant: "secondary",
        size: "sm",
        title: `Copy PowerShell install command for ${app.name || app.slug}`,
        ariaLabel: `Copy CLI install command for ${app.name || app.slug}`,
        onClick: async (e) => {
          e.stopPropagation();
          const cmd = buildInstallCommand(app.slug, app.latest, app.latest);
          const copied = await copyToClipboard(cmd);
          if (copied) {
            toast.success(`Copied: ${cmd}`);
          } else {
            toast.error("Failed to copy install command");
          }
        }
      });

      footerEl.appendChild(detailsBtn);
      footerEl.appendChild(installBtn);

      const card = Card({
        header: headerEl,
        body: bodyEl,
        footer: footerEl,
        clickable: true,
        ariaLabel: `${app.name || app.slug} application`,
        className: "app-card",
        onClick: () => navigate(`/app/${app.slug}`)
      });

      grid.appendChild(card);
    });
  }

  container.appendChild(grid);
  return container;
}
