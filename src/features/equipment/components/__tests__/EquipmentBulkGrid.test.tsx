import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const toast = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() };
vi.mock("@/components/ui/AppToast", () => ({ useToast: () => toast }));
vi.mock("@/stores/useAuthStore", () => ({ useAuthStore: (sel: any) => sel({ hasPermission: () => true }) }));
vi.mock("../../hooks/useCategoryHooks", () => ({ useCategoryOptions: () => ({ data: [{ category_id: 1, category_name: "Compressor" }] }) }));
vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({ useWarehouseOptions: () => ({ data: [{ warehouse_id: 9, location_name: "Main" }] }) }));
vi.mock("../../hooks/useEquipmentPhoto", () => ({ useUploadEquipmentImage: () => ({ mutateAsync: vi.fn() }) }));
const bulkSave = vi.fn();
vi.mock("../../api/equipment.api", () => ({
  fetchEquipment: vi.fn(async () => ({ equipment: [{ equipment_id: 6, equipment_name: "Compressor - 2", equipment_name_si: "කොම්ප්‍රෙසර් - 2", serial_number: "EQ-100" }], total: 1 })),
  fetchNextEquipment: vi.fn(async (id?: number) => (id ? { serial_number: "EQ-111", name_number: 3, equipment_name: "Compressor - 3", equipment_name_si: "කොම්ප්‍රෙසර් - 3", base_name: "Compressor", base_name_si: "කොම්ප්‍රෙසර්", category_id: 1, base_rental_price: 500, extra_daily_rate: 500, minimum_rental_days: 1, warehouse_id: 9 } : { serial_number: "EQ-111" })),
  bulkSaveEquipment: (rows: any) => bulkSave(rows),
}));

import { EquipmentBulkGrid } from "../EquipmentBulkGrid";
import { fetchNextEquipment } from "../../api/equipment.api";
import { nextGridNameNumber, nextGridSerial, parsePaste, renumberName, renumberSinhala } from "../../lib/equipmentNumbering";

const render = (ui: ReactElement) => rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const value = (name: RegExp) => (screen.getByLabelText(name) as HTMLInputElement).value;
const pickCompressor = async () => {
  fireEvent.change(screen.getByRole("combobox", { name: /Equipment name 1$/ }), { target: { value: "comp" } });
  fireEvent.click(await screen.findByRole("option", { name: /Compressor - 2/ }));
  await waitFor(() => expect(value(/Equipment name 1$/)).toBe("Compressor - 3"));
};

beforeEach(() => {
  bulkSave.mockReset();
  localStorage.clear();
});

describe("numbering helpers", () => {
  it("stays ahead of the server and the grid", () => {
    expect(nextGridSerial("EQ-111", ["EQ-111", "EQ-112"])).toBe(113);
    expect(nextGridSerial("EQ-111", [])).toBe(111);
    expect(nextGridSerial("EQ-111", ["EQ -120"])).toBe(121);
    expect(nextGridNameNumber("A - 3", 3, ["A-3", "a 4", "B - 9"])).toBe(5);
  });
  it("keeps the format of the name", () => {
    expect(renumberName("Drill-06", 7)).toBe("Drill-07");
    expect(renumberName("6 - Drill", 7)).toBe("7 - Drill");
    expect(renumberName("Mixer", 2)).toBe("Mixer - 2");
    expect(renumberName("Husqvarna Chainsaw 445", 2)).toBe("Husqvarna Chainsaw 445 - 2");
    expect(renumberName("Hilti bit 15", 16)).toBe("Hilti bit 16");
    expect(renumberSinhala("කියත", "9-Saw", 10)).toBe("10-කියත");
    expect(renumberSinhala("කියත", "Saw (9)", 10)).toBe("කියත (10)");
    expect(renumberSinhala("", "Saw - 9", 10)).toBe("");
  });
  it("only multi-cell paste is treated as a grid", () => {
    expect(parsePaste("Drill")).toBeNull();
    expect(parsePaste("a\tb\nc\td\n")).toEqual([["a", "b"], ["c", "d"]]);
  });
});

describe("bulk grid", () => {
  it("picking a machine fills the next name, Sinhala, number, category and price", async () => {
    render(<EquipmentBulkGrid />);
    await pickCompressor();
    expect(value(/Sinhala\) 1$/)).toBe("කොම්ප්‍රෙසර් - 3");
    expect(value(/Equipment No\. 1$/)).toBe("EQ-111");
    expect(value(/Daily Rate 1$/)).toBe("500");
    expect(value(/Category 1$/)).toBe("Compressor");
  });

  it("'add more like this' numbers each copy and saves them together", async () => {
    render(<EquipmentBulkGrid />);
    await pickCompressor();
    fireEvent.change(screen.getByRole("textbox", { name: "Copies" }), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Add 2 more like this 1/ }));
    expect(screen.getAllByTestId("grid-row")).toHaveLength(3);
    expect(value(/Equipment name 3$/)).toBe("Compressor - 5");
    expect(value(/Sinhala\) 3$/)).toBe("කොම්ප්‍රෙසර් - 5");
    expect(value(/Equipment No\. 3$/)).toBe("EQ-113");

    bulkSave.mockResolvedValue({ saved: false, errors: [{ row: 2, field: "serial_number", code: "number_taken" }] });
    fireEvent.click(screen.getByRole("button", { name: /Save 3 rows/ }));
    await screen.findByText("Already used");
    const sent = bulkSave.mock.calls[0][0];
    expect(sent).toHaveLength(3);
    expect(sent[1]).toMatchObject({ category_id: 1, equipment_name: "Compressor - 4", serial_number: "EQ-112", warehouse_id: 9 });
    expect(sent[1].photo).toBeUndefined();
  });

  it("following a quantity machine keeps the name without a number and says why", async () => {
    vi.mocked(fetchNextEquipment).mockResolvedValueOnce({ serial_number: "EQ-111" });
    render(<EquipmentBulkGrid />);
    await waitFor(() => expect(value(/Equipment No\. 1$/)).toBe("EQ-111"));
    vi.mocked(fetchNextEquipment).mockResolvedValueOnce({ serial_number: "EQ-111", name_number: 2, equipment_name: "Compressor - 2", base_name: "Compressor", is_bulk_item: true, total_owned_qty: 100 });
    fireEvent.change(screen.getByRole("combobox", { name: /Equipment name 1$/ }), { target: { value: "comp" } });
    fireEvent.click(await screen.findByRole("option", { name: /Compressor - 2/ }));
    await waitFor(() => expect(value(/Equipment name 1$/)).toBe("Compressor"));
    expect(toast.showInfo).toHaveBeenCalled();
  });

  it("choosing a category leaves the name alone", async () => {
    render(<EquipmentBulkGrid />);
    fireEvent.change(screen.getByRole("combobox", { name: /Category 1$/ }), { target: { value: "comp" } });
    fireEvent.click(await screen.findByRole("option", { name: "Compressor" }));
    expect(value(/Category 1$/)).toBe("Compressor");
    expect(value(/Equipment name 1$/)).toBe("");
  });

  it("pasting from Excel fills cells and adds rows", async () => {
    render(<EquipmentBulkGrid />);
    fireEvent.paste(screen.getByRole("combobox", { name: /Equipment name 1$/ }), { clipboardData: { getData: () => "Pump - 1\tපොම්ප - 1\nPump - 2\tපොම්ප - 2" } });
    await waitFor(() => expect(screen.getAllByTestId("grid-row")).toHaveLength(2));
    expect(value(/Sinhala\) 2$/)).toBe("පොම්ප - 2");
  });
});
