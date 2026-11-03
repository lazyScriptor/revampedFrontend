import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const showSuccess = vi.fn();
vi.mock("@/components/ui/AppToast", () => ({ useToast: () => ({ showSuccess, showWarning: vi.fn() }) }));
const state: any = { isError: false, error: null, isPending: false };
const mutate = vi.fn();
vi.mock("../../hooks/useEquipmentHooks", () => ({
  useDeleteEquipment: () => ({ ...state, mutate, reset: vi.fn() }),
}));

import { EquipmentDeleteDialog } from "../EquipmentDeleteDialog";
import { ImageHoverPreview } from "../ImageHoverPreview";

beforeEach(() => {
  mutate.mockReset();
  showSuccess.mockReset();
  state.isError = false;
  state.error = null;
});

describe("delete dialog", () => {
  it("waits for the server, then says the machine was archived", () => {
    const onClose = vi.fn();
    render(<EquipmentDeleteDialog equipmentId={5} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onClose).not.toHaveBeenCalled();
    mutate.mock.calls[0][1].onSuccess({ archived: true });
    expect(showSuccess.mock.calls[0][0]).toMatch(/past invoices/);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows why a delete was refused and stays open", () => {
    state.isError = true;
    state.error = { message: "2 units are currently checked out" };
    render(<EquipmentDeleteDialog equipmentId={5} onClose={() => {}} />);
    expect(screen.getByText(/2 units are currently checked out/)).toBeTruthy();
  });
});

describe("hover preview", () => {
  it("shows the large image on hover", async () => {
    render(
      <ImageHoverPreview src="/uploads/a.webp">
        <button>thumb</button>
      </ImageHoverPreview>,
    );
    fireEvent.mouseOver(screen.getByText("thumb"));
    await waitFor(() => expect(screen.getByTestId("image-hover-preview").getAttribute("src")).toBe("/uploads/a.webp"));
  });

  it("no image: only the plain label", async () => {
    render(
      <ImageHoverPreview fallbackTitle="Add photo">
        <button>thumb</button>
      </ImageHoverPreview>,
    );
    fireEvent.mouseOver(screen.getByText("thumb"));
    await screen.findByText("Add photo");
    expect(screen.queryByTestId("image-hover-preview")).toBeNull();
  });
});
