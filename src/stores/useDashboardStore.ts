import { create } from 'zustand';
import { api } from '@/lib/api';
import { todayLocalStr, addDaysLocal } from '@/lib/dates';
import type { LayoutItem, GlobalFilters, WidgetDefinition } from '@/features/dashboard/types';
import { tk } from '@/i18n/marker';

// Defaults are viewer-local — when the dashboard config request lands it
// overrides them with tenant-tz-aware bounds from the server.
const buildDefaultFilters = (): GlobalFilters => ({
  startDate: addDaysLocal(todayLocalStr(), -30),
  endDate: todayLocalStr(),
  warehouseId: null,
});

// ============================================================================
// FRONTEND SOURCE OF TRUTH & CANONICAL LAYOUT
// ============================================================================
const FRONTEND_WIDGET_CATALOG: WidgetDefinition[] = [
  { widget_key: 'revenue_kpi', display_name: tk('dashboard.widgetCatalog.revenue'), description: 'Total Revenue', required_permission: null, default_w: 1, default_h: 1, min_w: 1, min_h: 1 },
  { widget_key: 'net_profit_kpi', display_name: tk('dashboard.widgetCatalog.netProfit'), description: 'Net Profit', required_permission: null, default_w: 1, default_h: 1, min_w: 1, min_h: 1 },
  { widget_key: 'outstanding_debt_kpi', display_name: tk('dashboard.widgetCatalog.outstandingDebt'), description: 'Debt', required_permission: null, default_w: 1, default_h: 1, min_w: 1, min_h: 1 },
  { widget_key: 'active_rentals_kpi', display_name: tk('dashboard.widgetCatalog.activeRentals'), description: 'Rentals', required_permission: null, default_w: 1, default_h: 1, min_w: 1, min_h: 1 },
  { widget_key: 'revenue_trend_chart', display_name: tk('dashboard.widgetCatalog.revenueTrend'), description: 'Chart', required_permission: null, default_w: 2, default_h: 2, min_w: 2, min_h: 2 },
  { widget_key: 'utilization_sparkline', display_name: tk('dashboard.widgetCatalog.utilizationTrend'), description: 'Chart', required_permission: null, default_w: 2, default_h: 2, min_w: 2, min_h: 2 },
  { widget_key: 'returns_today', display_name: tk('dashboard.widgetCatalog.returnsToday'), description: 'Table', required_permission: null, default_w: 2, default_h: 3, min_w: 2, min_h: 2 },
  { widget_key: 'maintenance_queue', display_name: tk('dashboard.widgetCatalog.maintenanceQueue'), description: 'Table', required_permission: null, default_w: 2, default_h: 3, min_w: 2, min_h: 2 },
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

function collides(a: LayoutItem, b: LayoutItem): boolean {
  if (a.i === b.i) return false;
  if (a.x + a.w <= b.x) return false;
  if (a.x >= b.x + b.w) return false;
  if (a.y + a.h <= b.y) return false;
  if (a.y >= b.y + b.h) return false;
  return true;
}

function findFirstAvailableSlot(layout: LayoutItem[], w: number, h: number, cols = 4): { x: number; y: number } {
  const collidesWithAny = (box: LayoutItem) => layout.some((item) => collides(box, item));
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= cols - w; x++) {
      const candidate: LayoutItem = { i: "__temp__", x, y, w, h };
      if (!collidesWithAny(candidate)) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
}

export function compactAndPackLayout(items: LayoutItem[]): LayoutItem[] {
  const canonicalOrder = FRONTEND_DEFAULT_LAYOUT.map((d) => d.i);
  // Sort items primarily by canonical ordering (KPIs -> Charts -> Tables), or by (y, x)
  const sorted = [...items].sort((a, b) => {
    const idxA = canonicalOrder.indexOf(a.i);
    const idxB = canonicalOrder.indexOf(b.i);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.y === b.y ? a.x - b.x : a.y - b.y;
  });

  const packed: LayoutItem[] = [];
  for (const item of sorted) {
    const slot = findFirstAvailableSlot(packed, item.w, item.h, 4);
    packed.push({
      ...item,
      x: slot.x,
      y: slot.y,
    });
  }
  return packed;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

interface DashboardStore {
  layout: LayoutItem[];
  globalFilters: GlobalFilters;
  widgetCatalog: WidgetDefinition[];
  isEditMode: boolean;
  isPanelOpen: boolean;
  isConfigLoaded: boolean;
  loadConfig: (config: { layout: LayoutItem[]; savedFilters: GlobalFilters | null; widgetCatalog: WidgetDefinition[] }) => void;
  setLayout: (layout: LayoutItem[]) => void;
  updateFilter: (key: keyof GlobalFilters, value: string | number | null) => void;
  toggleWidget: (def: WidgetDefinition) => void;
  setWidgetWidth: (key: string, w: number) => void;
  toggleEditMode: () => void;
  closePanel: () => void;
  _debouncedSync: () => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  layout: [],
  globalFilters: buildDefaultFilters(),
  widgetCatalog: [],
  isEditMode: false,
  isPanelOpen: false,
  isConfigLoaded: false,

  loadConfig: ({ layout, savedFilters, widgetCatalog }) => {
    // SECURITY FALLBACK: If backend catalog is empty/undefined, use our hardcoded frontend catalog
    const finalCatalog = widgetCatalog && widgetCatalog.length > 0 ? widgetCatalog : FRONTEND_WIDGET_CATALOG;

    // Detect old formatting
    const max_x = layout?.length ? Math.max(...layout.map(item => item.x)) : -1;
    const max_w = layout?.length ? Math.max(...layout.map(item => item.w)) : 0;
    const isOldFormat = !layout?.length || max_w > 4 || max_x < 2;

    const initialLayout = isOldFormat ? FRONTEND_DEFAULT_LAYOUT : layout;

    set({
      layout: compactAndPackLayout(initialLayout),
      globalFilters: savedFilters ?? buildDefaultFilters(),
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
    const exists = layout.find((item) => item.i === def.widget_key);
    let newLayout: LayoutItem[];
    if (exists) {
      // Remove and compact remaining items so no empty holes remain
      const remaining = layout.filter((item) => item.i !== def.widget_key);
      newLayout = compactAndPackLayout(remaining);
    } else {
      // Re-attach into canonical section without gaps, avoiding orphaned placement at bottom
      const defaultDef = FRONTEND_DEFAULT_LAYOUT.find((d) => d.i === def.widget_key);
      const added: LayoutItem = {
        i: def.widget_key,
        x: defaultDef?.x ?? 0,
        y: defaultDef?.y ?? 0,
        w: def.default_w,
        h: def.default_h,
      };
      newLayout = compactAndPackLayout([...layout, added]);
    }
    set({ layout: newLayout });
    get()._debouncedSync();
  },

  setWidgetWidth: (key, w) => {
    const { layout } = get();
    const updated = layout.map((item) => (item.i === key ? { ...item, w } : item));
    set({ layout: compactAndPackLayout(updated) });
    get()._debouncedSync();
  },

  toggleEditMode: () =>
    set((state) => ({
      isEditMode: !state.isEditMode,
      isPanelOpen: !state.isEditMode, // entering edit → open panel; exiting → close panel
    })),

  closePanel: () => set({ isPanelOpen: false, isEditMode: false }),

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