import { useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Select,
  Slider,
  Switch,
  Typography,
} from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DeviceShell } from "../../components/DeviceShell";
import { NativeSetupChecklist } from "../../components/NativeSetupChecklist";
import { DeviceSyncCard } from "../../components/DeviceSyncCard";
import { unpairCurrentDevice } from "../../api/phoneAssistantApi";
import { useDevicePolicy, useUpdateDeviceSettings } from "../../hooks/useShopDevices";
import { isNativePhoneApp, nativeBridge } from "../../lib/nativeBridge";
import { useAppPrefs } from "../../lib/phoneAppState";
import { clearDeviceId } from "@/features/signatures/lib/deviceId";
import { useDeviceStatus } from "@/features/signatures/hooks/useSignatures";
import { getDeviceId } from "@/features/signatures/lib/deviceId";

type Section =
  | "phone"
  | "call-screen"
  | "notifications"
  | "privacy"
  | "language"
  | "setup"
  | "app-lock"
  | "about";

const SECTIONS: Section[] = ["phone", "call-screen", "notifications", "privacy", "language", "setup", "app-lock", "about"];

function Row({ label, value, onClick, locked }: { label: string; value?: ReactNode; onClick?: () => void; locked?: boolean }) {
  const { t } = useTranslation();
  return (
    <Box
      component={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      sx={{
        all: "unset",
        boxSizing: "border-box",
        width: "100%",
        minHeight: 56,
        px: 2,
        py: 1,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        cursor: onClick ? "pointer" : "default",
        borderTop: 1,
        borderColor: "divider",
        "&:first-of-type": { borderTop: 0 },
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
      }}
    >
      <Typography sx={{ flex: 1, fontWeight: 600 }}>{label}</Typography>
      {locked && (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
          <LockOutlinedIcon fontSize="small" />
          <Typography variant="caption">{t("phoneShell.settings.setByShop")}</Typography>
        </Box>
      )}
      {!locked && value !== undefined && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", maxWidth: "50%" }}>
          {value}
        </Typography>
      )}
      {onClick && <ChevronRightRoundedIcon color="disabled" />}
    </Box>
  );
}

function Group({ children }: { children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden", bgcolor: "background.paper" }}>
      {children}
    </Paper>
  );
}

function Back({ title }: { title: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, pt: 1 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate({ to: "/device/settings" })} sx={{ minHeight: 48, textTransform: "none", fontWeight: 700 }}>
        {t("phoneShell.settings.title")}
      </Button>
      <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{title}</Typography>
    </Box>
  );
}

const TEXT_SIZES = ["small", "default", "large", "extra_large"] as const;
const LANGS = ["follow", "en", "si", "ta"] as const;

