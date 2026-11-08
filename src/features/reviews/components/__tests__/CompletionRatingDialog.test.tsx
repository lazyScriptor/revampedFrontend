import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ reviews: [] as any[], create: vi.fn() }));
vi.mock("@/features/reviews/hooks/useInvoiceReviews", () => ({
  useInvoiceReviews: () => ({ data: mocks.reviews, isLoading: false }),
  useCreateReview: () => ({ mutate: mocks.create, isPending: false }),
}));

import { CompletionRatingDialog } from "../CompletionRatingDialog";

const renderDialog = (over: Record<string, unknown> = {}) =>
  render(
    <CompletionRatingDialog
      open
      invoiceId={42}
      customerName="Test Customer"
      onClose={vi.fn()}
      showToast={vi.fn()}
      {...over}
    />,
  );

beforeEach(() => {
  mocks.reviews = [];
  mocks.create.mockClear();
});

describe("CompletionRatingDialog", () => {
  it("saves a star rating with no comment (comment is optional)", () => {
    renderDialog();
    expect(screen.getByText(/Rate this customer/i)).toBeInTheDocument();
    expect(screen.getByText("Test Customer")).toBeInTheDocument();
    // No rating yet -> Save is disabled, so a rating cannot be skipped past.
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "4 Stars" }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(mocks.create).toHaveBeenCalledWith(
      { rating: 4, comment: null, stage: "return", is_primary: true },
      expect.any(Object),
    );
  });

  it("saves the comment when one is typed", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "5 Stars" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Returned everything on time" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(mocks.create).toHaveBeenCalledWith(
      { rating: 5, comment: "Returned everything on time", stage: "return", is_primary: true },
      expect.any(Object),
    );
  });

  it("Skip closes without creating a review", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not ask again when this invoice already has a primary rating", () => {
    mocks.reviews = [{ review_id: 1, is_primary: true, rating: 5, stage: "return" }];
    renderDialog();
    expect(screen.getByText(/already has a customer rating/i)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "4 Stars" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });
});
