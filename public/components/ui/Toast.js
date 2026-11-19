import { Icon } from "./Icon.js";

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement("div");
    toastContainer.className = "ui-toast-stack";
    toastContainer.setAttribute("aria-live", "polite");
    toastContainer.setAttribute("aria-atomic", "true");
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Creates and renders a toast notification into the global toast stack.
 *
 * @param {string} message
 * @param {"success"|"error"|"info"} [type="info"]
 * @param {number} [duration=3500]
 */
function showToast(message, type = "info", duration = 3500) {
  if (typeof document === "undefined") return;

  const container = ensureContainer();

  const toastEl = document.createElement("div");
  toastEl.className = `ui-toast ui-toast--${type}`;
  toastEl.setAttribute("role", "status");

  // Icon mapping
  const iconName = type === "success" ? "check" : type === "error" ? "alert" : "info";
  const iconWrap = document.createElement("div");
  iconWrap.className = "ui-toast__icon";
  iconWrap.appendChild(Icon(iconName, 15));
  toastEl.appendChild(iconWrap);

  // Message text
  const msgEl = document.createElement("div");
  msgEl.className = "ui-toast__msg";
  msgEl.textContent = String(message || "");
  toastEl.appendChild(msgEl);

  // Click to dismiss immediately
  toastEl.addEventListener("click", () => dismissToast(toastEl));

  container.appendChild(toastEl);

  // Auto dismiss timer
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(toastEl);
    }, duration);
  }

  return toastEl;
}

function dismissToast(el) {
  if (!el || !el.parentNode) return;
  el.classList.add("ui-toast--dismissing");
  setTimeout(() => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }, 160);
}

/**
 * Global Toast API reporting real, accurate feedback.
 */
export const toast = {
  /**
   * Reports a verified success action (e.g. copied to clipboard).
   * @param {string} msg
   * @param {number} [duration=3500]
   */
  success(msg, duration = 3500) {
    return showToast(msg, "success", duration);
  },

  /**
   * Reports an exact failure or network error.
   * @param {string} msg
   * @param {number} [duration=4500]
   */
  error(msg, duration = 4500) {
    return showToast(msg, "error", duration);
  },

  /**
   * Reports informational state changes (e.g. theme switch).
   * @param {string} msg
   * @param {number} [duration=3500]
   */
  info(msg, duration = 3500) {
    return showToast(msg, "info", duration);
  }
};
