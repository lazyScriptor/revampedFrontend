import { useMemo, useState } from "react";
import { Box, Typography, LinearProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ConstructionIcon from "@mui/icons-material/Construction";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useEquipmentUtilization } from "../hooks/useReportsHooks";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";

const formatCurrency = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function UtilizationReport() {
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
    const headers = ["Equipment", "Serial", "Category", "Warehouse", "Owned", "Rented", "Available", "Defective", "Utilization %", "Revenue", "ROI %"];
    const lines = [headers.join(",")];
    rows.forEach((r: any) => {
      lines.push([
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
      ].join(","));
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
    { field: "equipment_name", headerName: "Equipment", flex: 1.2, minWidth: 200 },
    { field: "category_name", headerName: "Category", width: 140 },
    { field: "warehouse", headerName: "Warehouse", width: 140 },
    { field: "total_owned_qty", headerName: "Owned", width: 90, type: "number" },
    { field: "rented_qty", headerName: "Rented", width: 90, type: "number" },
    { field: "available_qty", headerName: "Avail", width: 90, type: "number" },
    {
      field: "utilizationPct",
      headerName: "Utilization",
      width: 180,
      renderCell: (p) => {
        const v = Number(p.value) || 0;
        return (
          <Box sx={{ width: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{v}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={v} sx={{ height: 6, borderRadius: 3 }} />
          </Box>
        );
      },
    },
    {
      field: "total_revenue",
      headerName: "Revenue",
      width: 140,
      type: "number",
      renderCell: (p) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(Number(p.value))}</Typography>
      ),
    },
    {
      field: "roiPct",
      headerName: "ROI %",
      width: 100,
      renderCell: (p) => p.value != null ? `${p.value}%` : "—",
    },
  ];

  return (
    <ReportShell
      title="Equipment Utilization"
      subtitle="Per-unit utilization, revenue contribution, and ROI"
      actionsSlot={<ExportMenu onExport={(f) => f === "csv" ? downloadCsv() : undefined} />}
      filterSlot={<DateRangeFilter from={range.from} to={range.to} onChange={setRange} />}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
        <KpiTile label="Units tracked" value={totals.units} icon={<ConstructionIcon />} tone="info" loading={isLoading} />
        <KpiTile label="Avg Utilization" value={`${avgUtil}%`} icon={<TrendingUpIcon />} tone={avgUtil >= 60 ? "success" : "warning"} loading={isLoading} />
        <KpiTile label="Total Revenue" value={formatCurrency(totals.totalRevenue)} tone="success" loading={isLoading} />
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
