import { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DeviceShell } from "../../components/DeviceShell";
import { nativeBridge, type NativeAlert } from "../../lib/nativeBridge";
import { usePullToRefresh } from "../../lib/usePullToRefresh";
import { useAuthStore } from "@/stores/useAuthStore";

const GROUPS = ["all", "bills", "payments", "returns", "alerts", "digest"] as const;

/** Notification history kept on this phone. A tap opens the bill; signed-in staff land on the real page. */
export function DeviceAlertsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<NativeAlert[]>([]);
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("all");
  const signedIn = Boolean(useAuthStore((s) => s.user));

  const load = useCallback(async () => setAlerts(await nativeBridge.getAlerts()), []);
  useEffect(() => {
    void load();
  }, [load]);
  const { pull, refreshing } = usePullToRefresh(load);

  const shown = alerts.filter((a) => group === "all" || a.group === group);

  const open = (a: NativeAlert) => {
    if (a.invoiceId) {
      if (signedIn) navigate({ to: "/invoices", search: { mode: "manage" } as any });
      else navigate({ to: "/device/invoice/$id", params: { id: a.invoiceId } });
    } else if (a.customerId && signedIn) {
      navigate({ to: "/customers" });
    }
  };

  return (
    <DeviceShell active="alerts" title={t("phoneShell.tab_alerts")}>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {(pull > 0 || refreshing) && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
            {refreshing ? t("phoneShell.refreshing") : t("phoneShell.pullToRefresh")}
          </Typography>
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
          <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>{t("phoneShell.alerts.empty")}</Typography>
        )}
        {shown.map((a) => (
          <Paper
            key={a.id}
            variant="outlined"
            component="button"
            type="button"
            onClick={() => open(a)}
            sx={{ p: 1.5, borderRadius: 2, textAlign: "left", cursor: "pointer", width: "100%", minHeight: 56, bgcolor: "background.paper", color: "text.primary", font: "inherit" }}
          >
            <Typography sx={{ fontWeight: 700 }}>{a.title}</Typography>
            {a.body && <Typography variant="body2" color="text.secondary">{a.body}</Typography>}
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {new Date(a.receivedAt).toLocaleString()}
            </Typography>
          </Paper>
        ))}
        {alerts.length > 0 && (
          <Button size="small" onClick={async () => { await nativeBridge.clearAlerts(); await load(); }} sx={{ alignSelf: "center", textTransform: "none" }}>
            {t("phoneShell.alerts.clear")}
          </Button>
        )}
      </Box>
    </DeviceShell>
  );
}
