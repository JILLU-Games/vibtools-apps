import { initTheme } from "./lib/theme.js";
import { getCurrentRoute, onRouteChange, navigate } from "./lib/router.js";
import { fetchAppsCatalog } from "./lib/api.js";
import { computeCategoryCounts } from "./lib/appMeta.js";
import { MainLayout } from "./components/layout/MainLayout.js";
import { AppGrid } from "./components/sections/AppGrid.js";
import { AppDetailView } from "./components/sections/AppDetailView.js";
import { CliGuideSection } from "./components/sections/CliGuideSection.js";
import { SchemaGuideSection } from "./components/sections/SchemaGuideSection.js";
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
  let catalogError = "";
  const initialParams = new URLSearchParams(window.location.search);
  let currentSearchQuery = initialParams.get("q") || "";
  let activeAccessFilter = "all";
  let activeSort = "name-asc";
  let searchDebounceTimer = null;
  let activeViewCleanup = null;
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
    } else if (route.view === "schema") {
      document.title = "Schema & AI Docs — Vib Apps";
    } else {
      document.title = "Vib Apps — Apps Catalog & Edge Installer";
    }
  }

  function resetAllFilters() {
    clearTimeout(searchDebounceTimer);
    currentSearchQuery = "";
    activeAccessFilter = "all";
    activeSort = "name-asc";
    layout.resetSearch();
    const route = getCurrentRoute();
    if (route.view === "category") {
      navigate("/");
    } else {
      syncSearchQueryInUrl("");
      renderCurrentView(getCurrentRoute());
    }
  }

  // 5. Catalog Loader (initial load + explicit user Retry on error)
  async function loadCatalog(forceRefresh = false) {
    isLoadingCatalog = true;
    catalogError = "";
    const currentRoute = getCurrentRoute();
    if (currentRoute.view === "home" || currentRoute.view === "category") {
      renderCurrentView(currentRoute);
    }

    try {
      const catalogData = await fetchAppsCatalog(forceRefresh);
      loadedApps = catalogData.apps || [];
      isLoadingCatalog = false;
      catalogError = "";

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
      catalogError = err?.message || "Failed to load apps catalog";
      toast.error(catalogError);
      const activeRoute = getCurrentRoute();
      if (activeRoute.view === "home" || activeRoute.view === "category") {
        renderCurrentView(activeRoute);
      }
    }
  }

  // 6. View Renderer
  function renderCurrentView(route) {
    if (typeof activeViewCleanup === "function") {
      try {
        activeViewCleanup();
      } catch (_) {}
      activeViewCleanup = null;
    }

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
          activeSort,
          isLoading: isLoadingCatalog,
          errorMessage: catalogError,
          onAccessChange: (nextAccess) => {
            activeAccessFilter = nextAccess;
            renderCurrentView(getCurrentRoute());
          },
          onSortChange: (nextSort) => {
            activeSort = nextSort;
            renderCurrentView(getCurrentRoute());
          },
          onResetFilters: resetAllFilters,
          onRetry: () => loadCatalog(true)
        });
        layout.viewRoot.appendChild(grid);
        break;
      }

      case "app": {
        const detail = AppDetailView({ slug: route.slug });
        activeViewCleanup = typeof detail.cleanup === "function" ? detail.cleanup : null;
        layout.viewRoot.appendChild(detail);
        break;
      }

      case "cli": {
        const cliGuide = CliGuideSection();
        layout.viewRoot.appendChild(cliGuide);
        break;
      }

      case "schema": {
        const schemaGuide = SchemaGuideSection();
        activeViewCleanup = typeof schemaGuide.cleanup === "function" ? schemaGuide.cleanup : null;
        layout.viewRoot.appendChild(schemaGuide);
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

  // 7. Subscribe to Route Changes (Browser Back/Forward & navigate calls)
  onRouteChange((newRoute) => {
    clearTimeout(searchDebounceTimer);
    if (newRoute.view === "home" || newRoute.view === "category") {
      const urlQuery = new URLSearchParams(window.location.search).get("q") || "";
      currentSearchQuery = urlQuery;
      layout.setSearchValue(urlQuery);
    } else {
      currentSearchQuery = "";
      activeAccessFilter = "all";
      activeSort = "name-asc";
      layout.resetSearch();
    }
    renderCurrentView(newRoute);
  });

  // Render initial loading state immediately and fetch catalog
  renderCurrentView(initialRoute);
  await loadCatalog();
}

// Start application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
