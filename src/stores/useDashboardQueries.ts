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

// Mirrors dashboardService.js DEFAULT_LAYOUT — used for instant local reset
const FRONTEND_DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'revenue_kpi',          x: 0, y: 0, w: 3, h: 2 },
  { i: 'net_profit_kpi',       x: 3, y: 0, w: 3, h: 2 },
  { i: 'outstanding_debt_kpi', x: 6, y: 0, w: 3, h: 2 },
  { i: 'active_rentals_kpi',   x: 9, y: 0, w: 3, h: 2 },
  { i: 'revenue_trend_chart',  x: 0, y: 2, w: 6, h: 3 },
  { i: 'utilization_sparkline',x: 6, y: 2, w: 6, h: 3 },
  { i: 'returns_today',        x: 0, y: 5, w: 6, h: 4 },
  { i: 'maintenance_queue',    x: 6, y: 5, w: 6, h: 4 },
];

let syncTimer: ReturnType<typeof setTimeout> | null = null;

interface DashboardStore {
  layout: LayoutItem[];
  globalFilters: GlobalFilters;
  widgetCatalog: WidgetDefinition[];
  isEditMode: boolean;
  isConfigLoaded: boolean;

  // Actions
  loadConfig: (config: { layout: LayoutItem[]; savedFilters: GlobalFilters; widgetCatalog: WidgetDefinition[] }) => void;
  setLayout: (layout: LayoutItem[]) => void;
  updateFilter: (key: keyof GlobalFilters, value: string | number | null) => void;
  addWidget: (def: WidgetDefinition) => void;
  removeWidget: (widgetKey: string) => void;
  toggleEditMode: () => void;
  resetLayout: () => void;
  resetPreference: () => Promise<void>;

  // Internal
  _debouncedSync: () => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  layout: [],
  globalFilters: DEFAULT_FILTERS,
  widgetCatalog: [],
  isEditMode: false,
  isConfigLoaded: false,

  loadConfig: ({ layout, savedFilters, widgetCatalog }) => {
    set({
      layout,
      globalFilters: savedFilters ?? DEFAULT_FILTERS,
      widgetCatalog,
      isConfigLoaded: true,
    });
  },

  setLayout: (layout) => {
    set({ layout });
    get()._debouncedSync();
  },

  updateFilter: (key, value) => {
    set((state) => ({
      globalFilters: { ...state.globalFilters, [key]: value },
    }));
    get()._debouncedSync();
  },

  addWidget: (def) => {
    const { layout } = get();
    if (layout.some((item) => item.i === def.widget_key)) return;
    const maxY = layout.reduce((m, item) => Math.max(m, item.y + item.h), 0);
    const newItem: LayoutItem = {
      i: def.widget_key,
      x: 0,
      y: maxY,
      w: def.default_w,
      h: def.default_h,
      minW: def.min_w,
      minH: def.min_h,
    };
    const next = [...layout, newItem];
    set({ layout: next });
    get()._debouncedSync();
  },

  removeWidget: (widgetKey) => {
    const next = get().layout.filter((item) => item.i !== widgetKey);
    set({ layout: next });
    get()._debouncedSync();
  },

  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),

  resetLayout: () => {
    set({ layout: [], isConfigLoaded: false });
  },

  resetPreference: async () => {
    // Apply the default layout immediately — don't wait for a server round-trip.
    // widgetCatalog is already in the store from the last successful config load.
    set({ layout: FRONTEND_DEFAULT_LAYOUT, isConfigLoaded: true });
    // Best-effort server sync: delete the saved preference so future loads also
    // return DEFAULT_LAYOUT, then patch the full layout to ensure it's persisted.
    try {
      await api.delete('/dashboard/preferences');
    } catch {
      // Fallback: overwrite the corrupted preference with the full default layout
      try {
        await api.patch('/dashboard/preferences', {
          layout: FRONTEND_DEFAULT_LAYOUT,
          filters: get().globalFilters,
        });
      } catch { /* silent */ }
    }
  },

  _debouncedSync: () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const { layout, globalFilters, isConfigLoaded } = get();
      // Never persist a layout that hasn't finished loading — it would overwrite
      // the real saved preference with an empty or partial state.
      if (!isConfigLoaded || layout.length === 0) return;
      try {
        await api.patch('/dashboard/preferences', { layout, filters: globalFilters });
      } catch {
        // Silent sync — user's work is safe in Zustand state
      }
    }, 1500);
  },
}));
