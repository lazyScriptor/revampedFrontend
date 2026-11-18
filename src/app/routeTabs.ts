// Tab names the router validates in `?tab=`. They live here, not in the page files, so the router
// can check a link without loading the whole page (pages are loaded only when first opened).

export const MESSAGE_TABS = ["today", "templates", "history"] as const;
export type MessageTab = (typeof MESSAGE_TABS)[number];

export const LOCKER_TABS = ["today", "history"] as const;
export type LockerTab = (typeof LOCKER_TABS)[number];

/** Every Profile tab. Add new Profile tabs here, or the router will drop them from links. */
export const PROFILE_TAB_KEYS = [
  "profile",
  "security",
  "signature",
  "phones",
  "preferences",
  "notifications",
  "activity",
  "access",
] as const;
