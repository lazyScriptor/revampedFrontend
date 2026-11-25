import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Typography } from "@mui/material";
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
import { useDevicePendingSignatures, useDeviceStatus } from "@/features/signatures/hooks/useSignatures";
import { useDevicePendingPhotos } from "@/features/equipment/hooks/useEquipmentPhoto";
import { useDeviceFollowUps, useDeviceMissedCalls } from "../../hooks/useCalls";
import { useSetupWarningCount } from "../../lib/useSetupWarnings";

const GROUPS = ["all", "bills", "payments", "returns", "alerts", "digest"] as const;

function AlertRow({
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
 * Landing screen for a paired, set-up phone.
 * Shows pairing/setup status & today's summary tiles at the top, then the alert list.
 * Tapping an alert opens /device/invoice/$id for everyone (signed in or out).
 */
export function DeviceAlertsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  const online = useOnline();
  const { status: sync } = useSyncStatus();
  const freshness = syncFreshness(sync);
  const setupWarnings = useSetupWarningCount();

  const [alerts, setAlerts] = useState<NativeAlert[]>([]);
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("all");
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
  const pending = useDevicePendingSignatures(deviceId, {
    enabled: status.data?.paired === true && isDeviceActive,
  });
  const pendingPhotos = useDevicePendingPhotos(deviceId, {
    enabled: status.data?.paired === true && isDeviceActive,
  });
  const missed = useDeviceMissedCalls(50, isDeviceActive && online);
  const followUps = useDeviceFollowUps({ status: "pending", limit: 50 }, isDeviceActive && online);

  const load = useCallback(async () => {
    const next = await nativeBridge.getAlerts();
    setAlerts(next);
    setReadIds(getReadAlertIds());
    setLastUpdatedAt(new Date());
    void queryClient.invalidateQueries({ queryKey: ["device-missed-calls"] });
    void queryClient.invalidateQueries({ queryKey: ["device-follow-ups"] });
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

  const handleSeen = useCallback((id: string) => {
    markAlertsRead([id]);
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const unreadCount = useMemo(() => countUnreadAlerts(alerts, readIds), [alerts, readIds]);
  const shown = alerts.filter((a) => group === "all" || a.group === group);

  const open = (a: NativeAlert) => {
    if (a.invoiceId) {
      navigate({
        to: "/device/invoice/$id",
        params: { id: a.invoiceId },
        ...(a.eventId ? { search: { from: a.eventId } as any } : {}),
      });
    }
  };

  const waitingRequests =
    (pending.data?.pending ?? []).length + (pendingPhotos.data?.pending ?? []).length;

  return (
    <DeviceShell active="alerts" title={t("phoneShell.tab_alerts")} unreadCount={unreadCount}>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
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

        {/* Today's small summary tiles moved from old Home */}
        {isDeviceActive && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Paper
              variant="outlined"
              component="button"
              type="button"
              onClick={() => navigate({ to: "/device/calls" })}
              sx={{
                flex: 1,
                p: 1,
                borderRadius: 2,
                textAlign: "center",
                cursor: "pointer",
                bgcolor: "background.paper",
                color: "text.primary",
                font: "inherit",
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>
                {(missed.data?.items ?? []).length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("phoneShell.home.missed")}
              </Typography>
            </Paper>
            <Paper
              variant="outlined"
              component="button"
              type="button"
              onClick={() => navigate({ to: "/device/calls" })}
              sx={{
                flex: 1,
                p: 1,
                borderRadius: 2,
                textAlign: "center",
                cursor: "pointer",
                bgcolor: "background.paper",
                color: "text.primary",
                font: "inherit",
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>
                {(followUps.data?.items ?? []).length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("phoneShell.home.followUps")}
              </Typography>
            </Paper>
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                p: 1,
                borderRadius: 2,
                textAlign: "center",
                bgcolor: "background.paper",
                color: "text.primary",
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 18, fontVariantNumeric: "tabular-nums" }}>
                {waitingRequests}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("phoneShell.home.requests")}
              </Typography>
            </Paper>
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 1, overflowX: "auto", flexWrap: "nowrap", pb: 0.5 }}>
          {GROUPS.map((g) => (
            <Chip
              key={g}
              label={t(`phoneShell.alerts.group_${g}`)}
              color={group === g ? "primary" : "default"}
              variant={group === g ? "filled" : "outlined"}
              onClick={() => setGroup(g)}
              sx={{ minHeight: 40, flexShrink: 0 }}
            />
          ))}
        </Box>

        {shown.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            {t("phoneShell.alerts.empty")}
          </Typography>
        )}

        {shown.map((a) => (
          <AlertRow
            key={a.id}
            alert={a}
            isUnread={!readIds.has(a.id)}
            onSeen={handleSeen}
            onOpen={open}
          />
        ))}

        {alerts.length > 0 && (
          <Button
            size="small"
            onClick={async () => {
              await nativeBridge.clearAlerts();
              await load();
            }}
            sx={{ alignSelf: "center", textTransform: "none" }}
          >
            {t("phoneShell.alerts.clear")}
          </Button>
        )}
      </Box>
    </DeviceShell>
  );
}
