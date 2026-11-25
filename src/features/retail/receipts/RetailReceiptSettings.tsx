// The shop's retail receipt choices, next to the other bill settings in the print dialog. Only shown
// when the shop has retail and the user may change settings (the server needs config:manage).
import { useEffect, useState } from "react";
import { Box, Button, Collapse, FormControlLabel, Switch, TextField, Typography } from "@mui/material";
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/useAuthStore";
import { errorMessage } from "../api/http";
import { useRetailEnabled } from "../useRetailEnabled";
import { useReceiptSettings, useSaveReceiptSettings } from "./useReceiptSettings";

const FOOTER_MAX = 300;

export function RetailReceiptSettings() {
  const { t } = useTranslation();
  const retailEnabled = useRetailEnabled();
  const canEdit = useAuthStore((s) => s.hasPermission("config:manage"));
  const saved = useReceiptSettings();
  const save = useSaveReceiptSettings();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(saved);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => setForm(saved), [saved.shortSaleReceipt, saved.saleFooter, saved.showItemsSoldOnRentalReceipt, saved.showCashier, saved.returnSlipFooter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!retailEnabled || !canEdit) return null;

  const dirty = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k] !== saved[k]);
  const onSave = () => {
    setStatus(null);
    save.mutate(form, {
      onSuccess: () => setStatus({ ok: true, text: t("retail.receipts.saved") }),
      onError: (err) => setStatus({ ok: false, text: errorMessage(err, t("retail.receipts.saveFailed")) }),
    });
  };

  const toggle = (key: "shortSaleReceipt" | "showItemsSoldOnRentalReceipt" | "showCashier", label: string, hint?: string) => (
    <Box>
      <FormControlLabel
        control={<Switch size="small" checked={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} />}
        label={<Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>{label}</Typography>}
      />
      {hint && (
        <Typography variant="caption" sx={{ display: "block", color: "#64748b", ml: 4.5, mt: -0.5 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );

  const footer = (key: "saleFooter" | "returnSlipFooter", label: string) => (
    <TextField
      size="small"
      fullWidth
      multiline
      minRows={2}
      label={label}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value.slice(0, FOOTER_MAX) }))}
      helperText={`${form[key].length}/${FOOTER_MAX} · ${t("retail.receipts.footerHint")}`}
      slotProps={{ htmlInput: { maxLength: FOOTER_MAX, "aria-label": label }, formHelperText: { sx: { fontVariantNumeric: "tabular-nums" } } }}
    />
  );

  return (
    <Box data-testid="retail-receipt-settings">
      <Button
        fullWidth
        onClick={() => setOpen((o) => !o)}
        startIcon={<ReceiptOutlinedIcon />}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        aria-expanded={open}
        sx={{ justifyContent: "space-between", textTransform: "none", fontWeight: 700, color: "#0f172a", px: 0 }}
      >
        <Box component="span" sx={{ flexGrow: 1, textAlign: "left" }}>
          {t("retail.receipts.settingsTitle")}
        </Box>
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, pt: 1 }}>
          {toggle("shortSaleReceipt", t("retail.receipts.shortSale"), t("retail.receipts.shortSaleHint"))}
          {footer("saleFooter", t("retail.receipts.saleFooter"))}
          {toggle("showItemsSoldOnRentalReceipt", t("retail.receipts.showItemsSold"))}
          {toggle("showCashier", t("retail.receipts.showCashier"))}
          {footer("returnSlipFooter", t("retail.receipts.returnSlipFooter"))}
          <Button variant="contained" disableElevation disabled={!dirty || save.isPending} onClick={onSave} sx={{ fontWeight: 800, textTransform: "none", alignSelf: "flex-start" }}>
            {t("common.save")}
          </Button>
          {status && (
            <Typography variant="caption" role="status" sx={{ fontWeight: 600, color: status.ok ? "#15803d" : "#b91c1c" }}>
              {status.text}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
