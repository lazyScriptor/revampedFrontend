import { describe, expect, it } from "vitest";
import {
  autoMatchColumns,
  headerSignature,
  loadSavedColumnMapping,
  reassignColumnMapping,
  saveColumnMapping,
} from "../columnMatching";

describe("columnMatching", () => {
  it("matches English and Sinhala GearGrid Sheet headers 1-to-1", () => {
    const enMap = autoMatchColumns(["Name", "Category", "Location", "Base price", "Extra/day", "EQ No.", "Warranty end"]);
    expect(enMap).toEqual([
      "equipment_name",
      "category_id",
      "warehouse_id",
      "base_rental_price",
      "extra_daily_rate",
      "serial_number",
      "end_of_warranty_date",
    ]);

    const siMap = autoMatchColumns(["නම", "කාණ්ඩය", "ස්ථානය", "මූලික ගාස්තුව", "අමතර/දින", "EQ අංකය"]);
    expect(siMap).toEqual([
      "equipment_name",
      "category_id",
      "warehouse_id",
      "base_rental_price",
      "extra_daily_rate",
      "serial_number",
    ]);
  });

  it("matches legacy importEquipment aliases and avoids duplicate claims", () => {
    const map = autoMatchColumns(["item_name", "group", "depot", "rate_per_day", "Rate (extra)", "serial_#", "Notes"]);
    expect(map).toEqual([
      "equipment_name",
      "category_id",
      "warehouse_id",
      "base_rental_price",
      "extra_daily_rate",
      "serial_number",
      null,
    ]);
  });

  it("enforces strict 1-to-1 reassignment", () => {
    const initial = autoMatchColumns(["Name", "Alias", "Base price"]);
    expect(initial).toEqual(["equipment_name", null, "base_rental_price"]);

    const reassigned = reassignColumnMapping(initial, 1, "equipment_name");
    expect(reassigned).toEqual([null, "equipment_name", "base_rental_price"]);
  });

  it("remembers custom column mappings per header set hash in localStorage", () => {
    const headers = ["Custom A", "Custom B", "Custom C"];
    const sig = headerSignature(headers);
    expect(sig).toMatch(/^[0-9a-f]{8}$/);

    const custom = ["equipment_name", "category_id", "base_rental_price"] as const;
    saveColumnMapping(headers, [...custom]);

    const loaded = loadSavedColumnMapping(headers);
    expect(loaded).toEqual([...custom]);

    expect(loadSavedColumnMapping(["Different", "Headers"])).toBeNull();
  });
});

describe("quantity columns", () => {
  it("maps a Qty column to Total, never to the Bulk flag", () => {
    const labels = { is_bulk_item: "Qty", total_owned_qty: "Total" } as any;
    expect(autoMatchColumns(["Name", "Qty", "Rate"], labels)).toEqual(["equipment_name", "total_owned_qty", "base_rental_price"]);
    expect(autoMatchColumns(["Name", "Bulk", "Quantity"], labels)).toEqual(["equipment_name", "is_bulk_item", "total_owned_qty"]);
  });
});
