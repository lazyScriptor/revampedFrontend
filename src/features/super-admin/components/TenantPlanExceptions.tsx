import { useState } from "react";
import { Alert, Box, Chip, Collapse, IconButton, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslation } from "react-i18next";

import { usePlans, useTenantPlan } from "../hooks/useSuperAdminHooks";
import { countOverrides, effectiveFeatures, limitFromText, setLimitOverride, setOverride, type PlanOverrides } from "../lib/planEditing";

const num = { fontVariantNumeric: "tabular-nums" } as const;
const INPUT = {
  "& .MuiOutlinedInput-root": { color: "#f1f5f9", bgcolor: "transparent", fontSize: "0.8rem", "& fieldset": { borderColor: "#334155" }, "&:hover fieldset": { borderColor: "#475569" }, "&.Mui-focused fieldset": { borderColor: "#f59e0b" } },
  // The app theme is light: its dark input text has to be overridden on this dark console.
  "& .MuiOutlinedInput-input": { py: 0.5, px: 1, color: "#f1f5f9", WebkitTextFillColor: "#f1f5f9", ...num },
  "& .MuiOutlinedInput-input.Mui-disabled": { WebkitTextFillColor: "#64748b" },
  "& .MuiOutlinedInput-input::placeholder": { color: "#64748b", WebkitTextFillColor: "#64748b", opacity: 1 },
};
const TOGGLE = { color: "#94a3b8", borderColor: "#334155", py: 0.1, px: 1, fontSize: "0.68rem", textTransform: "none", fontWeight: 700, "&.Mui-selected": { color: "#0f172a", bgcolor: "#f59e0b", "&:hover": { bgcolor: "#fbbf24" } } } as const;

interface Props {
  tenantId: string;
  tier: string;
  overrides?: PlanOverrides;
  onChange: (next: PlanOverrides) => void;
}

