import { Icon } from "./Icon.js";

let activeModalEl = null;
let activeOnClose = null;

function handleKeyDown(e) {
  if (e.key === "Escape") {
    closeModal();
  }
}

/**
 * Closes the currently active modal dialog.
 */
export function closeModal() {
  if (!activeModalEl) return;

  if (typeof activeOnClose === "function") {
    try {
      activeOnClose();
    } catch (err) {
      console.error("[Modal onClose Error]", err);
    }
  }

  window.removeEventListener("keydown", handleKeyDown);
  document.body.classList.remove("ui-no-scroll");

  if (activeModalEl.parentNode) {
    activeModalEl.parentNode.removeChild(activeModalEl);
  }

  activeModalEl = null;
  activeOnClose = null;
}

/**
 * Opens a modal dialog with header, body content, and optional footer.
 *
 * @param {Object} options
 * @param {string|Node} options.title - Header title
 * @param {string|Node} options.content - Body content
 * @param {string|Node} [options.footer] - Optional footer actions
 * @param {Function} [options.onClose] - Cleanup callback on dismissal
 * @returns {HTMLDivElement} Backdrop container element
 */
export function openModal({ title, content, footer, onClose } = {}) {
  // Close any existing modal first
  if (activeModalEl) {
    closeModal();
  }

  activeOnClose = onClose;

  const backdrop = document.createElement("div");
  backdrop.className = "ui-modal-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  const modal = document.createElement("div");
  modal.className = "ui-modal";

  // Modal Header
  const headerEl = document.createElement("div");
  headerEl.className = "ui-modal__header";

  const titleEl = document.createElement("h2");
  titleEl.className = "ui-modal__title";
  if (typeof title === "string") {
    titleEl.textContent = title;
  } else if (title instanceof Node) {
    titleEl.appendChild(title);
  }
  headerEl.appendChild(titleEl);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ui-modal__close";
  closeBtn.setAttribute("aria-label", "Close modal");
  closeBtn.appendChild(Icon("close", 16));
  closeBtn.addEventListener("click", closeModal);
  headerEl.appendChild(closeBtn);

  modal.appendChild(headerEl);

  // Modal Body
  const bodyEl = document.createElement("div");
  bodyEl.className = "ui-modal__body";
  if (typeof content === "string") {
    if (typeof window !== "undefined" && window.DOMPurify) {
      bodyEl.innerHTML = window.DOMPurify.sanitize(content);
    } else {
      bodyEl.textContent = content;
    }
  } else if (content instanceof Node) {
    bodyEl.appendChild(content);
  }
  modal.appendChild(bodyEl);

  // Modal Footer (Optional)
  if (footer) {
    const footerEl = document.createElement("div");
    footerEl.className = "ui-modal__footer";
    if (typeof footer === "string") {
      if (typeof window !== "undefined" && window.DOMPurify) {
        footerEl.innerHTML = window.DOMPurify.sanitize(footer);
      } else {
        footerEl.textContent = footer;
      }
    } else if (footer instanceof Node) {
      footerEl.appendChild(footer);
    }
    modal.appendChild(footerEl);
  }

  backdrop.appendChild(modal);

  // Click on backdrop (outside modal) closes it
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      closeModal();
    }
  });

  // Attach Escape key listener
  window.addEventListener("keydown", handleKeyDown);

  // Prevent background scrolling
  document.body.classList.add("ui-no-scroll");

  document.body.appendChild(backdrop);
  activeModalEl = backdrop;

  return backdrop;
}

/**
 * Functional and object alias for Modal manipulation.
 */
export const Modal = Object.assign(openModal, {
  open: openModal,
  close: closeModal
});
