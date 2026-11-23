import { planAllows } from "@/features/plan/usePlan";
import type { TenantPlan } from "@/stores/useAuthStore";

// The page a user lands on after signing in (Profile → Preferences → Start page).
// Keep the keys in step with revampedBackend_Geargrid/src/config/startPages.js.

export const DEFAULT_START_PAGE = "invoices";

type StartPageOption = {
  key: string;
  path: string;
  labelKey: string;
  /** Permission the page's route requires; none means every signed-in user can open it. */
  permission?: string;
  /** Plan feature the page needs, for pages behind a feature gate. */
  feature?: string;
  /** Needs the shop's plan to say retail is on (off by default, so an unknown plan does not count). */
  retailOnly?: boolean;
};

export const START_PAGE_OPTIONS: StartPageOption[] = [
  { key: "invoices", path: "/invoices", labelKey: "nav.invoices", permission: "inventory_permission" },
  { key: "customers", path: "/customers", labelKey: "nav.customers", permission: "inventory_permission" },
  { key: "equipment", path: "/equipment", labelKey: "nav.equipment", permission: "inventory_permission" },
  { key: "dashboard", path: "/dashboard", labelKey: "nav.dashboard" },
  { key: "rental-history", path: "/rental-history", labelKey: "nav.rentalHistory", permission: "inventory_permission" },
  { key: "accounting", path: "/accounting", labelKey: "nav.accounting", permission: "inventory_permission" },
  { key: "reports", path: "/reports", labelKey: "nav.reports", permission: "inventory_permission" },
  { key: "maintenance", path: "/maintenance", labelKey: "nav.maintenance", permission: "inventory_permission", feature: "maintenance" },
  { key: "messages", path: "/messages", labelKey: "nav.messages", permission: "whatsapp:send", feature: "messages" },
  { key: "locker", path: "/locker", labelKey: "nav.cashLocker", permission: "locker:count", feature: "cash_locker" },
  { key: "stock", path: "/stock", labelKey: "nav.stock", permission: "retail:view", retailOnly: true },
];

export type StartPageUser = {
  start_page?: string | null;
  permissions?: string[] | null;
  plan?: TenantPlan | null;
} | null | undefined;

/** True when this user's role and the shop's plan let them open the page. */
export const canOpenStartPage = (user: StartPageUser, option: StartPageOption): boolean => {
  if (option.permission && !(user?.permissions ?? []).includes(option.permission)) return false;
  if (option.feature && !planAllows(user?.plan ?? null, option.feature)) return false;
  if (option.retailOnly && user?.plan?.features?.retail !== true) return false;
  return true;
};

/** Start pages this user may choose. */
export const startPageOptionsFor = (user: StartPageUser) =>
  START_PAGE_OPTIONS.filter((o) => canOpenStartPage(user, o));

/**
 * Where to send this user after signing in: their chosen page, else Invoicing, else the Dashboard
 * (which every signed-in user can open), so nobody lands on a page their role cannot open.
 */
export const startPathFor = (user: StartPageUser): string => {
  const wanted = user?.start_page || DEFAULT_START_PAGE;
  for (const key of [wanted, DEFAULT_START_PAGE]) {
    const option = START_PAGE_OPTIONS.find((o) => o.key === key);
    if (option && canOpenStartPage(user, option)) return option.path;
  }
  return "/dashboard";
};
