import type {
  CatalogPayload,
  CatalogProduct,
  LocalCatalog,
  RetailAlias,
  RetailBrand,
  RetailCategory,
  RetailFamily,
} from "../api/catalog.types";
import { compareVariantLabels, formatVariant, sizeVariants } from "./names";

// The catalogue kept on this device and the in-memory index over it (retail plan §5.8, §7.11).
// Everything here is pure so it can be tested without a server.

export const EMPTY_CATALOG: LocalCatalog = { serverTime: null, products: [], categories: [], brands: [], families: [], aliases: [] };

// ── Delta sync ────────────────────────────────────────────────────────────────
const byId = <T,>(list: T[], key: (x: T) => number) => new Map(list.map((x) => [key(x), x]));

/**
 * Applies one GET /retail/pos/catalog answer to what is already stored.
 * `wasDelta` is true when the request carried `since`: changed products replace their old rows,
 * archived (or deactivated) ones are dropped. Without `since` the answer is the whole catalogue.
 */
export function mergeCatalog(prev: LocalCatalog | undefined, payload: CatalogPayload, wasDelta: boolean): LocalCatalog {
  const base = wasDelta && prev ? prev : EMPTY_CATALOG;
  const products = byId(base.products, (p) => p.product_id);
  for (const p of payload.products) {
    if (p.is_active === false) products.delete(p.product_id);
    else products.set(p.product_id, p);
  }
  for (const id of payload.archived_ids) products.delete(id);

  let families = base.families;
  if (payload.families) {
    const merged = wasDelta ? byId(base.families, (f) => f.family_id) : new Map<number, RetailFamily>();
    payload.families.forEach((f) => merged.set(f.family_id, f));
    families = [...merged.values()];
  }
  return {
    serverTime: payload.server_time ?? base.serverTime,
    products: [...products.values()],
    // Categories, brands and aliases are small: when the answer carries them they are the whole list.
    categories: payload.categories ?? base.categories,
    brands: payload.brands ?? base.brands,
    families,
    aliases: payload.aliases ?? base.aliases,
  };
}

/** Puts products the server just returned (after a save) into the stored catalogue straight away. */
export function patchCatalogProducts(prev: LocalCatalog | undefined, products: CatalogProduct[]): LocalCatalog | undefined {
  if (!prev) return prev;
  const map = byId(prev.products, (p) => p.product_id);
  for (const p of products) {
    if (p.is_active === false) map.delete(p.product_id);
    else {
      const old = map.get(p.product_id);
      // A save answer may leave out the lists it did not touch: keep what we had.
      map.set(p.product_id, {
        ...(old ?? {}),
        ...p,
        units: p.units?.length ? p.units : old?.units,
        barcodes: p.barcodes?.length ? p.barcodes : old?.barcodes,
      });
    }
  }
  return { ...prev, products: [...map.values()] };
}

// ── Lookups for display ───────────────────────────────────────────────────────
export interface CatalogCtx {
  categories: Map<number, RetailCategory>;
  brands: Map<number, RetailBrand>;
  families: Map<number, RetailFamily>;
}

export const buildCtx = (c: Pick<LocalCatalog, "categories" | "brands" | "families">): CatalogCtx => ({
  categories: byId(c.categories, (x) => x.category_id),
  brands: byId(c.brands, (x) => x.brand_id),
  families: byId(c.families, (x) => x.family_id),
});

/** "Drill bits › Steel" */
export function categoryPath(ctx: CatalogCtx, categoryId: number | null | undefined, sep = " › "): string {
  const names: string[] = [];
  let id = categoryId ?? null;
  for (let guard = 0; id != null && guard < 4; guard += 1) {
    const c = ctx.categories.get(id);
    if (!c) break;
    names.unshift(c.name);
    id = c.parent_id;
  }
  return names.join(sep);
}

/** The category and its children's ids: a category tile filters on the whole subtree. */
export function subtreeIds(ctx: CatalogCtx, categoryId: number): Set<number> {
  const out = new Set<number>([categoryId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of ctx.categories.values()) {
      if (c.parent_id != null && out.has(c.parent_id) && !out.has(c.category_id)) {
        out.add(c.category_id);
        grew = true;
      }
    }
  }
  return out;
}

/** "SALI Steel Drill Bit 6mm" with the size taken off, for catalogues that send no family list. */
export const deriveFamilyName = (name: string, variantLabel?: string | null, unit?: string | null) => {
  let out = name;
  for (const v of [formatVariant(variantLabel, unit), (variantLabel ?? "").trim()]) {
    if (v && out.toLowerCase().endsWith(v.toLowerCase())) {
      out = out.slice(0, out.length - v.length);
      break;
    }
  }
  return out.trim() || name;
};

