import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, renderHook, act, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { EquipmentNumberBadge } from "../EquipmentNumberBadge";
import { EquipmentInfoCard } from "../EquipmentInfoCard";
import { EquipmentCardGrid } from "../EquipmentCardGrid";
import { EquipmentCardSettings } from "../EquipmentCardSettings";
import {
  defaultCardConfig,
  readCardConfig,
  useEquipmentCardConfig,
  type CardConfig,
} from "../../lib/equipmentCardFields";

vi.mock("@/lib/socket", () => ({ connectSocket: vi.fn(), getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useMyDevices: () => ({ isLoading: false, data: { devices: [{ device_id: "gg-1" }] } }),
}));

vi.mock("../../hooks/useEquipmentHooks", () => ({
  useDeleteEquipment: () => ({ mutate: vi.fn(), isPending: false }),
}));

const item = (over: Record<string, unknown> = {}) => ({
  equipment_id: 7,
  equipment_name: "Bosch Hammer Drill 800W",
  equipment_name_si: "බොෂ් හැමර් ඩ්‍රිල්",
  serial_number: "EQ-0007",
  image_url: null,
  base_rental_price: "1500.00",
  extra_daily_rate: "900.00",
  minimum_rental_days: 2,
  purchase_cost: "85000.00",
  total_owned_qty: 6,
  available_qty: 4,
  rented_qty: 2,
  defective_qty: 0,
  is_bulk_item: false,
  warranty_period_months: 12,
  end_of_warranty_date: null,
  createdAt: "2026-03-01T00:00:00Z",
  EquipmentCategory: { category_name: "Power Tools" },
  Warehouse: { location_name: "Colombo Yard" },
  ...over,
});

const baseConfig = (): CardConfig => defaultCardConfig();

