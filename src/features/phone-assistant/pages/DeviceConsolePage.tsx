import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import PhoneAndroidOutlinedIcon from "@mui/icons-material/PhoneAndroidOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import SecurityIcon from "@mui/icons-material/Security";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import TimelineIcon from "@mui/icons-material/Timeline";
import TuneIcon from "@mui/icons-material/Tune";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import type {
  AfterCallCardPolicy,
  BriefProfile,
  CallLoggingPolicy,
  CallLoggingScope,
  ContactSyncMode,
  ContactSyncPolicy,
  DeviceStatus,
  OverlayPolicy,
  PhoneAssistantPolicy,
  SharedNumberMode,
  ShopDeviceItem,
  UnknownCallerMode,
} from "../api/phoneAssistantApi";
import {
  usePhoneAssistantPolicy,
  useSetShopDeviceStatus,
  useShopDeviceAudit,
  useShopDevices,
  useTestShopDevicePush,
  useUpdatePhoneAssistantPolicy,
  useUpdateShopDevice,
  useWipeShopDevice,
} from "../hooks/useShopDevices";
import { MissedCallsAndFollowUpsPanel } from "../components/MissedCallsAndFollowUpsPanel";

const CAPABILITY_KEYS = [
  "signatures",
  "photos",
  "caller_brief",
  "bill_view",
  "push",
  "contact_sync",
  "call_logging",
  "click_to_call",
  "full_app",
] as const;

const DEFAULT_BRIEF_PROFILES: BriefProfile[] = [
  {
    id: "owner",
    name: "Owner (full brief)",
    fields: [
      "name",
      "rating",
      "active_rentals",
      "balance",
      "last_payment",
      "overdue_alert",
      "blacklist_flag",
      "recent_call_notes",
    ],
    lock_screen: "name_rating",
    amounts: "exact",
  },
  {
    id: "counter",
    name: "Counter staff",
    fields: ["name", "rating", "active_rentals", "overdue_alert", "blacklist_flag"],
    lock_screen: "name_only",
    amounts: "flag_only",
  },
];

const DEFAULT_OVERLAY_POLICY: OverlayPolicy = {
  position: "top",
  auto_dismiss_seconds: 12,
  show_for: "incoming",
};

const CONTACT_SYNC_MODE_KEYS: ContactSyncMode[] = [
  "off",
  "selected_labels",
  "selected_accounts",
  "all",
];

const CALL_LOGGING_SCOPE_KEYS: CallLoggingScope[] = [
  "off",
  "customers_only",
  "customers_and_contacts",
  "all",
];

const DEFAULT_CONTACT_SYNC_POLICY: ContactSyncPolicy = {
  allowed_modes: [...CONTACT_SYNC_MODE_KEYS],
  fields: ["name_and_number"],
};

const DEFAULT_CALL_LOGGING_POLICY: CallLoggingPolicy = {
  allowed_scopes: [...CALL_LOGGING_SCOPE_KEYS],
  store_unknown_numbers: true,
  business_hours_only: false,
  business_hours: { from: "08:00", to: "18:00" },
  retention_days: 180,
};

const DEFAULT_AFTER_CALL_CARD_POLICY: AfterCallCardPolicy = {
  enabled: true,
  tags: [
    "Booking",
    "Payment promise",
    "Extension",
    "Complaint",
    "Price enquiry",
    "Wrong number",
  ],
  auto_dismiss_seconds: 25,
};

function togglePolicySelection<T extends string>(current: T[], item: T): T[] {
  const exists = current.includes(item);
  if (exists && current.length <= 1) return current;
  return exists ? current.filter((v) => v !== item) : [...current, item];
}

type StatusFilter = "ALL" | DeviceStatus;

function statusChipPalette(status: DeviceStatus, isDark: boolean) {
  switch (status) {
    case "ACTIVE":
      return {
        bg: isDark ? "rgba(16, 185, 129, 0.16)" : "#ecfdf5",
        fg: isDark ? "#6ee7b7" : "#047857",
        border: isDark ? "rgba(16, 185, 129, 0.35)" : "#a7f3d0",
      };
    case "PENDING":
      return {
        bg: isDark ? "rgba(245, 158, 11, 0.18)" : "#fffbeb",
        fg: isDark ? "#fcd34d" : "#b45309",
        border: isDark ? "rgba(245, 158, 11, 0.4)" : "#fde68a",
      };
    case "SUSPENDED":
      return {
        bg: isDark ? "rgba(249, 115, 22, 0.16)" : "#fff7ed",
        fg: isDark ? "#fdba74" : "#c2410c",
        border: isDark ? "rgba(249, 115, 22, 0.35)" : "#fed7aa",
      };
    case "REVOKED":
    default:
      return {
        bg: isDark ? "rgba(244, 63, 94, 0.16)" : "#fff1f2",
        fg: isDark ? "#fda4af" : "#be123c",
        border: isDark ? "rgba(244, 63, 94, 0.35)" : "#fecdd3",
      };
  }
}

export interface DeviceConsolePageProps {
  canManagePolicy?: boolean;
}

