import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import DraftsOutlinedIcon from "@mui/icons-material/DraftsOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Overlay, useOverlay, type OverlayComponentProps } from "@/components/overlay";
import { useToast } from "@/components/ui/AppToast";
import type { CatalogProduct, CatalogUnit } from "../api/catalog.types";
import { errorMessage } from "../api/http";
import { fetchStockDocument, fetchStockDocuments, fetchSupplierItems, fetchSuppliers } from "../api/stock.api";
import type { StockDocument, SupplierItem } from "../api/stock.types";
import { compareVariantLabels } from "../catalog/names";
import { useScanDetector } from "../catalog/scanDetector";
import { useRetailCatalog, useRetailPermissions } from "../catalog/useRetailCatalog";
import { ItemFinder } from "../finder/ItemFinder";
import { formatQty, formatRs } from "../format";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { isTrackableProduct } from "./levelsModel";
import {
  computeReceiveSummary,
  fromCents,
  parsePastedRows,
  todayDateStr,
  toOccurredAtIso,
  type ReceiveDraftLine,
  type UnmatchedPasteRow,
} from "./stockInModel";
import { StockInFamilyRow } from "./StockInFamilyRow";
import { StockInSlip } from "./StockInSlip";
import { useCreateReceive, useDeleteReceiveDraft, usePostReceiveDraft, useUpdateReceiveDraft } from "./stockMutations";
import { useStockLevels } from "./useStockLevels";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

interface Props extends OverlayComponentProps {
  warehouseId?: number | null;
  draftId?: number | null;
}

interface DeliveryGroup {
  key: string;
  familyId: number | null;
  productIds: number[];
}

const is409 = (err: any) => err?.response?.status === 409;

/**
 * Stock in (plan §7.3, F2):
 * - Compact header: supplier type-ahead, supplier bill no., location chip, date, delivery charge
 * - Left: ItemFinder (pick) + "From this supplier before"
 * - Right: Family size rows + stand-alone rows, pack switch, repeat-scan +1, Excel paste, serial scan
 */
