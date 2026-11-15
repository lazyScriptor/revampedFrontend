import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import { useTranslation } from "react-i18next";
import { usePhoneAssistantPolicy, usePatchPhoneAssistantPolicy } from "../hooks/useShopDevices";
import {
  usePreviewPushTemplate,
  usePushTemplates,
  useResetPushTemplate,
  useSavePushTemplate,
  useSendPushTemplateTest,
} from "../hooks/usePushTemplates";
import type { PushTemplate } from "../api/phoneAssistantApi";
import { SinhalaTypingToggle } from "@/components/ui/SinhalaTypingToggle";

type Language = PushTemplate["language"];
const LANGUAGES: Language[] = ["en", "si", "ta", "si-Latn"];
const LANGUAGE_LABEL: Record<Language, string> = { en: "English", si: "සිංහල", ta: "தமிழ்", "si-Latn": "Singlish" };
const TITLE_MAX = 160;
const BODY_MAX = 500;

type FieldName = "title" | "body" | "title_private" | "body_private";

interface Draft {
  title: string;
  body: string;
  title_private: string;
  body_private: string;
}

const toDraft = (tpl?: PushTemplate | null): Draft => ({
  title: tpl?.title ?? "",
  body: tpl?.body ?? "",
  title_private: tpl?.title_private ?? "",
  body_private: tpl?.body_private ?? "",
});

