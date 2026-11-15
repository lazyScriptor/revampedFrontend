import { Alert, Box, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { usePatchPhoneAssistantPolicy } from "../hooks/useShopDevices";
import { PolicyGrid, usePolicyOrFallback, type PolicyRow } from "./PolicyGrid";

const CONTACT_MODES = ["off", "selected_labels", "selected_accounts", "all"];
const CALL_SCOPES = ["off", "customers_only", "customers_and_contacts", "all"];

function BusinessHoursField({ from, to }: { from: string; to: string }) {
  const { t } = useTranslation();
  const patch = usePatchPhoneAssistantPolicy();
  const save = (next: { from: string; to: string }) => patch.mutate([{ path: "call_logging.business_hours", value: next }]);
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <TextField
        key={`from-${from}`}
        size="small"
        type="time"
        defaultValue={from}
        onBlur={(e) => e.target.value && e.target.value !== from && save({ from: e.target.value, to })}
        slotProps={{ htmlInput: { "aria-label": t("phoneAssistant.pushGrid.quiet_from"), style: { fontVariantNumeric: "tabular-nums" } } }}
        sx={{ width: 120 }}
      />
      <TextField
        key={`to-${to}`}
        size="small"
        type="time"
        defaultValue={to}
        onBlur={(e) => e.target.value && e.target.value !== to && save({ from, to: e.target.value })}
        slotProps={{ htmlInput: { "aria-label": t("phoneAssistant.pushGrid.quiet_to"), style: { fontVariantNumeric: "tabular-nums" } } }}
        sx={{ width: 120 }}
      />
    </Box>
  );
}

function Loading() {
  return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <CircularProgress size={28} />
    </Box>
  );
}

/** Contacts & calls: what a phone may send up and how the overlay and desktop popup behave. */
export function ContactsCallsPanel() {
  const { t } = useTranslation();
  const { policy, loading, error } = usePolicyOrFallback();
  if (loading) return <Loading />;
  if (error || !policy) return <Alert severity="error">{t("phoneAssistant.settings.loadFailed")}</Alert>;
  const cs = policy.contact_sync ?? { allowed_modes: CONTACT_MODES, fields: ["name_and_number"] };
  const cl = policy.call_logging ?? ({ allowed_scopes: CALL_SCOPES } as any);
  const rows: PolicyRow[] = [
    {
      kind: "multi",
      path: "contact_sync.allowed_modes",
      label: t("phoneAssistant.settings.contactModes"),
      hint: t("phoneAssistant.settings.contactModesHint"),
      value: cs.allowed_modes,
      locked: ["off"],
      options: CONTACT_MODES.map((m) => ({ value: m, label: t(`phoneAssistant.settings.contactMode_${m}`) })),
    },
    {
      kind: "multi",
      path: "call_logging.allowed_scopes",
      label: t("phoneAssistant.settings.callScopes"),
      hint: t("phoneAssistant.settings.callScopesHint"),
      value: cl.allowed_scopes,
      locked: ["off"],
      options: CALL_SCOPES.map((m) => ({ value: m, label: t(`phoneAssistant.settings.callScope_${m}`) })),
    },
    { kind: "switch", path: "call_logging.store_unknown_numbers", label: t("phoneAssistant.settings.storeUnknown"), hint: t("phoneAssistant.settings.storeUnknownHint"), value: Boolean(cl.store_unknown_numbers) },
    { kind: "number", path: "call_logging.retention_days", label: t("phoneAssistant.settings.retentionDays"), hint: t("phoneAssistant.settings.retentionHint"), min: 1, max: 3650, value: cl.retention_days ?? 180 },
    { kind: "switch", path: "call_logging.business_hours_only", label: t("phoneAssistant.settings.businessHoursOnly"), value: Boolean(cl.business_hours_only) },
    {
      kind: "custom",
      label: t("phoneAssistant.settings.businessHours"),
      hint: t("phoneAssistant.settings.businessHoursHint"),
      node: <BusinessHoursField from={cl.business_hours?.from ?? "08:00"} to={cl.business_hours?.to ?? "18:00"} />,
    },
  ];
  rows.push(
    { kind: "select", path: "overlay.position", label: t("phoneAssistant.settings.overlayPosition"), value: policy.overlay?.position ?? "top", options: [{ value: "top", label: t("phoneAssistant.callScreen.position_top") }, { value: "bottom", label: t("phoneAssistant.callScreen.position_bottom") }] },
    { kind: "number", path: "overlay.auto_dismiss_seconds", label: t("phoneAssistant.settings.overlayDismiss"), hint: t("phoneAssistant.callScreen.autoDismissHint"), min: 0, max: 60, value: policy.overlay?.auto_dismiss_seconds ?? 0 },
    { kind: "select", path: "unknown_caller", label: t("phoneAssistant.settings.unknownCaller"), value: policy.unknown_caller ?? "show_not_in_geargrid", options: [{ value: "show_not_in_geargrid", label: t("phoneAssistant.settings.unknown_show") }, { value: "show_nothing", label: t("phoneAssistant.settings.unknown_nothing") }] },
    { kind: "select", path: "shared_number", label: t("phoneAssistant.settings.sharedNumber"), value: policy.shared_number ?? "list_all", options: [{ value: "list_all", label: t("phoneAssistant.settings.shared_all") }, { value: "first_only", label: t("phoneAssistant.settings.shared_first") }] },
    { kind: "select", path: "desktop_popup.size", label: t("phoneAssistant.settings.popupSize"), hint: t("phoneAssistant.settings.popupSizeHint"), value: policy.desktop_popup?.size ?? "standard", options: ["compact", "standard", "large"].map((s) => ({ value: s, label: t(`phoneAssistant.settings.popup_${s}`) })) },
  );
  return <PolicyGrid title={t("phoneAssistant.settings.contactsCallsTitle")} subtitle={t("phoneAssistant.settings.contactsCallsHint")} rows={rows} />;
}

