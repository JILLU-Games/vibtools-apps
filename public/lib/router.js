/**
 * Client-side History API SPA Router.
 * Provides reload-safe URL routing and state preservation.
 */

const listeners = new Set();

/**
 * Parses the current window location pathname into a structured route object.
 *
 * @param {string} [pathname]
 * @returns {{ view: string, slug?: string, category?: string, path?: string }}
 */
export function parseRoute(pathname = window.location.pathname) {
  const pathOnly = (pathname || "").split("?")[0].split("#")[0];
  const clean = pathOnly.replace(/^\/+|\/+$/g, "");
  const segments = clean
    ? clean.split("/").map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch (_) {
          return segment;
        }
      })
    : [];

  if (segments.length === 0) {
    return { view: "home" };
  }

  if (segments[0] === "app" && segments[1]) {
    return { view: "app", slug: segments[1] };
  }

  if (segments[0] === "category" && segments[1]) {
    return { view: "category", category: segments[1] };
  }

  if (segments[0] === "cli") {
    return { view: "cli" };
  }

  return { view: "not-found", path: pathname };
}

/**
 * Returns the current active route object.
 * @returns {Object}
 */
export function getCurrentRoute() {
  if (typeof window === "undefined") {
    return { view: "home" };
  }
  return parseRoute(window.location.pathname);
}

/**
 * Navigates to a new application path using pushState.
 * @param {string} path
 */
export function navigate(path) {
  if (typeof window === "undefined") return;
  const currentFull = `${window.location.pathname}${window.location.search}`;
  if (currentFull === path) return;

  window.history.pushState({}, "", path);
  notifyListeners();
}

/**
 * Registers a callback invoked whenever the route changes (via navigate or popstate).
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function onRouteChange(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  const route = getCurrentRoute();
  listeners.forEach((callback) => {
    try {
      callback(route);
    } catch (err) {
      console.error("[Router Listener Error]", err);
    }
  });
}

// Setup popstate event listener on browser forward/back
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    notifyListeners();
  });

  // Global link interception for SPA navigation
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//") || href.startsWith("#") || href.startsWith("mailto:")) {
      return;
    }

    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || link.target === "_blank") {
      return;
    }

    e.preventDefault();
    navigate(href);
  });
}
