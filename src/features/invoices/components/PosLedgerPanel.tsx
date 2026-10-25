import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  Button,
  InputAdornment,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ConstructionIcon from "@mui/icons-material/Construction";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import { EquipmentNumberBadge } from "@/features/equipment/components/EquipmentNumberBadge";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

import { usePosEquipmentCatalog, type CatalogEquipment } from "../hooks/usePosEquipmentCatalog";
import { useCategoryOptions } from "@/features/equipment/hooks/useCategoryHooks";
import { EquipmentCatalog, EquipmentSearchBar } from "./EquipmentCatalog";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

// ─── CartItem and calculateLineMath ───────────────────────────────────────────
// `track_overdue` controls whether late-fee tracking applies to this line.
// Default OFF — UI prompts opt-in via "+ Track overdue" chip. When off, the
// expected_return_date is set equal to borrow_date so calculateLineMath
// resolves cleanly to a single-day base fee (no NaN, no inflated tiered cost).
// Backend should treat `track_overdue === false` as "skip late-fee calc on
// return"; legacy lines without the field continue to behave as before.

export interface CartItem {
  cart_id: string;
  equipment_id: number;
  equipment_name: string;
  equipment_name_si?: string | null;
  image_url?: string | null;
  serial_number?: string | null;
  available_qty: number;
  is_bulk_item: boolean;
  borrow_quantity: number;
  borrow_date: string;
  expected_return_date: string;
  locked_base_price: number;
  locked_minimum_days: number;
  locked_extra_daily_rate: number;
  pricing_mode: "daily" | "tiered";
  track_overdue: boolean;
}

// ─── Local-timezone-safe date helpers ────────────────────────────────────────
// `new Date("YYYY-MM-DD")` parses as UTC midnight; getDate/setDate operate in
// LOCAL time. For users east of UTC (e.g. Sri Lanka, UTC+5:30) that asymmetry
// silently shifts dates by ±1 day when re-serialised. These helpers force
// everything through local-time construction + manual YYYY-MM-DD formatting so
// the same string comes out that the user sees in the date picker.

export const formatLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayLocalStr = () => formatLocalDate(new Date());

export const addDaysLocal = (dateStr: string, days: number) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatLocalDate(dt);
};

// Returns positive int when `a` is later than `b`, 0 when equal, negative when
// earlier. Date-only — no timezone drift.
export const compareDateStr = (a: string, b: string) => {
  if (!a || !b) return 0;
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime();
};

export const calculateLineMath = (item: CartItem, lng?: string) => {
  // Both dates parsed identically (UTC midnight via the "YYYY-MM-DD" form), so
  // subtraction yields a clean integer day count regardless of viewer's TZ.
  const start = new Date(item.borrow_date).getTime();
  const end = new Date(item.expected_return_date).getTime();
  let totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (totalDays < 1 || isNaN(totalDays)) totalDays = 1;

  let lineCost = 0;
  let calculationText = "";

  if (totalDays <= item.locked_minimum_days) {
    lineCost = item.locked_base_price * item.borrow_quantity;
    calculationText =
      item.pricing_mode === "daily"
        ? i18n.t("invoices.PosLedgerPanel.calcDays", { count: totalDays, lng })
        : i18n.t("invoices.PosLedgerPanel.calcBaseCover", { days: item.locked_minimum_days, lng });
  } else {
    const extraDays = totalDays - item.locked_minimum_days;
    const extraCost = extraDays * item.locked_extra_daily_rate;
    lineCost = (item.locked_base_price + extraCost) * item.borrow_quantity;
    calculationText = i18n.t("invoices.PosLedgerPanel.calcBasePlusExtra", { count: extraDays, lng });
  }

  return { totalDays, lineCost, calculationText };
};

// ─────────────────────────────────────────────────────────────────────────────

interface PosLedgerPanelProps {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showToast: (msg: string, severity?: "error" | "success" | "warning") => void;
}

