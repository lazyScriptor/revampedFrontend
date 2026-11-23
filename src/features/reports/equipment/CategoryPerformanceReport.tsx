import { useMemo, useState } from "react";
import { Box, Button, IconButton, LinearProgress, MenuItem, TextField, Typography, useTheme } from "@mui/material";
import { GridColDef, GridSortModel } from "@mui/x-data-grid";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import HotelOutlinedIcon from "@mui/icons-material/HotelOutlined";
import { useTranslation } from "react-i18next";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { StatTable } from "@/components/reports/StatTable";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useEquipmentPerformance } from "../hooks/useReportsHooks";
import { useWarehouseOptions } from "@/features/warehouses/hooks/useWarehouseOptions";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";
import { PerfGroup, PerfMachine } from "./performance.types";

const money = (n: number) => `LKR ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One row of the table: a family (level 0), a size/type (level 1) or a machine (level 1 or 2). */
interface Row {
  id: string;
  level: 0 | 1 | 2;
  kind: "family" | "type" | "machine";
  name: string;
  caption: string;
  units: number;
  rentals: number;
  unitsOut: number;
  utilizationPct: number;
  revenue: number;
  share: number;
  paybackPct: number | null;
  children: Row[];
}

const SORT_FIELDS = ["name", "units", "rentals", "unitsOut", "utilizationPct", "revenue", "share", "paybackPct"] as const;

/** Revenue, rentals and busy-ness by family -> size/type -> machine, in the same table as the Utilization report. */
export default function CategoryPerformanceReport() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [range, setRange] = useState({ from: addDaysLocal(todayLocalStr(), -30), to: todayLocalStr() });
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: "revenue", sort: "desc" }]);

  const { data: warehouses = [] } = useWarehouseOptions();
  const { data, isLoading, isFetching } = useEquipmentPerformance({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
    warehouseId: warehouseId === "" ? undefined : warehouseId,
  });
  const totals = data?.totals;
  const income = totals?.revenue ?? 0;

  const tree: Row[] = useMemo(() => {
    const share = (r: number) => (income > 0 ? Math.round((r / income) * 1000) / 10 : 0);
    const machine = (m: PerfMachine, level: 1 | 2, parent: string): Row => ({
      id: `${parent}/m${m.equipment_id}`, level, kind: "machine", name: m.name,
      caption: [m.serial, m.warehouse].filter(Boolean).join(" · "),
      units: m.owned, rentals: m.rentals, unitsOut: m.unitsOut, utilizationPct: m.utilizationPct,
      revenue: m.revenue, share: share(m.revenue), paybackPct: m.paybackPct, children: [],
    });
    const group = (g: PerfGroup, kind: "family" | "type", level: 0 | 1, id: string, kids: Row[]): Row => ({
      id, level, kind, name: g.name,
      caption: kind === "family" && kids.some((k) => k.kind === "type")
        ? t("reports.Performance.familyCaption", { types: kids.filter((k) => k.kind === "type").length, machines: g.machines })
        : t("reports.Performance.typeCaption", { machines: g.machines }),
      units: g.units, rentals: g.rentals, unitsOut: g.unitsOut, utilizationPct: g.utilizationPct,
      revenue: g.revenue, share: share(g.revenue), paybackPct: g.paybackPct, children: kids,
    });
    return (data?.families ?? []).map((f) => {
      const fid = `f${f.category_id ?? f.name}`;
      const kids: Row[] = [
        ...f.types.map((ty) => group(ty, "type", 1, `${fid}/t${ty.category_id}`, (ty.machinesList ?? []).map((m) => machine(m, 2, `${fid}/t${ty.category_id}`)))),
        ...(f.machinesList ?? []).map((m) => machine(m, 1, fid)),
      ];
      return group(f, "family", 0, fid, kids);
    });
  }, [data, income, t]);

  // Sort each level on its own so a family keeps its sizes and machines under it.
  const rows: Row[] = useMemo(() => {
    const { field, sort } = sortModel[0] ?? { field: "revenue", sort: "desc" };
    const dir = sort === "asc" ? 1 : -1;
    const cmp = (a: Row, b: Row) => {
      const av = (a as any)[field], bv = (b as any)[field];
      if (field === "name") return dir * String(av).localeCompare(String(bv), undefined, { numeric: true });
      return dir * ((av ?? -1) - (bv ?? -1)) || a.name.localeCompare(b.name, undefined, { numeric: true });
    };
    const out: Row[] = [];
    const walk = (list: Row[]) => [...list].sort(cmp).forEach((r) => { out.push(r); if (open.has(r.id)) walk(r.children); });
    walk(tree);
    return out;
  }, [tree, open, sortModel]);

  const expandable = useMemo(() => {
    const ids: string[] = [];
    const walk = (l: Row[]) => l.forEach((r) => { if (r.children.length) { ids.push(r.id); walk(r.children); } });
    walk(tree);
    return ids;
  }, [tree]);
  const allOpen = expandable.length > 0 && expandable.every((id) => open.has(id));
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Same as the Utilization report: the plain average of every machine's own utilisation.
  const avgUtil = useMemo(() => {
    const all: number[] = [];
    const walk = (l: Row[]) => l.forEach((r) => (r.kind === "machine" ? all.push(r.utilizationPct) : walk(r.children)));
    walk(tree);
    return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
  }, [tree]);

  const exportCsv = () => {
    const q = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Family", "Size or type", "Machine", "Units", "Rentals", "Out now", "Utilisation %", "Income (LKR)"].join(",")];
    const walk = (list: Row[], fam = "", typ = "") => list.forEach((r) => {
      if (r.kind === "machine") lines.push([q(fam), q(typ), q(r.name), r.units, r.rentals, r.unitsOut, r.utilizationPct, r.revenue.toFixed(2)].join(","));
      else walk(r.children, r.kind === "family" ? r.name : fam, r.kind === "type" ? r.name : typ);
    });
    walk(tree);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
    a.download = `equipment-by-category-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const strong = isDark ? "#f8fafc" : "#0f172a";
  const mono = { fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" } as const;
  const num = (color?: string): GridColDef["renderCell"] => (p) => (
    <span className="tabular-nums font-mono text-xs font-medium" style={{ color: color ?? (isDark ? "#e2e8f0" : "#334155") }}>{p.value}</span>
  );

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: t("reports.Performance.colName"),
      flex: 1.6,
      minWidth: 260,
      renderCell: (p) => {
        const r = p.row as Row;
        const canOpen = r.children.length > 0;
        return (
          <Box
            onClick={canOpen ? () => toggle(r.id) : undefined}
            sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, width: "100%", pl: r.level * 3, cursor: canOpen ? "pointer" : "default" }}
          >
            {canOpen ? (
              <IconButton size="small" aria-label={open.has(r.id) ? t("reports.Performance.collapse") : t("reports.Performance.expand")} aria-expanded={open.has(r.id)}>
                {open.has(r.id) ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
              </IconButton>
            ) : (
              <Box sx={{ width: 30, flexShrink: 0 }} />
            )}
            <Box sx={{ minWidth: 0, py: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: r.kind === "machine" ? 500 : 700, lineHeight: 1.3, color: strong, wordBreak: "break-word" }}>{r.name}</Typography>
              {r.caption && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.72rem", ...(r.kind === "machine" ? { fontFamily: "'JetBrains Mono', monospace", color: "#d97706" } : {}) }} noWrap>
                  {r.caption}
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
    },
    { field: "units", headerName: t("reports.Performance.colUnits"), width: 90, type: "number", renderCell: num() },
    { field: "rentals", headerName: t("reports.Performance.colRentals"), width: 100, type: "number", renderCell: num() },
    { field: "unitsOut", headerName: t("reports.Performance.colOut"), width: 100, type: "number", renderCell: num(isDark ? "#fbbf24" : "#d97706") },
    {
      field: "utilizationPct",
      headerName: t("reports.utilization"),
      width: 170,
      renderCell: (p) => {
        const v = Math.min(100, Math.max(0, Number(p.value) || 0));
        const color = v >= 70 ? "#10b981" : v >= 40 ? "#f59e0b" : "#64748b";
        return (
          <Box sx={{ width: "100%", pr: 1 }}>
            <span style={{ color }} className="font-mono text-xs font-bold tabular-nums">{v}%</span>
            <LinearProgress variant="determinate" value={v} sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0", "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 } }} />
          </Box>
        );
      },
    },
    {
      field: "revenue",
      headerName: t("reports.Performance.colIncome"),
      width: 160,
      type: "number",
      renderCell: (p) => <Typography variant="body2" sx={{ fontWeight: 700, color: strong, ...mono }}>{money(Number(p.value))}</Typography>,
    },
    { field: "share", headerName: t("reports.Performance.colShare"), width: 95, type: "number", renderCell: (p) => <span className="tabular-nums font-mono text-xs">{Number(p.value) > 0 ? `${p.value}%` : "—"}</span> },
    {
      field: "paybackPct",
      headerName: t("reports.Performance.colPaid"),
      width: 105,
      renderCell: (p) => (p.value == null ? <span className="text-slate-500">—</span> : (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${Number(p.value) >= 100 ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25" : "bg-slate-500/10 text-slate-500 border border-slate-500/25"}`}>{p.value}%</span>
      )),
    },
  ];

  return (
    <ReportShell
      title={t("reports.Performance.title")}
      subtitle={t("reports.Performance.subtitle")}
      actionsSlot={
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button size="small" variant="outlined" startIcon={allOpen ? <UnfoldLessIcon /> : <UnfoldMoreIcon />} disabled={!expandable.length} onClick={() => setOpen(allOpen ? new Set() : new Set(expandable))}>
            {allOpen ? t("reports.Performance.collapseAll") : t("reports.Performance.expandAll")}
          </Button>
          <ExportMenu onExport={(f) => (f === "csv" ? exportCsv() : undefined)} disabled={!tree.length} />
        </Box>
      }
      filterSlot={
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <DateRangeFilter from={range.from} to={range.to} onChange={setRange} />
          {warehouses.length > 1 && (
            <TextField select size="small" label={t("equipment.warehouse")} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value === "" ? "" : Number(e.target.value))} sx={{ maxWidth: 260 }}>
              <MenuItem value="">{t("reports.Performance.allLocations")}</MenuItem>
              {warehouses.map((w) => <MenuItem key={w.warehouse_id} value={w.warehouse_id}>{w.location_name}</MenuItem>)}
            </TextField>
          )}
        </Box>
      }
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
        <KpiTile loading={isLoading} label={t("reports.Performance.kpiIncome")} value={money(income)} icon={<PaidOutlinedIcon />} tone="success" />
        <KpiTile loading={isLoading} label={t("reports.Performance.kpiRentals")} value={totals?.rentals ?? 0} icon={<ReceiptLongOutlinedIcon />} tone="info" />
        <KpiTile loading={isLoading} label={t("reports.Performance.kpiUtil")} value={`${avgUtil}%`} icon={<TrendingUpIcon />} tone={avgUtil >= 60 ? "success" : "warning"} />
        <KpiTile loading={isLoading} label={t("reports.Performance.kpiIdle")} value={t("reports.Performance.kpiIdleValue", { idle: totals?.idleMachines ?? 0, total: totals?.machines ?? 0 })} icon={<HotelOutlinedIcon />} tone="warning" />
      </Box>

      <StatTable
        rows={rows}
        columns={columns}
        loading={isLoading || isFetching}
        getRowId={(r) => r.id}
        paginationMode="client"
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={(m) => setSortModel(m.length && SORT_FIELDS.includes(m[0].field as any) ? m : [{ field: "revenue", sort: "desc" }])}
        getRowClassName={(p) => `row-level-${p.row.level}`}
        pageSizeOptions={[50, 100, 200]}
        initialPageSize={50}
      />
    </ReportShell>
  );
}
