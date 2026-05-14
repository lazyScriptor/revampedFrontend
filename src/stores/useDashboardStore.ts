import { create } from 'zustand';
import { api } from '@/lib/api';
import type { LayoutItem, GlobalFilters, WidgetDefinition } from '@/features/dashboard/types';

const today = new Date().toISOString().split('T')[0];
const thirtyDaysAgo = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
})();

const DEFAULT_FILTERS: GlobalFilters = {
  startDate: thirtyDaysAgo,
  endDate: today,
  warehouseId: null,
};

// ============================================================================
// THE FIX: FRONTEND SOURCE OF TRUTH
// If the backend doesn't send the catalog, the UI will fall back to this.
// ============================================================================
const FRONTEND_WIDGET_CATALOG: WidgetDefinition[] = [
  { widget_key: 'revenue_kpi', display_name: 'Revenue', description: 'Total Revenue', required_permission: null, default_w: 1, default_h: 1, min_w: 1, min_h: 1 },
  { widget_key: 'net_profit_kpi', display_name: 'Net Profit', description: 'Net Profit', required_permission: null, default_w: 1, default_h: 1, min_w: 1, min_h: 1 },
  { widget_key: 'outstanding_debt_kpi', display_name: 'Outstanding Debt', description: 'Debt', required_permission: null, default_w: 1, default_h: 1, min_w: 1, min_h: 1 },
  { widget_key: 'active_rentals_kpi', display_name: 'Active Rentals', description: 'Rentals', required_permission: null, default_w: 1, default_h: 1, min_w: 1, min_h: 1 },
  { widget_key: 'revenue_trend_chart', display_name: 'Revenue Trend', description: 'Chart', required_permission: null, default_w: 2, default_h: 2, min_w: 2, min_h: 2 },
  { widget_key: 'utilization_sparkline', display_name: 'Utilization Trend', description: 'Chart', required_permission: null, default_w: 2, default_h: 2, min_w: 2, min_h: 2 },
  { widget_key: 'returns_today', display_name: 'Returns Today', description: 'Table', required_permission: null, default_w: 2, default_h: 3, min_w: 2, min_h: 2 },
  { widget_key: 'maintenance_queue', display_name: 'Maintenance Queue', description: 'Table', required_permission: null, default_w: 2, default_h: 3, min_w: 2, min_h: 2 },
];

const FRONTEND_DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'revenue_kpi', x: 0, y: 0, w: 1, h: 1 },
  { i: 'net_profit_kpi', x: 1, y: 0, w: 1, h: 1 },
  { i: 'outstanding_debt_kpi', x: 2, y: 0, w: 1, h: 1 },
  { i: 'active_rentals_kpi', x: 3, y: 0, w: 1, h: 1 },
  { i: 'revenue_trend_chart', x: 0, y: 1, w: 2, h: 2 },
  { i: 'utilization_sparkline', x: 2, y: 1, w: 2, h: 2 },
  { i: 'returns_today', x: 0, y: 3, w: 2, h: 3 },
  { i: 'maintenance_queue', x: 2, y: 3, w: 2, h: 3 },
];

let syncTimer: ReturnType<typeof setTimeout> | null = null;

interface DashboardStore {
  layout: LayoutItem[];
  globalFilters: GlobalFilters;
  widgetCatalog: WidgetDefinition[];
  isEditMode: boolean;
  isConfigLoaded: boolean;
  loadConfig: (config: { layout: LayoutItem[]; savedFilters: GlobalFilters | null; widgetCatalog: WidgetDefinition[] }) => void;
  setLayout: (layout: LayoutItem[]) => void;
  updateFilter: (key: keyof GlobalFilters, value: string | number | null) => void;
  toggleWidget: (def: WidgetDefinition) => void;
  toggleEditMode: () => void;
  _debouncedSync: () => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  layout: [],
  globalFilters: DEFAULT_FILTERS,
  widgetCatalog: [],
  isEditMode: false,
  isConfigLoaded: false,

  loadConfig: ({ layout, savedFilters, widgetCatalog }) => {
    // SECURITY FALLBACK: If backend catalog is empty/undefined, use our hardcoded frontend catalog
    const finalCatalog = widgetCatalog && widgetCatalog.length > 0 ? widgetCatalog : FRONTEND_WIDGET_CATALOG;

    // Detect old formatting
    const max_x = layout?.length ? Math.max(...layout.map(item => item.x)) : -1;
    const max_w = layout?.length ? Math.max(...layout.map(item => item.w)) : 0;
    const isOldFormat = !layout?.length || max_w > 4 || max_x < 2;

    set({
      layout: isOldFormat ? FRONTEND_DEFAULT_LAYOUT : layout,
      globalFilters: savedFilters ?? DEFAULT_FILTERS,
      widgetCatalog: finalCatalog,
      isConfigLoaded: true,
    });
  },

  setLayout: (layout) => {
    set({ layout });
    get()._debouncedSync();
  },

  updateFilter: (key, value) => {
    set((state) => ({ globalFilters: { ...state.globalFilters, [key]: value } }));
    get()._debouncedSync();
  },

  toggleWidget: (def) => {
    const { layout } = get();
    const exists = layout.find(item => item.i === def.widget_key);
    if (exists) {
      set({ layout: layout.filter(item => item.i !== def.widget_key) });
    } else {
      const maxY = layout.reduce((m, item) => Math.max(m, item.y + item.h), 0);
      set({ layout: [...layout, { i: def.widget_key, x: 0, y: maxY, w: def.default_w, h: def.default_h }] });
    }
    get()._debouncedSync();
  },

  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),

  _debouncedSync: () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const { layout, globalFilters, isConfigLoaded } = get();
      if (!isConfigLoaded || layout.length === 0) return;
      try {
        await api.patch('/dashboard/preferences', { layout, filters: globalFilters });
      } catch { /* silent */ }
    }, 1500);
  },
}));