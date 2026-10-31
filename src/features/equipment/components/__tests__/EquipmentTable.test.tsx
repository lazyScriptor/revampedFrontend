import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EquipmentTable } from "../EquipmentTable";
import { useAuthStore } from "@/stores/useAuthStore";

vi.mock("../../hooks/useEquipmentHooks", () => ({
  useDeleteEquipment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/lib/socket", () => ({ connectSocket: vi.fn(), getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }));
vi.mock("@/features/signatures/hooks/useSignatures", () => ({
  useMyDevices: () => ({ isLoading: false, data: { devices: [] } }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("EquipmentTable Component", () => {
  const mockEquipment = [
    {
      equipment_id: 101,
      equipment_name: "Sony Alpha A7 IV",
      model_number: "ILCE-7M4",
      serial_number: "SN-987654",
      daily_rate: 7500,
      extra_rate_per_hour: 500,
      purchase_cost: 650000,
      inventory_type: "serialized",
      total_quantity: 5,
      available_quantity: 3,
      rented_quantity: 2,
      in_repair_quantity: 0,
      category: { category_name: "Mirrorless Cameras" },
      warehouse: { name: "Central Vault" },
    },
  ];

  const renderTable = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <EquipmentTable
          data={mockEquipment}
          isLoading={false}
          rowCount={1}
          paginationModel={{ page: 0, pageSize: 20 }}
          onPaginationModelChange={vi.fn()}
          onEdit={vi.fn()}
        />
      </QueryClientProvider>,
    );

  it("tapping a row's photo opens the photo dialog for that machine", () => {
    useAuthStore.setState({ hasPermission: (code: string) => code === "equipment:edit" } as any);
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: /Sony Alpha A7 IV/ }));
    expect(screen.getByText("equipment.photo.uploadFromComputer")).toBeInTheDocument();
  });

  it("renders equipment data properly with Typography, rates and IDs without runtime errors", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
      <EquipmentTable
        data={mockEquipment}
        isLoading={false}
        rowCount={1}
        paginationModel={{ page: 0, pageSize: 20 }}
        onPaginationModelChange={vi.fn()}
        onEdit={vi.fn()}
      />
      </QueryClientProvider>
    );

    // Verify equipment name rendered
    expect(screen.getByText("Sony Alpha A7 IV")).toBeInTheDocument();
    // Verify serial number rendered
    expect(screen.getByText(/SN-987654/)).toBeInTheDocument();
  });
});
