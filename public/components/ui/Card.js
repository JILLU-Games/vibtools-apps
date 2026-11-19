import { cn } from "../../lib/cn.js";

/**
 * Creates a flat surface Card component.
 *
 * @param {Object} options
 * @param {Node|string} [options.header]
 * @param {Node|string} [options.body]
 * @param {Node|string} [options.footer]
 * @param {boolean} [options.clickable=false]
 * @param {Function} [options.onClick]
 * @param {string} [options.className=""]
 * @returns {HTMLDivElement}
 */
export function Card({
  header,
  body,
  footer,
  clickable = false,
  onClick,
  ariaLabel,
  className = ""
} = {}) {
  const card = document.createElement("article");
  card.className = cn(
    "ui-card",
    clickable && "ui-card--clickable",
    className
  );

  if (ariaLabel) {
    card.setAttribute("aria-label", ariaLabel);
  }

  if (header) {
    const headEl = document.createElement("div");
    headEl.className = "ui-card__header";
    if (typeof header === "string") {
      headEl.textContent = header;
    } else if (header instanceof Node) {
      headEl.appendChild(header);
    }
    card.appendChild(headEl);
  }

  if (body) {
    const bodyEl = document.createElement("div");
    bodyEl.className = "ui-card__body";
    if (typeof body === "string") {
      bodyEl.textContent = body;
    } else if (body instanceof Node) {
      bodyEl.appendChild(body);
    }
    card.appendChild(bodyEl);
  }

  if (footer) {
    const footEl = document.createElement("div");
    footEl.className = "ui-card__footer";
    if (typeof footer === "string") {
      footEl.textContent = footer;
    } else if (footer instanceof Node) {
      footEl.appendChild(footer);
    }
    card.appendChild(footEl);
  }

  if (clickable && typeof onClick === "function") {
    card.tabIndex = 0;
    card.addEventListener("click", (e) => {
      if (e.target.closest("button, a, input, select, textarea")) return;
      onClick(e);
    });
    card.addEventListener("keydown", (e) => {
      if (e.target !== card) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(e);
      }
    });
  }

  return card;
}
