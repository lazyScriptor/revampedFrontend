import { useAuthStore } from "@/stores/useAuthStore";

/**
 * True only when the shop's plan explicitly includes the retail feature. Unlike the other plan
 * checks (which show everything while the plan is unknown), retail stays hidden until the server
 * says it is on: it is off for every shop by default.
 */
export const useRetailEnabled = (): boolean => useAuthStore((s) => s.user?.plan?.features?.retail === true);
