import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useTranslation } from "react-i18next";
import type {
  PushDeliveryMode,
  PushEventCatalogEntry,
  PushSettingsPayload,
} from "../api/phoneAssistantApi";
import {
  usePushRoles,
  usePushSettings,
  useSendPushTest,
  useUpdatePushSettings,
} from "../hooks/usePushSettings";

const FALLBACK_CATALOG: PushEventCatalogEntry[] = [
  { key: "invoice_created", group: "bills", default_enabled: true, has_amount: true },
  { key: "payment_received", group: "payments", default_enabled: true, has_amount: true },
  { key: "return_processed", group: "returns", default_enabled: true, has_amount: true },
  { key: "invoice_deleted", group: "bills", default_enabled: true, has_amount: false },
  { key: "invoice_restored", group: "bills", default_enabled: true, has_amount: false },
  { key: "payment_voided", group: "payments", default_enabled: true, has_amount: true },
  { key: "contact_used", group: "alerts", default_enabled: true, has_amount: false },
  { key: "customer_blacklisted", group: "alerts", default_enabled: true, has_amount: false },
  { key: "daily_summary", group: "digest", default_enabled: false, has_amount: false },
];

const DAILY_SUMMARY_SECTIONS = [
  "bills",
  "payments",
  "returns",
  "due_tomorrow",
  "overdue",
] as const;

function buildInitialDraft(source: PushSettingsPayload): PushSettingsPayload {
  const normalizedEvents: PushSettingsPayload["events"] = {};
  for (const [key, rule] of Object.entries(source.events ?? {})) {
    normalizedEvents[key] = {
      enabled: Boolean(rule?.enabled),
      min_amount: Number(rule?.min_amount ?? 0),
      recipient_role_ids: Array.isArray(rule?.recipient_role_ids)
        ? rule.recipient_role_ids
        : [],
      hide_customer_name: Boolean(rule?.hide_customer_name),
      delivery: rule?.delivery === "digest" ? "digest" : "instant",
    };
  }
  return {
    ...source,
    events: normalizedEvents,
    digest_minutes: source.digest_minutes ?? 30,
    daily_summary: source.daily_summary ?? {
      enabled: false,
      send_time: "20:00",
      recipient_role_ids: [],
      sections: {
        bills: true,
        payments: true,
        returns: true,
        due_tomorrow: true,
        overdue: true,
      },
    },
  };
}

