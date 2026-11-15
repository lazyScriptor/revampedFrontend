import { useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useTranslation } from "react-i18next";
import { usePhoneAssistantPolicy, usePatchPhoneAssistantPolicy } from "../hooks/useShopDevices";
import type { PhoneAssistantPolicy } from "../api/phoneAssistantApi";

export type PolicyRow =
  | { kind: "number"; path: string; label: string; hint?: string; min: number; max: number; step?: number; value: number }
  | { kind: "switch"; path: string; label: string; hint?: string; value: boolean }
  | { kind: "select"; path: string; label: string; hint?: string; value: string; options: Array<{ value: string; label: string }> }
  | { kind: "multi"; path: string; label: string; hint?: string; value: string[]; options: Array<{ value: string; label: string }>; locked?: string[] }
  | { kind: "time"; path: string; label: string; hint?: string; value: string }
  | { kind: "custom"; label: string; hint?: string; node: ReactNode };

interface Props {
  title: string;
  subtitle?: string;
  rows: PolicyRow[];
}

/** Two-column "setting / value" grid. Each cell saves only its own path, so tabs never overwrite each other. */
export function PolicyGrid({ title, subtitle, rows }: Props) {
  const { t } = useTranslation();
  const patch = usePatchPhoneAssistantPolicy();
  const [ticked, setTicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = (path: string, value: unknown) => {
    setError(null);
    patch.mutate([{ path, value }], {
      onSuccess: () => {
        setTicked(path);
        window.setTimeout(() => setTicked((p) => (p === path ? null : p)), 1800);
      },
      onError: (e: any) => setError(e?.message || t("phoneAssistant.pushGrid.saveFailed")),
    });
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, border: 1, borderColor: "divider", borderRadius: 2.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{subtitle}</Typography>}
      {error && <Alert severity="error" sx={{ my: 1 }} onClose={() => setError(null)}>{error}</Alert>}
      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", mt: 1 }}>
        {rows.map((row, i) => (
          <Box
            key={"path" in row ? row.path : `custom-${i}`}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(0,1fr) minmax(0,320px)" },
              gap: { xs: 0.75, sm: 2 },
              alignItems: "center",
              px: 1.5,
              py: 1,
              minHeight: 56,
              borderTop: i === 0 ? 0 : 1,
              borderColor: "divider",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{row.label}</Typography>
              {row.hint && <Typography variant="caption" color="text.secondary">{row.hint}</Typography>}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: { sm: "flex-end" } }}>
              {row.kind === "number" && (
                <TextField
                  key={`${row.path}-${row.value}`}
                  size="small"
                  type="number"
                  defaultValue={row.value}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= row.min && n <= row.max && n !== row.value) commit(row.path, n);
                    else e.target.value = String(row.value);
                  }}
                  slotProps={{ htmlInput: { min: row.min, max: row.max, step: row.step ?? 1, "aria-label": row.label, style: { textAlign: "right", fontVariantNumeric: "tabular-nums" } } }}
                  sx={{ width: 130 }}
                />
              )}
              {row.kind === "switch" && (
                <Switch checked={row.value} onChange={(e) => commit(row.path, e.target.checked)} slotProps={{ input: { role: "switch", "aria-label": row.label } }} />
              )}
              {row.kind === "select" && (
                <Select
                  size="small"
                  value={row.value}
                  onChange={(e) => commit(row.path, e.target.value)}
                  slotProps={{ input: { "aria-label": row.label } as any }}
                  sx={{ minWidth: 200 }}
                >
                  {row.options.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              )}
              {row.kind === "multi" && (
                <Select
                  size="small"
                  multiple
                  value={row.value}
                  onChange={(e) => {
                    const next = e.target.value as string[];
                    const merged = [...new Set([...(row.locked ?? []), ...next])];
                    commit(row.path, merged);
                  }}
                  renderValue={(sel) => (sel as string[]).map((v) => row.options.find((o) => o.value === v)?.label ?? v).join(", ")}
                  slotProps={{ input: { "aria-label": row.label } as any }}
                  sx={{ minWidth: 200, maxWidth: 320 }}
                >
                  {row.options.map((o) => (
                    <MenuItem key={o.value} value={o.value} dense disabled={row.locked?.includes(o.value)}>
                      <Checkbox size="small" checked={row.value.includes(o.value)} />
                      <ListItemText primary={o.label} />
                    </MenuItem>
                  ))}
                </Select>
              )}
              {row.kind === "time" && (
                <TextField
                  key={`${row.path}-${row.value}`}
                  size="small"
                  type="time"
                  defaultValue={row.value}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value !== row.value) commit(row.path, e.target.value);
                  }}
                  slotProps={{ htmlInput: { "aria-label": row.label, style: { fontVariantNumeric: "tabular-nums" } } }}
                  sx={{ width: 130 }}
                />
              )}
              {row.kind === "custom" && row.node}
              {"path" in row && ticked === row.path && <CheckRoundedIcon aria-label={t("phoneAssistant.pushGrid.saved")} sx={{ fontSize: 18, color: "success.main" }} />}
              {"path" in row && patch.isPending && patch.variables?.[0]?.path === row.path && <CircularProgress size={14} />}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

/** Loads the shop policy for the tabs that only show grids. */
export function usePolicyOrFallback(): { policy: PhoneAssistantPolicy | null; loading: boolean; error: boolean } {
  const q = usePhoneAssistantPolicy(true);
  return { policy: q.data?.policy ?? null, loading: q.isLoading, error: q.isError };
}
