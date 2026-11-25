import { api } from "@/lib/api";
import { unwrapData } from "./http";
import { normalizeProductLocationStock, normalizeStockMovement } from "./stock.api";
import type {
  BrowseResult,
  CatalogBarcode,
  CatalogPayload,
  CatalogProduct,
  CatalogUnit,
  FamilyInput,
  FamilyVariantInput,
  FinderGroup,
  LookupResult,
  ProductDetail,
  ProductInput,
  ProductList,
  ProductListParams,
  RetailAlias,
  RetailBrand,
  RetailCategory,
  RetailFamily,
} from "./catalog.types";

// Every catalogue call lives in this file (retail plan §6; R1-backend prompt). The server may send
// MySQL decimals as strings and may or may not wrap the body in {data}; the normalisers below accept both.

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : num(v));
const asArray = <T = any>(v: unknown, ...keys: string[]): T[] => {
  if (Array.isArray(v)) return v as T[];
  for (const k of keys) if (v && Array.isArray((v as any)[k])) return (v as any)[k] as T[];
  return [];
};
const parseJson = (v: unknown) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

export const normalizeUnit = (u: any): CatalogUnit => ({
  unit_id: u.unit_id,
  unit_name: String(u.unit_name ?? u.name ?? ""),
  factor: num(u.factor) || 1,
  sell_price: numOrNull(u.sell_price),
  is_default_sale: !!u.is_default_sale,
});

export const normalizeBarcode = (b: any): CatalogBarcode =>
  typeof b === "string" ? { barcode: b, unit_id: null } : { barcode: String(b.barcode), unit_id: b.unit_id ?? null };

export const normalizeProduct = (p: any): CatalogProduct => ({
  ...p,
  product_id: Number(p.product_id ?? p.id),
  code: p.code ?? "",
  name: p.name ?? "",
  sell_price: num(p.sell_price),
  contractor_price: numOrNull(p.contractor_price),
  trade_price: numOrNull(p.trade_price),
  avg_cost: p.avg_cost === undefined ? undefined : numOrNull(p.avg_cost),
  last_cost: p.last_cost === undefined ? undefined : numOrNull(p.last_cost),
  reorder_level: numOrNull(p.reorder_level),
  warranty_months: numOrNull(p.warranty_months),
  is_active: p.is_active === undefined ? true : !!p.is_active,
  // The backend's Sequelize includes are named Units / Barcodes.
  units: asArray(p.units ?? p.Units).map(normalizeUnit),
  barcodes: asArray(p.barcodes ?? p.Barcodes).map(normalizeBarcode),
});

export const normalizeCategory = (c: any): RetailCategory => ({
  ...c,
  category_id: Number(c.category_id ?? c.id),
  parent_id: c.parent_id ?? null,
  attributes: (parseJson(c.attributes) as RetailCategory["attributes"]) ?? null,
  item_count: c.item_count ?? c.product_count ?? c.count ?? c.items_count,
  children: c.children ? asArray(c.children).map(normalizeCategory) : undefined,
});

const normalizeBrand = (b: any): RetailBrand => ({ ...b, brand_id: Number(b.brand_id ?? b.id) });
const normalizeFamily = (f: any): RetailFamily => ({ ...f, family_id: Number(f.family_id ?? f.id) });

/** Flattens a tree (children nested) into one list. */
export const flattenCategories = (list: RetailCategory[]): RetailCategory[] =>
  list.flatMap((c) => [c, ...flattenCategories(c.children ?? [])]);

// ── Catalogue (local index source) ────────────────────────────────────────────
// GET /api/retail/pos/catalog?since=<server_time>
//  -> { server_time, products:[...], archived_ids:[...], categories?, brands?, families?, aliases? }
// Without `since` it is the whole catalogue; with it, only products changed after it (plus ids archived).
export const fetchCatalogPayload = async (since?: string | null): Promise<CatalogPayload> => {
  const d = unwrapData<any>(await api.get("/retail/pos/catalog", { params: since ? { since } : undefined })) ?? {};
  return {
    server_time: d.server_time ?? d.serverTime ?? null,
    products: asArray(d, "products", "items", "rows").map(normalizeProduct),
    archived_ids: asArray<number>(d, "archived_ids", "archivedIds").map(Number),
    categories: d.categories ? flattenCategories(asArray(d.categories).map(normalizeCategory)) : undefined,
    brands: d.brands ? asArray(d.brands).map(normalizeBrand) : undefined,
    families: d.families ? asArray(d.families).map(normalizeFamily) : undefined,
    aliases: d.aliases ? asArray<RetailAlias>(d.aliases) : undefined,
  };
};

