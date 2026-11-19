import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.js";

/**
 * Creates a flat Badge pill element.
 *
 * @param {Object} options
 * @param {string} options.text - Badge label text
 * @param {"neutral"|"accent"|"success"|"warn"} [options.variant="neutral"]
 * @param {string|Node} [options.icon] - Optional leading icon
 * @param {string} [options.className=""]
 * @returns {HTMLSpanElement}
 */
export function Badge({
  text,
  variant = "neutral",
  icon,
  className = ""
} = {}) {
  const span = document.createElement("span");
  span.className = cn("ui-badge", `ui-badge--${variant}`, className);

  if (icon) {
    const iconEl = typeof icon === "string" ? Icon(icon, 12) : icon;
    span.appendChild(iconEl);
  }

  const textNode = document.createTextNode(text || "");
  span.appendChild(textNode);

  return span;
}
