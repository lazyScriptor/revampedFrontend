import { useState } from "react";
import { Box, Typography, Paper } from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useProfitLossReport } from "../hooks/useReportsHooks";
import { api } from "@/lib/api";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";

const formatCurrency = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function ProfitLossReport() {
  const [range, setRange] = useState({
    from: addDaysLocal(todayLocalStr(), -30),
    to: todayLocalStr(),
  });
  const { data, isLoading } = useProfitLossReport({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
  });

  const onExport = async (format: "csv" | "pdf" | "excel") => {
    if (format === "csv") {
      // Quick CSV from the visible numbers.
      const lines = [
        "Section,Amount",
        `Gross revenue,${data?.grossRevenue || 0}`,
        `Refunds,${data?.totalRefunds || 0}`,
        `Net revenue,${data?.netRevenue || 0}`,
        `Total expenses,${data?.totalExpenses || 0}`,
        `Depreciation,${data?.periodDepreciation || 0}`,
        `Net profit,${data?.netProfit || 0}`,
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `profit-loss-${range.from}-to-${range.to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const endpoint = format === "pdf" ? "/reports/profit-loss/pdf" : "/reports/profit-loss/excel";
    const filename = format === "pdf" ? `pnl-${range.from}-to-${range.to}.pdf` : `pnl-${range.from}-to-${range.to}.xlsx`;
    try {
      const blob = (await api.get(endpoint, { params: { startDate: range.from, endDate: range.to }, responseType: "blob" })) as unknown as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const expenses: any[] = data?.expenses || [];

  return (
    <ReportShell
      title="Profit & Loss"
      subtitle="Income statement for the selected period"
      actionsSlot={<ExportMenu onExport={onExport} />}
      filterSlot={<DateRangeFilter from={range.from} to={range.to} onChange={setRange} />}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
        <KpiTile label="Gross revenue" value={formatCurrency(data?.grossRevenue || 0)} icon={<AttachMoneyIcon />} tone="info" loading={isLoading} />
        <KpiTile label="Total expenses" value={formatCurrency(data?.totalExpenses || 0)} icon={<TrendingDownIcon />} tone="warning" loading={isLoading} />
        <KpiTile label="Depreciation" value={formatCurrency(data?.periodDepreciation || 0)} tone="default" loading={isLoading} />
        <KpiTile
          label="Net profit"
          value={formatCurrency(data?.netProfit || 0)}
          icon={<TrendingUpIcon />}
          tone={(data?.netProfit ?? 0) >= 0 ? "success" : "error"}
          loading={isLoading}
        />
      </Box>

      <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2.5, bgcolor: "white" }}>
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b" }}>
          EXPENSES BY CATEGORY
        </Typography>
        {expenses.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No expenses recorded in this period.
          </Typography>
        ) : (
          <Box sx={{ mt: 1.5 }}>
            {expenses.map((e: any) => (
              <Box key={e.category} sx={{ display: "flex", justifyContent: "space-between", py: 1, borderBottom: "1px solid #f1f5f9" }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.category}</Typography>
                  <Typography variant="caption" color="text.secondary">{e.count} {Number(e.count) === 1 ? "entry" : "entries"}</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatCurrency(Number(e.total))}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </ReportShell>
  );
}
