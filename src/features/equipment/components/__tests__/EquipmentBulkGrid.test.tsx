import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

const toast = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn(), showInfo: vi.fn() };
vi.mock("@/components/ui/AppToast", () => ({ useToast: () => toast }));
vi.mock("@/stores/useAuthStore", () => ({ useAuthStore: (sel: any) => sel({ hasPermission: () => true }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("../../hooks/useCategoryHooks", () => ({ useCategoryOptions: () => ({ data: [{ category_id: 1, category_name: "Compressor" }] }) }));
vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({ useWarehouseOptions: () => ({ data: [{ warehouse_id: 9, location_name: "Main" }] }) }));
vi.mock("../../hooks/useEquipmentPhoto", () => ({ useUploadEquipmentImage: () => ({ mutateAsync: vi.fn() }) }));
const bulkSave = vi.fn();
vi.mock("../../api/equipment.api", () => ({
  fetchNextEquipment: vi.fn(async (id?: number) => (id ? { serial_number: "EQ-111", name_number: 3, base_name: "Compressor", base_name_si: "කොම්ප්‍රෙසර්", base_rental_price: 500, extra_daily_rate: 500, minimum_rental_days: 1, warehouse_id: 9 } : { serial_number: "EQ-111" })),
  bulkSaveEquipment: (rows: any) => bulkSave(rows),
}));

import { EquipmentBulkGrid } from "../EquipmentBulkGrid";
import { nextGridNameNumber, nextGridSerial, parsePaste } from "../../lib/equipmentNumbering";

const value = (name: RegExp) => (screen.getByRole("textbox", { name }) as HTMLInputElement).value;
const pickCompressor = async () => {
  fireEvent.change(within(screen.getAllByTestId("grid-row")[0]).getByRole("combobox"), { target: { value: "comp" } });
  fireEvent.click(await screen.findByRole("option", { name: "Compressor" }));
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
    expect(nextGridNameNumber("A", 3, ["A - 3", "A - 4", "B - 9"])).toBe(5);
  });
  it("only multi-cell paste is treated as a grid", () => {
    expect(parsePaste("Drill")).toBeNull();
    expect(parsePaste("a\tb\nc\td\n")).toEqual([["a", "b"], ["c", "d"]]);
  });
});

describe("bulk grid", () => {
  it("picking a type fills name, Sinhala, number and price", async () => {
    render(<EquipmentBulkGrid />);
    await pickCompressor();
    expect(value(/Sinhala\) 1$/)).toBe("කොම්ප්‍රෙසර් - 3");
    expect(value(/Equipment No\. 1$/)).toBe("EQ-111");
    expect(value(/Daily Rate 1$/)).toBe("500");
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

  it("pasting from Excel fills cells and adds rows", async () => {
    render(<EquipmentBulkGrid />);
    fireEvent.paste(screen.getByRole("textbox", { name: /Equipment name 1$/ }), { clipboardData: { getData: () => "Pump - 1\tපොම්ප - 1\nPump - 2\tපොම්ප - 2" } });
    await waitFor(() => expect(screen.getAllByTestId("grid-row")).toHaveLength(2));
    expect(value(/Sinhala\) 2$/)).toBe("පොම්ප - 2");
  });
});