export function PushSettingsPanel() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const surfaceBg = isDark ? "#0f172a" : "#ffffff";
  const rowBg = isDark ? "#1e293b" : "#f8fafc";
  const borderColor = isDark ? "#334155" : "#e2e8f0";
  const textPrimary = isDark ? "#f8fafc" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#475569";

  const { data, isLoading, isError } = usePushSettings(true);
  const { data: roles = [] } = usePushRoles(true);
  const updateSettings = useUpdatePushSettings();
  const sendTest = useSendPushTest();

  const [draft, setDraft] = useState<PushSettingsPayload | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    severity: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  const catalog = data?.catalog?.length ? data.catalog : FALLBACK_CATALOG;

  useEffect(() => {
    if (!data?.settings) return;
    setDraft(buildInitialDraft(data.settings));
  }, [data?.settings]);

  const roleNameMap = new Map(roles.map((r) => [r.role_id, r.role_name]));

  const updateEventRule = (
    key: string,
    patch: Partial<PushSettingsPayload["events"][string]>,
  ) => {
    setSaveMessage(null);
    setSaveError(null);
    setDraft((prev) => {
      if (!prev) return prev;
      const existing = prev.events[key] ?? {
        enabled: true,
        min_amount: 0,
        recipient_role_ids: [],
      };
      return {
        ...prev,
        events: {
          ...prev.events,
          [key]: {
            ...existing,
            ...patch,
          },
        },
      };
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaveMessage(null);
    setSaveError(null);
    try {
      await updateSettings.mutateAsync(draft);
      setSaveMessage(t("phoneAssistant.pushSettings.savedBanner"));
    } catch (err: any) {
      setSaveError(
        err?.message || t("phoneAssistant.pushSettings.saveFailed"),
      );
    }
  };

  const handleSendTest = async () => {
    setTestResult(null);
    try {
      const res = await sendTest.mutateAsync();
      const reached = Number(res?.reached ?? 0);
      if (reached > 0) {
        setTestResult({
          severity: "success",
          text: t("phoneAssistant.pushSettings.testSent", { count: reached }),
        });
      } else {
        setTestResult({
          severity: "warning",
          text: t("phoneAssistant.pushSettings.testNoDevices"),
        });
      }
    } catch (err: any) {
      setTestResult({
        severity: "error",
        text: err?.message || t("phoneAssistant.pushSettings.testFailed"),
      });
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2.5,
        bgcolor: surfaceBg,
        borderColor,
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: isDark
                  ? "rgba(217, 119, 6, 0.16)"
                  : "rgba(245, 158, 11, 0.14)",
                color: "#d97706",
              }}
            >
              <AdminPanelSettingsOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontSize: 16, color: textPrimary }}
              >
                {t("phoneAssistant.pushSettings.title")}
              </Typography>
              <Typography variant="caption" sx={{ color: textSecondary }}>
                {t("phoneAssistant.pushSettings.subtitle")}
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="outlined"
            startIcon={
              sendTest.isPending ? (
                <CircularProgress size={16} sx={{ color: "#d97706" }} />
              ) : (
                <SendOutlinedIcon fontSize="small" />
              )
            }
            disabled={sendTest.isPending}
            onClick={handleSendTest}
            sx={{
              minHeight: 40,
              textTransform: "none",
              fontWeight: 600,
              borderColor: "#d97706",
              color: isDark ? "#fbbf24" : "#b45309",
              "&:hover": {
                borderColor: "#b45309",
                bgcolor: "rgba(217, 119, 6, 0.08)",
              },
            }}
          >
            {sendTest.isPending
              ? t("phoneAssistant.pushSettings.sendingTest")
              : t("phoneAssistant.pushSettings.sendTest")}
          </Button>
        </Stack>

        {testResult && (
          <Alert severity={testResult.severity}>{testResult.text}</Alert>
        )}

        {isLoading || !draft ? (
          isError ? (
            <Alert severity="error">
              {t("phoneAssistant.pushSettings.loadFailed")}
            </Alert>
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} sx={{ color: "#d97706" }} />
            </Box>
          )
        ) : (
          <>
            <Stack spacing={1.5}>
              {catalog
                .filter((cat) => cat.key !== "daily_summary")
                .map((cat) => {
                  const rule = draft.events[cat.key] ?? {
                    enabled: cat.default_enabled,
                    min_amount: 0,
                    recipient_role_ids: [],
                    hide_customer_name: false,
                    delivery: "instant" as PushDeliveryMode,
                  };
                const eventLabel = t(
                  `phoneAssistant.pushEvents.${cat.key}.label`,
                  { defaultValue: cat.key },
                );
                const eventDescription = t(
                  `phoneAssistant.pushEvents.${cat.key}.description`,
                  { defaultValue: "" },
                );

                return (
                  <Paper
                    key={cat.key}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: rowBg,
                      borderColor,
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, color: textPrimary }}
                          >
                            {eventLabel}
                          </Typography>
                          {eventDescription && (
                            <Typography
                              variant="caption"
                              sx={{ color: textSecondary, display: "block" }}
                            >
                              {eventDescription}
                            </Typography>
                          )}
                        </Box>

                        <Switch
                          checked={Boolean(rule.enabled)}
                          color="warning"
                          onChange={(_e, checked) =>
                            updateEventRule(cat.key, { enabled: checked })
                          }
                          slotProps={{
                            input: {
                              role: "switch",
                              "aria-label": `${eventLabel} ${t("phoneAssistant.pushSettings.enabledColumn")}`,
                            },
                          }}
                        />
                      </Stack>

                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.5}
                        sx={{ alignItems: { xs: "stretch", md: "center" } }}
                      >
                        {cat.has_amount && (
                          <TextField
                            size="small"
                            type="number"
                            label={t("phoneAssistant.pushSettings.minAmountColumn")}
                            value={rule.min_amount ?? 0}
                            disabled={!rule.enabled}
                            onChange={(e) => {
                              const nextVal = Math.max(
                                0,
                                Number(e.target.value || 0),
                              );
                              updateEventRule(cat.key, {
                                min_amount: Number.isFinite(nextVal) ? nextVal : 0,
                              });
                            }}
                            sx={{
                              width: { xs: "100%", md: 220 },
                              "& .MuiInputBase-root": {
                                bgcolor: surfaceBg,
                                color: textPrimary,
                              },
                              "& .MuiInputLabel-root": {
                                color: textSecondary,
                              },
                            }}
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    Rs.
                                  </InputAdornment>
                                ),
                              },
                              htmlInput: {
                                min: 0,
                                step: 1,
                                inputMode: "numeric",
                                style: { fontVariantNumeric: "tabular-nums" },
                              },
                            }}
                          />
                        )}

                        <FormControl
                          size="small"
                          sx={{
                            flex: 1,
                            minWidth: { xs: "100%", md: 240 },
                            "& .MuiInputBase-root": {
                              bgcolor: surfaceBg,
                              color: textPrimary,
                            },
                          }}
                          disabled={!rule.enabled}
                        >
                          <Select
                            multiple
                            displayEmpty
                            value={rule.recipient_role_ids ?? []}
                            input={<OutlinedInput />}
                            onChange={(e) => {
                              const value = e.target.value;
                              const ids = (
                                Array.isArray(value) ? value : []
                              ).map((v) => Number(v));
                              updateEventRule(cat.key, {
                                recipient_role_ids: ids,
                              });
                            }}
                            renderValue={(selected) => {
                              const ids = (selected as number[]) ?? [];
                              if (ids.length === 0) {
                                return (
                                  <Typography
                                    variant="body2"
                                    sx={{ color: textSecondary }}
                                  >
                                    {t("phoneAssistant.pushSettings.adminsOnly")}
                                  </Typography>
                                );
                              }
                              return (
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 0.5,
                                  }}
                                >
                                  {ids.map((id) => (
                                    <Chip
                                      key={id}
                                      size="small"
                                      label={roleNameMap.get(id) ?? `#${id}`}
                                      sx={{
                                        height: 22,
                                        fontSize: 12,
                                        bgcolor: isDark ? "#334155" : "#fef3c7",
                                        color: isDark ? "#f8fafc" : "#92400e",
                                      }}
                                    />
                                  ))}
                                </Box>
                              );
                            }}
                            slotProps={{
                              input: {
                                "aria-label": `${eventLabel} ${t("phoneAssistant.pushSettings.rolesColumn")}`,
                              },
                            }}
                          >
                            {roles.map((role) => (
                              <MenuItem key={role.role_id} value={role.role_id}>
                                {role.role_name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl
                          size="small"
                          sx={{
                            minWidth: { xs: "100%", md: 165 },
                            "& .MuiInputBase-root": {
                              bgcolor: surfaceBg,
                              color: textPrimary,
                            },
                            "& .MuiInputLabel-root": {
                              color: textSecondary,
                            },
                          }}
                        >
                          <InputLabel id={`delivery-${cat.key}-label`}>
                            {t("phoneAssistant.pushSettings.deliveryMode")}
                          </InputLabel>
                          <Select
                            labelId={`delivery-${cat.key}-label`}
                            label={t("phoneAssistant.pushSettings.deliveryMode")}
                            disabled={!rule.enabled}
                            value={rule.delivery ?? "instant"}
                            onChange={(e) =>
                              updateEventRule(cat.key, {
                                delivery: e.target.value as PushDeliveryMode,
                              })
                            }
                          >
                            <MenuItem value="instant">
                              {t("phoneAssistant.pushSettings.deliveryInstant")}
                            </MenuItem>
                            <MenuItem value="digest">
                              {t("phoneAssistant.pushSettings.deliveryDigest")}
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>

                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              color="warning"
                              disabled={!rule.enabled}
                              checked={Boolean(rule.hide_customer_name)}
                              onChange={(_e, checked) =>
                                updateEventRule(cat.key, {
                                  hide_customer_name: checked,
                                })
                              }
                              slotProps={{
                                input: {
                                  role: "switch",
                                  "aria-label": `${eventLabel} ${t("phoneAssistant.pushSettings.hideCustomerName")}`,
                                },
                              }}
                            />
                          }
                          label={
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: textSecondary }}>
                              {t("phoneAssistant.pushSettings.hideCustomerName")}
                            </Typography>
                          }
                          sx={{ m: 0 }}
                        />
                      </Box>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>

            <Divider sx={{ borderColor }} />

            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: 2, bgcolor: rowBg, borderColor }}
            >
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: textPrimary }}
                    >
                      {t("phoneAssistant.pushSettings.quietHoursTitle")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: textSecondary }}>
                      {t("phoneAssistant.pushSettings.quietHoursHint")}
                    </Typography>
                  </Box>
                  <Switch
                    checked={Boolean(draft.quiet_hours.enabled)}
                    color="warning"
                    onChange={(_e, checked) => {
                      setSaveMessage(null);
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              quiet_hours: {
                                ...prev.quiet_hours,
                                enabled: checked,
                              },
                            }
                          : prev,
                      );
                    }}
                    slotProps={{
                      input: {
                        role: "switch",
                        "aria-label": t(
                          "phoneAssistant.pushSettings.quietHoursTitle",
                        ),
                      },
                    }}
                  />
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    size="small"
                    type="time"
                    label={t("phoneAssistant.pushSettings.quietFrom")}
                    value={draft.quiet_hours.from}
                    disabled={!draft.quiet_hours.enabled}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSaveMessage(null);
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              quiet_hours: { ...prev.quiet_hours, from: val },
                            }
                          : prev,
                      );
                    }}
                    sx={{
                      width: { xs: "100%", sm: 170 },
                      "& .MuiInputBase-root": {
                        bgcolor: surfaceBg,
                        color: textPrimary,
                      },
                      "& .MuiInputLabel-root": { color: textSecondary },
                    }}
                    slotProps={{
                      htmlInput: {
                        style: { fontVariantNumeric: "tabular-nums" },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    type="time"
                    label={t("phoneAssistant.pushSettings.quietTo")}
                    value={draft.quiet_hours.to}
                    disabled={!draft.quiet_hours.enabled}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSaveMessage(null);
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              quiet_hours: { ...prev.quiet_hours, to: val },
                            }
                          : prev,
                      );
                    }}
                    sx={{
                      width: { xs: "100%", sm: 170 },
                      "& .MuiInputBase-root": {
                        bgcolor: surfaceBg,
                        color: textPrimary,
                      },
                      "& .MuiInputLabel-root": { color: textSecondary },
                    }}
                    slotProps={{
                      htmlInput: {
                        style: { fontVariantNumeric: "tabular-nums" },
                      },
                    }}
                  />
                </Stack>

                <Divider sx={{ borderColor }} />

                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: textPrimary }}
                    >
                      {t("phoneAssistant.pushSettings.includeAmountsTitle")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: textSecondary }}>
                      {t("phoneAssistant.pushSettings.includeAmountsHint")}
                    </Typography>
                  </Box>
                  <Switch
                    checked={Boolean(draft.include_amounts)}
                    color="warning"
                    onChange={(_e, checked) => {
                      setSaveMessage(null);
                      setDraft((prev) =>
                        prev ? { ...prev, include_amounts: checked } : prev,
                      );
                    }}
                    slotProps={{
                      input: {
                        role: "switch",
                        "aria-label": t(
                          "phoneAssistant.pushSettings.includeAmountsTitle",
                        ),
                      },
                    }}
                  />
                </Stack>

                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: textPrimary }}
                    >
                      {t("phoneAssistant.pushSettings.notifyActorTitle")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: textSecondary }}>
                      {t("phoneAssistant.pushSettings.notifyActorHint")}
                    </Typography>
                  </Box>
                  <Switch
                    checked={Boolean(draft.notify_actor)}
                    color="warning"
                    onChange={(_e, checked) => {
                      setSaveMessage(null);
                      setDraft((prev) =>
                        prev ? { ...prev, notify_actor: checked } : prev,
                      );
                    }}
                    slotProps={{
                      input: {
                        role: "switch",
                        "aria-label": t(
                          "phoneAssistant.pushSettings.notifyActorTitle",
                        ),
                      },
                    }}
                  />
                </Stack>

                <Divider sx={{ borderColor }} />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: textPrimary }}
                    >
                      {t("phoneAssistant.pushSettings.digestIntervalLabel")}
                    </Typography>
                    <Typography variant="caption" sx={{ color: textSecondary }}>
                      {t("phoneAssistant.pushSettings.digestIntervalHint")}
                    </Typography>
                  </Box>
                  <FormControl
                    size="small"
                    sx={{
                      minWidth: 160,
                      "& .MuiInputBase-root": {
                        bgcolor: surfaceBg,
                        color: textPrimary,
                      },
                      "& .MuiInputLabel-root": {
                        color: textSecondary,
                      },
                    }}
                  >
                    <InputLabel id="digest-interval-label">
                      {t("phoneAssistant.pushSettings.digestIntervalLabel")}
                    </InputLabel>
                    <Select
                      labelId="digest-interval-label"
                      label={t("phoneAssistant.pushSettings.digestIntervalLabel")}
                      value={draft.digest_minutes ?? 30}
                      onChange={(e) => {
                        setSaveMessage(null);
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                digest_minutes: Number(e.target.value) || 30,
                              }
                            : prev,
                        );
                      }}
                    >
                      <MenuItem value={15}>
                        {t("phoneAssistant.pushSettings.digestMinutesOption", { minutes: 15 })}
                      </MenuItem>
                      <MenuItem value={30}>
                        {t("phoneAssistant.pushSettings.digestMinutesOption", { minutes: 30 })}
                      </MenuItem>
                      <MenuItem value={60}>
                        {t("phoneAssistant.pushSettings.digestMinutesOption", { minutes: 60 })}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                <Divider sx={{ borderColor }} />

                {(() => {
                  const daily = draft.daily_summary ?? {
                    enabled: false,
                    send_time: "20:00",
                    recipient_role_ids: [],
                    sections: {
                      bills: true,
                      payments: true,
                      returns: true,
                      due_tomorrow: true,
                      overdue: true,
                    },
                  };
                  const updateDaily = (
                    patch: Partial<NonNullable<PushSettingsPayload["daily_summary"]>>,
                  ) => {
                    setSaveMessage(null);
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            daily_summary: {
                              ...daily,
                              ...patch,
                            },
                          }
                        : prev,
                    );
                  };
                  return (
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{ alignItems: "center", justifyContent: "space-between" }}
                      >
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 700, color: textPrimary }}
                          >
                            {t("phoneAssistant.pushSettings.dailySummaryTitle")}
                          </Typography>
                          <Typography variant="caption" sx={{ color: textSecondary }}>
                            {t("phoneAssistant.pushSettings.dailySummaryHint")}
                          </Typography>
                        </Box>
                        <Switch
                          checked={Boolean(daily.enabled)}
                          color="warning"
                          onChange={(_e, checked) =>
                            updateDaily({ enabled: checked })
                          }
                          slotProps={{
                            input: {
                              role: "switch",
                              "aria-label": t(
                                "phoneAssistant.pushSettings.dailySummaryTitle",
                              ),
                            },
                          }}
                        />
                      </Stack>

                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        sx={{ alignItems: { xs: "stretch", sm: "center" } }}
                      >
                        <TextField
                          size="small"
                          type="time"
                          label={t("phoneAssistant.pushSettings.dailySummaryTime")}
                          value={daily.send_time}
                          disabled={!daily.enabled}
                          onChange={(e) =>
                            updateDaily({ send_time: e.target.value || "20:00" })
                          }
                          sx={{
                            width: { xs: "100%", sm: 170 },
                            "& .MuiInputBase-root": {
                              bgcolor: surfaceBg,
                              color: textPrimary,
                            },
                            "& .MuiInputLabel-root": {
                              color: textSecondary,
                            },
                          }}
                          slotProps={{
                            inputLabel: { shrink: true },
                            htmlInput: {
                              style: { fontVariantNumeric: "tabular-nums" },
                            },
                          }}
                        />

                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                          {DAILY_SUMMARY_SECTIONS.map((sec) => (
                            <FormControlLabel
                              key={sec}
                              control={
                                <Checkbox
                                  size="small"
                                  color="warning"
                                  disabled={!daily.enabled}
                                  checked={Boolean(daily.sections[sec])}
                                  onChange={(_e, checked) =>
                                    updateDaily({
                                      sections: {
                                        ...daily.sections,
                                        [sec]: checked,
                                      },
                                    })
                                  }
                                />
                              }
                              label={
                                <Typography
                                  sx={{
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    color: textPrimary,
                                  }}
                                >
                                  {t(
                                    `phoneAssistant.pushSettings.dailySummarySections.${sec}`,
                                  )}
                                </Typography>
                              }
                              sx={{ m: 0 }}
                            />
                          ))}
                        </Box>
                      </Stack>
                    </Stack>
                  );
                })()}
              </Stack>
            </Paper>

            {saveError && <Alert severity="error">{saveError}</Alert>}
            {saveMessage && <Alert severity="success">{saveMessage}</Alert>}

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={
                  updateSettings.isPending ? (
                    <CircularProgress size={16} sx={{ color: "#ffffff" }} />
                  ) : (
                    <SaveOutlinedIcon fontSize="small" />
                  )
                }
                disabled={updateSettings.isPending}
                onClick={handleSave}
                sx={{
                  minHeight: 42,
                  textTransform: "none",
                  fontWeight: 700,
                  bgcolor: "#d97706",
                  color: "#ffffff",
                  "&:hover": { bgcolor: "#b45309" },
                }}
              >
                {updateSettings.isPending
                  ? t("phoneAssistant.pushSettings.savingButton")
                  : t("phoneAssistant.pushSettings.saveButton")}
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </Paper>
  );
}
