import { createRootRoute, Outlet } from '@tanstack/react-router';
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'; // Uncomment in dev
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export const Route = createRootRoute({
  component: () => (
    <>
      {/* Outlet is where child routes (Login or the Dashboard) will render */}
      <Outlet />
      
      {/* Essential for debugging cache states in development */}
      <ReactQueryDevtools position="bottom" />
      {/* <TanStackRouterDevtools position="bottom-right" /> */}
    </>
  ),
});