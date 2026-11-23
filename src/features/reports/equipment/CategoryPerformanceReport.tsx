import { Fragment, useMemo, useState } from "react";
import {
  Box, Chip, IconButton, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography, useTheme,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import HotelOutlinedIcon from "@mui/icons-material/HotelOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import { useTranslation } from "react-i18next";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { KpiTile } from "@/components/reports/KpiTile";
import { ExportMenu } from "@/components/reports/ExportMenu";
import { useEquipmentPerformance } from "../hooks/useReportsHooks";
import { useWarehouseOptions } from "@/features/warehouses/hooks/useWarehouseOptions";
import { useCategoryOptions } from "@/features/equipment/hooks/useCategoryHooks";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";
import { lkr, PerfGroup, PerfMachine } from "./performance.types";

type SortKey = "revenue" | "rentals" | "utilizationPct" | "name";
type Row = PerfGroup | PerfMachine;

const num = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;
const sorter = (key: SortKey) => (a: any, b: any) =>
  key === "name" ? String(a.name).localeCompare(String(b.name), undefined, { numeric: true }) : (b[key] ?? 0) - (a[key] ?? 0);

/** Revenue, rentals and utilisation by family -> size/type -> machine, with drill-down. */
export default function CategoryPerformanceReport() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [range, setRange] = useState({ from: addDaysLocal(todayLocalStr(), -30), to: todayLocalStr() });
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [sort, setSort] = useState<SortKey>("revenue");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const { data: warehouses = [] } = useWarehouseOptions();
  const { data: categories = [] } = useCategoryOptions();
  const { data, isLoading } = useEquipmentPerformance({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
    warehouseId: warehouseId === "" ? undefined : warehouseId,
    categoryId: categoryId === "" ? undefined : categoryId,
  });

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const families = useMemo(() => [...(data?.families ?? [])].sort(sorter(sort)), [data, sort]);
  const totals = data?.totals;
  const repairShare = totals && totals.revenue > 0 && totals.repairCost ? Math.round((totals.repairCost / totals.revenue) * 100) : 0;

  const exportCsv = () => {
    const q = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Family", "Type", "Machine", "Serial", "Revenue", "Rentals", "Utilization %", "Units out", "Defects", "Idle"].join(",")];
    families.forEach((f) => {
      const add = (type: string, ms: PerfMachine[] = []) =>
        ms.forEach((m) => lines.push([q(f.name), q(type), q(m.name), q(m.serial), m.revenue, m.rentals, m.utilizationPct, m.unitsOut, m.defects, m.idle ? "yes" : "no"].join(",")));
      add("", f.machinesList);
      f.types.forEach((ty) => add(ty.name, ty.machinesList));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `equipment-by-category-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const cell = (v: React.ReactNode, extra = {}) => <TableCell align="right" sx={{ ...num, ...extra }}>{v}</TableCell>;
  const dataCells = (r: Row, bold = false) => (
    <>
      {cell(lkr(r.revenue), { fontWeight: bold ? 700 : 400 })}
      {cell(r.rentals)}
      {cell(`${r.utilizationPct}%`)}
      {cell(r.unitsOut)}
    </>
  );

  const machineRows = (ms: PerfMachine[] = [], indent: number) =>
    [...ms].sort(sorter(sort)).map((m) => (
      <TableRow key={`m${m.equipment_id}`} sx={{ bgcolor: "action.hover" }}>
        <TableCell sx={{ pl: indent }}>
          <Typography variant="body2">{m.name}</Typography>
          {m.idle && <Chip size="small" label={t("reports.Performance.idle")} sx={{ height: 18, fontSize: "0.65rem", mt: 0.25 }} />}
        </TableCell>
        {dataCells(m)}
      </TableRow>
    ));

  const groupRow = (key: string, g: PerfGroup, indent: number, bold: boolean, expandable: boolean) => (
    <TableRow hover onClick={expandable ? () => toggle(key) : undefined} sx={{ cursor: expandable ? "pointer" : "default" }}>
      <TableCell sx={{ pl: indent }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {expandable && (
            <IconButton size="small" aria-label="expand">
              {open[key] ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
            </IconButton>
          )}
          <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 600 }}>{g.name}</Typography>
          <Typography variant="caption" color="text.secondary" sx={num}>
            {t("reports.Performance.machinesCount", { count: g.machines })}
          </Typography>
        </Box>
      </TableCell>
      {dataCells(g, true)}
    </TableRow>
  );

  return (
    <ReportShell
      title={t("reports.Performance.title")}
      subtitle={t("reports.Performance.subtitle")}
      filterSlot={<DateRangeFilter from={range.from} to={range.to} onChange={setRange} />}
      actionsSlot={<ExportMenu onExport={(f) => (f === "csv" ? exportCsv() : undefined)} disabled={!families.length} />}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        <TextField select size="small" label={t("common.category")} value={categoryId} onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))} sx={{ minWidth: 200 }}>
          <MenuItem value="">{t("reports.Performance.allCategories")}</MenuItem>
          {categories.filter((c) => !c.parent_id).map((c) => <MenuItem key={c.category_id} value={c.category_id}>{c.category_name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t("equipment.warehouse")} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value === "" ? "" : Number(e.target.value))} sx={{ minWidth: 180 }}>
          <MenuItem value="">{t("reports.Performance.allLocations")}</MenuItem>
          {warehouses.map((w) => <MenuItem key={w.warehouse_id} value={w.warehouse_id}>{w.location_name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t("reports.Performance.sortBy")} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} sx={{ minWidth: 160 }}>
          <MenuItem value="revenue">{t("reports.Performance.revenue")}</MenuItem>
          <MenuItem value="rentals">{t("reports.Performance.rentals")}</MenuItem>
          <MenuItem value="utilizationPct">{t("reports.Performance.utilization")}</MenuItem>
          <MenuItem value="name">{t("reports.Performance.name")}</MenuItem>
        </TextField>
      </Box>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" } }}>
        <KpiTile loading={isLoading} compact label={t("reports.Performance.revenue")} value={lkr(totals?.revenue ?? 0)} icon={<PaidOutlinedIcon />} tone="success" />
        <KpiTile loading={isLoading} compact label={t("reports.Performance.rentals")} value={`${totals?.rentals ?? 0}`} icon={<ReceiptLongOutlinedIcon />} tone="info" />
        <KpiTile loading={isLoading} compact label={t("reports.Performance.utilization")} value={`${totals?.utilizationPct ?? 0}%`} icon={<SpeedOutlinedIcon />} tone="default" />
        <KpiTile loading={isLoading} compact label={t("reports.Performance.idleMachines")} value={`${totals?.idleMachines ?? 0}`} hint={t("reports.Performance.idleHint")} icon={<HotelOutlinedIcon />} tone="warning" />
        <KpiTile loading={isLoading} compact label={t("reports.Performance.repairSpend")} value={lkr(totals?.repairCost ?? 0)} hint={t("reports.Performance.repairHint", { pct: repairShare })} icon={<BuildOutlinedIcon />} tone="error" />
        <KpiTile loading={isLoading} compact label={t("reports.Performance.payback")} value={totals?.paybackPct == null ? "—" : `${totals.paybackPct}%`} hint={t("reports.Performance.paybackHint")} icon={<TrendingUpOutlinedIcon />} tone="success" />
      </Box>

      <Paper variant="outlined" sx={{ overflowX: "auto", borderColor: theme.palette.divider }}>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>{t("reports.Performance.name")}</TableCell>
              <TableCell align="right">{t("reports.Performance.revenue")}</TableCell>
              <TableCell align="right">{t("reports.Performance.rentals")}</TableCell>
              <TableCell align="right">{t("reports.Performance.utilization")}</TableCell>
              <TableCell align="right">{t("reports.Performance.unitsOut")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && families.length === 0 && (
              <TableRow><TableCell colSpan={5}><Typography color="text.secondary">{t("reports.Performance.noData")}</Typography></TableCell></TableRow>
            )}
            {families.map((f) => {
              const fk = `f${f.category_id}`;
              const types = [...f.types].sort(sorter(sort));
              return (
                <Fragment key={fk}>
                  {groupRow(fk, f, 1, true, true)}
                  {open[fk] && (
                    <>
                      {types.map((ty) => {
                        const tk = `t${ty.category_id}`;
                        return (
                          <Fragment key={tk}>
                            {groupRow(tk, ty, 4, false, true)}
                            {open[tk] && machineRows(ty.machinesList, 9)}
                          </Fragment>
                        );
                      })}
                      {machineRows(f.machinesList, 6)}
                    </>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <MachineList title={t("reports.Performance.topEarners")} items={data?.topEarners ?? []} value={(m) => lkr(m.revenue)} />
        <MachineList title={t("reports.Performance.idleList")} items={data?.idleMachines ?? []} value={(m) => (m.purchaseCost ? lkr(m.purchaseCost) : "")} />
      </Box>
    </ReportShell>
  );
}

function MachineList({ title, items, value }: { title: string; items: PerfMachine[]; value: (m: PerfMachine) => string }) {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>{title}</Typography>
      {items.length === 0 && <Typography variant="body2" color="text.secondary">{t("reports.Performance.noData")}</Typography>}
      {items.slice(0, 10).map((m) => (
        <Box key={m.equipment_id} sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 0.5 }}>
          <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>{m.name}</Typography>
          <Typography variant="body2" sx={{ ...num, fontWeight: 600 }}>{value(m)}</Typography>
        </Box>
      ))}
    </Paper>
  );
}