// ── Products ──────────────────────────────────────────────────────────────────
// GET /api/retail/products?q&category_id&brand_id&family_id&tracking&active&page&limit&skip_count
export const fetchProducts = async (params: ProductListParams = {}): Promise<ProductList> => {
  const d = unwrapData<any>(await api.get("/retail/products", { params })) ?? {};
  const rows = asArray(d, "rows", "products", "items").map(normalizeProduct);
  const total = d.count ?? d.total ?? d.pagination?.total ?? rows.length;
  return { rows, total: Number(total) };
};

// GET /api/retail/products/:id -> product + units + barcodes + family + category path + brand + stock + recent_movements
export const fetchProduct = async (id: number): Promise<ProductDetail> => {
  const d = unwrapData<any>(await api.get(`/retail/products/${id}`)) ?? {};
  const p = d.product ?? d;
  const rawStock = p.stock ?? d.stock;
  const rawMovements = p.recent_movements ?? d.recent_movements;
  return {
    ...normalizeProduct(p),
    family: p.family ?? p.RetailFamily ?? d.family ?? null,
    category_path: p.category_path ?? d.category_path ?? [],
    brand: p.brand ?? p.RetailBrand ?? d.brand ?? null,
    stock: Array.isArray(rawStock) ? rawStock.map(normalizeProductLocationStock) : null,
    recent_movements: Array.isArray(rawMovements) ? rawMovements.map(normalizeStockMovement) : [],
  };
};

