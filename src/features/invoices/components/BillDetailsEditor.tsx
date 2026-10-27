// Shop phone / address / email printed at the top of every bill. Stored per
// tenant (PUT /config/bill) and copied into the signed-in session so the
// receipt preview updates straight away.
import { useEffect, useState } from "react";
import { Alert, Box, Button, Collapse, TextField, Typography } from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";

type Bill = { phone: string; address: string; email: string };

const readSaved = (config: any): Bill => {
  let custom = config?.custom_settings || {};
  if (typeof custom === "string") {
    try {
      custom = JSON.parse(custom) || {};
    } catch {
      custom = {};
    }
  }
  return { phone: custom.phone || "", address: custom.address || "", email: custom.email || "" };
};

export function BillDetailsEditor() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canEdit = useAuthStore((s) => s.hasPermission("config:manage"));
  const updateUserPartial = useAuthStore((s) => s.updateUserPartial);
  const config = (user as any)?.configData || {};
  const saved = readSaved(config);
  const missing = !saved.phone || !saved.address;

  const [open, setOpen] = useState(missing);
  const [form, setForm] = useState<Bill>(saved);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(readSaved(config));
    // re-sync only when the stored settings change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(config?.custom_settings ?? null)]);

  if (!canEdit) return null;

  const dirty = form.phone !== saved.phone || form.address !== saved.address || form.email !== saved.email;

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res: any = await api.put("/config/bill", form);
      const bill: Bill = res?.data?.bill || form;
      const custom = typeof config.custom_settings === "object" && config.custom_settings ? config.custom_settings : {};
      updateUserPartial({ configData: { ...config, custom_settings: { ...custom, ...bill } } } as any);
      setStatus({ ok: true, text: t("invoices.BillDetails.saved") });
    } catch (err: any) {
      setStatus({ ok: false, text: err?.response?.data?.message || err?.message || t("invoices.BillDetails.saveFailed") });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Bill, label: string, extra: Record<string, unknown> = {}) => (
    <TextField
      size="small"
      fullWidth
      label={label}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      {...extra}
    />
  );

  return (
    <Box>
      <Button
        fullWidth
        onClick={() => setOpen((o) => !o)}
        startIcon={<StorefrontIcon />}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ justifyContent: "space-between", textTransform: "none", fontWeight: 700, color: "#0f172a", px: 0 }}
      >
        <Box component="span" sx={{ flexGrow: 1, textAlign: "left" }}>
          {t("invoices.BillDetails.title")}
        </Box>
      </Button>
      <Collapse in={open}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, pt: 1 }}>
          <Typography variant="caption" sx={{ color: "#64748b" }}>
            {t("invoices.BillDetails.hint")}
          </Typography>
          {field("phone", t("invoices.BillDetails.phone"), { slotProps: { htmlInput: { inputMode: "tel", style: { fontVariantNumeric: "tabular-nums" } } } })}
          {field("address", t("invoices.BillDetails.address"))}
          {field("email", t("invoices.BillDetails.email"), { type: "email" })}
          <Button variant="contained" disableElevation disabled={!dirty || saving} onClick={save} sx={{ textTransform: "none", fontWeight: 700 }}>
            {saving ? t("invoices.BillDetails.saving") : t("invoices.BillDetails.save")}
          </Button>
          {status && (
            <Alert severity={status.ok ? "success" : "error"} sx={{ py: 0 }}>
              {status.text}
            </Alert>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
