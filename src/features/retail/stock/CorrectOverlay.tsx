import { useState } from "react";
import { Alert, Box, Button, Chip, Menu, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import CardGiftcardOutlinedIcon from "@mui/icons-material/CardGiftcardOutlined";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CheckIcon from "@mui/icons-material/Check";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useTranslation } from "react-i18next";
import { Overlay, useOverlay, type OverlayComponentProps } from "@/components/overlay";
import { useToast } from "@/components/ui/AppToast";
import { tk } from "@/i18n/marker";
import type { CatalogProduct } from "../api/catalog.types";
import { errorMessage } from "../api/http";
import { ADJUST_REASONS, type AdjustReason } from "../api/stock.types";
import { useRetailCatalog } from "../catalog/useRetailCatalog";
import { StockDot } from "../components/StockDot";
import { ItemFinder } from "../finder/ItemFinder";
import { formatQty } from "../format";
import { isTrackableProduct, statusForProduct } from "./levelsModel";
import { usePostAdjust } from "./stockMutations";
import { useStockLevels } from "./useStockLevels";

const NUM = { fontVariantNumeric: "tabular-nums" } as const;

const REASON_META: Record<AdjustReason, { label: string; icon: React.ReactElement }> = {
  damaged: { label: tk("retail.correct.reason_damaged"), icon: <BrokenImageOutlinedIcon fontSize="small" /> },
  lost: { label: tk("retail.correct.reason_lost"), icon: <SearchOffIcon fontSize="small" /> },
  own_use: { label: tk("retail.correct.reason_own_use"), icon: <BuildOutlinedIcon fontSize="small" /> },
  sample: { label: tk("retail.correct.reason_sample"), icon: <CardGiftcardOutlinedIcon fontSize="small" /> },
  found: { label: tk("retail.correct.reason_found"), icon: <AddCircleOutlinedIcon fontSize="small" /> },
  other: { label: tk("retail.correct.reason_other"), icon: <EditNoteIcon fontSize="small" /> },
};

interface Props extends OverlayComponentProps {
  productId?: number;
  warehouseId?: number | null;
}

/**
 * Correct stock (plan §7.4, F4):
 * Pick item (or pre-filled from Item Card) -> − / + toggle -> quantity pad -> reason chip -> Save.
 */
