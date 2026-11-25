import { createRouter, createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { authenticatedRoute } from "@/routes/_authenticated";
import LoginRoute from "@/routes/login";
import { useAuthStore } from "@/stores/useAuthStore";
import { MESSAGE_TABS, LOCKER_TABS, PROFILE_TAB_KEYS } from "@/app/routeTabs";
import { adminUsersRoute } from "@/routes/admin/users";
import { adminRolesRoute } from "@/routes/admin/roles";
import { adminLocationsRoute } from "@/routes/admin/locations";
import { FeatureGate } from "@/features/plan/usePlan";
import { useSuperAdminStore } from "@/stores/useSuperAdminStore";
import { PageSkeleton } from "@/components/ui/loading";

// Critical counter pages arrive with the first download so they open instantly. Every other page
// loads in the background right after sign-in (see app/lazyPages.ts).
import Invoices from "@/routes/Invoices";
import CustomersRoute from "@/routes/Customers";
import Equipment from "@/routes/Equipment";
import {
  DashboardEngine,
  Categories,
  DataArena,
  RentalHistoryRoute,
  MaintenanceRoute,
  WorkforceRoute,
  AccountingRoute,
  ReportsRoute,
  CollectionsReportPage,
  CustomerCollectionDetailPage,
  MessagesRoute,
  LockerRoute,
  ProfileRoute,
  PermissionsPage,
  SuperAdminLogin,
  SuperAdminDashboard,
  PhoneAssistantSettingsPage,
  ActivityPage,
  ActivitySettingsPage,
  MobileSignPage,
  PairDevicePage,
  DeviceHomePage,
  SimplifiedSignPage,
  PhonePhotoPage,
  DeviceInvoicePage,
  DeviceCallsPage,
  DeviceAlertsPage,
  DeviceAppGatePage,
  DeviceSettingsPage,
  DeviceNotificationsPage,
  DevicePrivacyPage,
} from "@/app/lazyPages";
import { getDeviceId } from "@/features/signatures/lib/deviceId";
import { useTranslation } from "react-i18next";
import { startPathFor } from "@/app/startPage";

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
    // Paired-phone start page: a phone that already has a device_id opens on Alerts (/device/alerts).
    // This applies to the first visit of a launch only. Choosing the GearGrid tab or following a link
    // to "/" later in the same session must not bounce back (it used to trap staff on /device).
    try {
      if (getDeviceId() && !window.sessionStorage.getItem(APP_LAUNCHED_KEY)) {
        window.sessionStorage.setItem(APP_LAUNCHED_KEY, "1");
        throw redirect({ to: "/device/alerts" });
      }
    } catch (err: any) {
      // Rethrow TanStack Router redirects; swallow any storage errors.
      if (err && typeof err === "object" && "to" in err) throw err;
    }
    const user = useAuthStore.getState().user;
    if (user) {
      throw redirect({ to: startPathFor(user) });
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
  validateSearch: (search: Record<string, unknown>) => {
    const mode =
      search.mode === "manage" || search.mode === "dispatch" || search.mode === "settle"
        ? (search.mode as "manage" | "dispatch" | "settle")
        : undefined;
    const rawInvoiceId = Number(search.invoiceId);
    const invoiceId =
      Number.isInteger(rawInvoiceId) && rawInvoiceId > 0 ? rawInvoiceId : undefined;
    const rawCustomer = Number(search.customer);
    const customer =
      Number.isInteger(rawCustomer) && rawCustomer > 0 ? rawCustomer : undefined;
    return { mode, invoiceId, customer };
  },
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
  beforeLoad: ({ search }) => {
    requirePermission("inventory_permission");
    if (search.category === "customers" && search.report === "outstanding") {
      throw redirect({ to: "/reports/customers/collections", search: { owes_money: "1" } as any });
    }
  },
  component: () => <ReportsRoute />,
});

const collectionsReportRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports/customers/collections",
  validateSearch: (search: Record<string, unknown>) => search as Record<string, any>,
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <CollectionsReportPage />,
});

const customerCollectionDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports/customers/collections/$customerId",
  validateSearch: (search: Record<string, unknown>) => search as Record<string, any>,
  beforeLoad: () => requirePermission("inventory_permission"),
  component: () => <CustomerCollectionDetailPage />,
});

const outstandingBalancesRedirectRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/reports/customers/outstanding",
  beforeLoad: () => {
    throw redirect({ to: "/reports/customers/collections", search: { owes_money: "1" } as any });
  },
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

// Activity feed
const activityRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/activity",
  beforeLoad: () => requirePermission("activity:view"),
  component: () => <ActivityPage />,
});

// Activity & Reason Lists settings
const activitySettingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/activity",
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  beforeLoad: () => requirePermission("activity:view"),
  component: () => <ActivitySettingsPage />,
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
    collectionsReportRoute,
    customerCollectionDetailRoute,
    outstandingBalancesRedirectRoute,
    profileRoute,
    phoneAssistantSettingsRoute,
    activityRoute,
    activitySettingsRoute,
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
  // Fetch a page's code as soon as the pointer rests on (or a finger touches) a link to it.
  defaultPreload: "intent",
  // A page that loads quickly shows no placeholder; a slower one shows its skeleton for at least
  // a short moment, so it never flickers in and out.
  defaultPendingComponent: () => <PageSkeleton />,
  defaultPendingMs: 150,
  defaultPendingMinMs: 300,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