/** Sync & privacy: freshness limits, offline wipe, auto-suspend and approval mode. */
export function SyncPrivacyPanel() {
  const { t } = useTranslation();
  const { policy, loading, error } = usePolicyOrFallback();
  if (loading) return <Loading />;
  if (error || !policy) return <Alert severity="error">{t("phoneAssistant.settings.loadFailed")}</Alert>;
  const sync = policy.sync ?? { stale_after_minutes: 60, warn_after_hours: 24, show_sync_footer: "always" };
  const full = policy.full_app ?? { enabled: true, require_app_lock: false, session_minutes: 30, block_screenshots: false };
  const rows: PolicyRow[] = [
    { kind: "number", path: "sync.stale_after_minutes", label: t("phoneAssistant.settings.staleAfter"), hint: t("phoneAssistant.settings.staleAfterHint"), min: 1, max: 10080, value: sync.stale_after_minutes },
    { kind: "select", path: "sync.show_sync_footer", label: t("phoneAssistant.settings.syncFooter"), value: sync.show_sync_footer, options: ["always", "only_when_stale", "never"].map((v) => ({ value: v, label: t(`phoneAssistant.settings.footer_${v}`) })) },
    { kind: "number", path: "sync.warn_after_hours", label: t("phoneAssistant.settings.warnAfter"), hint: t("phoneAssistant.settings.warnAfterHint"), min: 1, max: 8760, value: sync.warn_after_hours },
    { kind: "number", path: "offline_wipe_days", label: t("phoneAssistant.settings.offlineWipe"), hint: t("phoneAssistant.settings.offlineWipeHint"), min: 1, max: 30, value: policy.offline_wipe_days },
    { kind: "number", path: "auto_suspend_days", label: t("phoneAssistant.settings.autoSuspend"), hint: t("phoneAssistant.settings.autoSuspendHint"), min: 0, max: 365, value: policy.auto_suspend_days },
    { kind: "select", path: "approval_mode", label: t("phoneAssistant.settings.approvalMode"), value: policy.approval_mode, options: ["admin_approves_all", "auto_approve_admin_phones", "auto_approve_all"].map((v) => ({ value: v, label: t(`phoneAssistant.settings.approval_${v}`) })) },
    { kind: "switch", path: "full_app.enabled", label: t("phoneAssistant.settings.fullAppEnabled"), hint: t("phoneAssistant.settings.fullAppHint"), value: full.enabled },
    { kind: "switch", path: "full_app.require_app_lock", label: t("phoneAssistant.settings.requireAppLock"), value: full.require_app_lock },
    { kind: "number", path: "full_app.session_minutes", label: t("phoneAssistant.settings.sessionMinutes"), hint: t("phoneAssistant.settings.sessionHint"), min: 1, max: 1440, value: full.session_minutes },
    { kind: "switch", path: "full_app.block_screenshots", label: t("phoneAssistant.settings.blockScreenshots"), value: full.block_screenshots },
  ];
  return <PolicyGrid title={t("phoneAssistant.settings.syncPrivacyTitle")} subtitle={t("phoneAssistant.settings.syncPrivacyHint")} rows={rows} />;
}

/** Approvals (Release 2 D9) is not built yet; the tab says so rather than showing dead controls. */
export function ApprovalsPanel() {
  const { t } = useTranslation();
  return (
    <Paper elevation={0} sx={{ p: 2.5, border: 1, borderColor: "divider", borderRadius: 2.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{t("phoneAssistant.settings.approvalsTitle")}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t("phoneAssistant.settings.approvalsNotBuilt")}
      </Typography>
    </Paper>
  );
}
