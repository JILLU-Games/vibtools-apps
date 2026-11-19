import { initTheme } from "./lib/theme.js";
import { getCurrentRoute, onRouteChange, navigate } from "./lib/router.js";
import { fetchAppsCatalog } from "./lib/api.js";
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

  // State
  let loadedApps = [];
  let currentSearchQuery = "";
  let searchDebounceTimer = null;
  const initialRoute = getCurrentRoute();

  // 3. Mount Main Layout
  const layout = MainLayout({
    initialRoute,
    initialCategories: [],
    onSearch: (query) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        currentSearchQuery = query;
        const route = getCurrentRoute();
        if (route.view !== "home" && route.view !== "category") {
          window.history.replaceState({}, "", "/");
        }
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
          searchQuery: currentSearchQuery
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

  // 5. Subscribe to Route Changes (Browser Back/Forward & navigate calls)
  onRouteChange((newRoute) => {
    // If navigating to /cli or /app/*, clear search input
    if (newRoute.view !== "home" && newRoute.view !== "category") {
      currentSearchQuery = "";
      layout.resetSearch();
    }
    renderCurrentView(newRoute);
  });

  // 6. Fetch Catalog
  try {
    const catalogData = await fetchAppsCatalog();
    loadedApps = catalogData.apps || [];

    // Extract unique categories
    const categoriesSet = new Set();
    loadedApps.forEach((app) => {
      if (app.category && typeof app.category === "string") {
        categoriesSet.add(app.category.trim());
      }
    });
    const categories = Array.from(categoriesSet).sort();
    layout.updateCategories(categories);

    // Initial render after catalog is loaded
    renderCurrentView(getCurrentRoute());
  } catch (err) {
    console.error("[Catalog Load Error]", err);
    toast.error(err.message || "Failed to load apps catalog");
    renderCurrentView(getCurrentRoute());
  }
}

// Start application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
