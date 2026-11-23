import { tk } from "@/i18n/marker";
import type { CatalogProduct, ProductInput } from "../api/catalog.types";

// Edits to existing products (the item card and "Edit as sheet") are sent as a diff: only the fields
// whose value really changed go to PUT /retail/products/:id.

export type EditableField = "name" | "sell_price" | "contractor_price" | "reorder_level" | "warranty_months" | "category_id" | "brand_id";

export const EDITABLE_FIELDS: EditableField[] = ["name", "sell_price", "contractor_price", "reorder_level", "warranty_months", "category_id", "brand_id"];
const NUMERIC: EditableField[] = ["sell_price", "contractor_price", "reorder_level", "warranty_months"];
const NULLABLE: EditableField[] = ["contractor_price", "reorder_level", "warranty_months", "category_id", "brand_id"];

export type FieldEdits = Partial<Record<EditableField, string>>;
export type FieldErrors = Partial<Record<EditableField, string>>;

/** A product's value for a field as the text a cell or box shows. */
export const fieldValue = (p: CatalogProduct, f: EditableField): string => {
  const v = p[f];
  return v === null || v === undefined ? "" : String(v);
};

const sameNumber = (a: string, b: string) => (a.trim() === "" && b.trim() === "") || (a.trim() !== "" && b.trim() !== "" && Number(a) === Number(b));

/** Which of the edited fields differ from the saved product (an edit put back to the old value is not a change). */
export const changedFields = (base: CatalogProduct, edits: FieldEdits): EditableField[] =>
  (Object.keys(edits) as EditableField[]).filter((f) => {
    const next = edits[f] ?? "";
    const old = fieldValue(base, f);
    return NUMERIC.includes(f) || f === "category_id" || f === "brand_id" ? !sameNumber(next, old) : next.trim() !== old.trim();
  });

/** Turns edits into a PUT body (changed fields only) plus the problems found. */
export function diffProduct(base: CatalogProduct, edits: FieldEdits): { input: ProductInput; errors: FieldErrors; changed: EditableField[] } {
  const changed = changedFields(base, edits);
  const input: Record<string, unknown> = {};
  const errors: FieldErrors = {};
  for (const f of changed) {
    const raw = (edits[f] ?? "").trim();
    if (f === "name") {
      if (!raw) errors.name = tk("retail.sheet.required");
      else input.name = raw;
    } else if (raw === "") {
      if (NULLABLE.includes(f)) input[f] = null;
      else errors[f] = tk("retail.sheet.required");
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) errors[f] = tk("retail.sheet.badNumber");
      else input[f] = n;
    }
  }
  return { input: input as ProductInput, errors, changed };
}
