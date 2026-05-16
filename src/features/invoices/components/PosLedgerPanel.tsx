import { useState } from "react";
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  IconButton,
  Paper,
  Chip,
  Button,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ConstructionIcon from "@mui/icons-material/Construction";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";

import { usePosEquipmentSearch } from "../hooks/usePosEquipmentSearch";

// ─── CartItem and calculateLineMath: CONTRACT UNCHANGED ───────────────────────

export interface CartItem {
  cart_id: string;
  equipment_id: number;
  equipment_name: string;
  available_qty: number;
  is_bulk_item: boolean;
  borrow_quantity: number;
  borrow_date: string;
  expected_return_date: string;
  locked_base_price: number;
  locked_minimum_days: number;
  locked_extra_daily_rate: number;
  pricing_mode: "daily" | "tiered";
}

export const calculateLineMath = (item: CartItem) => {
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
        ? `${totalDays} day${totalDays !== 1 ? "s" : ""}`
        : `${item.locked_minimum_days}d base cover`;
  } else {
    const extraDays = totalDays - item.locked_minimum_days;
    const extraCost = extraDays * item.locked_extra_daily_rate;
    lineCost = (item.locked_base_price + extraCost) * item.borrow_quantity;
    calculationText = `Base + ${extraDays} extra day${extraDays !== 1 ? "s" : ""}`;
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
  const [inputValue, setInputValue] = useState("");
  const { data: searchResults = [], isLoading } = usePosEquipmentSearch(inputValue);

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const handleAddEquipment = (equipment: any) => {
    if (!equipment) return;
    if (equipment.available_qty <= 0) {
      showToast("This item is currently out of stock!", "error");
      return;
    }
    const existingIndex = cartItems.findIndex((i) => i.equipment_id === equipment.equipment_id);
    if (existingIndex > -1) {
      const existing = cartItems[existingIndex];
      if (existing.is_bulk_item) {
        if (existing.borrow_quantity < equipment.available_qty) {
          updateItem(existing.cart_id, "borrow_quantity", existing.borrow_quantity + 1);
          setInputValue("");
          return;
        } else {
          showToast(`Max stock: ${equipment.available_qty} units.`, "warning");
          return;
        }
      } else {
        showToast("Serialized item already in order.", "error");
        setInputValue("");
        return;
      }
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
      available_qty: equipment.available_qty || 1,
      is_bulk_item: equipment.is_bulk_item,
      borrow_quantity: 1,
      borrow_date: todayStr,
      expected_return_date: tomorrowStr,
      locked_base_price: Number(equipment.base_rental_price) || 0,
      locked_minimum_days: Number(equipment.minimum_rental_days) || 1,
      locked_extra_daily_rate: Number(equipment.extra_daily_rate) || 0,
      pricing_mode: isDaily ? "daily" : "tiered",
    };
    setCartItems((prev) => [...prev, newItem]);
    setInputValue("");
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

  const cartSubtotal = cartItems.reduce((t, i) => t + calculateLineMath(i).lineCost, 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Equipment Search ── */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, flexShrink: 0 }}>
        <Autocomplete
          options={searchResults}
          getOptionLabel={(option: any) => option.equipment_name}
          filterOptions={(x) => x}
          value={null}
          onChange={(_, newValue) => handleAddEquipment(newValue)}
          onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
          renderInput={(params) => (
            <TextField
              {...(params as any)}
              placeholder="Add equipment by name or SKU…"
              size="small"
              fullWidth
              slotProps={{
                ...((params as any).slotProps),
                input: {
                  ...((params as any).slotProps?.input || {}),
                  startAdornment: (
                    <SearchIcon sx={{ color: "action.disabled", ml: 0.5, mr: 0.5, fontSize: 18 }} />
                  ),
                  endAdornment: (
                    <>
                      {isLoading && <CircularProgress size={16} />}
                      {((params as any).slotProps?.input as any)?.endAdornment}
                    </>
                  ),
                  sx: {
                    borderRadius: 2,
                    bgcolor: "white",
                    "& fieldset": { borderColor: "#e2e8f0" },
                  },
                },
              }}
            />
          )}
          renderOption={(props, option: any) => {
            const { key, ...rest } = props as any;
            const inStock = option.available_qty > 0;
            const isDaily =
              Number(option.minimum_rental_days) <= 1 &&
              Number(option.base_rental_price) === Number(option.extra_daily_rate);
            return (
              <Box
                component="li"
                key={key}
                {...rest}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  cursor: "pointer",
                  borderBottom: "1px solid #f1f5f9",
                  opacity: inStock ? 1 : 0.5,
                  "&:hover": { bgcolor: "#f8fafc" },
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    bgcolor: inStock ? "#eff6ff" : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ConstructionIcon sx={{ fontSize: 16, color: inStock ? "primary.main" : "action.disabled" }} />
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {option.equipment_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isDaily
                      ? `Rs.${Number(option.base_rental_price).toLocaleString()}/day`
                      : `Rs.${Number(option.base_rental_price).toLocaleString()} base · ${option.minimum_rental_days}d cover`}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={inStock ? `${option.available_qty} avail.` : "Out of Stock"}
                  color={inStock ? "success" : "error"}
                  variant={inStock ? "outlined" : "filled"}
                  sx={{ fontWeight: 700, fontSize: "0.7rem", height: 22 }}
                />
              </Box>
            );
          }}
        />
      </Box>

      {/* ── Cart summary strip ── */}
      {cartItems.length > 0 && (
        <Box
          sx={{
            mx: 2.5,
            mb: 1,
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
          <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.dark" }}>
            {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in order
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 900, color: "primary.dark" }}>
            Rs. {cartSubtotal.toLocaleString()}
          </Typography>
        </Box>
      )}

      {/* ── Cart Items ── */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          px: 2.5,
          pb: 2.5,
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
              border: "2px dashed #e2e8f0",
              borderRadius: 3,
              color: "#94a3b8",
              gap: 1,
            }}
          >
            <ShoppingCartCheckoutIcon sx={{ fontSize: 40, opacity: 0.4 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Order manifest is empty
            </Typography>
            <Typography variant="caption">Search and add equipment above to begin.</Typography>
          </Box>
        ) : (
          cartItems.map((item) => {
            const { totalDays, lineCost, calculationText } = calculateLineMath(item);
            const isDailyMode = item.pricing_mode === "daily";

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
                  "&:hover": { borderColor: "#93c5fd" },
                  transition: "border-color 0.15s",
                }}
              >
                {/* Item header */}
                <Box
                  sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: "#fafafa",
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <ConstructionIcon sx={{ fontSize: 15, color: "primary.main", flexShrink: 0 }} />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, flexGrow: 1, color: "#1e293b" }}
                    noWrap
                  >
                    {item.equipment_name}
                  </Typography>
                  <Chip
                    size="small"
                    label={isDailyMode ? "Daily" : "Tiered"}
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      bgcolor: isDailyMode ? "#eff6ff" : "#f0fdf4",
                      color: isDailyMode ? "#2563eb" : "#059669",
                    }}
                  />
                  <IconButton size="small" color="error" onClick={() => removeItem(item.cart_id)}>
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>

                {/* Logistics row */}
                <Box sx={{ px: 2, pt: 1.5, pb: 1, display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  <TextField
                    type="number"
                    label="Qty"
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
                    sx={{ width: 72 }}
                  />
                  <TextField
                    type="date"
                    label="Dispatch"
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={item.borrow_date}
                    onChange={(e) => updateItem(item.cart_id, "borrow_date", e.target.value)}
                    sx={{ flex: 1, minWidth: 130 }}
                  />
                  <TextField
                    type="date"
                    label="Due Back"
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={item.expected_return_date}
                    onChange={(e) => updateItem(item.cart_id, "expected_return_date", e.target.value)}
                    sx={{ flex: 1, minWidth: 130 }}
                  />
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
                      label="Rate / Day"
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
                      sx={{ width: 140 }}
                    />
                  ) : (
                    <>
                      <TextField
                        type="number"
                        label="Base Fee"
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
                        sx={{ width: 110 }}
                      />
                      <TextField
                        type="number"
                        label="Covers (days)"
                        size="small"
                        value={item.locked_minimum_days}
                        onChange={(e) =>
                          updateItem(item.cart_id, "locked_minimum_days", parseInt(e.target.value) || 1)
                        }
                        sx={{ width: 105 }}
                      />
                      <TextField
                        type="number"
                        label="Extra / day"
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
                        sx={{ width: 110 }}
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
                    {isDailyMode ? "Tiered" : "Daily"}
                  </Button>
                </Box>

                {/* Cost footer */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    px: 2,
                    py: 1,
                    bgcolor: "#eff6ff",
                    borderTop: "1px solid #bfdbfe",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
                    {totalDays}d · {item.borrow_quantity} unit{item.borrow_quantity !== 1 ? "s" : ""} · {calculationText}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "primary.dark" }}>
                    Rs. {lineCost.toLocaleString()}
                  </Typography>
                </Box>
              </Paper>
            );
          })
        )}
      </Box>
    </Box>
  );
}