/** Languages tab: shop language rules, formats, and the events × languages template grid. */
export function NotificationLanguagePanel() {
  const { t } = useTranslation();
  const policyQuery = usePhoneAssistantPolicy(true);
  const patch = usePatchPhoneAssistantPolicy();
  const templatesQuery = usePushTemplates(true);
  const [selected, setSelected] = useState<{ eventKey: string; language: Language } | null>(null);

  const policy = policyQuery.data?.policy;
  const notifications = policy?.notifications;
  const data = templatesQuery.data;

  const byKey = useMemo(() => {
    const map = new Map<string, PushTemplate & { has_default?: boolean }>();
    for (const tpl of data?.templates ?? []) map.set(`${tpl.event_key}:${tpl.language}`, tpl as any);
    return map;
  }, [data?.templates]);

  if (policyQuery.isLoading || templatesQuery.isLoading) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (!policy || !notifications || !data) {
    return <Alert severity="error">{t("phoneAssistant.languages.loadFailed")}</Alert>;
  }

  const setPath = (path: string, value: unknown) => patch.mutate([{ path, value }]);
  const allowed = notifications.allowed_languages as Language[];
  const eventLabel = (key: string) => t(`phoneAssistant.pushEvents.${key}.label`, { defaultValue: key });

  const marker = (tpl?: PushTemplate & { has_default?: boolean }) => {
    if (!tpl || (!tpl.edited && tpl.has_default === false && !tpl.body)) return "missing";
    return tpl.edited ? "edited" : "default";
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Language rules in a compact setting / value grid */}
      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, border: 1, borderColor: "divider", borderRadius: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{t("phoneAssistant.languages.rulesTitle")}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("phoneAssistant.languages.rulesHint")}
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
          <FormControl size="small">
            <InputLabel id="lang-default">{t("phoneAssistant.languages.defaultLanguage")}</InputLabel>
            <Select
              labelId="lang-default"
              label={t("phoneAssistant.languages.defaultLanguage")}
              value={notifications.default_language}
              onChange={(e) => setPath("notifications.default_language", e.target.value)}
            >
              {allowed.map((l) => (
                <MenuItem key={l} value={l}>{LANGUAGE_LABEL[l]}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel id="lang-allowed">{t("phoneAssistant.languages.allowedLanguages")}</InputLabel>
            <Select
              labelId="lang-allowed"
              label={t("phoneAssistant.languages.allowedLanguages")}
              multiple
              value={allowed}
              onChange={(e) => {
                const next = (e.target.value as Language[]).filter(Boolean);
                if (next.length) setPath("notifications.allowed_languages", next);
              }}
              renderValue={(sel) => (sel as Language[]).map((l) => LANGUAGE_LABEL[l]).join(", ")}
            >
              {LANGUAGES.map((l) => (
                <MenuItem key={l} value={l} dense>
                  <Checkbox size="small" checked={allowed.includes(l)} />
                  <ListItemText primary={LANGUAGE_LABEL[l]} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={notifications.bilingual === "append_english"}
                onChange={(e) => setPath("notifications.bilingual", e.target.checked ? "append_english" : "off")}
              />
            }
            label={t("phoneAssistant.languages.bilingual")}
          />
          <FormControl size="small">
            <InputLabel id="fmt-currency">{t("phoneAssistant.languages.currency")}</InputLabel>
            <Select
              labelId="fmt-currency"
              label={t("phoneAssistant.languages.currency")}
              value={notifications.format.currency}
              onChange={(e) => setPath("notifications.format.currency", e.target.value)}
            >
              {["LKR", "Rs.", "රු."].map((c) => (
                <MenuItem key={c} value={c} sx={{ fontVariantNumeric: "tabular-nums" }}>{c} 12,000</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel id="fmt-date">{t("phoneAssistant.languages.dateFormat")}</InputLabel>
            <Select
              labelId="fmt-date"
              label={t("phoneAssistant.languages.dateFormat")}
              value={notifications.format.date}
              onChange={(e) => setPath("notifications.format.date", e.target.value)}
            >
              <MenuItem value="yyyy-mm-dd" sx={{ fontVariantNumeric: "tabular-nums" }}>2026-11-15</MenuItem>
              <MenuItem value="dd MMM" sx={{ fontVariantNumeric: "tabular-nums" }}>15 Nov</MenuItem>
              <MenuItem value="dd/mm" sx={{ fontVariantNumeric: "tabular-nums" }}>15/11</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel id="fmt-time">{t("phoneAssistant.languages.timeFormat")}</InputLabel>
            <Select
              labelId="fmt-time"
              label={t("phoneAssistant.languages.timeFormat")}
              value={notifications.format.time}
              onChange={(e) => setPath("notifications.format.time", e.target.value)}
            >
              <MenuItem value="24h" sx={{ fontVariantNumeric: "tabular-nums" }}>14:05</MenuItem>
              <MenuItem value="12h" sx={{ fontVariantNumeric: "tabular-nums" }}>2:05 pm</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {t("phoneAssistant.languages.digitsNote")}
        </Typography>
      </Paper>

      {/* Events × languages grid */}
      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, border: 1, borderColor: "divider", borderRadius: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{t("phoneAssistant.languages.gridTitle")}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t("phoneAssistant.languages.gridHint")}
        </Typography>
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Table size="small" sx={{ minWidth: 720, tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 180, fontWeight: 800 }}>{t("phoneAssistant.pushGrid.colEvent")}</TableCell>
                {LANGUAGES.map((l) => (
                  <TableCell key={l} sx={{ fontWeight: 800 }}>
                    {LANGUAGE_LABEL[l]}
                    {!allowed.includes(l) && (
                      <Chip size="small" label={t("phoneAssistant.languages.off")} sx={{ ml: 0.75 }} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.events.map((ev) => (
                <TableRow key={ev.key} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{eventLabel(ev.key)}</TableCell>
                  {LANGUAGES.map((l) => {
                    const tpl = byKey.get(`${ev.key}:${l}`);
                    const state = marker(tpl);
                    return (
                      <TableCell key={l} sx={{ p: 0 }}>
                        <Box
                          component="button"
                          type="button"
                          onClick={() => setSelected({ eventKey: ev.key, language: l })}
                          aria-label={`${eventLabel(ev.key)} – ${LANGUAGE_LABEL[l]} – ${t(`phoneAssistant.languages.state_${state}`)}`}
                          sx={{
                            all: "unset",
                            boxSizing: "border-box",
                            width: "100%",
                            minHeight: 56,
                            p: 1,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                            "&:hover": { bgcolor: "action.hover" },
                            "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
                          }}
                        >
                          <Typography variant="body2" noWrap sx={{ color: "text.primary" }}>
                            {tpl?.body || tpl?.title || "—"}
                          </Typography>
                          <Chip
                            size="small"
                            label={t(`phoneAssistant.languages.state_${state}`)}
                            color={state === "edited" ? "primary" : state === "missing" ? "error" : "default"}
                            variant={state === "default" ? "outlined" : "filled"}
                            sx={{ alignSelf: "flex-start", height: 20, fontSize: 11 }}
                          />
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {selected && (
        <TemplateDrawer
          key={`${selected.eventKey}:${selected.language}`}
          eventKey={selected.eventKey}
          language={selected.language}
          template={byKey.get(`${selected.eventKey}:${selected.language}`) ?? null}
          englishTemplate={byKey.get(`${selected.eventKey}:en`) ?? null}
          placeholders={data.events.find((e) => e.key === selected.eventKey)?.placeholders ?? []}
          eventLabel={eventLabel(selected.eventKey)}
          onClose={() => setSelected(null)}
        />
      )}
    </Box>
  );
}

interface DrawerProps {
  eventKey: string;
  language: Language;
  template: (PushTemplate & { has_default?: boolean }) | null;
  englishTemplate: PushTemplate | null;
  placeholders: string[];
  eventLabel: string;
  onClose: () => void;
}

function TemplateDrawer({ eventKey, language, template, englishTemplate, placeholders, eventLabel, onClose }: DrawerProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(() => toDraft(template));
  const [active, setActive] = useState<FieldName>("body");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<{ severity: "success" | "warning"; text: string } | null>(null);
  const [previewResult, setPreviewResult] = useState<{ normal: { title: string; body: string }; private: { title: string; body: string } } | null>(null);
  const refs = useRef<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | null>>({
    title: null,
    body: null,
    title_private: null,
    body_private: null,
  });
  const save = useSavePushTemplate();
  const reset = useResetPushTemplate();
  const preview = usePreviewPushTemplate();
  const sendTest = useSendPushTemplateTest();

  const edited = Boolean(template?.edited);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(template));

  // Live preview, a moment after typing stops.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      preview.mutate(
        {
          event_key: eventKey,
          language,
          title: draft.title,
          body: draft.body,
          title_private: draft.title_private || null,
          body_private: draft.body_private || null,
        },
        {
          onSuccess: (res) => {
            setPreviewResult(res as any);
            setError(null);
          },
          onError: (e: any) => setError(e?.message || t("phoneAssistant.languages.previewFailed")),
        },
      );
    }, 350);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.title, draft.body, draft.title_private, draft.body_private]);

  const insert = (name: string) => {
    const el = refs.current[active];
    const token = `{${name}}`;
    if (!el) {
      setDraft((d) => ({ ...d, [active]: `${d[active]}${token}` }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = `${el.value.slice(0, start)}${token}${el.value.slice(end)}`;
    setDraft((d) => ({ ...d, [active]: next }));
    window.setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const doSave = async () => {
    setError(null);
    try {
      await save.mutateAsync({
        eventKey,
        language,
        body: {
          title: draft.title,
          body: draft.body,
          title_private: draft.title_private || null,
          body_private: draft.body_private || null,
        },
      });
      setNote({ severity: "success", text: t("phoneAssistant.languages.saved") });
    } catch (e: any) {
      setError(e?.message || t("phoneAssistant.languages.saveFailed"));
    }
  };

  const doReset = async () => {
    setError(null);
    try {
      await reset.mutateAsync({ eventKey, language });
      onClose();
    } catch (e: any) {
      setError(e?.message || t("phoneAssistant.languages.saveFailed"));
    }
  };

  const doTest = async (privateMode: boolean) => {
    setNote(null);
    try {
      const res = await sendTest.mutateAsync({
        event_key: eventKey,
        language,
        title: draft.title,
        body: draft.body,
        title_private: draft.title_private || null,
        body_private: draft.body_private || null,
        private: privateMode,
      });
      setNote(
        res.reached > 0
          ? { severity: "success", text: t("phoneAssistant.languages.testSent") }
          : { severity: "warning", text: t("phoneAssistant.languages.testNone") },
      );
    } catch (e: any) {
      setError(e?.message || t("phoneAssistant.languages.testFailed"));
    }
  };

  const field = (name: FieldName, label: string, max: number, multiline = false) => (
    <TextField
      label={label}
      value={draft[name]}
      onChange={(e) => setDraft((d) => ({ ...d, [name]: e.target.value }))}
      onFocus={() => setActive(name)}
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      fullWidth
      size="small"
      inputRef={(el) => {
        refs.current[name] = el;
      }}
      helperText={
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {draft[name].length}/{max}
        </span>
      }
      slotProps={{
        htmlInput: {
          maxLength: max,
          // Typed Sinhala conversion is for Sinhala wording only; elsewhere it would corrupt text.
          ...(language === "si" ? {} : { "data-no-sinhala": "true" }),
          name: `tpl-${name}`,
        },
      }}
    />
  );

  return (
    <Drawer anchor="right" open onClose={onClose} slotProps={{ paper: { sx: { width: { xs: "100%", sm: 460 }, p: 2, display: "flex", flexDirection: "column", gap: 1.5 } } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{eventLabel}</Typography>
          <Typography variant="caption" color="text.secondary">
            {LANGUAGE_LABEL[language]} · {edited ? t("phoneAssistant.languages.state_edited") : t("phoneAssistant.languages.state_default")}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label={t("common.cancel")}>
          <CloseRoundedIcon />
        </IconButton>
      </Stack>

      {language === "si" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SinhalaTypingToggle />
          <Typography variant="caption" color="text.secondary">{t("phoneAssistant.languages.singlishNote")}</Typography>
        </Box>
      )}

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {note && <Alert severity={note.severity} onClose={() => setNote(null)}>{note.text}</Alert>}

      {field("title", t("phoneAssistant.languages.fieldTitle"), TITLE_MAX)}
      {field("body", t("phoneAssistant.languages.fieldBody"), BODY_MAX, true)}
      {field("title_private", t("phoneAssistant.languages.fieldTitlePrivate"), TITLE_MAX)}
      {field("body_private", t("phoneAssistant.languages.fieldBodyPrivate"), BODY_MAX, true)}
      <Typography variant="caption" color="text.secondary">{t("phoneAssistant.languages.privateHint")}</Typography>

      <Box>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{t("phoneAssistant.languages.placeholders")}</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
          {placeholders.map((p) => (
            <Chip key={p} size="small" label={`{${p}}`} onClick={() => insert(p)} sx={{ fontFamily: "monospace" }} />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          {t("phoneAssistant.languages.optionalHint")}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} aria-live="polite">
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{t("phoneAssistant.languages.previewNormal")}</Typography>
        <Typography sx={{ fontWeight: 700 }}>{previewResult?.normal.title || "—"}</Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{previewResult?.normal.body || ""}</Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mt: 1 }}>{t("phoneAssistant.languages.previewPrivate")}</Typography>
        <Typography sx={{ fontWeight: 700 }}>{previewResult?.private.title || "—"}</Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{previewResult?.private.body || ""}</Typography>
      </Paper>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
        <Button size="small" variant="outlined" onClick={() => setDraft(toDraft(englishTemplate))} disabled={language === "en"}>
          {t("phoneAssistant.languages.copyFromEnglish")}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SendOutlinedIcon fontSize="small" />}
          onClick={() => doTest(false)}
          disabled={sendTest.isPending}
        >
          {t("phoneAssistant.languages.sendToPhone")}
        </Button>
        <Button size="small" variant="outlined" onClick={() => doTest(true)} disabled={sendTest.isPending}>
          {t("phoneAssistant.languages.sendPrivateToPhone")}
        </Button>
      </Stack>

      <Box sx={{ flex: 1 }} />
      <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
        <Button color="error" disabled={!edited || reset.isPending} onClick={doReset}>
          {t("phoneAssistant.languages.resetDefault")}
        </Button>
        <Button variant="contained" disabled={!dirty || save.isPending || !draft.title.trim() || !draft.body.trim()} onClick={doSave}>
          {save.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </Stack>
    </Drawer>
  );
}
