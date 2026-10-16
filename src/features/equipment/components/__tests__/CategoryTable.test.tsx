import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryTable } from "../CategoryTable";

vi.mock("../../hooks/useCategoryHooks", () => ({
  useDeleteCategory: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe("CategoryTable Component", () => {
  const mockCategories = [
    {
      category_id: 1,
      category_name: "Cinema Cameras",
      description: "Professional high-end cinema and broadcast cameras",
      createdAt: "2026-01-01T00:00:00Z",
      equipment_count: 8,
    },
  ];

  it("renders category rows and typography elements without runtime errors", () => {
    render(
      <CategoryTable
        data={mockCategories}
        isLoading={false}
        rowCount={1}
        paginationModel={{ page: 0, pageSize: 20 }}
        onPaginationModelChange={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("Cinema Cameras")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText(/Professional high-end cinema/)).toBeInTheDocument();
  });
});
