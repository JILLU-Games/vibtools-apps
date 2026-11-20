import { Icon } from "../ui/index.js";
import { navigate } from "../../lib/router.js";

/**
 * Desktop Sidebar component for navigation, dynamic category filters with real counts,
 * and external Vib Tools resources.
 *
 * @param {Object} options
 * @param {Object} [options.activeRoute]
 * @param {Array<string>} [options.categories]
 * @param {Record<string, number>} [options.categoryCounts]
 * @param {number} [options.totalCount=0]
 * @returns {HTMLElement}
 */
export function Sidebar({
  activeRoute = { view: "home" },
  categories = [],
  categoryCounts = {},
  totalCount = 0
} = {}) {
  const sidebar = document.createElement("aside");
  sidebar.className = "app-sidebar";
  sidebar.setAttribute("aria-label", "Marketplace Navigation");

  // 1. Discover section
  const discoverSection = document.createElement("nav");
  discoverSection.className = "app-sidebar__section";
  discoverSection.setAttribute("aria-label", "Discover");

  const discoverTitle = document.createElement("div");
  discoverTitle.className = "app-sidebar__title";
  discoverTitle.textContent = "Discover";
  discoverSection.appendChild(discoverTitle);

  // All Apps link with real catalog total
  const allAppsLink = document.createElement("a");
  allAppsLink.href = "/";
  allAppsLink.className = "app-sidebar__link";
  allAppsLink.appendChild(Icon("grid", 15));

  const allAppsText = document.createElement("span");
  allAppsText.className = "app-sidebar__link-label";
  allAppsText.textContent = "All Apps";
  allAppsLink.appendChild(allAppsText);

  const totalCountEl = document.createElement("span");
  totalCountEl.className = "app-sidebar__count";
  totalCountEl.textContent = totalCount > 0 ? String(totalCount) : "";
  if (totalCount === 0) totalCountEl.classList.add("ui-hidden");
  allAppsLink.appendChild(totalCountEl);

  allAppsLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/");
  });
  discoverSection.appendChild(allAppsLink);

  // CLI Installer link
  const cliLink = document.createElement("a");
  cliLink.href = "/cli";
  cliLink.className = "app-sidebar__link";
  cliLink.appendChild(Icon("terminal", 15));

  const cliText = document.createElement("span");
  cliText.className = "app-sidebar__link-label";
  cliText.textContent = "CLI Installer";
  cliLink.appendChild(cliText);

  cliLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/cli");
  });
  discoverSection.appendChild(cliLink);

  sidebar.appendChild(discoverSection);

  // 2. Categories section
  const catSection = document.createElement("nav");
  catSection.className = "app-sidebar__section";
  catSection.setAttribute("aria-label", "Categories");

  const catTitle = document.createElement("div");
  catTitle.className = "app-sidebar__title";
  catTitle.textContent = "Categories";
  catSection.appendChild(catTitle);

  const catListContainer = document.createElement("div");
  catListContainer.className = "app-sidebar__list";
  catSection.appendChild(catListContainer);

  sidebar.appendChild(catSection);

  // 3. Resources section
  const resourcesSection = document.createElement("nav");
  resourcesSection.className = "app-sidebar__section app-sidebar__section--bottom";
  resourcesSection.setAttribute("aria-label", "Resources");

  const resourcesTitle = document.createElement("div");
  resourcesTitle.className = "app-sidebar__title";
  resourcesTitle.textContent = "Resources";
  resourcesSection.appendChild(resourcesTitle);

  const resourceLinks = [
    { label: "Documentation", href: "https://docs.vib.tools", icon: "book" },
    { label: "Edge Installer", href: "https://get.vib.tools", icon: "globe" }
  ];

  resourceLinks.forEach((item) => {
    const extLink = document.createElement("a");
    extLink.href = item.href;
    extLink.target = "_blank";
    extLink.rel = "noopener noreferrer";
    extLink.className = "app-sidebar__link app-sidebar__link--external";
    extLink.appendChild(Icon(item.icon, 15));

    const labelSpan = document.createElement("span");
    labelSpan.className = "app-sidebar__link-label";
    labelSpan.textContent = item.label;
    extLink.appendChild(labelSpan);

    extLink.appendChild(Icon("external", 12));
    resourcesSection.appendChild(extLink);
  });

  sidebar.appendChild(resourcesSection);

  function renderCategories(list, counts = {}) {
    catListContainer.innerHTML = "";
    if (!Array.isArray(list) || list.length === 0) {
      catSection.classList.add("ui-hidden");
      return;
    }
    catSection.classList.remove("ui-hidden");
    list.forEach((cat) => {
      const link = document.createElement("a");
      const path = `/category/${encodeURIComponent(cat.toLowerCase())}`;
      link.href = path;
      link.className = "app-sidebar__link";
      link.dataset.category = cat.toLowerCase();

      link.appendChild(Icon("layers", 15));

      const span = document.createElement("span");
      span.className = "app-sidebar__link-label";
      span.textContent = cat;
      link.appendChild(span);

      if (typeof counts[cat] === "number") {
        const countEl = document.createElement("span");
        countEl.className = "app-sidebar__count";
        countEl.textContent = String(counts[cat]);
        link.appendChild(countEl);
      }

      link.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(path);
      });

      catListContainer.appendChild(link);
    });
  }

  function syncActive(route) {
    allAppsLink.classList.remove("is-active");
    allAppsLink.removeAttribute("aria-current");
    cliLink.classList.remove("is-active");
    cliLink.removeAttribute("aria-current");

    const categoryLinks = catListContainer.querySelectorAll(".app-sidebar__link");
    categoryLinks.forEach((l) => {
      l.classList.remove("is-active");
      l.removeAttribute("aria-current");
    });

    if (route.view === "home") {
      allAppsLink.classList.add("is-active");
      allAppsLink.setAttribute("aria-current", "page");
    } else if (route.view === "cli") {
      cliLink.classList.add("is-active");
      cliLink.setAttribute("aria-current", "page");
    } else if (route.view === "category" && route.category) {
      const safeCat = CSS.escape(route.category.toLowerCase());
      const target = catListContainer.querySelector(
        `[data-category="${safeCat}"]`
      );
      if (target) {
        target.classList.add("is-active");
        target.setAttribute("aria-current", "page");
      }
    }
  }

  renderCategories(categories || [], categoryCounts);

  syncActive(activeRoute);

  sidebar.updateCategories = (newCategories, newCounts = {}, newTotal = 0) => {
    if (typeof newTotal === "number" && newTotal > 0) {
      totalCountEl.textContent = String(newTotal);
      totalCountEl.classList.remove("ui-hidden");
    } else {
      totalCountEl.textContent = "";
      totalCountEl.classList.add("ui-hidden");
    }
    renderCategories(newCategories, newCounts);
    syncActive(activeRoute);
  };

  sidebar.updateActiveRoute = (newRoute) => {
    activeRoute = newRoute;
    syncActive(newRoute);
  };

  return sidebar;
}
