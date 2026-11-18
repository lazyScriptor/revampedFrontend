import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EquipmentImportWizard } from "../EquipmentImportWizard";

const mocks = vi.hoisted(() => ({
  importEquipmentSave: vi.fn(),
  downloadEquipmentExcelTemplate: vi.fn(),
  fetchEquipment: vi.fn(),
  navigate: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
  toastSuccess: vi.fn(),
  permissions: new Set(["equipment:create", "equipment:edit", "equipment:action:bulk_import", "category:create"]),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useBlocker: () => ({ status: "idle", proceed: vi.fn(), reset: vi.fn() }),
}));

vi.mock("@/components/ui/AppToast", () => ({
  useToast: () => ({
    showError: mocks.toastError,
    showWarning: mocks.toastWarning,
    showSuccess: mocks.toastSuccess,
  }),
}));

vi.mock("@/stores/useAuthStore", () => ({
  useAuthStore: (selector: (s: any) => any) =>
    selector({
      user: { plan: { tier: "pro", features: {}, limits: { max_equipment: 1000 } } },
      hasPermission: (code: string) => mocks.permissions.has(code),
    }),
}));

vi.mock("@/features/equipment/hooks/useCategoryHooks", () => ({
  useCategoryOptions: () => ({
    data: [
      { category_id: 1, category_name: "Power Tools" },
      { category_id: 2, category_name: "Generator" },
    ],
  }),
}));

vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({
  useWarehouseOptions: () => ({
    data: [
      { warehouse_id: 10, location_name: "Main Store" },
      { warehouse_id: 11, location_name: "Colombo" },
    ],
  }),
  useSingleLocation: () => ({ single: false, only: null }),
}));

vi.mock("@/features/equipment/api/equipment.api", () => ({
  fetchEquipment: () => mocks.fetchEquipment(),
  importEquipmentSave: (payload: unknown) => mocks.importEquipmentSave(payload),
  downloadEquipmentExcelTemplate: () => mocks.downloadEquipmentExcelTemplate(),
}));

const renderWizard = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EquipmentImportWizard />
    </QueryClientProvider>,
  );
};

const uploadCsvFile = (csv: string, name = "equipment.csv") => {
  const file = new File([csv], name, { type: "text/csv" });
  if (typeof file.text !== "function") {
    Object.defineProperty(file, "text", { value: async () => csv });
  }
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  fireEvent.change(input, { target: { files: [file] } });
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EquipmentImportWizard", () => {
  it("runs file upload -> match columns -> resolve new category -> confirm import -> done", async () => {
    mocks.fetchEquipment.mockResolvedValue({
      equipment: [{ equipment_id: 1, serial_number: "EQ-001", equipment_name: "Existing Saw" }],
      total: 1,
    });
    mocks.importEquipmentSave.mockResolvedValue({
      saved: true,
      created: [{ key: "imp-1", equipment_id: 201, serial_number: "EQ-101" }],
      updated: 0,
      categoriesCreated: [{ ref: "newcat:1", category_id: 99, name: "Scaffolding" }],
    });

    renderWizard();

    expect(screen.getByText("What your file needs")).toBeTruthy();

    uploadCsvFile('Name,Category,Location,Base price\nScaffold Frame,Scaffolding,Main Store,"Rs. 1,500"');

    // Advances to Step 2: Match columns
    await waitFor(() => {
      expect(screen.getByText("4 of 4 columns matched")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Continue to Check & fix" }));

    // Advances to Step 3: Check & fix
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Names to sort out \(1\)/ })).toBeTruthy();
    });

    // Resolve unfamiliar category "Scaffolding" as a new category
    fireEvent.click(screen.getByRole("button", { name: /Names to sort out \(1\)/ }));
    const createCatBtn = await screen.findByRole("button", { name: /Create new category "Scaffolding"/ });
    fireEvent.click(createCatBtn);

    // Close drawer
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(screen.getByText("New categories 1")).toBeTruthy();
      expect(screen.getByText("Problems (0)")).toBeTruthy();
    });

    // Import & Confirm
    fireEvent.click(screen.getByRole("button", { name: "Import 1 row" }));
    const confirmBtn = await screen.findByRole("button", { name: "Import now" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mocks.importEquipmentSave).toHaveBeenCalledTimes(1);
    });

    const sentPayload = mocks.importEquipmentSave.mock.calls[0][0];
    expect(sentPayload.newCategories).toEqual([{ ref: "newcat:1", name: "Scaffolding" }]);
    expect(sentPayload.creates).toHaveLength(1);
    expect(sentPayload.creates[0].values).toMatchObject({
      equipment_name: "Scaffold Frame",
      category_id: "newcat:1",
      warehouse_id: 10,
      base_rental_price: 1500,
    });

    // Advances to Step 4: Done
    await waitFor(() => {
      expect(screen.getByText("Import complete")).toBeTruthy();
      expect(screen.getByText("Added 1 new machine(s)")).toBeTruthy();
      expect(screen.getByText("Assigned EQ numbers: EQ-101 – EQ-101")).toBeTruthy();
    });
  });

  it("maps server saved: false errors back onto the grid without losing rows", async () => {
    mocks.fetchEquipment.mockResolvedValue({ equipment: [], total: 0 });
    mocks.importEquipmentSave.mockImplementation(async (payload: any) => ({
      saved: false,
      errors: [{ key: payload.creates[0].key, field: "equipment_name", code: "name_required" }],
    }));

    renderWizard();

    uploadCsvFile("Name,Category,Location,Base price\nHilti Breaker,Power Tools,Main Store,2000");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continue to Check & fix" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue to Check & fix" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Import 1 row" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Import 1 row" }));
    fireEvent.click(await screen.findByRole("button", { name: "Import now" }));

    await waitFor(() => {
      expect(screen.getByText(/1 row could not be saved/)).toBeTruthy();
      expect(screen.getByText("Problems (1)")).toBeTruthy();
    });
  });

  it("explains missing required fields in Step 2 and supports Start with an empty sheet", async () => {
    mocks.fetchEquipment.mockResolvedValue({ equipment: [], total: 0 });

    renderWizard();

    uploadCsvFile("Name,Category,Location\nBosch Saw,Power Tools,Main Store");

    await waitFor(() => {
      expect(screen.getByText(/Map or choose a default value for: Base price/)).toBeTruthy();
    });
    const continueBtn = screen.getByRole("button", { name: "Continue to Check & fix" }) as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);

    // Go back and test "Start with an empty sheet"
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    const emptyBtn = await screen.findByRole("button", { name: "Start with an empty sheet" });
    fireEvent.click(emptyBtn);

    await waitFor(() => {
      expect(screen.getByText("All 20")).toBeTruthy();
    });
  });
});
