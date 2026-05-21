import { useMemo, useState } from "react";
import { Box, Typography, Chip } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import HandymanIcon from "@mui/icons-material/Handyman";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useEquipmentMaintenanceByUnit } from "../hooks/useReportsHooks";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";

const formatCurrency = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function MaintenanceReport() {
  const [range, setRange] = useState({
    from: addDaysLocal(todayLocalStr(), -30),
    to: todayLocalStr(),
  });

  const { data, isLoading, isFetching } = useEquipmentMaintenanceByUnit({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
  });

  const rows = useMemo(() => data?.rows || [], [data]);
  const totals = data?.totals || { totalDefects: 0, totalPending: 0, totalRepaired: 0, totalRevenue: 0 };

  const downloadCsv = () => {
    const headers = ["Equipment", "Category", "Warehouse", "Defect Logs", "Pending Units", "Repaired Units", "Avg Turnaround (d)", "Period Revenue"];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      lines.push([
        `"${r.equipment_name || ""}"`,
        r.category_name || "",
        r.warehouse || "",
        r.defect_count || 0,
        r.pending_units || 0,
        r.repaired_units || 0,
        Number(r.avg_turnaround_days || 0).toFixed(1),
        Number(r.period_revenue || 0).toFixed(2),
      ].join(","));
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
    { field: "equipment_name", headerName: "Equipment", flex: 1.2, minWidth: 200 },
    { field: "category_name", headerName: "Category", width: 140 },
    { field: "warehouse", headerName: "Warehouse", width: 140 },
    {
      field: "defect_count",
      headerName: "Defect logs",
      width: 120,
      type: "number",
      renderCell: (p) => {
        const v = Number(p.value) || 0;
        return v > 0
          ? <Chip size="small" label={v} color="error" variant="outlined" sx={{ fontWeight: 700 }} />
          : <Typography variant="body2" color="text.secondary">0</Typography>;
      },
    },
    { field: "pending_units", headerName: "Pending", width: 110, type: "number" },
    { field: "repaired_units", headerName: "Repaired", width: 110, type: "number" },
    {
      field: "avg_turnaround_days",
      headerName: "Avg turnaround",
      width: 140,
      renderCell: (p) => `${Number(p.value || 0).toFixed(1)} d`,
    },
    {
      field: "period_revenue",
      headerName: "Revenue",
      width: 140,
      type: "number",
      renderCell: (p) => formatCurrency(Number(p.value)),
    },
  ];

  return (
    <ReportShell
      title="Maintenance by Unit"
      subtitle="Per-equipment defect counts, pending repairs, and turnaround time"
      actionsSlot={<ExportMenu onExport={(f) => f === "csv" ? downloadCsv() : undefined} />}
      filterSlot={<DateRangeFilter from={range.from} to={range.to} onChange={setRange} />}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
        <KpiTile label="Defect logs" value={totals.totalDefects} icon={<BuildCircleIcon />} tone="error" loading={isLoading} />
        <KpiTile label="Pending units" value={totals.totalPending} icon={<HandymanIcon />} tone="warning" loading={isLoading} />
        <KpiTile label="Repaired units" value={totals.totalRepaired} tone="success" loading={isLoading} />
        <KpiTile label="Period revenue" value={formatCurrency(totals.totalRevenue)} tone="info" loading={isLoading} />
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
