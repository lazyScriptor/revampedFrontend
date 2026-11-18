import { describe, expect, it } from "vitest";
import type { Lookups } from "@/features/equipment/sheet/sheetModel";
import { autoMatchColumns } from "../columnMatching";
import {
  applyCategoryResolution,
  buildExtendedLookups,
  buildImportPayload,
  buildInitialImportState,
  clearNumbersInSelection,
  copyRateToBlankExtraRate,
  deleteRowsByKeys,
  fillDownSelection,
  findAndReplaceInColumn,
  findDuplicateRows,
  getUnknownCategories,
  getUnknownWarehouses,
  removeDuplicateRows,
  removeEmptyRows,
  revertAutoCleanFixes,
  setAllExistingAction,
  setRowExistingAction,
  suggestClosestMatch,
  updateImportCells,
  validateImportState,
} from "../importModel";

const LOOKUPS: Lookups = {
  categories: [
    { category_id: 1, category_name: "Generator" },
    { category_id: 2, category_name: "Power Tools" },
  ],
  warehouses: [
    { warehouse_id: 10, location_name: "Colombo" },
    { warehouse_id: 11, location_name: "Kandy" },
  ],
};

const EXISTING = [
  { equipment_id: 101, serial_number: "EQ-001", equipment_name: "Old Drill 1" },
];

