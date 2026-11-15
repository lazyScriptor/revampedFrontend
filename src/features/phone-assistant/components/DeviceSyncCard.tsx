import { Alert, Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import { useTranslation } from "react-i18next";
import { syncFreshness, useOnline, useSyncStatus } from "../lib/phoneAppState";

const formatWhen = (iso: string | null, lng: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(lng === "si" ? "si-LK" : lng === "ta" ? "ta-LK" : "en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(d);
};

/** Last syncs, customers cached, queued uploads, and a Sync now button that says what happened. */
export function DeviceSyncCard() {
  const { t, i18n } = useTranslation();
  const online = useOnline();
  const { status, syncing, result, syncNow } = useSyncStatus();
  const freshness = syncFreshness(status);
  const rows: Array<[string, string]> = [
    [t("phoneShell.sync.lastBrief"), formatWhen(status?.lastBriefSyncAt ?? null, i18n.language) ?? t("phoneShell.sync.never")],
    [t("phoneShell.sync.lastContacts"), formatWhen(status?.lastContactSyncAt ?? null, i18n.language) ?? t("phoneShell.sync.never")],
    [t("phoneShell.sync.cached"), String(status?.cachedBriefs ?? 0)],
    [t("phoneShell.sync.waiting"), String(status?.outboxPending ?? 0)],
  ];
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
        <Typography sx={{ fontWeight: 800 }}>{t("phoneShell.sync.title")}</Typography>
        <Chip
          size="small"
          color={!online || freshness === "stale" ? "warning" : freshness === "never" ? "default" : "success"}
          label={!online ? t("phoneShell.sync.offline") : t(`phoneShell.sync.state_${freshness}`)}
        />
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 0.5, columnGap: 2 }}>
        {rows.map(([k, v]) => (
          <Box key={k} sx={{ display: "contents" }}>
            <Typography variant="body2" color="text.secondary">{k}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{v}</Typography>
          </Box>
        ))}
      </Box>
      {(status?.outboxPending ?? 0) > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, fontVariantNumeric: "tabular-nums" }}>
          {t("phoneShell.sync.itemsWaiting", { count: status?.outboxPending })}
        </Typography>
      )}
      {result && (
        <Alert severity={result.ok ? "success" : "warning"} sx={{ mt: 1.5 }}>
          {result.ok
            ? t("phoneShell.sync.updated", { count: result.updated ?? 0 })
            : result.error === "no_connection"
              ? t("phoneShell.sync.noConnection")
              : t("phoneShell.sync.failed")}
        </Alert>
      )}
      <Button
        fullWidth
        variant="contained"
        onClick={() => void syncNow()}
        disabled={syncing}
        startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncRoundedIcon />}
        sx={{ mt: 1.5, minHeight: 48, textTransform: "none", fontWeight: 700 }}
      >
        {syncing ? t("phoneShell.sync.syncing") : t("phoneShell.sync.syncNow")}
      </Button>
    </Paper>
  );
}
