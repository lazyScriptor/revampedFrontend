import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import { useTranslation } from "react-i18next";
import type { SaleCartLine } from "@/features/invoices/store/posCartStore";
import { buildUnlistedSaleLine } from "./posPricing";
import { TouchNumberPad } from "./TouchNumberPad";

interface Props {
  open: boolean;
  onClose: () => void;
  warehouseId: number | null;
  onAdd: (line: SaleCartLine) => void;
}

/** Quick loose/sundry sale dialog: description, price (+ pad), and quantity. */
export function SundryDialog({ open, onClose, warehouseId, onAdd }: Props) {
  const { t } = useTranslation();
  const [description, setDescription] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    setDescription("");
    setPriceStr("");
    setQty(1);
  }, [open]);

  const priceNum = Number(priceStr);
  const valid = description.trim().length > 0 && priceStr.trim() !== "" && Number.isFinite(priceNum) && priceNum >= 0 && qty > 0;

  const submit = () => {
    if (!valid) return;
    onAdd(
      buildUnlistedSaleLine({
        description: description.trim(),
        unit_price: priceNum,
        qty,
        line_kind: "sundry",
        warehouseId,
      }),
    );
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{t("retail.pos.sundryTitle")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={t("retail.pos.descriptionLabel")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            fullWidth
            size="small"
            label={t("retail.pos.priceLabel")}
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value.replace(/[^0-9.]/g, ""))}
            slotProps={{
              htmlInput: {
                inputMode: "decimal",
                "aria-label": t("retail.pos.priceLabel"),
                style: { fontWeight: 800, fontVariantNumeric: "tabular-nums" },
              },
            }}
          />
          <Box sx={{ display: "flex", alignItems: "center", border: 1, borderColor: "divider", borderRadius: 1.5, height: 40, flexShrink: 0 }}>
            <IconButton size="small" aria-label={t("retail.pos.decreaseQty")} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <RemoveOutlinedIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ px: 1.25, fontWeight: 800, fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "center" }}>
              {qty}
            </Typography>
            <IconButton size="small" aria-label={t("retail.pos.increaseQty")} onClick={() => setQty((q) => q + 1)}>
              <AddOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <TouchNumberPad value={priceStr} onChange={setPriceStr} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          {t("common.cancel")}
        </Button>
        <Button variant="contained" disableElevation disabled={!valid} onClick={submit} sx={{ fontWeight: 800 }}>
          {t("common.add")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