export function DeviceSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { section?: string };
  const section = SECTIONS.includes(params.section as Section) ? (params.section as Section) : null;

  const deviceId = getDeviceId();
  const status = useDeviceStatus(deviceId, { refetchInterval: 60_000 });
  const policy = useDevicePolicy(true);
  const updateSettings = useUpdateDeviceSettings();
  const { prefs, update } = useAppPrefs();
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [sims, setSims] = useState<Array<{ id: string; label: string }> | null>(null);

  const p = policy.data;
  const lockedBy = new Set(p?.locked_by_policy ?? []);
  const callPolicy = p?.call_screen_policy ?? { allow_phone_text_scale: true, min: 0.8, max: 2, respect_system_font: true };
  const fullApp = p?.full_app;
  const appLockRequired = Boolean(fullApp?.require_app_lock);
  const deviceStatus = status.data?.device_status ?? "ACTIVE";
  const operator = status.data?.operator;
  const native = isNativePhoneApp();

  const save = async (body: Parameters<typeof updateSettings.mutateAsync>[0]) => {
    setMessage(null);
    try {
      await updateSettings.mutateAsync(body);
    } catch (e: any) {
      setMessage({ severity: "error", text: e?.message || t("phoneShell.settings.saveFailed") });
    }
  };

  const textSizeLabel = (s: (typeof TEXT_SIZES)[number]) => t(`phoneShell.settings.textSize_${s}`);
  const langLabel = (l: (typeof LANGS)[number]) => (l === "follow" ? t("phoneShell.settings.lang_follow") : l === "en" ? "English" : l === "si" ? "සිංහල" : "தமிழ்");
  const effectiveCallScale = prefs.callTextScale ?? null;


  if (!section) {
    const summary: Record<Section, ReactNode> = {
      phone: t(`phoneAssistant.deviceStatus.${deviceStatus}`),
      "call-screen": effectiveCallScale ? `×${effectiveCallScale.toFixed(1)}` : t("phoneShell.settings.shopSetting"),
      notifications: p ? t(`phoneShell.settings.notifLang_${p.notification_language ?? "default"}`, { defaultValue: p.notification_language ?? t("phoneShell.settings.shopSetting") }) : "",
      privacy: p?.contact_sync_mode ? t(`phoneAssistant.settings.contactMode_${p.contact_sync_mode}`, { defaultValue: p.contact_sync_mode }) : "",
      language: `${langLabel(prefs.appLanguage)} · ${textSizeLabel(prefs.appTextSize)}`,
      setup: "",
      "app-lock": prefs.appLockEnabled || appLockRequired ? t("phoneShell.settings.on") : t("phoneShell.settings.off"),
      about: prefs.appVersion ? `v${prefs.appVersion}` : "",
    };
    return (
      <DeviceShell active="settings" title={t("phoneShell.settings.title")}>
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Group>
            {SECTIONS.map((s) => (
              <Row
                key={s}
                label={t(`phoneShell.settings.group_${s.replace("-", "_")}`)}
                value={summary[s]}
                onClick={() => {
                  if (s === "notifications") navigate({ to: "/device/notifications" });
                  else if (s === "privacy") navigate({ to: "/device/privacy" });
                  else navigate({ to: "/device/settings/$section", params: { section: s } });
                }}
              />
            ))}
          </Group>
        </Box>
      </DeviceShell>
    );
  }

  return (
    <DeviceShell active="settings" hideTitle>
      <Back title={t(`phoneShell.settings.group_${section.replace("-", "_")}`)} />
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

        {section === "phone" && (
          <>
            <Group>
              <Row label={t("phoneShell.settings.pairedTo")} value={operator?.operator_name ?? "—"} />
              <Row label={t("phoneShell.settings.status")} value={t(`phoneAssistant.deviceStatus.${deviceStatus}`)} />
              <Row label={t("phoneShell.settings.appVersion")} value={prefs.appVersion ? `v${prefs.appVersion}` : "—"} />
            </Group>
            <DeviceSyncCard />
            <Box sx={{ mt: 2 }}>
              <Button
                fullWidth
                color="error"
                variant="outlined"
                sx={{ minHeight: 48, textTransform: "none", fontWeight: 700 }}
                onClick={async () => {
                  if (!window.confirm(t("signatures.DeviceHomePage.unpairThisPhoneYouWill"))) return;
                  await unpairCurrentDevice().catch(() => null);
                  clearDeviceId();
                  void nativeBridge.clearCredentials();
                  navigate({ to: "/pair", replace: true });
                }}
              >
                {t("signatures.DeviceHomePage.unpairThisPhone")}
              </Button>
            </Box>
          </>
        )}

        {section === "call-screen" && (
          <>
            <Group>
              <Row label={t("phoneShell.settings.lockScreenDisplay")} value={p ? t(`phoneAssistant.callScreen.lockMode_${p.brief_profile.lock_screen}`) : "—"} />
            </Group>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography sx={{ fontWeight: 700 }}>{t("phoneShell.settings.callTextSize")}</Typography>
              {lockedBy.has("call_text_scale") || !callPolicy.allow_phone_text_scale ? (
                <Row label={t("phoneShell.settings.callTextSize")} locked />
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {effectiveCallScale ? `×${effectiveCallScale.toFixed(1)}` : t("phoneShell.settings.shopSetting")}
                  </Typography>
                  <Slider
                    min={callPolicy.min}
                    max={callPolicy.max}
                    step={0.1}
                    value={effectiveCallScale ?? 1}
                    onChange={(_e, v) => void update({ callTextScale: Math.round(Number(v) * 10) / 10 })}
                    onChangeCommitted={(_e, v) => void save({ call_text_scale: Math.round(Number(v) * 10) / 10 })}
                    aria-label={t("phoneShell.settings.callTextSize")}
                    sx={{ mt: 1 }}
                  />
                  <Button
                    size="small"
                    onClick={async () => {
                      await update({ callTextScale: null });
                      await save({ call_text_scale: null });
                    }}
                    sx={{ textTransform: "none", minHeight: 40 }}
                  >
                    {t("phoneShell.settings.useShopSetting")}
                  </Button>
                </>
              )}
            </Paper>
            {native && (
              <Button variant="contained" sx={{ minHeight: 48, textTransform: "none", fontWeight: 700 }} onClick={() => void nativeBridge.showSampleCall()}>
                {t("phoneShell.settings.showSampleCall")}
              </Button>
            )}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>{t("phoneShell.settings.businessSim")}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t("phoneShell.settings.businessSimHint")}</Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={async () => setSims(await nativeBridge.listSims())}
                sx={{ textTransform: "none", minHeight: 40 }}
              >
                {t("phoneShell.settings.chooseSim")}
              </Button>
              {sims && (
                <Select
                  fullWidth
                  size="small"
                  displayEmpty
                  value={p?.sim_filter ?? ""}
                  onChange={(e) => void save({ sim_filter: String(e.target.value) || null })}
                  sx={{ mt: 1 }}
                >
                  <MenuItem value="">{t("phoneShell.settings.allSims")}</MenuItem>
                  {sims.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>
                  ))}
                </Select>
              )}
            </Paper>
          </>
        )}

        {section === "language" && (
          <Group>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>{t("phoneShell.settings.appLanguage")}</Typography>
              <Select
                fullWidth
                size="small"
                value={prefs.appLanguage}
                onChange={(e) => {
                  const v = e.target.value as (typeof LANGS)[number];
                  void update({ appLanguage: v });
                  void save({ app_language: v === "follow" ? null : v });
                }}
              >
                {LANGS.map((l) => (
                  <MenuItem key={l} value={l}>{langLabel(l)}</MenuItem>
                ))}
              </Select>
            </Box>
            <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>{t("phoneShell.settings.appTextSize")}</Typography>
              <Select
                fullWidth
                size="small"
                value={prefs.appTextSize}
                onChange={(e) => {
                  const v = e.target.value as (typeof TEXT_SIZES)[number];
                  void update({ appTextSize: v });
                  void save({ app_text_size: v });
                }}
              >
                {TEXT_SIZES.map((s) => (
                  <MenuItem key={s} value={s}>{textSizeLabel(s)}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                {t("phoneShell.settings.systemTextNote")}
              </Typography>
            </Box>
            <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>{t("phoneShell.settings.notificationLanguage")}</Typography>
              {lockedBy.has("notification_language") ? (
                <Row label={t("phoneShell.settings.notificationLanguage")} locked />
              ) : (
                <Select
                  fullWidth
                  size="small"
                  displayEmpty
                  value={p?.notification_language ?? ""}
                  onChange={(e) => void save({ notification_language: (String(e.target.value) || null) as any })}
                >
                  <MenuItem value="">{t("phoneShell.settings.followProfile")}</MenuItem>
                  {(p?.notification_languages ?? ["en"]).map((l) => (
                    <MenuItem key={l} value={l}>{l === "en" ? "English" : l === "si" ? "සිංහල" : l === "ta" ? "தமிழ்" : "Singlish"}</MenuItem>
                  ))}
                </Select>
              )}
            </Box>
          </Group>
        )}

        {section === "setup" && <NativeSetupChecklist />}

        {section === "app-lock" && (
          <Group>
            <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{t("phoneShell.settings.appLock")}</Typography>
                <Typography variant="body2" color="text.secondary">{t("phoneShell.settings.appLockHint")}</Typography>
              </Box>
              {appLockRequired ? (
                <Row label="" locked />
              ) : (
                <Switch
                  checked={prefs.appLockEnabled}
                  onChange={(e) => {
                    void update({ appLockEnabled: e.target.checked });
                    void save({ app_lock_enabled: e.target.checked });
                  }}
                  slotProps={{ input: { role: "switch", "aria-label": t("phoneShell.settings.appLock") } }}
                />
              )}
            </Box>
            <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="body2" color="text.secondary">
                {t("phoneShell.settings.sessionNote", { minutes: fullApp?.session_minutes ?? 30 })}
              </Typography>
            </Box>
          </Group>
        )}

        {section === "about" && (
          <Group>
            <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Typography sx={{ fontWeight: 800 }}>{t("phoneShell.about.offlineTitle")}</Typography>
              <Typography variant="body2">{t("phoneShell.about.worksOffline")}</Typography>
              <Typography variant="body2">{t("phoneShell.about.needsConnection")}</Typography>
              <Typography sx={{ fontWeight: 800 }}>{t("phoneShell.about.limitsTitle")}</Typography>
              <Typography variant="body2">{t("phoneShell.about.limits")}</Typography>
              <Typography sx={{ fontWeight: 800 }}>{t("phoneShell.about.notificationTextTitle")}</Typography>
              <Typography variant="body2">{t("phoneShell.about.notificationText")}</Typography>
              <Typography variant="caption" color="text.secondary">{t("phoneShell.about.licences")}</Typography>
            </Box>
          </Group>
        )}
      </Box>
    </DeviceShell>
  );
}
