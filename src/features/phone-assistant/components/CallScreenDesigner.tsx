import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import { useTranslation } from "react-i18next";
import { usePhoneAssistantPolicy, useUpdatePhoneAssistantPolicy, usePatchPhoneAssistantPolicy } from "../hooks/useShopDevices";
import { sendCallScreenSample } from "../api/phoneAssistantApi";
import { CallScreenPreview, type PreviewFooter } from "./CallScreenPreview";
import {
  CALL_ACTIONS,
  CALL_SIZES,
  DEFAULT_CALL_SCREEN,
  ROW_STYLES,
  RULES_WITH_VALUE,
  RULE_WHENS,
  allowedFields,
  cloneDesign,
  effectiveTextScale,
  readDesign,
  type AmountMode,
  type CallField,
  type CallScreenDesign,
  type SampleKind,
} from "../lib/callScreenLayout";

const MAX_ROWS = 16;
const MAX_RULES = 12;
const MAX_ACTIONS = 3;

const sameDesign = (a: CallScreenDesign, b: CallScreenDesign) => JSON.stringify(a) === JSON.stringify(b);

function Group({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <Accordion
      defaultExpanded={defaultOpen}
      disableGutters
      elevation={0}
      sx={{ border: 1, borderColor: "divider", borderRadius: "12px !important", "&:before": { display: "none" }, mb: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ minHeight: 48 }}>
        <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

/** Admin panel that designs the caller overlay and shows it live in a phone frame. */
export function CallScreenDesigner() {
  const { t } = useTranslation();
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"));
  const policyQuery = usePhoneAssistantPolicy(true);
  const savePolicy = useUpdatePhoneAssistantPolicy();
  const patchPolicy = usePatchPhoneAssistantPolicy();

  const policy = policyQuery.data?.policy;
  const profiles = policy?.brief_profiles ?? [];
  const [profileId, setProfileId] = useState<string>("");
  const [design, setDesign] = useState<CallScreenDesign>(() => cloneDesign(DEFAULT_CALL_SCREEN));
  const [savedDesign, setSavedDesign] = useState<CallScreenDesign>(() => cloneDesign(DEFAULT_CALL_SCREEN));
  const [message, setMessage] = useState<{ severity: "success" | "error" | "warning"; text: string } | null>(null);
  const [sendingSample, setSendingSample] = useState(false);

  // Preview controls
  const [sample, setSample] = useState<SampleKind>("dues");
  const [appearance, setAppearance] = useState<"light" | "dark">(theme.palette.mode === "dark" ? "dark" : "light");
  const [locked, setLocked] = useState(false);
  const [phoneSize, setPhoneSize] = useState<"small" | "large">("large");
  const [footer, setFooter] = useState<PreviewFooter>("synced");
  const [phoneScale, setPhoneScale] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);

  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [copyAnchor, setCopyAnchor] = useState<HTMLElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const profile = profiles.find((p) => p.id === profileId) ?? null;

  // Pick the first profile once the policy is loaded.
  useEffect(() => {
    if (!profileId && profiles.length) setProfileId(profiles[0].id);
  }, [profiles, profileId]);

  // Load the design whenever the profile (or the saved policy) changes.
  useEffect(() => {
    if (!profile) return;
    const d = readDesign((profile as any).call_screen);
    setDesign(cloneDesign(d));
    setSavedDesign(cloneDesign(d));
  }, [profile?.id, JSON.stringify((profile as any)?.call_screen)]);

  const fields = useMemo(() => allowedFields(profile?.fields), [profile?.fields]);
  const usedFields = new Set(design.rows.map((r) => r.field));
  const unusedFields = fields.filter((f) => !usedFields.has(f));
  const dirty = !sameDesign(design, savedDesign);
  const amounts = (profile?.amounts ?? "exact") as AmountMode;

  const callPolicy = policy?.call_screen ?? { allow_phone_text_scale: true, min: 0.8, max: 2, respect_system_font: true };
  const scale = effectiveTextScale({
    design,
    phoneScale,
    allowPhoneScale: callPolicy.allow_phone_text_scale,
    min: callPolicy.min,
    max: callPolicy.max,
    respectSystemFont: false,
  });

  const mutate = (fn: (d: CallScreenDesign) => void) =>
    setDesign((prev) => {
      const next = cloneDesign(prev);
      fn(next);
      return next;
    });

  const moveRow = (from: number, to: number) =>
    mutate((d) => {
      if (to < 0 || to >= d.rows.length || from === to) return;
      const [item] = d.rows.splice(from, 1);
      d.rows.splice(to, 0, item);
    });

  const save = async () => {
    if (!profile) return;
    setMessage(null);
    try {
      await savePolicy.mutateAsync({
        brief_profiles: profiles.map((p) => (p.id === profile.id ? ({ ...p, call_screen: design } as any) : p)),
      });
      setSavedDesign(cloneDesign(design));
      setMessage({ severity: "success", text: t("phoneAssistant.callScreen.saved") });
    } catch (e: any) {
      setMessage({ severity: "error", text: e?.message || t("phoneAssistant.callScreen.saveFailed") });
    }
  };

  const sendSample = async () => {
    setSendingSample(true);
    setMessage(null);
    try {
      if (dirty) await save();
      const res = await sendCallScreenSample(profile?.id);
      setMessage(
        res.reached > 0
          ? { severity: "success", text: t("phoneAssistant.callScreen.sampleSent", { count: res.reached }) }
          : { severity: "warning", text: t("phoneAssistant.callScreen.sampleNone") },
      );
    } catch (e: any) {
      setMessage({ severity: "error", text: e?.message || t("phoneAssistant.callScreen.sampleFailed") });
    } finally {
      setSendingSample(false);
    }
  };

  if (policyQuery.isLoading) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (policyQuery.isError || !policy) {
    return <Alert severity="error">{t("phoneAssistant.callScreen.loadFailed")}</Alert>;
  }

  const preview = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <CallScreenPreview
        design={design}
        sample={sample}
        appearance={appearance}
        locked={locked}
        phoneSize={phoneSize}
        amounts={amounts}
        textScale={scale}
        footer={footer}
      />
      <Stack spacing={1}>
        <ToggleButtonGroup exclusive size="small" value={sample} onChange={(_e, v) => v && setSample(v)} fullWidth aria-label={t("phoneAssistant.callScreen.preview.sample")}>
          {(["good", "dues", "blacklisted", "unknown"] as SampleKind[]).map((k) => (
            <ToggleButton key={k} value={k} sx={{ textTransform: "none", fontSize: 12, px: 0.5 }}>
              {t(`phoneAssistant.callScreen.preview.${k}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <ToggleButtonGroup exclusive size="small" value={appearance} onChange={(_e, v) => v && setAppearance(v)}>
            <ToggleButton value="light" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.preview.light")}</ToggleButton>
            <ToggleButton value="dark" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.preview.dark")}</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup exclusive size="small" value={locked ? "locked" : "unlocked"} onChange={(_e, v) => v && setLocked(v === "locked")}>
            <ToggleButton value="unlocked" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.preview.unlocked")}</ToggleButton>
            <ToggleButton value="locked" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.preview.locked")}</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup exclusive size="small" value={phoneSize} onChange={(_e, v) => v && setPhoneSize(v)}>
            <ToggleButton value="small" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.preview.small")}</ToggleButton>
            <ToggleButton value="large" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.preview.large")}</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup exclusive size="small" value={footer} onChange={(_e, v) => v && setFooter(v)}>
            {(["live", "synced", "offline"] as PreviewFooter[]).map((f) => (
              <ToggleButton key={f} value={f} sx={{ textTransform: "none" }}>
                {t(`phoneAssistant.callScreen.preview.footer_${f}`)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
        {callPolicy.allow_phone_text_scale && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("phoneAssistant.callScreen.preview.phoneScale")}{" "}
              <b style={{ fontVariantNumeric: "tabular-nums" }}>{phoneScale ? `×${phoneScale.toFixed(1)}` : t("phoneAssistant.callScreen.preview.shopSetting")}</b>
            </Typography>
            <Slider
              size="small"
              min={callPolicy.min}
              max={callPolicy.max}
              step={0.1}
              value={phoneScale ?? design.text_scale}
              onChange={(_e, v) => setPhoneScale(Number(v))}
              aria-label={t("phoneAssistant.callScreen.preview.phoneScale")}
            />
            {phoneScale && (
              <Button size="small" onClick={() => setPhoneScale(null)}>
                {t("phoneAssistant.callScreen.preview.useShopSetting")}
              </Button>
            )}
          </Box>
        )}
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Top bar */}
      <Paper
        elevation={0}
        sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}
      >
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel id="cs-profile">{t("phoneAssistant.callScreen.profile")}</InputLabel>
          <Select
            labelId="cs-profile"
            label={t("phoneAssistant.callScreen.profile")}
            value={profileId}
            onChange={(e) => {
              if (dirty && !window.confirm(t("phoneAssistant.callScreen.discardConfirm"))) return;
              setProfileId(String(e.target.value));
            }}
          >
            {profiles.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button size="small" variant="outlined" onClick={(e) => setCopyAnchor(e.currentTarget)} disabled={profiles.length < 2}>
          {t("phoneAssistant.callScreen.copyFrom")}
        </Button>
        <Menu anchorEl={copyAnchor} open={Boolean(copyAnchor)} onClose={() => setCopyAnchor(null)}>
          {profiles
            .filter((p) => p.id !== profileId)
            .map((p) => (
              <MenuItem
                key={p.id}
                onClick={() => {
                  // A copied design is trimmed to the fields this profile may receive.
                  const src = readDesign((p as any).call_screen);
                  const allowed = new Set<string>(fields);
                  const rows = src.rows.filter((r) => allowed.has(r.field));
                  setDesign({ ...src, rows: rows.length ? rows : cloneDesign(DEFAULT_CALL_SCREEN).rows.filter((r) => allowed.has(r.field)) });
                  setCopyAnchor(null);
                }}
              >
                {p.name}
              </MenuItem>
            ))}
        </Menu>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            const allowed = new Set<string>(fields);
            const base = cloneDesign(DEFAULT_CALL_SCREEN);
            base.rows = base.rows.filter((r) => allowed.has(r.field));
            if (!base.rows.length) base.rows = [{ field: fields[0] ?? "name", style: "title" }];
            setDesign(base);
          }}
        >
          {t("phoneAssistant.callScreen.reset")}
        </Button>
        <Box sx={{ flex: 1 }} />
        {dirty && <Chip size="small" color="warning" label={t("phoneAssistant.callScreen.unsaved")} />}
        <Button
          size="small"
          variant="outlined"
          startIcon={sendingSample ? <CircularProgress size={14} /> : <SendOutlinedIcon fontSize="small" />}
          disabled={sendingSample || !profile}
          onClick={sendSample}
        >
          {t("phoneAssistant.callScreen.sendSample")}
        </Button>
        <Button variant="contained" size="small" disabled={!dirty || savePolicy.isPending} onClick={save}>
          {savePolicy.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </Paper>

      {message && (
        <Alert severity={message.severity} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      <Typography variant="caption" color="text.secondary">
        {t("phoneAssistant.callScreen.fieldsHint")}
      </Typography>

      {narrow && (
        <Paper elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1 }}>
          <Button size="small" onClick={() => setPreviewOpen((v) => !v)} fullWidth sx={{ justifyContent: "space-between" }}>
            {t("phoneAssistant.callScreen.preview.title")}
            <ExpandMoreRoundedIcon sx={{ transform: previewOpen ? "rotate(180deg)" : "none" }} />
          </Button>
          <Collapse in={previewOpen}>
            <Box sx={{ pt: 1 }}>{preview}</Box>
          </Collapse>
        </Paper>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) 420px" }, gap: 2, alignItems: "start" }}>
        {/* Controls */}
        <Box sx={{ minWidth: 0 }}>
          <Group title={t("phoneAssistant.callScreen.group.size")} defaultOpen>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={design.size}
              onChange={(_e, v) => v && mutate((d) => { d.size = v; })}
              sx={{ flexWrap: "wrap" }}
              aria-label={t("phoneAssistant.callScreen.size")}
            >
              {CALL_SIZES.map((s) => (
                <ToggleButton key={s} value={s} sx={{ textTransform: "none", minHeight: 40 }}>
                  {t(`phoneAssistant.callScreen.sizes.${s}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t("phoneAssistant.callScreen.textScale")}{" "}
                <span style={{ fontVariantNumeric: "tabular-nums" }}>×{design.text_scale.toFixed(1)}</span>
              </Typography>
              <Slider
                min={0.8}
                max={2}
                step={0.1}
                marks
                value={design.text_scale}
                onChange={(_e, v) => mutate((d) => { d.text_scale = Math.round(Number(v) * 10) / 10; })}
                aria-label={t("phoneAssistant.callScreen.textScale")}
              />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{t("phoneAssistant.callScreen.phoneRules")}</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={callPolicy.allow_phone_text_scale}
                  onChange={(e) => patchPolicy.mutate([{ path: "call_screen.allow_phone_text_scale", value: e.target.checked }])}
                />
              }
              label={t("phoneAssistant.callScreen.allowPhoneScale")}
            />
            <Stack direction="row" spacing={2}>
              {(["min", "max"] as const).map((k) => (
                <TextField
                  key={`${k}-${callPolicy[k]}`}
                  size="small"
                  type="number"
                  label={t(`phoneAssistant.callScreen.phone_${k}`)}
                  defaultValue={callPolicy[k]}
                  disabled={!callPolicy.allow_phone_text_scale}
                  onBlur={(e) => {
                    const v = Math.round(Number(e.target.value) * 10) / 10;
                    if (v >= 0.8 && v <= 2 && v !== callPolicy[k]) patchPolicy.mutate([{ path: `call_screen.${k}`, value: v }]);
                  }}
                  slotProps={{ htmlInput: { min: 0.8, max: 2, step: 0.1, style: { fontVariantNumeric: "tabular-nums" } } }}
                  sx={{ width: 120 }}
                />
              ))}
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={callPolicy.respect_system_font}
                  onChange={(e) => patchPolicy.mutate([{ path: "call_screen.respect_system_font", value: e.target.checked }])}
                />
              }
              label={t("phoneAssistant.callScreen.respectSystemFont")}
            />
          </Group>

          <Group title={t("phoneAssistant.callScreen.group.shape")}>
            <ToggleButtonGroup exclusive size="small" value={design.shape.width} onChange={(_e, v) => v && mutate((d) => { d.shape.width = v; })}>
              <ToggleButton value="inset" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.width_inset")}</ToggleButton>
              <ToggleButton value="full" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.width_full")}</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup exclusive size="small" value={design.shape.position} onChange={(_e, v) => v && mutate((d) => { d.shape.position = v; })}>
              {(["top", "middle", "bottom"] as const).map((p) => (
                <ToggleButton key={p} value={p} sx={{ textTransform: "none" }}>
                  {t(`phoneAssistant.callScreen.position_${p}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t("phoneAssistant.callScreen.cornerRadius")} <span style={{ fontVariantNumeric: "tabular-nums" }}>{design.shape.corner_radius}</span>
              </Typography>
              <Slider min={0} max={28} step={1} value={design.shape.corner_radius} onChange={(_e, v) => mutate((d) => { d.shape.corner_radius = Number(v); })} aria-label={t("phoneAssistant.callScreen.cornerRadius")} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t("phoneAssistant.callScreen.opacity")} <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(design.shape.opacity * 100)}%</span>
              </Typography>
              <Slider min={0.8} max={1} step={0.05} value={design.shape.opacity} onChange={(_e, v) => mutate((d) => { d.shape.opacity = Math.round(Number(v) * 100) / 100; })} aria-label={t("phoneAssistant.callScreen.opacity")} />
            </Box>
            <FormControlLabel control={<Switch checked={design.shape.elevation} onChange={(e) => mutate((d) => { d.shape.elevation = e.target.checked; })} />} label={t("phoneAssistant.callScreen.shadow")} />
          </Group>

          <Group title={t("phoneAssistant.callScreen.group.colours")}>
            <ToggleButtonGroup exclusive size="small" value={design.theme.mode} onChange={(_e, v) => v && mutate((d) => { d.theme.mode = v; })}>
              {(["auto", "light", "dark"] as const).map((m) => (
                <ToggleButton key={m} value={m} sx={{ textTransform: "none" }}>
                  {t(`phoneAssistant.callScreen.mode_${m}`)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <ToggleButtonGroup exclusive size="small" value={design.theme.accent} onChange={(_e, v) => v && mutate((d) => { d.theme.accent = v; })}>
              <ToggleButton value="brand" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.accent_brand")}</ToggleButton>
              <ToggleButton value="neutral" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.accent_neutral")}</ToggleButton>
            </ToggleButtonGroup>
            <FormControlLabel control={<Switch checked={design.theme.status_bar} onChange={(e) => mutate((d) => { d.theme.status_bar = e.target.checked; })} />} label={t("phoneAssistant.callScreen.statusBar")} />
            <FormControlLabel control={<Switch checked={design.header.show_logo} onChange={(e) => mutate((d) => { d.header.show_logo = e.target.checked; })} />} label={t("phoneAssistant.callScreen.showLogo")} />
            <FormControlLabel control={<Switch checked={design.header.show_shop_name} onChange={(e) => mutate((d) => { d.header.show_shop_name = e.target.checked; })} />} label={t("phoneAssistant.callScreen.showShopName")} />
            <Typography variant="caption" color="text.secondary">{t("phoneAssistant.callScreen.textColourNote")}</Typography>
          </Group>

          <Group title={t("phoneAssistant.callScreen.group.content")} defaultOpen>
            <Stack spacing={1}>
              {design.rows.map((row, i) => (
                <Paper
                  key={`${row.field}-${i}`}
                  variant="outlined"
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) moveRow(dragIndex, i);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  sx={{ p: 1, borderRadius: 2, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", opacity: dragIndex === i ? 0.5 : 1 }}
                  data-testid={`cs-row-${row.field}`}
                >
                  <DragIndicatorRoundedIcon fontSize="small" sx={{ cursor: "grab", color: "text.secondary" }} aria-hidden />
                  <Typography sx={{ fontWeight: 700, minWidth: 120, flex: "1 1 120px" }}>
                    {t(`phoneAssistant.callScreen.fields.${row.field}`)}
                  </Typography>
                  <Select
                    size="small"
                    value={row.style}
                    onChange={(e) => mutate((d) => { d.rows[i].style = e.target.value as any; })}
                    slotProps={{ input: { "aria-label": `${t(`phoneAssistant.callScreen.fields.${row.field}`)} – ${t("phoneAssistant.callScreen.rowStyle")}` } as any }}
                    sx={{ minWidth: 118 }}
                  >
                    {ROW_STYLES.map((s) => (
                      <MenuItem key={s} value={s}>{t(`phoneAssistant.callScreen.styles.${s}`)}</MenuItem>
                    ))}
                  </Select>
                  <FormControlLabel
                    control={<Switch size="small" checked={Boolean(row.label)} onChange={(e) => mutate((d) => { d.rows[i].label = e.target.checked; })} />}
                    label={t("phoneAssistant.callScreen.showLabel")}
                  />
                  {row.field === "active_items" && (
                    <TextField
                      size="small"
                      type="number"
                      label={t("phoneAssistant.callScreen.maxItems")}
                      value={row.max_items ?? 3}
                      onChange={(e) => mutate((d) => { d.rows[i].max_items = Math.min(10, Math.max(1, Number(e.target.value) || 1)); })}
                      slotProps={{ htmlInput: { min: 1, max: 10, style: { fontVariantNumeric: "tabular-nums" } } }}
                      sx={{ width: 96 }}
                    />
                  )}
                  <Tooltip title={t("phoneAssistant.callScreen.moveUp")}>
                    <span>
                      <IconButton size="small" disabled={i === 0} onClick={() => moveRow(i, i - 1)} aria-label={t("phoneAssistant.callScreen.moveUp")}>
                        <ArrowUpwardRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t("phoneAssistant.callScreen.moveDown")}>
                    <span>
                      <IconButton size="small" disabled={i === design.rows.length - 1} onClick={() => moveRow(i, i + 1)} aria-label={t("phoneAssistant.callScreen.moveDown")}>
                        <ArrowDownwardRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t("phoneAssistant.callScreen.removeRow")}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={design.rows.length <= 1}
                        onClick={() => mutate((d) => { d.rows.splice(i, 1); })}
                        aria-label={`${t("phoneAssistant.callScreen.removeRow")} ${t(`phoneAssistant.callScreen.fields.${row.field}`)}`}
                        sx={{ color: "error.main" }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Paper>
              ))}
            </Stack>
            <Box>
              <Button
                size="small"
                startIcon={<AddRoundedIcon />}
                disabled={!unusedFields.length || design.rows.length >= MAX_ROWS}
                onClick={(e) => setAddAnchor(e.currentTarget)}
              >
                {t("phoneAssistant.callScreen.addField")}
              </Button>
              <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
                {unusedFields.map((f: CallField) => (
                  <MenuItem
                    key={f}
                    onClick={() => {
                      mutate((d) => { d.rows.push({ field: f, style: "body", label: true }); });
                      setAddAnchor(null);
                    }}
                  >
                    {t(`phoneAssistant.callScreen.fields.${f}`)}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Group>

          <Group title={t("phoneAssistant.callScreen.group.warnings")}>
            <Stack spacing={1}>
              {design.rules.map((rule, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1, borderRadius: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                  <Select
                    size="small"
                    value={rule.when}
                    onChange={(e) => mutate((d) => { d.rules[i].when = e.target.value as any; })}
                    slotProps={{ input: { "aria-label": t("phoneAssistant.callScreen.ruleWhen") } as any }}
                    sx={{ minWidth: 190 }}
                  >
                    {RULE_WHENS.map((w) => (
                      <MenuItem key={w} value={w}>{t(`phoneAssistant.callScreen.rules.${w}`)}</MenuItem>
                    ))}
                  </Select>
                  {RULES_WITH_VALUE.has(rule.when) && (
                    <TextField
                      size="small"
                      type="number"
                      label={t("phoneAssistant.callScreen.ruleValue")}
                      value={rule.value ?? 0}
                      onChange={(e) => mutate((d) => { d.rules[i].value = Number(e.target.value) || 0; })}
                      slotProps={{ htmlInput: { min: 0, style: { fontVariantNumeric: "tabular-nums" } } }}
                      sx={{ width: 120 }}
                    />
                  )}
                  <Select
                    size="small"
                    value={rule.accent ?? "none"}
                    onChange={(e) => mutate((d) => { const v = String(e.target.value); if (v === "none") delete d.rules[i].accent; else d.rules[i].accent = v as any; })}
                    slotProps={{ input: { "aria-label": t("phoneAssistant.callScreen.ruleAccent") } as any }}
                    sx={{ minWidth: 110 }}
                  >
                    <MenuItem value="none">{t("phoneAssistant.callScreen.accent_none")}</MenuItem>
                    <MenuItem value="danger">{t("phoneAssistant.callScreen.accent_danger")}</MenuItem>
                    <MenuItem value="warning">{t("phoneAssistant.callScreen.accent_warning")}</MenuItem>
                    <MenuItem value="brand">{t("phoneAssistant.callScreen.accent_brand")}</MenuItem>
                  </Select>
                  <FormControlLabel control={<Switch size="small" checked={Boolean(rule.banner)} onChange={(e) => mutate((d) => { d.rules[i].banner = e.target.checked; })} />} label={t("phoneAssistant.callScreen.banner")} />
                  <FormControlLabel control={<Switch size="small" checked={Boolean(rule.vibrate)} onChange={(e) => mutate((d) => { d.rules[i].vibrate = e.target.checked; })} />} label={t("phoneAssistant.callScreen.vibrate")} />
                  <IconButton size="small" onClick={() => mutate((d) => { d.rules.splice(i, 1); })} aria-label={t("phoneAssistant.callScreen.removeRule")} sx={{ color: "error.main", ml: "auto" }}>
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Stack>
            <Box>
              <Button
                size="small"
                startIcon={<AddRoundedIcon />}
                disabled={design.rules.length >= MAX_RULES}
                onClick={() => mutate((d) => { d.rules.push({ when: "balance_due_over", value: 10000, accent: "warning" }); })}
              >
                {t("phoneAssistant.callScreen.addRule")}
              </Button>
            </Box>
          </Group>

          <Group title={t("phoneAssistant.callScreen.group.buttons")}>
            <Typography variant="caption" color="text.secondary">
              {t("phoneAssistant.callScreen.buttonsHint", { max: MAX_ACTIONS })}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {CALL_ACTIONS.map((a) => {
                const on = design.actions.includes(a);
                return (
                  <Chip
                    key={a}
                    label={t(`phoneAssistant.callScreen.actions.${a}`)}
                    color={on ? "primary" : "default"}
                    variant={on ? "filled" : "outlined"}
                    disabled={!on && design.actions.length >= MAX_ACTIONS}
                    onClick={() =>
                      mutate((d) => {
                        d.actions = on ? d.actions.filter((x) => x !== a) : [...d.actions, a];
                      })
                    }
                  />
                );
              })}
            </Box>
          </Group>

          <Group title={t("phoneAssistant.callScreen.group.behaviour")}>
            <TextField
              size="small"
              type="number"
              label={t("phoneAssistant.callScreen.autoDismiss")}
              helperText={t("phoneAssistant.callScreen.autoDismissHint")}
              value={design.behaviour.auto_dismiss_seconds}
              onChange={(e) => mutate((d) => { d.behaviour.auto_dismiss_seconds = Math.min(60, Math.max(0, Math.round(Number(e.target.value) || 0))); })}
              slotProps={{ htmlInput: { min: 0, max: 60, style: { fontVariantNumeric: "tabular-nums" } } }}
              sx={{ width: 220 }}
            />
            <TextField
              size="small"
              type="number"
              label={t("phoneAssistant.callScreen.collapsedRows")}
              value={design.behaviour.collapsed_rows}
              onChange={(e) => mutate((d) => { d.behaviour.collapsed_rows = Math.min(10, Math.max(1, Math.round(Number(e.target.value) || 1))); })}
              slotProps={{ htmlInput: { min: 1, max: 10, style: { fontVariantNumeric: "tabular-nums" } } }}
              sx={{ width: 220 }}
            />
            <FormControlLabel control={<Switch checked={design.behaviour.draggable} onChange={(e) => mutate((d) => { d.behaviour.draggable = e.target.checked; })} />} label={t("phoneAssistant.callScreen.draggable")} />
            <FormControlLabel control={<Switch checked={design.behaviour.tap_to_expand} onChange={(e) => mutate((d) => { d.behaviour.tap_to_expand = e.target.checked; })} />} label={t("phoneAssistant.callScreen.tapToExpand")} />
            <ToggleButtonGroup exclusive size="small" value={design.behaviour.show_for} onChange={(_e, v) => v && mutate((d) => { d.behaviour.show_for = v; })}>
              <ToggleButton value="incoming" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.showFor_incoming")}</ToggleButton>
              <ToggleButton value="incoming_and_outgoing" sx={{ textTransform: "none" }}>{t("phoneAssistant.callScreen.showFor_both")}</ToggleButton>
            </ToggleButtonGroup>
          </Group>

          <Group title={t("phoneAssistant.callScreen.group.lock")}>
            <Typography variant="caption" color="text.secondary">{t("phoneAssistant.callScreen.lockHint")}</Typography>
            <Select
              size="small"
              value={design.locked.mode}
              onChange={(e) => mutate((d) => { d.locked.mode = e.target.value as any; })}
              slotProps={{ input: { "aria-label": t("phoneAssistant.callScreen.group.lock") } as any }}
              sx={{ maxWidth: 260 }}
            >
              {(["full", "name_rating", "name_only", "hidden"] as const).map((m) => (
                <MenuItem key={m} value={m}>{t(`phoneAssistant.callScreen.lockMode_${m}`)}</MenuItem>
              ))}
            </Select>
          </Group>
        </Box>

        {/* Sticky preview on wide screens */}
        {!narrow && <Box sx={{ position: "sticky", top: 16 }}>{preview}</Box>}
      </Box>
    </Box>
  );
}
