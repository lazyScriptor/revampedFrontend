// Who may open the Stock page: the shop's plan must include retail (it is off for every shop by
// default, so "unknown" counts as off) and the user needs retail:view. Same admin rule as authStore.hasPermission.
type AccessUser =
  | {
      roles?: string[] | null;
      permissions?: string[] | null;
      plan?: { features?: Record<string, boolean | undefined> | null } | null;
    }
  | null
  | undefined;

const ADMIN_ROLES = ["admin", "superadmin", "super_admin", "owner"];

export const userHasPermission = (user: AccessUser, code: string) =>
  !!user && ((user.roles ?? []).some((r) => ADMIN_ROLES.includes(String(r).toLowerCase())) || (user.permissions ?? []).includes(code));

export const retailOn = (user: AccessUser) => user?.plan?.features?.retail === true;

export const canOpenStock = (user: AccessUser) => retailOn(user) && userHasPermission(user, "retail:view");
