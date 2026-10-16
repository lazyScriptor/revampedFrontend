import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CustomerTable } from "../CustomerTable";

vi.mock("../../hooks/useCustomerHooks", () => ({
  useDeleteCustomer: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe("CustomerTable Component", () => {
  const mockCustomers = [
    {
      customer_id: 1,
      first_name: "Kamal",
      last_name: "Silva",
      company_name: "Silva Media",
      customer_type: "Individual",
      phone_number: "0771234567",
      nic_number: "199212345678",
      rating: 5,
      is_id_retained_currently: false,
      deposit_balance: 15000,
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  it("renders customer data rows with Typography, NIC, and advance amounts without errors", () => {
    render(
      <CustomerTable
        data={mockCustomers}
        isLoading={false}
        rowCount={1}
        paginationModel={{ page: 0, pageSize: 20 }}
        onPaginationModelChange={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("Kamal Silva")).toBeInTheDocument();
    expect(screen.getByText("199212345678")).toBeInTheDocument();
    expect(screen.getByText("0771234567")).toBeInTheDocument();
    expect(screen.getByText(/15,000/)).toBeInTheDocument();
  });
});