function StockInOverlay({ warehouseId: initialWhId, draftId: initialDraftId }: Props) {
  const { t } = useTranslation();
  const overlay = useOverlay();
  const toast = useToast();
  const { canCost, canManage, canBackdate, canReceive } = useRetailPermissions();
  const { settings } = useRetailSettings();
  const { catalog, index, ready } = useRetailCatalog();
  const levels = useStockLevels(initialWhId);

  const createReceive = useCreateReceive();
  const updateDraft = useUpdateReceiveDraft();
  const postDraft = usePostReceiveDraft();
  const deleteDraft = useDeleteReceiveDraft();

  const [selectedWhId, setSelectedWhId] = useState<number | null>(initialWhId ?? null);
  const activeWhId = selectedWhId ?? levels.warehouseId;
  const activeWarehouse = levels.warehouses.find((w) => w.warehouse_id === activeWhId);

  const [draftId, setDraftId] = useState<number | null>(initialDraftId ?? null);
  const [version, setVersion] = useState<number>(1);
  const [docNo, setDocNo] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [supplier, setSupplier] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [dateStr, setDateStr] = useState(() => todayDateStr());
  const [deliveryCharge, setDeliveryCharge] = useState("");

  const [lines, setLines] = useState<Map<number, ReceiveDraftLine>>(() => new Map());
  const [groups, setGroups] = useState<DeliveryGroup[]>([]);
  const [focusedProductId, setFocusedProductId] = useState<number | null>(null);

  const [whMenu, setWhMenu] = useState<HTMLElement | null>(null);
  const [draftAnchor, setDraftAnchor] = useState<HTMLElement | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [unmatched, setUnmatched] = useState<UnmatchedPasteRow[]>([]);
  const [matchingRow, setMatchingRow] = useState<UnmatchedPasteRow | null>(null);

  const [serialProduct, setSerialProduct] = useState<CatalogProduct | null>(null);
  const [serialInput, setSerialInput] = useState("");
  const [serialError, setSerialError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [postedDoc, setPostedDoc] = useState<StockDocument | null>(null);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suppliers type-ahead
  const suppliersQ = useQuery({
    queryKey: ["retail", "stock", "suppliers", supplier.trim()],
    queryFn: () => fetchSuppliers(supplier.trim()),
    enabled: canReceive,
    staleTime: 30_000,
  });

  // Items received from the selected supplier before
  const supplierItemsQ = useQuery({
    queryKey: ["retail", "finder", "supplier-items", supplier.trim()],
    queryFn: () => fetchSupplierItems(supplier.trim()),
    enabled: canReceive && supplier.trim().length > 0,
    staleTime: 30_000,
  });
  const supplierItemsMap = useMemo(() => {
    const m = new Map<number, SupplierItem>();
    for (const item of supplierItemsQ.data ?? []) m.set(item.product_id, item);
    return m;
  }, [supplierItemsQ.data]);

  // Existing drafts
  const draftsQ = useQuery({
    queryKey: ["retail", "stock", "documents", "receive-drafts"],
    queryFn: () => fetchStockDocuments({ type: "receive", status: "draft", limit: 50 }),
    enabled: canReceive,
    staleTime: 15_000,
  });
  const drafts = draftsQ.data?.documents ?? [];

  const hydrateDocument = (doc: StockDocument) => {
    setDraftId(doc.doc_id);
    setVersion(doc.version);
    setDocNo(doc.doc_no);
    setSelectedWhId(doc.warehouse_id);
    setSupplier(doc.supplier_name ?? "");
    setSupplierRef(doc.supplier_ref ?? "");
    setDateStr(doc.occurred_at ? doc.occurred_at.slice(0, 10) : todayDateStr());
    setDeliveryCharge(doc.delivery_charge != null && doc.delivery_charge > 0 ? String(doc.delivery_charge) : "");

    const nextLines = new Map<number, ReceiveDraftLine>();
    const nextGroups: DeliveryGroup[] = [];
    const seenGroups = new Set<string>();

    for (const l of doc.lines) {
      const prod = index.byId.get(l.product_id);
      const costVal = l.entered_unit_cost != null && l.entered_unit_cost > 0 ? String(l.entered_unit_cost) : "";
      nextLines.set(l.product_id, {
        product_id: l.product_id,
        qty: String(l.qty),
        cost: costVal,
        unit_id: l.unit_id ?? null,
        serials: l.serials ?? [],
      });
      const gKey = prod?.family_id != null ? `f:${prod.family_id}` : `p:${l.product_id}`;
      if (!seenGroups.has(gKey)) {
        seenGroups.add(gKey);
        const variants =
          prod?.family_id != null
            ? catalog.products
                .filter((p) => p.family_id === prod.family_id)
                .sort((a, b) => compareVariantLabels(a.variant_label, b.variant_label) || a.product_id - b.product_id)
                .map((p) => p.product_id)
            : [l.product_id];
        nextGroups.push({ key: gKey, familyId: prod?.family_id ?? null, productIds: variants });
      }
    }
    setLines(nextLines);
    setGroups(nextGroups);
    setDirty(false);
    setConflict(false);
    setError(null);
  };

  // Load initial draft if opened with draftId (wait until catalog index is ready so family rows group properly)
  useEffect(() => {
    if (!initialDraftId || !ready) return;
    let alive = true;
    fetchStockDocument(initialDraftId)
      .then((doc) => {
        if (alive) hydrateDocument(doc);
      })
      .catch((err) => {
        if (alive) setError(errorMessage(err, t("retail.stock.loadFailed")));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraftId, ready]);

  // Keep family groups synchronized if "+ size" added a new product or catalog finished hydrating
  const resolvedGroups = useMemo(() => {
    const out: DeliveryGroup[] = [];
    const seen = new Set<string>();
    for (const g of groups) {
      const resolvedFamId = g.familyId ?? index.byId.get(g.productIds[0])?.family_id ?? null;
      const key = resolvedFamId != null ? `f:${resolvedFamId}` : g.key;
      if (seen.has(key)) continue;
      seen.add(key);
      if (resolvedFamId == null) {
        out.push(g);
        continue;
      }
      const allIds = catalog.products
        .filter((p) => p.family_id === resolvedFamId)
        .sort((a, b) => compareVariantLabels(a.variant_label, b.variant_label) || a.product_id - b.product_id)
        .map((p) => p.product_id);
      out.push({ key, familyId: resolvedFamId, productIds: allIds.length ? allIds : g.productIds });
    }
    return out;
  }, [groups, catalog.products, index.byId]);

  const defaultCostFor = (product: CatalogProduct, unitId: number | null): string => {
    const sup = supplierItemsMap.get(product.product_id);
    const unit = unitId != null ? (product.units ?? []).find((u) => u.unit_id === unitId) : null;
    const factor = unit?.factor ?? 1;
    if (sup?.last_unit_cost != null && sup.last_unit_cost > 0) {
      if ((sup.last_unit_id ?? null) === unitId) return String(sup.last_unit_cost);
      const supUnit = sup.last_unit_id != null ? (product.units ?? []).find((u) => u.unit_id === sup.last_unit_id) : null;
      const baseCost = supUnit?.factor ? sup.last_unit_cost / supUnit.factor : sup.last_unit_cost;
      return String(Math.round(baseCost * factor * 100) / 100);
    }
    const base = product.last_cost ?? product.avg_cost;
    if (base != null && base > 0) return String(Math.round(base * factor * 100) / 100);
    return "";
  };

  const ensureGroupForProduct = (product: CatalogProduct) => {
    const gKey = product.family_id != null ? `f:${product.family_id}` : `p:${product.product_id}`;
    setGroups((prev) => {
      if (prev.some((g) => g.key === gKey)) return prev;
      const productIds =
        product.family_id != null
          ? catalog.products
              .filter((p) => p.family_id === product.family_id)
              .sort((a, b) => compareVariantLabels(a.variant_label, b.variant_label) || a.product_id - b.product_id)
              .map((p) => p.product_id)
          : [product.product_id];
      return [...prev, { key: gKey, familyId: product.family_id ?? null, productIds: productIds.length ? productIds : [product.product_id] }];
    });
  };

  const addOrIncrementProduct = (
    product: CatalogProduct,
    unit: CatalogUnit | null = null,
    opts: { deltaQty?: number; costOverride?: number | null; viaScan?: boolean } = {},
  ) => {
    if (!isTrackableProduct(product)) {
      toast.showWarning(t("retail.stockIn.untrackable", { name: product.name }));
      return;
    }
    ensureGroupForProduct(product);
    const delta = opts.deltaQty ?? 1;
    setLines((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.product_id);
      const sup = supplierItemsMap.get(product.product_id);
      const targetUnitId = unit?.unit_id ?? existing?.unit_id ?? sup?.last_unit_id ?? null;
      const prevQty = Number(existing?.qty);
      const nextQty = (Number.isFinite(prevQty) && prevQty > 0 ? prevQty : 0) + delta;
      const nextCost =
        opts.costOverride != null
          ? String(opts.costOverride)
          : existing?.cost
            ? existing.cost
            : defaultCostFor(product, targetUnitId);
      next.set(product.product_id, {
        product_id: product.product_id,
        qty: String(Math.round(nextQty * 1000) / 1000),
        cost: nextCost,
        unit_id: targetUnitId,
        serials: existing?.serials ?? [],
      });
      return next;
    });
    setDirty(true);
    // Do NOT steal focus from barcode scanner input during scan bursts, so repeat scans stay active!
    if (!opts.viaScan) setFocusedProductId(product.product_id);
  };

  const setLinePatch = (productId: number, patch: Partial<ReceiveDraftLine>) => {
    const prod = index.byId.get(productId);
    setLines((prev) => {
      const next = new Map(prev);
      const cur: ReceiveDraftLine = next.get(productId) ?? {
        product_id: productId,
        qty: "",
        cost: prod ? defaultCostFor(prod, null) : "",
        unit_id: null,
        serials: [],
      };
      const merged = { ...cur, ...patch };
      // Prefill default cost when qty becomes > 0 and cost was empty
      if (patch.qty !== undefined && Number(patch.qty) > 0 && !merged.cost && prod) {
        merged.cost = defaultCostFor(prod, merged.unit_id);
      }
      next.set(productId, merged);
      return next;
    });
    setDirty(true);
  };

  const switchPackUnit = (variantIds: number[], unitName: string | null) => {
    setLines((prev) => {
      const next = new Map(prev);
      for (const pid of variantIds) {
        const prod = index.byId.get(pid);
        if (!prod) continue;
        const unit = unitName ? (prod.units ?? []).find((u) => u.unit_name === unitName) ?? null : null;
        const cur = next.get(pid);
        if (cur) {
          const oldUnit = cur.unit_id != null ? (prod.units ?? []).find((u) => u.unit_id === cur.unit_id) ?? null : null;
          const oldFactor = oldUnit?.factor ?? 1;
          const newFactor = unit?.factor ?? 1;
          let nextCost = cur.cost;
          if (cur.cost && oldFactor > 0) {
            const base = Number(cur.cost) / oldFactor;
            if (Number.isFinite(base)) nextCost = String(Math.round(base * newFactor * 100) / 100);
          } else {
            nextCost = defaultCostFor(prod, unit?.unit_id ?? null);
          }
          next.set(pid, { ...cur, unit_id: unit?.unit_id ?? null, cost: nextCost });
        } else if (unit) {
          next.set(pid, {
            product_id: pid,
            qty: "",
            cost: defaultCostFor(prod, unit.unit_id ?? null),
            unit_id: unit.unit_id ?? null,
            serials: [],
          });
        }
      }
      return next;
    });
    setDirty(true);
  };

  const removeGroup = (variantIds: number[]) => {
    setLines((prev) => {
      const next = new Map(prev);
      for (const pid of variantIds) next.delete(pid);
      return next;
    });
    setGroups((prev) => prev.filter((g) => !g.productIds.some((id) => variantIds.includes(id))));
    setDirty(true);
  };

  const summary = useMemo(
    () => computeReceiveSummary([...lines.values()], Number(deliveryCharge) || 0, index.byId, levels.totalQtyAllLocations),
    [lines, deliveryCharge, index.byId, levels.totalQtyAllLocations],
  );
  const computedMap = useMemo(() => new Map(summary.lines.map((l) => [l.product.product_id, l])), [summary.lines]);

  // Serial scanner dialog handler
  const addSerial = (raw: string) => {
    const val = raw.trim();
    if (!val || !serialProduct) return;
    setSerialError(null);
    const cur = lines.get(serialProduct.product_id);
    const list = cur?.serials ?? [];
    if (list.includes(val)) {
      setSerialError(t("retail.stockIn.duplicateSerial", { serial: val }));
      return;
    }
    const target = computedMap.get(serialProduct.product_id)?.baseQty ?? 0;
    if (target > 0 && list.length >= target) {
      setSerialError(t("retail.stockIn.serialLimitReached", { count: target }));
      return;
    }
    setLinePatch(serialProduct.product_id, { serials: [...list, val] });
    setSerialInput("");
  };

  useScanDetector((code) => addSerial(code), !!serialProduct);

  // Paste handling
  const applyPaste = () => {
    const res = parsePastedRows(pasteText, index);
    for (const m of res.matched) {
      const unit = m.unitId != null ? (m.product.units ?? []).find((u) => u.unit_id === m.unitId) ?? null : null;
      addOrIncrementProduct(m.product, unit, { deltaQty: m.qty, costOverride: m.cost, viaScan: true });
    }
    setUnmatched((prev) => [...prev, ...res.unmatched]);
    setPasteText("");
    setPasteOpen(false);
    toast.showSuccess(t("retail.stockIn.pasteSummary", { matched: res.matched.length, unmatched: res.unmatched.length }));
  };

  const booksClosedError =
    !!settings.booksClosedUntil && !!dateStr && dateStr <= settings.booksClosedUntil
      ? t("retail.stockIn.booksClosed", { date: settings.booksClosedUntil })
      : null;

  const buildPayload = (isPosting: boolean) => ({
    warehouse_id: activeWhId ?? undefined,
    supplier_name: supplier.trim(),
    supplier_ref: supplierRef.trim() || null,
    occurred_at: toOccurredAtIso(dateStr),
    delivery_charge: canCost ? Math.max(0, Number(deliveryCharge) || 0) : 0,
    lines: summary.lines.map((l) => {
      const rawSerials = lines.get(l.product.product_id)?.serials ?? [];
      return {
        product_id: l.product.product_id,
        unit_id: l.unitId,
        qty: l.qty,
        unit_cost: canCost ? l.enteredCost : 0,
        // Backend allows null/omitted serials in draft mode, and enforces exact count on post
        ...(isPosting || (l.needsSerials && rawSerials.length === l.baseQty) ? { serials: rawSerials } : {}),
      };
    }),
  });

  const handleSaveDraft = async () => {
    setError(null);
    if (!supplier.trim()) {
      setError(t("retail.stockIn.supplierRequired"));
      return;
    }
    if (summary.lineCount === 0) {
      setError(t("retail.stockIn.linesRequired"));
      return;
    }
    if (booksClosedError) {
      setError(booksClosedError);
      return;
    }
    try {
      const payload = buildPayload(false);
      const saved = draftId
        ? await updateDraft.mutateAsync({ id: draftId, input: { ...payload, version } })
        : await createReceive.mutateAsync({ ...payload, post: false });
      setDraftId(saved.doc_id);
      setVersion(saved.version);
      setDocNo(saved.doc_no);
      setDirty(false);
      setConflict(false);
      toast.showSuccess(t("retail.stockIn.draftSaved", { docNo: saved.doc_no }));
    } catch (err: any) {
      if (is409(err)) setConflict(true);
      else setError(errorMessage(err, t("retail.item.saveFailed")));
    }
  };

  const handleOpenConfirmPost = () => {
    setError(null);
    if (!supplier.trim()) {
      setError(t("retail.stockIn.supplierRequired"));
      return;
    }
    if (summary.lineCount === 0) {
      setError(t("retail.stockIn.linesRequired"));
      return;
    }
    if (booksClosedError) {
      setError(booksClosedError);
      return;
    }
    if (summary.incompleteSerialCount > 0) {
      setError(t("retail.stockIn.serialsIncomplete"));
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmPost = async () => {
    setError(null);
    try {
      let targetId = draftId;
      let targetVersion = version;
      if (!targetId) {
        const created = await createReceive.mutateAsync({ ...buildPayload(false), post: false });
        targetId = created.doc_id;
        targetVersion = created.version;
        setDraftId(created.doc_id);
        setVersion(created.version);
        setDocNo(created.doc_no);
      } else if (dirty) {
        const updated = await updateDraft.mutateAsync({ id: targetId, input: { ...buildPayload(false), version: targetVersion } });
        targetVersion = updated.version;
        setVersion(updated.version);
      }
      const posted = await postDraft.mutateAsync({ id: targetId, version: targetVersion });
      setConfirmOpen(false);
      setPostedDoc(posted);
      toast.showSuccess(t("retail.stockIn.postedToast", { docNo: posted.doc_no }));
    } catch (err: any) {
      setConfirmOpen(false);
      if (is409(err)) setConflict(true);
      else setError(errorMessage(err, t("retail.item.saveFailed")));
    }
  };

  const handleReloadConflict = async () => {
    if (!draftId) return;
    try {
      const fresh = await fetchStockDocument(draftId);
      hydrateDocument(fresh);
      toast.showInfo(t("retail.stockIn.reloaded"));
    } catch (err) {
      setError(errorMessage(err, t("retail.stock.loadFailed")));
    }
  };

  const handlePrintSlip = () => {
    if (typeof document === "undefined") return;
    document.body.classList.add("retail-printing");
    try {
      window.print();
    } finally {
      setTimeout(() => document.body.classList.remove("retail-printing"), 300);
    }
  };

  const busy = createReceive.isPending || updateDraft.isPending || postDraft.isPending;

  const headerActions = !postedDoc ? (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Button size="small" startIcon={<ContentPasteIcon />} onClick={() => setPasteOpen((o) => !o)} sx={{ textTransform: "none", fontWeight: 700 }}>
        {t("retail.stockIn.paste")}
      </Button>
      <Chip
        size="small"
        clickable
        icon={<DraftsOutlinedIcon fontSize="small" />}
        label={`${t("retail.stockIn.drafts")} (${drafts.length})`}
        onClick={(e) => setDraftAnchor(e.currentTarget)}
        data-testid="drafts-chip"
        sx={{ fontWeight: 700, ...NUM }}
      />
    </Stack>
  ) : undefined;

  const footer = postedDoc ? (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
      <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={handlePrintSlip} sx={{ minHeight: 44 }}>
        {t("retail.stockIn.printSlip")}
      </Button>
      <Button variant="contained" startIcon={<CheckIcon />} onClick={() => void overlay.close()} sx={{ minHeight: 44 }}>
        {t("retail.stockIn.done")}
      </Button>
    </Stack>
  ) : (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
        <Typography variant="body2" sx={{ fontWeight: 800, ...NUM }}>
          {t("retail.stockIn.linesCount", { count: summary.lineCount })}
        </Typography>
        {summary.totalsByUnit.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={NUM}>
            {summary.totalsByUnit.map((u) => `${formatQty(u.qty)} ${u.unit}`).join(" · ")}
          </Typography>
        )}
        {canCost && (
          <Typography variant="body2" sx={{ fontWeight: 800, ...NUM }}>
            {t("retail.stockIn.totalCost")}: {formatRs(fromCents(summary.grandTotalCents))}
          </Typography>
        )}
        {canCost && summary.missingCostCount > 0 && (
          <Chip size="small" color="error" variant="outlined" label={t("retail.stockIn.missingCostCount", { count: summary.missingCostCount })} sx={NUM} />
        )}
        {canCost && summary.driftCount > 0 && (
          <Chip size="small" color="warning" variant="outlined" label={t("retail.stockIn.driftCount", { count: summary.driftCount })} sx={NUM} />
        )}
        {summary.incompleteSerialCount > 0 && (
          <Chip size="small" color="warning" variant="outlined" label={t("retail.stockIn.serialsNeededCount", { count: summary.incompleteSerialCount })} sx={NUM} />
        )}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        <Button variant="outlined" startIcon={<SaveOutlinedIcon />} disabled={busy} onClick={() => void handleSaveDraft()} sx={{ minHeight: 44 }}>
          {t("retail.stockIn.saveDraft")}
        </Button>
        <Button variant="contained" startIcon={<CheckIcon />} disabled={busy} onClick={handleOpenConfirmPost} sx={{ minHeight: 44 }}>
          {t("retail.stockIn.post")}
        </Button>
      </Stack>
    </Stack>
  );

  return (
    <Overlay
      title={docNo ? `${t("retail.stockIn.title")} · ${docNo}` : t("retail.stockIn.title")}
      width="min(1160px, 96vw)"
      onConfirm={postedDoc ? () => void overlay.close() : undefined}
      headerActions={headerActions}
      footer={footer}
    >
      {postedDoc ? (
        <Box sx={{ py: 4, textAlign: "center", maxWidth: 520, mx: "auto" }} data-testid="stock-in-posted">
          <CheckCircleOutlinedIcon color="success" sx={{ fontSize: 56, mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {t("retail.stockIn.postedHeading", { docNo: postedDoc.doc_no })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2, ...NUM }}>
            {[postedDoc.supplier_name, postedDoc.location_name, t("retail.stockIn.linesCount", { count: postedDoc.lines.length })].filter(Boolean).join(" · ")}
          </Typography>
          {canCost && postedDoc.total_cost != null && (
            <Typography variant="subtitle1" sx={{ fontWeight: 800, ...NUM }}>
              {t("retail.stockIn.totalCost")}: {formatRs(postedDoc.total_cost)}
            </Typography>
          )}
          <StockInSlip doc={postedDoc} canCost={canCost} />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0 }}>
          {conflict && (
            <Alert
              severity="error"
              data-testid="draft-conflict"
              action={
                <Button size="small" color="inherit" onClick={() => void handleReloadConflict()}>
                  {t("retail.stockIn.reload")}
                </Button>
              }
            >
              {t("retail.stockIn.conflict")}
            </Alert>
          )}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Compact 1-line header */}
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
            <Autocomplete
              freeSolo
              size="small"
              options={suppliersQ.data ?? []}
              inputValue={supplier}
              onInputChange={(_, v) => {
                setSupplier(v);
                setDirty(true);
              }}
              onChange={(_, v) => {
                setSupplier(v ?? "");
                setDirty(true);
              }}
              sx={{ flex: "1 1 200px", minWidth: 180 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("retail.stockIn.supplier")}
                  placeholder={t("retail.stockIn.supplierPlaceholder")}
                />
              )}
            />
            <TextField
              size="small"
              label={t("retail.stockIn.billNo")}
              value={supplierRef}
              onChange={(e) => {
                setSupplierRef(e.target.value);
                setDirty(true);
              }}
              sx={{ width: { xs: "100%", sm: 150 } }}
              slotProps={{ htmlInput: { style: NUM } }}
            />
            {levels.warehouses.length > 0 && (
              <>
                <Chip
                  clickable={levels.warehouses.length > 1}
                  icon={<LocationOnOutlinedIcon fontSize="small" />}
                  deleteIcon={levels.warehouses.length > 1 ? <KeyboardArrowDownIcon fontSize="small" /> : undefined}
                  onDelete={levels.warehouses.length > 1 ? (e) => setWhMenu(e.currentTarget as HTMLElement) : undefined}
                  onClick={levels.warehouses.length > 1 ? (e) => setWhMenu(e.currentTarget) : undefined}
                  label={activeWarehouse?.location_name ?? t("retail.stock.location")}
                  variant="outlined"
                  sx={{ minHeight: 38, fontWeight: 700 }}
                />
                <Menu anchorEl={whMenu} open={!!whMenu} onClose={() => setWhMenu(null)}>
                  {levels.warehouses.map((w) => (
                    <MenuItem
                      key={w.warehouse_id}
                      selected={w.warehouse_id === activeWhId}
                      onClick={() => {
                        setSelectedWhId(w.warehouse_id);
                        setWhMenu(null);
                        setDirty(true);
                      }}
                    >
                      {w.location_name}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
            <Tooltip title={!canBackdate ? t("retail.stockIn.backdateDisabledTip") : t("retail.stockIn.date")}>
              <span>
                <TextField
                  size="small"
                  type="date"
                  label={t("retail.stockIn.date")}
                  value={dateStr}
                  disabled={!canBackdate}
                  onChange={(e) => {
                    setDateStr(e.target.value);
                    setDirty(true);
                  }}
                  sx={{ width: 155 }}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: {
                      "aria-label": t("retail.stockIn.date"),
                      max: todayDateStr(),
                      min: settings.booksClosedUntil ? settings.booksClosedUntil : undefined,
                      style: NUM,
                    },
                  }}
                />
              </span>
            </Tooltip>
            {canCost && (
              <TextField
                size="small"
                label={t("retail.stockIn.deliveryCharge")}
                value={deliveryCharge}
                onChange={(e) => {
                  setDeliveryCharge(e.target.value);
                  setDirty(true);
                }}
                sx={{ width: 145 }}
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">Rs</InputAdornment> },
                  htmlInput: { inputMode: "decimal", style: NUM, "aria-label": t("retail.stockIn.deliveryCharge") },
                }}
              />
            )}
          </Stack>

          {/* Excel paste drawer */}
          {pasteOpen && (
            <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: "divider", bgcolor: "action.hover" }} data-testid="paste-panel">
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                {t("retail.stockIn.pasteHint")}
              </Typography>
              <TextField
                multiline
                minRows={3}
                fullWidth
                size="small"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={t("retail.stockIn.pastePlaceholder")}
                slotProps={{ htmlInput: { "aria-label": t("retail.stockIn.paste"), style: NUM } }}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: "flex-end" }}>
                <Button size="small" onClick={() => setPasteOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button size="small" variant="contained" disabled={!pasteText.trim()} onClick={applyPaste}>
                  {t("retail.stockIn.applyPaste")}
                </Button>
              </Stack>
            </Box>
          )}

          {/* Unmatched paste rows */}
          {unmatched.length > 0 && (
            <Box sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: "warning.main", bgcolor: (th) => alpha(th.palette.warning.main, 0.08) }} data-testid="unmatched-list">
              <Typography variant="caption" sx={{ fontWeight: 800, display: "block", mb: 0.75 }}>
                {t("retail.stockIn.matchThese", { count: unmatched.length })}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                {unmatched.map((u) => (
                  <Chip
                    key={u.id}
                    size="small"
                    clickable
                    color="warning"
                    variant="outlined"
                    label={`${u.query} × ${u.qty}${canCost && u.cost != null ? ` @ ${u.cost}` : ""}`}
                    onClick={() => setMatchingRow(u)}
                    onDelete={() => setUnmatched((cur) => cur.filter((x) => x.id !== u.id))}
                    sx={NUM}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Two-pane workspace: Left = Finder + Supplier items; Right = Delivery list */}
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, minHeight: 0 }}>
            <Box sx={{ flex: { md: "0 0 360px" }, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
              <Box sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: "divider" }}>
                <ItemFinder
                  mode="pick"
                  allowCreate
                  autoFocus={false}
                  warehouseId={activeWhId}
                  onPick={(product, unit, meta) => addOrIncrementProduct(product, unit ?? null, { viaScan: meta?.viaScan })}
                />
              </Box>

              {supplier.trim() && (supplierItemsQ.data?.length ?? 0) > 0 && (
                <Box sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: "divider" }} data-testid="supplier-items">
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: "block", mb: 0.75 }}>
                    {t("retail.stockIn.fromSupplier")}
                  </Typography>
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                    {(supplierItemsQ.data ?? []).slice(0, 12).map((si) => {
                      const prod = index.byId.get(si.product_id);
                      const labelName = prod?.name ?? si.product?.name ?? `#${si.product_id}`;
                      const unit = si.last_unit ?? null;
                      return (
                        <Chip
                          key={si.product_id}
                          size="small"
                          clickable
                          variant="outlined"
                          label={
                            <span style={NUM}>
                              {labelName}
                              {canCost && si.last_unit_cost != null ? ` · ${formatRs(si.last_unit_cost)}` : ""}
                            </span>
                          }
                          onClick={() => {
                            if (prod) addOrIncrementProduct(prod, unit, { costOverride: si.last_unit_cost ?? undefined });
                          }}
                          sx={{ minHeight: 30 }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
              {resolvedGroups.length === 0 ? (
                <Box sx={{ p: 4, borderRadius: 2, border: 1, borderStyle: "dashed", borderColor: "divider", textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    {t("retail.stockIn.emptyList")}
                  </Typography>
                </Box>
              ) : (
                resolvedGroups.map((g) => {
                  if (g.familyId != null) {
                    const variants = g.productIds.map((id) => index.byId.get(id)).filter((p): p is CatalogProduct => !!p);
                    if (variants.length === 0) return null;
                    const family = index.ctx.families.get(g.familyId) ?? null;
                    const title = family?.name ?? variants[0].name;
                    return (
                      <StockInFamilyRow
                        key={g.key}
                        family={family}
                        title={title}
                        variants={variants}
                        lineMap={lines}
                        computedMap={computedMap}
                        canCost={canCost}
                        canManage={canManage}
                        focusedProductId={focusedProductId}
                        onSetLine={setLinePatch}
                        onSwitchPackUnit={switchPackUnit}
                        onOpenSerials={(p) => {
                          setSerialError(null);
                          setSerialProduct(p);
                        }}
                        onRemoveGroup={removeGroup}
                      />
                    );
                  }

                  // Stand-alone one-line row
                  const pid = g.productIds[0];
                  const prod = index.byId.get(pid);
                  if (!prod) return null;
                  const line = lines.get(pid);
                  const comp = computedMap.get(pid);
                  const units = prod.units ?? [];
                  const activeUnit = line?.unit_id != null ? units.find((u) => u.unit_id === line.unit_id) ?? null : null;
                  const baseUnit = prod.base_unit ?? "pcs";
                  const cycleUnit = () => {
                    if (!units.length) return;
                    const idx = activeUnit ? units.findIndex((u) => u.unit_id === activeUnit.unit_id) : -1;
                    const next = idx + 1 < units.length ? units[idx + 1] : null;
                    switchPackUnit([pid], next?.unit_name ?? null);
                  };
                  const hasQty = Number(line?.qty) > 0;
                  const missing = hasQty && !!comp?.missingCost;
                  const drift = hasQty && !!comp?.costDrift30;
                  const needsSerials = prod.tracking === "serial" && prod.serial_capture === "receive";

                  return (
                    <Box
                      key={g.key}
                      data-testid={`standalone-row-${pid}`}
                      sx={{ p: 1.25, border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
                    >
                      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                        <Box sx={{ flex: "1 1 180px", minWidth: 140 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {prod.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={NUM}>
                            {prod.code}
                            {activeUnit && comp ? ` · ${formatQty(comp.baseQty)} ${baseUnit}` : ""}
                            {canCost && comp?.newAvgCost != null ? ` · ${t("retail.stockIn.newAvg")} ${formatRs(comp.newAvgCost)}` : ""}
                          </Typography>
                        </Box>

                        {units.length > 0 && (
                          <Chip
                            size="small"
                            clickable
                            icon={<SwapHorizIcon fontSize="small" />}
                            color={activeUnit ? "primary" : "default"}
                            variant={activeUnit ? "filled" : "outlined"}
                            onClick={cycleUnit}
                            label={activeUnit ? `${activeUnit.unit_name} (×${formatQty(activeUnit.factor)})` : baseUnit}
                            sx={{ fontWeight: 700, ...NUM }}
                          />
                        )}

                        <TextField
                          size="small"
                          autoFocus={focusedProductId === pid}
                          label={t("retail.stockIn.qtyRow")}
                          value={line?.qty ?? ""}
                          onChange={(e) => setLinePatch(pid, { qty: e.target.value })}
                          sx={{ width: 92 }}
                          slotProps={{ htmlInput: { inputMode: prod.allow_decimal ? "decimal" : "numeric", style: NUM } }}
                        />

                        {canCost && (
                          <Tooltip title={drift ? t("retail.stockIn.costDriftWarn", { last: formatRs(prod.last_cost) }) : ""} disableHoverListener={!drift}>
                            <TextField
                              size="small"
                              label={t("retail.stockIn.costLabel")}
                              value={line?.cost ?? ""}
                              error={missing}
                              color={drift ? "warning" : undefined}
                              onChange={(e) => setLinePatch(pid, { cost: e.target.value })}
                              sx={{ width: 112 }}
                              slotProps={{ htmlInput: { inputMode: "decimal", style: NUM } }}
                            />
                          </Tooltip>
                        )}

                        {needsSerials && hasQty && (
                          <Chip
                            size="small"
                            clickable
                            icon={<QrCodeScannerIcon fontSize="small" />}
                            color={comp?.serialsOk ? "success" : "warning"}
                            variant="outlined"
                            label={`${line?.serials.length ?? 0}/${comp?.baseQty ?? 0}`}
                            onClick={() => {
                              setSerialError(null);
                              setSerialProduct(prod);
                            }}
                            sx={{ fontWeight: 700, ...NUM }}
                          />
                        )}

                        <IconButton size="small" aria-label={t("common.remove")} onClick={() => removeGroup([pid])}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Drafts popover */}
      <Popover
        open={!!draftAnchor}
        anchorEl={draftAnchor}
        onClose={() => setDraftAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Box sx={{ width: 320, maxHeight: 360, overflowY: "auto", p: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, px: 1 }}>
            {t("retail.stockIn.draftsList")}
          </Typography>
          {drafts.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
              {t("retail.stockIn.noDrafts")}
            </Typography>
          ) : (
            <List dense disablePadding>
              {drafts.map((d) => (
                <ListItem
                  key={d.doc_id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label={t("common.delete")}
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteDraft.mutateAsync(d.doc_id);
                      }}
                    >
                      <DeleteOutlinedIcon fontSize="small" />
                    </IconButton>
                  }
                  sx={{ borderRadius: 1, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                  onClick={() => {
                    setDraftAnchor(null);
                    void fetchStockDocument(d.doc_id).then(hydrateDocument);
                  }}
                >
                  <ListItemText
                    primary={`${d.doc_no} · ${d.supplier_name || "—"}`}
                    secondary={new Date(d.occurred_at).toLocaleDateString()}
                    slotProps={{ primary: { variant: "body2", sx: { fontWeight: 700, ...NUM } } }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>

      {/* Unmatched paste picker dialog */}
      <Dialog open={!!matchingRow} onClose={() => setMatchingRow(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t("retail.stockIn.pickMatch", { query: matchingRow?.query ?? "" })}</DialogTitle>
        <DialogContent>
          {matchingRow && (
            <ItemFinder
              mode="pick"
              allowCreate
              initialQuery={matchingRow.query}
              warehouseId={activeWhId}
              onPick={(product, unit) => {
                addOrIncrementProduct(product, unit ?? null, { deltaQty: matchingRow.qty, costOverride: matchingRow.cost });
                setUnmatched((cur) => cur.filter((x) => x.id !== matchingRow.id));
                setMatchingRow(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Serial scan dialog */}
      <Dialog open={!!serialProduct} onClose={() => setSerialProduct(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {serialProduct?.name} — {t("retail.stockIn.serialsTitle")}
        </DialogTitle>
        <DialogContent>
          {serialProduct && (
            <Stack spacing={1.5} sx={{ pt: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, ...NUM }}>
                {t("retail.stockIn.serialsProgress", {
                  have: lines.get(serialProduct.product_id)?.serials.length ?? 0,
                  need: computedMap.get(serialProduct.product_id)?.baseQty ?? 0,
                })}
              </Typography>
              {serialError && <Alert severity="warning">{serialError}</Alert>}
              <TextField
                autoFocus
                size="small"
                fullWidth
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder={t("retail.stockIn.scanSerialHint")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && serialInput.trim()) {
                    e.preventDefault();
                    addSerial(serialInput);
                  }
                }}
                slotProps={{
                  htmlInput: { "aria-label": t("retail.stockIn.scanSerialHint"), style: NUM },
                  input: {
                    endAdornment: serialInput.trim() ? (
                      <IconButton size="small" onClick={() => addSerial(serialInput)} aria-label={t("common.add")}>
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    ) : undefined,
                  },
                }}
              />
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                {(lines.get(serialProduct.product_id)?.serials ?? []).map((s) => (
                  <Chip
                    key={s}
                    size="small"
                    label={s}
                    onDelete={() => {
                      const cur = lines.get(serialProduct.product_id)?.serials ?? [];
                      setLinePatch(serialProduct.product_id, { serials: cur.filter((x) => x !== s) });
                    }}
                    sx={NUM}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSerialProduct(null)}>{t("retail.stockIn.done")}</Button>
        </DialogActions>
      </Dialog>

      {/* Post confirm summary dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("retail.stockIn.confirmTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Typography variant="body2">
              {t("retail.stockIn.supplier")}: <strong>{supplier}</strong>
              {supplierRef ? ` · ${supplierRef}` : ""}
            </Typography>
            <Typography variant="body2" sx={NUM}>
              {activeWarehouse?.location_name ?? ""} · {dateStr} · {t("retail.stockIn.linesCount", { count: summary.lineCount })}
            </Typography>
            {canCost && (summary.missingCostCount > 0 || summary.driftCount > 0) && (
              <Alert severity="warning" icon={<WarningAmberOutlinedIcon />}>
                {[
                  summary.missingCostCount > 0 ? t("retail.stockIn.missingCostCount", { count: summary.missingCostCount }) : "",
                  summary.driftCount > 0 ? t("retail.stockIn.driftCount", { count: summary.driftCount }) : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Alert>
            )}
            <Divider />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t("retail.stock.colName")}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {t("retail.stockIn.qtyRow")}
                  </TableCell>
                  {canCost && (
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t("retail.stockIn.newAvg")}
                    </TableCell>
                  )}
                  {canCost && (
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {t("retail.stockIn.lineTotal")}
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.lines.map((l) => (
                  <TableRow key={l.product.product_id}>
                    <TableCell>{l.product.name}</TableCell>
                    <TableCell align="right" sx={NUM}>
                      {formatQty(l.qty)} {l.unitName}
                    </TableCell>
                    {canCost && (
                      <TableCell align="right" sx={NUM}>
                        {l.newAvgCost != null ? formatRs(l.newAvgCost) : "—"}
                      </TableCell>
                    )}
                    {canCost && (
                      <TableCell align="right" sx={NUM}>
                        {formatRs(fromCents(l.lineValueCents + l.deliveryShareCents))}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {canCost && (
              <Box sx={{ textAlign: "right" }}>
                {summary.deliveryCents > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", ...NUM }}>
                    {t("retail.stockIn.deliveryCharge")}: {formatRs(fromCents(summary.deliveryCents))}
                  </Typography>
                )}
                <Typography variant="subtitle1" sx={{ fontWeight: 800, ...NUM }}>
                  {t("retail.stockIn.totalCost")}: {formatRs(fromCents(summary.grandTotalCents))}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" disabled={busy} onClick={() => void handleConfirmPost()}>
            {t("retail.stockIn.confirmPost")}
          </Button>
        </DialogActions>
      </Dialog>
    </Overlay>
  );
}

export default StockInOverlay;
