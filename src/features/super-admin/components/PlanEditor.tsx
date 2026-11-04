import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, TextField, Tooltip, Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTranslation } from "react-i18next";

import { usePlans, useSavePlans, useTenants } from "../hooks/useSuperAdminHooks";
import {
  diffPlans, groupState, limitFromText, priceFromText, setFeature, setGroup,
  type PlanChange, type PlanFeature, type Plans,
} from "../lib/planEditing";

const TIER_COLOR: Record<string, string> = { Basic: "#94a3b8", Pro: "#60a5fa", Enterprise: "#a78bfa" };
const COLUMNS = "minmax(240px, 1fr) repeat(3, minmax(128px, 168px))";
const CHANGED = "rgba(245, 158, 11, 0.16)";
const num = { fontVariantNumeric: "tabular-nums" } as const;

const INPUT = {
  "& .MuiOutlinedInput-root": {
    color: "#f1f5f9",
    bgcolor: "transparent",
    fontSize: "0.82rem",
    "& fieldset": { borderColor: "#334155" },
    "&:hover fieldset": { borderColor: "#475569" },
    "&.Mui-focused fieldset": { borderColor: "#f59e0b" },
  },
  // The app theme is light: its dark input text has to be overridden on this dark console.
  "& .MuiOutlinedInput-input": { py: 0.6, px: 1, textAlign: "center", color: "#f1f5f9", WebkitTextFillColor: "#f1f5f9", ...num },
  "& .MuiOutlinedInput-input::placeholder": { color: "#64748b", WebkitTextFillColor: "#64748b", opacity: 1 },
  "& .MuiFormHelperText-root": { mx: 0, fontSize: "0.68rem", textAlign: "center" },
};

const CHECK = { color: "#475569", p: 0.5, "&.Mui-checked, &.MuiCheckbox-indeterminate": { color: "#f59e0b" }, "&.Mui-disabled": { color: "#334155" } };
const ALWAYS_ON = ["invoices", "partialReturns", "customers", "equipment", "photos", "signatures", "whatsapp", "dashboard"];

const featureKey = (key: string) => key.replace(/\./g, "_");

