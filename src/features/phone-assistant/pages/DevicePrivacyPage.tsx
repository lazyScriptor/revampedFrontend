import { DeviceShell } from "../components/DeviceShell";
import { useEffect, useState } from "react";
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
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { clearDeviceId, getDeviceId } from "@/features/signatures/lib/deviceId";
import { useDeviceManifest } from "@/features/signatures/lib/deviceShell";
import {
  unpairCurrentDevice,
  type CallLoggingScope,
  type ContactSyncMode,
} from "../api/phoneAssistantApi";
import {
  useDeleteDeviceCalls,
  useDeleteDeviceContacts,
  useDevicePolicy,
  useUpdateDeviceSettings,
} from "../hooks/useShopDevices";
import { nativeBridge } from "../lib/nativeBridge";

const CONTACT_SYNC_MODES: ContactSyncMode[] = [
  "off",
  "selected_labels",
  "selected_accounts",
  "all",
];

const CALL_LOGGING_SCOPES: CallLoggingScope[] = [
  "off",
  "customers_only",
  "customers_and_contacts",
  "all",
];

type ConfirmAction = "contacts" | "calls" | "unpair" | null;

function formatDateTime(iso: string | null | undefined, fallback: string): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
}

export function DevicePrivacyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useDeviceManifest();

  const paired = Boolean(getDeviceId());
  const policyQuery = useDevicePolicy(paired);
  const updateSettingsMut = useUpdateDeviceSettings();
  const deleteContactsMut = useDeleteDeviceContacts();
  const deleteCallsMut = useDeleteDeviceCalls();

  const policy = policyQuery.data;

  const [contactSyncMode, setContactSyncMode] = useState<ContactSyncMode>("off");
  const [callLoggingScope, setCallLoggingScope] =
    useState<CallLoggingScope>("customers_and_contacts");
  const [simFilter, setSimFilter] = useState<string>("");
  const [muted, setMuted] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionInFlight, setActionInFlight] = useState(false);
  const [banner, setBanner] = useState<{
    severity: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!policy) return;
    if (CONTACT_SYNC_MODES.includes(policy.contact_sync_mode as ContactSyncMode)) {
      setContactSyncMode(policy.contact_sync_mode as ContactSyncMode);
    }
    if (CALL_LOGGING_SCOPES.includes(policy.call_logging_scope as CallLoggingScope)) {
      setCallLoggingScope(policy.call_logging_scope as CallLoggingScope);
    }
    setSimFilter(policy.sim_filter ?? "");
    setMuted(Boolean(policy.muted));
  }, [policy]);

  const allowedContactModes =
    policy?.contact_sync_policy?.allowed_modes ?? CONTACT_SYNC_MODES;
  const allowedCallScopes =
    policy?.call_logging_policy?.allowed_scopes ?? CALL_LOGGING_SCOPES;
  const retentionDays = policy?.call_logging_policy?.retention_days ?? 180;
  const businessHoursOnly = Boolean(policy?.call_logging_policy?.business_hours_only);
  const businessHours = policy?.call_logging_policy?.business_hours;

  const handleSaveSwitches = async () => {
    setBanner(null);
    try {
      await updateSettingsMut.mutateAsync({
        contact_sync_mode: contactSyncMode,
        call_logging_scope: callLoggingScope,
        sim_filter: simFilter ? simFilter : null,
        muted,
      });
      await nativeBridge.updatePrivacySelection({
        contactSyncMode,
        callLoggingScope,
        simFilter: simFilter ? simFilter : null,
      });
      setBanner({
        severity: "success",
        text: t("phoneAssistant.devicePrivacy.switchesSaved"),
      });
    } catch (err: any) {
      setBanner({
        severity: "error",
        text: err?.message || t("phoneAssistant.deviceConsole.actionFailed"),
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionInFlight(true);
    setBanner(null);
    try {
      if (confirmAction === "contacts") {
        const res = await deleteContactsMut.mutateAsync();
        await nativeBridge.wipeLocalContacts();
        if (allowedContactModes.includes("off")) {
          await updateSettingsMut.mutateAsync({ contact_sync_mode: "off" }).catch(() => null);
          setContactSyncMode("off");
        }
        setBanner({
          severity: "success",
          text: t("phoneAssistant.devicePrivacy.contactsDeletedBanner", {
            count: res.deleted,
          }),
        });
      } else if (confirmAction === "calls") {
        const res = await deleteCallsMut.mutateAsync();
        setBanner({
          severity: "success",
          text: t("phoneAssistant.devicePrivacy.callsDeletedBanner", {
            count: res.deleted,
          }),
        });
      } else if (confirmAction === "unpair") {
        await unpairCurrentDevice().catch(() => null);
        await nativeBridge.wipeLocalContacts();
        await nativeBridge.clearCredentials();
        clearDeviceId();
        setConfirmAction(null);
        navigate({ to: "/pair" });
        return;
      }
      setConfirmAction(null);
    } catch (err: any) {
      setBanner({
        severity: "error",
        text: err?.message || t("phoneAssistant.deviceConsole.actionFailed"),
      });
    } finally {
      setActionInFlight(false);
    }
  };

  const confirmDialogConfig =
    confirmAction === "contacts"
      ? {
          title: t("phoneAssistant.devicePrivacy.deleteContactsConfirmTitle"),
          body: t("phoneAssistant.devicePrivacy.deleteContactsConfirmBody"),
          confirmLabel: t("phoneAssistant.devicePrivacy.deleteContactsBtn"),
        }
      : confirmAction === "calls"
        ? {
            title: t("phoneAssistant.devicePrivacy.deleteCallsConfirmTitle"),
            body: t("phoneAssistant.devicePrivacy.deleteCallsConfirmBody"),
            confirmLabel: t("phoneAssistant.devicePrivacy.deleteCallsBtn"),
          }
        : confirmAction === "unpair"
          ? {
              title: t("phoneAssistant.devicePrivacy.unpairConfirmTitle"),
              body: t("phoneAssistant.devicePrivacy.unpairConfirmBody"),
              confirmLabel: t("phoneAssistant.devicePrivacy.unpairBtn"),
            }
          : null;

  const consentedList = Object.entries(policy?.consented_capabilities ?? {})
    .filter(([, allowed]) => Boolean(allowed))
    .map(([cap]) => cap);

  return (
    <DeviceShell active="settings" hideTitle>
    <Box
      sx={{
        color: "text.primary",
        p: 2,
        pb: 4,
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 560, mx: "auto" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate({ to: "/device/settings" })}
            sx={{
              minHeight: 40,
              textTransform: "none",
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            {t("phoneAssistant.deviceNotifications.backToDevice")}
          </Button>
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            p: 2.25,
            borderRadius: 2.5,
            bgcolor: "background.paper",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(16, 185, 129, 0.14)",
                color: "success.main",
              }}
            >
              <ShieldOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontSize: 17, color: "text.primary" }}
              >
                {t("phoneAssistant.devicePrivacy.title")}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {t("phoneAssistant.devicePrivacy.subtitle")}
              </Typography>
            </Box>
          </Stack>

          {banner && (
            <Alert
              severity={banner.severity}
              onClose={() => setBanner(null)}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {banner.text}
            </Alert>
          )}
        </Paper>

        {!paired ? (
          <Alert severity="warning">
            {t("phoneAssistant.deviceNotifications.unpairedError")}
          </Alert>
        ) : policyQuery.isLoading ? (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : policyQuery.isError || !policy ? (
          <Alert severity="error">
            {t("phoneAssistant.deviceConsole.loadFailed")}
          </Alert>
        ) : (
          <>
            {/* Section 1: This phone sends */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: "background.paper",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5, color: "text.primary" }}>
                {t("phoneAssistant.devicePrivacy.thisPhoneSendsTitle")}
              </Typography>
              <Stack spacing={1.25}>
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "text.primary" }}>
                    {t("phoneAssistant.devicePrivacy.contactsSentSummary", {
                      mode: t(
                        `phoneAssistant.deviceConsole.contactSyncModes.${policy.contact_sync_mode}`,
                        policy.contact_sync_mode,
                      ),
                    })}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      color: "text.secondary",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t("phoneAssistant.devicePrivacy.contactsCountLine", {
                      count: policy.contact_count ?? 0,
                      syncedAt: formatDateTime(
                        policy.contacts_synced_at,
                        t("phoneAssistant.devicePrivacy.neverSynced"),
                      ),
                    })}
                  </Typography>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "text.primary" }}>
                    {t("phoneAssistant.devicePrivacy.callsSentSummary", {
                      scope: t(
                        `phoneAssistant.deviceConsole.callLoggingScopes.${policy.call_logging_scope}`,
                        policy.call_logging_scope,
                      ),
                    })}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      color: "text.secondary",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t("phoneAssistant.devicePrivacy.callsCountLine", {
                      count: policy.calls_logged_this_month ?? 0,
                      days: retentionDays,
                    })}
                  </Typography>
                  {businessHoursOnly && businessHours && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "text.secondary",
                        mt: 0.25,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {t("phoneAssistant.devicePrivacy.businessHoursNotice", {
                        from: businessHours.from,
                        to: businessHours.to,
                      })}
                    </Typography>
                  )}
                </Box>

                <Divider />

                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "text.primary" }}>
                    {t("phoneAssistant.devicePrivacy.neverSentTitle")}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>
                    {t("phoneAssistant.devicePrivacy.neverSentBody")}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Section 2: This phone receives */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: "background.paper",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.25, color: "text.primary" }}>
                {t("phoneAssistant.devicePrivacy.thisPhoneReceivesTitle")}
              </Typography>
              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: 13.5, color: "text.primary" }}>
                  {t("phoneAssistant.devicePrivacy.activeBriefProfile", {
                    profile: policy.brief_profile.name,
                  })}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                  {t("phoneAssistant.devicePrivacy.briefDetailsLine", {
                    amounts: policy.brief_profile.amounts,
                    lockScreen: policy.brief_profile.lock_screen,
                    fields: policy.brief_profile.fields.join(", "),
                  })}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<NotificationsActiveOutlinedIcon />}
                  onClick={() => navigate({ to: "/device/notifications" })}
                  sx={{ minHeight: 44, textTransform: "none", fontWeight: 700, alignSelf: "flex-start" }}
                >
                  {t("phoneAssistant.devicePrivacy.manageNotifications")}
                </Button>
              </Stack>
            </Paper>

            {/* Section 3: Your switches */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: "background.paper",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5, color: "text.primary" }}>
                {t("phoneAssistant.devicePrivacy.switchesTitle")}
              </Typography>
              <Stack spacing={1.75}>
                <FormControl size="small" fullWidth>
                  <InputLabel id="privacy-contact-sync-label">
                    {t("phoneAssistant.devicePrivacy.contactSyncModeLabel")}
                  </InputLabel>
                  <Select
                    labelId="privacy-contact-sync-label"
                    label={t("phoneAssistant.devicePrivacy.contactSyncModeLabel")}
                    value={contactSyncMode}
                    onChange={(e) => setContactSyncMode(e.target.value as ContactSyncMode)}
                  >
                    {CONTACT_SYNC_MODES.map((mode) => {
                      const allowed = allowedContactModes.includes(mode);
                      return (
                        <MenuItem key={mode} value={mode} disabled={!allowed}>
                          {t(`phoneAssistant.deviceConsole.contactSyncModes.${mode}`)}
                          {!allowed
                            ? ` (${t("phoneAssistant.devicePrivacy.disabledByPolicy")})`
                            : ""}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="privacy-call-logging-label">
                    {t("phoneAssistant.devicePrivacy.callLoggingScopeLabel")}
                  </InputLabel>
                  <Select
                    labelId="privacy-call-logging-label"
                    label={t("phoneAssistant.devicePrivacy.callLoggingScopeLabel")}
                    value={callLoggingScope}
                    onChange={(e) => setCallLoggingScope(e.target.value as CallLoggingScope)}
                  >
                    {CALL_LOGGING_SCOPES.map((scope) => {
                      const allowed = allowedCallScopes.includes(scope);
                      return (
                        <MenuItem key={scope} value={scope} disabled={!allowed}>
                          {t(`phoneAssistant.deviceConsole.callLoggingScopes.${scope}`)}
                          {!allowed
                            ? ` (${t("phoneAssistant.devicePrivacy.disabledByPolicy")})`
                            : ""}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="privacy-sim-filter-label">
                    {t("phoneAssistant.devicePrivacy.simFilterLabel")}
                  </InputLabel>
                  <Select
                    labelId="privacy-sim-filter-label"
                    label={t("phoneAssistant.devicePrivacy.simFilterLabel")}
                    value={simFilter}
                    onChange={(e) => setSimFilter(String(e.target.value))}
                  >
                    <MenuItem value="">
                      {t("phoneAssistant.deviceConsole.simFilterAll")}
                    </MenuItem>
                    <MenuItem value="SIM 1">SIM 1</MenuItem>
                    <MenuItem value="SIM 2">SIM 2</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      color="warning"
                      checked={muted}
                      onChange={(_e, checked) => setMuted(checked)}
                      slotProps={{
                        input: {
                          role: "switch",
                          "aria-label": t("phoneAssistant.devicePrivacy.muteNotifications"),
                        },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                      {t("phoneAssistant.devicePrivacy.muteNotifications")}
                    </Typography>
                  }
                />

                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => void handleSaveSwitches()}
                  disabled={updateSettingsMut.isPending}
                  sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }}
                >
                  {t("phoneAssistant.devicePrivacy.saveSwitches")}
                </Button>
              </Stack>
            </Paper>

            {/* Section 4: Consents & actions */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: "background.paper",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1, color: "text.primary" }}>
                {t("phoneAssistant.devicePrivacy.consentsTitle")}
              </Typography>
              <Typography
                sx={{
                  fontSize: 12.5,
                  color: "text.secondary",
                  mb: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {t("phoneAssistant.devicePrivacy.pairedAtLabel", {
                  date: formatDateTime(
                    policy.paired_at,
                    t("phoneAssistant.devicePrivacy.neverSynced"),
                  ),
                })}
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75, mb: 2 }}>
                {consentedList.map((cap) => (
                  <Chip key={cap} size="small" label={cap} variant="outlined" />
                ))}
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.25, color: "text.primary" }}>
                {t("phoneAssistant.devicePrivacy.actionsTitle")}
              </Typography>
              <Stack spacing={1.25}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  data-testid="delete-device-contacts-btn"
                  startIcon={<DeleteOutlinedIcon />}
                  onClick={() => setConfirmAction("contacts")}
                  sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }}
                >
                  {t("phoneAssistant.devicePrivacy.deleteContactsBtn")}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  data-testid="delete-device-calls-btn"
                  startIcon={<DeleteOutlinedIcon />}
                  onClick={() => setConfirmAction("calls")}
                  sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }}
                >
                  {t("phoneAssistant.devicePrivacy.deleteCallsBtn")}
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  data-testid="unpair-device-btn"
                  startIcon={<LinkOffOutlinedIcon />}
                  onClick={() => setConfirmAction("unpair")}
                  sx={{ minHeight: 44, textTransform: "none", fontWeight: 700 }}
                >
                  {t("phoneAssistant.devicePrivacy.unpairBtn")}
                </Button>
              </Stack>
            </Paper>
          </>
        )}
      </Stack>

      <Dialog
        open={Boolean(confirmDialogConfig)}
        onClose={() => !actionInFlight && setConfirmAction(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {confirmDialogConfig?.title}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            {confirmDialogConfig?.body}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmAction(null)}
            disabled={actionInFlight}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            data-testid="privacy-confirm-action-btn"
            disabled={actionInFlight}
            onClick={() => void handleConfirmAction()}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {confirmDialogConfig?.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </DeviceShell>
  );
}
