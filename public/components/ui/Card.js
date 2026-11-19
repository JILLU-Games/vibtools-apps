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
  className = ""
} = {}) {
  const card = document.createElement("div");
  card.className = cn(
    "ui-card",
    clickable && "ui-card--clickable",
    className
  );

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
    card.addEventListener("click", onClick);
  }

  return card;
}
