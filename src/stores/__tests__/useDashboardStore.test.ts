import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ api: { put: vi.fn(async () => ({})), post: vi.fn(async () => ({})), get: vi.fn() } }));

import { compactAndPackLayout, useDashboardStore } from "@/stores/useDashboardStore";

// The server's catalog still uses 12-column sizes: a KPI is 3 wide × 2 tall.
const serverKpiDef = {
  widget_key: "revenue_kpi", display_name: "Revenue", description: "", required_permission: null,
  default_w: 3, default_h: 2, min_w: 2, min_h: 2,
};

const kpi = () => useDashboardStore.getState().layout.find((i) => i.i === "revenue_kpi")!;

describe("dashboard card sizes", () => {
  beforeEach(() => {
    useDashboardStore.getState().loadConfig({ layout: [], savedFilters: null, widgetCatalog: [serverKpiDef as any] });
  });

  it("starts KPI cards at one column by one row", () => {
    expect(kpi()).toMatchObject({ w: 1, h: 1 });
  });

  it("a KPI removed and added again comes back small, not 12-column sized", () => {
    const { toggleWidget } = useDashboardStore.getState();
    toggleWidget(serverKpiDef as any);
    toggleWidget(serverKpiDef as any);
    expect(kpi()).toMatchObject({ w: 1, h: 1 });
  });

  it("width 1 after a wider size goes back to the smallest card", () => {
    const { setWidgetWidth } = useDashboardStore.getState();
    setWidgetWidth("revenue_kpi", 3);
    setWidgetWidth("revenue_kpi", 1);
    expect(kpi()).toMatchObject({ w: 1, h: 1 });
  });

  it("repairs saved layouts that have a tall KPI or a width over 4", () => {
    const fixed = compactAndPackLayout([
      { i: "revenue_kpi", x: 0, y: 0, w: 1, h: 2 },
      { i: "revenue_trend_chart", x: 0, y: 2, w: 6, h: 3 },
    ]);
    expect(fixed.find((i) => i.i === "revenue_kpi")).toMatchObject({ w: 1, h: 1 });
    expect(fixed.find((i) => i.i === "revenue_trend_chart")).toMatchObject({ w: 4, h: 2 });
  });
});
