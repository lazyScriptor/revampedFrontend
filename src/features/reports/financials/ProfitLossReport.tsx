import { useState } from "react";
import { Box, Typography, Paper, useTheme, LinearProgress } from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useProfitLossReport } from "../hooks/useReportsHooks";
import { api } from "@/lib/api";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";

const formatCurrency = (n: number) =>
  `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProfitLossReport() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark" || true;

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
    const endpoint =
      format === "pdf" ? "/reports/profit-loss/pdf" : "/reports/profit-loss/excel";
    const filename =
      format === "pdf"
        ? `pnl-${range.from}-to-${range.to}.pdf`
        : `pnl-${range.from}-to-${range.to}.xlsx`;
    try {
      const blob = (await api.get(endpoint, {
        params: { startDate: range.from, endDate: range.to },
        responseType: "blob",
      })) as unknown as Blob;
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
  const totalExp = Number(data?.totalExpenses || 0);

  return (
    <ReportShell
      title="Profit & Loss"
      subtitle="Financial performance, operating margins, and expenditure distribution for the selected period"
      actionsSlot={<ExportMenu onExport={onExport} />}
      filterSlot={<DateRangeFilter from={range.from} to={range.to} onChange={setRange} />}
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
          label="Gross Revenue"
          value={formatCurrency(data?.grossRevenue || 0)}
          icon={<AttachMoneyIcon />}
          tone="info"
          loading={isLoading}
        />
        <KpiTile
          label="Operating Expenses"
          value={formatCurrency(data?.totalExpenses || 0)}
          icon={<TrendingDownIcon />}
          tone="warning"
          loading={isLoading}
        />
        <KpiTile
          label="Depreciation"
          value={formatCurrency(data?.periodDepreciation || 0)}
          icon={<AccountBalanceIcon />}
          tone="default"
          loading={isLoading}
        />
        <KpiTile
          label="Net Operating Profit"
          value={formatCurrency(data?.netProfit || 0)}
          icon={<TrendingUpIcon />}
          tone={(data?.netProfit ?? 0) >= 0 ? "success" : "error"}
          loading={isLoading}
        />
      </Box>

      {/* Expenses by Category Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          border: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
          borderRadius: 3,
          bgcolor: isDark ? "#1e293b" : "white",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: isDark ? "#94a3b8" : "#64748b",
            fontSize: "0.72rem",
          }}
        >
          EXPENSES BREAKDOWN BY CATEGORY
        </Typography>

        {expenses.length === 0 ? (
          <Typography
            variant="body2"
            sx={{ py: 3, color: isDark ? "#64748b" : "text.secondary", textAlign: "center" }}
          >
            No operating expenses recorded in this period.
          </Typography>
        ) : (
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {expenses.map((e: any) => {
              const amount = Number(e.total) || 0;
              const pct = totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0;
              return (
                <Box
                  key={e.category}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(15, 23, 42, 0.4)" : "#f8fafc",
                    border: "1px solid",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#f1f5f9",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 0.75,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: isDark ? "#f8fafc" : "#0f172a",
                        }}
                      >
                        {e.category}
                      </Typography>
                      <span className="text-xs text-slate-400 font-mono">
                        ({e.count} {Number(e.count) === 1 ? "entry" : "entries"})
                      </span>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontVariantNumeric: "tabular-nums",
                        color: isDark ? "#f8fafc" : "#0f172a",
                      }}
                    >
                      {formatCurrency(amount)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 5,
                          borderRadius: 3,
                          bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
                          "& .MuiLinearProgress-bar": {
                            bgcolor: "#f59e0b",
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                    <span className="text-xs font-mono font-medium text-slate-400 tabular-nums">
                      {pct}%
                    </span>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
    </ReportShell>
  );
}
