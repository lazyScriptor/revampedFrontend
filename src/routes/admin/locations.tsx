import { createRoute } from "@tanstack/react-router";
import { authenticatedRoute } from "@/routes/_authenticated";
import LocationsPage from "@/features/warehouses/LocationsPage";

export const adminLocationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/locations",
  component: () => <LocationsPage />,
});