// ── Groups (one row per family) ───────────────────────────────────────────────
export interface ProductGroup {
  key: string;
  familyId: number | null;
  name: string;
  brandName: string | null;
  categoryId: number | null;
  categoryPath: string;
  optionUnit: string | null;
  products: CatalogProduct[];
  /** Variants that matched the search words (all variants are listed, these are highlighted). */
  matchedIds: Set<number>;
  score: number;
}

const brandNameOf = (ctx: CatalogCtx, id: number | null | undefined) => (id != null ? (ctx.brands.get(id)?.name ?? null) : null);

export function groupProducts(products: CatalogProduct[], ctx: CatalogCtx, scores?: Map<number, number>): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();
  for (const p of products) {
    const fam = p.family_id != null ? ctx.families.get(p.family_id) : undefined;
    const key = p.family_id != null ? `f${p.family_id}` : `p${p.product_id}`;
    let g = groups.get(key);
    if (!g) {
      const categoryId = fam?.category_id ?? p.category_id ?? null;
      g = {
        key,
        familyId: p.family_id ?? null,
        name: fam?.name ?? (p.family_id != null ? deriveFamilyName(p.name, p.variant_label, null) : p.name),
        brandName: brandNameOf(ctx, fam?.brand_id ?? p.brand_id),
        categoryId,
        categoryPath: categoryPath(ctx, categoryId),
        optionUnit: fam?.option_unit ?? null,
        products: [],
        matchedIds: new Set(),
        score: 0,
      };
      groups.set(key, g);
    }
    g.products.push(p);
    const s = scores?.get(p.product_id);
    if (s !== undefined) {
      g.matchedIds.add(p.product_id);
      g.score = Math.max(g.score, s);
    }
  }
  for (const g of groups.values()) g.products.sort((a, b) => compareVariantLabels(a.variant_label, b.variant_label) || a.product_id - b.product_id);
  return [...groups.values()];
}

// ── The local index ───────────────────────────────────────────────────────────
interface Entry {
  product: CatalogProduct;
  /** " word word word ": lower-case words separated by single spaces, for substring and word tests. */
  hay: string;
  code: string;
  barcodes: string[];
  recency: number;
}

export interface CatalogIndex {
  entries: Entry[];
  ctx: CatalogCtx;
  byId: Map<number, CatalogProduct>;
  /** barcode -> product and the pack unit it stands for. */
  barcodes: Map<string, { product: CatalogProduct; unit_id: number | null }>;
  /** shop word -> what it means, and back ("hss" <-> "steel"). */
  termToMeans: Map<string, string[]>;
  meansToTerm: Map<string, string[]>;
  catalog: LocalCatalog;
}

const normalise = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}."'/+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()} `;

const timeOf = (s?: string | null) => (s ? Date.parse(s) || 0 : 0);

export function buildIndex(catalog: LocalCatalog): CatalogIndex {
  const ctx = buildCtx(catalog);
  const termToMeans = new Map<string, string[]>();
  const meansToTerm = new Map<string, string[]>();
  for (const a of catalog.aliases as RetailAlias[]) {
    const term = a.term.trim().toLowerCase();
    const means = a.means.trim().toLowerCase();
    if (!term || !means) continue;
    (termToMeans.get(term) ?? termToMeans.set(term, []).get(term)!).push(means);
    (meansToTerm.get(means) ?? meansToTerm.set(means, []).get(means)!).push(term);
  }
  const barcodes = new Map<string, { product: CatalogProduct; unit_id: number | null }>();
  const idMap = new Map<number, CatalogProduct>();
  const entries: Entry[] = catalog.products.map((product) => {
    idMap.set(product.product_id, product);
    const fam = product.family_id != null ? ctx.families.get(product.family_id) : undefined;
    const bcs = (product.barcodes ?? []).map((b) => b.barcode.toLowerCase());
    (product.barcodes ?? []).forEach((b) => barcodes.set(b.barcode.toLowerCase(), { product, unit_id: b.unit_id ?? null }));
    // The server builds search_text on every save; when it is missing we build the same words here.
    let text =
      product.search_text ??
      [
        product.name,
        product.name_si,
        brandNameOf(ctx, product.brand_id),
        categoryPath(ctx, product.category_id, " "),
        fam?.name,
        product.variant_label,
        ...(sizeVariants(formatVariant(product.variant_label, fam?.option_unit)) ?? []),
      ]
        .filter(Boolean)
        .join(" ");
    text = `${text} ${product.code} ${bcs.join(" ")}`;
    let hay = normalise(text);
    // Shop words: a product that says "steel" is also found by "hss".
    meansToTerm.forEach((terms, means) => {
      if (hay.includes(` ${means} `)) hay += `${terms.join(" ")} `;
    });
    return {
      product,
      hay,
      code: product.code.toLowerCase(),
      barcodes: bcs,
      recency: Math.max(timeOf(product.last_sold_at), timeOf(product.last_received_at)),
    };
  });
  return { entries, ctx, byId: idMap, barcodes, termToMeans, meansToTerm, catalog };
}

