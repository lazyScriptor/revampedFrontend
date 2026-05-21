import { useState } from "react";
import { Box, TextField, Paper, Typography } from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";
import { ReportShell } from "@/components/reports/ReportShell";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { useCashFlowReport } from "../hooks/useReportsHooks";
import { todayLocalStr } from "@/lib/dates";
import { GridColDef } from "@mui/x-data-grid";

const formatCurrency = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function CashFlowReport() {
  const [date, setDate] = useState(todayLocalStr());
  const { data, isLoading, isFetching } = useCashFlowReport(date);

  const columns: GridColDef[] = [
    { field: "method", headerName: "Method", flex: 1, minWidth: 120 },
    {
      field: "income",
      headerName: "Income",
      width: 160,
      type: "number",
      renderCell: (p) => <Typography sx={{ fontWeight: 700, color: "success.main" }}>{formatCurrency(Number(p.value))}</Typography>,
    },
    {
      field: "refunds",
      headerName: "Refunds",
      width: 160,
      type: "number",
      renderCell: (p) => (
        <Typography sx={{ fontWeight: 700, color: Number(p.value) > 0 ? "error.main" : "text.secondary" }}>
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "net",
      headerName: "Net",
      width: 160,
      type: "number",
      renderCell: (p) => <Typography sx={{ fontWeight: 800 }}>{formatCurrency(Number(p.value))}</Typography>,
    },
    { field: "transaction_count", headerName: "Transactions", width: 130, type: "number" },
  ];

  const totals = data?.totals || { totalIncome: 0, totalRefunds: 0, totalNet: 0, totalTransactions: 0 };
  const rows = (data?.methods || []).map((m: any) => ({ ...m, id: m.method }));

  return (
    <ReportShell
      title="Daily Cash Flow"
      subtitle="Payment-method breakdown for a single day"
      filterSlot={
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
          <TextField
            type="date"
            size="small"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 170 }}
          />
        </Box>
      }
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
        <KpiTile label="Income" value={formatCurrency(totals.totalIncome)} icon={<PaymentsIcon />} tone="success" loading={isLoading} />
        <KpiTile label="Refunds" value={formatCurrency(totals.totalRefunds)} icon={<KeyboardReturnIcon />} tone="error" loading={isLoading} />
        <KpiTile label="Net" value={formatCurrency(totals.totalNet)} tone={totals.totalNet >= 0 ? "success" : "error"} loading={isLoading} />
        <KpiTile label="Transactions" value={totals.totalTransactions} tone="info" loading={isLoading} />
      </Box>

      <Paper elevation={0} sx={{ p: 0, border: "1px solid #e2e8f0", borderRadius: 2.5, overflow: "hidden", bgcolor: "white" }}>
        <StatTable
          rows={rows}
          columns={columns}
          loading={isLoading || isFetching}
          getRowId={(r) => r.method}
          pageSizeOptions={[10, 25]}
          height={400}
        />
      </Paper>
    </ReportShell>
  );
}
