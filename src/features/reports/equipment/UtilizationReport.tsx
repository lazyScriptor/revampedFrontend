import { useMemo, useState } from "react";
import { Box, Typography, LinearProgress, useTheme } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ConstructionIcon from "@mui/icons-material/Construction";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useEquipmentUtilization } from "../hooks/useReportsHooks";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";

const formatCurrency = (n: number) =>
  `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function UtilizationReport() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [range, setRange] = useState({
    from: addDaysLocal(todayLocalStr(), -30),
    to: todayLocalStr(),
  });

  const { data, isLoading, isFetching } = useEquipmentUtilization({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
  });

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc: any, r: any) => {
        acc.totalRevenue += Number(r.total_revenue) || 0;
        acc.avgUtilization += Number(r.utilizationPct) || 0;
        acc.units += 1;
        return acc;
      },
      { totalRevenue: 0, avgUtilization: 0, units: 0 },
    );
  }, [rows]);
  const avgUtil = totals.units ? Math.round(totals.avgUtilization / totals.units) : 0;

  const downloadCsv = () => {
    const headers = [
      "Equipment",
      "Serial",
      "Category",
      "Warehouse",
      "Owned",
      "Rented",
      "Available",
      "Defective",
      "Utilization %",
      "Revenue",
      "ROI %",
    ];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      lines.push(
        [
          `"${r.equipment_name || ""}"`,
          r.serial_number || "",
          r.category_name || "",
          r.warehouse || "",
          r.total_owned_qty || 0,
          r.rented_qty || 0,
          r.available_qty || 0,
          r.defective_qty || 0,
          r.utilizationPct || 0,
          Number(r.total_revenue || 0).toFixed(2),
          r.roiPct ?? "",
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equipment-utilization-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef[] = [
    {
      field: "equipment_name",
      headerName: "Equipment",
      flex: 1.2,
      minWidth: 200,
      renderCell: (p) => (
        <Box sx={{ minWidth: 0, py: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              lineHeight: 1.3,
              color: isDark ? "#f8fafc" : "#0f172a",
            }}
            noWrap
          >
            {p.value}
          </Typography>
          {p.row.serial_number && (
            <Typography
              variant="caption"
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "#d97706",
                fontSize: "0.72rem",
                display: "block",
              }}
              noWrap
            >
              {p.row.serial_number}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: "category_name",
      headerName: "Category",
      width: 140,
      renderCell: (p) => (
        <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{p.value || "—"}</span>
      ),
    },
    {
      field: "warehouse",
      headerName: "Warehouse",
      width: 130,
      renderCell: (p) => (
        <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>{p.value || "Main"}</span>
      ),
    },
    {
      field: "total_owned_qty",
      headerName: "Owned",
      width: 85,
      type: "number",
      renderCell: (p) => (
        <span className={`tabular-nums font-mono font-medium text-xs ${isDark ? "text-slate-200" : "text-slate-700"}`}>
          {p.value}
        </span>
      ),
    },
    {
      field: "rented_qty",
      headerName: "Rented",
      width: 85,
      type: "number",
      renderCell: (p) => (
        <span className="tabular-nums font-mono font-semibold text-xs text-amber-600 dark:text-amber-400">
          {p.value}
        </span>
      ),
    },
    {
      field: "available_qty",
      headerName: "Avail",
      width: 85,
      type: "number",
      renderCell: (p) => (
        <span className="tabular-nums font-mono font-medium text-xs text-emerald-600 dark:text-emerald-400">
          {p.value}
        </span>
      ),
    },
    {
      field: "utilizationPct",
      headerName: "Utilization",
      width: 170,
      renderCell: (p) => {
        const v = Math.min(100, Math.max(0, Number(p.value) || 0));
        const color = v >= 70 ? "#10b981" : v >= 40 ? "#f59e0b" : "#64748b";
        return (
          <Box sx={{ width: "100%", pr: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <span
                style={{ color }}
                className="font-mono text-xs font-bold tabular-nums"
              >
                {v}%
              </span>
            </Box>
            <LinearProgress
              variant="determinate"
              value={v}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
                "& .MuiLinearProgress-bar": {
                  bgcolor: color,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        );
      },
    },
    {
      field: "total_revenue",
      headerName: "Revenue",
      width: 145,
      type: "number",
      renderCell: (p) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            fontVariantNumeric: "tabular-nums",
            color: isDark ? "#f8fafc" : "#0f172a",
          }}
        >
          {formatCurrency(Number(p.value))}
        </Typography>
      ),
    },
    {
      field: "roiPct",
      headerName: "ROI",
      width: 95,
      renderCell: (p) => {
        if (p.value == null) return <span className="text-slate-500">—</span>;
        const roi = Number(p.value);
        return (
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
              roi >= 50
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                : "bg-slate-500/10 text-slate-400 border border-slate-500/25"
            }`}
          >
            {roi}%
          </span>
        );
      },
    },
  ];

  return (
    <ReportShell
      title="Equipment Utilization"
      subtitle="Per-unit rental deployment rate, revenue generation, and return on investment"
      actionsSlot={
        <ExportMenu onExport={(f) => (f === "csv" ? downloadCsv() : undefined)} />
      }
      filterSlot={<DateRangeFilter from={range.from} to={range.to} onChange={setRange} />}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        <KpiTile
          label="Tracked Equipment Units"
          value={totals.units}
          icon={<ConstructionIcon />}
          tone="info"
          loading={isLoading}
        />
        <KpiTile
          label="Fleet Avg Utilization"
          value={`${avgUtil}%`}
          icon={<TrendingUpIcon />}
          tone={avgUtil >= 60 ? "success" : "warning"}
          loading={isLoading}
        />
        <KpiTile
          label="Total Equipment Revenue"
          value={formatCurrency(totals.totalRevenue)}
          icon={<AttachMoneyIcon />}
          tone="success"
          loading={isLoading}
        />
      </Box>

      <StatTable
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        getRowId={(r) => r.equipment_id}
        pageSizeOptions={[25, 50, 100]}
      />
    </ReportShell>
  );
}
