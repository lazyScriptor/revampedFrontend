import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SheetGrid } from "../SheetGrid";
import { COLUMNS, blankValues, validateRows, viewNewRow, type Lookups, type SheetRow } from "../sheetModel";

const lookups: Lookups = {
  categories: [{ category_id: 1, category_name: "Power Tools" }],
  warehouses: [{ warehouse_id: 9, location_name: "Main" }],
};

const labels = {
  was: (v: string) => `Was ${v}`,
  error: (code: string) => code,
  photo: "Photo",
  duplicate: "Duplicate",
  remove: "Remove",
  restore: "Restore",
};

describe("SheetGrid optional extension props & validateRows flagUnnamedNewRows", () => {
  it("flags unnamed new rows only when flagUnnamedNewRows is true", () => {
    const rows = [
      viewNewRow({
        key: "r1",
        values: blankValues({ category_id: "1", warehouse_id: "9", base_rental_price: "500" }),
      }),
    ];

    expect(validateRows(rows)).toEqual({});
    expect(validateRows(rows, { flagUnnamedNewRows: true })).toEqual({
      r1: { equipment_name: "name_required" },
    });
  });

  it("renders status column, amber cellNote with tooltip, and cellBadge", () => {
    const rows: SheetRow[] = [
      viewNewRow({
        key: "r1",
        values: blankValues({
          equipment_name: "Hilti Breaker",
          category_id: "1",
          warehouse_id: "9",
          base_rental_price: "1500",
        }),
      }),
    ];

    const editableCols = COLUMNS.filter((c) => c.kind !== "readonly");
    render(
      <SheetGrid
        rows={rows}
        columns={editableCols}
        lookups={lookups}
        errors={{}}
        labels={labels}
        isEditable={() => true}
        onEditCells={vi.fn()}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        showPhotoColumn={false}
        showActionsColumn={false}
        rowStatusLabel="Status"
        renderRowStatus={(row) => <span data-testid={`status-${row.key}`}>Ready</span>}
        cellNote={(_row, field) => (field === "base_rental_price" ? "Was 'Rs 1,500.00'" : undefined)}
        cellBadge={(_row, field) => (field === "category_id" ? <span data-testid="new-cat-badge">New</span> : undefined)}
      />,
    );

    expect(screen.getByTestId("status-r1").textContent).toBe("Ready");
    expect(screen.getByTestId("new-cat-badge").textContent).toBe("New");

    const tr = screen.getByTestId("sheet-row");
    const rateColIdx = editableCols.findIndex((c) => c.key === "base_rental_price");
    const rateCell = tr.querySelector(`td[data-c="${rateColIdx}"]`) as HTMLElement;
    expect(rateCell.className).toContain("note");
    expect(rateCell.getAttribute("title")).toBe("Was 'Rs 1,500.00'");
  });
});