function CorrectOverlay({ productId: initialProductId, warehouseId: initialWhId }: Props) {
  const { t } = useTranslation();
  const overlay = useOverlay();
  const toast = useToast();
  const { index } = useRetailCatalog();
  const levels = useStockLevels(initialWhId);
  const adjust = usePostAdjust();

  const [selectedWhId, setSelectedWhId] = useState<number | null>(initialWhId ?? null);
  const activeWhId = selectedWhId ?? levels.warehouseId;
  const activeWarehouse = levels.warehouses.find((w) => w.warehouse_id === activeWhId);
  const [whMenu, setWhMenu] = useState<HTMLElement | null>(null);

  const [pickedProduct, setPickedProduct] = useState<CatalogProduct | null>(() =>
    initialProductId ? index.byId.get(initialProductId) ?? null : null,
  );
  const product = pickedProduct ?? (initialProductId ? index.byId.get(initialProductId) ?? null : null);

  const [direction, setDirection] = useState<"out" | "in">("out");
  const [qtyStr, setQtyStr] = useState("1");
  const [freshPad, setFreshPad] = useState(true);
  const [reason, setReason] = useState<AdjustReason | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentLevel = product ? levels.levelFor(product.product_id, activeWhId) : undefined;
  const currentStatus = product ? statusForProduct(product, currentLevel) : "not_counted";
  const currentQty = currentLevel?.qty_on_hand ?? 0;
  const parsedQty = Number(qtyStr);
  const validQty = Number.isFinite(parsedQty) && parsedQty > 0;
  const delta = validQty ? (direction === "out" ? -parsedQty : parsedQty) : 0;
  const afterQty = Math.round((currentQty + delta) * 1000) / 1000;
  const trackable = product ? isTrackableProduct(product) : true;

  const pressKey = (k: string) => {
    setError(null);
    if (k === "back") {
      setFreshPad(false);
      setQtyStr((cur) => (cur.length <= 1 ? "0" : cur.slice(0, -1)));
      return;
    }
    if (k === ".") {
      if (!product?.allow_decimal) return;
      setQtyStr((cur) => (freshPad ? "0." : cur.includes(".") ? cur : `${cur}.`));
      setFreshPad(false);
      return;
    }
    setQtyStr((cur) => {
      if (freshPad || cur === "0") return k;
      return `${cur}${k}`;
    });
    setFreshPad(false);
  };

  const canSave =
    !!product &&
    trackable &&
    validQty &&
    !!reason &&
    (reason !== "other" || note.trim().length > 0) &&
    !adjust.isPending;

  const handleSave = async () => {
    setError(null);
    if (!product || !trackable) return;
    if (!validQty) {
      setError(t("retail.correct.qtyRequired"));
      return;
    }
    if (!reason) {
      setError(t("retail.correct.reasonRequired"));
      return;
    }
    if (reason === "other" && !note.trim()) {
      setError(t("retail.correct.noteRequired"));
      return;
    }
    try {
      const doc = await adjust.mutateAsync({
        warehouse_id: activeWhId ?? undefined,
        reason,
        note: note.trim() || null,
        lines: [{ product_id: product.product_id, qty: delta }],
      });
      toast.showSuccess(t("retail.correct.savedToast", { docNo: doc.doc_no }));
      await overlay.close();
    } catch (err: any) {
      const avail = err?.response?.data?.data?.available ?? err?.response?.data?.available;
      if (err?.response?.status === 409 && avail !== undefined) {
        setError(t("retail.correct.insufficient", { available: formatQty(avail, product.allow_decimal !== false) }));
      } else {
        setError(errorMessage(err, t("retail.item.saveFailed")));
      }
    }
  };

  const footer = product ? (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
      <Button onClick={() => void overlay.close()} sx={{ minHeight: 44 }}>
        {t("common.cancel")}
      </Button>
      <Button variant="contained" startIcon={<CheckIcon />} disabled={!canSave} onClick={() => void handleSave()} sx={{ minHeight: 44, minWidth: 120 }}>
        {t("common.save")}
      </Button>
    </Stack>
  ) : undefined;

  return (
    <Overlay title={t("retail.correct.title")} width={480} onConfirm={canSave ? () => void handleSave() : undefined} footer={footer}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {levels.warehouses.length > 1 && (
          <Box>
            <Chip
              size="small"
              clickable
              icon={<LocationOnOutlinedIcon fontSize="small" />}
              deleteIcon={<KeyboardArrowDownIcon fontSize="small" />}
              onDelete={(e) => setWhMenu(e.currentTarget as HTMLElement)}
              onClick={(e) => setWhMenu(e.currentTarget)}
              label={activeWarehouse?.location_name ?? t("retail.stock.location")}
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Menu anchorEl={whMenu} open={!!whMenu} onClose={() => setWhMenu(null)}>
              {levels.warehouses.map((w) => (
                <MenuItem
                  key={w.warehouse_id}
                  selected={w.warehouse_id === activeWhId}
                  onClick={() => {
                    setSelectedWhId(w.warehouse_id);
                    setWhMenu(null);
                  }}
                >
                  {w.location_name}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}

        {!product ? (
          <ItemFinder
            mode="pick"
            allowCreate={false}
            warehouseId={activeWhId}
            onPick={(p) => {
              setPickedProduct(p);
              setQtyStr("1");
              setFreshPad(true);
              setError(null);
            }}
          />
        ) : (
          <>
            {/* Selected item summary */}
            <Stack direction="row" spacing={1} sx={{ p: 1.25, borderRadius: 2, border: 1, borderColor: "divider", alignItems: "center" }}>
              <StockDot status={currentStatus} size={10} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 800 }} noWrap>
                  {product.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={NUM}>
                  {product.code} · {t("retail.correct.current")}:{" "}
                  {currentStatus === "not_counted" ? t("retail.stock.statusNotCounted") : `${formatQty(currentQty, product.allow_decimal !== false)} ${product.base_unit ?? ""}`}
                  {validQty && trackable ? ` → ${formatQty(afterQty, product.allow_decimal !== false)} ${product.base_unit ?? ""}` : ""}
                </Typography>
              </Box>
              {!initialProductId && (
                <Button size="small" onClick={() => setPickedProduct(null)}>
                  {t("retail.correct.changeItem")}
                </Button>
              )}
            </Stack>

            {!trackable && <Alert severity="warning">{t("retail.stockIn.untrackable", { name: product.name })}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}

            {/* Big − / + toggle and quantity */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <ToggleButtonGroup
                exclusive
                value={direction}
                onChange={(_, val) => {
                  if (val) setDirection(val);
                }}
                aria-label={t("retail.correct.direction")}
              >
                <ToggleButton value="out" color="error" aria-label={t("retail.correct.remove")} sx={{ minWidth: 64, minHeight: 52, fontWeight: 800 }}>
                  <RemoveIcon />
                </ToggleButton>
                <ToggleButton value="in" color="success" aria-label={t("retail.correct.add")} sx={{ minWidth: 64, minHeight: 52, fontWeight: 800 }}>
                  <AddIcon />
                </ToggleButton>
              </ToggleButtonGroup>

              <TextField
                fullWidth
                label={t("retail.stockIn.qtyRow")}
                value={qtyStr}
                onChange={(e) => {
                  setFreshPad(false);
                  setQtyStr(e.target.value);
                }}
                slotProps={{
                  htmlInput: {
                    inputMode: product.allow_decimal ? "decimal" : "numeric",
                    "aria-label": t("retail.stockIn.qtyRow"),
                    style: { fontSize: "1.35rem", fontWeight: 800, textAlign: "right", ...NUM },
                  },
                }}
              />
            </Stack>

            {/* Compact touch number pad */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.75 }} data-testid="correct-keypad">
              {["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "back"].map((k) => (
                <Button
                  key={k}
                  variant="outlined"
                  color="inherit"
                  disabled={k === "." && !product.allow_decimal}
                  onClick={() => pressKey(k)}
                  aria-label={k === "back" ? t("common.back") : k}
                  sx={{ minHeight: 44, fontSize: "1.05rem", fontWeight: 700, ...NUM }}
                >
                  {k === "back" ? <BackspaceOutlinedIcon fontSize="small" /> : k}
                </Button>
              ))}
            </Box>

            {/* Reason chips */}
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, display: "block", mb: 0.75 }}>
                {t("retail.correct.reason")}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }} data-testid="reason-chips">
                {ADJUST_REASONS.map((r) => (
                  <Chip
                    key={r}
                    clickable
                    icon={REASON_META[r].icon}
                    label={t(REASON_META[r].label)}
                    color={reason === r ? "primary" : "default"}
                    variant={reason === r ? "filled" : "outlined"}
                    onClick={() => {
                      setReason(r);
                      setError(null);
                    }}
                    sx={{ minHeight: 40, fontWeight: 700 }}
                  />
                ))}
              </Stack>
            </Box>

            {reason === "other" && (
              <TextField
                size="small"
                fullWidth
                required
                label={t("retail.correct.note")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("retail.correct.notePlaceholder")}
                slotProps={{ htmlInput: { "aria-label": t("retail.correct.note") } }}
              />
            )}
          </>
        )}
      </Box>
    </Overlay>
  );
}

export default CorrectOverlay;
