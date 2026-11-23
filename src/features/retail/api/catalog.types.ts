// Shapes assumed from the R1-backend prompt (docs/RETAIL_POS_BUILD_PROMPTS.md). The backend is built
// in parallel; if it differs, adjust the normalisers in catalog.api.ts and nothing else.

export type Tracking = "counted" | "serial" | "untracked" | "service";
export type SerialCapture = "receive" | "sale";

/** Units a base or pack unit may use (plan §4.1). */
export const BASE_UNITS = ["pcs", "kg", "g", "m", "ft", "L", "bag", "box", "roll", "set", "sheet", "pair"] as const;
/** Only these may be sold in fractions (the server enforces the same rule). */
export const DECIMAL_UNITS: readonly string[] = ["kg", "g", "m", "ft", "L"];

export interface CatalogUnit {
  unit_id?: number;
  unit_name: string;
  factor: number;
  sell_price?: number | null;
  is_default_sale?: boolean;
}

export interface CatalogBarcode {
  barcode: string;
  unit_id?: number | null;
}

export interface CatalogProduct {
  product_id: number;
  code: string;
  name: string;
  name_si?: string | null;
  family_id?: number | null;
  variant_label?: string | null;
  category_id?: number | null;
  brand_id?: number | null;
  tracking?: Tracking;
  serial_capture?: SerialCapture | null;
  base_unit?: string;
  allow_decimal?: boolean;
  sell_price: number;
  contractor_price?: number | null;
  trade_price?: number | null;
  /** Only present with retail:cost_view (the server strips them otherwise). */
  avg_cost?: number | null;
  last_cost?: number | null;
  reorder_level?: number | null;
  warranty_months?: number | null;
  image_url?: string | null;
  description?: string | null;
  is_active?: boolean;
  search_text?: string;
  units?: CatalogUnit[];
  barcodes?: CatalogBarcode[];
  last_received_at?: string | null;
  last_sold_at?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CategoryAttribute {
  name: string;
  unit?: string | null;
  values?: Array<string | number>;
  /** A variant attribute makes one product per value (size, colour). */
  variant?: boolean;
}

export interface RetailCategory {
  category_id: number;
  parent_id: number | null;
  name: string;
  name_si?: string | null;
  /** Singular noun phrase used in product names ("Steel Drill Bit"); the name itself when missing. */
  item_name?: string | null;
  item_name_si?: string | null;
  image_url?: string | null;
  icon?: string | null;
  attributes?: CategoryAttribute[] | null;
  default_unit?: string | null;
  sort_order?: number;
  is_active?: boolean;
  /** Items in this node (tree endpoint). */
  item_count?: number;
  children?: RetailCategory[];
}

export interface RetailBrand {
  brand_id: number;
  name: string;
  logo_url?: string | null;
  is_active?: boolean;
}

export interface RetailFamily {
  family_id: number;
  name: string;
  category_id?: number | null;
  brand_id?: number | null;
  option_label?: string | null;
  option_unit?: string | null;
}

export interface RetailAlias {
  alias_id: number;
  term: string;
  means: string;
}

/** What GET /retail/pos/catalog gives back (the local index source). */
export interface CatalogPayload {
  server_time: string | null;
  products: CatalogProduct[];
  archived_ids: number[];
  categories?: RetailCategory[];
  brands?: RetailBrand[];
  families?: RetailFamily[];
  aliases?: RetailAlias[];
}

/** The catalogue kept on this device. */
export interface LocalCatalog {
  serverTime: string | null;
  products: CatalogProduct[];
  categories: RetailCategory[];
  brands: RetailBrand[];
  families: RetailFamily[];
  aliases: RetailAlias[];
}

export interface ProductListParams {
  q?: string;
  category_id?: number;
  brand_id?: number;
  family_id?: number;
  tracking?: Tracking;
  active?: boolean;
  page?: number;
  limit?: number;
  skip_count?: boolean;
}

export interface ProductList {
  rows: CatalogProduct[];
  total: number;
}

export interface ProductDetail extends CatalogProduct {
  family?: RetailFamily | null;
  category_path?: Array<{ category_id: number; name: string }>;
  brand?: RetailBrand | null;
  /** null until the stock step (R2). */
  stock?: unknown;
}

export interface ProductInput {
  name?: string;
  name_si?: string;
  code?: string;
  category_id?: number | null;
  brand_id?: number | null;
  family_id?: number | null;
  variant_label?: string | null;
  tracking?: Tracking;
  serial_capture?: SerialCapture | null;
  base_unit?: string;
  allow_decimal?: boolean;
  sell_price?: number;
  contractor_price?: number | null;
  trade_price?: number | null;
  cost?: number | null;
  reorder_level?: number | null;
  warranty_months?: number | null;
  is_active?: boolean;
  units?: Array<{ unit_name: string; factor: number; sell_price?: number | null }>;
  barcode?: string;
  description?: string | null;
}

export interface FamilyVariantInput {
  variant_label: string;
  sell_price: number;
  contractor_price?: number | null;
  cost?: number | null;
  barcode?: string;
}

export interface FamilyInput {
  name?: string;
  category_id: number;
  brand_id?: number | null;
  option_label: string;
  option_unit?: string | null;
  variants: FamilyVariantInput[];
  shared: {
    tracking: Tracking;
    serial_capture?: SerialCapture | null;
    base_unit: string;
    allow_decimal?: boolean;
    units?: Array<{ unit_name: string; factor: number }>;
    reorder_level?: number | null;
    warranty_months?: number | null;
  };
}

export interface BrowseNode {
  id: number;
  name: string;
  icon?: string | null;
  image_url?: string | null;
  count?: number;
}

/** GET /retail/finder/browse: the next level that has items. */
export interface BrowseResult {
  level: "categories" | "subcategories" | "brands" | "items";
  nodes: BrowseNode[];
  groups: FinderGroup[];
}

export interface FinderVariant {
  product_id: number;
  variant_label: string | null;
  code?: string;
  sell_price: number;
}

export interface FinderGroup {
  family: { id: number | null; name: string; brand?: string | null; category_path?: string | null };
  variants: FinderVariant[];
}

export interface LookupResult {
  product: CatalogProduct;
  unit: CatalogUnit | null;
}
