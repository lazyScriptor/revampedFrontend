import { lazy } from 'react';

// Each widget is lazy-loaded so it only downloads when it's in the layout.
// Add new widgets here and in the WIDGET_CATALOG on the backend.
export const WIDGET_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  revenue_kpi:          lazy(() => import('./RevenueKPIWidget')),
  net_profit_kpi:       lazy(() => import('./NetProfitWidget')),
  outstanding_debt_kpi: lazy(() => import('./OutstandingDebtWidget')),
  active_rentals_kpi:   lazy(() => import('./ActiveRentalsWidget')),
  revenue_trend_chart:  lazy(() => import('./RevenueTrendChart')),
  utilization_sparkline:lazy(() => import('./UtilizationSparkline')),
  returns_today:        lazy(() => import('./ActionableReturnsTable')),
  maintenance_queue:    lazy(() => import('./MaintenanceQueueWidget')),
};
