import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
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

type EventRule = PushSettingsPayload["events"][string];

const FALLBACK_CATALOG: PushEventCatalogEntry[] = [
  { key: "invoice_created", group: "bills", default_enabled: true, has_amount: true },
  { key: "payment_received", group: "payments", default_enabled: true, has_amount: true },
  { key: "return_processed", group: "returns", default_enabled: true, has_amount: true },
  { key: "invoice_deleted", group: "alerts", default_enabled: true, has_amount: true },
  { key: "invoice_restored", group: "alerts", default_enabled: false, has_amount: true },
  { key: "payment_voided", group: "alerts", default_enabled: true, has_amount: true },
  { key: "customer_blacklisted", group: "alerts", default_enabled: false, has_amount: false },
  { key: "follow_up_due", group: "alerts", default_enabled: true, has_amount: false },
  { key: "daily_summary", group: "digest", default_enabled: false, has_amount: false },
];

const GROUP_ORDER = ["bills", "payments", "returns", "alerts", "digest"] as const;
const DAILY_SUMMARY_SECTIONS = ["bills", "payments", "returns", "due_tomorrow", "overdue"] as const;

const DEFAULT_RULE: EventRule = {
  enabled: true,
  min_amount: 0,
  recipient_role_ids: [],
  hide_customer_name: false,
  hide_amount: false,
  delivery: "instant",
};

const ruleOf = (settings: PushSettingsPayload, key: string): EventRule => ({
  ...DEFAULT_RULE,
  ...(settings.events?.[key] ?? {}),
});

// Pushed events that carry no customer, so "Hide name" would do nothing.
const NO_CUSTOMER_EVENTS = new Set(["daily_summary"]);

