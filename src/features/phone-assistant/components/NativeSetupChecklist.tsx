import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SyncIcon from "@mui/icons-material/Sync";
import SecurityIcon from "@mui/icons-material/Security";
import { useTranslation } from "react-i18next";
import { tk } from "@/i18n/marker";
import {
  nativeBridge,
  registerDeviceWithServer,
  type PhoneAssistantSetupStatus,
} from "../lib/nativeBridge";

function formatSyncTimestamp(iso: string | null, neverLabel: string): string {
  if (!iso) return neverLabel;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const SYNC_POLL_INTERVAL_MS = 2000;
const SYNC_POLL_ATTEMPTS = 15;
const SYNC_ERROR_GRACE_POLLS = 2;
// Error codes come from the app's ContactSyncWorker.
const SYNC_ERROR_KEYS: Record<string, string> = {
  not_paired: tk("phoneAssistant.checklist.syncErrors.not_paired"),
  no_permission: tk("phoneAssistant.checklist.syncErrors.no_permission"),
  unauthorized: tk("phoneAssistant.checklist.syncErrors.unauthorized"),
  forbidden: tk("phoneAssistant.checklist.syncErrors.forbidden"),
  rejected: tk("phoneAssistant.checklist.syncErrors.rejected"),
  server: tk("phoneAssistant.checklist.syncErrors.server"),
  network: tk("phoneAssistant.checklist.syncErrors.network"),
};
const SYNC_ERROR_UNKNOWN_KEY = tk("phoneAssistant.checklist.syncErrors.unknown");

type SyncResult = { kind: "done" } | { kind: "running" } | { kind: "error"; code: string };

export function NativeSetupChecklist() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PhoneAssistantSetupStatus | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [vendorFallbackNote, setVendorFallbackNote] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const next = await nativeBridge.getSetupStatus();
      if (next) setStatus(next);
    } catch {
      // Ignore bridge read failures cleanly
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const runAction = async (
    key: string,
    fn: () => Promise<PhoneAssistantSetupStatus | null>,
  ) => {
    setBusyKey(key);
    try {
      const updated = await fn();
      if (updated) setStatus(updated);
      else await loadStatus();
    } finally {
      setBusyKey(null);
    }
  };

  // The native sync runs in the background, so poll the status until it reports a result.
  const handleSyncNow = async () => {
    const before = status?.contactsSyncedAt ?? null;
    setBusyKey("syncNow");
    setSyncResult(null);
    try {
      let latest = await nativeBridge.syncNow();
      for (let attempt = 1; attempt <= SYNC_POLL_ATTEMPTS; attempt++) {
        if (latest) setStatus(latest);
        if (latest?.contactsSyncedAt && latest.contactsSyncedAt !== before) {
          setSyncResult({ kind: "done" });
          return;
        }
        // An error is only trusted after a few polls, so a stale one from an earlier run is skipped.
        if (latest?.contactsSyncError && attempt > SYNC_ERROR_GRACE_POLLS) {
          setSyncResult({ kind: "error", code: latest.contactsSyncError });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, SYNC_POLL_INTERVAL_MS));
        latest = await nativeBridge.getSetupStatus();
      }
      setSyncResult({ kind: "running" });
    } catch {
      setSyncResult({ kind: "error", code: "unknown" });
    } finally {
      setBusyKey(null);
    }
  };

  const applyContactSyncToggle = async (enabled: boolean, consented: boolean) => {
    setBusyKey("contactSync");
    try {
      const updated = await nativeBridge.setContactSyncEnabled(enabled, consented);
      await registerDeviceWithServer({
        app_version: status?.appVersion || "1.0.0",
        contact_sync_enabled: enabled,
        ...(status?.deviceModel ? { device_model: status.deviceModel } : {}),
        ...(status?.osVersion ? { os_version: status.osVersion } : {}),
        ...(status?.reportedState ? { reported_state: status.reportedState } : {}),
      }).catch(() => null);
      if (updated) setStatus(updated);
      else await loadStatus();
    } finally {
      setBusyKey(null);
    }
  };

  const capabilityReasons = useMemo<Record<string, string | null>>(() => {
    if (!status?.capabilityReasonsJson) return {};
    try {
      const parsed = JSON.parse(status.capabilityReasonsJson);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }, [status?.capabilityReasonsJson]);

  const effectiveCapabilities = useMemo<Record<string, boolean>>(() => {
    if (!status?.effectiveCapabilitiesJson) return {};
    try {
      const parsed = JSON.parse(status.effectiveCapabilitiesJson);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }, [status?.effectiveCapabilitiesJson]);

  const capabilityEntries = Object.entries(effectiveCapabilities);

  const handleToggleContactSync = async (checked: boolean) => {
    if (checked && !status?.contactsConsented) {
      setConsentOpen(true);
      return;
    }
    await applyContactSyncToggle(checked, Boolean(status?.contactsConsented || checked));
  };

  if (!status) {
    return null;
  }

  const checklistRows = [
    {
      key: "callerId",
      label: t("phoneAssistant.checklist.callerIdRole"),
      done: status.callScreeningRole,
      onFix: () => runAction("callerId", () => nativeBridge.requestCallScreeningRole()),
    },
    {
      key: "overlay",
      label: t("phoneAssistant.checklist.overlayPermission"),
      done: status.overlayPermission,
      onFix: () => runAction("overlay", () => nativeBridge.requestOverlayPermission()),
    },
    {
      key: "notifications",
      label: t("phoneAssistant.checklist.notificationsPermission"),
      done: status.notificationsPermission,
      onFix: () => runAction("notifications", () => nativeBridge.requestNotificationsPermission()),
    },
    ...(status.contactSyncEnabled
      ? [
          {
            key: "contacts",
            label: t("phoneAssistant.checklist.contactsPermission"),
            done: status.contactsPermission,
            onFix: () => runAction("contacts", () => nativeBridge.requestContactsPermission()),
          },
        ]
      : []),
    {
      key: "callLog",
      label: t("phoneAssistant.checklist.callLogPermission"),
      done: status.callLogPermission,
      onFix: () => runAction("callLog", () => nativeBridge.requestCallLogPermission()),
    },
    {
      key: "battery",
      label: t("phoneAssistant.checklist.batteryExemption"),
      done: status.batteryOptimizationExempt,
      onFix: () => runAction("battery", () => nativeBridge.requestBatteryExemption()),
    },
  ];

  const isSamsung = /samsung/i.test(status.manufacturer || "");
  const isVivo = /vivo|iqoo/i.test(status.manufacturer || "");

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          p: 2.25,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SecurityIcon sx={{ color: "warning.main", fontSize: 20 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: "text.primary" }}>
              {t("phoneAssistant.checklist.title")}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            color="warning"
            startIcon={
              busyKey === "syncNow" ? (
                <CircularProgress size={13} color="inherit" />
              ) : (
                <SyncIcon sx={{ fontSize: 15 }} />
              )
            }
            disabled={!status.contactSyncEnabled || busyKey === "syncNow"}
            onClick={() => void handleSyncNow()}
            sx={{ textTransform: "none", fontWeight: 700, minHeight: 32 }}
          >
            {busyKey === "syncNow"
              ? t("phoneAssistant.checklist.syncing")
              : t("phoneAssistant.checklist.syncNow")}
          </Button>
        </Stack>

        {syncResult && (
          <Alert
            severity={
              syncResult.kind === "done" ? "success" : syncResult.kind === "running" ? "info" : "error"
            }
            onClose={() => setSyncResult(null)}
            sx={{ mb: 1.5, borderRadius: 1.5 }}
          >
            {syncResult.kind === "done" && t("phoneAssistant.checklist.syncDone")}
            {syncResult.kind === "running" && t("phoneAssistant.checklist.syncStillRunning")}
            {syncResult.kind === "error" && t(SYNC_ERROR_KEYS[syncResult.code] ?? SYNC_ERROR_UNKNOWN_KEY)}
          </Alert>
        )}

        {/* Contact Sync Toggle (off until consented) */}
        <Box
          sx={{
            p: 1.5,
            mb: 1.5,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.35)" : "#fde68a",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.12)" : "#fffbeb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: "text.primary" }}>
              {t("phoneAssistant.checklist.contactSyncToggleTitle")}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {t("phoneAssistant.checklist.contactSyncToggleHint")}
            </Typography>
          </Box>
          <Switch
            color="warning"
            checked={status.contactSyncEnabled}
            disabled={busyKey === "contactSync"}
            onChange={(_e, checked) => {
              void handleToggleContactSync(checked);
            }}
            slotProps={{
              input: {
                role: "switch",
                "aria-label": t("phoneAssistant.checklist.contactSyncToggleTitle"),
              },
            }}
          />
        </Box>

        <Stack spacing={1} divider={<Divider flexItem />}>
          {checklistRows.map((row) => (
            <Stack
              key={row.key}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1.5}
              sx={{ py: 0.5 }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                {row.done ? (
                  <CheckCircleOutlinedIcon sx={{ color: "#16a34a", fontSize: 18, flexShrink: 0 }} />
                ) : (
                  <WarningAmberIcon sx={{ color: "#d97706", fontSize: 18, flexShrink: 0 }} />
                )}
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
                  {row.label}
                </Typography>
              </Stack>
              {row.done ? (
                <Chip
                  size="small"
                  label={t("phoneAssistant.checklist.ready")}
                  color="success"
                  variant="outlined"
                  sx={{ height: 24, fontWeight: 700, fontSize: "0.7rem" }}
                />
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  disabled={busyKey === row.key}
                  onClick={() => void row.onFix()}
                  sx={{ textTransform: "none", fontWeight: 700, minHeight: 32, px: 1.5 }}
                >
                  {t("phoneAssistant.checklist.fix")}
                </Button>
              )}
            </Stack>
          ))}

          {/* Vendor Background & Autostart Row */}
          <Box sx={{ pt: 0.75 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>
                  {t("phoneAssistant.checklist.vendorAutostartTitle")}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                  {isVivo
                    ? t("phoneAssistant.checklist.vivoSteps")
                    : isSamsung
                      ? t("phoneAssistant.checklist.samsungSteps")
                      : t("phoneAssistant.checklist.genericVendorSteps")}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={async () => {
                  const res = await nativeBridge.openVendorAutostart();
                  setVendorFallbackNote(res?.opened === false);
                }}
                sx={{ textTransform: "none", fontWeight: 700, minHeight: 32, flexShrink: 0 }}
              >
                {t("phoneAssistant.checklist.fix")}
              </Button>
            </Stack>
            {vendorFallbackNote && (
              <Alert severity="info" sx={{ mt: 1, fontSize: 12 }}>
                {t("phoneAssistant.checklist.vendorIntentFallback")}
              </Alert>
            )}
          </Box>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: 12, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
            {t("phoneAssistant.checklist.lastContactSync", {
              value: formatSyncTimestamp(status.contactsSyncedAt, t("phoneAssistant.checklist.never")),
            })}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
            {t("phoneAssistant.checklist.lastBriefSync", {
              value: formatSyncTimestamp(status.briefsSyncedAt, t("phoneAssistant.checklist.never")),
            })}
          </Typography>
        </Stack>

        {capabilityEntries.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary", mb: 0.75 }}>
              {t("phoneAssistant.checklist.capabilitiesTitle")}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {capabilityEntries.map(([cap, allowed]) => {
                const reason = capabilityReasons[cap];
                return (
                  <Chip
                    key={cap}
                    size="small"
                    color={allowed ? "success" : "default"}
                    variant={allowed ? "outlined" : "filled"}
                    label={
                      allowed || !reason
                        ? t(`phoneAssistant.capabilities.${cap}`, cap)
                        : `${t(`phoneAssistant.capabilities.${cap}`, cap)} · ${t(
                            `phoneAssistant.capabilityReasons.${reason}`,
                            reason,
                          )}`
                    }
                    sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                  />
                );
              })}
            </Box>
          </>
        )}
      </Paper>

      <Dialog
        open={consentOpen}
        onClose={() => {
          if (busyKey !== "contactSync") setConsentOpen(false);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t("phoneAssistant.consent.title")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography variant="body2" color="text.secondary">
            {t("phoneAssistant.consent.body")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("phoneAssistant.consent.privacyGuarantee")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            disabled={busyKey === "contactSync"}
            onClick={() => setConsentOpen(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={busyKey === "contactSync"}
            onClick={async () => {
              setConsentOpen(false);
              await applyContactSyncToggle(true, true);
            }}
            sx={{ fontWeight: 700, textTransform: "none" }}
          >
            {t("phoneAssistant.consent.accept")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
