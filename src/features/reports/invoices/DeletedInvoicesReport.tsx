import { useState } from "react";
import { Alert, Box, Button, Chip, FormControlLabel, Switch, TextField, Typography, useTheme } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import RestoreFromTrashOutlinedIcon from "@mui/icons-material/RestoreFromTrashOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { useTranslation } from "react-i18next";
import { ReportShell } from "@/components/reports/ReportShell";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { Can } from "@/components/auth/Can";
import { useToast } from "@/components/ui/AppToast";
import { formatDisplayDate } from "@/lib/dates";
import { tk } from "@/i18n/marker";
import {
  DeletedInvoiceRow,
  INVOICE_DELETE_REASONS,
  useDeletedInvoices,
  useRestoreInvoice,
} from "@/features/invoices/hooks/useInvoiceDeletionHooks";

const REASON_KEYS: Record<string, string> = {
  "Created by mistake": tk("invoices.delete.reasonMistake"),
  "Customer cancelled": tk("invoices.delete.reasonCancelled"),
  "Duplicate invoice": tk("invoices.delete.reasonDuplicate"),
  "Wrong customer or items": tk("invoices.delete.reasonWrong"),
  "Test entry": tk("invoices.delete.reasonTest"),
  Other: tk("invoices.delete.reasonOther"),
};
void INVOICE_DELETE_REASONS;

const money = (n: number) => `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DeletedInvoicesReport() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const toast = useToast();
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const { data, isLoading, isFetching, error } = useDeletedInvoices({
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
    flagged: flaggedOnly,
    search: search.trim() || undefined,
  });
  const restore = useRestoreInvoice();

  const rows = data?.invoices || [];
  const voidedTotal = rows.reduce((s, r) => s + Number(r.voided_amount || 0), 0);

  const doRestore = (row: DeletedInvoiceRow) =>
    restore.mutate(row.invoice_id, {
      onSuccess: () => toast.showSuccess(t("invoices.delete.restored", { id: row.invoice_id })),
      onError: (e: any) => toast.showError(e?.message || t("invoices.delete.restoreFailed")),
    });

  const text = isDark ? "#f8fafc" : "#0f172a";
  const sub = isDark ? "#94a3b8" : "#475569";

  const columns: GridColDef[] = [
    {
      field: "invoice_id",
      headerName: t("invoices.invoiceNumber"),
      width: 120,
      renderCell: (p) => (
        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", fontWeight: 800, fontSize: "0.82rem", color: text }}>
          INV-{p.value}
        </Typography>
      ),
    },
    {
      field: "customer",
      headerName: t("invoices.customer"),
      flex: 1,
      minWidth: 180,
      valueGetter: (_v, r: DeletedInvoiceRow) =>
        r.customer?.customer_type === "Business" && r.customer?.company_name
          ? r.customer.company_name
          : `${r.customer?.first_name || ""} ${r.customer?.last_name || ""}`.trim(),
      renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 600, color: text, whiteSpace: "normal" }}>{p.value || "-"}</Typography>,
    },
    {
      field: "total_amount",
      headerName: t("common.total"),
      width: 135,
      type: "number",
      renderCell: (p) => <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: text }}>{money(Number(p.value))}</span>,
    },
    {
      field: "voided_amount",
      headerName: t("invoices.delete.voidedMoney"),
      width: 150,
      type: "number",
      renderCell: (p) =>
        Number(p.value) > 0 ? (
          <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800, color: "#d97706" }}>{money(Number(p.value))}</span>
        ) : (
          <span style={{ color: sub }}>-</span>
        ),
    },
    {
      field: "deleted_by_name",
      headerName: t("invoices.delete.deletedBy"),
      flex: 1,
      minWidth: 190,
      renderCell: (p) => {
        const r = p.row as DeletedInvoiceRow;
        return (
          <Box sx={{ py: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: text, lineHeight: 1.2 }}>
              {r.deleted_by_name || "-"}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
              <Typography variant="caption" sx={{ color: sub }}>{r.deleted_by_role}</Typography>
              {r.delete_flagged && (
                <Chip size="small" color="warning" icon={<FlagOutlinedIcon />} label={t("invoices.delete.flagCashier")} sx={{ fontWeight: 800, height: 22 }} />
              )}
            </Box>
          </Box>
        );
      },
    },
    {
      field: "delete_reason",
      headerName: t("invoices.delete.reason"),
      flex: 1.2,
      minWidth: 220,
      renderCell: (p) => {
        const r = p.row as DeletedInvoiceRow;
        return (
          <Box sx={{ py: 0.5, whiteSpace: "normal" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: text }}>{r.delete_reason ? t(REASON_KEYS[r.delete_reason] || r.delete_reason) : "-"}</Typography>
            {r.delete_note && <Typography variant="caption" sx={{ color: sub, display: "block" }}>{r.delete_note}</Typography>}
          </Box>
        );
      },
    },
    {
      field: "deleted_at",
      headerName: t("invoices.delete.deletedOn"),
      width: 150,
      renderCell: (p) => <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.82rem", color: sub }}>{formatDisplayDate(p.value)}</span>,
    },
    {
      field: "actions",
      headerName: t("common.actions"),
      width: 130,
      sortable: false,
      renderCell: (p) => (
        <Can perform="invoice:restore">
          <Button
            size="small"
            variant="outlined"
            startIcon={<RestoreFromTrashOutlinedIcon />}
            disabled={restore.isPending}
            onClick={() => doRestore(p.row as DeletedInvoiceRow)}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("invoices.delete.restore")}
          </Button>
        </Can>
      ),
    },
  ];

  return (
    <ReportShell title={t("invoices.delete.reportTitle")} subtitle={t("invoices.delete.reportSubtitle")}>
      {error ? (
        <Alert severity="warning">{t("invoices.delete.reportNoAccess")}</Alert>
      ) : (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
            <KpiTile label={t("invoices.delete.kpiDeleted")} value={String(data?.summary.totalDeleted ?? 0)} icon={<DeleteSweepOutlinedIcon />} tone="info" loading={isLoading} />
            <KpiTile label={t("invoices.delete.kpiFlagged")} value={String(data?.summary.flaggedCount ?? 0)} icon={<FlagOutlinedIcon />} tone="warning" loading={isLoading} />
            <KpiTile label={t("invoices.delete.kpiVoided")} value={money(voidedTotal)} hint={t("invoices.delete.kpiVoidedHint")} icon={<PaymentsOutlinedIcon />} tone="error" loading={isLoading} />
          </Box>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              size="small"
              placeholder={t("invoices.delete.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPaginationModel((m) => ({ ...m, page: 0 }));
              }}
              sx={{ width: { xs: "100%", sm: 300 }, "& input": { color: text } }}
            />
            <FormControlLabel
              control={<Switch checked={flaggedOnly} onChange={(e) => { setFlaggedOnly(e.target.checked); setPaginationModel((m) => ({ ...m, page: 0 })); }} />}
              label={<Typography variant="body2" sx={{ fontWeight: 600, color: text }}>{t("invoices.delete.flaggedOnly")}</Typography>}
            />
          </Box>

          <StatTable
            rows={rows}
            columns={columns}
            loading={isLoading || isFetching}
            getRowId={(r) => r.invoice_id}
            paginationMode="server"
            rowCount={data?.total ?? 0}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[25, 50, 100]}
          />
        </>
      )}
    </ReportShell>
  );
}
