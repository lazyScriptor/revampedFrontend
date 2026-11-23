import { lookupLocal, searchProducts, type CatalogIndex } from "../catalog/catalogModel";
import type { CatalogProduct } from "../api/catalog.types";

// Pure stock-in math, validation, weighted average cost preview and Excel paste matching.
// Mirrors backend money.js & stockService.js so totals and landed costs match to the cent.

export const toCents = (amount: number | string | null | undefined): number => {
  const n = Number(amount);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

export const fromCents = (cents: number): number => Math.round(cents) / 100;

/** Splits `totalCents` proportionally by `weights`, putting rounding remainder on the largest weight. */
export function splitByWeight(totalCents: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const totalWeight = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (totalWeight <= 0) {
    // Equal split fallback if all line values are 0
    const base = Math.floor(totalCents / n);
    let rem = totalCents - base * n;
    return weights.map(() => {
      const add = rem > 0 ? 1 : 0;
      if (rem > 0) rem -= 1;
      return base + add;
    });
  }
  const exact = weights.map((w) => (totalCents * Math.max(0, w)) / totalWeight);
  const floors = exact.map((v) => Math.floor(v));
  let remainder = totalCents - floors.reduce((a, b) => a + b, 0);
  let largestIdx = 0;
  for (let i = 1; i < n; i += 1) {
    if (weights[i] > weights[largestIdx]) largestIdx = i;
  }
  floors[largestIdx] += remainder;
  return floors;
}

export interface ReceiveDraftLine {
  product_id: number;
  qty: string;
  cost: string;
  unit_id: number | null;
  serials: string[];
}

export interface ComputedReceiveLine {
  product: CatalogProduct;
  unitId: number | null;
  unitName: string;
  factor: number;
  qty: number;
  baseQty: number;
  enteredCost: number;
  missingCost: boolean;
  costDrift30: boolean;
  lineValueCents: number;
  deliveryShareCents: number;
  landedBaseCost: number;
  newAvgCost: number | null;
  needsSerials: boolean;
  serialsOk: boolean;
}

export interface ReceiveSummary {
  lines: ComputedReceiveLine[];
  lineCount: number;
  totalsByUnit: Array<{ unit: string; qty: number }>;
  subtotalCents: number;
  deliveryCents: number;
  grandTotalCents: number;
  missingCostCount: number;
  driftCount: number;
  incompleteSerialCount: number;
}

export function computeReceiveSummary(
  draftLines: ReceiveDraftLine[],
  deliveryCharge: number,
  byId: Map<number, CatalogProduct>,
  totalOnHand: (productId: number) => number,
): ReceiveSummary {
  const activeLines = draftLines
    .map((l) => {
      const product = byId.get(l.product_id);
      const qty = Number(l.qty);
      if (!product || !Number.isFinite(qty) || qty <= 0) return null;
      const unit = l.unit_id != null ? (product.units ?? []).find((u) => u.unit_id === l.unit_id) ?? null : null;
      const factor = unit?.factor || 1;
      const baseQty = Math.round(qty * factor * 1000) / 1000;
      const costTrim = l.cost.trim();
      const parsedCost = costTrim === "" ? NaN : Number(costTrim);
      const missingCost = !Number.isFinite(parsedCost) || parsedCost <= 0;
      const enteredCost = Number.isFinite(parsedCost) && parsedCost >= 0 ? parsedCost : 0;
      const baseEnteredCost = factor > 0 ? enteredCost / factor : enteredCost;
      const lastCost = product.last_cost ?? null;
      const costDrift30 =
        !missingCost && lastCost != null && lastCost > 0 && Math.abs(baseEnteredCost - lastCost) / lastCost >= 0.3;
      const lineValueCents = toCents(qty * enteredCost);
      const needsSerials = product.tracking === "serial" && product.serial_capture === "receive";
      const cleanSerials = new Set(l.serials.map((s) => s.trim()).filter(Boolean));
      const serialsOk = !needsSerials || (cleanSerials.size === baseQty && l.serials.length === baseQty);
      return {
        raw: l,
        product,
        unitId: unit?.unit_id ?? null,
        unitName: unit?.unit_name ?? product.base_unit ?? "pcs",
        factor,
        qty,
        baseQty,
        enteredCost,
        missingCost,
        costDrift30,
        lineValueCents,
        needsSerials,
        serialsOk,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const deliveryCents = toCents(Math.max(0, Number(deliveryCharge) || 0));
  const weights = activeLines.map((l) => l.lineValueCents);
  const shares = splitByWeight(deliveryCents, weights);
  const subtotalCents = weights.reduce((a, b) => a + b, 0);

  const unitTotalsMap = new Map<string, number>();
  const computed: ComputedReceiveLine[] = activeLines.map((item, i) => {
    const shareCents = shares[i] ?? 0;
    const totalLineCents = item.lineValueCents + shareCents;
    const landedBaseCost = item.baseQty > 0 ? Math.round((fromCents(totalLineCents) / item.baseQty) * 10000) / 10000 : 0;

    const oldAvg = item.product.avg_cost;
    let newAvgCost: number | null = null;
    if (oldAvg !== undefined) {
      const onHand = Math.max(0, totalOnHand(item.product.product_id));
      const oldAvgNum = oldAvg ?? 0;
      newAvgCost =
        onHand <= 0
          ? landedBaseCost
          : Math.round(((onHand * oldAvgNum + item.baseQty * landedBaseCost) / (onHand + item.baseQty)) * 10000) / 10000;
    }

    const baseUnit = item.product.base_unit ?? "pcs";
    unitTotalsMap.set(baseUnit, (unitTotalsMap.get(baseUnit) ?? 0) + item.baseQty);

    return {
      product: item.product,
      unitId: item.unitId,
      unitName: item.unitName,
      factor: item.factor,
      qty: item.qty,
      baseQty: item.baseQty,
      enteredCost: item.enteredCost,
      missingCost: item.missingCost,
      costDrift30: item.costDrift30,
      lineValueCents: item.lineValueCents,
      deliveryShareCents: shareCents,
      landedBaseCost,
      newAvgCost,
      needsSerials: item.needsSerials,
      serialsOk: item.serialsOk,
    };
  });

  return {
    lines: computed,
    lineCount: computed.length,
    totalsByUnit: [...unitTotalsMap.entries()].map(([unit, qty]) => ({ unit, qty: Math.round(qty * 1000) / 1000 })),
    subtotalCents,
    deliveryCents,
    grandTotalCents: subtotalCents + deliveryCents,
    missingCostCount: computed.filter((l) => l.missingCost).length,
    driftCount: computed.filter((l) => l.costDrift30).length,
    incompleteSerialCount: computed.filter((l) => l.needsSerials && !l.serialsOk).length,
  };
}

export interface MatchedPasteRow {
  product: CatalogProduct;
  unitId: number | null;
  qty: number;
  cost: number | null;
}

export interface UnmatchedPasteRow {
  id: string;
  query: string;
  qty: number;
  cost: number | null;
}

export function parsePastedRows(
  rawText: string,
  index: CatalogIndex,
): { matched: MatchedPasteRow[]; unmatched: UnmatchedPasteRow[] } {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const matched: MatchedPasteRow[] = [];
  const unmatched: UnmatchedPasteRow[] = [];

  const isHeader = (cols: string[]) => {
    const first = cols[0]?.toLowerCase() ?? "";
    const second = cols[1]?.toLowerCase() ?? "";
    return /^(code|sku|barcode|item|product|name)$/.test(first) && /^(qty|quantity|count|units?)$/.test(second);
  };

  lines.forEach((line, idx) => {
    const cols = (line.includes("\t") ? line.split("\t") : line.split(",")).map((c) => c.trim());
    if (idx === 0 && cols.length >= 2 && isHeader(cols)) return;
    const query = cols[0] ?? "";
    if (!query) return;

    const rawQty = cols[1] !== undefined && cols[1] !== "" ? Number(cols[1].replace(/,/g, "")) : 1;
    const qty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
    const rawCost = cols[2] !== undefined && cols[2] !== "" ? Number(cols[2].replace(/,/g, "")) : null;
    const cost = rawCost !== null && Number.isFinite(rawCost) && rawCost >= 0 ? rawCost : null;

    // 1. Exact barcode or product code
    const direct = lookupLocal(index, query);
    if (direct) {
      matched.push({ product: direct.product, unitId: direct.unit_id, qty, cost });
      return;
    }

    // 2. Exact product name match (case-insensitive)
    const lower = query.toLowerCase();
    const byExactName = index.entries.find((e) => e.product.name.toLowerCase() === lower);
    if (byExactName) {
      matched.push({ product: byExactName.product, unitId: null, qty, cost });
      return;
    }

    // 3. Unambiguous search match
    const scores = searchProducts(index, query, { limit: 5 });
    if (scores.size === 1) {
      const [pid] = [...scores.keys()];
      const prod = index.byId.get(pid);
      if (prod) {
        matched.push({ product: prod, unitId: null, qty, cost });
        return;
      }
    }

    unmatched.push({ id: `u-${idx}-${query}`, query, qty, cost });
  });

  return { matched, unmatched };
}

export const todayDateStr = (now: Date = new Date()): string => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const toOccurredAtIso = (dateStr: string, now: Date = new Date()): string | undefined => {
  const today = todayDateStr(now);
  if (!dateStr || dateStr === today) return undefined;
  return `${dateStr}T12:00:00`;
};
