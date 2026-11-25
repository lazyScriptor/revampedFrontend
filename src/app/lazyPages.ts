import { lazyRouteComponent } from "@tanstack/react-router";

// Pages outside the critical set. Invoicing, Customers and Equipment are imported directly by the
// router so they arrive with the first download; everything here downloads in the background right
// after sign-in (Dashboard first), or the moment its link is pointed at or opened.

export const DashboardEngine = lazyRouteComponent(() => import("@/features/dashboard/DashboardEngine"));
export const Categories = lazyRouteComponent(() => import("@/routes/Categories"));
export const DataArena = lazyRouteComponent(() => import("@/routes/DataArena"));
export const RentalHistoryRoute = lazyRouteComponent(() => import("@/routes/RentalHistory"));
export const MaintenanceRoute = lazyRouteComponent(() => import("@/routes/Maintenance"));
export const WorkforceRoute = lazyRouteComponent(() => import("@/routes/Workforce"));
export const AccountingRoute = lazyRouteComponent(() => import("@/routes/Accounting"));
export const ReportsRoute = lazyRouteComponent(() => import("@/routes/Reports"));
export const MessagesRoute = lazyRouteComponent(() => import("@/routes/Messages"));
export const LockerRoute = lazyRouteComponent(() => import("@/routes/Locker"));
export const ProfileRoute = lazyRouteComponent(() => import("@/routes/Profile"));
export const PermissionsPage = lazyRouteComponent(() => import("@/routes/Permissions"));
export const SuperAdminLogin = lazyRouteComponent(() => import("@/routes/SuperAdminLogin"));
export const SuperAdminDashboard = lazyRouteComponent(() => import("@/routes/SuperAdmin"));
export const PhoneAssistantSettingsPage = lazyRouteComponent(
  () => import("@/features/phone-assistant/pages/PhoneAssistantSettingsPage"),
);
export const ActivityPage = lazyRouteComponent(
  () => import("@/features/activity/pages/ActivityPage"),
);
export const ActivitySettingsPage = lazyRouteComponent(
  () => import("@/features/activity/pages/ActivitySettingsPage"),
);

// Phone-app pages: they open inside the GearGrid Phone app, not at the counter.
export const MobileSignPage = lazyRouteComponent(
  () => import("@/features/signatures/components/MobileSignPage"),
  "MobileSignPage",
);
export const PairDevicePage = lazyRouteComponent(
  () => import("@/features/signatures/components/PairDevicePage"),
  "PairDevicePage",
);
export const DeviceHomePage = lazyRouteComponent(
  () => import("@/features/signatures/components/DeviceHomePage"),
  "DeviceHomePage",
);
export const SimplifiedSignPage = lazyRouteComponent(
  () => import("@/features/signatures/components/SimplifiedSignPage"),
  "SimplifiedSignPage",
);
export const PhonePhotoPage = lazyRouteComponent(
  () => import("@/features/equipment/components/PhonePhotoPage"),
  "PhonePhotoPage",
);
export const DeviceInvoicePage = lazyRouteComponent(
  () => import("@/features/phone-assistant/pages/DeviceInvoicePage"),
  "DeviceInvoicePage",
);
export const DeviceCallsPage = lazyRouteComponent(
  () => import("@/features/phone-assistant/pages/device/DeviceCallsPage"),
  "DeviceCallsPage",
);
export const DeviceAlertsPage = lazyRouteComponent(
  () => import("@/features/phone-assistant/pages/device/DeviceAlertsPage"),
  "DeviceAlertsPage",
);
export const DeviceAppGatePage = lazyRouteComponent(
  () => import("@/features/phone-assistant/pages/device/DeviceAppGatePage"),
  "DeviceAppGatePage",
);
export const DeviceSettingsPage = lazyRouteComponent(
  () => import("@/features/phone-assistant/pages/device/DeviceSettingsPage"),
  "DeviceSettingsPage",
);
export const DeviceNotificationsPage = lazyRouteComponent(
  () => import("@/features/phone-assistant/pages/DeviceNotificationsPage"),
  "DeviceNotificationsPage",
);
export const DevicePrivacyPage = lazyRouteComponent(
  () => import("@/features/phone-assistant/pages/DevicePrivacyPage"),
  "DevicePrivacyPage",
);

/** Office pages to fetch in the background after sign-in, most used first. */
const BACKGROUND_ORDER = [
  DashboardEngine,
  RentalHistoryRoute,
  AccountingRoute,
  ReportsRoute,
  ProfileRoute,
  Categories,
  MaintenanceRoute,
  MessagesRoute,
  LockerRoute,
  WorkforceRoute,
  DataArena,
  PermissionsPage,
  PhoneAssistantSettingsPage,
  ActivityPage,
  ActivitySettingsPage,
];

/**
 * Downloads the non-critical office pages one after another while the browser is idle, so they open
 * instantly later without slowing the first screen. Safe to call more than once.
 */
let started = false;
export function preloadSecondaryPages() {
  if (started || typeof window === "undefined") return;
  started = true;
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  // Safari has no requestIdleCallback; a short timer is close enough there.
  const idle = (cb: () => void) =>
    w.requestIdleCallback ? w.requestIdleCallback(cb, { timeout: 3000 }) : globalThis.setTimeout(cb, 1200);
  const next = (i: number) => {
    if (i >= BACKGROUND_ORDER.length) return;
    idle(() => {
      Promise.resolve(BACKGROUND_ORDER[i].preload?.())
        .catch(() => {})
        .finally(() => next(i + 1));
    });
  };
  next(0);
}
