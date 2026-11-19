import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.js";

/**
 * Creates a flat, accessible Button (or button-styled semantic Link when href is supplied).
 *
 * @param {Object} options
 * @param {string|Node} [options.label] - Text label or DOM node
 * @param {string|Node} [options.icon] - Icon name string or DOM node
 * @param {"default"|"primary"|"secondary"|"ghost"|"danger"} [options.variant="default"]
 * @param {"sm"|"md"|"lg"} [options.size="md"]
 * @param {boolean} [options.fullWidth=false]
 * @param {string} [options.href] - When provided, renders a semantic <a> styled as a button
 * @param {string} [options.target]
 * @param {string} [options.rel]
 * @param {Function} [options.onClick]
 * @param {"button"|"submit"|"reset"} [options.type="button"]
 * @param {string} [options.title]
 * @param {string} [options.className]
 * @param {boolean} [options.disabled=false]
 * @param {string} [options.ariaLabel]
 * @returns {HTMLButtonElement|HTMLAnchorElement}
 */
export function Button({
  label,
  icon,
  variant = "default",
  size = "md",
  fullWidth = false,
  href,
  target,
  rel,
  onClick,
  type = "button",
  title,
  className = "",
  disabled = false,
  ariaLabel
} = {}) {
  const isLink = typeof href === "string" && href.length > 0;
  const el = document.createElement(isLink ? "a" : "button");

  if (isLink) {
    el.href = href;
    if (target) el.target = target;
    if (rel) {
      el.rel = rel;
    } else if (target === "_blank") {
      el.rel = "noopener noreferrer";
    }
  } else {
    el.type = type;
    if (disabled) el.disabled = true;
  }

  const variantClass = variant !== "default" ? `ui-btn--${variant}` : "";
  const sizeClass = size === "sm" ? "ui-btn--sm" : size === "lg" ? "ui-btn--lg" : "ui-btn--md";

  el.className = cn("ui-btn", variantClass, sizeClass, fullWidth && "ui-btn--full", className);

  if (title) el.title = title;
  if (ariaLabel) el.setAttribute("aria-label", ariaLabel);

  if (icon) {
    const iconSize = size === "sm" ? 14 : 16;
    const iconEl = typeof icon === "string" ? Icon(icon, iconSize) : icon;
    el.appendChild(iconEl);
  }

  if (label) {
    if (typeof label === "string") {
      const span = document.createElement("span");
      span.textContent = label;
      el.appendChild(span);
    } else if (label instanceof Node) {
      el.appendChild(label);
    }
  }

  if (typeof onClick === "function") {
    el.addEventListener("click", onClick);
  }

  return el;
}
