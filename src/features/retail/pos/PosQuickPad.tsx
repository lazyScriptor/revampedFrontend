import { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useTranslation } from "react-i18next";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { useUiPreference } from "@/features/preferences/useUiPreference";
import type { CatalogProduct } from "../api/catalog.types";
import { useRetailCatalog } from "../catalog/useRetailCatalog";
import { useRetailSettings } from "../hooks/useRetailSettings";
import { useStockLevels } from "../stock/useStockLevels";
import { StockDot } from "../components/StockDot";
import { resolveCatalogPrice, type CustomerPriceLevel } from "./posPricing";
import { TouchNumberPad } from "./TouchNumberPad";

interface Props {
  priceLevel: CustomerPriceLevel;
  warehouseId: number | null;
  onAdd: (product: CatalogProduct, qty: number) => void;
}

const LONG_PRESS_MS = 450;

export function PosQuickPad({ priceLevel, warehouseId, onAdd }: Props) {
  const { t } = useTranslation();
  const { catalog, index } = useRetailCatalog();
  const { settings } = useRetailSettings();
  const { statusFor } = useStockLevels(warehouseId);
  const {
    value: prefIds,
    set: setPrefIds,
    reset: resetPrefIds,
    isDefault,
  } = useUiPreference<number[] | null>("pos.quickPad", null);

  const [qtyTarget, setQtyTarget] = useState<CatalogProduct | null>(null);
  const [qtyStr, setQtyStr] = useState("2");
  const [customOpen, setCustomOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<number[]>([]);
  const [searchCustom, setSearchCustom] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  const defaultProducts = useMemo(() => {
    const active = catalog.products.filter((p) => p.is_active !== false);
    const shopIds = settings.quickPad ?? [];
    if (shopIds.length > 0) {
      const picked = shopIds.map((id) => index.byId.get(id)).filter((p): p is CatalogProduct => !!p && p.is_active !== false);
      if (picked.length > 0) return picked.slice(0, 24);
    }
    const ts = (s?: string | null) => (s ? Date.parse(s) || 0 : 0);
    return [...active]
      .sort((a, b) => {
        const dt = ts(b.last_sold_at) - ts(a.last_sold_at);
        if (dt !== 0) return dt;
        const dr = ts(b.last_received_at) - ts(a.last_received_at);
        if (dr !== 0) return dr;
        return a.product_id - b.product_id;
      })
      .slice(0, 12);
  }, [catalog.products, settings.quickPad, index.byId]);

  const padProducts = useMemo(() => {
    if (Array.isArray(prefIds)) {
      const resolved = prefIds.map((id) => index.byId.get(id)).filter((p): p is CatalogProduct => !!p && p.is_active !== false);
      if (resolved.length > 0) return resolved.slice(0, 24);
      if (prefIds.length === 0) return [];
    }
    return defaultProducts;
  }, [prefIds, index.byId, defaultProducts]);

  const clearPressTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const openQtyPrompt = (product: CatalogProduct) => {
    setQtyTarget(product);
    setQtyStr("2");
  };

  const handlePointerDown = (product: CatalogProduct, button: number) => {
    if (button !== 0) return;
    longPressedRef.current = false;
    clearPressTimer();
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      openQtyPrompt(product);
    }, LONG_PRESS_MS);
  };

  const handleTileClick = (product: CatalogProduct) => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    onAdd(product, 1);
  };

  const submitQty = () => {
    if (!qtyTarget) return;
    const q = Number(qtyStr);
    if (!Number.isFinite(q) || q <= 0) return;
    onAdd(qtyTarget, q);
    setQtyTarget(null);
  };

  const openCustomize = () => {
    const current = (Array.isArray(prefIds) ? prefIds : padProducts.map((p) => p.product_id)).filter((id) =>
      index.byId.has(id),
    );
    setDraftIds(current);
    setSearchCustom("");
    setCustomOpen(true);
  };

  const filteredAllProducts = useMemo(() => {
    const q = searchCustom.trim().toLowerCase();
    return catalog.products
      .filter((p) => p.is_active !== false && (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)))
      .slice(0, 40);
  }, [catalog.products, searchCustom]);

  if (catalog.products.length === 0) return null;

  return (
    <>
      <Box
        data-testid="quick-pad"
        sx={{
          px: { xs: 1.5, sm: 2.5 },
          pb: 1,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              fontSize: "0.66rem",
            }}
          >
            {t("retail.pos.quickPad")}
          </Typography>
          <Tooltip title={t("retail.pos.customizeQuickPad")}>
            <IconButton
              size="small"
              aria-label={t("retail.pos.customizeQuickPad")}
              onClick={openCustomize}
              sx={{ color: "text.secondary", width: 28, height: 28 }}
            >
              <TuneOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 0.75,
            overflowX: "auto",
            pb: 0.5,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {padProducts.map((p) => {
            const { unit_price } = resolveCatalogPrice(p, null, priceLevel, settings.showContractorPrice ?? true);
            const dotStatus = statusFor(p, warehouseId);
            return (
              <Paper
                key={p.product_id}
                role="button"
                tabIndex={0}
                variant="outlined"
                data-testid={`quick-pad-btn-${p.product_id}`}
                onPointerDown={(e) => handlePointerDown(p, e.button)}
                onPointerUp={clearPressTimer}
                onPointerLeave={clearPressTimer}
                onPointerCancel={clearPressTimer}
                onContextMenu={(e) => {
                  e.preventDefault();
                  clearPressTimer();
                  openQtyPrompt(p);
                }}
                onClick={() => handleTileClick(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAdd(p, 1);
                  }
                }}
                sx={{
                  flexShrink: 0,
                  width: 96,
                  p: 0.75,
                  borderRadius: 2,
                  cursor: "pointer",
                  userSelect: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.4,
                  bgcolor: "background.paper",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                  "&:active": { transform: "scale(0.97)" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
                  {p.image_url ? (
                    <Box
                      component="img"
                      src={resolveAssetUrl(p.image_url) || undefined}
                      alt=""
                      sx={{ width: 24, height: 24, objectFit: "contain", borderRadius: 0.75 }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 0.75,
                        bgcolor: "action.selected",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "0.7rem",
                        color: "primary.main",
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </Box>
                  )}
                  <StockDot status={dotStatus} size={7} />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: "text.primary",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    minHeight: 26,
                  }}
                >
                  {p.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "primary.main",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: "0.7rem",
                  }}
                >
                  Rs {unit_price.toLocaleString()}
                </Typography>
              </Paper>
            );
          })}
        </Box>
      </Box>

      {/* Long-press quantity prompt */}
      <Dialog open={Boolean(qtyTarget)} onClose={() => setQtyTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{qtyTarget?.name}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label={t("common.qty")}
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value.replace(/[^0-9.]/g, ""))}
            slotProps={{
              htmlInput: {
                inputMode: "decimal",
                "aria-label": t("common.qty"),
                style: { fontWeight: 800, fontVariantNumeric: "tabular-nums" },
              },
            }}
          />
          <Box sx={{ display: "flex", gap: 0.75, mt: 1 }}>
            {[2, 5, 10, 20].map((q) => (
              <Button key={q} size="small" variant="outlined" onClick={() => setQtyStr(String(q))} sx={{ flex: 1, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                ×{q}
              </Button>
            ))}
          </Box>
          <TouchNumberPad value={qtyStr} onChange={setQtyStr} allowDecimal={!!qtyTarget?.allow_decimal} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setQtyTarget(null)} color="inherit">
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            disableElevation
            disabled={!(Number(qtyStr) > 0)}
            onClick={submitQty}
            sx={{ fontWeight: 800 }}
          >
            {t("common.add")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customize personal quick pad */}
      <Dialog open={customOpen} onClose={() => setCustomOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{t("retail.pos.customizeQuickPad")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t("common.search")}
            value={searchCustom}
            onChange={(e) => setSearchCustom(e.target.value)}
          />
          {draftIds.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t("retail.pos.selectedCount", { count: draftIds.length })}
              </Typography>
              {draftIds.map((id, i) => {
                const prod = index.byId.get(id);
                if (!prod) return null;
                return (
                  <Box key={id} sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: 1, bgcolor: "action.hover" }}>
                    <Typography variant="caption" sx={{ flex: 1, fontWeight: 700 }} noWrap>
                      {prod.name}
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={i === 0}
                      aria-label={t("retail.pos.moveUp")}
                      onClick={() =>
                        setDraftIds((cur) => {
                          const next = [...cur];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          return next;
                        })
                      }
                    >
                      <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={i === draftIds.length - 1}
                      aria-label={t("retail.pos.moveDown")}
                      onClick={() =>
                        setDraftIds((cur) => {
                          const next = [...cur];
                          [next[i + 1], next[i]] = [next[i], next[i + 1]];
                          return next;
                        })
                      }
                    >
                      <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>
          )}
          <Box sx={{ maxHeight: 240, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 1.5 }}>
            {filteredAllProducts.map((p) => {
              const checked = draftIds.includes(p.product_id);
              return (
                <Box
                  key={p.product_id}
                  onClick={() =>
                    setDraftIds((cur) =>
                      cur.includes(p.product_id)
                        ? cur.filter((x) => x !== p.product_id)
                        : cur.length < 24
                          ? [...cur, p.product_id]
                          : cur,
                    )
                  }
                  sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.5, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <Checkbox size="small" checked={checked} tabIndex={-1} />
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: checked ? 700 : 500 }} noWrap>
                    {p.name}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
          <Button
            size="small"
            color="inherit"
            startIcon={<RestartAltIcon />}
            disabled={isDefault}
            onClick={() => {
              resetPrefIds();
              setCustomOpen(false);
            }}
            sx={{ textTransform: "none" }}
          >
            {t("retail.pos.resetDefault")}
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={() => setCustomOpen(false)} color="inherit">
              {t("common.cancel")}
            </Button>
            <Button
              variant="contained"
              disableElevation
              onClick={() => {
                setPrefIds(draftIds);
                setCustomOpen(false);
              }}
              sx={{ fontWeight: 800 }}
            >
              {t("common.save")}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
}
