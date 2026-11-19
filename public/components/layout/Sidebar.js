import { Icon } from "../ui/index.js";
import { navigate } from "../../lib/router.js";

/**
 * Desktop Sidebar component for navigation and dynamic category filters.
 *
 * @param {Object} options
 * @param {Object} [options.activeRoute]
 * @param {Array<string>} [options.categories]
 * @returns {HTMLElement}
 */
export function Sidebar({ activeRoute = { view: "home" }, categories = [] } = {}) {
  const sidebar = document.createElement("aside");
  sidebar.className = "app-sidebar";

  const navSection = document.createElement("div");
  navSection.className = "app-sidebar__section";

  // All Apps link
  const allAppsLink = document.createElement("a");
  allAppsLink.href = "/";
  allAppsLink.className = "app-sidebar__link";
  allAppsLink.appendChild(Icon("grid", 16));
  const allAppsText = document.createElement("span");
  allAppsText.textContent = "All Apps";
  allAppsLink.appendChild(allAppsText);
  allAppsLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/");
  });
  navSection.appendChild(allAppsLink);

  // CLI Installer link
  const cliLink = document.createElement("a");
  cliLink.href = "/cli";
  cliLink.className = "app-sidebar__link";
  cliLink.appendChild(Icon("terminal", 16));
  const cliText = document.createElement("span");
  cliText.textContent = "CLI Installer";
  cliLink.appendChild(cliText);
  cliLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/cli");
  });
  navSection.appendChild(cliLink);

  sidebar.appendChild(navSection);

  // Categories section
  const catSection = document.createElement("div");
  catSection.className = "app-sidebar__section";

  const catTitle = document.createElement("div");
  catTitle.className = "app-sidebar__title";
  catTitle.textContent = "Categories";
  catSection.appendChild(catTitle);

  const catListContainer = document.createElement("div");
  catListContainer.className = "app-sidebar__section";
  catSection.appendChild(catListContainer);

  sidebar.appendChild(catSection);

  function renderCategories(list) {
    catListContainer.innerHTML = "";
    list.forEach((cat) => {
      const link = document.createElement("a");
      const path = `/category/${encodeURIComponent(cat.toLowerCase())}`;
      link.href = path;
      link.className = "app-sidebar__link";
      link.dataset.category = cat.toLowerCase();

      link.appendChild(Icon("layers", 14));
      const span = document.createElement("span");
      span.textContent = cat;
      link.appendChild(span);

      link.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(path);
      });

      catListContainer.appendChild(link);
    });
  }

  function syncActive(route) {
    allAppsLink.classList.remove("is-active");
    cliLink.classList.remove("is-active");

    const categoryLinks = catListContainer.querySelectorAll(".app-sidebar__link");
    categoryLinks.forEach((l) => l.classList.remove("is-active"));

    if (route.view === "home") {
      allAppsLink.classList.add("is-active");
    } else if (route.view === "cli") {
      cliLink.classList.add("is-active");
    } else if (route.view === "category" && route.category) {
      const safeCat = CSS.escape(route.category.toLowerCase());
      const target = catListContainer.querySelector(
        `[data-category="${safeCat}"]`
      );
      if (target) {
        target.classList.add("is-active");
      }
    }
  }

  if (categories && categories.length > 0) {
    renderCategories(categories);
  }

  syncActive(activeRoute);

  sidebar.updateCategories = (newCategories) => {
    renderCategories(newCategories);
    syncActive(activeRoute);
  };

  sidebar.updateActiveRoute = (newRoute) => {
    activeRoute = newRoute;
    syncActive(newRoute);
  };

  return sidebar;
}
