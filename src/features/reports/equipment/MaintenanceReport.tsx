import { useMemo, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import HandymanIcon from "@mui/icons-material/Handyman";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useEquipmentMaintenanceByUnit } from "../hooks/useReportsHooks";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";

const formatCurrency = (n: number) =>
  `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MaintenanceReport() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark" || true;

  const [range, setRange] = useState({
    from: addDaysLocal(todayLocalStr(), -30),
    to: todayLocalStr(),
  });

  const { data, isLoading, isFetching } = useEquipmentMaintenanceByUnit({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
  });

  const rows = useMemo(() => data?.rows || [], [data]);
  const totals = data?.totals || {
    totalDefects: 0,
    totalPending: 0,
    totalRepaired: 0,
    totalRevenue: 0,
  };

  const downloadCsv = () => {
    const headers = [
      "Equipment",
      "Category",
      "Warehouse",
      "Defect Logs",
      "Pending Units",
      "Repaired Units",
      "Avg Turnaround (d)",
      "Period Revenue",
    ];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      lines.push(
        [
          `"${r.equipment_name || ""}"`,
          r.category_name || "",
          r.warehouse || "",
          r.defect_count || 0,
          r.pending_units || 0,
          r.repaired_units || 0,
          Number(r.avg_turnaround_days || 0).toFixed(1),
          Number(r.period_revenue || 0).toFixed(2),
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `maintenance-by-unit-${range.from}-to-${range.to}.csv`;
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
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: isDark ? "#f8fafc" : "#0f172a",
          }}
          noWrap
        >
          {p.value}
        </Typography>
      ),
    },
    {
      field: "category_name",
      headerName: "Category",
      width: 140,
      renderCell: (p) => (
        <span className="text-xs font-medium text-slate-300">{p.value || "—"}</span>
      ),
    },
    {
      field: "warehouse",
      headerName: "Warehouse",
      width: 130,
      renderCell: (p) => (
        <span className="text-xs text-slate-400">{p.value || "Main"}</span>
      ),
    },
    {
      field: "defect_count",
      headerName: "Defect Logs",
      width: 120,
      type: "number",
      renderCell: (p) => {
        const v = Number(p.value) || 0;
        return v > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            {v} logs
          </span>
        ) : (
          <span className="tabular-nums font-mono text-xs text-slate-500">0</span>
        );
      },
    },
    {
      field: "pending_units",
      headerName: "Pending",
      width: 110,
      type: "number",
      renderCell: (p) => {
        const v = Number(p.value) || 0;
        return (
          <span
            className={`tabular-nums font-mono font-semibold text-xs ${
              v > 0 ? "text-amber-400" : "text-slate-500"
            }`}
          >
            {v}
          </span>
        );
      },
    },
    {
      field: "repaired_units",
      headerName: "Repaired",
      width: 110,
      type: "number",
      renderCell: (p) => (
        <span className="tabular-nums font-mono font-medium text-xs text-emerald-400">
          {p.value}
        </span>
      ),
    },
    {
      field: "avg_turnaround_days",
      headerName: "Avg Turnaround",
      width: 140,
      renderCell: (p) => (
        <span className="tabular-nums font-mono text-xs text-slate-300">
          {Number(p.value || 0).toFixed(1)} days
        </span>
      ),
    },
    {
      field: "period_revenue",
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
  ];

  return (
    <ReportShell
      title="Maintenance by Unit"
      subtitle="Per-equipment breakdown of incident defects, repairs in progress, and servicing turnaround time"
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
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        <KpiTile
          label="Total Defect Logs"
          value={totals.totalDefects}
          icon={<BuildCircleIcon />}
          tone="error"
          loading={isLoading}
        />
        <KpiTile
          label="Pending Repairs"
          value={totals.totalPending}
          icon={<HandymanIcon />}
          tone="warning"
          loading={isLoading}
        />
        <KpiTile
          label="Repaired Units"
          value={totals.totalRepaired}
          icon={<CheckCircleIcon />}
          tone="success"
          loading={isLoading}
        />
        <KpiTile
          label="Period Revenue"
          value={formatCurrency(totals.totalRevenue)}
          icon={<AttachMoneyIcon />}
          tone="info"
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
