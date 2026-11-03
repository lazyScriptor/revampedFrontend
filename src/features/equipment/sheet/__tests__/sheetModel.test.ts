import { describe, it, expect } from "vitest";
import {
  COLUMNS, EMPTY_STATE, baseRow, blankValues, buildPayload, countChanges, displayValue, isDirty, nextNameNumberIn, parseInput,
  selectionStats, setCells, toggleDeleted, validateRows, viewNewRow, viewRow, visibleRows,
} from "../sheetModel";

const machine = (id: number, over: any = {}) => ({
  equipment_id: id, equipment_name: `Drill - ${id}`, equipment_name_si: "", serial_number: `EQ-${id}`, category_id: 1, warehouse_id: 9,
  base_rental_price: "500.00", extra_daily_rate: "400.00", minimum_rental_days: 1, purchase_cost: null, total_owned_qty: 1, rented_qty: 0,
  defective_qty: 0, available_qty: 1, is_bulk_item: false, createdAt: "2026-01-02T00:00:00Z", ...over,
});
const lookups = { categories: [{ category_id: 1, category_name: "Power Tools" }, { category_id: 2, category_name: "Pumps" }], warehouses: [{ warehouse_id: 9, location_name: "Main" }] };
const col = (key: string) => COLUMNS.find((c) => c.key === key)!;
const bases = (...ms: any[]) => new Map(ms.map((m) => { const r = baseRow(m); return [r.key, r]; }));

describe("changes", () => {
  it("putting a value back stops it counting as edited; 500 equals 500.00", () => {
    const b = bases(machine(1));
    const one = setCells(EMPTY_STATE, b, [{ key: "m1", field: "base_rental_price", value: "650" }]);
    expect(countChanges(one).editedCells).toBe(1);
    expect(isDirty(setCells(one, b, [{ key: "m1", field: "base_rental_price", value: "500.00" }]))).toBe(false);
  });
  it("deleting a new row removes it; deleting a saved row toggles", () => {
    const withNew = { ...EMPTY_STATE, added: [{ key: "n1", values: blankValues() }] };
    expect(toggleDeleted(withNew, ["n1"]).added).toHaveLength(0);
    const del = toggleDeleted(EMPTY_STATE, ["m1"]);
    expect(del.deleted).toEqual(["m1"]);
    expect(toggleDeleted(del, ["m1"]).deleted).toEqual([]);
  });
  it("sends only the changed cells, never edits for a deleted row", () => {
    const b = bases(machine(1), machine(2));
    let s = setCells(EMPTY_STATE, b, [
      { key: "m1", field: "base_rental_price", value: "650" },
      { key: "m1", field: "category_id", value: "2" },
      { key: "m2", field: "equipment_name", value: "X - 1" },
    ]);
    s = toggleDeleted(s, ["m2"]);
    s = { ...s, added: [{ key: "n1", values: blankValues({ equipment_name: "New - 1", is_bulk_item: "true" }) }] };
    const p = buildPayload(s, b);
    expect(p.updates).toEqual([{ key: "m1", equipment_id: 1, changes: { base_rental_price: "650", category_id: 2 } }]);
    expect(p.deletes).toEqual([{ key: "m2", equipment_id: 2 }]);
    expect(p.creates[0].values).toMatchObject({ equipment_name: "New - 1", is_bulk_item: true });
  });
});

describe("validation", () => {
  const view = (m: any, change: any) => viewRow(baseRow(m), change, false);
  it("only flags rows someone touched", () => {
    expect(validateRows([baseRow(machine(1, { equipment_name: "" }))])).toEqual({});
  });
  it("names each problem", () => {
    const errs = validateRows([view(machine(1, { rented_qty: 3, is_bulk_item: true }), { equipment_name: "", base_rental_price: "abc", total_owned_qty: "2" })]);
    expect(errs.m1).toMatchObject({ equipment_name: "name_required", base_rental_price: "price_required", total_owned_qty: "qty_below_out" });
    expect(validateRows([view(machine(1), { total_owned_qty: "5" })]).m1.total_owned_qty).toBe("bulk_total");
  });
  it("two rows cannot share an EQ number, whatever the case", () => {
    expect(validateRows([view(machine(1), { serial_number: "eq-2" }), baseRow(machine(2))]).m1.serial_number).toBe("number_taken");
  });
  it("a new row needs its details but not a number", () => {
    const errs = validateRows([viewNewRow({ key: "n1", values: blankValues({ equipment_name: "A - 1" }) })]);
    expect(errs.n1).toMatchObject({ category_id: "category_required", warehouse_id: "warehouse_required", base_rental_price: "price_required" });
    expect(errs.n1.serial_number).toBeUndefined();
  });
});

