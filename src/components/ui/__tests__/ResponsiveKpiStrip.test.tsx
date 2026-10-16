import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ResponsiveKpiStrip } from "../ResponsiveKpiStrip";

describe("ResponsiveKpiStrip Component", () => {
  it("renders children metrics properly", () => {
    render(
      <ResponsiveKpiStrip mobileLabel="Fleet Metrics">
        <div data-testid="metric-1">Metric 1</div>
        <div data-testid="metric-2">Metric 2</div>
      </ResponsiveKpiStrip>
    );

    expect(screen.getByTestId("metric-1")).toBeInTheDocument();
    expect(screen.getByTestId("metric-2")).toBeInTheDocument();
    expect(screen.getByText("Fleet Metrics")).toBeInTheDocument();
  });

  it("handles mobile expand and collapse toggle", () => {
    render(
      <ResponsiveKpiStrip mobileLabel="Fleet Metrics">
        <div>Child Content</div>
      </ResponsiveKpiStrip>
    );

    const toggleBtn = screen.getByRole("button", { name: /Hide/i });
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("button", { name: /Show/i })).toBeInTheDocument();
  });
});
