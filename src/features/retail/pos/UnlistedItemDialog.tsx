import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { useTranslation } from "react-i18next";
import { useApproval } from "../approval/useApproval";
import { useRetailCatalog, useRetailPermissions } from "../catalog/useRetailCatalog";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { buildUnlistedSaleLine } from "./posPricing";
import type { SaleCartLine } from "@/features/invoices/store/posCartStore";
import { TouchNumberPad } from "./TouchNumberPad";
import { CatIcon } from "../components/CategoryIcon";

interface Props {
  open: boolean;
  onClose: () => void;
  initialName?: string;
  scannedBarcode?: string | null;
  warehouseId: number | null;
  onAdd: (line: SaleCartLine) => void;
}

/** Three-box quick unlisted item dialog: name, price (+ touch pad), quantity, and optional category tile. */
export function UnlistedItemDialog({ open, onClose, initialName = "", scannedBarcode = null, warehouseId, onAdd }: Props) {
  const { t } = useTranslation();
  const { canAddUnlisted } = useRetailPermissions();
  const { settings } = useRetailSettings();
  const { catalog } = useRetailCatalog();
  const { request } = useApproval();

  const [name, setName] = useState(initialName);
  const [priceStr, setPriceStr] = useState("");
  const [qty, setQty] = useState(1);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setPriceStr("");
    setQty(1);
    setCategoryId(null);
  }, [open, initialName, scannedBarcode]);

  const topCategories = catalog.categories.filter((c) => c.parent_id == null && c.is_active !== false).slice(0, 8);
  const selectedCat = topCategories.find((c) => c.category_id === categoryId);

  const priceNum = Number(priceStr);
  const valid = name.trim().length > 0 && Number.isFinite(priceNum) && priceNum >= 0 && priceStr.trim() !== "" && qty > 0;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    const rawName = name.trim();
    const displayName =
      selectedCat && !rawName.toLowerCase().includes(selectedCat.name.toLowerCase())
        ? `${rawName} (${selectedCat.name})`
        : rawName;

    const policy = settings.exceptions?.unlisted_item;
    const needsApproval = policy === "approve" || !canAddUnlisted;

    let token: string | null = null;
    if (needsApproval) {
      setSubmitting(true);
      const grant = await request({
        type: "unlisted_item",
        summary: `${displayName} ×${qty} @ Rs ${priceNum.toLocaleString()}`,
        context: {
          description: displayName,
          unit_price: priceNum,
          qty,
          scanned_barcode: scannedBarcode ?? null,
        },
        amount_impact: Math.round(priceNum * qty * 100) / 100,
      });
      setSubmitting(false);
      if (!grant) return;
      token = grant.approval_token;
    }

    onAdd(
      buildUnlistedSaleLine({
        description: displayName,
        unit_price: priceNum,
        qty,
        line_kind: "unlisted",
        warehouseId,
        scanned_barcode: scannedBarcode,
        unlisted_approval_token: token,
      }),
    );
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <span>{t("retail.pos.unlistedTitle")}</span>
        {scannedBarcode && (
          <Chip
            size="small"
            icon={<QrCodeScannerIcon sx={{ fontSize: 14 }} />}
            label={scannedBarcode}
            sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}
          />
        )}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: "8px !important" }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={t("retail.pos.itemName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
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

        {topCategories.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
              {t("retail.pos.optionalCategory")}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ overflowX: "auto", pb: 0.5 }}>
              {topCategories.map((c) => (
                <Chip
                  key={c.category_id}
                  clickable
                  size="small"
                  icon={<CatIcon name={c.icon} sx={{ fontSize: 15 }} />}
                  label={c.name}
                  color={categoryId === c.category_id ? "primary" : "default"}
                  variant={categoryId === c.category_id ? "filled" : "outlined"}
                  onClick={() => setCategoryId((cur) => (cur === c.category_id ? null : c.category_id))}
                  sx={{ flexShrink: 0, fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={submitting}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          disableElevation
          disabled={!valid || submitting}
          onClick={() => void handleSubmit()}
          sx={{ fontWeight: 800 }}
        >
          {t("common.add")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
