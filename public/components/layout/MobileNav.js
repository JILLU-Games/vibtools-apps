import { Icon } from "../ui/index.js";
import { getTheme, toggleTheme } from "../../lib/theme.js";
import { toast } from "../ui/Toast.js";
import { navigate } from "../../lib/router.js";

/**
 * Mobile Bottom Navigation component.
 *
 * @param {Object} options
 * @param {Object} [options.activeRoute]
 * @returns {HTMLElement}
 */
export function MobileNav({ activeRoute = { view: "home" } } = {}) {
  const nav = document.createElement("nav");
  nav.className = "app-mobile-nav";
  nav.setAttribute("aria-label", "Mobile Navigation");

  const inner = document.createElement("div");
  inner.className = "app-mobile-nav__inner";

  // Apps item
  const appsItem = document.createElement("a");
  appsItem.href = "/";
  appsItem.className = "app-mobile-nav__item";
  appsItem.appendChild(Icon("grid", 18));
  const appsLabel = document.createElement("span");
  appsLabel.textContent = "Apps";
  appsItem.appendChild(appsLabel);
  appsItem.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/");
  });
  inner.appendChild(appsItem);

  // CLI item
  const cliItem = document.createElement("a");
  cliItem.href = "/cli";
  cliItem.className = "app-mobile-nav__item";
  cliItem.appendChild(Icon("terminal", 18));
  const cliLabel = document.createElement("span");
  cliLabel.textContent = "CLI";
  cliItem.appendChild(cliLabel);
  cliItem.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/cli");
  });
  inner.appendChild(cliItem);

  // Schema Docs item
  const schemaItem = document.createElement("a");
  schemaItem.href = "/schema";
  schemaItem.className = "app-mobile-nav__item";
  schemaItem.appendChild(Icon("file", 18));
  const schemaLabel = document.createElement("span");
  schemaLabel.textContent = "Schema";
  schemaItem.appendChild(schemaLabel);
  schemaItem.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/schema");
  });
  inner.appendChild(schemaItem);

  // Theme item
  let currentTheme = getTheme();
  const themeItem = document.createElement("button");
  themeItem.type = "button";
  themeItem.className = "app-mobile-nav__item";

  const themeIconWrap = document.createElement("div");
  themeIconWrap.appendChild(Icon(currentTheme === "dark" ? "sun" : "moon", 18));
  themeItem.appendChild(themeIconWrap);

  const themeLabel = document.createElement("span");
  themeLabel.textContent = "Theme";
  themeItem.appendChild(themeLabel);

  themeItem.addEventListener("click", () => {
    const next = toggleTheme();
    toast.info(`Theme set to ${next}`);
  });

  window.addEventListener("themechange", (e) => {
    currentTheme = e.detail.theme;
    themeIconWrap.innerHTML = "";
    themeIconWrap.appendChild(Icon(currentTheme === "dark" ? "sun" : "moon", 18));
  });

  inner.appendChild(themeItem);
  nav.appendChild(inner);

  function syncActive(route) {
    appsItem.classList.remove("is-active");
    appsItem.removeAttribute("aria-current");
    cliItem.classList.remove("is-active");
    cliItem.removeAttribute("aria-current");
    schemaItem.classList.remove("is-active");
    schemaItem.removeAttribute("aria-current");

    if (route.view === "home" || route.view === "category" || route.view === "app") {
      appsItem.classList.add("is-active");
      appsItem.setAttribute("aria-current", "page");
    } else if (route.view === "cli") {
      cliItem.classList.add("is-active");
      cliItem.setAttribute("aria-current", "page");
    } else if (route.view === "schema") {
      schemaItem.classList.add("is-active");
      schemaItem.setAttribute("aria-current", "page");
    }
  }

  syncActive(activeRoute);

  nav.updateActiveRoute = (newRoute) => {
    syncActive(newRoute);
  };

  return nav;
}
