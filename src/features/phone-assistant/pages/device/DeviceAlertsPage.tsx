import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { DeviceShell } from "../../components/DeviceShell";
import { isNativePhoneApp, nativeBridge, type NativeAlert } from "../../lib/nativeBridge";
import { usePullToRefresh } from "../../lib/usePullToRefresh";
import {
  countUnreadAlerts,
  getReadAlertIds,
  markAlertsRead,
  syncFreshness,
  useOnline,
  useSyncStatus,
} from "../../lib/phoneAppState";
import { getDeviceId } from "@/features/signatures/lib/deviceId";
import { useDeviceStatus } from "@/features/signatures/hooks/useSignatures";
import { useSetupWarningCount } from "../../lib/useSetupWarnings";
import { ACTIVITY_TYPE_META, DEFAULT_ACTIVITY_FILTERS } from "@/features/activity/constants";
import type {
  ActivityDatePreset,
  ActivityEvent,
  ActivityEventType,
  ActivityFilterState,
} from "@/features/activity/types";
import {
  ACTIVITY_KEYS,
  useActivityList,
  useActivitySummary,
  useMarkActivityRead,
} from "@/features/activity/hooks/useActivityHooks";
import { ActivityTypeIcon } from "@/features/activity/components/ActivityTypeIcon";
import { ActivityCharts } from "@/features/activity/components/ActivityCharts";
import { ActivityFiltersBar } from "@/features/activity/components/ActivityFiltersBar";
import { ActivityEventRow } from "@/features/activity/components/ActivityEventRow";
import { formatDisplayDate } from "@/lib/dates";
import { useDeviceCallsToNote } from "../../hooks/useDeviceCalls";
import { localDay } from "../../lib/callFormat";

const READ_BATCH_MS = 600;

/** The phone's own calendar day of an event (the server sends UTC). */
const eventDay = (ev: ActivityEvent): string => {
  const date = new Date(ev.occurred_at || ev.created_at || "");
  return Number.isNaN(date.getTime()) ? "unknown" : localDay(0, date);
};

const DATE_PRESETS: Array<{ key: ActivityDatePreset; labelKey: string }> = [
  { key: "today", labelKey: "time.today" },
  { key: "yesterday", labelKey: "time.yesterday" },
  { key: "this_week", labelKey: "activity.dates.thisWeek" },
  { key: "last_7_days", labelKey: "activity.dates.last7Days" },
  { key: "this_month", labelKey: "activity.dates.thisMonth" },
  { key: "custom", labelKey: "activity.dates.custom" },
];

function FallbackAlertRow({
  alert,
  isUnread,
  onSeen,
  onOpen,
}: {
  alert: NativeAlert;
  isUnread: boolean;
  onSeen: (id: string) => void;
  onOpen: (a: NativeAlert) => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isUnread) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          onSeen(alert.id);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [alert.id, isUnread, onSeen]);

  return (
    <Paper
      ref={ref}
      variant="outlined"
      component="button"
      type="button"
      onClick={() => {
        onSeen(alert.id);
        onOpen(alert);
      }}
      sx={{
        p: 1.5,
        borderRadius: 2,
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
        minHeight: 56,
        bgcolor: "background.paper",
        color: "text.primary",
        font: "inherit",
        borderColor: isUnread ? "warning.main" : "divider",
      }}
    >
      <Typography sx={{ fontWeight: isUnread ? 800 : 600 }}>{alert.title}</Typography>
      {alert.body && (
        <Typography variant="body2" color="text.secondary">
          {alert.body}
        </Typography>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontVariantNumeric: "tabular-nums" }}
      >
        {new Date(alert.receivedAt).toLocaleString()}
      </Typography>
    </Paper>
  );
}

