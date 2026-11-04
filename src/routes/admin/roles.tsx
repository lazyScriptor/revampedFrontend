import { createRoute } from "@tanstack/react-router";
import { authenticatedRoute } from "@/routes/_authenticated";
import { FeatureGate } from "@/features/plan/usePlan";
import RoleManagement from "@/features/admin/components/RoleManagement";

export const adminRolesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/roles",
  component: () => <FeatureGate feature="admin.roles"><RoleManagement /></FeatureGate>,
});