/** One shop's usage, and anything it gets beyond (or short of) its tier's plan. */
export function TenantPlanExceptions({ tenantId, tier, overrides, onChange }: Props) {
  const { t } = useTranslation();
  const { data } = usePlans();
  const { data: live } = useTenantPlan(tenantId);
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const plan = data.plans[tier] ?? data.plans.Basic;
  const features = effectiveFeatures(plan, overrides, data.groups);
  const featureName = (key: string) => t(`superAdmin.plans.features.${key.replace(/\./g, "_")}`);
  const count = countOverrides(overrides);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1 }}>
        {data.limit_keys.map((key) => {
          const own = overrides?.limits?.[key];
          const hasOwn = own !== undefined;
          const limit = hasOwn ? own : plan.limits[key];
          const used = live?.usage?.[key];
          const over = limit !== null && used !== undefined && used > limit;
          const unlimitedOwn = hasOwn && own === null;
          return (
            <Box key={key} sx={{ p: 1, bgcolor: "#0f172a", border: "1px solid", borderColor: over ? "#b45309" : "#1e293b", borderRadius: 1.5 }}>
              <Typography sx={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: 700 }}>{t(`superAdmin.plans.limits.${key}`)}</Typography>
              <Typography sx={{ color: over ? "#fbbf24" : "#f1f5f9", fontWeight: 800, fontSize: "0.95rem", ...num }}>
                {used ?? "–"} / {limit === null ? "∞" : limit}
              </Typography>
              {over && <Typography sx={{ color: "#fbbf24", fontSize: "0.68rem" }}>{t("superAdmin.plans.overLimit")}</Typography>}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mt: 0.5 }}>
                <TextField
                  size="small"
                  fullWidth
                  disabled={unlimitedOwn}
                  value={hasOwn && own !== null ? String(own) : ""}
                  placeholder={unlimitedOwn ? t("superAdmin.plans.unlimited") : t("superAdmin.plans.planValue", { value: plan.limits[key] === null ? t("superAdmin.plans.unlimited") : plan.limits[key] })}
                  onChange={(e) => {
                    const text = e.target.value.trim();
                    if (text === "") return onChange(setLimitOverride(overrides, key, undefined));
                    const parsed = limitFromText(text);
                    if (typeof parsed === "number") onChange(setLimitOverride(overrides, key, parsed));
                  }}
                  sx={INPUT}
                  slotProps={{ htmlInput: { "aria-label": `${t(`superAdmin.plans.limits.${key}`)} ${t("superAdmin.plans.exception")}`, inputMode: "numeric" } }}
                />
                <Tooltip title={t("superAdmin.plans.unlimited")}>
                  <IconButton size="small" aria-label={`${t("superAdmin.plans.unlimited")}: ${t(`superAdmin.plans.limits.${key}`)}`} aria-pressed={unlimitedOwn} onClick={() => onChange(setLimitOverride(overrides, key, unlimitedOwn ? undefined : null))} sx={{ color: unlimitedOwn ? "#f59e0b" : "#475569" }}>
                    <AllInclusiveIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1, py: 0.75, bgcolor: "#0f172a", border: "1px solid #1e293b", borderRadius: 1.5, cursor: "pointer", userSelect: "none" }}
      >
        <ExpandMoreIcon sx={{ fontSize: 18, color: "#64748b", transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.15s" }} />
        <Typography sx={{ color: "#e2e8f0", fontSize: "0.8rem", fontWeight: 700, flex: 1 }}>{t("superAdmin.plans.exceptionsTitle")}</Typography>
        <Chip size="small" label={count ? t("superAdmin.plans.exceptionsCount", { count }) : t("superAdmin.plans.exceptionsNone")} sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, bgcolor: count ? "rgba(245,158,11,0.16)" : "#1e293b", color: count ? "#fbbf24" : "#64748b", ...num }} />
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1, border: "1px solid #1e293b", borderRadius: 1.5 }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.72rem" }}>{t("superAdmin.plans.exceptionsHint", { tier })}</Typography>
          {data.groups.map((group) => (
            <Box key={group.key}>
              <Typography sx={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: 800, mb: 0.25 }}>{t(`superAdmin.plans.groups.${group.key}`)}</Typography>
              {group.features.map((f) => {
                const own = overrides?.features?.[f.key];
                const blocked = !!f.requires && !features[f.requires];
                return (
                  <Box key={f.key} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}>
                    <Typography sx={{ flex: 1, minWidth: 0, color: features[f.key] ? "#e2e8f0" : "#64748b", fontSize: "0.78rem" }}>
                      {featureName(f.key)}
                      {blocked && <Typography component="span" sx={{ color: "#b45309", fontSize: "0.68rem", ml: 0.75 }}>{t("superAdmin.plans.needs", { name: featureName(f.requires!) })}</Typography>}
                    </Typography>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      disabled={blocked}
                      value={own === undefined ? "plan" : own ? "on" : "off"}
                      onChange={(_, v) => v && onChange(setOverride(overrides, f.key, v === "plan" ? undefined : v === "on"))}
                      aria-label={featureName(f.key)}
                    >
                      <ToggleButton value="plan" sx={TOGGLE}>{t(plan.features[f.key] ? "superAdmin.plans.planOn" : "superAdmin.plans.planOff")}</ToggleButton>
                      <ToggleButton value="on" sx={TOGGLE}>{t("superAdmin.plans.on")}</ToggleButton>
                      <ToggleButton value="off" sx={TOGGLE}>{t("superAdmin.plans.off")}</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                );
              })}
            </Box>
          ))}
          {count > 0 && <Alert severity="info" variant="outlined" sx={{ py: 0, fontSize: "0.72rem", color: "#93c5fd", borderColor: "#1e3a8a" }}>{t("superAdmin.plans.exceptionsSaveHint")}</Alert>}
        </Box>
      </Collapse>
    </Box>
  );
}
