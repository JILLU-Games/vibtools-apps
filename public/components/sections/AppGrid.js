import { Card, Badge, Button, Icon, toast } from "../ui/index.js";
import { navigate } from "../../lib/router.js";
import { copyToClipboard } from "../../lib/clipboard.js";
import {
  getAppMonogram,
  getPackageFormat,
  getAccessBadgeVariant,
  formatVersionLabel,
  buildInstallCommand,
  filterApps,
  sortApps,
  computeCategoryCounts,
  getSupportedPlatforms
} from "../../lib/appMeta.js";

/**
 * Provides transient visual confirmation ("Copied" + check icon) on a copy button.
 *
 * @param {HTMLButtonElement} btn
 * @param {string} defaultLabel
 * @param {string} defaultIcon
 */
function flashCopiedState(btn, defaultLabel, defaultIcon = "copy") {
  if (!btn) return;
  if (btn._copyTimer) clearTimeout(btn._copyTimer);

  btn.classList.add("is-copied");
  btn.innerHTML = "";
  btn.appendChild(Icon("check", 14));
  if (defaultLabel) {
    const span = document.createElement("span");
    span.textContent = "Copied";
    btn.appendChild(span);
  }

  btn._copyTimer = setTimeout(() => {
    btn.classList.remove("is-copied");
    btn.innerHTML = "";
    btn.appendChild(Icon(defaultIcon, 14));
    if (defaultLabel) {
      const span = document.createElement("span");
      span.textContent = defaultLabel;
      btn.appendChild(span);
    }
    btn._copyTimer = null;
  }, 1800);
}

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
 * @param {"name-asc"|"name-desc"|"recent"} [options.activeSort="name-asc"] - Sort order
 * @param {boolean} [options.isLoading=false] - Initial catalog loading state
 * @param {string} [options.errorMessage=""] - Catalog load error message if fetch failed
 * @param {Function} [options.onAccessChange] - Callback when license filter changes
 * @param {Function} [options.onSortChange] - Callback when sort order changes
 * @param {Function} [options.onResetFilters] - Callback to clear active filters
 * @param {Function} [options.onRetry] - Callback to retry loading catalog after error
 * @returns {HTMLElement}
 */
