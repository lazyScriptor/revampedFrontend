import { describe, expect, it, vi } from "vitest";

// Replies shaped exactly like the merged R1 backend (Sequelize include names, product_count, brand objects).
const get = vi.fn();
vi.mock("@/lib/api", () => ({ api: { get: (...a: unknown[]) => get(...a), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

import { fetchCatalogPayload, fetchProduct, fetchCategories, finderSearch } from "../api/catalog.api";

describe("catalogue API against the real backend shapes", () => {
  it("reads Units / Barcodes from the counter catalogue", async () => {
    get.mockResolvedValueOnce({
      status: "success",
      data: {
        server_time: "2026-11-23T10:00:00.000Z",
        products: [{ product_id: 7, code: "HW-00007", name: "SALI Steel Drill Bit 6mm", sell_price: "310.00", Units: [{ unit_id: 3, unit_name: "box", factor: "25.000" }], Barcodes: [{ barcode: "4790000000017", unit_id: null }] }],
        archived_ids: [],
        categories: [{ category_id: 2, parent_id: 1, name: "Steel", attributes: '[{"name":"Diameter","unit":"mm","values":[3,6],"variant":true}]' }],
        brands: [], families: [],
      },
    });
    const payload = await fetchCatalogPayload();
    expect(payload.products[0]?.units).toEqual([expect.objectContaining({ unit_name: "box", factor: 25 })]);
    expect(payload.products[0]?.barcodes?.[0]?.barcode).toBe("4790000000017");
    expect(payload.categories?.[0].attributes?.[0]).toMatchObject({ name: "Diameter", variant: true });
  });

  it("reads RetailFamily / RetailBrand on the item detail", async () => {
    get.mockResolvedValueOnce({ data: { product: { product_id: 7, name: "x", sell_price: "1", RetailFamily: { family_id: 4, name: "SALI Steel Drill Bit" }, RetailBrand: { brand_id: 1, name: "SALI" }, Units: [], Barcodes: [] } } });
    const p = await fetchProduct(7);
    expect(p.family).toMatchObject({ family_id: 4 });
    expect(p.brand).toMatchObject({ name: "SALI" });
  });

  it("uses product_count as the category item count", async () => {
    get.mockResolvedValueOnce({ data: { categories: [{ category_id: 1, name: "Drill bits", product_count: 42, children: [{ category_id: 2, parent_id: 1, name: "Steel", product_count: 8 }] }] } });
    const cats = await fetchCategories();
    expect(cats[0].item_count).toBe(42);
    expect(cats[0].children?.[0].item_count).toBe(8);
  });

  it("shows the finder brand name when the backend sends a brand object", async () => {
    get.mockResolvedValueOnce({ data: { groups: [{ family: { family_id: 4, id: 4, name: "SALI Steel Drill Bit", brand: { brand_id: 1, name: "SALI" } }, variants: [{ product_id: 7, variant_label: "6mm", code: "HW-00007", sell_price: "310.00" }] }] } });
    const groups = await finderSearch("sali");
    expect(groups[0].family.brand).toBe("SALI");
  });
});
