import { useMemo, useState } from "react";
import {
  Alert, Box, Button, ButtonBase, Collapse, Link, MenuItem, Paper, Skeleton, TextField, ToggleButton,
  ToggleButtonGroup, Typography, useTheme, type Theme,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ReportShell } from "@/components/reports/ReportShell";
import { DateRangeFilter } from "@/components/reports/DateRangeFilter";
import { useEquipmentPerformance } from "../hooks/useReportsHooks";
import { useWarehouseOptions } from "@/features/warehouses/hooks/useWarehouseOptions";
import { todayLocalStr, addDaysLocal } from "@/lib/dates";
import { lkr, PerfFamily, PerfGroup, PerfMachine } from "./performance.types";

type SortKey = "revenue" | "rentals";
const tabular = { fontVariantNumeric: "tabular-nums" } as const;
const byKey = (k: SortKey) => (a: { revenue: number; rentals: number; name: string }, b: { revenue: number; rentals: number; name: string }) =>
  b[k] - a[k] || a.name.localeCompare(b.name, undefined, { numeric: true });
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** One line in the ranking: a family, a size/type, or a single machine. */
interface Item {
  key: string;
  name: string;
  revenue: number;
  rentals: number;
  sub: string;
  group?: PerfGroup | PerfFamily;
  machine?: PerfMachine;
}