describe("importModel", () => {
  it("tidies Rs. prices, dd/mm/yyyy dates, Yes/No, Total > 1 bulk tick, strips blank rows, and preserves unreadable values as errors", () => {
    const headers = ["Name", "EQ No.", "Category", "Location", "Base price", "Total", "Qty", "Warranty end"];
    const mapping = autoMatchColumns(headers);
    const dataRows = [
      ["  Hammer   Drill ", "EQ-001", "power tools", "Colombo", "Rs. 1,500", "5", "", "14/03/2025"],
      ["", "", "", "", "", "", "", ""], // empty row should be stripped
      ["Breaker Free Rate", "", "Generators", "Colombo", "free", "1", "No", "2026-06-01"],
      ["Breaker Free Rate", "", "Generators", "Colombo", "free", "1", "No", "2026-06-01"], // duplicate
    ];

    let state = buildInitialImportState({
      dataRows,
      sourceRowNumbers: [2, 3, 4, 5],
      mapping,
      sameForAll: {},
      lookups: LOOKUPS,
      existingEquipment: EXISTING,
    });

    expect(state.strippedEmptyCount).toBe(1);
    expect(state.rows).toHaveLength(3);
    expect(state.autoFixCount).toBeGreaterThanOrEqual(4);

    // Row 0: auto-tidied values + notes + existing match defaulting safely to "new_number"
    expect(state.rows[0].values.equipment_name).toBe("Hammer Drill");
    expect(state.rows[0].values.base_rental_price).toBe("1500");
    expect(state.rows[0].values.category_id).toBe("2");
    expect(state.rows[0].values.is_bulk_item).toBe("true");
    expect(state.rows[0].values.end_of_warranty_date).toBe("2025-03-14");
    expect(state.rows[0].existingMatch?.equipment_id).toBe(101);
    expect(state.rows[0].existingAction).toBe("new_number");
    expect(state.rows[0].autoNotes.base_rental_price?.rawValue).toBe("Rs. 1,500");

    // Row 1: "free" stays "free" instead of turning into "0"
    expect(state.rows[1].values.base_rental_price).toBe("free");
    expect(state.rows[1].rawCategory).toBe("Generators");

    // Validation catches "free" price and unresolved "Generators"
    const v1 = validateImportState(state, LOOKUPS);
    expect(v1.errors[state.rows[1].key]?.base_rental_price).toBe("price_required");
    expect(v1.errors[state.rows[1].key]?.category_id).toBe("category_required");

    // Duplicate detection flags Row 2 -> "Same as row 4"
    const dups = findDuplicateRows(state.rows);
    expect(dups.get(state.rows[2].key)).toBe(4);

    // Fuzzy match suggests "Generator" for "Generators"
    const unknownCats = getUnknownCategories(state);
    expect(unknownCats).toHaveLength(1);
    expect(unknownCats[0].rawName).toBe("Generators");
    const suggested = suggestClosestMatch(
      unknownCats[0].rawName,
      LOOKUPS.categories.map((c) => ({ id: c.category_id, name: c.category_name })),
    );
    expect(suggested?.name).toBe("Generator");

    // Undo auto-fixes restores raw uncleaned price
    const reverted = revertAutoCleanFixes(state);
    expect(reverted.rows[0].values.base_rental_price).toBe("Rs. 1,500");
    expect(reverted.rows[0].values.end_of_warranty_date).toBe("14/03/2025");

    // Remove duplicate row clean-up
    state = removeDuplicateRows(state);
    expect(state.rows).toHaveLength(2);
  });

  it("handles unknown category create_new refs, existing number actions, clean-ups, and atomic payload building", () => {
    const mapping = autoMatchColumns(["Name", "EQ No.", "Category", "Location", "Base price"]);
    let state = buildInitialImportState({
      dataRows: [
        ["Scaffold Frame", "EQ-001", "Scaffolding", "Colombo", "800"],
        ["Unknown Site Saw", "", "Power Tools", "Galle Depot", "1200"],
      ],
      sourceRowNumbers: [2, 3],
      mapping,
      sameForAll: {},
      lookups: LOOKUPS,
      existingEquipment: EXISTING,
    });

    expect(getUnknownCategories(state).map((c) => c.rawName)).toEqual(["Scaffolding"]);
    expect(getUnknownWarehouses(state).map((w) => w.rawName)).toEqual(["Galle Depot"]);

    // Resolve Scaffolding as new category newcat:1 -> reflected in extended lookups
    state = applyCategoryResolution(state, "scaffolding", {
      action: "create_new",
      ref: "newcat:1",
      name: "Scaffolding",
    });
    const ext = buildExtendedLookups(LOOKUPS, state.categoryResolutions);
    expect(ext.categories.some((c) => String(c.category_id) === "newcat:1" && c.category_name === "Scaffolding")).toBe(true);

    // Manual cell edit resolves row 1 warehouse directly and drops unknown warehouse entry
    state = updateImportCells(state, [{ key: state.rows[1].key, field: "warehouse_id", value: "11" }], EXISTING);
    expect(getUnknownWarehouses(state)).toHaveLength(0);

    // Default existing match omits duplicate serial in creates payload so server assigns new EQ-###
    let payload = buildImportPayload(state);
    expect(payload.newCategories).toEqual([{ ref: "newcat:1", name: "Scaffolding" }]);
    expect(payload.creates).toHaveLength(2);
    expect(payload.creates[0].values.serial_number).toBeUndefined();
    expect(payload.creates[0].values.category_id).toBe("newcat:1");
    expect(payload.updates).toHaveLength(0);

    // Switch matched row to "update" -> only mapped/touched fields are sent cleanly in updates!
    state = setRowExistingAction(state, [state.rows[0].key], "update");
    payload = buildImportPayload(state);
    expect(payload.creates).toHaveLength(1);
    expect(payload.updates).toHaveLength(1);
    expect(payload.updates[0].equipment_id).toBe(101);
    expect(payload.updates[0].changes).toEqual({
      equipment_name: "Scaffold Frame",
      category_id: "newcat:1",
      warehouse_id: 10,
      base_rental_price: 800,
    });

    // Skip matched row -> excluded from both creates/updates and omits unused newcat:1!
    state = setAllExistingAction(state, "skip");
    payload = buildImportPayload(state);
    expect(payload.creates).toHaveLength(1);
    expect(payload.updates).toHaveLength(0);
    expect(payload.newCategories).toEqual([]);
  });

  it("never clears an existing machine's value from a blank cell when updating", () => {
    const mapping = autoMatchColumns(["Name", "EQ No.", "Category", "Location", "Base price", "Cost"]);
    let state = buildInitialImportState({
      dataRows: [["Scaffold Frame", "EQ-001", "Power Tools", "Colombo", "800", ""]],
      sourceRowNumbers: [2],
      mapping,
      sameForAll: {},
      lookups: LOOKUPS,
      existingEquipment: EXISTING,
    });
    state = setRowExistingAction(state, [state.rows[0].key], "update");
    const changes = buildImportPayload(state).updates[0].changes;
    expect(changes.base_rental_price).toBe(800);
    expect("purchase_cost" in changes).toBe(false);
  });

  it("supports clean-up menu transforms: fill down, find & replace, clear numbers, copy rate to extra, remove empty/selected", () => {
    const mapping = autoMatchColumns(["Name", "EQ No.", "Category", "Location", "Base price", "Extra/day"]);
    let state = buildInitialImportState({
      dataRows: [
        ["Honda Gen", "EQ-001", "Generator", "Colombo", "2500", ""],
        ["Honda Pump", "EQ-050", "Power Tools", "Colombo", "1500", ""],
      ],
      sourceRowNumbers: [2, 3],
      mapping,
      sameForAll: {},
      lookups: LOOKUPS,
      existingEquipment: EXISTING,
    });

    // Copy base rate to blank extra/day
    state = copyRateToBlankExtraRate(state).state;
    expect(state.rows[0].values.extra_daily_rate).toBe("2500");
    expect(state.rows[1].values.extra_daily_rate).toBe("1500");

    // Find & replace in name column
    const rep = findAndReplaceInColumn(state, "equipment_name", "Honda", "Yamaha", {
      lookups: LOOKUPS,
      existingEquipment: EXISTING,
    });
    expect(rep.replacedCount).toBe(2);
    state = rep.state;
    expect(state.rows[0].values.equipment_name).toBe("Yamaha Gen");

    // Fill down location/category across selected rows
    state = fillDownSelection(state, [state.rows[0].key, state.rows[1].key], "category_id");
    expect(state.rows[1].values.category_id).toBe("1");

    // Clear EQ numbers in selection
    state = clearNumbersInSelection(state, [state.rows[0].key]);
    expect(state.rows[0].values.serial_number).toBe("");
    expect(state.rows[0].existingMatch).toBeNull();
    expect(state.rows[1].values.serial_number).toBe("EQ-050");

    // Clear user fields on row 1 to simulate becoming blank -> removeEmptyRows strips it
    state = updateImportCells(
      state,
      [
        { key: state.rows[1].key, field: "equipment_name", value: "" },
        { key: state.rows[1].key, field: "serial_number", value: "" },
        { key: state.rows[1].key, field: "category_id", value: "" },
        { key: state.rows[1].key, field: "warehouse_id", value: "" },
        { key: state.rows[1].key, field: "base_rental_price", value: "" },
        { key: state.rows[1].key, field: "extra_daily_rate", value: "" },
      ],
      EXISTING,
    );
    state = removeEmptyRows(state);
    expect(state.rows).toHaveLength(1);

    // Delete selected row
    state = deleteRowsByKeys(state, [state.rows[0].key]);
    expect(state.rows).toHaveLength(0);
  });
});
