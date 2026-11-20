import { Header } from "./Header.js";
import { Sidebar } from "./Sidebar.js";
import { MobileNav } from "./MobileNav.js";
import { Footer } from "./Footer.js";

/**
 * Main Layout component integrating Header, Sidebar, Viewport, Footer, and MobileNav.
 *
 * @param {Object} options
 * @param {Object} [options.initialRoute]
 * @param {Array<string>} [options.initialCategories]
 * @param {Function} [options.onSearch]
 * @returns {{ element: HTMLElement, viewRoot: HTMLElement, updateActiveRoute: Function, updateCategories: Function, resetSearch: Function }}
 */
export function MainLayout({ initialRoute, initialCategories, initialQuery = "", onSearch } = {}) {
  const shell = document.createElement("div");
  shell.className = "app-shell";

  const header = Header({ onSearch, initialQuery });
  shell.appendChild(header);

  const body = document.createElement("div");
  body.className = "app-body";

  const sidebar = Sidebar({ activeRoute: initialRoute, categories: initialCategories });
  body.appendChild(sidebar);

  const viewRoot = document.createElement("main");
  viewRoot.id = "view-root";
  viewRoot.className = "app-main";
  body.appendChild(viewRoot);

  shell.appendChild(body);

  const footer = Footer();
  shell.appendChild(footer);

  const mobileNav = MobileNav({ activeRoute: initialRoute });
  shell.appendChild(mobileNav);

  return {
    element: shell,
    viewRoot,
    updateActiveRoute(route) {
      sidebar.updateActiveRoute(route);
      mobileNav.updateActiveRoute(route);
    },
    updateCategories(categories, counts = {}, total = 0) {
      sidebar.updateCategories(categories, counts, total);
    },
    resetSearch() {
      if (header.searchInput) {
        header.searchInput.value = "";
        if (typeof header.syncSearchUi === "function") header.syncSearchUi();
      }
    },
    setSearchValue(value) {
      if (header.searchInput) {
        header.searchInput.value = value || "";
        if (typeof header.syncSearchUi === "function") header.syncSearchUi();
      }
    }
  };
}
