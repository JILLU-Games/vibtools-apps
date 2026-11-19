import { Card, Badge, Button, Icon, toast } from "../ui/index.js";
import { navigate } from "../../lib/router.js";

/**
 * App Catalog Grid Section.
 *
 * @param {Object} options
 * @param {Array<Object>} options.apps - Full list of app configurations
 * @param {Object} [options.route] - Current active route
 * @param {string} [options.searchQuery=""] - Live search filter query
 * @returns {HTMLElement}
 */
export function AppGrid({ apps = [], route = { view: "home" }, searchQuery = "" } = {}) {
  const container = document.createElement("div");
  container.className = "app-grid-section";

  // Filter apps
  let filtered = apps.slice();

  // Category filter
  if (route.view === "category" && route.category) {
    const targetCat = route.category.toLowerCase();
    filtered = filtered.filter(
      (app) => app.category && app.category.toLowerCase() === targetCat
    );
  }

  // Search filter
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter((app) => {
      const matchName = app.name && app.name.toLowerCase().includes(q);
      const matchSlug = app.slug && app.slug.toLowerCase().includes(q);
      const matchTag = app.tagline && app.tagline.toLowerCase().includes(q);
      const matchCat = app.category && app.category.toLowerCase().includes(q);
      return matchName || matchSlug || matchTag || matchCat;
    });
  }

  // Extract unique categories for mobile category bar
  const categories = Array.from(
    new Set(
      apps
        .map((a) => a.category)
        .filter((c) => typeof c === "string" && c.trim().length > 0)
    )
  ).sort();

  if (categories.length > 0) {
    const categoryBar = document.createElement("div");
    categoryBar.className = "app-category-bar";
    categoryBar.setAttribute("aria-label", "Filter by Category");

    const allChip = document.createElement("button");
    allChip.type = "button";
    allChip.className = `app-category-chip ${route.view === "home" && !route.category ? "is-active" : ""}`;
    allChip.textContent = "All Apps";
    allChip.addEventListener("click", () => navigate("/"));
    categoryBar.appendChild(allChip);

    categories.forEach((cat) => {
      const isCatActive =
        route.view === "category" &&
        route.category &&
        route.category.toLowerCase() === cat.toLowerCase();
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `app-category-chip ${isCatActive ? "is-active" : ""}`;
      chip.textContent = cat;
      chip.addEventListener("click", () =>
        navigate(`/category/${encodeURIComponent(cat.toLowerCase())}`)
      );
      categoryBar.appendChild(chip);
    });

    container.appendChild(categoryBar);
  }

  const grid = document.createElement("div");
  grid.className = "app-grid";

  // Pinned get.vib.tools Utility Banner (only when viewing all apps without search)
  if (route.view === "home" && !searchQuery) {
    const banner = document.createElement("div");
    banner.className = "app-cli-banner";

    const info = document.createElement("div");
    info.className = "app-cli-banner__info";
    info.appendChild(Icon("terminal", 16));

    const infoText = document.createElement("span");
    infoText.textContent = 'Terminal Install: irm "https://get.vib.tools/<slug>" | iex';
    info.appendChild(infoText);
    banner.appendChild(info);

    const bannerActions = document.createElement("div");
    bannerActions.className = "app-cli-banner__code";

    const copyBannerBtn = Button({
      label: "Copy Command",
      icon: "copy",
      size: "sm",
      variant: "secondary",
      onClick: async () => {
        try {
          await navigator.clipboard.writeText('irm "https://get.vib.tools/<slug>" | iex');
          toast.success("Installer template copied to clipboard");
        } catch (_) {
          toast.error("Failed to copy command to clipboard");
        }
      }
    });

    const guideBtn = Button({
      label: "CLI Guide",
      icon: "terminal",
      size: "sm",
      variant: "primary",
      onClick: () => navigate("/cli")
    });

    bannerActions.appendChild(copyBannerBtn);
    bannerActions.appendChild(guideBtn);
    banner.appendChild(bannerActions);

    grid.appendChild(banner);
  }

  // Render cards or empty message
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "app-grid__empty";
    empty.textContent = "No applications found";
    grid.appendChild(empty);
  } else {
    filtered.forEach((app) => {
      // Card Header: Name + Badges
      const headerEl = document.createElement("div");
      headerEl.className = "app-card__header-inner";

      const titleGroup = document.createElement("div");
      titleGroup.className = "app-card__title-group";

      const iconWrap = document.createElement("div");
      iconWrap.className = "app-card__icon";
      if (app.icon) {
        const img = document.createElement("img");
        img.src = app.icon;
        img.alt = `${app.name || app.slug} icon`;
        img.loading = "lazy";
        img.onerror = () => {
          iconWrap.innerHTML = "";
          iconWrap.appendChild(Icon("layers", 18));
        };
        iconWrap.appendChild(img);
      } else {
        iconWrap.appendChild(Icon("layers", 18));
      }
      titleGroup.appendChild(iconWrap);

      const nameEl = document.createElement("span");
      nameEl.className = "app-card__name";
      nameEl.textContent = app.name || app.slug;
      titleGroup.appendChild(nameEl);

      if (app.latest) {
        const verBadge = Badge({
          text: app.latest,
          variant: "accent"
        });
        titleGroup.appendChild(verBadge);
      }
      headerEl.appendChild(titleGroup);

      if (app.access) {
        const isFree = app.access.toLowerCase() === "free";
        const accessBadge = Badge({
          text: app.access,
          variant: isFree ? "success" : "warn"
        });
        headerEl.appendChild(accessBadge);
      }

      // Card Body: Tagline
      const bodyEl = document.createElement("div");
      bodyEl.className = "app-card__tagline";
      bodyEl.textContent = app.tagline || "";

      // Card Footer: Actions
      const footerEl = document.createElement("div");
      footerEl.className = "app-card__footer-inner";

      const installBtn = Button({
        label: "Install",
        icon: "terminal",
        variant: "primary",
        size: "sm",
        title: `Copy install command for ${app.name}`,
        onClick: async (e) => {
          e.stopPropagation();
          const cmd = `irm "https://get.vib.tools/${app.slug}" | iex`;
          try {
            await navigator.clipboard.writeText(cmd);
            toast.success(`Copied: ${cmd}`);
          } catch (_) {
            toast.error("Failed to copy install command");
          }
        }
      });

      const detailsBtn = Button({
        label: "Details",
        variant: "secondary",
        size: "sm",
        onClick: (e) => {
          e.stopPropagation();
          navigate(`/app/${app.slug}`);
        }
      });

      footerEl.appendChild(installBtn);
      footerEl.appendChild(detailsBtn);

      const card = Card({
        header: headerEl,
        body: bodyEl,
        footer: footerEl,
        clickable: true,
        onClick: () => navigate(`/app/${app.slug}`)
      });

      grid.appendChild(card);
    });
  }

  container.appendChild(grid);
  return container;
}
