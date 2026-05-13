import { createRoute } from "@tanstack/react-router";
import { authenticatedRoute } from "@/routes/_authenticated";
import RoleManagement from "@/features/admin/components/RoleManagement";

export const adminRolesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/roles",
  component: () => <RoleManagement />,
});