/** What do my machines earn? Answers first, then a ranking you can click into. */
export default function CategoryPerformanceReport() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [range, setRange] = useState({ from: addDaysLocal(todayLocalStr(), -29), to: todayLocalStr() });
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [sort, setSort] = useState<SortKey>("revenue");
  const [familyKey, setFamilyKey] = useState<string | null>(null);
  const [typeKey, setTypeKey] = useState<string | null>(null);
  const [showZero, setShowZero] = useState(false);

  const { data: warehouses = [] } = useWarehouseOptions();
  const { data, isLoading } = useEquipmentPerformance({
    startDate: range.from || undefined,
    endDate: range.to || undefined,
    warehouseId: warehouseId === "" ? undefined : warehouseId,
  });

  const totals = data?.totals;
  const families = useMemo(() => data?.families ?? [], [data]);
  const fam = families.find((f) => String(f.category_id ?? f.name) === familyKey) ?? null;
  const type = fam?.types.find((x) => String(x.category_id) === typeKey) ?? null;
  const totalIncome = totals?.revenue ?? 0;
  const grouped = families.some((f) => f.types.length > 0);

  const machineItem = (m: PerfMachine): Item => ({
    key: `m${m.equipment_id}`, name: m.name, revenue: m.revenue, rentals: m.rentals, machine: m,
    sub: m.rentals === 0
      ? t("reports.Performance.notRented")
      : [t("reports.Performance.rentalsLine", { count: m.rentals }), m.daysRented ? t("reports.Performance.daysLine", { count: m.daysRented }) : "", m.unitsOut ? t("reports.Performance.outNow", { count: m.unitsOut }) : ""].filter(Boolean).join(" · "),
  });
  const groupItem = (g: PerfGroup | PerfFamily, key: string): Item => ({
    key, name: g.name, revenue: g.revenue, rentals: g.rentals, group: g,
    sub: "types" in g && g.types.length
      ? t("reports.Performance.typesLine", { types: g.types.length, machines: g.machines })
      : t("reports.Performance.machinesLine", { count: g.machines }),
  });

  const items: Item[] = useMemo(() => {
    let list: Item[];
    if (!fam) list = families.map((f) => groupItem(f, `f${f.category_id ?? f.name}`));
    else if (!type) list = [...fam.types.map((x) => groupItem(x, `t${x.category_id}`)), ...(fam.machinesList ?? []).map(machineItem)];
    else list = (type.machinesList ?? []).map(machineItem);
    return list.sort(byKey(sort));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [families, fam, type, sort, t]);
  const earning = items.filter((i) => i.revenue > 0);
  const notEarning = items.filter((i) => i.revenue <= 0);
  const levelTotal = fam ? (type ? type.revenue : fam.revenue) : totalIncome;
  const top = families.filter((f) => f.revenue > 0).sort(byKey("revenue"))[0];

  const drill = (it: Item) => {
    if (it.machine) return;
    if (!fam) { setFamilyKey(String(families.find((f) => f.name === it.name)?.category_id ?? it.name)); }
    else setTypeKey(String(it.group?.category_id));
    setShowZero(false);
  };
  const back = () => { if (type) setTypeKey(null); else setFamilyKey(null); setShowZero(false); };

  const exportCsv = () => {
    const q = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Equipment type", "Size or type", "Machine", "Income (LKR)", "Rentals"].join(",")];
    families.forEach((f) => {
      (f.machinesList ?? []).forEach((m) => lines.push([q(f.name), q(""), q(m.name), m.revenue, m.rentals].join(",")));
      f.types.forEach((ty) => (ty.machinesList ?? []).forEach((m) => lines.push([q(f.name), q(ty.name), q(m.name), m.revenue, m.rentals].join(","))));
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
    a.download = `equipment-income-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const repairPct = totalIncome > 0 && totals?.repairCost ? pct(totals.repairCost, totalIncome) : 0;
  const nothing = !isLoading && totals && totals.rentals === 0;
  const heading = !fam ? t("reports.Performance.rankAll") : type ? t("reports.Performance.rankMachines", { name: type.name }) : t("reports.Performance.rankTypes", { name: fam.name });

  return (
    <ReportShell
      title={t("reports.Performance.title")}
      subtitle={t("reports.Performance.subtitle")}
      filterSlot={<DateRangeFilter from={range.from} to={range.to} onChange={(r) => { setRange(r); setFamilyKey(null); setTypeKey(null); }} />}
      actionsSlot={
        <Button variant="outlined" size="small" startIcon={<DownloadOutlinedIcon />} onClick={exportCsv} disabled={!families.length}>
          {t("reports.Performance.download")}
        </Button>
      }
    >
      {warehouses.length > 1 && (
        <TextField select size="small" label={t("equipment.warehouse")} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value === "" ? "" : Number(e.target.value))} sx={{ maxWidth: 260 }}>
          <MenuItem value="">{t("reports.Performance.allLocations")}</MenuItem>
          {warehouses.map((w) => <MenuItem key={w.warehouse_id} value={w.warehouse_id}>{w.location_name}</MenuItem>)}
        </TextField>
      )}

      {/* ── The answers, in plain words ─────────────────────────────── */}
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <Answer loading={isLoading} label={t("reports.Performance.income")} value={lkr(totalIncome)} line={t("reports.Performance.incomeLine", { count: totals?.rentals ?? 0 })} />
        <Answer loading={isLoading} label={t("reports.Performance.bestEarner")} value={top?.name ?? "—"} line={top ? t("reports.Performance.bestLine", { amount: lkr(top.revenue), pct: pct(top.revenue, totalIncome) }) : t("reports.Performance.noRentalsYet")} />
        <Answer
          loading={isLoading}
          label={t("reports.Performance.idleTitle")}
          value={t("reports.Performance.idleValue", { idle: totals?.idleMachines ?? 0, total: totals?.machines ?? 0 })}
          line={totals?.purchaseCost && totals.idleMachines ? t("reports.Performance.idleLine") : t("reports.Performance.idleLineShort")}
          tone="warning"
        />
        {repairPct > 0 && (
          <Answer loading={isLoading} label={t("reports.Performance.repairTitle")} value={lkr(totals?.repairCost ?? 0)} line={t("reports.Performance.repairLine", { pct: repairPct })} tone="error" />
        )}
      </Box>

      {!isLoading && !grouped && families.length > 1 && (
        <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => navigate({ to: "/equipment-category" })}>{t("reports.Performance.openCategories")}</Button>}>
          <strong>{t("reports.Performance.notGroupedTitle")}</strong> {t("reports.Performance.notGroupedBody")}
        </Alert>
      )}

      {/* ── Ranking you can click into ──────────────────────────────── */}
      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box sx={{ p: 2, display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider" }}>
          <Box sx={{ minWidth: 0 }}>
            {fam && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", mb: 0.5 }}>
                <Button size="small" startIcon={<ArrowBackIcon />} onClick={back} sx={{ mr: 0.5 }}>{t("reports.Performance.back")}</Button>
                <Link component="button" underline="hover" onClick={() => { setFamilyKey(null); setTypeKey(null); }} sx={{ fontSize: "0.85rem" }}>{t("reports.Performance.allEquipment")}</Link>
                <Typography variant="body2" color="text.secondary">›</Typography>
                {type ? <Link component="button" underline="hover" onClick={() => setTypeKey(null)} sx={{ fontSize: "0.85rem" }}>{fam.name}</Link> : <Typography variant="body2" sx={{ fontWeight: 700 }}>{fam.name}</Typography>}
                {type && <><Typography variant="body2" color="text.secondary">›</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{type.name}</Typography></>}
              </Box>
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{heading}</Typography>
          </Box>
          <ToggleButtonGroup exclusive size="small" value={sort} onChange={(_, v) => v && setSort(v)} aria-label={t("reports.Performance.sortBy")}>
            <ToggleButton value="revenue" sx={{ textTransform: "none", px: 1.5 }}>{t("reports.Performance.sortIncome")}</ToggleButton>
            <ToggleButton value="rentals" sx={{ textTransform: "none", px: 1.5 }}>{t("reports.Performance.sortRentals")}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {isLoading && <Box sx={{ p: 2 }}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />)}</Box>}

        {nothing && (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t("reports.Performance.emptyTitle")}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>{t("reports.Performance.emptyBody", { from: range.from, to: range.to })}</Typography>
            <Button variant="outlined" onClick={() => setRange({ from: addDaysLocal(todayLocalStr(), -89), to: todayLocalStr() })}>{t("reports.Performance.emptyAction")}</Button>
          </Box>
        )}

        {!isLoading && !nothing && earning.map((it) => (
          <Row key={it.key} item={it} share={pct(it.revenue, levelTotal)} max={earning[0]?.revenue || 1} onOpen={it.machine ? undefined : () => drill(it)} theme={theme} />
        ))}

        {!isLoading && !nothing && notEarning.length > 0 && (
          <>
            <ButtonBase onClick={() => setShowZero((v) => !v)} sx={{ width: "100%", justifyContent: "space-between", px: 2, py: 1.25, borderTop: 1, borderColor: "divider", textAlign: "left" }}>
              <Typography variant="body2" color="text.secondary">{t("reports.Performance.zeroSection", { count: notEarning.length })}</Typography>
              <ExpandMoreIcon fontSize="small" sx={{ transform: showZero ? "rotate(180deg)" : "none", color: "text.secondary" }} />
            </ButtonBase>
            <Collapse in={showZero} unmountOnExit>
              {notEarning.map((it) => <Row key={it.key} item={it} share={0} max={1} onOpen={it.machine ? undefined : () => drill(it)} theme={theme} muted />)}
            </Collapse>
          </>
        )}
      </Paper>
    </ReportShell>
  );
}

function Answer({ label, value, line, loading, tone }: { label: string; value: string; line: string; loading: boolean; tone?: "warning" | "error" }) {
  const theme = useTheme();
  const accent = tone === "warning" ? theme.palette.warning.main : tone === "error" ? theme.palette.error.main : theme.palette.primary.main;
  return (
    <Paper variant="outlined" sx={{ p: 2, borderLeft: `4px solid ${accent}` }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</Typography>
      {loading ? <Skeleton width="70%" height={36} /> : <Typography variant="h5" sx={{ fontWeight: 800, ...tabular, lineHeight: 1.25, wordBreak: "break-word" }}>{value}</Typography>}
      {loading ? <Skeleton width="50%" /> : <Typography variant="body2" color="text.secondary" sx={tabular}>{line}</Typography>}
    </Paper>
  );
}

function Row({ item, share, max, onOpen, theme, muted }: { item: Item; share: number; max: number; onOpen?: () => void; theme: Theme; muted?: boolean }) {
  const { t } = useTranslation();
  const width = Math.max(item.revenue > 0 ? 2 : 0, Math.round((item.revenue / max) * 100));
  const body = (
    <Box sx={{ width: "100%", px: 2, py: 1.25, display: "grid", gridTemplateColumns: "1fr auto", columnGap: 2, rowGap: 0.5, alignItems: "center", textAlign: "left" }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 700, color: muted ? "text.secondary" : "text.primary", wordBreak: "break-word" }}>{item.name}</Typography>
        <Typography variant="caption" color="text.secondary" sx={tabular}>{item.sub}</Typography>
      </Box>
      <Box sx={{ textAlign: "right", display: "flex", alignItems: "center", gap: 1 }}>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 800, ...tabular, whiteSpace: "nowrap", color: muted ? "text.secondary" : "text.primary" }}>{lkr(item.revenue)}</Typography>
          {share > 0 && <Typography variant="caption" color="text.secondary" sx={tabular}>{t("reports.Performance.shareLine", { pct: share })}</Typography>}
        </Box>
        {onOpen && <ChevronRightIcon fontSize="small" sx={{ color: "text.disabled" }} />}
      </Box>
      {item.revenue > 0 && (
        <Box sx={{ gridColumn: "1 / -1", height: 8, borderRadius: 4, bgcolor: theme.palette.action.hover, overflow: "hidden" }} aria-hidden>
          <Box sx={{ height: "100%", width: `${width}%`, bgcolor: "primary.main", borderRadius: 4 }} />
        </Box>
      )}
    </Box>
  );
  return onOpen ? (
    <ButtonBase onClick={onOpen} sx={{ display: "block", width: "100%", borderTop: 1, borderColor: "divider", "&:hover": { bgcolor: "action.hover" } }}>{body}</ButtonBase>
  ) : (
    <Box sx={{ borderTop: 1, borderColor: "divider" }}>{body}</Box>
  );
}
