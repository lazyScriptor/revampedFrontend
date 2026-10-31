import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@/i18n";
import i18n from "@/i18n";
import { BillDateControl, toLocalInputValue } from "../BillDateControl";

i18n.changeLanguage("en");

describe("BillDateControl", () => {
  it("stays out of the way until asked, then starts from now", () => {
    const onChange = vi.fn();
    render(<BillDateControl value={null} onChange={onChange} hasLines />);
    fireEvent.click(screen.getByRole("button", { name: /Bill date: now/ }));
    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/));
  });

  it("warns about a future date and hides the apply button", () => {
    const future = toLocalInputValue(new Date(Date.now() + 2 * 86_400_000));
    render(<BillDateControl value={future} onChange={vi.fn()} onApplyToLines={vi.fn()} hasLines />);
    expect(screen.getByText("The bill date cannot be in the future.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Set all lines to this date" })).toBeNull();
  });

  it("applies the chosen day to the lines and can go back to now", () => {
    const onApply = vi.fn();
    const onChange = vi.fn();
    render(<BillDateControl value="2026-10-20T08:30" onChange={onChange} onApplyToLines={onApply} hasLines />);
    fireEvent.click(screen.getByRole("button", { name: "Set all lines to this date" }));
    expect(onApply).toHaveBeenCalledWith("2026-10-20");
    fireEvent.click(screen.getByRole("button", { name: "Use now" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
