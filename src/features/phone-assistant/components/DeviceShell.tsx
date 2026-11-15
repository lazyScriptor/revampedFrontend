import { useEffect, type ReactNode } from "react";
import { Alert, BottomNavigation, BottomNavigationAction, Box, Paper, Typography } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
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
import { useAppPrefs, useApplyAppPrefs, useOnline } from "../lib/phoneAppState";

export type DeviceTab = "home" | "calls" | "alerts" | "app" | "settings";

interface Props {
  active: DeviceTab;
  title?: string;
  children: ReactNode;
  /** Home shows its own header band, so the shell skips the title bar there. */
  hideTitle?: boolean;
}

/**
 * Frame for every phone page: five-tab bottom navigation, an offline banner, the phone's text size and
 * language, and the signature / photo takeover (a request from the counter opens from any tab).
 */
export function DeviceShell({ active, title, children, hideTitle }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deviceId = getDeviceId();
  const online = useOnline();
  const { prefs } = useAppPrefs();
  useApplyAppPrefs(prefs);
  useDeviceManifest();
  useScreenWakeLock(Boolean(deviceId));

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

  const go = (tab: DeviceTab) => {
    if (tab === "home") navigate({ to: "/device" });
    else if (tab === "calls") navigate({ to: "/device/calls" });
    else if (tab === "alerts") navigate({ to: "/device/alerts" });
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
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>{children}</Box>
      <Paper
        component="nav"
        aria-label={t("phoneShell.navLabel")}
        elevation={8}
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200, borderTop: 1, borderColor: "divider" }}
      >
        <BottomNavigation
          showLabels
          value={active}
          onChange={(_e, v: DeviceTab) => go(v)}
          sx={{ height: 64, bgcolor: "background.paper", "& .MuiBottomNavigationAction-root": { minWidth: 0, minHeight: 56, px: 0.5 } }}
        >
          <BottomNavigationAction value="home" label={t("phoneShell.tab_home")} icon={<HomeOutlinedIcon />} />
          <BottomNavigationAction value="calls" label={t("phoneShell.tab_calls")} icon={<PhoneCallbackOutlinedIcon />} />
          <BottomNavigationAction value="alerts" label={t("phoneShell.tab_alerts")} icon={<NotificationsNoneOutlinedIcon />} />
          <BottomNavigationAction value="app" label={t("phoneShell.tab_app")} icon={<AppsOutlinedIcon />} />
          <BottomNavigationAction value="settings" label={t("phoneShell.tab_settings")} icon={<SettingsOutlinedIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