describe("typing and pasting", () => {
  it("understands names, money, dates and yes/no", () => {
    expect(parseInput(col("category_id"), "pumps", lookups)).toBe("2");
    expect(parseInput(col("category_id"), "Nope", lookups)).toBeNull();
    expect(parseInput(col("base_rental_price"), "Rs. 1,500", lookups)).toBe("1500");
    expect(parseInput(col("end_of_warranty_date"), "3/11/2026", lookups)).toBe("2026-11-03");
    expect(parseInput(col("end_of_warranty_date"), "2026-1-5", lookups)).toBe("2026-01-05");
    expect(parseInput(col("is_bulk_item"), "yes", lookups)).toBe("true");
    expect(parseInput(col("rented_qty"), "5", lookups)).toBeNull();
  });
  it("shows names for categories and stock from the server", () => {
    const r = baseRow(machine(1, { rented_qty: 2 }));
    expect(displayValue(col("category_id"), r, lookups)).toBe("Power Tools");
    expect(displayValue(col("rented_qty"), r, lookups)).toBe("2");
    expect(displayValue(col("createdAt"), r, lookups)).toBe("2026-01-02");
  });
});

describe("what shows", () => {
  const opts = { search: "", categoryId: "", view: "all" as const, sort: null, errors: {} };
  const rows = [baseRow(machine(10)), baseRow(machine(2)), baseRow(machine(3, { equipment_name: "Pump - 1", category_id: 2, equipment_name_si: "පොම්ප", image_url: "/a.webp" }))];

  it("sorts names naturally, with new rows on top", () => {
    const shown = visibleRows([...rows, viewNewRow({ key: "n1", values: blankValues() })], opts, lookups);
    expect(shown.map((r) => r.key)).toEqual(["n1", "m2", "m10", "m3"]);
  });
  it("sorts numbers as numbers", () => {
    const shown = visibleRows(rows, { ...opts, sort: { key: "serial_number", dir: -1 } }, lookups);
    expect(shown[0].key).toBe("m10");
  });
  it("search and filter read the saved value, so a row stays while it is edited", () => {
    const edited = viewRow(rows[0], { equipment_name: "Something else" }, false);
    expect(visibleRows([edited], { ...opts, search: "drill" }, lookups)).toHaveLength(1);
    expect(visibleRows(rows, { ...opts, search: "power" }, lookups)).toHaveLength(2);
    expect(visibleRows(rows, { ...opts, categoryId: "2" }, lookups).map((r) => r.key)).toEqual(["m3"]);
  });
  it("views", () => {
    expect(visibleRows(rows, { ...opts, view: "noPhoto" }, lookups)).toHaveLength(2);
    expect(visibleRows(rows, { ...opts, view: "noSinhala" }, lookups)).toHaveLength(2);
    const del = viewRow(rows[0], undefined, true);
    expect(visibleRows([del, rows[1]], { ...opts, view: "changed" }, lookups).map((r) => r.key)).toEqual(["m10"]);
  });
});

describe("helpers", () => {
  it("next name number", () => {
    expect(nextNameNumberIn("Drill - 2", ["Drill - 2", "drill-9", "Pump - 40"])).toBe(10);
  });
  it("selection sum ignores text", () => {
    expect(selectionStats(["500", "", "abc", "250.5"])).toEqual({ count: 4, numeric: 2, sum: 750.5 });
  });
});
