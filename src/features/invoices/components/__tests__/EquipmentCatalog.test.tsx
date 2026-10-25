import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EquipmentCard } from "../EquipmentCard";
import { EquipmentCatalog, EquipmentSearchBar } from "../EquipmentCatalog";
import type { CatalogEquipment } from "../../hooks/usePosEquipmentCatalog";
import { equipmentIcon, stockLevel } from "@/features/equipment/lib/equipmentVisual";
import ConstructionIcon from "@mui/icons-material/Construction";
import HandymanIcon from "@mui/icons-material/Handyman";
import StairsIcon from "@mui/icons-material/Stairs";

const make = (over: Partial<CatalogEquipment> = {}): CatalogEquipment => ({
  equipment_id: 1,
  equipment_name: "Angle Grinder 100mm",
  equipment_name_si: null,
  serial_number: "EQ-0001",
  image_url: null,
  available_qty: 5,
  is_bulk_item: true,
  base_rental_price: 1500,
  minimum_rental_days: 1,
  extra_daily_rate: 1500,
  ...over,
});

const renderCard = (item: CatalogEquipment, inCartQty = 0) => {
  const onAdd = vi.fn();
  const onDecrement = vi.fn();
  render(<EquipmentCard item={item} inCartQty={inCartQty} onAdd={onAdd} onDecrement={onDecrement} />);
  return { onAdd, onDecrement };
};

describe("EquipmentCard", () => {
  it("shows the equipment number prominently", () => {
    renderCard(make({ serial_number: "EQ-0042" }));
    expect(screen.getByTestId("equipment-number")).toHaveTextContent("EQ-0042");
  });

  it("shows name, price per day and stock", () => {
    renderCard(make());
    expect(screen.getByText("Angle Grinder 100mm")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1,500")).toBeInTheDocument();
    expect(screen.getByText("/day")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows the cover days instead of /day for tiered pricing", () => {
    renderCard(make({ base_rental_price: 4000, minimum_rental_days: 3, extra_daily_rate: 1000 }));
    expect(screen.getByText("Rs. 4,000")).toBeInTheDocument();
    expect(screen.getByText("3d")).toBeInTheDocument();
    expect(screen.queryByText("/day")).not.toBeInTheDocument();
  });

  it("adds one unit when the card or its + button is tapped", () => {
    const { onAdd } = renderCard(make());
    fireEvent.click(screen.getByRole("button", { name: "Angle Grinder 100mm" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onAdd).toHaveBeenCalledTimes(2);
  });

  it("shows a quantity stepper for a bulk item already in the order", () => {
    const { onAdd, onDecrement } = renderCard(make(), 2);
    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "One more" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "One less" }));
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it("offers a remove button (no stepper) for a serialized item in the order", () => {
    const { onDecrement } = renderCard(make({ is_bulk_item: false }), 1);
    expect(screen.queryByRole("button", { name: "One more" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });

  it("marks out-of-stock items and offers no add control", () => {
    renderCard(make({ available_qty: 0 }));
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
  });
});

describe("EquipmentSearchBar", () => {
  const bar = (over = {}) => {
    const props = { value: "", onChange: vi.fn(), open: false, onOpen: vi.fn(), onClose: vi.fn(), loading: false, onSubmit: vi.fn(), ...over };
    render(<EquipmentSearchBar {...props} />);
    return props;
  };

  it("opens the catalog on focus and submits on Enter", () => {
    const p = bar();
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    expect(p.onOpen).toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(p.onSubmit).toHaveBeenCalled();
  });

  it("closes on Escape and clears with the X button", () => {
    const p = bar({ open: true, value: "drill" });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(p.onClose).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(p.onChange).toHaveBeenCalledWith("");
  });
});

describe("EquipmentCatalog", () => {
  const baseProps = () => ({
    items: [make({ equipment_id: 1 }), make({ equipment_id: 2, equipment_name: "Step Ladder 6ft" })],
    isLoading: false,
    isFetching: false,
    isError: false,
    onRetry: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    categories: [
      { category_id: 7, category_name: "Power Tools" },
      { category_id: 8, category_name: "Ladders" },
    ],
    categoryId: null as number | null,
    onCategoryChange: vi.fn(),
    inStockOnly: true,
    onInStockChange: vi.fn(),
    searching: false,
    cartQtyById: new Map<number, number>([[1, 2]]),
    cartCount: 1,
    cartTotal: 3000,
    onAdd: vi.fn(),
    onDecrement: vi.fn(),
    onClose: vi.fn(),
    onClearFilters: vi.fn(),
  });

  it("renders a card per machine plus the order bar", () => {
    render(<EquipmentCatalog {...baseProps()} />);
    expect(screen.getByText("Angle Grinder 100mm")).toBeInTheDocument();
    expect(screen.getByText("Step Ladder 6ft")).toBeInTheDocument();
    expect(screen.getByText("Rs. 3,000")).toBeInTheDocument();
  });

  it("picks a category chip and toggles it off when tapped again", () => {
    const p = baseProps();
    const { rerender } = render(<EquipmentCatalog {...p} />);
    fireEvent.click(screen.getByText("Power Tools"));
    expect(p.onCategoryChange).toHaveBeenCalledWith(7);
    rerender(<EquipmentCatalog {...p} categoryId={7} />);
    fireEvent.click(screen.getByText("Power Tools"));
    expect(p.onCategoryChange).toHaveBeenLastCalledWith(null);
  });

  it("closes from the Done button", () => {
    const p = baseProps();
    render(<EquipmentCatalog {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(p.onClose).toHaveBeenCalled();
  });

  it("shows the empty state with a clear-filters action only when filters are on", () => {
    const p = { ...baseProps(), items: [], searching: true };
    render(<EquipmentCatalog {...p} />);
    expect(screen.getByText("No equipment found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(p.onClearFilters).toHaveBeenCalled();
  });

  it("offers retry when loading failed", () => {
    const p = { ...baseProps(), items: [], isError: true };
    render(<EquipmentCatalog {...p} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(p.onRetry).toHaveBeenCalled();
  });

  it("disables the in-stock chip while a search is typed", () => {
    render(<EquipmentCatalog {...baseProps()} searching />);
    expect(screen.getByText("In stock").closest(".MuiChip-root")).toHaveClass("Mui-disabled");
  });
});

describe("equipmentVisual", () => {
  it("picks an icon family from the machine name", () => {
    expect(equipmentIcon("Aluminium Step Ladder")).toBe(StairsIcon);
    expect(equipmentIcon("Bosch Hammer Drill 800W")).toBe(HandymanIcon);
    expect(equipmentIcon("Mystery Gadget")).toBe(ConstructionIcon);
  });

  it("grades stock", () => {
    expect(stockLevel(0)).toBe("out");
    expect(stockLevel(2)).toBe("low");
    expect(stockLevel(3)).toBe("ok");
  });
});
