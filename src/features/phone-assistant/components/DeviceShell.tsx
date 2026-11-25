import { useEffect, type ReactNode } from "react";
import { Alert, Badge, BottomNavigation, BottomNavigationAction, Box, Paper, Typography } from "@mui/material";
import PhoneCallbackOutlinedIcon from "@mui/icons-material/PhoneCallbackOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getDeviceId } from "@/features/signatures/lib/deviceId";
import { isRequestFinished, useDeviceManifest, useScreenWakeLock } from "@/features/signatures/lib/deviceShell";
import { useDeviceStatus, useDevicePendingSignatures } from "@/features/signatures/hooks/useSignatures";
import { useDevicePendingPhotos } from "@/features/equipment/hooks/useEquipmentPhoto";
import {
  installWebBackOverlayHandler,
  useAppPrefs,
  useApplyAppPrefs,
  useOnline,
  useSyncNativeStatusBar,
  useUnreadAlertCount,
} from "../lib/phoneAppState";

export type DeviceTab = "alerts" | "calls" | "app" | "settings" | "home";

interface Props {
  active: DeviceTab;
  title?: string;
  children: ReactNode;
  /** Alerts / Home may show a custom header band, so the shell skips the title bar there. */
  hideTitle?: boolean;
  /** Optional override for unread badge count when caller already holds the alerts list. */
  unreadCount?: number;
}

/**
 * Frame for every phone page: four-tab bottom navigation (Alerts first), an offline banner,
 * the phone's text size, language and status bar theme, and the signature / photo takeover.
 */
export function DeviceShell({ active, title, children, hideTitle, unreadCount: unreadProp }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deviceId = getDeviceId();
  const online = useOnline();
  const { prefs } = useAppPrefs();
  useApplyAppPrefs(prefs);
  useSyncNativeStatusBar();
  installWebBackOverlayHandler();
  useDeviceManifest();
  useScreenWakeLock(Boolean(deviceId));
  const { count: liveUnread } = useUnreadAlertCount();
  const unreadCount = unreadProp ?? liveUnread;

  const status = useDeviceStatus(deviceId, { refetchInterval: 30_000 });
  const live = status.data?.paired === true && (status.data?.device_status ?? "ACTIVE") === "ACTIVE" && !status.data?.shop_inactive;
  const pending = useDevicePendingSignatures(deviceId, { enabled: live });
  const pendingPhotos = useDevicePendingPhotos(deviceId, { enabled: live });

  useEffect(() => {
    const first = pending.data?.pending?.find((p) => p.token && !isRequestFinished(p.token));
    if (first?.token) navigate({ to: "/sign-paired/$token", params: { token: first.token }, replace: true });
  }, [pending.data?.pending, navigate]);

  useEffect(() => {
    const next = pendingPhotos.data?.pending?.find((p) => p.token && !isRequestFinished(p.token));
    if (next?.token) navigate({ to: "/photo/$token", params: { token: next.token }, replace: true });
  }, [pendingPhotos.data?.pending, navigate]);

  const activeTab = active === "home" ? "alerts" : active;

  const go = (tab: DeviceTab) => {
    if (tab === "alerts" || tab === "home") navigate({ to: "/device/alerts" });
    else if (tab === "calls") navigate({ to: "/device/calls" });
    else if (tab === "settings") navigate({ to: "/device/settings" });
    else navigate({ to: "/device/app" });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary", display: "flex", flexDirection: "column", pb: "72px" }}>
      {!online && (
        <Alert severity="warning" icon={false} sx={{ borderRadius: 0, py: 0.25, justifyContent: "center", fontVariantNumeric: "tabular-nums" }} role="status">
          {t("phoneShell.offlineBanner")}
        </Alert>
      )}
      {!hideTitle && title && (
        <Box sx={{ px: 2, pt: 2, pb: 0.5 }}>
          <Typography component="h1" sx={{ fontWeight: 800, fontSize: 22 }}>{title}</Typography>
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</Box>
      <Paper
        component="nav"
        aria-label={t("phoneShell.navLabel")}
        elevation={8}
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200, borderTop: 1, borderColor: "divider" }}
      >
        <BottomNavigation
          showLabels
          value={activeTab}
          onChange={(_e, v: DeviceTab) => go(v)}
          sx={{ height: 64, bgcolor: "background.paper", "& .MuiBottomNavigationAction-root": { minWidth: 0, minHeight: 56, px: 0.5 } }}
        >
          <BottomNavigationAction
            value="alerts"
            label={t("phoneShell.tab_alerts")}
            icon={
              <Badge
                badgeContent={unreadCount}
                color="warning"
                max={99}
                sx={{ "& .MuiBadge-badge": { fontVariantNumeric: "tabular-nums" } }}
              >
                <NotificationsNoneOutlinedIcon />
              </Badge>
            }
          />
          <BottomNavigationAction value="calls" label={t("phoneShell.tab_calls")} icon={<PhoneCallbackOutlinedIcon />} />
          <BottomNavigationAction value="app" label={t("phoneShell.tab_app")} icon={<AppsOutlinedIcon />} />
          <BottomNavigationAction value="settings" label={t("phoneShell.tab_settings")} icon={<SettingsOutlinedIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
