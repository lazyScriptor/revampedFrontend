import { useState } from "react";
import { Box, TextField, Typography, useTheme } from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { ReportShell } from "@/components/reports/ReportShell";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { useCashFlowReport } from "../hooks/useReportsHooks";
import { todayLocalStr } from "@/lib/dates";
import { GridColDef } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";

const formatCurrency = (n: number) =>
  `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CashFlowReport() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [date, setDate] = useState(todayLocalStr());
  const { data, isLoading, isFetching } = useCashFlowReport(date);

  const columns: GridColDef[] = [
    {
      field: "method",
      headerName: t("orders.paymentMethod"),
      flex: 1.2,
      minWidth: 150,
      renderCell: (p) => (
        <span className={`font-semibold text-sm ${isDark ? "text-slate-100" : "text-slate-900"}`}>{p.value}</span>
      ),
    },
    {
      field: "income",
      headerName: t("reports.CashFlowReport.grossInflow"),
      width: 170,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: "#10b981",
          }}
        >
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "refunds",
      headerName: t("reports.CashFlowReport.refundsOutflow"),
      width: 170,
      type: "number",
      renderCell: (p) => {
        const val = Number(p.value);
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
              color: val > 0 ? "#ef4444" : isDark ? "#64748b" : "text.secondary",
            }}
          >
            {formatCurrency(val)}
          </Typography>
        );
      },
    },
    {
      field: "net",
      headerName: t("reports.CashFlowReport.netCollected"),
      width: 170,
      type: "number",
      renderCell: (p) => {
        const val = Number(p.value);
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              fontFamily: "'JetBrains Mono', monospace",
              fontVariantNumeric: "tabular-nums",
              color: val >= 0 ? (isDark ? "#f8fafc" : "#0f172a") : "#ef4444",
            }}
          >
            {formatCurrency(val)}
          </Typography>
        );
      },
    },
    {
      field: "transaction_count",
      headerName: t("accounting.CashFlowSummary.transactions"),
      width: 130,
      type: "number",
      renderCell: (p) => (
        <span className={`tabular-nums font-mono font-medium text-xs ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          {t("reports.CashFlowReport.txns", { value: p.value })}
        </span>
      ),
    },
  ];

  const totals = data?.totals || {
    totalIncome: 0,
    totalRefunds: 0,
    totalNet: 0,
    totalTransactions: 0,
  };
  const rows = (data?.methods || []).map((m: any) => ({ ...m, id: m.method }));

  return (
    <ReportShell
      title={t("reports.CashFlowReport.dailyCashFlow")}
      subtitle={t("reports.CashFlowReport.breakdownOfReceiptsPaymentChannels")}
      filterSlot={
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            type="date"
            size="small"
            label={t("reports.CashFlowReport.selectedDate")}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{
              inputLabel: {
                shrink: true,
                sx: {
                  color: isDark ? "#94a3b8" : "#475569",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                },
              },
              input: {
                className: "tabular-nums text-sm",
              },
            }}
            sx={{
              width: { xs: "100%", sm: 200 },
              bgcolor: isDark ? "#0f172a" : "#ffffff",
              borderRadius: 2,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#cbd5e1",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#f59e0b",
              },
              "& .MuiInputBase-input": {
                color: isDark ? "#f8fafc" : "#0f172a",
                fontFamily: "'JetBrains Mono', monospace",
              },
            }}
          />
        </Box>
      }
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        <KpiTile
          label={t("reports.CashFlowReport.totalInflow")}
          value={formatCurrency(totals.totalIncome)}
          icon={<PaymentsIcon />}
          tone="success"
          loading={isLoading}
        />
        <KpiTile
          label={t("accounting.CashFlowSummary.totalRefunds")}
          value={formatCurrency(totals.totalRefunds)}
          icon={<KeyboardReturnIcon />}
          tone="error"
          loading={isLoading}
        />
        <KpiTile
          label={t("reports.CashFlowReport.netInflow")}
          value={formatCurrency(totals.totalNet)}
          icon={<AccountBalanceWalletIcon />}
          tone={totals.totalNet >= 0 ? "success" : "error"}
          loading={isLoading}
        />
        <KpiTile
          label={t("accounting.CashFlowSummary.transactions")}
          value={totals.totalTransactions}
          icon={<ReceiptIcon />}
          tone="info"
          loading={isLoading}
        />
      </Box>

      <StatTable
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        getRowId={(r) => r.method}
        pageSizeOptions={[10, 25]}
        height={400}
      />
    </ReportShell>
  );
}
