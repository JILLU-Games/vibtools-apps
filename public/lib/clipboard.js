/**
 * Clipboard copy helper with sandboxed-iframe fallback.
 * Uses the Async Clipboard API first and falls back to a visually hidden
 * off-screen textarea + execCommand("copy") if clipboard permissions are restricted.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (typeof text !== "string" || !text.length) return false;

  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Fall through to legacy textarea copy fallback for iframe/non-secure contexts
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    textarea.className = "ui-sr-copy";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return Boolean(ok);
  } catch (_) {
    return false;
  }
}
