import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.js";

/**
 * Creates a flat, accessible Button element.
 *
 * @param {Object} options
 * @param {string|Node} [options.label] - Text label or DOM node
 * @param {string|Node} [options.icon] - Icon name string or DOM node
 * @param {"default"|"primary"|"secondary"|"ghost"|"danger"} [options.variant="default"]
 * @param {"sm"|"md"} [options.size="md"]
 * @param {Function} [options.onClick]
 * @param {"button"|"submit"|"reset"} [options.type="button"]
 * @param {string} [options.title]
 * @param {string} [options.className]
 * @param {boolean} [options.disabled=false]
 * @param {string} [options.ariaLabel]
 * @returns {HTMLButtonElement}
 */
export function Button({
  label,
  icon,
  variant = "default",
  size = "md",
  onClick,
  type = "button",
  title,
  className = "",
  disabled = false,
  ariaLabel
} = {}) {
  const btn = document.createElement("button");
  btn.type = type;

  const variantClass = variant !== "default" ? `ui-btn--${variant}` : "";
  const sizeClass = size === "sm" ? "ui-btn--sm" : "ui-btn--md";

  btn.className = cn("ui-btn", variantClass, sizeClass, className);

  if (title) btn.title = title;
  if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
  if (disabled) btn.disabled = true;

  if (icon) {
    const iconEl = typeof icon === "string" ? Icon(icon, size === "sm" ? 14 : 16) : icon;
    btn.appendChild(iconEl);
  }

  if (label) {
    if (typeof label === "string") {
      const span = document.createElement("span");
      span.textContent = label;
      btn.appendChild(span);
    } else if (label instanceof Node) {
      btn.appendChild(label);
    }
  }

  if (typeof onClick === "function") {
    btn.addEventListener("click", onClick);
  }

  return btn;
}