export function PosLedgerPanel({ cartItems, setCartItems, showToast }: PosLedgerPanelProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(true);
  const catalog = usePosEquipmentCatalog({
    search: inputValue,
    categoryId,
    inStockOnly,
    enabled: catalogOpen,
  });
  const { data: categoryOptions = [] } = useCategoryOptions();

  const todayStr = todayLocalStr();

  // Adds one unit. The catalog stays open so several machines can be added in a row,
  // and the search text is kept so "drill" → three drills works without retyping.
  const handleAddEquipment = (equipment: CatalogEquipment) => {
    if (!equipment) return;
    if (equipment.available_qty <= 0) {
      showToast(t("invoices.PosLedgerPanel.thisItemIsCurrentlyOut"), "error");
      return;
    }
    const existingIndex = cartItems.findIndex((i) => i.equipment_id === equipment.equipment_id);
    if (existingIndex > -1) {
      const existing = cartItems[existingIndex];
      if (existing.is_bulk_item) {
        if (existing.borrow_quantity < equipment.available_qty) {
          updateItem(existing.cart_id, "borrow_quantity", existing.borrow_quantity + 1);
        } else {
          showToast(t("invoices.PosLedgerPanel.maxStockUnits", { available_qty: equipment.available_qty }), "warning");
        }
      } else {
        showToast(t("invoices.PosLedgerPanel.serializedItemAlreadyInOrder"), "error");
      }
      return;
    }

    const isDaily =
      Number(equipment.minimum_rental_days) <= 1 &&
      Number(equipment.base_rental_price) === Number(equipment.extra_daily_rate);

    const fallbackId = `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newItem: CartItem = {
      cart_id:
        typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : fallbackId,
      equipment_id: equipment.equipment_id,
      equipment_name: equipment.equipment_name,
      equipment_name_si: equipment.equipment_name_si,
      image_url: equipment.image_url ?? null,
      serial_number: equipment.serial_number ?? null,
      available_qty: equipment.available_qty || 1,
      is_bulk_item: equipment.is_bulk_item,
      borrow_quantity: 1,
      borrow_date: todayStr,
      // Off by default — expected_return_date == borrow_date keeps cost math
      // resolving to a single-day base fee until the user opts in.
      expected_return_date: todayStr,
      locked_base_price: Number(equipment.base_rental_price) || 0,
      locked_minimum_days: Number(equipment.minimum_rental_days) || 1,
      locked_extra_daily_rate: Number(equipment.extra_daily_rate) || 0,
      pricing_mode: isDaily ? "daily" : "tiered",
      track_overdue: false,
    };
    setCartItems((prev) => [...prev, newItem]);
  };

  // Stepper "−": one unit less, and the line disappears when the last unit goes.
  const handleDecrementEquipment = (equipment: CatalogEquipment) => {
    const existing = cartItems.find((i) => i.equipment_id === equipment.equipment_id);
    if (!existing) return;
    if (existing.is_bulk_item && existing.borrow_quantity > 1) {
      updateItem(existing.cart_id, "borrow_quantity", existing.borrow_quantity - 1);
    } else {
      removeItem(existing.cart_id);
    }
  };

  // Enter (or a barcode scanner's trailing Enter) adds the match when it is unambiguous.
  const handleSearchSubmit = () => {
    // wait until the list really is the answer to what was typed — while a newer search is
    // in flight the old (placeholder) list is still on screen and must not be acted on
    if (catalog.isSettling || catalog.isFetching || catalog.isPlaceholderData || catalog.items.length !== 1) return;
    handleAddEquipment(catalog.items[0]);
    setInputValue("");
  };

  const clearCatalogFilters = () => {
    setInputValue("");
    setCategoryId(null);
    setInStockOnly(true);
  };

  const updateItem = (cartId: string, field: keyof CartItem, value: any) => {
    setCartItems((prev) =>
      prev.map((item) => (item.cart_id === cartId ? { ...item, [field]: value } : item))
    );
  };

  const updateItemBatch = (cartId: string, updates: Partial<CartItem>) => {
    setCartItems((prev) =>
      prev.map((item) => (item.cart_id === cartId ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (cartId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cart_id !== cartId));
  };

  const togglePricingMode = (item: CartItem) => {
    if (item.pricing_mode === "tiered") {
      updateItemBatch(item.cart_id, {
        pricing_mode: "daily",
        locked_extra_daily_rate: item.locked_base_price,
        locked_minimum_days: 1,
      });
    } else {
      updateItemBatch(item.cart_id, { pricing_mode: "tiered" });
    }
  };

  // Opt in: seed Due Back at borrow+1 day so the date picker has a sensible
  // starting value. Opt out: collapse Due Back back to borrow_date so the
  // cost math resolves to a single-day base fee.
  const toggleOverdueTracking = (item: CartItem) => {
    if (item.track_overdue) {
      updateItemBatch(item.cart_id, {
        track_overdue: false,
        expected_return_date: item.borrow_date,
      });
    } else {
      updateItemBatch(item.cart_id, {
        track_overdue: true,
        expected_return_date: addDaysLocal(item.borrow_date, 1),
      });
    }
  };

  const cartSubtotal = cartItems.reduce((t, i) => t + calculateLineMath(i).lineCost, 0);
  const cartQtyById = new Map(cartItems.map((i) => [i.equipment_id, i.borrow_quantity]));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Equipment search (opens the visual catalog below) ── */}
      <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pt: { xs: 2, sm: 2.5 }, pb: 1.5, flexShrink: 0 }}>
        <EquipmentSearchBar
          value={inputValue}
          onChange={setInputValue}
          open={catalogOpen}
          onOpen={() => setCatalogOpen(true)}
          onClose={() => setCatalogOpen(false)}
          loading={catalogOpen && (catalog.isSettling || catalog.isFetching)}
          onSubmit={handleSearchSubmit}
        />
      </Box>

      {/* ── Order manifest, with the catalog laid over it while open ── */}
      <Box sx={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {/* ── Cart summary strip ── */}
        {cartItems.length > 0 && (
          <Box
            sx={{
              mx: { xs: 1.5, sm: 2.5 },
              mb: 1.5,
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: "#eff6ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.dark", display: "flex", alignItems: "center", gap: 0.75, fontVariantNumeric: "tabular-nums" }}>
              {t("invoices.PosLedgerPanel.itemsInOrder", { count: cartItems.length })}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 900,
                color: "primary.dark",
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Rs. {cartSubtotal.toLocaleString()}
            </Typography>
          </Box>
        )}

        {/* ── Cart Items ── */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            px: { xs: 1.5, sm: 2.5 },
            pb: { xs: 2, sm: 2.5 },
            display: "flex",
            flexDirection: "column",
            gap: 2,
            "&::-webkit-scrollbar": { width: "5px" },
            "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" },
          }}
        >
          {cartItems.length === 0 ? (
            <Box
              sx={{
                height: "100%",
                minHeight: 240,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed #cbd5e1",
                borderRadius: 3,
                p: 3,
                color: "#64748b",
                gap: 1.5,
                textAlign: "center",
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  bgcolor: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94a3b8",
                  mb: 0.5,
                }}
              >
                <ShoppingCartCheckoutIcon sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 800, color: "#1e293b" }}>
                {t("invoices.PosLedgerPanel.orderManifestIsEmpty")}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 240, lineHeight: 1.4 }}>
                {t("invoices.PosLedgerPanel.searchAndAddEquipmentItems")}
              </Typography>
              <Button
                variant="contained"
                disableElevation
                startIcon={<GridViewRoundedIcon />}
                onClick={() => setCatalogOpen(true)}
                sx={{ mt: 0.5, borderRadius: 3, fontWeight: 800, textTransform: "none", height: 42, px: 2.5 }}
              >
                {t("invoices.EquipmentCatalog.browse")}
              </Button>
            </Box>
          ) : (
            cartItems.map((item) => {
              const { totalDays, lineCost, calculationText } = calculateLineMath(item);
              const isDailyMode = item.pricing_mode === "daily";
              const returnBeforeBorrow =
                item.track_overdue && compareDateStr(item.expected_return_date, item.borrow_date) < 0;

              return (
                <Paper
                  key={item.cart_id}
                  elevation={0}
                  sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 2.5,
                    bgcolor: "white",
                    overflow: "hidden",
                    flexShrink: 0,
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
                    "&:hover": { borderColor: "#93c5fd" },
                    transition: "all 0.15s ease-in-out",
                  }}
                >
                  {/* Item header */}
                  <Box
                    sx={{
                      px: 2,
                      py: 1.25,
                      bgcolor: "#f8fafc",
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    {item.image_url ? (
                      <Box
                        component="img"
                        src={item.image_url}
                        alt=""
                        loading="lazy"
                        sx={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0, borderRadius: 1 }}
                      />
                    ) : (
                      <ConstructionIcon sx={{ fontSize: 16, color: "primary.main", flexShrink: 0 }} />
                    )}
                    {item.serial_number && <EquipmentNumberBadge value={item.serial_number} size="sm" />}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        flexGrow: 1,
                        minWidth: 0,
                        color: "#0f172a",
                        lineHeight: 1.25,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.equipment_name}
                      {item.equipment_name_si && (
                        <Box component="span" sx={{ ml: 1, fontWeight: 600, color: "#475569" }}>
                          {item.equipment_name_si}
                        </Box>
                      )}
                    </Typography>
                    <Chip
                      size="small"
                      label={isDailyMode ? t("invoices.PosLedgerPanel.dailyMode") : t("invoices.PosLedgerPanel.tieredMode")}
                      sx={{
                        // the mode is also shown by the "Switch to …" button below, so phones
                        // drop the chip to give the machine name the room
                        display: { xs: "none", sm: "inline-flex" },
                        height: 20,
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        bgcolor: isDailyMode ? "#eff6ff" : "#f0fdf4",
                        color: isDailyMode ? "#2563eb" : "#059669",
                        border: "1px solid",
                        borderColor: isDailyMode ? "#bfdbfe" : "#bbf7d0",
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeItem(item.cart_id)}
                      sx={{ color: "text.secondary", "&:hover": { color: "error.main", bgcolor: "rgba(239, 68, 68, 0.08)" } }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  {/* Logistics row */}
                  <Box sx={{ px: 2, pt: 1.5, pb: 1, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                    <TextField
                      type="number"
                      label={t("common.qty")}
                      size="small"
                      value={item.borrow_quantity}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 1;
                        if (val > item.available_qty) val = item.available_qty;
                        if (val < 1) val = 1;
                        updateItem(item.cart_id, "borrow_quantity", val);
                      }}
                      disabled={!item.is_bulk_item}
                      slotProps={{ input: { inputProps: { min: 1, max: item.available_qty } } }}
                      sx={{
                        width: 76,
                        "& .MuiInputBase-input": {
                          color: "#0f172a !important",
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          fontFamily: "'JetBrains Mono', monospace",
                          WebkitTextFillColor: "#0f172a !important",
                        },
                      }}
                    />
                    <TextField
                      type="date"
                      label={t("invoices.dispatch")}
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={item.borrow_date}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!item.track_overdue) {
                          // Tracking off: Due Back follows Dispatch so cost stays
                          // a single-day base fee.
                          updateItemBatch(item.cart_id, {
                            borrow_date: next,
                            expected_return_date: next,
                          });
                        } else if (compareDateStr(next, item.expected_return_date) > 0) {
                          // Tracking on: if user pushes Dispatch past Due Back,
                          // auto-bump Due Back to Dispatch + 1 rather than leave
                          // a stale invalid range.
                          updateItemBatch(item.cart_id, {
                            borrow_date: next,
                            expected_return_date: addDaysLocal(next, 1),
                          });
                        } else {
                          updateItem(item.cart_id, "borrow_date", next);
                        }
                      }}
                      sx={{
                        flex: 1,
                        minWidth: 130,
                        "& .MuiInputBase-input": {
                          color: "#0f172a !important",
                          fontWeight: 600,
                          WebkitTextFillColor: "#0f172a !important",
                        },
                      }}
                    />
                    {item.track_overdue ? (
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, flex: 1, minWidth: 160 }}>
                        <TextField
                          type="date"
                          label={t("invoices.PosLedgerPanel.dueBack")}
                          size="small"
                          slotProps={{
                            inputLabel: { shrink: true },
                            htmlInput: { min: item.borrow_date },
                          }}
                          value={item.expected_return_date}
                          onChange={(e) => updateItem(item.cart_id, "expected_return_date", e.target.value)}
                          error={returnBeforeBorrow}
                          helperText={returnBeforeBorrow ? t("invoices.PosLedgerPanel.mustBeOnOrAfter") : undefined}
                          sx={{
                            flex: 1,
                            "& .MuiInputBase-input": {
                              color: "#0f172a !important",
                              fontWeight: 600,
                              WebkitTextFillColor: "#0f172a !important",
                            },
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => toggleOverdueTracking(item)}
                          title={t("invoices.PosLedgerPanel.removeOverdueTrackingForThis")}
                          sx={{ mt: 0.5, color: "text.disabled", "&:hover": { color: "error.main" } }}
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    ) : (
                      <Chip
                        size="small"
                        icon={<AddIcon sx={{ fontSize: 14 }} />}
                        label={t("invoices.PosLedgerPanel.trackOverdue")}
                        variant="outlined"
                        clickable
                        onClick={() => toggleOverdueTracking(item)}
                        sx={{
                          borderStyle: "dashed",
                          borderColor: "#cbd5e1",
                          color: "text.secondary",
                          fontWeight: 600,
                          fontSize: "0.72rem",
                          height: 34,
                          "&:hover": {
                            borderStyle: "solid",
                            borderColor: "primary.main",
                            bgcolor: "#eff6ff",
                            color: "primary.main",
                          },
                        }}
                      />
                    )}
                  </Box>

                  {/* Pricing row */}
                  <Box
                    sx={{
                      px: 2,
                      pb: 1.5,
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 1.5,
                      flexWrap: "wrap",
                    }}
                  >
                    {isDailyMode ? (
                      <TextField
                        type="number"
                        label={t("invoices.PosLedgerPanel.rateDay")}
                        size="small"
                        value={item.locked_base_price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          updateItemBatch(item.cart_id, {
                            locked_base_price: val,
                            locked_extra_daily_rate: val,
                            locked_minimum_days: 1,
                          });
                        }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                                  Rs.
                                </Typography>
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{
                          width: 140,
                          "& .MuiInputBase-input": {
                            color: "#0f172a !important",
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                            fontVariantNumeric: "tabular-nums",
                            WebkitTextFillColor: "#0f172a !important",
                          },
                        }}
                      />
                    ) : (
                      <>
                        <TextField
                          type="number"
                          label={t("invoices.PosLedgerPanel.baseFee")}
                          size="small"
                          value={item.locked_base_price}
                          onChange={(e) =>
                            updateItem(item.cart_id, "locked_base_price", parseFloat(e.target.value) || 0)
                          }
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>Rs.</Typography>
                                </InputAdornment>
                              ),
                            },
                          }}
                          sx={{
                            width: 110,
                            "& .MuiInputBase-input": {
                              color: "#0f172a !important",
                              fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontVariantNumeric: "tabular-nums",
                              WebkitTextFillColor: "#0f172a !important",
                            },
                          }}
                        />
                        <TextField
                          type="number"
                          label={t("invoices.PosLedgerPanel.coversDays")}
                          size="small"
                          value={item.locked_minimum_days}
                          onChange={(e) =>
                            updateItem(item.cart_id, "locked_minimum_days", parseInt(e.target.value) || 1)
                          }
                          sx={{
                            width: 105,
                            "& .MuiInputBase-input": {
                              color: "#0f172a !important",
                              fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontVariantNumeric: "tabular-nums",
                              WebkitTextFillColor: "#0f172a !important",
                            },
                          }}
                        />
                        <TextField
                          type="number"
                          label={t("invoices.PosLedgerPanel.extraDay")}
                          size="small"
                          value={item.locked_extra_daily_rate}
                          onChange={(e) =>
                            updateItem(item.cart_id, "locked_extra_daily_rate", parseFloat(e.target.value) || 0)
                          }
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>Rs.</Typography>
                                </InputAdornment>
                              ),
                            },
                          }}
                          sx={{
                            width: 110,
                            "& .MuiInputBase-input": {
                              color: "#0f172a !important",
                              fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              fontVariantNumeric: "tabular-nums",
                              WebkitTextFillColor: "#0f172a !important",
                            },
                          }}
                        />
                      </>
                    )}
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
                      onClick={() => togglePricingMode(item)}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "text.secondary",
                        ml: "auto",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {isDailyMode ? t("invoices.PosLedgerPanel.switchToTiered") : t("invoices.PosLedgerPanel.switchToDaily")}
                    </Button>
                  </Box>

                  {/* Cost footer */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      px: 2,
                      py: 1.25,
                      bgcolor: "#eff6ff",
                      borderTop: "1px solid #bfdbfe",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700, display: "flex", alignItems: "center", gap: 0.5, fontVariantNumeric: "tabular-nums" }}>
                      {totalDays}d · {t("invoices.PosLedgerPanel.unitsCount", { count: item.borrow_quantity })} · {calculationText}
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 900,
                        color: "primary.dark",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      Rs. {lineCost.toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>
              );
            })
          )}
        </Box>
        {catalogOpen && (
          <EquipmentCatalog
            items={catalog.items}
            isLoading={catalog.isLoading}
            isFetching={catalog.isFetching || catalog.isSettling}
            isError={catalog.isError}
            onRetry={() => catalog.refetch()}
            hasNextPage={!!catalog.hasNextPage}
            isFetchingNextPage={catalog.isFetchingNextPage}
            fetchNextPage={() => catalog.fetchNextPage()}
            categories={categoryOptions}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            inStockOnly={inStockOnly}
            onInStockChange={setInStockOnly}
            searching={inputValue.trim().length > 0}
            cartQtyById={cartQtyById}
            cartCount={cartItems.length}
            cartTotal={cartSubtotal}
            onAdd={handleAddEquipment}
            onDecrement={handleDecrementEquipment}
            onClose={() => setCatalogOpen(false)}
            onClearFilters={clearCatalogFilters}
          />
        )}
      </Box>
    </Box>
  );
}
