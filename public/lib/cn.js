/**
 * Combines multiple CSS class names into a single clean string.
 * Filters out falsy, null, or undefined values.
 *
 * @param {...(string|boolean|null|undefined)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes
    .flatMap((c) => (typeof c === "string" ? c.split(/\s+/) : c))
    .filter(Boolean)
    .join(" ");
}