export function DeviceConsolePage({ canManagePolicy = true }: DeviceConsolePageProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surfaceBg = isDark ? "#0f172a" : "#ffffff";
  const rowBg = isDark ? "#1e293b" : "#f8fafc";
  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const textPrimary = isDark ? "#f8fafc" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#475569";

  const devicesQuery = useShopDevices(undefined, true);
  const policyQuery = usePhoneAssistantPolicy(canManagePolicy);
  const updatePolicyMut = useUpdatePhoneAssistantPolicy();
  const setStatusMut = useSetShopDeviceStatus();
  const updateDeviceMut = useUpdateShopDevice();
  const wipeMut = useWipeShopDevice();
  const testPushMut = useTestShopDevicePush();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [banner, setBanner] = useState<{
    severity: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [policyDraft, setPolicyDraft] = useState<PhoneAssistantPolicy | null>(null);

  const [editDevice, setEditDevice] = useState<ShopDeviceItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCapabilities, setEditCapabilities] = useState<Record<string, boolean>>({});
  const [editBriefProfileId, setEditBriefProfileId] = useState<string>("");
  const [editMuted, setEditMuted] = useState(false);
  const [editContactSyncMode, setEditContactSyncMode] = useState<ContactSyncMode>("all");
  const [editCallLoggingScope, setEditCallLoggingScope] =
    useState<CallLoggingScope>("customers_and_contacts");
  const [editSimFilter, setEditSimFilter] = useState<string>("");

  const [auditDevice, setAuditDevice] = useState<ShopDeviceItem | null>(null);
  const auditQuery = useShopDeviceAudit(auditDevice?.operator_device_id ?? null, Boolean(auditDevice));

  useEffect(() => {
    if (policyQuery.data?.policy) {
      setPolicyDraft(policyQuery.data.policy);
    }
  }, [policyQuery.data?.policy]);

  const devices = devicesQuery.data?.devices ?? [];
  const counts = devicesQuery.data?.counts ?? {
    total: devices.length,
    pending: 0,
    active: 0,
    suspended: 0,
    revoked: 0,
  };

  const pendingDevices = useMemo(
    () => devices.filter((d) => d.status === "PENDING"),
    [devices],
  );

  const filteredDevices = useMemo(
    () =>
      statusFilter === "ALL"
        ? devices
        : devices.filter((d) => d.status === statusFilter),
    [devices, statusFilter],
  );

  const handleStatusChange = async (
    deviceId: number,
    status: DeviceStatus,
    reason?: string,
  ) => {
    setBanner(null);
    try {
      await setStatusMut.mutateAsync({ id: deviceId, status, reason });
      setBanner({
        severity: "success",
        text: t("phoneAssistant.deviceConsole.statusUpdated", {
          status: t(`phoneAssistant.deviceStatus.${status}`),
        }),
      });
    } catch (err: any) {
      setBanner({
        severity: "error",
        text: err?.message || t("phoneAssistant.deviceConsole.actionFailed"),
      });
    }
  };

  const handleWipe = async (device: ShopDeviceItem) => {
    if (
      !confirm(
        t("phoneAssistant.deviceConsole.confirmWipe", {
          name: device.device_label || device.device_model || device.device_id,
        }),
      )
    ) {
      return;
    }
    setBanner(null);
    try {
      const res = await wipeMut.mutateAsync({
        id: device.operator_device_id,
        reason: "Remote cache wipe from admin console",
      });
      setBanner({
        severity: res.pushed ? "success" : "warning",
        text: res.pushed
          ? t("phoneAssistant.deviceConsole.wipePushed")
          : t("phoneAssistant.deviceConsole.wipeQueuedOffline"),
      });
    } catch (err: any) {
      setBanner({
        severity: "error",
        text: err?.message || t("phoneAssistant.deviceConsole.actionFailed"),
      });
    }
  };

  const handleTestPush = async (device: ShopDeviceItem) => {
    setBanner(null);
    try {
      const res = await testPushMut.mutateAsync(device.operator_device_id);
      setBanner({
        severity: res.sent ? "success" : "warning",
        text: res.sent
          ? t("phoneAssistant.deviceConsole.testPushSent")
          : t("phoneAssistant.deviceConsole.testPushNotSent", {
              reason: res.reason || "unavailable",
            }),
      });
    } catch (err: any) {
      setBanner({
        severity: "error",
        text: err?.message || t("phoneAssistant.deviceConsole.actionFailed"),
      });
    }
  };

  const openEditDialog = (device: ShopDeviceItem) => {
    setEditDevice(device);
    setEditLabel(device.device_label ?? "");
    const nextCaps: Record<string, boolean> = {};
    for (const key of CAPABILITY_KEYS) {
      nextCaps[key] = device.capabilities?.[key] !== false;
    }
    setEditCapabilities(nextCaps);
    setEditBriefProfileId(device.brief_profile_id ?? "");
    setEditMuted(Boolean(device.muted));
    setEditContactSyncMode(
      CONTACT_SYNC_MODE_KEYS.includes(device.contact_sync_mode as ContactSyncMode)
        ? (device.contact_sync_mode as ContactSyncMode)
        : "off",
    );
    setEditCallLoggingScope(
      CALL_LOGGING_SCOPE_KEYS.includes(device.call_logging_scope as CallLoggingScope)
        ? (device.call_logging_scope as CallLoggingScope)
        : "customers_and_contacts",
    );
    setEditSimFilter(device.sim_filter ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editDevice) return;
    setBanner(null);
    try {
      await updateDeviceMut.mutateAsync({
        id: editDevice.operator_device_id,
        body: {
          device_label: editLabel.trim() || null,
          capabilities: editCapabilities,
          brief_profile_id: editBriefProfileId || null,
          muted: editMuted,
          contact_sync_mode: editContactSyncMode,
          call_logging_scope: editCallLoggingScope,
          sim_filter: editSimFilter ? editSimFilter : null,
        },
      });
      setEditDevice(null);
      setBanner({
        severity: "success",
        text: t("phoneAssistant.deviceConsole.deviceUpdated"),
      });
    } catch (err: any) {
      setBanner({
        severity: "error",
        text: err?.message || t("phoneAssistant.deviceConsole.actionFailed"),
      });
    }
  };

  const handleSavePolicy = async () => {
    if (!policyDraft) return;
    setBanner(null);
    try {
      await updatePolicyMut.mutateAsync(policyDraft);
      setBanner({
        severity: "success",
        text: t("phoneAssistant.deviceConsole.policySaved"),
      });
    } catch (err: any) {
      setBanner({
        severity: "error",
        text: err?.message || t("phoneAssistant.deviceConsole.actionFailed"),
      });
    }
  };

  const filterChips: Array<{ key: StatusFilter; label: string; count: number }> = [
    { key: "ALL", label: t("phoneAssistant.deviceConsole.filters.all"), count: counts.total },
    { key: "PENDING", label: t("phoneAssistant.deviceStatus.PENDING"), count: counts.pending },
    { key: "ACTIVE", label: t("phoneAssistant.deviceStatus.ACTIVE"), count: counts.active },
    { key: "SUSPENDED", label: t("phoneAssistant.deviceStatus.SUSPENDED"), count: counts.suspended },
    { key: "REVOKED", label: t("phoneAssistant.deviceStatus.REVOKED"), count: counts.revoked },
  ];

  return (
    <Stack spacing={2.5}>
      {/* Header & Overview */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2.5,
          border: `1px solid ${borderColor}`,
          bgcolor: surfaceBg,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <PhoneAndroidOutlinedIcon sx={{ color: "warning.main" }} />
              <Typography sx={{ fontWeight: 800, fontSize: 18, color: textPrimary }}>
                {t("phoneAssistant.deviceConsole.title")}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 13.5, color: textSecondary, mt: 0.5 }}>
              {t("phoneAssistant.deviceConsole.subtitle")}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => devicesQuery.refetch()}
            disabled={devicesQuery.isFetching}
            sx={{ textTransform: "none", fontWeight: 700, minHeight: 36, alignSelf: { xs: "flex-start", sm: "center" } }}
          >
            {t("common.refresh", "Refresh")}
          </Button>
        </Stack>

        {banner && (
          <Alert severity={banner.severity} onClose={() => setBanner(null)} sx={{ mt: 2, borderRadius: 2 }}>
            {banner.text}
          </Alert>
        )}

        {/* Pending Approval Banner */}
        {pendingDevices.length > 0 && (
          <Alert
            severity="warning"
            icon={<WarningAmberIcon />}
            sx={{ mt: 2, borderRadius: 2, "& .MuiAlert-message": { width: "100%" } }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>
              {t("phoneAssistant.deviceConsole.pendingBannerTitle", {
                count: pendingDevices.length,
              })}
            </Typography>
            <Stack spacing={1}>
              {pendingDevices.map((d) => (
                <Stack
                  key={d.operator_device_id}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{
                    alignItems: { sm: "center" },
                    justifyContent: "space-between",
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: surfaceBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: textPrimary }}>
                      {d.staff_name} — {d.device_label || d.device_model || d.device_id}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: textSecondary, fontVariantNumeric: "tabular-nums" }}>
                      {[d.device_model, d.os_version, d.paired_at ? new Date(d.paired_at).toLocaleString() : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={setStatusMut.isPending}
                      onClick={() => void handleStatusChange(d.operator_device_id, "ACTIVE")}
                      sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                    >
                      {t("phoneAssistant.deviceConsole.approve")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={setStatusMut.isPending}
                      onClick={() =>
                        void handleStatusChange(
                          d.operator_device_id,
                          "REVOKED",
                          "Rejected from approval queue",
                        )
                      }
                      sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                    >
                      {t("phoneAssistant.deviceConsole.reject")}
                    </Button>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Alert>
        )}

        {/* Filter Chips Strip (horizontal scrollable on xs) */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mt: 2,
            overflowX: "auto",
            flexWrap: { xs: "nowrap", sm: "wrap" },
            pb: 0.5,
          }}
        >
          {filterChips.map((chip) => {
            const selected = statusFilter === chip.key;
            return (
              <Chip
                key={chip.key}
                clickable
                onClick={() => setStatusFilter(chip.key)}
                label={`${chip.label} (${chip.count})`}
                color={selected ? "warning" : "default"}
                variant={selected ? "filled" : "outlined"}
                sx={{
                  flexShrink: 0,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  minHeight: 34,
                }}
              />
            );
          })}
        </Stack>
      </Paper>

      {/* Shop Device Policy Card (Admins) */}
      {canManagePolicy && policyDraft && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2.5,
            border: `1px solid ${borderColor}`,
            bgcolor: surfaceBg,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 2 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <AdminPanelSettingsOutlinedIcon sx={{ color: "warning.main" }} />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 16, color: textPrimary }}>
                  {t("phoneAssistant.deviceConsole.policyTitle")}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: textSecondary }}>
                  {t("phoneAssistant.deviceConsole.policySubtitle")}
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              color="warning"
              size="small"
              startIcon={<SaveOutlinedIcon />}
              disabled={updatePolicyMut.isPending}
              onClick={() => void handleSavePolicy()}
              sx={{ textTransform: "none", fontWeight: 700, minHeight: 38, alignSelf: { xs: "flex-start", sm: "center" } }}
            >
              {updatePolicyMut.isPending
                ? t("phoneAssistant.pushSettings.savingButton")
                : t("phoneAssistant.deviceConsole.savePolicy")}
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ flex: 2, minWidth: 220 }}>
              <InputLabel id="approval-mode-label">
                {t("phoneAssistant.deviceConsole.approvalModeLabel")}
              </InputLabel>
              <Select
                labelId="approval-mode-label"
                label={t("phoneAssistant.deviceConsole.approvalModeLabel")}
                value={policyDraft.approval_mode}
                onChange={(e) =>
                  setPolicyDraft({
                    ...policyDraft,
                    approval_mode: e.target.value as PhoneAssistantPolicy["approval_mode"],
                  })
                }
              >
                <MenuItem value="admin_approves_all">
                  {t("phoneAssistant.deviceConsole.approvalModes.admin_approves_all")}
                </MenuItem>
                <MenuItem value="auto_approve_admin_phones">
                  {t("phoneAssistant.deviceConsole.approvalModes.auto_approve_admin_phones")}
                </MenuItem>
                <MenuItem value="auto_approve_all">
                  {t("phoneAssistant.deviceConsole.approvalModes.auto_approve_all")}
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              type="number"
              label={t("phoneAssistant.deviceConsole.offlineWipeDaysLabel")}
              value={policyDraft.offline_wipe_days}
              onChange={(e) =>
                setPolicyDraft({
                  ...policyDraft,
                  offline_wipe_days: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                })
              }
              slotProps={{
                htmlInput: {
                  min: 1,
                  max: 30,
                  style: { fontVariantNumeric: "tabular-nums" },
                },
              }}
              sx={{ flex: 1, minWidth: 160 }}
            />

            <TextField
              size="small"
              type="number"
              label={t("phoneAssistant.deviceConsole.autoSuspendDaysLabel")}
              helperText={t("phoneAssistant.deviceConsole.autoSuspendHint")}
              value={policyDraft.auto_suspend_days}
              onChange={(e) =>
                setPolicyDraft({
                  ...policyDraft,
                  auto_suspend_days: Math.max(0, Math.min(365, Number(e.target.value) || 0)),
                })
              }
              slotProps={{
                htmlInput: {
                  min: 0,
                  max: 365,
                  style: { fontVariantNumeric: "tabular-nums" },
                },
              }}
              sx={{ flex: 1, minWidth: 180 }}
            />
          </Stack>

          <Divider sx={{ my: 1.5 }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: textSecondary, mb: 1 }}>
            {t("phoneAssistant.deviceConsole.shopCapabilitiesLabel")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {CAPABILITY_KEYS.map((key) => {
              const checked = policyDraft.capabilities?.[key] !== false;
              return (
                <FormControlLabel
                  key={key}
                  control={
                    <Switch
                      size="small"
                      color="warning"
                      checked={checked}
                      onChange={(_e, next) =>
                        setPolicyDraft({
                          ...policyDraft,
                          capabilities: {
                            ...policyDraft.capabilities,
                            [key]: next,
                          },
                        })
                      }
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                      {t(`phoneAssistant.capabilities.${key}`)}
                    </Typography>
                  }
                  sx={{
                    m: 0,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1.5,
                    bgcolor: rowBg,
                    border: `1px solid ${borderColor}`,
                  }}
                />
              );
            })}
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: textSecondary, mb: 1.5 }}>
            {t("phoneAssistant.deviceConsole.briefPolicyTitle")}
          </Typography>
          {(() => {
            const profiles =
              policyDraft.brief_profiles && policyDraft.brief_profiles.length > 0
                ? policyDraft.brief_profiles
                : DEFAULT_BRIEF_PROFILES;
            const overlay = policyDraft.overlay ?? DEFAULT_OVERLAY_POLICY;
            const currentCacheScope = policyDraft.cache_scope ?? "all";
            const cacheScopeOptions = ["all", "with_dues_or_active", "active_months:6"];
            if (currentCacheScope && !cacheScopeOptions.includes(currentCacheScope)) {
              cacheScopeOptions.push(currentCacheScope);
            }
            return (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                  gap: 1.5,
                }}
              >
                <FormControl size="small" fullWidth>
                  <InputLabel id="fallback-profile-label">
                    {t("phoneAssistant.deviceConsole.fallbackProfileLabel")}
                  </InputLabel>
                  <Select
                    labelId="fallback-profile-label"
                    label={t("phoneAssistant.deviceConsole.fallbackProfileLabel")}
                    value={policyDraft.fallback_profile ?? "counter"}
                    onChange={(e) =>
                      setPolicyDraft({
                        ...policyDraft,
                        fallback_profile: String(e.target.value),
                      })
                    }
                  >
                    {profiles.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name} ({p.amounts})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="cache-scope-label">
                    {t("phoneAssistant.deviceConsole.cacheScopeLabel")}
                  </InputLabel>
                  <Select
                    labelId="cache-scope-label"
                    label={t("phoneAssistant.deviceConsole.cacheScopeLabel")}
                    value={currentCacheScope}
                    onChange={(e) =>
                      setPolicyDraft({
                        ...policyDraft,
                        cache_scope: String(e.target.value),
                      })
                    }
                  >
                    {cacheScopeOptions.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt === "all"
                          ? t("phoneAssistant.deviceConsole.cacheScopes.all")
                          : opt === "with_dues_or_active"
                            ? t("phoneAssistant.deviceConsole.cacheScopes.with_dues_or_active")
                            : opt === "active_months:6"
                              ? t("phoneAssistant.deviceConsole.cacheScopes.active_months_6")
                              : opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="overlay-position-label">
                    {t("phoneAssistant.deviceConsole.overlayPositionLabel")}
                  </InputLabel>
                  <Select
                    labelId="overlay-position-label"
                    label={t("phoneAssistant.deviceConsole.overlayPositionLabel")}
                    value={overlay.position}
                    onChange={(e) =>
                      setPolicyDraft({
                        ...policyDraft,
                        overlay: {
                          ...overlay,
                          position: e.target.value as OverlayPolicy["position"],
                        },
                      })
                    }
                  >
                    <MenuItem value="top">
                      {t("phoneAssistant.deviceConsole.overlayPositions.top")}
                    </MenuItem>
                    <MenuItem value="bottom">
                      {t("phoneAssistant.deviceConsole.overlayPositions.bottom")}
                    </MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label={t("phoneAssistant.deviceConsole.overlayDismissLabel")}
                  value={overlay.auto_dismiss_seconds}
                  onChange={(e) =>
                    setPolicyDraft({
                      ...policyDraft,
                      overlay: {
                        ...overlay,
                        auto_dismiss_seconds: Math.max(
                          0,
                          Math.min(60, Number(e.target.value) || 0),
                        ),
                      },
                    })
                  }
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      max: 60,
                      style: { fontVariantNumeric: "tabular-nums" },
                    },
                  }}
                />

                <FormControl size="small" fullWidth>
                  <InputLabel id="overlay-show-for-label">
                    {t("phoneAssistant.deviceConsole.overlayShowForLabel")}
                  </InputLabel>
                  <Select
                    labelId="overlay-show-for-label"
                    label={t("phoneAssistant.deviceConsole.overlayShowForLabel")}
                    value={overlay.show_for}
                    onChange={(e) =>
                      setPolicyDraft({
                        ...policyDraft,
                        overlay: {
                          ...overlay,
                          show_for: e.target.value as OverlayPolicy["show_for"],
                        },
                      })
                    }
                  >
                    <MenuItem value="incoming">
                      {t("phoneAssistant.deviceConsole.overlayShowFor.incoming")}
                    </MenuItem>
                    <MenuItem value="incoming_and_outgoing">
                      {t("phoneAssistant.deviceConsole.overlayShowFor.incoming_and_outgoing")}
                    </MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="unknown-caller-label">
                    {t("phoneAssistant.deviceConsole.unknownCallerLabel")}
                  </InputLabel>
                  <Select
                    labelId="unknown-caller-label"
                    label={t("phoneAssistant.deviceConsole.unknownCallerLabel")}
                    value={policyDraft.unknown_caller ?? "show_not_in_geargrid"}
                    onChange={(e) =>
                      setPolicyDraft({
                        ...policyDraft,
                        unknown_caller: e.target.value as UnknownCallerMode,
                      })
                    }
                  >
                    <MenuItem value="show_not_in_geargrid">
                      {t("phoneAssistant.deviceConsole.unknownCallers.show_not_in_geargrid")}
                    </MenuItem>
                    <MenuItem value="show_nothing">
                      {t("phoneAssistant.deviceConsole.unknownCallers.show_nothing")}
                    </MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="shared-number-label">
                    {t("phoneAssistant.deviceConsole.sharedNumberLabel")}
                  </InputLabel>
                  <Select
                    labelId="shared-number-label"
                    label={t("phoneAssistant.deviceConsole.sharedNumberLabel")}
                    value={policyDraft.shared_number ?? "list_all"}
                    onChange={(e) =>
                      setPolicyDraft({
                        ...policyDraft,
                        shared_number: e.target.value as SharedNumberMode,
                      })
                    }
                  >
                    <MenuItem value="list_all">
                      {t("phoneAssistant.deviceConsole.sharedNumbers.list_all")}
                    </MenuItem>
                    <MenuItem value="first_only">
                      {t("phoneAssistant.deviceConsole.sharedNumbers.first_only")}
                    </MenuItem>
                  </Select>
                </FormControl>

                <Divider sx={{ gridColumn: "1 / -1", my: 0.5 }} />

                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: textPrimary }}>
                    {t("phoneAssistant.deviceConsole.contactSyncPolicyTitle")}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: textSecondary, mt: 0.25, mb: 0.75 }}>
                    {t("phoneAssistant.deviceConsole.allowedContactSyncModesLabel")}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                    {CONTACT_SYNC_MODE_KEYS.map((mode) => {
                      const cs = policyDraft.contact_sync ?? DEFAULT_CONTACT_SYNC_POLICY;
                      return (
                        <FormControlLabel
                          key={mode}
                          control={
                            <Checkbox
                              size="small"
                              checked={cs.allowed_modes.includes(mode)}
                              onChange={() =>
                                setPolicyDraft({
                                  ...policyDraft,
                                  contact_sync: {
                                    ...cs,
                                    allowed_modes: togglePolicySelection(cs.allowed_modes, mode),
                                  },
                                })
                              }
                            />
                          }
                          label={
                            <Typography sx={{ fontSize: 13, color: textPrimary }}>
                              {t(`phoneAssistant.deviceConsole.contactSyncModes.${mode}`)}
                            </Typography>
                          }
                        />
                      );
                    })}
                  </Stack>
                </Box>

                <Divider sx={{ gridColumn: "1 / -1", my: 0.5 }} />

                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: textPrimary }}>
                    {t("phoneAssistant.deviceConsole.callLoggingPolicyTitle")}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: textSecondary, mt: 0.25, mb: 0.75 }}>
                    {t("phoneAssistant.deviceConsole.allowedCallLoggingScopesLabel")}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                    {CALL_LOGGING_SCOPE_KEYS.map((scope) => {
                      const cl = policyDraft.call_logging ?? DEFAULT_CALL_LOGGING_POLICY;
                      return (
                        <FormControlLabel
                          key={scope}
                          control={
                            <Checkbox
                              size="small"
                              checked={cl.allowed_scopes.includes(scope)}
                              onChange={() =>
                                setPolicyDraft({
                                  ...policyDraft,
                                  call_logging: {
                                    ...cl,
                                    allowed_scopes: togglePolicySelection(cl.allowed_scopes, scope),
                                  },
                                })
                              }
                            />
                          }
                          label={
                            <Typography sx={{ fontSize: 13, color: textPrimary }}>
                              {t(`phoneAssistant.deviceConsole.callLoggingScopes.${scope}`)}
                            </Typography>
                          }
                        />
                      );
                    })}
                  </Stack>
                </Box>

                {(() => {
                  const cl = policyDraft.call_logging ?? DEFAULT_CALL_LOGGING_POLICY;
                  return (
                    <>
                      <TextField
                        size="small"
                        type="number"
                        fullWidth
                        label={t("phoneAssistant.deviceConsole.retentionDaysLabel")}
                        value={cl.retention_days}
                        onChange={(e) => {
                          const num = Math.max(1, Math.min(3650, Number(e.target.value) || 1));
                          setPolicyDraft({
                            ...policyDraft,
                            call_logging: { ...cl, retention_days: num },
                          });
                        }}
                        slotProps={{
                          htmlInput: {
                            min: 1,
                            max: 3650,
                            style: { fontVariantNumeric: "tabular-nums" },
                          },
                        }}
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            color="warning"
                            checked={cl.store_unknown_numbers}
                            onChange={(_e, checked) =>
                              setPolicyDraft({
                                ...policyDraft,
                                call_logging: { ...cl, store_unknown_numbers: checked },
                              })
                            }
                            slotProps={{
                              input: {
                                role: "switch",
                                "aria-label": t("phoneAssistant.deviceConsole.storeUnknownNumbersLabel"),
                              },
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontSize: 13, color: textPrimary }}>
                            {t("phoneAssistant.deviceConsole.storeUnknownNumbersLabel")}
                          </Typography>
                        }
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            color="warning"
                            checked={cl.business_hours_only}
                            onChange={(_e, checked) =>
                              setPolicyDraft({
                                ...policyDraft,
                                call_logging: { ...cl, business_hours_only: checked },
                              })
                            }
                            slotProps={{
                              input: {
                                role: "switch",
                                "aria-label": t("phoneAssistant.deviceConsole.businessHoursOnlyLabel"),
                              },
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontSize: 13, color: textPrimary }}>
                            {t("phoneAssistant.deviceConsole.businessHoursOnlyLabel")}
                          </Typography>
                        }
                      />

                      {cl.business_hours_only && (
                        <>
                          <TextField
                            size="small"
                            type="time"
                            fullWidth
                            label={t("phoneAssistant.deviceConsole.businessHoursFromLabel")}
                            value={cl.business_hours?.from ?? "08:00"}
                            onChange={(e) =>
                              setPolicyDraft({
                                ...policyDraft,
                                call_logging: {
                                  ...cl,
                                  business_hours: {
                                    from: e.target.value || "08:00",
                                    to: cl.business_hours?.to ?? "18:00",
                                  },
                                },
                              })
                            }
                            slotProps={{
                              inputLabel: { shrink: true },
                              htmlInput: { style: { fontVariantNumeric: "tabular-nums" } },
                            }}
                          />
                          <TextField
                            size="small"
                            type="time"
                            fullWidth
                            label={t("phoneAssistant.deviceConsole.businessHoursToLabel")}
                            value={cl.business_hours?.to ?? "18:00"}
                            onChange={(e) =>
                              setPolicyDraft({
                                ...policyDraft,
                                call_logging: {
                                  ...cl,
                                  business_hours: {
                                    from: cl.business_hours?.from ?? "08:00",
                                    to: e.target.value || "18:00",
                                  },
                                },
                              })
                            }
                            slotProps={{
                              inputLabel: { shrink: true },
                              htmlInput: { style: { fontVariantNumeric: "tabular-nums" } },
                            }}
                          />
                        </>
                      )}
                    </>
                  );
                })()}

                <Divider sx={{ gridColumn: "1 / -1", my: 0.5 }} />

                {(() => {
                  const ac = policyDraft.after_call_card ?? DEFAULT_AFTER_CALL_CARD_POLICY;
                  return (
                    <>
                      <Box sx={{ gridColumn: "1 / -1" }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: textPrimary }}>
                          {t("phoneAssistant.deviceConsole.afterCallCardTitle")}
                        </Typography>
                      </Box>

                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            color="warning"
                            checked={ac.enabled}
                            onChange={(_e, checked) =>
                              setPolicyDraft({
                                ...policyDraft,
                                after_call_card: { ...ac, enabled: checked },
                              })
                            }
                            slotProps={{
                              input: {
                                role: "switch",
                                "aria-label": t("phoneAssistant.deviceConsole.afterCallEnabledLabel"),
                              },
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ fontSize: 13, color: textPrimary }}>
                            {t("phoneAssistant.deviceConsole.afterCallEnabledLabel")}
                          </Typography>
                        }
                      />

                      <TextField
                        size="small"
                        type="number"
                        fullWidth
                        label={t("phoneAssistant.deviceConsole.afterCallDismissLabel")}
                        value={ac.auto_dismiss_seconds}
                        onChange={(e) =>
                          setPolicyDraft({
                            ...policyDraft,
                            after_call_card: {
                              ...ac,
                              auto_dismiss_seconds: Math.max(
                                0,
                                Math.min(120, Number(e.target.value) || 0),
                              ),
                            },
                          })
                        }
                        slotProps={{
                          htmlInput: {
                            min: 0,
                            max: 120,
                            style: { fontVariantNumeric: "tabular-nums" },
                          },
                        }}
                      />

                      <TextField
                        size="small"
                        fullWidth
                        sx={{ gridColumn: { sm: "1 / -1" } }}
                        label={t("phoneAssistant.deviceConsole.afterCallTagsLabel")}
                        value={ac.tags.join(", ")}
                        onChange={(e) => {
                          const parsed = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setPolicyDraft({
                            ...policyDraft,
                            after_call_card: {
                              ...ac,
                              tags: parsed.length > 0 ? parsed : DEFAULT_AFTER_CALL_CARD_POLICY.tags,
                            },
                          });
                        }}
                      />
                    </>
                  );
                })()}
              </Box>
            );
          })()}
        </Paper>
      )}

      {/* D2 & D3 Missed Calls & Follow-ups */}
      <MissedCallsAndFollowUpsPanel mode="staff" />

      {/* Devices List */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2.5,
          border: `1px solid ${borderColor}`,
          bgcolor: surfaceBg,
        }}
      >
        {devicesQuery.isLoading ? (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : devicesQuery.isError ? (
          <Alert severity="error">
            {t("phoneAssistant.deviceConsole.loadFailed")}
          </Alert>
        ) : filteredDevices.length === 0 ? (
          <Typography sx={{ fontSize: 13.5, color: textSecondary, py: 2, textAlign: "center" }}>
            {t("phoneAssistant.deviceConsole.empty")}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {filteredDevices.map((d) => {
              const palette = statusChipPalette(d.status, isDark);
              return (
                <Paper
                  key={d.operator_device_id}
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: rowBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1.5}
                    sx={{ justifyContent: "space-between", alignItems: { md: "flex-start" } }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 15, color: textPrimary }}>
                          {d.device_label || d.device_model || t("signatures.PairedPhonesSection.unlabelledPhone")}
                        </Typography>
                        <Chip
                          size="small"
                          label={t(`phoneAssistant.deviceStatus.${d.status}`)}
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.7rem",
                            height: 22,
                            bgcolor: palette.bg,
                            color: palette.fg,
                            border: `1px solid ${palette.border}`,
                          }}
                        />
                        {d.is_native_app && (
                          <Chip
                            size="small"
                            label={t("phoneAssistant.pairedPhones.nativeApp")}
                            color="warning"
                            variant="outlined"
                            sx={{ height: 22, fontWeight: 700, fontSize: "0.7rem" }}
                          />
                        )}
                        <Chip
                          size="small"
                          label={t("phoneAssistant.deviceConsole.briefProfileChip", {
                            profile:
                              d.brief_profile_id ||
                              (d.staff_is_admin
                                ? "owner"
                                : policyDraft?.fallback_profile ?? "counter"),
                          })}
                          color="default"
                          variant="outlined"
                          sx={{ height: 22, fontWeight: 700, fontSize: "0.7rem" }}
                        />
                        {d.muted && (
                          <Chip
                            size="small"
                            label={t("phoneAssistant.deviceConsole.mutedBadge")}
                            color="warning"
                            variant="outlined"
                            sx={{ height: 22, fontWeight: 700, fontSize: "0.7rem" }}
                          />
                        )}
                        {d.health_warnings.map((w) => (
                          <Chip
                            key={w}
                            size="small"
                            icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
                            label={t(`phoneAssistant.healthWarnings.${w}`, w)}
                            color="error"
                            variant="outlined"
                            sx={{ height: 22, fontWeight: 700, fontSize: "0.68rem" }}
                          />
                        ))}
                      </Stack>

                      <Typography sx={{ fontSize: 13, color: textSecondary, mt: 0.5 }}>
                        <strong>{d.staff_name}</strong>
                        {d.staff_role_name ? ` · ${d.staff_role_name}` : ""}
                        {d.device_model ? ` · ${d.device_model}` : ""}
                        {d.os_version ? ` · ${d.os_version}` : ""}
                        {d.app_version ? ` · v${d.app_version}` : ""}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 12,
                          color: textSecondary,
                          mt: 0.25,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {t("signatures.PairedPhonesSection.paired", {
                          value: new Date(d.paired_at).toLocaleString(),
                        })}
                        {d.last_seen_at
                          ? ` · ${t("signatures.PairedPhonesSection.lastSeen", {
                              value: new Date(d.last_seen_at).toLocaleString(),
                            })}`
                          : ""}
                        {` · ${t("phoneAssistant.deviceConsole.countsLine", {
                          contacts: d.contact_count,
                          calls: d.calls_logged_count,
                        })}`}
                      </Typography>
                      {d.is_native_app && (
                        <Typography
                          variant="caption"
                          data-testid={`sync-line-${d.operator_device_id}`}
                          sx={{ display: "block", mt: 0.25, color: textSecondary, fontVariantNumeric: "tabular-nums" }}
                        >
                          {t("phoneAssistant.deviceConsole.syncLine", {
                            brief: d.briefs_synced_at ? new Date(d.briefs_synced_at).toLocaleString() : t("phoneShell.sync.never"),
                            contacts: (d.reported_state as any)?.last_contact_sync_at
                              ? new Date((d.reported_state as any).last_contact_sync_at).toLocaleString()
                              : t("phoneShell.sync.never"),
                            cached: (d.reported_state as any)?.cached_briefs ?? 0,
                            queued: (d.reported_state as any)?.outbox_pending ?? 0,
                          })}
                          {(d.reported_state as any)?.call_screen_unsupported
                            ? ` · ${t("phoneAssistant.deviceConsole.updateAppForDesign")}`
                            : ""}
                        </Typography>
                      )}

                      {canManagePolicy &&
                        ((d as any).recording_warning || (d as any).recording_missing_since) && (
                          <Alert severity="warning" sx={{ mt: 0.75, py: 0.25 }}>
                            {t("collections.recording.missingWarning", {
                              name: d.staff_name || d.device_label || d.device_id,
                              date: dayjs((d as any).recording_missing_since || (d as any).last_recording_received_at || d.paired_at).format("D MMM"),
                              defaultValue: `No call recordings received from ${d.staff_name || d.device_label || d.device_id}'s phone since ${dayjs((d as any).recording_missing_since || (d as any).last_recording_received_at || d.paired_at).format("D MMM")}`,
                            })}
                          </Alert>
                        )}

                      {/* Effective Capabilities */}
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
                        {CAPABILITY_KEYS.map((cap) => {
                          const enabled = Boolean(d.effective_capabilities?.[cap]);
                          const reason = d.capability_reasons?.[cap];
                          return (
                            <Chip
                              key={cap}
                              size="small"
                              icon={enabled ? <CheckCircleOutlinedIcon sx={{ fontSize: 14 }} /> : undefined}
                              label={
                                enabled || !reason
                                  ? t(`phoneAssistant.capabilities.${cap}`)
                                  : `${t(`phoneAssistant.capabilities.${cap}`)} (${t(
                                      `phoneAssistant.capabilityReasons.${reason}`,
                                      reason,
                                    )})`
                              }
                              color={enabled ? "success" : "default"}
                              variant={enabled ? "outlined" : "filled"}
                              sx={{ height: 24, fontSize: "0.7rem", fontWeight: 600 }}
                            />
                          );
                        })}
                      </Box>
                    </Box>

                    {/* Device Action Buttons */}
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, flexShrink: 0 }}>
                      {d.status === "PENDING" && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => void handleStatusChange(d.operator_device_id, "ACTIVE")}
                            sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                          >
                            {t("phoneAssistant.deviceConsole.approve")}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() =>
                              void handleStatusChange(d.operator_device_id, "REVOKED", "Rejected")
                            }
                            sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                          >
                            {t("phoneAssistant.deviceConsole.reject")}
                          </Button>
                        </>
                      )}

                      {d.status === "ACTIVE" && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => void handleStatusChange(d.operator_device_id, "SUSPENDED")}
                            sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                          >
                            {t("phoneAssistant.deviceConsole.suspend")}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SecurityIcon fontSize="small" />}
                            onClick={() => void handleWipe(d)}
                            sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                          >
                            {t("phoneAssistant.deviceConsole.wipe")}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SendOutlinedIcon fontSize="small" />}
                            onClick={() => void handleTestPush(d)}
                            sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                          >
                            {t("phoneAssistant.deviceConsole.testPush")}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<TuneIcon fontSize="small" />}
                            onClick={() => openEditDialog(d)}
                            sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                          >
                            {t("phoneAssistant.deviceConsole.edit")}
                          </Button>
                        </>
                      )}

                      {d.status === "SUSPENDED" && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => void handleStatusChange(d.operator_device_id, "ACTIVE")}
                            sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                          >
                            {t("phoneAssistant.deviceConsole.resume")}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SecurityIcon fontSize="small" />}
                            onClick={() => void handleWipe(d)}
                            sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                          >
                            {t("phoneAssistant.deviceConsole.wipe")}
                          </Button>
                        </>
                      )}

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<TimelineIcon fontSize="small" />}
                        onClick={() => setAuditDevice(d)}
                        sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                      >
                        {t("phoneAssistant.deviceConsole.audit")}
                      </Button>

                      {d.status !== "REVOKED" && d.status !== "PENDING" && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteOutlinedIcon fontSize="small" />}
                          onClick={() => {
                            if (
                              confirm(
                                t("phoneAssistant.deviceConsole.confirmRevoke", {
                                  name: d.device_label || d.staff_name,
                                }),
                              )
                            ) {
                              void handleStatusChange(d.operator_device_id, "REVOKED");
                            }
                          }}
                          sx={{ textTransform: "none", fontWeight: 700, minHeight: 36 }}
                        >
                          {t("phoneAssistant.deviceConsole.revoke")}
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Edit Device Dialog */}
      <Dialog
        open={Boolean(editDevice)}
        onClose={() => setEditDevice(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t("phoneAssistant.deviceConsole.editDialogTitle")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            size="small"
            fullWidth
            label={t("phoneAssistant.deviceConsole.deviceLabelField")}
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="edit-brief-profile-label">
              {t("phoneAssistant.deviceConsole.briefProfileField")}
            </InputLabel>
            <Select
              labelId="edit-brief-profile-label"
              label={t("phoneAssistant.deviceConsole.briefProfileField")}
              value={editBriefProfileId}
              onChange={(e) => setEditBriefProfileId(String(e.target.value))}
            >
              <MenuItem value="">
                {t("phoneAssistant.deviceConsole.briefProfileDefault")}
              </MenuItem>
              {(policyDraft?.brief_profiles && policyDraft.brief_profiles.length > 0
                ? policyDraft.brief_profiles
                : DEFAULT_BRIEF_PROFILES
              ).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} ({p.amounts})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                size="small"
                color="warning"
                checked={editMuted}
                onChange={(_e, checked) => setEditMuted(checked)}
                slotProps={{
                  input: {
                    role: "switch",
                    "aria-label": t("phoneAssistant.deviceConsole.muteNotificationsField"),
                  },
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                {t("phoneAssistant.deviceConsole.muteNotificationsField")}
              </Typography>
            }
          />
          <FormControl size="small" fullWidth>
            <InputLabel id="edit-contact-sync-mode-label">
              {t("phoneAssistant.deviceConsole.contactSyncModeField")}
            </InputLabel>
            <Select
              labelId="edit-contact-sync-mode-label"
              label={t("phoneAssistant.deviceConsole.contactSyncModeField")}
              value={editContactSyncMode}
              onChange={(e) => setEditContactSyncMode(e.target.value as ContactSyncMode)}
            >
              {CONTACT_SYNC_MODE_KEYS.map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {t(`phoneAssistant.deviceConsole.contactSyncModes.${mode}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel id="edit-call-logging-scope-label">
              {t("phoneAssistant.deviceConsole.callLoggingScopeField")}
            </InputLabel>
            <Select
              labelId="edit-call-logging-scope-label"
              label={t("phoneAssistant.deviceConsole.callLoggingScopeField")}
              value={editCallLoggingScope}
              onChange={(e) => setEditCallLoggingScope(e.target.value as CallLoggingScope)}
            >
              {CALL_LOGGING_SCOPE_KEYS.map((scope) => (
                <MenuItem key={scope} value={scope}>
                  {t(`phoneAssistant.deviceConsole.callLoggingScopes.${scope}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel id="edit-sim-filter-label">
              {t("phoneAssistant.deviceConsole.simFilterField")}
            </InputLabel>
            <Select
              labelId="edit-sim-filter-label"
              label={t("phoneAssistant.deviceConsole.simFilterField")}
              value={editSimFilter}
              onChange={(e) => setEditSimFilter(String(e.target.value))}
            >
              <MenuItem value="">
                {t("phoneAssistant.deviceConsole.simFilterAll")}
              </MenuItem>
              <MenuItem value="SIM 1">SIM 1</MenuItem>
              <MenuItem value="SIM 2">SIM 2</MenuItem>
            </Select>
          </FormControl>
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: textSecondary, mb: 0.75 }}>
              {t("phoneAssistant.deviceConsole.deviceCapabilitiesField")}
            </Typography>
            <Stack>
              {CAPABILITY_KEYS.map((key) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      size="small"
                      color="warning"
                      checked={editCapabilities[key] !== false}
                      onChange={(_e, checked) =>
                        setEditCapabilities((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                      {t(`phoneAssistant.capabilities.${key}`)}
                    </Typography>
                  }
                />
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDevice(null)} color="inherit" sx={{ textTransform: "none" }}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={updateDeviceMut.isPending}
            onClick={() => void handleSaveEdit()}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {t("common.save", "Save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog
        open={Boolean(auditDevice)}
        onClose={() => setAuditDevice(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t("phoneAssistant.deviceConsole.auditDialogTitle", {
            name: auditDevice?.device_label || auditDevice?.staff_name || "",
          })}
        </DialogTitle>
        <DialogContent dividers>
          {auditQuery.isLoading ? (
            <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : auditQuery.isError ? (
            <Alert severity="error">{t("phoneAssistant.deviceConsole.auditLoadFailed")}</Alert>
          ) : (auditQuery.data?.logs?.length ?? 0) === 0 ? (
            <Typography sx={{ fontSize: 13, color: textSecondary }}>
              {t("phoneAssistant.deviceConsole.auditEmpty")}
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {auditQuery.data?.logs.map((log) => (
                <Box
                  key={log.audit_id}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: rowBg,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, color: textPrimary }}>
                      {log.action}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: textSecondary, fontVariantNumeric: "tabular-nums" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </Typography>
                  </Stack>
                  {log.actor_name && (
                    <Typography sx={{ fontSize: 12, color: textSecondary }}>
                      {log.actor_name}
                    </Typography>
                  )}
                  {log.detail != null && (
                    <Typography
                      component="pre"
                      sx={{
                        fontSize: 11,
                        color: textSecondary,
                        mt: 0.5,
                        mb: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "monospace",
                      }}
                    >
                      {typeof log.detail === "string"
                        ? log.detail
                        : JSON.stringify(log.detail)}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAuditDevice(null)} sx={{ textTransform: "none", fontWeight: 700 }}>
            {t("common.close", "Close")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
