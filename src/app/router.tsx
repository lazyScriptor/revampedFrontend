import { createRouter, createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { authenticatedRoute } from "@/routes/_authenticated";
import DashboardEngine from "@/features/dashboard/DashboardEngine";
import LoginRoute from "@/routes/login";
import Equipment from "@/routes/Equipment";
import Categories from "@/routes/Categories";
import DataArena from "@/routes/DataArena";
import Invoices from "@/routes/Invoices";
import RentalHistoryRoute from "@/routes/RentalHistory";
import { useAuthStore } from "@/stores/useAuthStore";
import CustomersRoute from "@/routes/Customers";
import MaintenanceRoute from "@/routes/Maintenance";
import WorkforceRoute from "@/routes/Workforce";
import AccountingRoute from "@/routes/Accounting";
import ReportsRoute from "@/routes/Reports";
import { adminUsersRoute } from "@/routes/admin/users";
import { adminRolesRoute } from "@/routes/admin/roles";
import PermissionsPage from "@/routes/Permissions";
import SuperAdminLogin from "@/routes/SuperAdminLogin";
import SuperAdminDashboard from "@/routes/SuperAdmin";
import { useSuperAdminStore } from "@/stores/useSuperAdminStore";

// --- 1. Helper Functions ---
const requirePermission = (permissionCode: string) => {
  const user = useAuthStore.getState().user;
  if (!user?.permissions?.includes(permissionCode)) {
    // If they don't have permission, bounce them back to the dashboard
    throw redirect({ to: "/dashboard" });
  }
};

// --- 2. Route Definitions ---
// Add this right above your loginRoute definition
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const user = useAuthStore.getState().user;
    if (user) {
      throw redirect({ to: "/dashboard" });
    } else {
      throw redirect({ to: "/login" });
    }
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login", // <--- Updated to match your landing page redirect
  component: LoginRoute,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dashboard",
  component: DashboardEngine,
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
  component: () => (
    <div>
      <Invoices />
    </div>
  ),
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
  component: () => <CustomersRoute />,
});

const rentalHistoryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/rental-history",
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <RentalHistoryRoute />,
});
//maintenance
const maintenanceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/maintenance",
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <MaintenanceRoute />,
});
//workforce
const workforceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/workforce",
  beforeLoad: () => requirePermission("workforce:view"),
  component: () => <WorkforceRoute />,
});

// Accounting & Reports
const accountingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting",
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <AccountingRoute />,
});

const reportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports",
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <ReportsRoute />,
});

// Permissions Matrix (Admin only)
const permissionsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/permissions",
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <PermissionsPage />,
});

// Super Admin Routes (standalone, separate auth)
const superAdminIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/super-admin",
  beforeLoad: () => {
    const sa = useSuperAdminStore.getState();
    throw redirect({ to: sa.isAuthenticated ? "/super-admin/dashboard" : "/super-admin/login" });
  },
});

const superAdminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/super-admin/login",
  component: SuperAdminLogin,
});

const superAdminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/super-admin/dashboard",
  beforeLoad: () => {
    const sa = useSuperAdminStore.getState();
    if (!sa.isAuthenticated) {
      throw redirect({ to: "/super-admin/login" });
    }
  },
  component: SuperAdminDashboard,
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
    rentalHistoryRoute,
    maintenanceRoute,
    workforceRoute,
    accountingRoute,
    reportsRoute,
    permissionsRoute,
    adminUsersRoute,
    adminRolesRoute,
  ]),
  superAdminIndexRoute,
  superAdminLoginRoute,
  superAdminDashboardRoute,
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
