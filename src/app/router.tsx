import { createRouter, createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { authenticatedRoute } from "@/routes/_authenticated";
import LoginRoute from "@/routes/login";

// 1. Define the Index Route (The redirector)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    // Automatically push users from "/" to "/dashboard"
    throw redirect({ to: "/dashboard" });
  },
});

// 2. Define the Login Route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginRoute,
});

// 3. Define the Dashboard Route
const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dashboard",
  component: () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-xl font-semibold mb-4">Inventory Overview</h3>
      <p className="text-slate-600">
        Your SaaS dashboard widgets will go here.
      </p>
    </div>
  ),
});

// Build the Route Tree (Make sure to add indexRoute here!)
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authenticatedRoute.addChildren([dashboardRoute]),
]);

// 4. Create a Global 404 Component
const NotFoundComponent = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-300">
    <h1 className="text-6xl font-bold text-white mb-4">404</h1>
    <p className="text-xl mb-8">Oops! We couldn't find that page.</p>
    <button
      onClick={() => window.history.back()}
      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
    >
      Go Back
    </button>
  </div>
);

// Create the router instance with the defaultNotFoundComponent attached
export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundComponent,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
