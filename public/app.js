import { initTheme } from "./lib/theme.js";
import { getCurrentRoute, onRouteChange, navigate } from "./lib/router.js";
import { fetchAppsCatalog } from "./lib/api.js";
import { computeCategoryCounts } from "./lib/appMeta.js";
import { MainLayout } from "./components/layout/MainLayout.js";
import { AppGrid } from "./components/sections/AppGrid.js";
import { AppDetailView } from "./components/sections/AppDetailView.js";
import { CliGuideSection } from "./components/sections/CliGuideSection.js";
import { toast } from "./components/ui/Toast.js";

/**
 * Main Client Application Controller.
 */
async function bootstrap() {
  // 1. Initialize Theme
  initTheme();

  // 2. Register Service Worker (PWA offline shell)
  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[PWA SW Registration Warning]", err);
    });
  }

  // Application State
  let loadedApps = [];
  let isLoadingCatalog = true;
  const initialParams = new URLSearchParams(window.location.search);
  let currentSearchQuery = initialParams.get("q") || "";
  let activeAccessFilter = "all";
  let searchDebounceTimer = null;
  const initialRoute = getCurrentRoute();

  // Sync URL query param (?q=...) without triggering a full navigation
  function syncSearchQueryInUrl(query) {
    const url = new URL(window.location.href);
    const trimmed = (query || "").trim();
    if (trimmed) {
      url.searchParams.set("q", trimmed);
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  // 3. Mount Main Layout
  const layout = MainLayout({
    initialRoute,
    initialCategories: [],
    initialQuery: currentSearchQuery,
    onSearch: (query) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        currentSearchQuery = query;
        const route = getCurrentRoute();
        if (route.view !== "home" && route.view !== "category") {
          window.history.replaceState({}, "", "/");
        }
        syncSearchQueryInUrl(currentSearchQuery);
        renderCurrentView(getCurrentRoute());
      }, 150);
    }
  });

  const appRoot = document.getElementById("app");
  if (appRoot) {
    appRoot.appendChild(layout.element);
  }

  // 4. Dynamic Document Title Updater
  function updateDocumentTitle(route) {
    if (route.view === "app" && route.slug) {
      const found = loadedApps.find((a) => a.slug === route.slug);
      const appName = found?.name || route.slug;
      document.title = `${appName} — Vib Apps`;
    } else if (route.view === "category" && route.category) {
      const catName = route.category.charAt(0).toUpperCase() + route.category.slice(1);
      document.title = `${catName} — Vib Apps`;
    } else if (route.view === "cli") {
      document.title = "CLI Guide — Vib Apps";
    } else {
      document.title = "Vib Apps — Apps Catalog & Edge Installer";
    }
  }

  function resetAllFilters() {
    currentSearchQuery = "";
    activeAccessFilter = "all";
    layout.resetSearch();
    const route = getCurrentRoute();
    if (route.view === "category") {
      navigate("/");
    } else {
      syncSearchQueryInUrl("");
      renderCurrentView(getCurrentRoute());
    }
  }

  // 5. View Renderer
  function renderCurrentView(route) {
    updateDocumentTitle(route);
    layout.updateActiveRoute(route);
    layout.viewRoot.innerHTML = "";

    switch (route.view) {
      case "home":
      case "category": {
        const grid = AppGrid({
          apps: loadedApps,
          route,
          searchQuery: currentSearchQuery,
          activeAccess: activeAccessFilter,
          isLoading: isLoadingCatalog,
          onAccessChange: (nextAccess) => {
            activeAccessFilter = nextAccess;
            renderCurrentView(getCurrentRoute());
          },
          onResetFilters: resetAllFilters
        });
        layout.viewRoot.appendChild(grid);
        break;
      }

      case "app": {
        const detail = AppDetailView({ slug: route.slug });
        layout.viewRoot.appendChild(detail);
        break;
      }

      case "cli": {
        const cliGuide = CliGuideSection();
        layout.viewRoot.appendChild(cliGuide);
        break;
      }

      default: {
        const notFound = document.createElement("div");
        notFound.className = "app-grid__empty";
        notFound.textContent = `Route not found: ${route.path || ""}`;
        layout.viewRoot.appendChild(notFound);
        break;
      }
    }
  }

  // 6. Subscribe to Route Changes (Browser Back/Forward & navigate calls)
  onRouteChange((newRoute) => {
    if (newRoute.view !== "home" && newRoute.view !== "category") {
      currentSearchQuery = "";
      activeAccessFilter = "all";
      layout.resetSearch();
    }
    renderCurrentView(newRoute);
  });

  // Render initial loading state immediately so first paint is never empty
  renderCurrentView(initialRoute);

  // 7. Fetch Catalog
  try {
    const catalogData = await fetchAppsCatalog();
    loadedApps = catalogData.apps || [];
    isLoadingCatalog = false;

    const { categories, counts, total } = computeCategoryCounts(loadedApps);
    layout.updateCategories(categories, counts, total);

    // Re-render home/category once catalog resolves; leave in-progress detail/cli views undisturbed
    const activeRoute = getCurrentRoute();
    if (activeRoute.view === "home" || activeRoute.view === "category") {
      renderCurrentView(activeRoute);
    } else {
      updateDocumentTitle(activeRoute);
    }
  } catch (err) {
    console.error("[Catalog Load Error]", err);
    isLoadingCatalog = false;
    toast.error(err.message || "Failed to load apps catalog");
    const activeRoute = getCurrentRoute();
    if (activeRoute.view === "home" || activeRoute.view === "category") {
      renderCurrentView(activeRoute);
    }
  }
}

// Start application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
