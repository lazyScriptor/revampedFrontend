import { useMemo, useRef, useState } from "react";
import { Alert, Avatar, Box, Button, Chip, IconButton, InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import { useTranslation } from "react-i18next";
import { Overlay, useOverlay, type OverlayComponentProps } from "@/components/overlay";
import { useToast } from "@/components/ui/AppToast";
import { tk } from "@/i18n/marker";
import { useInvoiceDetails } from "@/features/invoices/hooks/useInvoiceHooks";
import { PaymentMethodChips } from "@/features/invoices/components/PaymentMethodChips";
import { normalizeSaleLines } from "../api/pos.api";
import { errorMessage } from "../api/http";
import { useApproval } from "../approval/useApproval";
import { useRetailCatalog } from "../catalog/useRetailCatalog";
import { formatQty, formatRs } from "../format";
import { needsReturnApproval } from "./returns.api";
import {
  RETURN_REASONS,
  buildReturnPayload,
  buildRows,
  fromCents,
  isDecimalLine,
  isSerialLine,
  refundCapCents,
  returnedOfLabel,
  roundQty,
  rowBaseQty,
  rowMax,
  settlementRules,
  summariseRows,
  type ReturnReason,
  type ReturnRow,
  type SettlementMode,
} from "./returnsModel";
import { useSaleReturn } from "./useSaleReturn";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

const REASON_LABEL: Record<ReturnReason, string> = {
  wrongItem: tk("retail.returns.reason_wrongItem"),
  notNeeded: tk("retail.returns.reason_notNeeded"),
  damaged: tk("retail.returns.reason_damaged"),
  other: tk("retail.returns.reason_other"),
};

const newKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `ret-${Date.now()}-${Math.random().toString(16).slice(2)}`;

interface Props extends OverlayComponentProps {
  invoiceId: number;
  /** The bill as the page already has it; the overlay refreshes it. */
  invoice?: any;
  /** The line the cashier tapped "Return" on: starts at 1. */
  saleLineId?: number | null;
}

/** Return sold items from their bill (plan §5.4): pick quantities and condition, then refund or keep on the bill. */
function ReturnOverlay({ invoiceId, invoice: initialInvoice, saleLineId }: Props) {
  const { t } = useTranslation();
  const overlay = useOverlay();
  const toast = useToast();
  const { request } = useApproval();
  const { index } = useRetailCatalog();
  const detail = useInvoiceDetails(invoiceId);
  const invoice = detail.data ?? initialInvoice ?? null;
  const mutation = useSaleReturn(invoiceId);
  const idempotencyKey = useRef(newKey());

  const lines = useMemo(() => normalizeSaleLines(invoice), [invoice]);
  const [edits, setEdits] = useState<Record<string, Partial<Pick<ReturnRow, "qty" | "unit" | "condition" | "serial">>>>({});
  const baseRows = useMemo(() => buildRows(lines, saleLineId), [lines, saleLineId]);
  const rows: ReturnRow[] = useMemo(() => baseRows.map((r) => ({ ...r, ...(edits[r.key] ?? {}) })), [baseRows, edits]);
  const patch = (key: string, p: Partial<ReturnRow>) => setEdits((e) => ({ ...e, [key]: { ...e[key], ...p } }));

  const rules = settlementRules(invoice);
  const summary = summariseRows(rows);
  const cap = refundCapCents(invoice, summary.valueCents);
  const defaultRefund = Math.min(summary.valueCents, cap);
  const [modeChoice, setModeChoice] = useState<SettlementMode | null>(null);
  const mode: SettlementMode = rules.creditDisabled || !rules.showCredit ? "refund" : (modeChoice ?? (cap > 0 ? "refund" : "credit"));
  const [method, setMethod] = useState("Cash");
  const [amountStr, setAmountStr] = useState<string | null>(null);
  const [reason, setReason] = useState<ReturnReason | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountCents = rules.amountFixed ? summary.valueCents : amountStr == null ? defaultRefund : Math.round((Number(amountStr) || 0) * 100);
  const amountTooHigh = mode === "refund" && !rules.amountFixed && amountCents > cap;
  const serialMissing = rows.some((r) => r.qty > 0 && isSerialLine(r.line) && !r.serial.trim());
  const canSubmit = summary.items > 0 && !mutation.isPending && !amountTooHigh && !serialMissing && !!invoice && !invoice.is_deleted && (mode === "credit" || amountCents > 0);

  const submit = async () => {
    setError(null);
    const amount = mode === "refund" && !rules.amountFixed && amountStr != null ? fromCents(amountCents) : null;
    const build = (token?: string | null) =>
      buildReturnPayload({ rows, mode, method, amount, reason: reason ? t(REASON_LABEL[reason]) : null, approvalToken: token });
    const send = (token?: string | null) => mutation.mutateAsync({ input: build(token), idempotencyKey: idempotencyKey.current });
    try {
      let res;
      try {
        res = await send();
      } catch (err: any) {
        if (!needsReturnApproval(err)) throw err;
        const grant = await request({
          type: "return_no_bill",
          summary: t("retail.returns.approvalSummary", { bill: `INV-${invoiceId}`, amount: formatRs(fromCents(summary.valueCents)) }),
          context: { invoice_id: invoiceId, sale_line_ids: [...new Set(rows.filter((r) => r.qty > 0).map((r) => r.line.sale_line_id))], value: fromCents(summary.valueCents) },
          amount_impact: fromCents(summary.valueCents),
        });
        if (!grant) {
          setError(errorMessage(err, t("retail.returns.failed")));
          return;
        }
        res = await send(grant.approval_token);
      }
      const refunded = res.settlement.refunded;
      toast.showSuccess(refunded > 0 ? t("retail.returns.doneRefund", { amount: formatRs(refunded) }) : t("retail.returns.doneKept", { amount: formatRs(fromCents(summary.valueCents)) }));
      await overlay.closeAll();
    } catch (err: any) {
      setError(errorMessage(err, t("retail.returns.failed")));
    }
  };

  const footer = (
    <Stack spacing={1}>
      <Box data-testid="return-summary" sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", px: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {summary.items > 0 ? t("retail.returns.summary", { count: summary.items }) : t("retail.returns.nothing")}
        </Typography>
        <Typography sx={{ fontWeight: 900, fontSize: "1.15rem", ...NUM }}>{formatRs(fromCents(summary.valueCents))}</Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
        <Button onClick={() => void overlay.close()} sx={{ minHeight: 44 }}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" disableElevation startIcon={<AssignmentReturnOutlinedIcon />} disabled={!canSubmit} onClick={() => void submit()} sx={{ minHeight: 44, minWidth: 150, fontWeight: 800 }}>
          {mode === "refund" ? t("retail.returns.returnRefund") : t("retail.returns.returnOnly")}
        </Button>
      </Stack>
    </Stack>
  );

  return (
    <Overlay title={t("retail.returns.title", { bill: `INV-${invoiceId}` })} width={520} onConfirm={canSubmit ? () => void submit() : undefined} footer={footer}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {invoice?.is_deleted && <Alert severity="warning">{t("retail.returns.deleted")}</Alert>}
        {invoice && rows.length === 0 && <Alert severity="info">{t("retail.returns.nothingToReturn")}</Alert>}

        <Stack spacing={1} data-testid="return-rows">
          {rows.map((row) => {
            const { line } = row;
            const max = rowMax(rows, row);
            const decimal = isDecimalLine(line);
            const serial = isSerialLine(line);
            const picture = line.product_id ? index.byId.get(line.product_id)?.image_url : null;
            const done = returnedOfLabel(line);
            return (
              <Box key={row.key} data-testid="return-row" sx={{ p: 1, borderRadius: 2, border: 1, borderColor: row.qty > 0 ? "primary.main" : "divider" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Avatar variant="rounded" src={picture ?? undefined} sx={{ width: 36, height: 36, bgcolor: "action.hover", color: "text.secondary" }}>
                    <Inventory2OutlinedIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                      {line.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={NUM}>
                      {t("retail.returns.sold", { qty: formatQty(line.qty), unit: line.unit_label })}
                      {done ? ` · ${t("retail.returns.alreadyReturned", { qty: formatQty(done.returned) })}` : ""}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
                    <IconButton size="small" aria-label={t("retail.returns.less")} disabled={row.qty <= 0} onClick={() => patch(row.key, { qty: Math.max(0, roundQty(row.qty - 1)) })} sx={{ width: 36, height: 36 }}>
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      size="small"
                      value={row.qty}
                      onChange={(e) => {
                        const v = Number(e.target.value.replace(/[^0-9.]/g, ""));
                        patch(row.key, { qty: Number.isFinite(v) ? Math.min(max, decimal ? roundQty(v) : Math.floor(v)) : 0 });
                      }}
                      slotProps={{ htmlInput: { inputMode: decimal ? "decimal" : "numeric", "aria-label": t("retail.returns.qtyOf", { name: line.description }), style: { width: 48, textAlign: "center", fontWeight: 800, ...NUM } } }}
                    />
                    <IconButton size="small" aria-label={t("retail.returns.more")} disabled={row.qty >= max} onClick={() => patch(row.key, { qty: Math.min(max, roundQty(row.qty + 1)) })} sx={{ width: 36, height: 36 }}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 0.75, alignItems: "center", flexWrap: "wrap" }}>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={row.condition}
                    onChange={(_, v) => v && patch(row.key, { condition: v })}
                    aria-label={t("retail.returns.condition")}
                  >
                    <ToggleButton value="good" sx={{ px: 1, fontWeight: 700, minHeight: 32 }}>
                      <CheckCircleOutlined sx={{ fontSize: 16, mr: 0.5 }} />
                      {t("retail.returns.good")}
                    </ToggleButton>
                    <ToggleButton value="damaged" color="error" sx={{ px: 1, fontWeight: 700, minHeight: 32 }}>
                      <BrokenImageOutlinedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      {t("retail.returns.damagedBtn")}
                    </ToggleButton>
                  </ToggleButtonGroup>
                  {line.unit_factor > 1 && !serial && (
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={row.unit.factor > 1 ? "pack" : "piece"}
                      onChange={(_, v) => {
                        if (!v) return;
                        const opts = [
                          { unitId: line.unit_id ?? null, label: line.unit_label, factor: line.unit_factor },
                          { unitId: null, label: line.base_unit, factor: 1 },
                        ];
                        const unit = v === "pack" ? opts[0] : opts[1];
                        patch(row.key, { unit, qty: 0 });
                      }}
                      aria-label={t("retail.returns.unit")}
                    >
                      <ToggleButton value="pack" sx={{ px: 1, minHeight: 32, fontWeight: 700 }}>
                        {line.unit_label}
                      </ToggleButton>
                      <ToggleButton value="piece" sx={{ px: 1, minHeight: 32, fontWeight: 700 }}>
                        {line.base_unit}
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
                  {serial && (
                    <TextField
                      size="small"
                      label={t("retail.returns.serial")}
                      value={row.serial}
                      onChange={(e) => patch(row.key, { serial: e.target.value })}
                      slotProps={{ htmlInput: { "aria-label": t("retail.returns.serial"), style: { fontFamily: "'JetBrains Mono', monospace", ...NUM } } }}
                      sx={{ flex: 1, minWidth: 140 }}
                    />
                  )}
                  {row.qty > 0 && (
                    <Chip size="small" variant="outlined" label={`${formatQty(rowBaseQty(row))} ${line.base_unit}`} sx={{ ...NUM, fontWeight: 700 }} />
                  )}
                </Stack>
              </Box>
            );
          })}
        </Stack>

        {/* Settlement */}
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, display: "block", mb: 0.5 }}>
            {t("retail.returns.settle")}
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={mode}
            onChange={(_, v) => v && setModeChoice(v)}
            aria-label={t("retail.returns.settle")}
          >
            <ToggleButton value="refund" sx={{ fontWeight: 700, minHeight: 40 }}>
              {t("retail.returns.refund")}
            </ToggleButton>
            {rules.showCredit && (
              <Tooltip title={rules.creditDisabled ? t("retail.returns.closedHint") : ""}>
                <span style={{ display: "flex", flex: 1 }}>
                  <ToggleButton value="credit" disabled={rules.creditDisabled} sx={{ fontWeight: 700, minHeight: 40, flex: 1 }}>
                    {t("retail.returns.keepOnBill")}
                  </ToggleButton>
                </span>
              </Tooltip>
            )}
          </ToggleButtonGroup>

          {mode === "refund" && (
            <Stack spacing={1} sx={{ mt: 1.25 }}>
              <PaymentMethodChips value={method} onChange={setMethod} label={t("retail.returns.method")} />
              <TextField
                size="small"
                fullWidth
                label={t("retail.returns.amount")}
                value={rules.amountFixed ? String(fromCents(summary.valueCents)) : (amountStr ?? String(fromCents(defaultRefund)))}
                disabled={rules.amountFixed}
                error={amountTooHigh}
                helperText={amountTooHigh ? t("retail.returns.capHint", { amount: formatRs(fromCents(cap)) }) : rules.amountFixed ? t("retail.returns.fixedHint") : undefined}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))}
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">Rs.</InputAdornment> },
                  htmlInput: { inputMode: "decimal", "aria-label": t("retail.returns.amount"), style: { fontWeight: 800, ...NUM } },
                }}
              />
            </Stack>
          )}
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, display: "block", mb: 0.5 }}>
            {t("retail.returns.reason")}
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
            {RETURN_REASONS.map((r) => (
              <Chip
                key={r}
                clickable
                label={t(REASON_LABEL[r])}
                color={reason === r ? "primary" : "default"}
                variant={reason === r ? "filled" : "outlined"}
                onClick={() => setReason(reason === r ? null : r)}
                sx={{ minHeight: 36, fontWeight: 700 }}
              />
            ))}
          </Stack>
        </Box>
      </Box>
    </Overlay>
  );
}

export default ReturnOverlay;
