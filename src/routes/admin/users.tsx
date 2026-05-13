import { createRoute } from "@tanstack/react-router";
import { authenticatedRoute } from "@/routes/_authenticated";
import UserManagement from "@/features/admin/components/UserManagement";

export const adminUsersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/users",
  component: () => <UserManagement />,
});