export function AppGrid({
  apps = [],
  route = { view: "home" },
  searchQuery = "",
  activeAccess = "all",
  activeSort = "name-asc",
  isLoading = false,
  errorMessage = "",
  onAccessChange,
  onSortChange,
  onResetFilters,
  onRetry
} = {}) {
  const container = document.createElement("div");
  container.className = "app-grid-section";

  const activeCategory = route.view === "category" && route.category ? route.category : "";
  const { categories, counts, total } = computeCategoryCounts(apps);
  const filtered = sortApps(
    filterApps(apps, {
      category: activeCategory,
      access: activeAccess,
      query: searchQuery
    }),
    activeSort
  );

  const hasActiveFilters = Boolean(
    activeCategory ||
      (searchQuery && searchQuery.trim()) ||
      (activeAccess && activeAccess !== "all") ||
      (activeSort && activeSort !== "name-asc")
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

  if (!isLoading && !errorMessage) {
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

  // 2. Mobile Category Chips Bar (visible <= 768px when categories exist)
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

  // 3. Discovery Filter & Sort Controls Toolbar
  const controlsBar = document.createElement("div");
  controlsBar.className = "app-filter-bar";

  const leftControls = document.createElement("div");
  leftControls.className = "app-filter-bar__group";

  // License / Access Tier Segmented Control
  const accessGroup = document.createElement("div");
  accessGroup.className = "app-segmented";
  accessGroup.setAttribute("role", "group");
  accessGroup.setAttribute("aria-label", "Filter by License");

  const accessTiers = [
    { value: "all", label: "All" },
    { value: "free", label: "Free" },
    { value: "paid", label: "Paid" },
    { value: "forge", label: "Forge" }
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

  leftControls.appendChild(accessGroup);

  // Inline Category Select (rendered dynamically on desktop/tablet > 768px; mobile uses horizontal category chips)
  if (categories.length > 0) {
    const catSelectWrap = document.createElement("div");
    catSelectWrap.className = "app-select-wrap app-filter-bar__select app-filter-bar__select--category";
    catSelectWrap.appendChild(Icon("layers", 13));

    const catSelect = document.createElement("select");
    catSelect.className = "app-toolbar-select";
    catSelect.setAttribute("aria-label", "Filter by category");

    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = `All Categories (${total})`;
    if (!activeCategory) allOpt.selected = true;
    catSelect.appendChild(allOpt);

    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.toLowerCase();
      opt.textContent = `${cat} (${counts[cat] || 0})`;
      if (activeCategory.toLowerCase() === cat.toLowerCase()) opt.selected = true;
      catSelect.appendChild(opt);
    });

    catSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) {
        navigate("/");
      } else {
        navigate(`/category/${encodeURIComponent(val)}`);
      }
    });

    catSelectWrap.appendChild(catSelect);
    catSelectWrap.appendChild(Icon("chevron-down", 13));
    leftControls.appendChild(catSelectWrap);
  }

  controlsBar.appendChild(leftControls);

  // Right Controls: Sort Dropdown + Reset Action
  const rightControls = document.createElement("div");
  rightControls.className = "app-filter-bar__group app-filter-bar__group--end";

  if (hasActiveFilters && typeof onResetFilters === "function") {
    const resetBtn = Button({
      label: "Reset",
      icon: "rotate",
      variant: "ghost",
      size: "sm",
      title: "Reset search, filters, and sort",
      onClick: onResetFilters
    });
    rightControls.appendChild(resetBtn);
  }

  const sortWrap = document.createElement("div");
  sortWrap.className = "app-select-wrap app-filter-bar__select";
  sortWrap.appendChild(Icon("sort", 13));

  const sortSelect = document.createElement("select");
  sortSelect.id = "app-catalog-sort";
  sortSelect.className = "app-toolbar-select";
  sortSelect.setAttribute("aria-label", "Sort applications");

  const sortOptions = [
    { value: "name-asc", label: "Name (A–Z)" },
    { value: "name-desc", label: "Name (Z–A)" },
    { value: "recent", label: "Latest Release" }
  ];

  sortOptions.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.textContent = item.label;
    if (activeSort === item.value) opt.selected = true;
    sortSelect.appendChild(opt);
  });

  sortSelect.addEventListener("change", (e) => {
    if (typeof onSortChange === "function" && e.target.value !== activeSort) {
      onSortChange(e.target.value);
    }
  });

  sortWrap.appendChild(sortSelect);
  sortWrap.appendChild(Icon("chevron-down", 13));
  rightControls.appendChild(sortWrap);

  controlsBar.appendChild(rightControls);
  container.appendChild(controlsBar);

  // 4. Pinned Quick CLI Installer Banner (home view when unfiltered and loaded without error)
  if (!isLoading && !errorMessage && route.view === "home" && !hasActiveFilters) {
    const banner = document.createElement("section");
    banner.className = "app-cli-banner";
    banner.setAttribute("aria-label", "CLI Installer");

    const info = document.createElement("div");
    info.className = "app-cli-banner__info";

    const metaStack = document.createElement("div");
    metaStack.className = "app-cli-banner__meta";

    const labelRow = document.createElement("div");
    labelRow.className = "app-cli-banner__label";
    labelRow.appendChild(Icon("terminal", 15));
    const labelText = document.createElement("span");
    labelText.textContent = "CLI Installer";
    labelRow.appendChild(labelText);
    metaStack.appendChild(labelRow);

    const hintEl = document.createElement("span");
    hintEl.className = "app-cli-banner__hint";
    hintEl.textContent = "Replace <slug> with an app slug";
    metaStack.appendChild(hintEl);

    info.appendChild(metaStack);

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
          flashCopiedState(copyBannerBtn, "Copy", "copy");
          toast.success("Installer command template copied");
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

  // 5. Application Cards Grid / Distinct Loading, Error & Empty States
  const grid = document.createElement("div");
  grid.className = "app-grid";

  // State A: Loading Skeleton
  if (isLoading) {
    grid.setAttribute("aria-busy", "true");
    grid.appendChild(renderSkeletonCards(3));
    container.appendChild(grid);
    return container;
  }

  // State B: Catalog Fetch Error (Explicit & Distinct from Empty State)
  if (errorMessage) {
    const errorState = document.createElement("div");
    errorState.className = "app-grid__empty app-grid__empty--error";
    errorState.setAttribute("role", "alert");

    const errorIcon = document.createElement("div");
    errorIcon.className = "app-grid__empty-icon app-grid__empty-icon--error";
    errorIcon.appendChild(Icon("alert", 20));
    errorState.appendChild(errorIcon);

    const errorTitle = document.createElement("h2");
    errorTitle.className = "app-grid__empty-title";
    errorTitle.textContent = "Unable to load application catalog";
    errorState.appendChild(errorTitle);

    const errorDesc = document.createElement("p");
    errorDesc.className = "app-grid__empty-desc";
    errorDesc.textContent = errorMessage;
    errorState.appendChild(errorDesc);

    if (typeof onRetry === "function") {
      const retryBtn = Button({
        label: "Retry",
        icon: "rotate",
        variant: "primary",
        size: "sm",
        onClick: onRetry
      });
      errorState.appendChild(retryBtn);
    }

    grid.appendChild(errorState);
    container.appendChild(grid);
    return container;
  }

  // State C: Compact Empty State (Zero Fake Applications)
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "app-grid__empty";

    const isCatalogEmpty = total === 0 && !hasActiveFilters;

    const emptyIcon = document.createElement("div");
    emptyIcon.className = "app-grid__empty-icon";
    emptyIcon.appendChild(Icon(isCatalogEmpty ? "package" : "search", 20));
    empty.appendChild(emptyIcon);

    const emptyTitle = document.createElement("h2");
    emptyTitle.className = "app-grid__empty-title";
    emptyTitle.textContent = isCatalogEmpty
      ? "No applications published yet"
      : "No matching applications";
    empty.appendChild(emptyTitle);

    const emptyDesc = document.createElement("p");
    emptyDesc.className = "app-grid__empty-desc";
    if (isCatalogEmpty) {
      emptyDesc.textContent =
        "Vib Tools desktop applications and developer utilities will appear here once published.";
    } else if (searchQuery && searchQuery.trim()) {
      emptyDesc.textContent = `No applications matched "${searchQuery.trim()}" with the current filters.`;
    } else {
      emptyDesc.textContent = "No applications are currently available for this filter selection.";
    }
    empty.appendChild(emptyDesc);

    if (isCatalogEmpty) {
      const cliCta = Button({
        label: "CLI Installer Guide",
        icon: "terminal",
        variant: "secondary",
        size: "sm",
        onClick: () => navigate("/cli")
      });
      empty.appendChild(cliCta);
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
    // State D: Populated Reusable Application Cards (Real Catalog Data Only)
    filtered.forEach((app) => {
      const versionsObj = app.versions || {};
      const latestVersionObj = app.latest ? versionsObj[app.latest] : null;
      const pkgFormat = getPackageFormat(latestVersionObj);
      const platforms = getSupportedPlatforms(app);

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
        const accessBadge = Badge({
          text: app.access,
          variant: getAccessBadgeVariant(app.access)
        });
        headerEl.appendChild(accessBadge);
      }

      // MIDDLE ZONE: 2-line Clamped Description + Real Version/Platform/Package Metadata
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

      if (platforms.length > 0) {
        metaRow.appendChild(
          Badge({
            text: platforms.join(" · "),
            variant: "neutral",
            icon: "monitor"
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
      } else if (app.installer?.type) {
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

      // BOTTOM ZONE: Primary Details Action + Secondary CLI Install Action
      const footerEl = document.createElement("div");
      footerEl.className = "app-card__footer-inner";

      const detailsBtn = Button({
        label: "Details",
        variant: "primary",
        size: "sm",
        onClick: (e) => {
          e.stopPropagation();
          navigate(`/app/${app.slug}`);
        }
      });

      const installBtn = Button({
        label: "Install CLI",
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
            flashCopiedState(installBtn, "Install CLI", "terminal");
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