/** Joins "6 mm" into "6mm" so a size typed with a space still matches. */
const joinSizes = (q: string) => q.replace(/(\d+(?:\.\d+)?)\s+(mm|cm|m|ft|inch|in|l|kg|g)\b/gi, "$1$2");

export const queryWords = (q: string): string[] =>
  joinSizes(q.toLowerCase())
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter(Boolean);

/** For each typed word, the spellings that count as a match: the word and what shop words say it means ("hss" -> "steel"). */
const alternatives = (index: CatalogIndex, word: string): string[] => {
  const alts = new Set<string>([word]);
  index.termToMeans.get(word)?.forEach((m) => alts.add(m));
  return [...alts];
};

/** Score of one product against the typed words, or -1 when a word is missing. */
const scoreEntry = (e: Entry, words: string[], alts: string[][], whole: string): number => {
  if (whole && (e.code === whole || e.barcodes.includes(whole))) return 1000;
  let score = 0;
  for (let i = 0; i < words.length; i += 1) {
    let best = 0;
    for (const a of alts[i]) {
      if (!e.hay.includes(a)) continue;
      if (e.hay.includes(` ${a} `)) best = Math.max(best, 3);
      else if (e.hay.includes(` ${a}`)) best = Math.max(best, 2);
      else best = Math.max(best, 1);
    }
    if (best === 0) return -1;
    score += best;
  }
  return score;
};

export interface SearchOptions {
  limit?: number;
  /** Restrict to these category ids (a subtree) before matching. */
  categoryIds?: Set<number> | null;
  brandId?: number | null;
}

/** Product-level search: words in any order, aliases, sizes several ways. Best first. */
export function searchProducts(index: CatalogIndex, query: string, opts: SearchOptions = {}): Map<number, number> {
  const words = queryWords(query);
  const scores = new Map<number, number>();
  if (words.length === 0) return scores;
  const alts = words.map((w) => alternatives(index, w));
  const whole = query.trim().toLowerCase();
  for (const e of index.entries) {
    const p = e.product;
    if (opts.categoryIds && !(p.category_id != null && opts.categoryIds.has(p.category_id))) continue;
    if (opts.brandId != null && p.brand_id !== opts.brandId) continue;
    const s = scoreEntry(e, words, alts, whole);
    if (s < 0) continue;
    // Recent items win ties without ever beating a better text match.
    scores.set(p.product_id, s + (e.recency ? Math.min(0.99, e.recency / 4e12) : 0));
  }
  return scores;
}

/** Search grouped by family, best group first. */
export function searchGroups(index: CatalogIndex, query: string, opts: SearchOptions = {}): ProductGroup[] {
  const scores = searchProducts(index, query, opts);
  if (scores.size === 0) return [];
  const matched = [...scores.keys()].map((id) => index.byId.get(id)!);
  // List every size of a matching family, with the matching ones highlighted.
  const familyIds = new Set(matched.filter((p) => p.family_id != null).map((p) => p.family_id));
  const all = familyIds.size
    ? [...matched.filter((p) => p.family_id == null), ...index.catalog.products.filter((p) => p.family_id != null && familyIds.has(p.family_id))]
    : matched;
  const groups = groupProducts(all, index.ctx, scores).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return opts.limit ? groups.slice(0, opts.limit) : groups;
}

/** Barcode (or code) to product from the local copy; null when the catalogue does not know it. */
export function lookupLocal(index: CatalogIndex, code: string): { product: CatalogProduct; unit_id: number | null } | null {
  const c = code.trim().toLowerCase();
  const hit = index.barcodes.get(c);
  if (hit) return hit;
  const byCode = index.entries.find((e) => e.code === c);
  return byCode ? { product: byCode.product, unit_id: null } : null;
}

// ── Tap-through (category -> sub-category -> brand -> sizes) ───────────────────
export interface BrowseSelection {
  category?: number | null;
  subCategory?: number | null;
  /** 0 = items without a brand. */
  brand?: number | null;
}

export interface BrowseNodeVM {
  id: number;
  name: string;
  icon?: string | null;
  image_url?: string | null;
  count: number;
}