const renderCard = (over = {}, config = baseConfig(), selected = false) => {
  const handlers = { onSelect: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  render(<EquipmentInfoCard item={item(over)} config={config} selected={selected} {...handlers} />);
  return handlers;
};

beforeEach(() => window.localStorage.clear());

describe("EquipmentNumberBadge", () => {
  it("shows the number", () => {
    render(<EquipmentNumberBadge value="EQ-0007" />);
    expect(screen.getByTestId("equipment-number")).toHaveTextContent("EQ-0007");
  });

  it("shows a dash when the machine has no number", () => {
    render(<EquipmentNumberBadge value={null} />);
    expect(screen.getByTestId("equipment-number")).toHaveTextContent("—");
  });
});

describe("EquipmentInfoCard", () => {
  it("leads with the equipment number, then the name", () => {
    renderCard();
    const card = screen.getByTestId("equipment-card");
    const text = card.textContent || "";
    expect(within(card).getByTestId("equipment-number")).toHaveTextContent("EQ-0007");
    expect(text.indexOf("EQ-0007")).toBeLessThan(text.indexOf("Bosch Hammer Drill 800W"));
  });

  it("shows the default details with icon figures", () => {
    renderCard();
    expect(screen.getByText("බොෂ් හැමර් ඩ්‍රිල්")).toBeInTheDocument();
    expect(screen.getByText("Power Tools")).toBeInTheDocument();
    expect(screen.getByText("Colombo Yard")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1,500")).toBeInTheDocument();
    expect(screen.getByLabelText("Available: 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Rented: 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Total owned: 6")).toBeInTheDocument();
    expect(screen.getByLabelText("Defective: 0")).toBeInTheDocument();
  });

  it("keeps optional details hidden until switched on", () => {
    renderCard();
    expect(screen.queryByText("Rs. 85,000")).not.toBeInTheDocument();
    expect(screen.queryByText("Rs. 900")).not.toBeInTheDocument();
  });

  it("shows optional details when configured", () => {
    renderCard({}, { ...baseConfig(), purchaseCost: true, extraRate: true, warranty: true, nameSi: false });
    expect(screen.getByText("Rs. 85,000")).toBeInTheDocument();
    expect(screen.getByText("Rs. 900")).toBeInTheDocument();
    expect(screen.getByText("12 mo")).toBeInTheDocument();
    expect(screen.queryByText("බොෂ් හැමර් ඩ්‍රිල්")).not.toBeInTheDocument();
  });

  it("drops the stock tiles entirely when every stock figure is off", () => {
    renderCard({}, { ...baseConfig(), totalQty: false, availableQty: false, rentedQty: false, defectiveQty: false });
    expect(screen.queryByLabelText(/Available:/)).not.toBeInTheDocument();
  });

  it("flags an out-of-stock machine", () => {
    renderCard({ available_qty: 0 });
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });

  it("fires select, edit and delete", () => {
    const h = renderCard();
    fireEvent.click(screen.getByLabelText("Select"));
    expect(h.onSelect).toHaveBeenCalledWith(7, true);
    fireEvent.click(screen.getByLabelText("Edit"));
    expect(h.onEdit).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("Delete"));
    expect(h.onDelete).toHaveBeenCalled();
  });
});

describe("EquipmentCardGrid", () => {
  const grid = (over = {}) => {
    const props = {
      data: [item({ equipment_id: 1, serial_number: "A-1" }), item({ equipment_id: 2, serial_number: "A-2", equipment_name: "Step Ladder" })],
      isLoading: false,
      rowCount: 2,
      paginationModel: { page: 0, pageSize: 24 },
      onPaginationModelChange: vi.fn(),
      onEdit: vi.fn(),
      selectedIds: [] as number[],
      onSelectionChange: vi.fn(),
      config: baseConfig(),
      ...over,
    };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <EquipmentCardGrid {...props} />
      </QueryClientProvider>,
    );
    return props;
  };

  it("renders a card per machine", () => {
    grid();
    expect(screen.getAllByTestId("equipment-card")).toHaveLength(2);
    expect(screen.getByText("Step Ladder")).toBeInTheDocument();
  });

  it("selects everything on the page", () => {
    const p = grid();
    fireEvent.click(screen.getByLabelText("Select all on this page"));
    expect(p.onSelectionChange).toHaveBeenCalledWith([1, 2]);
  });

  it("selects one card on top of the existing selection", () => {
    const p = grid({ selectedIds: [2] });
    fireEvent.click(within(screen.getAllByTestId("equipment-card")[0]).getByLabelText("Select"));
    expect(p.onSelectionChange).toHaveBeenCalledWith([2, 1]);
  });

  it("shows an empty state", () => {
    grid({ data: [], rowCount: 0 });
    expect(screen.getByText("No equipment matches your filters.")).toBeInTheDocument();
  });

  it("tapping a card's photo opens the photo dialog for that machine", () => {
    useAuthStore.setState({ hasPermission: (c: string) => c === "equipment:edit" } as any);
    grid();
    fireEvent.click(screen.getByRole("button", { name: "Change photo: Step Ladder" }));
    expect(screen.getByRole("button", { name: "Take with phone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload from this computer" })).toBeInTheDocument();
  });

  it("without edit permission the photo opens view-only", () => {
    useAuthStore.setState({ hasPermission: () => false } as any);
    grid();
    fireEvent.click(screen.getByRole("button", { name: "View photo: Step Ladder" }));
    expect(screen.getByText(/needs equipment edit permission/)).toBeInTheDocument();
  });

  it("asks before deleting", () => {
    grid();
    fireEvent.click(within(screen.getAllByTestId("equipment-card")[0]).getByLabelText("Delete"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("card config", () => {
  it("falls back to defaults and merges stored values over them", () => {
    expect(readCardConfig()).toEqual(defaultCardConfig());
    window.localStorage.setItem("geargrid-equipment-card-fields", JSON.stringify({ purchaseCost: true, category: false, bogus: true }));
    const cfg = readCardConfig();
    expect(cfg.purchaseCost).toBe(true);
    expect(cfg.category).toBe(false);
    expect(cfg.location).toBe(true); // untouched default
    expect((cfg as any).bogus).toBeUndefined();
  });

  it("survives a corrupt stored value", () => {
    window.localStorage.setItem("geargrid-equipment-card-fields", "{not json");
    expect(readCardConfig()).toEqual(defaultCardConfig());
  });

  it("toggles, persists and resets", () => {
    const { result } = renderHook(() => useEquipmentCardConfig());
    act(() => result.current.toggle("purchaseCost"));
    expect(result.current.config.purchaseCost).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("geargrid-equipment-card-fields") || "{}").purchaseCost).toBe(true);
    act(() => result.current.reset());
    expect(result.current.config).toEqual(defaultCardConfig());
  });
});

describe("EquipmentCardSettings", () => {
  it("lists every detail with a switch and reports toggles", () => {
    const onToggle = vi.fn();
    render(<EquipmentCardSettings config={baseConfig()} onToggle={onToggle} onReset={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Card details" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Purchase cost" }));
    expect(onToggle).toHaveBeenCalledWith("purchaseCost");
    expect(screen.getByRole("checkbox", { name: "Purchase cost" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Daily Rate" })).toBeChecked();
  });
});
