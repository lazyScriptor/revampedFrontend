import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DeviceShell } from "../../components/DeviceShell";
import { useDevicePolicy } from "../../hooks/useShopDevices";
import { startFullApp } from "../../lib/openGearGrid";

/**
 * The GearGrid tab. Opens the full application in this window when the shop and an administrator allow it
 * on this phone; otherwise it says why. Sign-in is separate from pairing: signing out never unpairs.
 */
export function DeviceAppGatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const policy = useDevicePolicy(true);
  const [lockFailed, setLockFailed] = useState(false);
  const [starting, setStarting] = useState(false);

  const allowed = policy.data?.effective_capabilities?.full_app === true;
  const reason = policy.data?.capability_reasons?.full_app ?? null;

  const open = async () => {
    setStarting(true);
    setLockFailed(false);
    const ok = await startFullApp(navigate);
    setStarting(false);
    if (!ok) setLockFailed(true);
  };

  useEffect(() => {
    if (allowed) void open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  return (
    <DeviceShell active="app" title={t("phoneShell.tab_app")}>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, alignItems: "center", textAlign: "center", mt: 4 }}>
        {policy.isLoading && <CircularProgress />}
        {policy.isError && <Alert severity="warning">{t("phoneShell.app.offline")}</Alert>}
        {policy.data && !allowed && (
          <>
            <LockOutlinedIcon sx={{ fontSize: 48, color: "text.secondary" }} />
            <Typography sx={{ fontWeight: 800 }}>{t("phoneShell.app.notAllowedTitle")}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t(`phoneShell.app.reason_${reason ?? "not_granted"}`, { defaultValue: t("phoneShell.app.reason_not_granted") })}
            </Typography>
          </>
        )}
        {allowed && (
          <>
            {starting && <CircularProgress />}
            {lockFailed && (
              <>
                <Alert severity="warning">{t("phoneShell.app.lockFailed")}</Alert>
                <Button variant="contained" onClick={open} sx={{ minHeight: 48 }}>
                  {t("phoneShell.app.tryAgain")}
                </Button>
              </>
            )}
          </>
        )}
      </Box>
    </DeviceShell>
  );
}