export interface BrowseView {
  level: "categories" | "subcategories" | "brands" | "items";
  nodes: BrowseNodeVM[];
  groups: ProductGroup[];
}

/** Shows only the levels that have items (plan §5.8 way 3). */
export function browseView(index: CatalogIndex, sel: BrowseSelection): BrowseView {
  const { ctx } = index;
  const products = index.catalog.products;
  const countOf = (ids: Set<number>) => products.filter((p) => p.category_id != null && ids.has(p.category_id)).length;
  const childrenOf = (id: number | null) =>
    [...ctx.categories.values()].filter((c) => c.parent_id === id && c.is_active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
  const toNode = (c: RetailCategory, count: number): BrowseNodeVM => ({ id: c.category_id, name: c.name, icon: c.icon, image_url: c.image_url, count });

  const nodesFor = (parent: number | null) =>
    childrenOf(parent)
      .map((c) => toNode(c, countOf(subtreeIds(ctx, c.category_id))))
      .filter((n) => n.count > 0);

  if (sel.category == null) return { level: "categories", nodes: nodesFor(null), groups: [] };

  let leaf = sel.subCategory ?? null;
  if (leaf == null) {
    const subs = nodesFor(sel.category);
    if (subs.length > 0) return { level: "subcategories", nodes: subs, groups: [] };
    leaf = sel.category;
  }
  const ids = subtreeIds(ctx, leaf);
  const inLeaf = products.filter((p) => p.category_id != null && ids.has(p.category_id));
  if (sel.brand == null) {
    const counts = new Map<number, number>();
    inLeaf.forEach((p) => counts.set(p.brand_id ?? 0, (counts.get(p.brand_id ?? 0) ?? 0) + 1));
    const nodes: BrowseNodeVM[] = [...counts.entries()]
      .map(([id, count]) => ({ id, count, name: id === 0 ? "" : (ctx.brands.get(id)?.name ?? `#${id}`), image_url: ctx.brands.get(id)?.logo_url ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name));
    // One level with nothing to choose between is skipped.
    if (nodes.length > 1 || (nodes.length === 1 && nodes[0].id !== 0)) return { level: "brands", nodes, groups: [] };
  }
  const chosen = sel.brand == null ? inLeaf : inLeaf.filter((p) => (p.brand_id ?? 0) === sel.brand);
  return { level: "items", nodes: [], groups: groupProducts(chosen, ctx).sort((a, b) => a.name.localeCompare(b.name)) };
}

// ── Pre-filling "Create here" from what was typed ─────────────────────────────
export interface Prefill {
  brandId: number | null;
  categoryId: number | null;
  subCategoryId: number | null;
  sizes: string[];
  leftover: string;
}

/** Reads typed words ("sali steel bit 6mm") into a brand, category and sizes where they are clear. */
export function prefillFromWords(words: string, ctx: CatalogCtx): Prefill {
  const tokens = queryWords(words);
  const used = new Set<number>();
  let brandId: number | null = null;
  let categoryId: number | null = null;
  let subCategoryId: number | null = null;
  const sizes: string[] = [];

  tokens.forEach((t, i) => {
    if (/^\d+(?:\.\d+)?(?:mm|cm|m|ft|in|inch|l|kg|g)?$/.test(t)) {
      sizes.push(t);
      used.add(i);
    }
  });
  for (const b of ctx.brands.values()) {
    const idx = tokens.findIndex((t, i) => !used.has(i) && t === b.name.toLowerCase());
    if (idx >= 0) {
      brandId = b.brand_id;
      used.add(idx);
      break;
    }
  }
  const matchCat = (c: RetailCategory) => {
    const name = c.name.toLowerCase();
    return tokens.findIndex((t, i) => !used.has(i) && t.length > 2 && (name === t || name.split(/\s+/).includes(t) || name.replace(/s$/, "") === t.replace(/s$/, "")));
  };
  for (const c of ctx.categories.values()) {
    if (c.parent_id == null) continue;
    const idx = matchCat(c);
    if (idx >= 0) {
      subCategoryId = c.category_id;
      categoryId = c.parent_id;
      used.add(idx);
      break;
    }
  }
  if (categoryId == null) {
    for (const c of ctx.categories.values()) {
      if (c.parent_id != null) continue;
      const idx = matchCat(c);
      if (idx >= 0) {
        categoryId = c.category_id;
        used.add(idx);
        break;
      }
    }
  }
  return { brandId, categoryId, subCategoryId, sizes, leftover: tokens.filter((_, i) => !used.has(i)).join(" ") };
}
