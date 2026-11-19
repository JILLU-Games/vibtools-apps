import { Icon, Button, Input } from "../ui/index.js";
import { getTheme, toggleTheme } from "../../lib/theme.js";
import { toast } from "../ui/Toast.js";
import { navigate } from "../../lib/router.js";

/**
 * Global Header component.
 *
 * @param {Object} options
 * @param {Function} [options.onSearch] - Live search callback receiving search query
 * @returns {HTMLElement}
 */
export function Header({ onSearch } = {}) {
  const header = document.createElement("header");
  header.className = "app-header";

  const inner = document.createElement("div");
  inner.className = "app-header__inner";

  // Left: Brand
  const logo = document.createElement("a");
  logo.href = "/";
  logo.className = "app-header__logo";
  logo.setAttribute("aria-label", "Vib Apps Home");

  const logoImg = document.createElement("img");
  logoImg.src = "/vib.tools.Branding/favicon.svg";
  logoImg.alt = "Vib Tools";
  logoImg.width = 22;
  logoImg.height = 22;
  logoImg.className = "app-header__logo-img";
  logoImg.onerror = () => {
    logoImg.replaceWith(Icon("layers", 18));
  };

  const logoText = document.createElement("span");
  logoText.textContent = "Vib Apps";

  logo.appendChild(logoImg);
  logo.appendChild(logoText);
  logo.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/");
  });
  inner.appendChild(logo);

  // Center: Search Input
  const searchWrap = document.createElement("div");
  searchWrap.className = "app-header__search";

  const searchInput = Input({
    placeholder: "Search apps... (Press / to focus)",
    icon: "search",
    ariaLabel: "Search apps",
    onInput: (val) => {
      if (typeof onSearch === "function") {
        onSearch(val);
      }
    }
  });

  // Global '/' keyboard shortcut to focus search input (guarded against open modals)
  window.addEventListener("keydown", (e) => {
    const hasOpenModal = !!document.querySelector(".ui-modal, .ui-modal-backdrop");
    if (
      e.key === "/" &&
      !hasOpenModal &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA"
    ) {
      e.preventDefault();
      const inputEl = searchInput.input || searchInput;
      inputEl.focus();
      inputEl.select();
    }
  });

  searchWrap.appendChild(searchInput);
  inner.appendChild(searchWrap);

  // Right: Actions (Docs link + Theme Toggle)
  const actions = document.createElement("div");
  actions.className = "app-header__actions";

  // Docs external button
  const docsBtn = Button({
    label: "Docs",
    icon: "external",
    variant: "ghost",
    size: "sm",
    title: "Open docs.vib.tools",
    onClick: () => {
      window.open("https://docs.vib.tools", "_blank", "noopener,noreferrer");
    }
  });
  actions.appendChild(docsBtn);

  // Theme toggle button
  let currentTheme = getTheme();
  const themeBtn = Button({
    icon: currentTheme === "dark" ? "sun" : "moon",
    variant: "ghost",
    size: "sm",
    title: `Switch to ${currentTheme === "dark" ? "light" : "dark"} theme`,
    ariaLabel: "Toggle theme",
    onClick: () => {
      const nextTheme = toggleTheme();
      toast.info(`Theme set to ${nextTheme}`);
    }
  });

  // Sync icon on theme change
  window.addEventListener("themechange", (e) => {
    currentTheme = e.detail.theme;
    themeBtn.innerHTML = "";
    themeBtn.appendChild(Icon(currentTheme === "dark" ? "sun" : "moon", 14));
    themeBtn.title = `Switch to ${currentTheme === "dark" ? "light" : "dark"} theme`;
  });

  actions.appendChild(themeBtn);
  inner.appendChild(actions);

  header.appendChild(inner);

  // Expose search input element for resetting
  header.searchInput = searchInput.input || searchInput;

  return header;
}
