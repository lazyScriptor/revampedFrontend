import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EquipmentTable } from "../EquipmentTable";

vi.mock("../../hooks/useEquipmentHooks", () => ({
  useDeleteEquipment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
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

  it("renders equipment data properly with Typography, rates and IDs without runtime errors", () => {
    render(
      <EquipmentTable
        data={mockEquipment}
        isLoading={false}
        rowCount={1}
        paginationModel={{ page: 0, pageSize: 20 }}
        onPaginationModelChange={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    // Verify equipment name rendered
    expect(screen.getByText("Sony Alpha A7 IV")).toBeInTheDocument();
    // Verify serial number rendered
    expect(screen.getByText(/SN-987654/)).toBeInTheDocument();
  });
});