/** Compact notifications grid: one row per event, every cell saves by itself on change or blur. */
export function PushSettingsPanel() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down("sm"));

  const { data, isLoading, isError } = usePushSettings(true);
  const { data: roles = [] } = usePushRoles(true);
  const update = useUpdatePushSettings();
  const sendTest = useSendPushTest();

  const [savedKeys, setSavedKeys] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ severity: "success" | "warning" | "error"; text: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const latest = useRef<PushSettingsPayload | null>(null);
  latest.current = data?.settings ?? null;

  const catalog = data?.catalog?.length ? data.catalog : FALLBACK_CATALOG;

  const groups = useMemo(() => {
    const byGroup = new Map<string, PushEventCatalogEntry[]>();
    for (const entry of catalog) {
      const g = entry.group && GROUP_ORDER.includes(entry.group as any) ? entry.group : "alerts";
      byGroup.set(g, [...(byGroup.get(g) ?? []), entry]);
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, entries: byGroup.get(g)! }));
  }, [catalog]);

  const flash = useCallback((key: string) => {
    const stamp = Date.now();
    setSavedKeys((prev) => ({ ...prev, [key]: stamp }));
    window.setTimeout(() => {
      setSavedKeys((prev) => {
        if (prev[key] !== stamp) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 1800);
  }, []);

  /** Apply one change to the newest settings, save at once, tick the row on success. */
  const save = useCallback(
    (mutate: (s: PushSettingsPayload) => PushSettingsPayload, tickKey: string) => {
      const base = latest.current;
      if (!base) return;
      setError(null);
      update.mutate(mutate(base), {
        onSuccess: () => flash(tickKey),
        onError: (e: any) => setError(e?.message || t("phoneAssistant.pushGrid.saveFailed")),
      });
    },
    [flash, t, update],
  );

  const patchEvent = useCallback(
    (key: string, patch: Partial<EventRule>) =>
      save(
        (s) => ({ ...s, events: { ...s.events, [key]: { ...ruleOf(s, key), ...patch } } }),
        key,
      ),
    [save],
  );

  const bulk = useCallback(
    (patch: (rule: EventRule, entry: PushEventCatalogEntry) => Partial<EventRule>) => {
      setMenuAnchor(null);
      save((s) => {
        const events = { ...s.events };
        for (const entry of catalog) events[entry.key] = { ...ruleOf(s, entry.key), ...patch(ruleOf(s, entry.key), entry) };
        return { ...s, events };
      }, "__all");
    },
    [catalog, save],
  );

  const runTest = async () => {
    setTestResult(null);
    try {
      const res = await sendTest.mutateAsync();
      setTestResult(
        res.reached > 0
          ? { severity: "success", text: t("phoneAssistant.pushSettings.testSent", { count: res.reached }) }
          : { severity: "warning", text: t("phoneAssistant.pushSettings.testNoDevices") },
      );
    } catch (e: any) {
      setTestResult({ severity: "error", text: e?.message || t("phoneAssistant.pushSettings.testFailed") });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (isError || !data?.settings) {
    return <Alert severity="error">{t("phoneAssistant.pushSettings.loadFailed")}</Alert>;
  }
  const settings = data.settings;
  const eventName = (key: string) => t(`phoneAssistant.pushEvents.${key}.label`, { defaultValue: key });
  const Tick = ({ k }: { k: string }) =>
    savedKeys[k] ? (
      <CheckRoundedIcon
        aria-label={t("phoneAssistant.pushGrid.saved")}
        sx={{ fontSize: 18, color: "success.main", ml: 0.5 }}
      />
    ) : null;

  const roleSelect = (key: string, rule: EventRule) => (
    <FormControl size="small" fullWidth>
      <Select
        multiple
        displayEmpty
        value={rule.recipient_role_ids ?? []}
        onChange={(e) => patchEvent(key, { recipient_role_ids: (e.target.value as number[]).map(Number) })}
        renderValue={(selected) =>
          (selected as number[]).length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              {t("phoneAssistant.pushGrid.adminsOnly")}
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {(selected as number[]).map((id) => (
                <Chip key={id} size="small" label={roles.find((r) => r.role_id === id)?.role_name ?? `#${id}`} />
              ))}
            </Box>
          )
        }
        slotProps={{ input: { "aria-label": t("phoneAssistant.pushGrid.colRoles") } as any }}
      >
        {roles.map((r) => (
          <MenuItem key={r.role_id} value={r.role_id} dense>
            <Checkbox size="small" checked={(rule.recipient_role_ids ?? []).includes(r.role_id)} />
            <ListItemText primary={r.role_name} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const minAmountField = (key: string, entry: PushEventCatalogEntry, rule: EventRule) =>
    entry.has_amount ? (
      <TextField
        size="small"
        type="number"
        defaultValue={rule.min_amount ?? 0}
        key={`${key}-${rule.min_amount}`}
        onBlur={(e) => {
          const n = Math.max(0, Number(e.target.value) || 0);
          if (n !== Number(rule.min_amount ?? 0)) patchEvent(key, { min_amount: n });
        }}
        slotProps={{
          htmlInput: {
            min: 0,
            step: 100,
            "aria-label": t("phoneAssistant.pushGrid.colMinAmount"),
            style: { textAlign: "right", fontVariantNumeric: "tabular-nums" },
          },
        }}
        sx={{ width: 110 }}
      />
    ) : null;

  const deliverySelect = (key: string, rule: EventRule) => (
    <Select
      size="small"
      value={rule.delivery ?? "instant"}
      onChange={(e) => patchEvent(key, { delivery: e.target.value as PushDeliveryMode })}
      slotProps={{ input: { "aria-label": t("phoneAssistant.pushGrid.colDelivery") } as any }}
      sx={{ minWidth: 104 }}
    >
      <MenuItem value="instant">{t("phoneAssistant.pushSettings.deliveryInstant")}</MenuItem>
      <MenuItem value="digest">{t("phoneAssistant.pushSettings.deliveryDigest")}</MenuItem>
    </Select>
  );

  return (
    <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, border: 1, borderColor: "divider", borderRadius: 2.5, bgcolor: "background.paper" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", rowGap: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t("phoneAssistant.pushGrid.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("phoneAssistant.pushGrid.subtitle")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Tick k="__all" />
          <Button
            variant="outlined"
            size="small"
            startIcon={sendTest.isPending ? <CircularProgress size={14} /> : <SendOutlinedIcon fontSize="small" />}
            onClick={runTest}
            disabled={sendTest.isPending}
          >
            {t("phoneAssistant.pushSettings.sendTest")}
          </Button>
          <Tooltip title={t("phoneAssistant.pushGrid.bulkMenu")}>
            <IconButton size="small" aria-label={t("phoneAssistant.pushGrid.bulkMenu")} onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVertRoundedIcon />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => bulk(() => ({ enabled: true }))}>{t("phoneAssistant.pushGrid.allOn")}</MenuItem>
            <MenuItem onClick={() => bulk(() => ({ enabled: false }))}>{t("phoneAssistant.pushGrid.allOff")}</MenuItem>
            <MenuItem onClick={() => bulk(() => ({ delivery: "digest" }))}>{t("phoneAssistant.pushGrid.allDigest")}</MenuItem>
            <MenuItem onClick={() => bulk((_r, entry) => (entry.has_amount ? { min_amount: 0 } : {}))}>
              {t("phoneAssistant.pushGrid.clearMin")}
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      {testResult && (
        <Alert severity={testResult.severity} sx={{ mb: 1.5 }} onClose={() => setTestResult(null)}>
          {testResult.text}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {isNarrow ? (
        <Stack spacing={1.5}>
          {groups.map(({ group, entries }) => (
            <Box key={group}>
              <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: 1 }}>
                {t(`phoneAssistant.pushGrid.group.${group}`)}
              </Typography>
              <Stack spacing={1}>
                {entries.map((entry) => {
                  const rule = ruleOf(settings, entry.key);
                  return (
                    <Paper key={entry.key} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} data-testid={`event-card-${entry.key}`}>
                      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {eventName(entry.key)}
                          <Tick k={entry.key} />
                        </Typography>
                        <Switch
                          checked={Boolean(rule.enabled)}
                          onChange={(e) => patchEvent(entry.key, { enabled: e.target.checked })}
                          slotProps={{ input: { role: "switch", "aria-label": `${eventName(entry.key)} – ${t("phoneAssistant.pushGrid.colOn")}` } }}
                        />
                      </Stack>
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1, alignItems: "center" }}>
                        {entry.has_amount ? (
                          <Box>
                            <Typography variant="caption" color="text.secondary">{t("phoneAssistant.pushGrid.colMinAmount")}</Typography>
                            <Box>{minAmountField(entry.key, entry, rule)}</Box>
                          </Box>
                        ) : (
                          <Box />
                        )}
                        <Box>
                          <Typography variant="caption" color="text.secondary">{t("phoneAssistant.pushGrid.colDelivery")}</Typography>
                          <Box>{deliverySelect(entry.key, rule)}</Box>
                        </Box>
                        {!NO_CUSTOMER_EVENTS.has(entry.key) && (
                          <Stack direction="row" sx={{ alignItems: "center" }}>
                            <Checkbox
                              size="small"
                              checked={Boolean(rule.hide_customer_name)}
                              onChange={(e) => patchEvent(entry.key, { hide_customer_name: e.target.checked })}
                            />
                            <Typography variant="body2">{t("phoneAssistant.pushGrid.colHideName")}</Typography>
                          </Stack>
                        )}
                        {entry.has_amount && (
                          <Stack direction="row" sx={{ alignItems: "center" }}>
                            <Checkbox
                              size="small"
                              checked={Boolean(rule.hide_amount)}
                              onChange={(e) => patchEvent(entry.key, { hide_amount: e.target.checked })}
                            />
                            <Typography variant="body2">{t("phoneAssistant.pushGrid.colHideAmount")}</Typography>
                          </Stack>
                        )}
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">{t("phoneAssistant.pushGrid.colRoles")}</Typography>
                        {roleSelect(entry.key, rule)}
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Table size="small" sx={{ tableLayout: "fixed", minWidth: 860 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 190, fontWeight: 800 }}>{t("phoneAssistant.pushGrid.colEvent")}</TableCell>
                <TableCell sx={{ width: 70, fontWeight: 800 }}>{t("phoneAssistant.pushGrid.colOn")}</TableCell>
                <TableCell sx={{ width: 130, fontWeight: 800 }} align="right">{t("phoneAssistant.pushGrid.colMinAmount")}</TableCell>
                <TableCell sx={{ width: 130, fontWeight: 800 }}>{t("phoneAssistant.pushGrid.colDelivery")}</TableCell>
                <TableCell sx={{ width: 90, fontWeight: 800 }} align="center">{t("phoneAssistant.pushGrid.colHideName")}</TableCell>
                <TableCell sx={{ width: 100, fontWeight: 800 }} align="center">{t("phoneAssistant.pushGrid.colHideAmount")}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{t("phoneAssistant.pushGrid.colRoles")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map(({ group, entries }) => [
                <TableRow key={`g-${group}`}>
                  <TableCell
                    colSpan={7}
                    sx={{
                      position: "sticky",
                      left: 0,
                      bgcolor: "action.hover",
                      fontWeight: 800,
                      fontSize: 12,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      color: "text.secondary",
                      py: 0.5,
                    }}
                  >
                    {t(`phoneAssistant.pushGrid.group.${group}`)}
                  </TableCell>
                </TableRow>,
                ...entries.map((entry) => {
                  const rule = ruleOf(settings, entry.key);
                  return (
                    <TableRow key={entry.key} hover data-testid={`event-row-${entry.key}`}>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          {eventName(entry.key)}
                          <Tick k={entry.key} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Switch
                          size="small"
                          checked={Boolean(rule.enabled)}
                          onChange={(e) => patchEvent(entry.key, { enabled: e.target.checked })}
                          slotProps={{ input: { role: "switch", "aria-label": `${eventName(entry.key)} – ${t("phoneAssistant.pushGrid.colOn")}` } }}
                        />
                      </TableCell>
                      <TableCell align="right">{minAmountField(entry.key, entry, rule)}</TableCell>
                      <TableCell>{deliverySelect(entry.key, rule)}</TableCell>
                      <TableCell align="center">
                        {!NO_CUSTOMER_EVENTS.has(entry.key) && (
                          <Checkbox
                            size="small"
                            checked={Boolean(rule.hide_customer_name)}
                            onChange={(e) => patchEvent(entry.key, { hide_customer_name: e.target.checked })}
                            slotProps={{ input: { "aria-label": `${eventName(entry.key)} – ${t("phoneAssistant.pushGrid.colHideName")}` } }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {entry.has_amount && (
                          <Checkbox
                            size="small"
                            checked={Boolean(rule.hide_amount)}
                            onChange={(e) => patchEvent(entry.key, { hide_amount: e.target.checked })}
                            slotProps={{ input: { "aria-label": `${eventName(entry.key)} – ${t("phoneAssistant.pushGrid.colHideAmount")}` } }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{roleSelect(entry.key, rule)}</TableCell>
                    </TableRow>
                  );
                }),
              ])}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Shop-wide options on one compact row */}
      <Box
        sx={{
          mt: 2,
          p: 1.5,
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Switch
            size="small"
            checked={Boolean(settings.quiet_hours?.enabled)}
            onChange={(e) => save((s) => ({ ...s, quiet_hours: { ...s.quiet_hours, enabled: e.target.checked } }), "__opts")}
            slotProps={{ input: { role: "switch", "aria-label": t("phoneAssistant.pushGrid.quietHours") } }}
          />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("phoneAssistant.pushGrid.quietHours")}</Typography>
          {(["from", "to"] as const).map((side) => (
            <TextField
              key={`${side}-${settings.quiet_hours?.[side]}`}
              size="small"
              type="time"
              defaultValue={settings.quiet_hours?.[side]}
              disabled={!settings.quiet_hours?.enabled}
              onBlur={(e) => {
                const v = e.target.value;
                if (v && v !== settings.quiet_hours?.[side]) {
                  save((s) => ({ ...s, quiet_hours: { ...s.quiet_hours, [side]: v } }), "__opts");
                }
              }}
              slotProps={{ htmlInput: { "aria-label": t(`phoneAssistant.pushGrid.quiet_${side}`), style: { fontVariantNumeric: "tabular-nums" } } }}
              sx={{ width: 118 }}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("phoneAssistant.pushGrid.digestEvery")}</Typography>
          <Select
            size="small"
            value={[15, 30, 60].includes(Number(settings.digest_minutes)) ? Number(settings.digest_minutes) : 30}
            onChange={(e) => save((s) => ({ ...s, digest_minutes: Number(e.target.value) }), "__opts")}
            slotProps={{ input: { "aria-label": t("phoneAssistant.pushGrid.digestEvery") } as any }}
          >
            {[15, 30, 60].map((m) => (
              <MenuItem key={m} value={m} sx={{ fontVariantNumeric: "tabular-nums" }}>
                {t("phoneAssistant.pushGrid.minutes", { count: m })}
              </MenuItem>
            ))}
          </Select>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Switch
            size="small"
            checked={Boolean(settings.notify_actor)}
            onChange={(e) => save((s) => ({ ...s, notify_actor: e.target.checked }), "__opts")}
            slotProps={{ input: { role: "switch", "aria-label": t("phoneAssistant.pushGrid.notifyActor") } }}
          />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("phoneAssistant.pushGrid.notifyActor")}</Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Switch
            size="small"
            checked={settings.include_amounts !== false}
            onChange={(e) => save((s) => ({ ...s, include_amounts: e.target.checked }), "__opts")}
            slotProps={{ input: { role: "switch", "aria-label": t("phoneAssistant.pushGrid.includeAmounts") } }}
          />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("phoneAssistant.pushGrid.includeAmounts")}</Typography>
        </Stack>

        <Tick k="__opts" />
      </Box>

      {/* Daily summary on its own compact row */}
      {(() => {
        const daily = settings.daily_summary ?? {
          enabled: false,
          send_time: "20:00",
          recipient_role_ids: [],
          sections: { bills: true, payments: true, returns: true, due_tomorrow: true, overdue: true },
        };
        return (
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Switch
                size="small"
                checked={Boolean(daily.enabled)}
                onChange={(e) => save((s) => ({ ...s, daily_summary: { ...daily, enabled: e.target.checked } }), "__daily")}
                slotProps={{ input: { role: "switch", "aria-label": t("phoneAssistant.pushGrid.dailySummary") } }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("phoneAssistant.pushGrid.dailySummary")}</Typography>
              <TextField
                key={`daily-time-${daily.send_time}`}
                size="small"
                type="time"
                defaultValue={daily.send_time}
                disabled={!daily.enabled}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v && v !== daily.send_time) save((s) => ({ ...s, daily_summary: { ...daily, send_time: v } }), "__daily");
                }}
                slotProps={{ htmlInput: { "aria-label": t("phoneAssistant.pushGrid.dailyTime"), style: { fontVariantNumeric: "tabular-nums" } } }}
                sx={{ width: 118 }}
              />
            </Stack>
            <Box sx={{ minWidth: 200, flex: "1 1 200px", maxWidth: 320 }}>
              <FormControl size="small" fullWidth>
                <Select
                  multiple
                  displayEmpty
                  disabled={!daily.enabled}
                  value={daily.recipient_role_ids ?? []}
                  onChange={(e) =>
                    save(
                      (s) => ({ ...s, daily_summary: { ...daily, recipient_role_ids: (e.target.value as number[]).map(Number) } }),
                      "__daily",
                    )
                  }
                  renderValue={(selected) =>
                    (selected as number[]).length === 0
                      ? t("phoneAssistant.pushGrid.adminsOnly")
                      : (selected as number[]).map((id) => roles.find((r) => r.role_id === id)?.role_name ?? `#${id}`).join(", ")
                  }
                  slotProps={{ input: { "aria-label": t("phoneAssistant.pushGrid.dailyRecipients") } as any }}
                >
                  {roles.map((r) => (
                    <MenuItem key={r.role_id} value={r.role_id} dense>
                      <Checkbox size="small" checked={(daily.recipient_role_ids ?? []).includes(r.role_id)} />
                      <ListItemText primary={r.role_name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {DAILY_SUMMARY_SECTIONS.map((sec) => (
                <Chip
                  key={sec}
                  size="small"
                  disabled={!daily.enabled}
                  color={daily.sections?.[sec] ? "primary" : "default"}
                  variant={daily.sections?.[sec] ? "filled" : "outlined"}
                  label={t(`phoneAssistant.pushSettings.dailySummarySections.${sec}`, { defaultValue: sec })}
                  onClick={() =>
                    save(
                      (s) => ({
                        ...s,
                        daily_summary: { ...daily, sections: { ...daily.sections, [sec]: !daily.sections?.[sec] } },
                      }),
                      "__daily",
                    )
                  }
                />
              ))}
            </Box>
            <Tick k="__daily" />
          </Box>
        );
      })()}
    </Paper>
  );
}
