import { Icon, Button, Input } from "../ui/index.js";
import { getTheme, toggleTheme } from "../../lib/theme.js";
import { toast } from "../ui/Toast.js";
import { navigate } from "../../lib/router.js";

/**
 * Global Header component.
 *
 * @param {Object} options
 * @param {Function} [options.onSearch] - Live search callback receiving search query
 * @param {string} [options.initialQuery=""] - Initial query string (e.g. from ?q=)
 * @returns {HTMLElement}
 */
export function Header({ onSearch, initialQuery = "" } = {}) {
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
  logoImg.alt = "";
  logoImg.width = 24;
  logoImg.height = 24;
  logoImg.className = "app-header__logo-img";
  logoImg.onerror = () => {
    logoImg.replaceWith(Icon("layers", 20));
  };

  const logoText = document.createElement("span");
  logoText.className = "app-header__logo-text";
  logoText.textContent = "Vib Apps";

  logo.appendChild(logoImg);
  logo.appendChild(logoText);
  logo.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/");
  });
  inner.appendChild(logo);

  // Center: Search Input with '/' keyboard cue
  const searchWrap = document.createElement("div");
  searchWrap.className = "app-header__search";

  const searchInput = Input({
    placeholder: "Search applications...",
    value: initialQuery,
    icon: "search",
    ariaLabel: "Search applications",
    className: "app-header__search-field",
    onInput: (val) => {
      if (typeof onSearch === "function") {
        onSearch(val);
      }
    }
  });

  const shortcutHint = document.createElement("kbd");
  shortcutHint.className = "app-header__shortcut";
  shortcutHint.textContent = "/";
  shortcutHint.setAttribute("aria-hidden", "true");
  searchInput.appendChild(shortcutHint);

  // Global '/' keyboard shortcut to focus search input (guarded against open modals)
  window.addEventListener("keydown", (e) => {
    const hasOpenModal = !!document.querySelector(".ui-modal, .ui-modal-backdrop");
    const activeTag = document.activeElement?.tagName;
    if (
      e.key === "/" &&
      !hasOpenModal &&
      activeTag !== "INPUT" &&
      activeTag !== "TEXTAREA" &&
      activeTag !== "SELECT"
    ) {
      e.preventDefault();
      const inputEl = searchInput.input || searchInput;
      inputEl.focus();
      inputEl.select();
    }
  });

  searchWrap.appendChild(searchInput);
  inner.appendChild(searchWrap);

  // Right: Actions (Semantic Docs link + Theme Toggle)
  const actions = document.createElement("div");
  actions.className = "app-header__actions";

  const docsLink = Button({
    label: "Docs",
    icon: "book",
    variant: "ghost",
    size: "md",
    href: "https://docs.vib.tools",
    target: "_blank",
    rel: "noopener noreferrer",
    title: "Open Vib Tools Documentation",
    className: "app-header__docs-btn"
  });
  actions.appendChild(docsLink);

  let currentTheme = getTheme();
  const themeBtn = Button({
    icon: currentTheme === "dark" ? "sun" : "moon",
    variant: "ghost",
    size: "md",
    title: `Switch to ${currentTheme === "dark" ? "light" : "dark"} theme`,
    ariaLabel: `Switch to ${currentTheme === "dark" ? "light" : "dark"} theme`,
    className: "app-header__theme-btn",
    onClick: () => {
      const nextTheme = toggleTheme();
      toast.info(`Theme set to ${nextTheme}`);
    }
  });

  window.addEventListener("themechange", (e) => {
    currentTheme = e.detail.theme;
    themeBtn.innerHTML = "";
    themeBtn.appendChild(Icon(currentTheme === "dark" ? "sun" : "moon", 16));
    const nextLabel = `Switch to ${currentTheme === "dark" ? "light" : "dark"} theme`;
    themeBtn.title = nextLabel;
    themeBtn.setAttribute("aria-label", nextLabel);
  });

  actions.appendChild(themeBtn);
  inner.appendChild(actions);

  header.appendChild(inner);

  // Expose search input element for syncing/resetting
  header.searchInput = searchInput.input || searchInput;

  return header;
}
