import { createRouter, createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { authenticatedRoute } from "@/routes/_authenticated";
import LoginRoute from "@/routes/login";
import Equipment from "@/routes/Equipment";
import Categories from "@/routes/Categories";
import DataArena from "@/routes/DataArena"; // <-- 1. Import the new Data Arena component
import { useAuthStore } from "@/stores/useAuthStore";
import CustomersRoute from "@/routes/Customers";

// --- 1. Helper Functions ---
const requirePermission = (permissionCode: string) => {
  const user = useAuthStore.getState().user;
  if (!user?.permissions?.includes(permissionCode)) {
    // If they don't have permission, bounce them back to the dashboard
    throw redirect({ to: "/dashboard" });
  }
};

// --- 2. Route Definitions ---

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginRoute,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dashboard",
  component: () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-xl font-semibold mb-4">Inventory Overview</h3>
      <p className="text-slate-600">
        Your SaaS dashboard widgets will go here.
      </p>
    </div>
  ),
});

const equipmentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/equipment",
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => (
    <div>
      <Equipment />
    </div>
  ),
});

const equipmentCategoryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/equipment-category", // Note: Ensure this matches the path in your _authenticated.tsx sidebar ("/equipment-categories" vs "/equipment-category")
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => (
    <div>
      <Categories />
    </div>
  ),
});

const invoicesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/invoices",
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <div>This is the invoice route</div>,
});

// NEW: Data Arena Route (Protected by 'admin' permission)
const dataArenaRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/data-arena",
  beforeLoad: () => requirePermission("inventory_permission"), // CRITICAL: Only admins should access bulk exports
  component: () => (
    <div>
      <DataArena />
    </div>
  ),
});

const customersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/customers",
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <CustomersRoute />, // Hook it up here!
});

// --- 3. Build the Route Tree ---
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    equipmentRoute,
    invoicesRoute,
    equipmentCategoryRoute,
    dataArenaRoute,
    customersRoute,
  ]),
]);

// --- 4. Global 404 Component ---
const NotFoundComponent = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-300">
    <h1 className="text-6xl font-bold text-white mb-4">404</h1>
    <p className="text-xl mb-8">Oops! We couldn't find that page.</p>
    <button
      onClick={() => window.history.back()}
      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
    >
      Go Back
    </button>
  </div>
);

// --- 5. Export Router ---
export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundComponent,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