// GET /api/retail/products/lookup?code= -> one product; `unit` set when the barcode belongs to a pack. 404 = unknown.
export const lookupProduct = async (code: string): Promise<LookupResult | null> => {
  try {
    const d = unwrapData<any>(await api.get("/retail/products/lookup", { params: { code } }));
    if (!d) return null;
    const p = d.product ?? d;
    if (!p || (p.product_id === undefined && p.id === undefined)) return null;
    const unit = d.unit ?? d.matched_unit ?? d.pack_unit ?? p.unit ?? null;
    return { product: normalizeProduct(p), unit: unit ? normalizeUnit(unit) : null };
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

// POST /api/retail/products (retail:product_manage). The name is generated by the server when omitted.
export const createProduct = async (input: ProductInput): Promise<CatalogProduct> => {
  const d = unwrapData<any>(await api.post("/retail/products", input)) ?? {};
  return normalizeProduct(d.product ?? d);
};

// PUT /api/retail/products/:id
export const updateProduct = async (id: number, input: ProductInput): Promise<CatalogProduct> => {
  const d = unwrapData<any>(await api.put(`/retail/products/${id}`, input)) ?? {};
  return normalizeProduct(d.product ?? d);
};

// POST /api/retail/products/:id/archive
export const archiveProduct = async (id: number) => unwrapData<any>(await api.post(`/retail/products/${id}/archive`));

// POST /api/retail/families -> the family and its N products, created in one transaction
export const createFamily = async (input: FamilyInput): Promise<{ family: RetailFamily | null; products: CatalogProduct[] }> => {
  const d = unwrapData<any>(await api.post("/retail/families", input)) ?? {};
  const products = asArray(d, "products", "variants", "items").map(normalizeProduct);
  const family = d.family ? normalizeFamily(d.family) : null;
  return { family, products };
};

// POST /api/retail/families/:id/variants -> adds new variant sizes to an existing family
export const addFamilyVariants = async (
  familyId: number,
  variants: FamilyVariantInput[],
): Promise<{ family: RetailFamily | null; products: CatalogProduct[] }> => {
  const d = unwrapData<any>(await api.post(`/retail/families/${familyId}/variants`, { variants })) ?? {};
  const products = asArray(d, "products", "variants", "items").map(normalizeProduct);
  const family = d.family ? normalizeFamily(d.family) : null;
  return { family, products };
};

// ── Barcodes ──────────────────────────────────────────────────────────────────
// POST /api/retail/barcodes {barcode, product_id, unit_id?}: 409 when another product already has it
export const learnBarcode = async (input: { barcode: string; product_id: number; unit_id?: number | null }) =>
  unwrapData<any>(await api.post("/retail/barcodes", input));

// ── Categories, brands, shop words ────────────────────────────────────────────
// GET /api/retail/categories -> tree with item_count per node (seeds the starter set on first use)
export const fetchCategories = async (): Promise<RetailCategory[]> => {
  const d = unwrapData<any>(await api.get("/retail/categories"));
  return asArray(d, "categories", "tree", "rows").map(normalizeCategory);
};
export const createCategory = async (input: Partial<RetailCategory>): Promise<RetailCategory> => {
  const d = unwrapData<any>(await api.post("/retail/categories", input)) ?? {};
  return normalizeCategory(d.category ?? d);
};
export const updateCategory = async (id: number, input: Partial<RetailCategory>) =>
  unwrapData<any>(await api.put(`/retail/categories/${id}`, input));
/** 409 when the category still has items. */
export const deleteCategory = async (id: number) => unwrapData<any>(await api.delete(`/retail/categories/${id}`));
export const mergeCategory = async (id: number, targetId: number) =>
  unwrapData<any>(await api.post(`/retail/categories/${id}/merge-into/${targetId}`));

export const fetchBrands = async (): Promise<RetailBrand[]> => {
  const d = unwrapData<any>(await api.get("/retail/brands"));
  return asArray(d, "brands", "rows").map(normalizeBrand);
};
export const createBrand = async (input: Partial<RetailBrand>): Promise<RetailBrand> => {
  const d = unwrapData<any>(await api.post("/retail/brands", input)) ?? {};
  return normalizeBrand(d.brand ?? d);
};
export const updateBrand = async (id: number, input: Partial<RetailBrand>) =>
  unwrapData<any>(await api.put(`/retail/brands/${id}`, input));

export const fetchAliases = async (): Promise<RetailAlias[]> => {
  const d = unwrapData<any>(await api.get("/retail/aliases"));
  return asArray<RetailAlias>(d, "aliases", "rows");
};
export const createAlias = async (input: { term: string; means: string }) => unwrapData<any>(await api.post("/retail/aliases", input));
export const updateAlias = async (id: number, input: { term: string; means: string }) =>
  unwrapData<any>(await api.put(`/retail/aliases/${id}`, input));
export const deleteAlias = async (id: number) => unwrapData<any>(await api.delete(`/retail/aliases/${id}`));

// ── Finder (server fallback) ──────────────────────────────────────────────────
const normalizeGroups = (list: any[]): FinderGroup[] =>
  list.map((g) => ({
    family: {
      id: g.family?.id ?? g.family?.family_id ?? null,
      name: g.family?.name ?? "",
      // The backend sends the brand as an object ({brand_id, name}); the finder shows its name.
      brand: (typeof g.family?.brand === "object" ? g.family?.brand?.name : g.family?.brand) ?? g.family?.brand_name ?? null,
      category_path: g.family?.category_path ?? null,
    },
    variants: asArray(g.variants).map((v: any) => ({
      product_id: Number(v.product_id),
      variant_label: v.variant_label ?? null,
      code: v.code,
      sell_price: num(v.sell_price),
    })),
  }));

// GET /api/retail/finder/search?q=&limit= -> [{family:{id,name,brand,category_path}, variants:[{product_id,variant_label,code,sell_price}]}]
export const finderSearch = async (q: string, limit = 30): Promise<FinderGroup[]> => {
  const d = unwrapData<any>(await api.get("/retail/finder/search", { params: { q, limit } }));
  return normalizeGroups(asArray(d, "groups", "results", "rows"));
};

// GET /api/retail/finder/browse?category_id&brand_id -> { level, nodes | groups }
export const finderBrowse = async (params: { category_id?: number; brand_id?: number } = {}): Promise<BrowseResult> => {
  const d = unwrapData<any>(await api.get("/retail/finder/browse", { params })) ?? {};
  const nodes = asArray<any>(d, "nodes", "categories", "subcategories", "brands").map((n) => ({
    id: Number(n.id ?? n.category_id ?? n.brand_id),
    name: n.name,
    icon: n.icon ?? null,
    image_url: n.image_url ?? n.logo_url ?? null,
    count: n.count ?? n.item_count,
  }));
  return { level: d.level ?? (nodes.length ? "subcategories" : "items"), nodes, groups: normalizeGroups(asArray(d, "groups", "families")) };
};
