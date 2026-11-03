import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const toast = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() };
vi.mock("@/components/ui/AppToast", () => ({ useToast: () => toast }));
let allowed = true;
vi.mock("@/stores/useAuthStore", () => ({ useAuthStore: (sel: any) => sel({ hasPermission: () => allowed }) }));
vi.mock("@tanstack/react-router", () => ({ useBlocker: () => ({ status: "idle" }) }));
vi.mock("../../hooks/useCategoryHooks", () => ({ useCategoryOptions: () => ({ data: [{ category_id: 1, category_name: "Power Tools" }, { category_id: 2, category_name: "Pumps" }] }) }));
vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({ useWarehouseOptions: () => ({ data: [{ warehouse_id: 9, location_name: "Main" }] }) }));
vi.mock("../../hooks/useEquipmentPhoto", () => ({ useUploadEquipmentImage: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("../../components/EquipmentPhotoDialog", () => ({ EquipmentPhotoDialog: ({ open, equipment }: any) => (open ? <div>photo dialog {equipment.equipment_name}</div> : null) }));

const machine = (id: number, over: any = {}) => ({
  equipment_id: id, equipment_name: `Drill - ${id}`, equipment_name_si: "", serial_number: `EQ-00${id}`, category_id: 1, warehouse_id: 9,
  base_rental_price: "500.00", extra_daily_rate: "400.00", minimum_rental_days: 1, total_owned_qty: 1, rented_qty: 0, defective_qty: 0, available_qty: 1,
  is_bulk_item: false, createdAt: "2026-01-02T00:00:00Z", ...over,
});
const save = vi.fn();
vi.mock("../../api/equipment.api", () => ({
  fetchEquipment: vi.fn(async () => ({ equipment: [machine(1), machine(2), machine(3, { rented_qty: 1 })], total: 3 })),
  fetchNextEquipment: vi.fn(async (id?: number) => (id ? { serial_number: "EQ-010", name_number: 4, equipment_name: "Drill - 4", equipment_name_si: "", base_name: "Drill", category_id: 1, warehouse_id: 9, base_rental_price: 500, extra_daily_rate: 400, minimum_rental_days: 1 } : { serial_number: "EQ-010" })),
  saveEquipmentSheet: (p: any) => save(p),
}));

import { EquipmentSheet } from "../EquipmentSheet";

const open = async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EquipmentSheet />
    </QueryClientProvider>,
  );
  await screen.findByText("Drill - 1");
};
const rowOf = (text: string) => screen.getByText(text).closest("tr") as HTMLElement;
const cellOf = (rowText: string, column: number) => rowOf(rowText).querySelector(`td[data-c="${column}"]`) as HTMLElement;
const grid = () => screen.getByRole("grid");
const RATE = 5;

const typeInto = (cell: HTMLElement, text: string) => {
  fireEvent.mouseDown(cell);
  fireEvent.keyDown(grid(), { key: "F2" });
  const input = cell.querySelector("input,select") as HTMLInputElement;
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter" });
};

beforeEach(() => {
  allowed = true;
  save.mockReset();
  Object.values(toast).forEach((f) => f.mockClear());
  localStorage.clear();
});

describe("equipment sheet", () => {
  it("shows every machine and its details", async () => {
    await open();
    expect(screen.getAllByTestId("sheet-row")).toHaveLength(3);
    expect(cellOf("Drill - 1", RATE).textContent).toBe("500");
    expect(cellOf("Drill - 1", 3).textContent).toBe("Power Tools");
  });

  it("an edited cell is coloured, shows the old value, and undo clears it", async () => {
    await open();
    typeInto(cellOf("Drill - 1", RATE), "650");
    const cell = cellOf("Drill - 1", RATE);
    expect(cell.textContent).toBe("650");
    expect(cell.className).toContain("edit");
    expect(cell.title).toContain("500");
    expect((screen.getByRole("button", { name: /Save 1 change$/ }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.keyDown(grid(), { key: "z", ctrlKey: true });
    expect(cellOf("Drill - 1", RATE).className).not.toContain("edit");
    expect((screen.getByRole("button", { name: /Save 0 changes/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("typing on a selected cell opens it blank; only text columns can take Sinhala typing", async () => {
    await open();
    fireEvent.mouseDown(cellOf("Drill - 1", RATE));
    fireEvent.keyDown(grid(), { key: "7" });
    const rate = cellOf("Drill - 1", RATE).querySelector("input") as HTMLInputElement;
    expect(rate.value).toBe("");
    expect(document.activeElement).toBe(rate);
    expect(rate.dataset.noSinhala).toBe("");
    fireEvent.keyDown(rate, { key: "Escape" });
    fireEvent.mouseDown(cellOf("Drill - 1", 1));
    fireEvent.keyDown(grid(), { key: "Process" });
    expect((cellOf("Drill - 1", 1).querySelector("input") as HTMLInputElement).dataset.noSinhala).toBeUndefined();
  });

  it("typing the old value back stops it counting as a change", async () => {
    await open();
    typeInto(cellOf("Drill - 1", RATE), "650");
    typeInto(cellOf("Drill - 1", RATE), "500.00");
    expect(cellOf("Drill - 1", RATE).className).not.toContain("edit");
  });

  it("a bad value is marked and blocks saving", async () => {
    await open();
    typeInto(cellOf("Drill - 1", RATE), "abc");
    expect(cellOf("Drill - 1", RATE).className).toContain("err");
    fireEvent.click(screen.getByRole("button", { name: /Save 1 change$/ }));
    expect(save).not.toHaveBeenCalled();
    expect(toast.showError).toHaveBeenCalled();
  });

  it("marks a deleted row, can bring it back, and asks before saving a delete", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Delete row Drill - 2" }));
    expect(rowOf("Drill - 2").className).toBe("del");
    fireEvent.click(screen.getByRole("button", { name: "Bring back Drill - 2" }));
    expect(rowOf("Drill - 2").className).not.toBe("del");

    fireEvent.click(screen.getByRole("button", { name: "Delete row Drill - 2" }));
    save.mockResolvedValue({ saved: true, created: [], updated: 0, deleted: 1, archived: 0 });
    fireEvent.click(screen.getByRole("button", { name: /Save 1 change$/ }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Delete and save" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ updates: [], creates: [], deletes: [{ key: "m2", equipment_id: 2 }] }));
  });

  it("won't delete a machine that is out on rent", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Delete row Drill - 3" }));
    expect(rowOf("Drill - 3").className).not.toBe("del");
    expect(toast.showWarning).toHaveBeenCalled();
  });

  it("a duplicate is a coloured new row with the next name and number", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Add one like this Drill - 1" }));
    const row = await screen.findByText("Drill - 4");
    expect(row.closest("tr")!.className).toBe("add");
    expect(within(row.closest("tr")!).getByText("EQ-010")).toBeTruthy();
  });

  it("pasting from Excel fills cells, and one value fills a selection", async () => {
    await open();
    fireEvent.mouseDown(cellOf("Drill - 1", RATE));
    fireEvent.paste(grid(), { clipboardData: { getData: () => "700\t600\n800\t750" } });
    expect(cellOf("Drill - 1", RATE).textContent).toBe("700");
    expect(cellOf("Drill - 1", RATE + 1).textContent).toBe("600");
    expect(cellOf("Drill - 2", RATE).textContent).toBe("800");

    fireEvent.mouseDown(cellOf("Drill - 1", 3));
    fireEvent.keyDown(grid(), { key: "ArrowDown", shiftKey: true });
    fireEvent.paste(grid(), { clipboardData: { getData: () => "Pumps" } });
    expect(cellOf("Drill - 1", 3).textContent).toBe("Pumps");
    expect(cellOf("Drill - 2", 3).textContent).toBe("Pumps");
  });

  it("sends only what changed", async () => {
    await open();
    typeInto(cellOf("Drill - 1", RATE), "650");
    save.mockResolvedValue({ saved: false, errors: [{ key: "m1", field: "serial_number", code: "number_taken" }] });
    fireEvent.click(screen.getByRole("button", { name: /Save 1 change$/ }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ updates: [{ key: "m1", equipment_id: 1, changes: { base_rental_price: "650" } }], creates: [], deletes: [] }));
    await waitFor(() => expect(cellOf("Drill - 1", 2).className).toContain("err"));
  });

  it("a saved machine's photo opens the same photo dialog", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /: Drill - 1$/ }));
    expect(await screen.findByText("photo dialog Drill - 1")).toBeTruthy();
  });

  it("is read-only without permission", async () => {
    allowed = false;
    await open();
    fireEvent.mouseDown(cellOf("Drill - 1", RATE));
    fireEvent.keyDown(grid(), { key: "F2" });
    expect(cellOf("Drill - 1", RATE).querySelector("input")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add row" })).toBeNull();
  });

  it("the search box narrows the rows", async () => {
    await open();
    fireEvent.change(screen.getByRole("textbox", { name: /Search/ }), { target: { value: "EQ-002" } });
    expect(screen.getAllByTestId("sheet-row")).toHaveLength(1);
  });
});
