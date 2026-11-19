import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.js";

/**
 * Creates a flat, accessible Input field element.
 *
 * @param {Object} options
 * @param {string} [options.placeholder]
 * @param {string} [options.value=""]
 * @param {string|Node} [options.icon] - Optional leading icon
 * @param {Function} [options.onInput]
 * @param {Function} [options.onKeyDown]
 * @param {string} [options.ariaLabel]
 * @param {string} [options.className=""]
 * @param {boolean} [options.autofocus=false]
 * @param {string} [options.name=""]
 * @param {string} [options.type="text"]
 * @returns {HTMLDivElement|HTMLInputElement}
 */
export function Input({
  placeholder = "",
  value = "",
  icon,
  onInput,
  onKeyDown,
  ariaLabel,
  className = "",
  autofocus = false,
  name = "",
  type = "text"
} = {}) {
  const input = document.createElement("input");
  input.type = type;
  input.className = "ui-input";
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  if (name) input.name = name;
  if (ariaLabel) input.setAttribute("aria-label", ariaLabel);
  if (autofocus) input.autofocus = true;

  if (typeof onInput === "function") {
    input.addEventListener("input", (e) => onInput(e.target.value, e));
  }

  if (typeof onKeyDown === "function") {
    input.addEventListener("keydown", onKeyDown);
  }

  // If leading icon is provided, wrap in an input container
  if (icon) {
    const wrap = document.createElement("div");
    wrap.className = cn("ui-input-wrap", "ui-input-wrap--with-icon", className);

    const iconEl = typeof icon === "string" ? Icon(icon, 14) : icon;
    iconEl.classList.add("ui-input__icon");
    wrap.appendChild(iconEl);
    wrap.appendChild(input);

    // Forward helper reference to inner input for caller focus/value manipulation
    wrap.input = input;
    return wrap;
  }

  input.className = cn("ui-input", className);
  return input;
}
