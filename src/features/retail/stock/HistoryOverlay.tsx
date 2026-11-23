import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Overlay, useOverlay, type OverlayComponentProps } from "@/components/overlay";
import { api } from "@/lib/api";
import { tk } from "@/i18n/marker";
import { errorMessage, unwrapData } from "../api/http";
import { fetchStockDocument, fetchStockDocuments, fetchStockMovements } from "../api/stock.api";
import type { StockDocStatus, StockDocType, StockMovementType } from "../api/stock.types";
import { STOCK_IN_OVERLAY_ID } from "../catalog/overlayIds";
import { useRetailCatalog, useRetailPermissions } from "../catalog/useRetailCatalog";
import { ItemFinder } from "../finder/ItemFinder";
import { formatQty, formatRs, formatSignedQty } from "../format";
import { StockInSlip } from "./StockInSlip";
import { useStockLevels } from "./useStockLevels";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

const MOVEMENT_TYPE_FILTERS: Array<StockMovementType | ""> = [
  "",
  "RECEIVE",
  "ADJUST_IN",
  "ADJUST_OUT",
  "COUNT_IN",
  "COUNT_OUT",
  "OPENING",
  "SALE",
  "SALE_RETURN",
];

const DOC_TYPES: Array<{ value: StockDocType | ""; label: string }> = [
  { value: "", label: tk("retail.stock.viewAll") },
  { value: "receive", label: tk("retail.history.doc_receive") },
  { value: "adjust", label: tk("retail.history.doc_adjust") },
  { value: "count", label: tk("retail.history.doc_count") },
  { value: "opening", label: tk("retail.history.doc_opening") },
];

const DOC_STATUSES: Array<{ value: StockDocStatus | ""; label: string }> = [
  { value: "", label: tk("retail.stock.viewAll") },
  { value: "posted", label: tk("retail.history.status_posted") },
  { value: "draft", label: tk("retail.history.status_draft") },
];

const POSITIVE_TYPES = new Set<StockMovementType>(["OPENING", "RECEIVE", "ADJUST_IN", "COUNT_IN", "SALE_RETURN", "SALE_VOID", "TRANSFER_IN"]);

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

interface Props extends OverlayComponentProps {
  initialTab?: "movements" | "documents";
  initialProductId?: number | null;
  initialDocId?: number | null;
  warehouseId?: number | null;
}

/**
 * Stock history & documents overlay (plan §7.5):
 * - Movements tab with item, location, type chips, user and date filters + document links
 * - Documents tab listing receive / adjust / count / opening documents with line detail view
 */