/** A number box that lets you type freely, and only hands up a value that makes sense. */
function NumberCell({ value, parse, placeholder, ariaLabel, changed, onChange, onValidity }: {
  value: number | null;
  parse: (text: string) => number | null | undefined;
  placeholder: string;
  ariaLabel: string;
  changed: boolean;
  onChange: (v: number | null) => void;
  onValidity: (ok: boolean) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(value === null ? "" : String(value));
  useEffect(() => {
    if (parse(text) !== value) setText(value === null ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const bad = parse(text) === undefined;
  return (
    <TextField
      size="small"
      fullWidth
      value={text}
      placeholder={placeholder}
      error={bad}
      helperText={bad ? t("superAdmin.plans.badNumber") : undefined}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = parse(e.target.value);
        onValidity(parsed !== undefined);
        if (parsed !== undefined) onChange(parsed);
      }}
      sx={{ ...INPUT, "& .MuiOutlinedInput-root": { ...INPUT["& .MuiOutlinedInput-root"], bgcolor: changed ? CHANGED : "transparent" } }}
      slotProps={{ htmlInput: { "aria-label": ariaLabel, inputMode: "numeric" } }}
    />
  );
}

/** Edit what each tier includes. Nothing reaches a shop until Save, and Save says who it affects. */
export function PlanEditor() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = usePlans();
  const { data: tenants = [] } = useTenants();
  const save = useSavePlans();
  const [draft, setDraft] = useState<Plans | null>(null);
  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  const [saved, setSaved] = useState<Plans | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ accounting: true, reports: true, operations: true, data: true, admin: true });
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const [confirming, setConfirming] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Taken once: a background refresh must never overwrite what is being edited.
  useEffect(() => {
    if (data && baseVersion === null) {
      setDraft(data.plans);
      setSaved(data.plans);
      setBaseVersion(data.version);
    }
  }, [data, baseVersion]);

  const changes = useMemo<PlanChange[]>(() => (data && draft && saved ? diffPlans(saved, draft, data) : []), [data, draft, saved]);
  const dirty = changes.length > 0;
  const hasInvalid = Object.values(invalid).some(Boolean);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const shopsByTier = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const shop of tenants as any[]) (out[shop.tier] ??= []).push(shop.display_name || shop.db_name);
    return out;
  }, [tenants]);

  if (isLoading || (data && !draft)) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (isError || !data || !draft || !saved) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => refetch()}>{t("superAdmin.plans.retry")}</Button>}>
        {(error as any)?.message || t("superAdmin.plans.loadFailed")}
      </Alert>
    );
  }

  const { tiers, groups, limit_keys: limitKeys } = data;
  const featureName = (key: string) => t(`superAdmin.plans.features.${featureKey(key)}`);
  const limitName = (key: string) => t(`superAdmin.plans.limits.${key}`);
  const priceText = (v: number | null) => (v === null ? t("superAdmin.plans.custom") : `Rs. ${v.toLocaleString()}`);
  const limitText = (v: number | null) => (v === null ? t("superAdmin.plans.unlimited") : v.toLocaleString());
  const update = (next: Plans) => {
    setDraft(next);
    setJustSaved(false);
  };

  const discard = () => {
    update(saved);
    setInvalid({});
  };
  const reload = async () => {
    const fresh = await refetch();
    if (fresh.data) {
      setDraft(fresh.data.plans);
      setSaved(fresh.data.plans);
      setBaseVersion(fresh.data.version);
      setInvalid({});
      save.reset();
    }
  };
  const doSave = () => {
    save.mutate(
      { plans: draft, version: baseVersion ?? 0 },
      {
        onSuccess: (res) => {
          setDraft(res.plans);
          setSaved(res.plans);
          setBaseVersion(res.version);
          setConfirming(false);
          setJustSaved(true);
        },
        onError: () => setConfirming(false),
      },
    );
  };

  const changedTiers = [...new Set(changes.map((c) => c.tier))];
  const changeText = (c: PlanChange) => {
    if (c.kind === "feature") return `${c.on ? "+" : "−"} ${featureName(c.key)}`;
    if (c.kind === "limit") return `${limitName(c.key)}: ${limitText(c.from)} → ${limitText(c.to)}`;
    return `${t("superAdmin.plans.price")}: ${priceText(c.from)} → ${priceText(c.to)}`;
  };

  const featureRow = (f: PlanFeature) => {
    const needsOff = (tier: string) => !!f.requires && !draft[tier].features[f.requires];
    return (
      <Box key={f.key} sx={{ display: "grid", gridTemplateColumns: COLUMNS, alignItems: "center", borderTop: "1px solid #1e293b", "&:hover": { bgcolor: "rgba(30,41,59,0.35)" } }}>
        <Box sx={{ pl: 5, pr: 1, py: 0.6, display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
          <Typography sx={{ color: "#e2e8f0", fontSize: "0.82rem" }}>{featureName(f.key)}</Typography>
          <Tooltip title={t(`superAdmin.plans.featureHelp.${featureKey(f.key)}`)} placement="right">
            <InfoOutlinedIcon sx={{ fontSize: 14, color: "#475569", cursor: "help" }} />
          </Tooltip>
        </Box>
        {tiers.map((tier) => {
          const on = draft[tier].features[f.key];
          const changed = on !== saved[tier].features[f.key];
          return (
            <Tooltip key={tier} title={needsOff(tier) && !on ? t("superAdmin.plans.turnsOnToo", { name: featureName(f.requires!) }) : ""} placement="top">
              <Box sx={{ display: "flex", justifyContent: "center", py: 0.25, bgcolor: changed ? CHANGED : "transparent" }}>
                <Checkbox
                  size="small"
                  checked={on}
                  sx={CHECK}
                  onChange={(e) => update(setFeature(draft, tier, f.key, e.target.checked, groups))}
                  slotProps={{ input: { "aria-label": `${featureName(f.key)}: ${tier}` } }}
                />
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
      {/* Header stays put while the table scrolls */}
      <Box sx={{ px: 3, pt: 2.5, pb: 1.5, display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap", borderBottom: "1px solid #1e293b" }}>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography variant="h6" sx={{ color: "#f1f5f9", fontWeight: 700 }}>{t("superAdmin.plans.title")}</Typography>
          <Typography variant="caption" sx={{ color: "#94a3b8" }}>{t("superAdmin.plans.subtitle")}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {dirty && <Chip size="small" label={t("superAdmin.plans.unsaved", { count: changes.length })} sx={{ bgcolor: CHANGED, color: "#fbbf24", fontWeight: 700, ...num }} />}
          {justSaved && !dirty && <Chip size="small" label={t("superAdmin.plans.savedChip")} sx={{ bgcolor: "rgba(16,185,129,0.15)", color: "#34d399", fontWeight: 700 }} />}
          <Button size="small" disabled={!dirty || save.isPending} onClick={discard} sx={{ color: "#94a3b8", textTransform: "none", fontWeight: 700 }}>
            {t("superAdmin.plans.discard")}
          </Button>
          <Button
            size="small"
            variant="contained"
            disableElevation
            disabled={!dirty || hasInvalid || save.isPending}
            onClick={() => setConfirming(true)}
            sx={{ textTransform: "none", fontWeight: 800, "&.Mui-disabled": { bgcolor: "#1e293b", color: "#475569" } }}
          >
            {t("superAdmin.plans.save")}
          </Button>
        </Box>
      </Box>

      {save.isError && (
        <Alert severity="error" sx={{ mx: 3, mt: 1.5 }} action={<Button color="inherit" size="small" onClick={reload}>{t("superAdmin.plans.reload")}</Button>}>
          {(save.error as any)?.message || t("superAdmin.plans.saveFailed")}
        </Alert>
      )}

      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 3, pb: 3 }}>
        <Box sx={{ minWidth: 660, mt: 1.5, border: "1px solid #1e293b", borderRadius: 2, bgcolor: "#0b1220" }}>
          {/* Tier heads */}
          <Box sx={{ display: "grid", gridTemplateColumns: COLUMNS, position: "sticky", top: 0, zIndex: 2, bgcolor: "#0f172a", borderBottom: "1px solid #1e293b", borderRadius: "8px 8px 0 0" }}>
            <Box />
            {tiers.map((tier) => {
              const shops = shopsByTier[tier] ?? [];
              return (
                <Box key={tier} sx={{ textAlign: "center", py: 1.25, px: 0.5 }}>
                  <Typography sx={{ color: TIER_COLOR[tier], fontWeight: 800, fontSize: "0.9rem" }}>{tier}</Typography>
                  <Tooltip title={shops.join(", ")}>
                    <Typography component="span" sx={{ color: "#64748b", fontSize: "0.7rem", ...num }}>{t("superAdmin.plans.shops", { count: shops.length })}</Typography>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>

          {/* Price */}
          <Box sx={{ display: "grid", gridTemplateColumns: COLUMNS, alignItems: "center" }}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography sx={{ color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 700 }}>{t("superAdmin.plans.price")}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.7rem" }}>{t("superAdmin.plans.priceHint")}</Typography>
            </Box>
            {tiers.map((tier) => (
              <Box key={tier} sx={{ px: 1.5, py: 0.75 }}>
                <NumberCell
                  value={draft[tier].price}
                  parse={priceFromText}
                  placeholder={t("superAdmin.plans.custom")}
                  ariaLabel={`${t("superAdmin.plans.price")}: ${tier}`}
                  changed={draft[tier].price !== saved[tier].price}
                  onChange={(v) => update({ ...draft, [tier]: { ...draft[tier], price: v } })}
                  onValidity={(ok) => setInvalid((p) => ({ ...p, [`price.${tier}`]: !ok }))}
                />
              </Box>
            ))}
          </Box>

          {/* Limits */}
          {limitKeys.map((key) => (
            <Box key={key} sx={{ display: "grid", gridTemplateColumns: COLUMNS, alignItems: "center", borderTop: "1px solid #1e293b" }}>
              <Box sx={{ px: 2, py: 0.75 }}>
                <Typography sx={{ color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 700 }}>{limitName(key)}</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.7rem" }}>{t("superAdmin.plans.limitHint")}</Typography>
              </Box>
              {tiers.map((tier) => (
                <Box key={tier} sx={{ px: 1.5, py: 0.75 }}>
                  <NumberCell
                    value={draft[tier].limits[key]}
                    parse={limitFromText}
                    placeholder={t("superAdmin.plans.unlimited")}
                    ariaLabel={`${limitName(key)}: ${tier}`}
                    changed={draft[tier].limits[key] !== saved[tier].limits[key]}
                    onChange={(v) => update({ ...draft, [tier]: { ...draft[tier], limits: { ...draft[tier].limits, [key]: v } } })}
                    onValidity={(ok) => setInvalid((p) => ({ ...p, [`${key}.${tier}`]: !ok }))}
                  />
                </Box>
              ))}
            </Box>
          ))}

          {/* Feature groups */}
          {groups.map((group) => (
            <Fragment key={group.key}>
              <Box sx={{ display: "grid", gridTemplateColumns: COLUMNS, alignItems: "center", borderTop: "1px solid #334155", bgcolor: "#0f172a" }}>
                <Box
                  role="button"
                  tabIndex={0}
                  aria-expanded={open[group.key]}
                  onClick={() => setOpen((p) => ({ ...p, [group.key]: !p[group.key] }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpen((p) => ({ ...p, [group.key]: !p[group.key] }));
                    }
                  }}
                  sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.75, cursor: "pointer", userSelect: "none" }}
                >
                  <IconButton component="span" size="small" sx={{ color: "#64748b", p: 0.25, transform: open[group.key] ? "none" : "rotate(-90deg)", transition: "transform 0.15s" }}>
                    <ExpandMoreIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ color: "#f1f5f9", fontSize: "0.85rem", fontWeight: 800 }}>{t(`superAdmin.plans.groups.${group.key}`)}</Typography>
                </Box>
                {tiers.map((tier) => {
                  const state = groupState(draft[tier], group);
                  return (
                    <Box key={tier} sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                      {group.features.length > 1 ? (
                        <>
                          <Checkbox
                            size="small"
                            checked={state.all}
                            indeterminate={!state.all && !state.none}
                            sx={CHECK}
                            onChange={() => update(setGroup(draft, tier, group, !state.all, groups))}
                            slotProps={{ input: { "aria-label": `${t(`superAdmin.plans.groups.${group.key}`)}: ${tier}` } }}
                          />
                          <Typography sx={{ color: "#64748b", fontSize: "0.7rem", ...num }}>{state.on}/{state.total}</Typography>
                        </>
                      ) : null}
                    </Box>
                  );
                })}
              </Box>
              <Collapse in={open[group.key]} unmountOnExit>
                {group.features.map((f) => featureRow(f))}
              </Collapse>
            </Fragment>
          ))}

          {/* Never switched off */}
          <Box sx={{ borderTop: "1px solid #334155", bgcolor: "#0f172a", px: 2, py: 1.25, borderRadius: "0 0 8px 8px" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
              <LockOutlinedIcon sx={{ fontSize: 15, color: "#64748b" }} />
              <Typography sx={{ color: "#f1f5f9", fontSize: "0.85rem", fontWeight: 800 }}>{t("superAdmin.plans.alwaysTitle")}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.72rem" }}>{t("superAdmin.plans.alwaysHint")}</Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {ALWAYS_ON.map((k) => (
                <Chip key={k} size="small" label={t(`superAdmin.plans.always.${k}`)} sx={{ bgcolor: "#1e293b", color: "#cbd5e1", fontSize: "0.72rem", height: 22 }} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog open={confirming} onClose={() => !save.isPending && setConfirming(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { bgcolor: "#0f172a", color: "#f1f5f9", backgroundImage: "none", border: "1px solid #334155" } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{t("superAdmin.plans.confirmTitle")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {changedTiers.map((tier) => {
            const shops = shopsByTier[tier] ?? [];
            return (
              <Box key={tier}>
                <Typography sx={{ color: TIER_COLOR[tier], fontWeight: 800, fontSize: "0.9rem" }}>{tier}</Typography>
                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, color: "#e2e8f0", fontSize: "0.82rem", ...num }}>
                  {changes.filter((c) => c.tier === tier).map((c, i) => <li key={i}>{changeText(c)}</li>)}
                </Box>
                <Typography sx={{ color: shops.length ? "#fbbf24" : "#64748b", fontSize: "0.76rem", mt: 0.5 }}>
                  {shops.length ? t("superAdmin.plans.appliesTo", { shops: shops.join(", ") }) : t("superAdmin.plans.appliesToNone")}
                </Typography>
              </Box>
            );
          })}
          <Typography sx={{ color: "#94a3b8", fontSize: "0.76rem" }}>{t("superAdmin.plans.confirmNote")}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button disabled={save.isPending} onClick={() => setConfirming(false)} sx={{ color: "#94a3b8", textTransform: "none", fontWeight: 700 }}>{t("common.cancel")}</Button>
          <Button variant="contained" disableElevation disabled={save.isPending} startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : undefined} onClick={doSave} sx={{ textTransform: "none", fontWeight: 800 }}>
            {t("superAdmin.plans.confirmButton")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
