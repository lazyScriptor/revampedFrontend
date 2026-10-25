import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useState } from "react";
import { PosLedgerPanel, type CartItem } from "../PosLedgerPanel";

// The catalog data hook is replaced so these tests drive the panel's own logic: adding,
// stepping, stock limits, serialized items and the Enter-to-add shortcut.
let catalogState: any;
vi.mock("../../hooks/usePosEquipmentCatalog", async (orig) => {
  const real = await orig<typeof import("../../hooks/usePosEquipmentCatalog")>();
  return { ...real, usePosEquipmentCatalog: () => catalogState };
});
vi.mock("@/features/equipment/hooks/useCategoryHooks", () => ({
  useCategoryOptions: () => ({ data: [{ category_id: 1, category_name: "Power Tools" }] }),
}));

const machine = (over: Record<string, unknown> = {}) => ({
  equipment_id: 1,
  equipment_name: "Hammer Drill",
  equipment_name_si: null,
  serial_number: "EQ-0001",
  image_url: null,
  available_qty: 3,
  is_bulk_item: true,
  base_rental_price: 1500,
  minimum_rental_days: 1,
  extra_daily_rate: 1500,
  EquipmentCategory: { category_name: "Power Tools" },
  ...over,
});

const state = (items: any[], over: Record<string, unknown> = {}) => ({
  items,
  isLoading: false,
  isFetching: false,
  isError: false,
  isSettling: false,
  isPlaceholderData: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
  total: items.length,
  ...over,
});

const showToast = vi.fn();
let latestCart: CartItem[] = [];

function Harness() {
  const [cart, setCart] = useState<CartItem[]>([]);
  latestCart = cart;
  return <PosLedgerPanel cartItems={cart} setCartItems={setCart} showToast={showToast} />;
}

const open = () => fireEvent.focus(screen.getByRole("textbox"));
const card = (name: string) => screen.getByRole("group", { name });

beforeEach(() => {
  showToast.mockClear();
  latestCart = [];
  catalogState = state([machine()]);
});

describe("PosLedgerPanel equipment catalog", () => {
  it("opens the catalog on focus and closes it with Done", () => {
    render(<Harness />);
    expect(screen.queryByText("Hammer Drill")).not.toBeInTheDocument();
    open();
    expect(screen.getByText("Hammer Drill")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
  });

  it("adds a machine to the order with its number and photo data", () => {
    render(<Harness />);
    open();
    fireEvent.click(card("Hammer Drill"));
    expect(latestCart).toHaveLength(1);
    expect(latestCart[0]).toMatchObject({ equipment_id: 1, serial_number: "EQ-0001", borrow_quantity: 1, locked_base_price: 1500 });
  });

  it("steps a bulk machine up and down, removing the line at zero", () => {
    render(<Harness />);
    open();
    fireEvent.click(card("Hammer Drill"));
    fireEvent.click(screen.getByRole("button", { name: "One more" }));
    expect(latestCart[0].borrow_quantity).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "One less" }));
    expect(latestCart[0].borrow_quantity).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "One less" })); // bin
    expect(latestCart).toHaveLength(0);
  });

  it("warns at the stock limit instead of exceeding it", () => {
    catalogState = state([machine({ available_qty: 1 })]);
    render(<Harness />);
    open();
    fireEvent.click(card("Hammer Drill"));
    fireEvent.click(screen.getByRole("button", { name: "One more" }));
    expect(latestCart[0].borrow_quantity).toBe(1);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Max stock"), "warning");
  });

  it("refuses to add a serialized machine twice", () => {
    catalogState = state([machine({ is_bulk_item: false })]);
    render(<Harness />);
    open();
    fireEvent.click(card("Hammer Drill"));
    fireEvent.click(card("Hammer Drill"));
    expect(latestCart).toHaveLength(1);
    expect(showToast).toHaveBeenCalledWith("Serialized item already in order.", "error");
  });

  it("refuses an out-of-stock machine", () => {
    catalogState = state([machine({ available_qty: 0 })]);
    render(<Harness />);
    open();
    fireEvent.click(card("Hammer Drill"));
    expect(latestCart).toHaveLength(0);
    expect(showToast).toHaveBeenCalledWith("This item is currently out of stock!", "error");
  });

  it("Enter adds the machine when exactly one matches, then clears the search", () => {
    render(<Harness />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "EQ-0001" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(latestCart).toHaveLength(1);
    expect(input.value).toBe("");
  });

  it("Enter does nothing when several machines match", () => {
    catalogState = state([machine(), machine({ equipment_id: 2, equipment_name: "Angle Grinder", serial_number: "EQ-0002" })]);
    render(<Harness />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "EQ" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(latestCart).toHaveLength(0);
  });

  it("Enter ignores a stale list while a newer search is still loading", () => {
    catalogState = state([machine()], { isFetching: true });
    render(<Harness />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "grinder" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(latestCart).toHaveLength(0);
  });

  it("Enter ignores placeholder data left over from the previous search", () => {
    catalogState = state([machine()], { isPlaceholderData: true });
    render(<Harness />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "grinder" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(latestCart).toHaveLength(0);
  });

  it("shows the equipment number on the order line", () => {
    render(<Harness />);
    open();
    fireEvent.click(card("Hammer Drill"));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    const badges = screen.getAllByTestId("equipment-number");
    expect(badges.some((b) => b.textContent?.includes("EQ-0001"))).toBe(true);
    expect(within(document.body).getByText("2 items in order".replace("2", "1").replace("items", "item"))).toBeInTheDocument();
  });
});