function HistoryOverlay({ initialTab = "movements", initialProductId = null, initialDocId = null, warehouseId: initialWhId = null }: Props) {
  const { t } = useTranslation();
  const overlay = useOverlay();
  const { canCost, canReceive } = useRetailPermissions();
  const { index } = useRetailCatalog();
  const levels = useStockLevels(initialWhId);

  const [tab, setTab] = useState<"movements" | "documents">(initialTab);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(initialDocId);

  // Movements filters
  const [productId, setProductId] = useState<number | null>(initialProductId);
  const [pickItemOpen, setPickItemOpen] = useState(false);
  const [whFilter, setWhFilter] = useState<string>(initialWhId != null ? String(initialWhId) : "");
  const [typeFilter, setTypeFilter] = useState<StockMovementType | "">("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [movPage, setMovPage] = useState(1);

  // Documents filters
  const [docType, setDocType] = useState<StockDocType | "">("");
  const [docStatus, setDocStatus] = useState<StockDocStatus | "">("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [docFrom, setDocFrom] = useState("");
  const [docTo, setDocTo] = useState("");
  const [docPage, setDocPage] = useState(1);

  const usersQ = useQuery({
    queryKey: ["retail", "history", "users"],
    queryFn: async () => {
      try {
        const d = unwrapData<any>(await api.get("/users", { params: { showInactive: false } }));
        const list = Array.isArray(d) ? d : (d?.users ?? []);
        return list as Array<{ user_id: number; first_name?: string; last_name?: string; username?: string }>;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60_000,
  });

  const movementsQ = useQuery({
    queryKey: ["retail", "stock", "movements", { productId, whFilter, typeFilter, userFilter, fromDate, toDate, movPage }],
    queryFn: () =>
      fetchStockMovements({
        product_id: productId ?? undefined,
        warehouse_id: whFilter ? Number(whFilter) : undefined,
        type: typeFilter || undefined,
        user_id: userFilter ? Number(userFilter) : undefined,
        from: fromDate || undefined,
        to: toDate ? `${toDate}T23:59:59` : undefined,
        page: movPage,
        limit: 30,
      }),
    enabled: selectedDocId == null && tab === "movements",
  });

  const documentsQ = useQuery({
    queryKey: ["retail", "stock", "documents", { docType, docStatus, supplierFilter, docFrom, docTo, docPage }],
    queryFn: () =>
      fetchStockDocuments({
        type: docType || undefined,
        status: docStatus || undefined,
        supplier: supplierFilter.trim() || undefined,
        from: docFrom || undefined,
        to: docTo ? `${docTo}T23:59:59` : undefined,
        page: docPage,
        limit: 25,
      }),
    enabled: selectedDocId == null && tab === "documents",
  });

  const docDetailQ = useQuery({
    queryKey: ["retail", "stock", "document", selectedDocId],
    queryFn: () => fetchStockDocument(selectedDocId as number),
    enabled: selectedDocId != null,
  });

  const filterProduct = productId != null ? index.byId.get(productId) : null;
  const userOptions = useMemo(
    () =>
      (usersQ.data ?? []).map((u) => ({
        id: u.user_id,
        name: [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.username || `#${u.user_id}`,
      })),
    [usersQ.data],
  );

  const handlePrintDoc = () => {
    if (typeof document === "undefined") return;
    document.body.classList.add("retail-printing");
    try {
      window.print();
    } finally {
      setTimeout(() => document.body.classList.remove("retail-printing"), 300);
    }
  };

  return (
    <Overlay title={t("retail.history.title")} width="min(1040px, 96vw)">
      {selectedDocId != null ? (
        <Stack spacing={1.5} data-testid="doc-detail">
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => setSelectedDocId(null)}>
              {t("common.back")}
            </Button>
            {docDetailQ.data && (
              <Stack direction="row" spacing={1}>
                {docDetailQ.data.doc_type === "receive" && docDetailQ.data.status === "draft" && canReceive && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={async () => {
                      const id = docDetailQ.data!.doc_id;
                      await overlay.close();
                      overlay.open(STOCK_IN_OVERLAY_ID, { draftId: id });
                    }}
                  >
                    {t("retail.history.resumeDraft")}
                  </Button>
                )}
                {docDetailQ.data.doc_type === "receive" && docDetailQ.data.status === "posted" && (
                  <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={handlePrintDoc}>
                    {t("retail.stockIn.printSlip")}
                  </Button>
                )}
              </Stack>
            )}
          </Stack>

          {docDetailQ.isLoading ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : docDetailQ.isError || !docDetailQ.data ? (
            <Alert severity="error">{errorMessage(docDetailQ.error, t("retail.stock.loadFailed"))}</Alert>
          ) : (
            <>
              <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", mb: 0.75 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <ReceiptLongOutlinedIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 800, ...NUM }}>
                      {docDetailQ.data.doc_no}
                    </Typography>
                    <Chip
                      size="small"
                      color={docDetailQ.data.status === "posted" ? "success" : "warning"}
                      label={t(`retail.history.status_${docDetailQ.data.status}`, { defaultValue: docDetailQ.data.status })}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={NUM}>
                    {fmtDateTime(docDetailQ.data.occurred_at)}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {[
                    t(`retail.history.doc_${docDetailQ.data.doc_type}`, { defaultValue: docDetailQ.data.doc_type }),
                    docDetailQ.data.location_name,
                    docDetailQ.data.supplier_name,
                    docDetailQ.data.supplier_ref,
                    docDetailQ.data.reason ? t(`retail.correct.reason_${docDetailQ.data.reason}`, { defaultValue: docDetailQ.data.reason }) : null,
                    docDetailQ.data.user_name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
                {docDetailQ.data.note && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {docDetailQ.data.note}
                  </Typography>
                )}
                {canCost && docDetailQ.data.total_cost != null && docDetailQ.data.total_cost > 0 && (
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700, ...NUM }}>
                    {t("retail.stockIn.totalCost")}: {formatRs(docDetailQ.data.total_cost)}
                    {docDetailQ.data.delivery_charge ? ` (${t("retail.stockIn.deliveryCharge")}: ${formatRs(docDetailQ.data.delivery_charge)})` : ""}
                  </Typography>
                )}
              </Box>

              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>{t("retail.stock.colName")}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {t("retail.stockIn.qtyRow")}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {t("retail.stockIn.baseQty")}
                      </TableCell>
                      {canCost && (
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {t("retail.stockIn.costLabel")}
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {docDetailQ.data.lines.map((l, idx) => (
                      <TableRow key={l.line_id ?? idx}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {l.product_name ?? `#${l.product_id}`}
                          </Typography>
                          {l.serials && l.serials.length > 0 && (
                            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
                              {l.serials.map((s) => (
                                <Chip key={s} size="small" label={s} sx={{ height: 22, ...NUM }} />
                              ))}
                            </Stack>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={NUM}>
                          {formatQty(l.qty)} {l.unit_name ?? l.base_unit ?? ""}
                        </TableCell>
                        <TableCell align="right" sx={NUM}>
                          {formatQty(l.base_qty)} {l.base_unit ?? ""}
                        </TableCell>
                        {canCost && (
                          <TableCell align="right" sx={NUM}>
                            {l.unit_cost != null ? formatRs(l.unit_cost) : l.entered_unit_cost != null ? formatRs(l.entered_unit_cost) : "—"}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              {docDetailQ.data.serials && docDetailQ.data.serials.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: "block", mb: 0.5 }}>
                    {t("retail.stockIn.serialsTitle")}
                  </Typography>
                  <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                    {docDetailQ.data.serials.map((s) => (
                      <Chip key={s.serial_no} size="small" label={s.serial_no} sx={NUM} />
                    ))}
                  </Stack>
                </Box>
              )}
              <StockInSlip doc={docDetailQ.data} canCost={canCost} />
            </>
          )}
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ borderBottom: 1, borderColor: "divider", minHeight: 40 }}
          >
            <Tab value="movements" label={t("retail.history.tabMovements")} sx={{ minHeight: 40, textTransform: "none", fontWeight: 700 }} />
            <Tab value="documents" label={t("retail.history.tabDocuments")} sx={{ minHeight: 40, textTransform: "none", fontWeight: 700 }} />
          </Tabs>

          {tab === "movements" ? (
            <Stack spacing={1.25}>
              {/* Filters */}
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                {filterProduct ? (
                  <Chip
                    size="small"
                    color="primary"
                    label={filterProduct.name}
                    onDelete={() => {
                      setProductId(null);
                      setMovPage(1);
                    }}
                  />
                ) : productId != null ? (
                  <Chip
                    size="small"
                    color="primary"
                    label={`#${productId}`}
                    onDelete={() => {
                      setProductId(null);
                      setMovPage(1);
                    }}
                  />
                ) : (
                  <Button size="small" variant="outlined" startIcon={<FilterAltOutlinedIcon />} onClick={() => setPickItemOpen(true)}>
                    {t("retail.history.filterItem")}
                  </Button>
                )}

                {levels.warehouses.length > 1 && (
                  <TextField
                    select
                    size="small"
                    label={t("retail.stock.location")}
                    value={whFilter}
                    onChange={(e) => {
                      setWhFilter(e.target.value);
                      setMovPage(1);
                    }}
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value="">{t("retail.stock.viewAll")}</MenuItem>
                    {levels.warehouses.map((w) => (
                      <MenuItem key={w.warehouse_id} value={String(w.warehouse_id)}>
                        {w.location_name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                {userOptions.length > 0 && (
                  <TextField
                    select
                    size="small"
                    label={t("retail.history.user")}
                    value={userFilter}
                    onChange={(e) => {
                      setUserFilter(e.target.value);
                      setMovPage(1);
                    }}
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="">{t("retail.stock.viewAll")}</MenuItem>
                    {userOptions.map((u) => (
                      <MenuItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                <TextField
                  size="small"
                  type="date"
                  label={t("retail.history.from")}
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setMovPage(1);
                  }}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { style: NUM, "aria-label": t("retail.history.from") } }}
                  sx={{ width: 145 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label={t("retail.history.to")}
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setMovPage(1);
                  }}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { style: NUM, "aria-label": t("retail.history.to") } }}
                  sx={{ width: 145 }}
                />
              </Stack>

              <Stack direction="row" spacing={0.5} sx={{ flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: "auto" }}>
                {MOVEMENT_TYPE_FILTERS.map((mt) => (
                  <Chip
                    key={mt || "all"}
                    size="small"
                    clickable
                    label={mt ? t(`retail.history.type_${mt}`, { defaultValue: mt }) : t("retail.stock.viewAll")}
                    color={typeFilter === mt ? "primary" : "default"}
                    variant={typeFilter === mt ? "filled" : "outlined"}
                    onClick={() => {
                      setTypeFilter(mt);
                      setMovPage(1);
                    }}
                    sx={{ flexShrink: 0 }}
                  />
                ))}
              </Stack>

              {movementsQ.isLoading ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              ) : movementsQ.isError ? (
                <Alert severity="error">{errorMessage(movementsQ.error, t("retail.stock.loadFailed"))}</Alert>
              ) : (movementsQ.data?.movements.length ?? 0) === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                  {t("retail.history.empty")}
                </Typography>
              ) : (
                <>
                  <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 740 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>{t("retail.history.colType")}</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{t("retail.stock.colName")}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            {t("retail.history.colChange")}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            {t("retail.history.colAfter")}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{t("retail.history.user")}</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{t("retail.history.colTime")}</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{t("retail.history.colDoc")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {movementsQ.data!.movements.map((m) => {
                          const positive = POSITIVE_TYPES.has(m.type) || m.qty_change > 0;
                          return (
                            <TableRow key={m.movement_id} data-testid="movement-row">
                              <TableCell>
                                <Chip
                                  size="small"
                                  icon={positive ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                                  color={positive ? "success" : "error"}
                                  variant="outlined"
                                  label={t(`retail.history.type_${m.type}`, { defaultValue: m.type })}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {m.product_name ?? `#${m.product_id}`}
                                </Typography>
                                {m.reason && (
                                  <Typography variant="caption" color="text.secondary">
                                    {t(`retail.correct.reason_${m.reason}`, { defaultValue: m.reason })}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 800, color: positive ? "success.main" : "error.main", ...NUM }}>
                                {formatSignedQty(m.qty_change)} {m.base_unit ?? ""}
                              </TableCell>
                              <TableCell align="right" sx={NUM}>
                                {formatQty(m.qty_after)} {m.base_unit ?? ""}
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">{m.user_name ?? "—"}</Typography>
                              </TableCell>
                              <TableCell sx={NUM}>
                                <Typography variant="caption" color="text.secondary">
                                  {fmtDateTime(m.occurred_at)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {m.doc_id && m.doc_no ? (
                                  <Chip
                                    size="small"
                                    clickable
                                    variant="outlined"
                                    label={m.doc_no}
                                    onClick={() => setSelectedDocId(m.doc_id!)}
                                    sx={NUM}
                                  />
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                  {movementsQ.data!.total > movementsQ.data!.limit && (
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", alignItems: "center" }}>
                      <Button size="small" disabled={movPage <= 1} onClick={() => setMovPage((p) => p - 1)}>
                        {t("common.previous")}
                      </Button>
                      <Typography variant="caption" sx={NUM}>
                        {movPage} / {Math.ceil(movementsQ.data!.total / movementsQ.data!.limit)}
                      </Typography>
                      <Button
                        size="small"
                        disabled={movPage * movementsQ.data!.limit >= movementsQ.data!.total}
                        onClick={() => setMovPage((p) => p + 1)}
                      >
                        {t("common.next")}
                      </Button>
                    </Stack>
                  )}
                </>
              )}
            </Stack>
          ) : (
            <Stack spacing={1.25}>
              {/* Documents filters */}
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
                <TextField
                  size="small"
                  label={t("retail.stockIn.supplier")}
                  value={supplierFilter}
                  onChange={(e) => {
                    setSupplierFilter(e.target.value);
                    setDocPage(1);
                  }}
                  sx={{ minWidth: 160 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label={t("retail.history.from")}
                  value={docFrom}
                  onChange={(e) => {
                    setDocFrom(e.target.value);
                    setDocPage(1);
                  }}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { style: NUM } }}
                  sx={{ width: 145 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label={t("retail.history.to")}
                  value={docTo}
                  onChange={(e) => {
                    setDocTo(e.target.value);
                    setDocPage(1);
                  }}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { style: NUM } }}
                  sx={{ width: 145 }}
                />
              </Stack>

              <Stack direction="row" spacing={0.5} sx={{ flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: "auto" }}>
                {DOC_TYPES.map((dt) => (
                  <Chip
                    key={dt.value || "all"}
                    size="small"
                    clickable
                    label={t(dt.label)}
                    color={docType === dt.value ? "primary" : "default"}
                    variant={docType === dt.value ? "filled" : "outlined"}
                    onClick={() => {
                      setDocType(dt.value);
                      setDocPage(1);
                    }}
                    sx={{ flexShrink: 0 }}
                  />
                ))}
                {DOC_STATUSES.map((ds) => (
                  <Chip
                    key={`st-${ds.value || "all"}`}
                    size="small"
                    clickable
                    label={t(ds.label)}
                    color={docStatus === ds.value ? "secondary" : "default"}
                    variant={docStatus === ds.value ? "filled" : "outlined"}
                    onClick={() => {
                      setDocStatus(ds.value);
                      setDocPage(1);
                    }}
                    sx={{ flexShrink: 0 }}
                  />
                ))}
              </Stack>

              {documentsQ.isLoading ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              ) : documentsQ.isError ? (
                <Alert severity="error">{errorMessage(documentsQ.error, t("retail.stock.loadFailed"))}</Alert>
              ) : (documentsQ.data?.documents.length ?? 0) === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                  {t("retail.history.noDocuments")}
                </Typography>
              ) : (
                <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflowX: "auto" }}>
                  <Table size="small" sx={{ minWidth: 680 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>{t("retail.history.colDoc")}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{t("retail.history.colType")}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{t("retail.history.colStatus")}</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{t("retail.history.colDetails")}</TableCell>
                        {canCost && (
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            {t("retail.stockIn.totalCost")}
                          </TableCell>
                        )}
                        <TableCell sx={{ fontWeight: 800 }}>{t("retail.history.colTime")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {documentsQ.data!.documents.map((d) => (
                        <TableRow
                          key={d.doc_id}
                          hover
                          data-testid="document-row"
                          onClick={() => setSelectedDocId(d.doc_id)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell sx={{ fontWeight: 800, ...NUM }}>{d.doc_no}</TableCell>
                          <TableCell>{t(`retail.history.doc_${d.doc_type}`, { defaultValue: d.doc_type })}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={d.status === "posted" ? "success" : "warning"}
                              variant="outlined"
                              label={t(`retail.history.status_${d.status}`, { defaultValue: d.status })}
                            />
                          </TableCell>
                          <TableCell>
                            {[d.supplier_name, d.reason ? t(`retail.correct.reason_${d.reason}`, { defaultValue: d.reason }) : null, d.location_name, d.user_name]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </TableCell>
                          {canCost && (
                            <TableCell align="right" sx={NUM}>
                              {d.total_cost != null && d.total_cost > 0 ? formatRs(d.total_cost) : "—"}
                            </TableCell>
                          )}
                          <TableCell sx={NUM}>{fmtDateTime(d.occurred_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Stack>
          )}
        </Stack>
      )}

      {/* Item filter picker dialog */}
      <Dialog open={pickItemOpen} onClose={() => setPickItemOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("retail.history.filterItem")}</DialogTitle>
        <DialogContent>
          <ItemFinder
            mode="pick"
            allowCreate={false}
            onPick={(p) => {
              setProductId(p.product_id);
              setMovPage(1);
              setPickItemOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </Overlay>
  );
}

export default HistoryOverlay;
