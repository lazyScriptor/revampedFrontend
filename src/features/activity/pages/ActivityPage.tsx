import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  ACTIVITY_TYPE_META,
  DEFAULT_ACTIVITY_FILTERS,
} from "../constants";
import type {
  ActivityDatePreset,
  ActivityEvent,
  ActivityEventType,
  ActivityFilterState,
} from "../types";
import {
  useActivityList,
  useActivitySummary,
  useCreateSavedActivityFilter,
  useDeleteSavedActivityFilter,
  useMarkActivityRead,
  useSavedActivityFilters,
} from "../hooks/useActivityHooks";
import { exportActivityExcel } from "../api/activityApi";
import { ActivityTypeIcon } from "../components/ActivityTypeIcon";
import { ActivityCharts } from "../components/ActivityCharts";
import { ActivityFiltersBar } from "../components/ActivityFiltersBar";
import { ActivityEventRow } from "../components/ActivityEventRow";
import { formatDisplayDate } from "@/lib/dates";

const DATE_PRESETS: Array<{ key: ActivityDatePreset; labelKey: string }> = [
  { key: "today", labelKey: "time.today" },
  { key: "yesterday", labelKey: "time.yesterday" },
  { key: "this_week", labelKey: "activity.dates.thisWeek" },
  { key: "last_7_days", labelKey: "activity.dates.last7Days" },
  { key: "this_month", labelKey: "activity.dates.thisMonth" },
  { key: "custom", labelKey: "activity.dates.custom" },
];

