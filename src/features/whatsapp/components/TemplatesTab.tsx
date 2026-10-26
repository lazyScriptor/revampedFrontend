import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Skeleton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";

import { useToast } from "@/components/ui/AppToast";
import { tk } from "@/i18n/marker";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Language, TemplateKey } from "../api/whatsapp.api";
import {
  useResetWhatsAppTemplate,
  useSaveWhatsAppTemplate,
  useUpdateWhatsAppSettings,
  useWhatsAppSettings,
  useWhatsAppTemplates,
} from "../hooks/useWhatsApp";
import { TEMPLATE_I18N, renderTemplate, unknownPlaceholders } from "../lib/whatsapp";

const GROUP_I18N: Record<string, string> = {
  order: tk("whatsapp.templates.groupOrder"),
  returns: tk("whatsapp.templates.groupReturns"),
  payments: tk("whatsapp.templates.groupPayments"),
  general: tk("whatsapp.templates.groupGeneral"),
};
const GROUP_ORDER = ["order", "returns", "payments", "general"];

export function TemplatesTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const canManage = useAuthStore((s) => s.hasPermission)("whatsapp:manage");
  const { data, isLoading, isError } = useWhatsAppTemplates();
  const saveMutation = useSaveWhatsAppTemplate();
  const resetMutation = useResetWhatsAppTemplate();

  const [key, setKey] = useState<TemplateKey>("receipt");
  const [lang, setLang] = useState<Language>("en");
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const entry = data?.templates[key]?.[lang];
  // load the stored text whenever the selection (or the saved value) changes
  useEffect(() => {
    if (entry) setDraft(entry.body);
  }, [entry?.body, key, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const unknown = useMemo(() => (data ? unknownPlaceholders(draft, data.placeholders) : []), [draft, data]);
  const tooLong = !!data && draft.length > data.max_length;
  const dirty = !!entry && draft !== entry.body;
  const preview = useMemo(() => (data ? renderTemplate(draft, data.samples[lang]) : ""), [draft, data, lang]);

  const insertPlaceholder = (name: string) => {
    const el = inputRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      setDraft((d) => d + token);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + token + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = () =>
    saveMutation.mutate(
      { key, language: lang, body: draft },
      {
        onSuccess: () => toast.showSuccess(t("whatsapp.templates.saved")),
        onError: (e: any) => toast.showError(e?.response?.data?.message || e?.message || t("whatsapp.templates.saveFailed")),
      },
    );

  const handleReset = () =>
    resetMutation.mutate(
      { key, language: lang },
      {
        onSuccess: () => toast.showSuccess(t("whatsapp.templates.resetDone")),
        onError: () => toast.showError(t("whatsapp.templates.saveFailed")),
      },
    );

  if (isError) return <Alert severity="error">{t("whatsapp.templates.loadFailed")}</Alert>;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <SettingsCard canManage={canManage} />

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        {isLoading || !data ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={260} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
            {/* message types */}
            <Box sx={{ width: { xs: "100%", md: 240 }, flexShrink: 0, borderRight: { md: "1px solid" }, borderBottom: { xs: "1px solid", md: 0 }, borderColor: "divider", p: 1.5 }}>
              {GROUP_ORDER.map((g) => {
                const items = data.keys.filter((k) => k.group === g);
                if (items.length === 0) return null;
                return (
                  <Box key={g} sx={{ mb: 1 }}>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.disabled", px: 0.5, mb: 0.5 }}>
                      {t(GROUP_I18N[g])}
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: { xs: "row", md: "column" }, flexWrap: { xs: "wrap", md: "nowrap" }, gap: 0.5 }}>
                      {items.map((k) => {
                        const custom = data.languages.some((l) => data.templates[k.key][l].is_custom);
                        const selected = k.key === key;
                        return (
                          <Button
                            key={k.key}
                            size="small"
                            onClick={() => setKey(k.key)}
                            aria-pressed={selected}
                            sx={{
                              justifyContent: "flex-start",
                              textTransform: "none",
                              fontWeight: selected ? 800 : 600,
                              borderRadius: 2,
                              bgcolor: selected ? "action.selected" : "transparent",
                              color: "text.primary",
                            }}
                          >
                            {t(TEMPLATE_I18N[k.key])}
                            {custom && <Box component="span" aria-label={t("whatsapp.templates.customised")} sx={{ ml: 0.75, width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />}
                          </Button>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* editor */}
            <Box sx={{ flexGrow: 1, minWidth: 0, p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 800, flexGrow: 1 }}>{t(TEMPLATE_I18N[key])}</Typography>
                {entry?.is_custom && <Chip size="small" color="primary" label={t("whatsapp.templates.customised")} sx={{ fontWeight: 700 }} />}
                <ToggleButtonGroup exclusive size="small" value={lang} onChange={(_, v) => v && setLang(v)} aria-label={t("whatsapp.dialog.language")}>
                  <ToggleButton value="en" sx={{ px: 1.5, fontWeight: 800 }}>
                    EN
                  </ToggleButton>
                  <ToggleButton value="si" sx={{ px: 1.5, fontWeight: 800 }}>
                    සිං
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <TextField
                multiline
                minRows={8}
                maxRows={16}
                fullWidth
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!canManage}
                inputRef={inputRef}
                error={unknown.length > 0 || tooLong}
                slotProps={{ htmlInput: { "aria-label": t("whatsapp.templates.editor"), style: { fontSize: "0.9rem", lineHeight: 1.5 } } }}
                helperText={
                  <Box component="span" sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <span>
                      {unknown.length > 0
                        ? t("whatsapp.templates.unknownPlaceholders", { list: unknown.map((u) => `{{${u}}}`).join(", ") })
                        : canManage
                          ? t("whatsapp.templates.dropLineHint")
                          : t("whatsapp.templates.readOnly")}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {draft.length}/{data.max_length}
                    </span>
                  </Box>
                }
              />

              {canManage && (
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }} aria-label={t("whatsapp.templates.placeholders")}>
                  {data.placeholders.map((p) => (
                    <Chip key={p} size="small" clickable label={`{{${p}}}`} onClick={() => insertPlaceholder(p)} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem" }} />
                  ))}
                </Box>
              )}

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
                  {t("whatsapp.templates.preview")}
                </Typography>
                <Box
                  data-testid="template-preview"
                  sx={{ mt: 0.5, bgcolor: "#dcf8c6", color: "#0f172a", borderRadius: 3, borderTopLeftRadius: 4, p: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.9rem", lineHeight: 1.5 }}
                >
                  {preview || "—"}
                </Box>
              </Box>

              {canManage && (
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <Button
                    onClick={handleReset}
                    disabled={!entry?.is_custom || resetMutation.isPending}
                    color="inherit"
                    startIcon={<RestartAltIcon />}
                    sx={{ fontWeight: 700, textTransform: "none" }}
                  >
                    {t("whatsapp.templates.reset")}
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="contained"
                    disableElevation
                    disabled={!dirty || unknown.length > 0 || tooLong || !draft.trim() || saveMutation.isPending}
                    startIcon={saveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    sx={{ fontWeight: 800, borderRadius: 2.5, textTransform: "none" }}
                  >
                    {t("common.save")}
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

function SettingsCard({ canManage }: { canManage: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data } = useWhatsAppSettings();
  const update = useUpdateWhatsAppSettings();
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    if (data) {
      setPhone(data.shop_phone);
      setLanguage(data.default_language);
    }
  }, [data]);

  const dirty = !!data && (phone.trim() !== data.shop_phone || language !== data.default_language);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 2, display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: { sm: "center" } }}>
      <TextField
        size="small"
        label={t("whatsapp.settings.shopPhone")}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={!canManage}
        helperText={t("whatsapp.settings.shopPhoneHint")}
        slotProps={{ htmlInput: { maxLength: 30, inputMode: "tel" } }}
        sx={{ minWidth: { sm: 260 } }}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
          {t("whatsapp.settings.defaultLanguage")}
        </Typography>
        <ToggleButtonGroup exclusive size="small" value={language} onChange={(_, v) => v && setLanguage(v)} disabled={!canManage} aria-label={t("whatsapp.settings.defaultLanguage")}>
          <ToggleButton value="en" sx={{ px: 1.5, fontWeight: 800 }}>
            EN
          </ToggleButton>
          <ToggleButton value="si" sx={{ px: 1.5, fontWeight: 800 }}>
            සිං
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      {canManage && (
        <Button
          variant="contained"
          disableElevation
          disabled={!dirty || update.isPending}
          onClick={() =>
            update.mutate(
              { shop_phone: phone.trim(), default_language: language },
              { onSuccess: () => toast.showSuccess(t("whatsapp.settings.saved")), onError: () => toast.showError(t("whatsapp.templates.saveFailed")) },
            )
          }
          sx={{ fontWeight: 800, borderRadius: 2.5, textTransform: "none" }}
        >
          {t("common.save")}
        </Button>
      )}
    </Paper>
  );
}
