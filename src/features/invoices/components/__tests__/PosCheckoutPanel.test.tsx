import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PosCheckoutPanel } from "../PosCheckoutPanel";
import { CartItem } from "../PosLedgerPanel";

describe("PosCheckoutPanel Component Tests", () => {
  const mockCartItems: CartItem[] = [
    {
      cart_id: "cart-1",
      equipment_id: 1,
      equipment_name: "Rotary Hammer Drill",
      available_qty: 5,
      is_bulk_item: false,
      borrow_quantity: 2,
      borrow_date: "2026-10-16",
      expected_return_date: "2026-10-18",
      locked_base_price: 1500,
      locked_minimum_days: 1,
      locked_extra_daily_rate: 1500,
      pricing_mode: "daily",
      track_overdue: true,
    },
  ];

  const defaultFees = {
    transport: 500,
    discount: 200,
    advance: 1000,
  };

  const defaultCustomer = {
    customer_id: 10,
    first_name: "Nimal",
    last_name: "Perera",
    deposit_balance: 5000,
  };

  it("renders cart item counts and subtotal correctly", () => {
    render(
      <PosCheckoutPanel
        cartItems={mockCartItems}
        selectedCustomer={defaultCustomer}
        fees={defaultFees}
        setFees={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
        onConfirmDispatch={vi.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByText(/Subtotal \(1 items\)/i)).toBeInTheDocument();
    // 2 days * 1500 * 2 units = Rs. 6,000
    expect(screen.getByText(/Rs. 6,000/i)).toBeInTheDocument();
  });

  it("calculates grand total with transport and discount: (6000 + 500 - 200 = 6,300)", () => {
    render(
      <PosCheckoutPanel
        cartItems={mockCartItems}
        selectedCustomer={defaultCustomer}
        fees={defaultFees}
        setFees={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
        onConfirmDispatch={vi.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByText(/Grand Total/i)).toBeInTheDocument();
    expect(screen.getByText(/Rs. 6,300/i)).toBeInTheDocument();
  });

  it("applies client wallet balance when 'Apply Wallet' is clicked", () => {
    const setFeesMock = vi.fn();

    render(
      <PosCheckoutPanel
        cartItems={mockCartItems}
        selectedCustomer={defaultCustomer} // deposit_balance is 5000
        fees={{ transport: 0, discount: 0, advance: 0 }}
        setFees={setFeesMock}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
        onConfirmDispatch={vi.fn()}
        isSubmitting={false}
      />
    );

    const applyWalletBtn = screen.getByRole("button", { name: /^Apply$/i });
    fireEvent.click(applyWalletBtn);

    expect(setFeesMock).toHaveBeenCalled();
  });

  it("disables dispatch button when no customer is selected or cart is empty", () => {
    const { rerender } = render(
      <PosCheckoutPanel
        cartItems={[]}
        selectedCustomer={defaultCustomer}
        fees={defaultFees}
        setFees={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
        onConfirmDispatch={vi.fn()}
        isSubmitting={false}
      />
    );

    const dispatchBtn = screen.getByRole("button", { name: /Place Dispatch Order/i });
    expect(dispatchBtn).toBeDisabled();

    // Re-render with items but NO customer
    rerender(
      <PosCheckoutPanel
        cartItems={mockCartItems}
        selectedCustomer={null}
        fees={defaultFees}
        setFees={vi.fn()}
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
        onConfirmDispatch={vi.fn()}
        isSubmitting={false}
      />
    );

    expect(dispatchBtn).toBeDisabled();
  });
});