export default function ActivityPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCheck = hasPermission("activity:check");

  const [filters, setFilters] = useState<ActivityFilterState>(DEFAULT_ACTIVITY_FILTERS);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const patchFilters = (patch: Partial<ActivityFilterState>) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const resetFilters = () => {
    setPage(1);
    setFilters(DEFAULT_ACTIVITY_FILTERS);
  };

  const { data: summary, isLoading: loadingSummary } = useActivitySummary(filters);
  const { data: listData, isLoading: loadingList } = useActivityList(filters, page, 50);
  const { data: savedFilters = [] } = useSavedActivityFilters();
  const createSaved = useCreateSavedActivityFilter();
  const deleteSaved = useDeleteSavedActivityFilter();
  const markRead = useMarkActivityRead();

  const seeAmounts = listData?.see_amounts ?? summary?.see_amounts ?? true;
  const events = listData?.events ?? [];
  const totals = listData?.totals ?? {
    count: events.length,
    amount: events.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    high_count: events.filter((e) => e.risk === "high").length,
    not_checked_count: events.filter((e) => !e.checked_at).length,
  };

  // Group events by local day
  const groupedByDay = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const ev of events) {
      const dayKey = String(ev.occurred_at || ev.created_at || "").slice(0, 10) || "unknown";
      const arr = map.get(dayKey) ?? [];
      arr.push(ev);
      map.set(dayKey, arr);
    }
    return Array.from(map.entries());
  }, [events]);

  const handleTileTap = (type: ActivityEventType) => {
    const isOnlyThis = filters.types.length === 1 && filters.types[0] === type;
    patchFilters({ types: isOnlyThis ? [] : [type] });
  };

  const handleBarTap = (date: string) => {
    if (filters.from === date && filters.to === date) {
      patchFilters({ from: undefined, to: undefined });
    } else {
      patchFilters({ from: date, to: date });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportActivityExcel(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-${filters.preset}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const staffOptions = useMemo(
    () =>
      (summary?.by_staff ?? []).map((s) => ({
        user_id: s.user_id,
        name: s.name,
      })),
    [summary?.by_staff],
  );

  const notCheckedCount = summary?.not_checked_count ?? totals.not_checked_count ?? 0;
  const highNotCheckedCount = summary?.high_not_checked_count ?? 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 4, minWidth: 0 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
            {t("activity.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("activity.subtitle")}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
          onClick={handleExport}
          disabled={exporting}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
        >
          {t("activity.exportExcel")}
        </Button>
      </Box>

      {/* 1. Date chips (drives everything below) */}
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
        {DATE_PRESETS.map((p) => {
          const active = filters.preset === p.key;
          return (
            <Chip
              key={p.key}
              label={t(p.labelKey)}
              clickable
              onClick={() =>
                patchFilters({
                  preset: p.key,
                  ...(p.key !== "custom" ? { from: undefined, to: undefined } : {}),
                })
              }
              color={active ? "warning" : "default"}
              variant={active ? "filled" : "outlined"}
              sx={{ fontWeight: 700 }}
            />
          );
        })}
        {filters.preset === "custom" && (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <TextField
              type="date"
              size="small"
              value={filters.from ?? ""}
              onChange={(e) => patchFilters({ from: e.target.value })}
              slotProps={{ htmlInput: { "aria-label": t("activity.dates.from") } }}
            />
            <TextField
              type="date"
              size="small"
              value={filters.to ?? ""}
              onChange={(e) => patchFilters({ to: e.target.value })}
              slotProps={{ htmlInput: { "aria-label": t("activity.dates.to") } }}
            />
          </Box>
        )}
      </Box>

      {/* 2. Type tiles */}
      <Box
        data-testid="activity-type-tiles"
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            md: "repeat(6, minmax(0, 1fr))",
          },
          gap: 1.25,
        }}
      >
        {(summary?.by_type ?? []).map((tile) => {
          const meta = ACTIVITY_TYPE_META[tile.type] ?? ACTIVITY_TYPE_META.system;
          const selected = filters.types.includes(tile.type);
          return (
            <Paper
              key={tile.type}
              data-testid={`type-tile-${tile.type}`}
              variant="outlined"
              onClick={() => handleTileTap(tile.type)}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                cursor: "pointer",
                position: "relative",
                borderColor: selected ? meta.color : "divider",
                borderWidth: selected ? 2 : 1,
                bgcolor: selected
                  ? alpha(meta.color, isDark ? 0.16 : 0.08)
                  : "background.paper",
                transition: "all 0.15s",
                "&:hover": { borderColor: meta.color },
              }}
            >
              {tile.high_count > 0 && (
                <Chip
                  size="small"
                  color="error"
                  label={`${tile.high_count} ${t("activity.high")}`}
                  sx={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    height: 18,
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    bgcolor: isDark ? meta.darkBg : meta.bg,
                    color: meta.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityTypeIcon type={tile.type} fontSize="small" />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }} noWrap>
                  {t(meta.labelKey)}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                {tile.count}
              </Typography>
              {seeAmounts && meta.hasAmount && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Rs. {Number(tile.amount || 0).toLocaleString()}
                </Typography>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* 3. Stacked bar chart + Donut + Per-staff bars */}
      {!loadingSummary && summary && (
        <ActivityCharts
          buckets={summary.buckets}
          granularity={summary.granularity}
          byType={summary.by_type}
          notCheckedCount={notCheckedCount}
          byStaff={summary.by_staff}
          canCheck={canCheck}
          onBarTap={handleBarTap}
          activeDay={filters.from && filters.from === filters.to ? filters.from : undefined}
        />
      )}

      {/* 4. Not-checked highlighted chip */}
      {notCheckedCount > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            data-testid="not-checked-highlight"
            clickable
            icon={<WarningAmberIcon />}
            color="warning"
            variant={filters.checked === "not_checked" ? "filled" : "outlined"}
            label={t("activity.notCheckedSummary", {
              count: notCheckedCount,
              high: highNotCheckedCount,
            })}
            onClick={() =>
              patchFilters({
                checked: filters.checked === "not_checked" ? "all" : "not_checked",
              })
            }
            sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
          />
        </Box>
      )}

      {/* 5. Filters bar */}
      <ActivityFiltersBar
        filters={filters}
        onChange={patchFilters}
        onReset={resetFilters}
        staffOptions={staffOptions}
        savedFilters={savedFilters}
        onSaveFilter={(name) => createSaved.mutate({ name, filters })}
        onDeleteSavedFilter={(id) => deleteSaved.mutate(id)}
        onApplySavedFilter={(sf) => {
          setPage(1);
          setFilters(sf.filters);
        }}
      />

      {/* 6. Totals strip */}
      <Paper
        data-testid="activity-totals-strip"
        variant="outlined"
        sx={{
          px: 2,
          py: 1,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
        >
          {seeAmounts
            ? t("activity.totalsStripWithAmount", {
                count: totals.count,
                amount: Number(totals.amount || 0).toLocaleString(),
              })
            : t("activity.totalsStripCount", { count: totals.count })}
        </Typography>
        {totals.high_count > 0 && (
          <Typography
            variant="caption"
            color="error.main"
            sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
          >
            {t("activity.highCountLabel", { count: totals.high_count })}
          </Typography>
        )}
      </Paper>

      {/* 7. Filtered list grouped by day */}
      {loadingList ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress size={28} />
        </Box>
      ) : groupedByDay.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {t("activity.emptyFiltered")}
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
          {groupedByDay.map(([dayKey, dayEvents]) => (
            <Box key={dayKey}>
              <Box
                sx={{
                  px: 2,
                  py: 0.75,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, fontVariantNumeric: "tabular-nums" }}
                >
                  {dayKey === "unknown"
                    ? ""
                    : formatDisplayDate(dayKey)}
                </Typography>
              </Box>
              {dayEvents.map((ev) => (
                <ActivityEventRow
                  key={ev.event_id}
                  event={ev}
                  seeAmounts={seeAmounts}
                  canCheck={canCheck}
                  onMarkRead={(id) => markRead.mutate([id])}
                  onOpenBill={(invoiceId) =>
                    navigate({
                      to: "/invoices",
                      search: { mode: "manage", invoiceId } as any,
                    })
                  }
                />
              ))}
            </Box>
          ))}
        </Paper>
      )}

      {/* Pagination */}
      {listData && listData.total > listData.limit && (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("common.previous")}
          </Button>
          <Typography variant="body2" sx={{ alignSelf: "center", fontVariantNumeric: "tabular-nums" }}>
            {page} / {Math.ceil(listData.total / listData.limit)}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            disabled={page * listData.limit >= listData.total}
            onClick={() => setPage((p) => p + 1)}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("common.next")}
          </Button>
        </Box>
      )}
    </Box>
  );
}
