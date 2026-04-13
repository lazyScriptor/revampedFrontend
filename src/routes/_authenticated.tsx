import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuthStore } from "@/stores/useAuthStore";

// 1. Swapped to `createRoute` for pure code-based routing
export const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated", // Explicit ID prevents the "__root__" collision
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar Placeholder */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-slate-800">
          GearGrid
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-slate-400 text-sm mb-4">
            Welcome, {user?.firstName || "Admin"}
          </div>
          <div className="px-4 py-2 bg-slate-800 rounded text-blue-400">
            Dashboard
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-800 rounded transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center px-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-800">Overview</h2>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
