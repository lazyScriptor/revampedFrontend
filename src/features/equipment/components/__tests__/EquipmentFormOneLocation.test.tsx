import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "@/app/theme";

let locations = [{ warehouse_id: 9, location_name: "Main" }];
vi.mock("@/features/warehouses/hooks/useWarehouseOptions", () => ({
  useWarehouseOptions: () => ({ data: locations, isLoading: false }),
  useSingleLocation: () => ({ single: locations.length === 1, only: locations.length === 1 ? locations[0] : null }),
}));
vi.mock("@/features/equipment/hooks/useCategoryHooks", () => ({ useCategoryOptions: () => ({ data: [{ category_id: 1, category_name: "Tools" }], isLoading: false }) }));
vi.mock("../../hooks/useEquipmentHooks", () => ({ useCreateEquipment: () => ({ mutate: vi.fn(), isPending: false }), useUpdateEquipment: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("../../hooks/useEquipmentPhoto", () => ({ useUploadEquipmentImage: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("../../api/equipment.api", () => ({ fetchNextEquipment: vi.fn(async () => ({ serial_number: "EQ-1" })), fetchEquipment: vi.fn(async () => ({ equipment: [], total: 0 })) }));
vi.mock("@/components/ui/AppToast", () => ({ useToast: () => ({ showWarning: vi.fn() }) }));

import { EquipmentFormDialog } from "../EquipmentFormDialog";

const open = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider theme={createAppTheme()}>
        <EquipmentFormDialog open onClose={vi.fn()} />
      </ThemeProvider>
    </QueryClientProvider>,
  );

describe("location in the equipment form", () => {
  it("one location: nothing to choose", async () => {
    locations = [{ warehouse_id: 9, location_name: "Main" }];
    open();
    await waitFor(() => expect((screen.getByLabelText(/SKU/) as HTMLInputElement).value).toBe("EQ-1"));
    expect(screen.queryByLabelText(/Warehouse/)).toBeNull();
  });
  it("more than one: the choice is there", async () => {
    locations = [{ warehouse_id: 9, location_name: "Main" }, { warehouse_id: 10, location_name: "Second" }];
    open();
    await waitFor(() => expect(screen.getByLabelText(/Warehouse/)).toBeTruthy());
  });
});