/**
 * Landing screen for a paired, set-up phone (spec §4, §8.1).
 * Rebuilt on /api/device/activity and /api/device/activity/summary with
 * date chips, 2-column type tiles, stacked bar + donut + per-staff charts,
 * not-checked chip, filters sheet, totals strip, and day-grouped rows with
 * Checked ticks and expandable comments.
 */
export function DeviceAlertsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const online = useOnline();
  const { status: sync } = useSyncStatus();
  const freshness = syncFreshness(sync);
  const setupWarnings = useSetupWarningCount();

  const [filters, setFilters] = useState<ActivityFilterState>(DEFAULT_ACTIVITY_FILTERS);
  const [page, setPage] = useState(1);
  const [alerts, setAlerts] = useState<NativeAlert[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadAlertIds());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!deviceId) {
      navigate({ to: "/pair", replace: true });
    }
  }, [deviceId, navigate]);

  const status = useDeviceStatus(deviceId, { refetchInterval: 30_000 });
  const shopInactive = status.data?.shop_inactive === true;
  const deviceStatus = status.data?.device_status ?? "ACTIVE";
  const isDeviceActive = deviceStatus === "ACTIVE" && !shopInactive;
  const activityEnabled = Boolean(deviceId) && isDeviceActive && online;

  // Tiles and charts cover every type in the period, so a tapped tile doesn't hide the others.
  const periodFilters = useMemo(() => ({ ...filters, types: [] }), [filters]);
  const summaryQuery = useActivitySummary(periodFilters, activityEnabled, "device");
  const filteredSummaryQuery = useActivitySummary(filters, activityEnabled, "device");
  const listQuery = useActivityList(filters, page, 50, activityEnabled, "device");
  const { mutate: markRead } = useMarkActivityRead("device");
  const toNote = useDeviceCallsToNote(activityEnabled);

  // Rows report "seen" one at a time while scrolling; send them together.
  const readQueue = useRef(new Set<number>());
  const readTimer = useRef<number | undefined>(undefined);
  const flushRead = useCallback(() => {
    window.clearTimeout(readTimer.current);
    readTimer.current = undefined;
    const ids = [...readQueue.current];
    readQueue.current.clear();
    if (ids.length) markRead(ids);
  }, [markRead]);
  const queueRead = useCallback(
    (id: number) => {
      readQueue.current.add(id);
      readTimer.current ??= window.setTimeout(flushRead, READ_BATCH_MS);
    },
    [flushRead],
  );
  useEffect(() => flushRead, [flushRead]);

  const patchFilters = (patch: Partial<ActivityFilterState>) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const resetFilters = () => {
    setPage(1);
    setFilters(DEFAULT_ACTIVITY_FILTERS);
  };

  const load = useCallback(async () => {
    const next = await nativeBridge.getAlerts().catch(() => []);
    setAlerts(next);
    setReadIds(getReadAlertIds());
    setLastUpdatedAt(new Date());
    void queryClient.invalidateQueries({ queryKey: ACTIVITY_KEYS.all });
    void queryClient.invalidateQueries({ queryKey: ["device-status"] });
  }, [queryClient]);

  useEffect(() => {
    void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const { pull, refreshing } = usePullToRefresh(load);

  const handleFallbackSeen = useCallback((id: string) => {
    markAlertsRead([id]);
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const summary = summaryQuery.data;
  const listData = listQuery.data;
  // The alerts saved on the phone stand in when the feed can't be read.
  const useFallback = !activityEnabled || listQuery.isError;

  const events = listData?.events ?? [];
  const seeAmounts = listData?.see_amounts ?? summary?.see_amounts ?? true;
  const canCheck = summary?.can_check === true;
  const totals = filteredSummaryQuery.data?.totals ?? listData?.totals ?? {
    count: events.length,
    amount: events.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    high_count: events.filter((e) => e.risk === "high").length,
    not_checked_count: events.filter((e) => !e.checked_at).length,
  };

  const notCheckedCount = summary?.not_checked_count ?? totals.not_checked_count ?? 0;
  const highNotCheckedCount = summary?.high_not_checked_count ?? 0;

  const groupedByDay = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const ev of events) {
      const dayKey = eventDay(ev);
      const arr = map.get(dayKey) ?? [];
      arr.push(ev);
      map.set(dayKey, arr);
    }
    return Array.from(map.entries());
  }, [events]);

  const staffOptions = useMemo(
    () =>
      (summary?.by_staff ?? []).map((s) => ({
        user_id: s.user_id,
        name: s.name,
      })),
    [summary?.by_staff],
  );

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

  // The shell shows the feed's own unread count; this covers the offline list.
  const unreadCount = useMemo(() => countUnreadAlerts(alerts, readIds), [alerts, readIds]);

  const openFallbackAlert = (a: NativeAlert) => {
    if (a.invoiceId) {
      navigate({
        to: "/device/invoice/$id",
        params: { id: a.invoiceId },
        ...(a.eventId ? { search: { from: a.eventId } as any } : {}),
      });
    }
  };

  return (
    <DeviceShell active="alerts" title={t("phoneShell.tab_alerts")} unreadCount={unreadCount}>
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
        {(pull > 0 || refreshing) && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
            {refreshing ? t("phoneShell.refreshing") : t("phoneShell.pullToRefresh")}
          </Typography>
        )}

        {/* Compact status strip & updated indicator */}
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
          <Chip size="small" color="success" label={t("phoneShell.home.paired")} />
          <Chip
            size="small"
            color={deviceStatus === "ACTIVE" ? "success" : "warning"}
            label={
              deviceStatus === "ACTIVE"
                ? t("phoneShell.home.approved")
                : t(`phoneAssistant.deviceStatus.${deviceStatus}`)
            }
          />
          {isNativePhoneApp() && (
            <Chip
              size="small"
              color={freshness === "fresh" ? "success" : freshness === "stale" ? "warning" : "default"}
              label={t(`phoneShell.sync.state_${freshness}`)}
            />
          )}
          {lastUpdatedAt && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: "auto", fontVariantNumeric: "tabular-nums" }}
            >
              {t("phoneShell.alerts.updatedJustNow")}
            </Typography>
          )}
        </Box>

        {/* M1 Setup warnings banner */}
        {setupWarnings > 0 && (
          <Alert
            severity="warning"
            sx={{ borderRadius: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() =>
                  navigate({ to: "/device/settings/$section", params: { section: "setup" } })
                }
                sx={{ minHeight: 40 }}
              >
                {t("phoneShell.home.fix")}
              </Button>
            }
          >
            {t("phoneShell.home.setupWarnings", { count: setupWarnings })}
          </Alert>
        )}

        {online && listQuery.isError && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {t("phoneShell.alerts.feedUnavailable")}
          </Alert>
        )}

        {activityEnabled && (toNote.data?.total ?? 0) > 0 && (
          <Chip
            data-testid="device-calls-to-note-chip"
            clickable
            color="warning"
            label={t("phoneShell.toNote.chip", { count: toNote.data!.total })}
            onClick={() => navigate({ to: "/device/calls" })}
            sx={{ alignSelf: "flex-start", fontWeight: 800, minHeight: 40, fontVariantNumeric: "tabular-nums" }}
          />
        )}

        {/* 1. Date filter chips */}
        <Box
          data-testid="device-alerts-date-chips"
          sx={{ display: "flex", gap: 0.75, overflowX: "auto", flexWrap: "nowrap", pb: 0.25 }}
        >
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
                sx={{ fontWeight: 700, flexShrink: 0, minHeight: 36 }}
              />
            );
          })}
        </Box>

        {filters.preset === "custom" && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              type="date"
              size="small"
              value={filters.from ?? ""}
              onChange={(e) => patchFilters({ from: e.target.value })}
              slotProps={{ htmlInput: { "aria-label": t("activity.dates.from") } }}
              sx={{ flex: 1, minWidth: 130 }}
            />
            <TextField
              type="date"
              size="small"
              value={filters.to ?? ""}
              onChange={(e) => patchFilters({ to: e.target.value })}
              slotProps={{ htmlInput: { "aria-label": t("activity.dates.to") } }}
              sx={{ flex: 1, minWidth: 130 }}
            />
          </Box>
        )}

        {/* 2. 2-column type tiles (spec §8.1 phone layout) */}
        {!useFallback && summary && (
          <Box
            data-testid="device-alerts-type-tiles"
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1,
            }}
          >
            {(summary.by_type ?? []).map((tile) => {
              const meta = ACTIVITY_TYPE_META[tile.type] ?? ACTIVITY_TYPE_META.system;
              const selected = filters.types.includes(tile.type);
              return (
                <Paper
                  key={tile.type}
                  data-testid={`device-type-tile-${tile.type}`}
                  variant="outlined"
                  component="button"
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleTileTap(tile.type)}
                  sx={{
                    textAlign: "left",
                    font: "inherit",
                    color: "text.primary",
                    minWidth: 0,
                    p: 1.25,
                    borderRadius: 2.5,
                    cursor: "pointer",
                    position: "relative",
                    borderColor: selected ? meta.color : "divider",
                    borderWidth: selected ? 2 : 1,
                    bgcolor: selected
                      ? alpha(meta.color, isDark ? 0.16 : 0.08)
                      : "background.paper",
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        bgcolor: isDark ? meta.darkBg : meta.bg,
                        color: meta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
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
                      fontSize: "1.15rem",
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
        )}

        {/* 3. Full-width stacked bar chart + donut + per-staff bars */}
        {!useFallback && !summaryQuery.isLoading && summary && (
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

        {/* 4. Highlighted "N not checked, M high" chip */}
        {!useFallback && notCheckedCount > 0 && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Chip
              data-testid="device-not-checked-highlight"
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

        {/* 5. Horizontal-scroll type chips + Filters sheet */}
        {!useFallback && (
          <ActivityFiltersBar
            filters={filters}
            onChange={patchFilters}
            onReset={resetFilters}
            staffOptions={staffOptions}
          />
        )}

        {/* 6. Totals strip */}
        {!useFallback && (
          <Paper
            data-testid="device-alerts-totals-strip"
            variant="outlined"
            sx={{
              px: 1.5,
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
            <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
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
        )}

        {/* 7. Day-grouped event list or offline/fallback local alert list */}
        {useFallback ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {alerts.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", mt: 3 }}>
                {t("phoneShell.alerts.empty")}
              </Typography>
            ) : (
              alerts.map((a) => (
                <FallbackAlertRow
                  key={a.id}
                  alert={a}
                  isUnread={!readIds.has(a.id)}
                  onSeen={handleFallbackSeen}
                  onOpen={openFallbackAlert}
                />
              ))
            )}
          </Box>
        ) : listQuery.isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={26} />
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
                    px: 1.5,
                    py: 0.75,
                    bgcolor: alpha(theme.palette.text.primary, 0.04),
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {dayKey === "unknown" ? "" : formatDisplayDate(dayKey)}
                  </Typography>
                </Box>
                {dayEvents.map((ev) => (
                  <ActivityEventRow
                    key={ev.event_id}
                    event={ev}
                    seeAmounts={seeAmounts}
                    canCheck={canCheck}
                    apiMode="device"
                    onMarkRead={queueRead}
                    onOpenBill={(invoiceId) =>
                      navigate({
                        to: "/device/invoice/$id",
                        params: { id: String(invoiceId) },
                        search: { from: String(ev.event_id) } as any,
                      })
                    }
                  />
                ))}
              </Box>
            ))}
          </Paper>
        )}

        {/* Pagination */}
        {!useFallback && listData && listData.total > listData.limit && (
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
    </DeviceShell>
  );
}
