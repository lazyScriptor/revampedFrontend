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
import MessagesRoute, { MESSAGE_TABS } from "@/routes/Messages";
import LockerRoute, { LOCKER_TABS } from "@/routes/Locker";
import ProfileRoute, { PROFILE_TAB_KEYS } from "@/routes/Profile";
import { adminUsersRoute } from "@/routes/admin/users";
import { adminRolesRoute } from "@/routes/admin/roles";
import { adminLocationsRoute } from "@/routes/admin/locations";
import { FeatureGate } from "@/features/plan/usePlan";
import PermissionsPage from "@/routes/Permissions";
import SuperAdminLogin from "@/routes/SuperAdminLogin";
import SuperAdminDashboard from "@/routes/SuperAdmin";
import { useSuperAdminStore } from "@/stores/useSuperAdminStore";
import { MobileSignPage } from "@/features/signatures/components/MobileSignPage";
import { PairDevicePage } from "@/features/signatures/components/PairDevicePage";
import { DeviceHomePage } from "@/features/signatures/components/DeviceHomePage";
import { SimplifiedSignPage } from "@/features/signatures/components/SimplifiedSignPage";
import { PhonePhotoPage } from "@/features/equipment/components/PhonePhotoPage";
import { DeviceInvoicePage } from "@/features/phone-assistant/pages/DeviceInvoicePage";
import { DeviceCallsPage } from "@/features/phone-assistant/pages/device/DeviceCallsPage";
import { DeviceAlertsPage } from "@/features/phone-assistant/pages/device/DeviceAlertsPage";
import { DeviceAppGatePage } from "@/features/phone-assistant/pages/device/DeviceAppGatePage";
import { DeviceSettingsPage } from "@/features/phone-assistant/pages/device/DeviceSettingsPage";
import { DeviceNotificationsPage } from "@/features/phone-assistant/pages/DeviceNotificationsPage";
import PhoneAssistantSettingsPage from "@/features/phone-assistant/pages/PhoneAssistantSettingsPage";
import { DevicePrivacyPage } from "@/features/phone-assistant/pages/DevicePrivacyPage";
import { getDeviceId } from "@/features/signatures/lib/deviceId";
import { useTranslation } from "react-i18next";

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
const APP_LAUNCHED_KEY = "geargrid.app_launched";
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    // Paired-phone start page: a phone that already has a device_id opens on its own home (/device).
    // This applies to the first visit of a launch only. Choosing the GearGrid tab or following a link
    // to "/" later in the same session must not bounce back (it used to trap staff on /device).
    try {
      if (getDeviceId() && !window.sessionStorage.getItem(APP_LAUNCHED_KEY)) {
        window.sessionStorage.setItem(APP_LAUNCHED_KEY, "1");
        throw redirect({ to: "/device" });
      }
    } catch (err: any) {
      // Rethrow TanStack Router redirects; swallow any storage errors.
      if (err && typeof err === "object" && "to" in err) throw err;
    }
    const user = useAuthStore.getState().user;
    if (user) {
      throw redirect({ to: "/dashboard" });
    }
    throw redirect({ to: "/login" });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login", // <--- Updated to match your landing page redirect
  component: LoginRoute,
});

// Public, no-auth signature capture page scanned from a phone's camera.
// Token in the URL is the authorization — see @geargrid/contracts
// GetSignatureSession / SubmitSignature. Lives OUTSIDE authenticatedRoute.
const signRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign/$token",
  component: function SignRouteComponent() {
    const { token } = signRoute.useParams();
    return <MobileSignPage token={token} />;
  },
});

// Paired-PWA pairing input page. Public, no-auth. Phone types the 6-char
// code the operator generates on their POS.
const pairRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pair",
  component: PairDevicePage,
});

// Paired-PWA home. Public, no-auth. Polls for pending signature requests
// addressed to the device's paired operator and auto-navigates to the
// simplified sign page the moment one appears.
const deviceHomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/device",
  component: DeviceHomePage,
});

// Simplified sign page used by paired phones. Same backend endpoint as
// /sign/$token but a minimal UI — no name field, no agree checkbox.
const signPairedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-paired/$token",
  component: function SignPairedComponent() {
    const { token } = signPairedRoute.useParams();
    return <SimplifiedSignPage token={token} />;
  },
});

// Paired phone: photograph a machine the counter tapped in the equipment
// table. Public (device_id + token authorise), like /sign-paired.
const phonePhotoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/photo/$token",
  component: function PhonePhotoComponent() {
    const { token } = phonePhotoRoute.useParams();
    return <PhonePhotoPage token={token} />;
  },
});

const deviceCallsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/device/calls",
  component: () => <DeviceCallsPage />,
});

const deviceAlertsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/device/alerts",
  component: () => <DeviceAlertsPage />,
});

const deviceAppRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/device/app",
  component: () => <DeviceAppGatePage />,
});

const deviceSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/device/settings",
  component: () => <DeviceSettingsPage />,
});

const deviceSettingsSectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/device/settings/$section",
  component: () => <DeviceSettingsPage />,
});

const deviceNotificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/device/notifications",
  component: function DeviceNotificationsComponent() {
    return <DeviceNotificationsPage />;
  },
});

const devicePrivacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/device/privacy",
  component: function DevicePrivacyComponent() {
    return <DevicePrivacyPage />;
  },
});

const deviceInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/device/invoice/$id",
  component: function DeviceInvoiceComponent() {
    const { id } = deviceInvoiceRoute.useParams();
    return <DeviceInvoicePage invoiceId={Number(id)} />;
  },
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
  component: () => <Equipment />,
});

const equipmentCategoryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/equipment-category", // Note: Ensure this matches the path in your _authenticated.tsx sidebar ("/equipment-categories" vs "/equipment-category")
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <Categories />,
});

const invoicesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/invoices",
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search.mode === "manage" || search.mode === "dispatch")
      ? (search.mode as "manage" | "dispatch")
      : undefined,
  }),
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <Invoices />,
});

// NEW: Data Arena Route (Protected by 'admin' permission)
const DATA_ARENA_SECTIONS = ["imports", "addMachines", "equipmentSheet", "exports", "bulk", "downloads", "jobs"] as const;

const dataArenaRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/data-arena",
  validateSearch: (search: Record<string, unknown>) => ({
    section: (DATA_ARENA_SECTIONS as readonly string[]).includes(search.section as string)
      ? (search.section as typeof DATA_ARENA_SECTIONS[number])
      : undefined,
  }),
  beforeLoad: () => requirePermission("inventory_permission"), // CRITICAL: Only admins should access bulk exports
  component: () => <DataArena />,
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
  component: () => <FeatureGate feature="maintenance"><MaintenanceRoute /></FeatureGate>,
});
//messages (free WhatsApp hub)
const messagesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/messages",
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (MESSAGE_TABS as readonly string[]).includes(search.tab as string) ? (search.tab as (typeof MESSAGE_TABS)[number]) : undefined,
  }),
  beforeLoad: () => requirePermission("whatsapp:send"),
  component: () => <FeatureGate feature="messages"><MessagesRoute /></FeatureGate>,
});
//cash locker (the shop's cash drawer)
const lockerRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/locker",
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (LOCKER_TABS as readonly string[]).includes(search.tab as string) ? (search.tab as (typeof LOCKER_TABS)[number]) : undefined,
  }),
  beforeLoad: () => requirePermission("locker:count"),
  component: () => <FeatureGate feature="cash_locker"><LockerRoute /></FeatureGate>,
});
//workforce
const workforceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/workforce",
  beforeLoad: () => requirePermission("workforce:view"),
  component: () => <FeatureGate feature="workforce"><WorkforceRoute /></FeatureGate>,
});

// Accounting & Reports
const ACCOUNTING_TABS = ["overview", "invoices", "payments", "expenses", "receivables", "journal"] as const;
const REPORT_CATEGORIES = ["customers", "equipment", "invoices", "financials"] as const;

const accountingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/accounting",
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (ACCOUNTING_TABS as readonly string[]).includes(search.tab as string)
      ? (search.tab as typeof ACCOUNTING_TABS[number])
      : undefined,
  }),
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <AccountingRoute />,
});

const reportsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports",
  validateSearch: (search: Record<string, unknown>) => ({
    category: (REPORT_CATEGORIES as readonly string[]).includes(search.category as string)
      ? (search.category as typeof REPORT_CATEGORIES[number])
      : undefined,
    report: typeof search.report === "string" ? (search.report as string) : undefined,
  }),
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <ReportsRoute />,
});

// Personal profile (no permission gate — every authenticated user has one)
const profileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/profile",
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (PROFILE_TAB_KEYS as readonly string[]).includes(search.tab as string)
      ? (search.tab as (typeof PROFILE_TAB_KEYS)[number])
      : undefined,
  }),
  component: () => <ProfileRoute />,
});

// Phone assistant settings: phones, call screen designer, notifications, languages and policy grids.
const PHONE_SETTINGS_TAB_KEYS = ["phones", "call-screen", "notifications", "languages", "contacts-calls", "approvals", "sync-privacy"] as const;
const phoneAssistantSettingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/phone-assistant",
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (PHONE_SETTINGS_TAB_KEYS as readonly string[]).includes(search.tab as string)
      ? (search.tab as typeof PHONE_SETTINGS_TAB_KEYS[number])
      : undefined,
  }),
  component: () => <FeatureGate feature="phone_assistant"><PhoneAssistantSettingsPage /></FeatureGate>,
});

// Permissions Matrix (Admin only)
const permissionsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/permissions",
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <FeatureGate feature="admin.roles"><PermissionsPage /></FeatureGate>,
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
  signRoute,
  pairRoute,
  deviceHomeRoute,
  signPairedRoute,
  phonePhotoRoute,
  deviceCallsRoute,
  deviceAlertsRoute,
  deviceAppRoute,
  deviceSettingsRoute,
  deviceSettingsSectionRoute,
  deviceNotificationsRoute,
  devicePrivacyRoute,
  deviceInvoiceRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    equipmentRoute,
    invoicesRoute,
    equipmentCategoryRoute,
    dataArenaRoute,
    customersRoute,
    rentalHistoryRoute,
    maintenanceRoute,
    messagesRoute,
    lockerRoute,
    workforceRoute,
    accountingRoute,
    reportsRoute,
    profileRoute,
    phoneAssistantSettingsRoute,
    permissionsRoute,
    adminUsersRoute,
    adminRolesRoute,
    adminLocationsRoute,
  ]),
  superAdminIndexRoute,
  superAdminLoginRoute,
  superAdminDashboardRoute,
]);

// --- 4. Global 404 Component ---
const NotFoundComponent = () => { const { t } = useTranslation(); return (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-300">
    <h1 className="text-6xl font-bold text-white mb-4">404</h1>
    <p className="text-xl mb-8">{t("app.router.oopsWeCouldnTFind")}</p>
    <button
      onClick={() => window.history.back()}
      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
    >
      {t("app.router.goBack")}
    </button>
  </div>
); };

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
