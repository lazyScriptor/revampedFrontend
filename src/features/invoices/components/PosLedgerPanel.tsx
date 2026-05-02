import { useState } from "react";
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  IconButton,
  Divider,
  Paper,
  Chip,
  Button,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import HardwareIcon from "@mui/icons-material/Hardware";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import RequestQuoteOutlinedIcon from "@mui/icons-material/RequestQuoteOutlined";

import { usePosEquipmentSearch } from "../hooks/usePosEquipmentSearch";

// 1. We extend the CartItem interface to track the UI mode
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
  pricing_mode: "daily" | "tiered"; // UI State Only (Backend ignores this)
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
        ? `${totalDays} Days`
        : `${item.locked_minimum_days} Day Base Cover`;
  } else {
    const extraDays = totalDays - item.locked_minimum_days;
    const extraCost = extraDays * item.locked_extra_daily_rate;
    lineCost = (item.locked_base_price + extraCost) * item.borrow_quantity;
    calculationText = `Base + ${extraDays} extra day(s)`;
  }

  return { totalDays, lineCost, calculationText };
};

interface PosLedgerPanelProps {
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showToast: (msg: string, severity?: "error" | "success" | "warning") => void;
}

export function PosLedgerPanel({
  cartItems,
  setCartItems,
  showToast,
}: PosLedgerPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const { data: searchResults = [], isLoading } =
    usePosEquipmentSearch(inputValue);

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

    const existingItemIndex = cartItems.findIndex(
      (item) => item.equipment_id === equipment.equipment_id,
    );

    if (existingItemIndex > -1) {
      const existingItem = cartItems[existingItemIndex];
      if (existingItem.is_bulk_item) {
        if (existingItem.borrow_quantity < equipment.available_qty) {
          updateItem(
            existingItem.cart_id,
            "borrow_quantity",
            existingItem.borrow_quantity + 1,
          );
          setInputValue("");
          return;
        } else {
          showToast(
            `Cannot add more. Only ${equipment.available_qty} in stock.`,
            "warning",
          );
          return;
        }
      } else {
        showToast(
          "This specific serialized item is already in the cart.",
          "error",
        );
        setInputValue("");
        return;
      }
    }

    // SMART DETECTION: Is this item set up as a pure daily rental in the database?
    const isDaily =
      Number(equipment.minimum_rental_days) <= 1 &&
      Number(equipment.base_rental_price) ===
        Number(equipment.extra_daily_rate);

    const newItem: CartItem = {
      cart_id: crypto.randomUUID(),
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
      pricing_mode: isDaily ? "daily" : "tiered", // Assign UI mode
    };

    setCartItems((prev) => [...prev, newItem]);
    setInputValue("");
  };

  const updateItem = (cartId: string, field: keyof CartItem, value: any) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.cart_id === cartId ? { ...item, [field]: value } : item,
      ),
    );
  };

  // Helper to update multiple fields at once (crucial for syncing Daily mode)
  const updateItemBatch = (cartId: string, updates: Partial<CartItem>) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.cart_id === cartId ? { ...item, ...updates } : item,
      ),
    );
  };

  const removeItem = (cartId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cart_id !== cartId));
  };

  const togglePricingMode = (item: CartItem) => {
    if (item.pricing_mode === "tiered") {
      // Switch to Daily: Force Extra Rate to equal Base Price, and Min Days to 1
      updateItemBatch(item.cart_id, {
        pricing_mode: "daily",
        locked_extra_daily_rate: item.locked_base_price,
        locked_minimum_days: 1,
      });
    } else {
      // Switch to Tiered: Just change the UI mode, leave numbers as they are
      updateItemBatch(item.cart_id, { pricing_mode: "tiered" });
    }
  };

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}
    >
      {/* SEARCH BAR */}
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 1,
          position: "sticky",
          top: 0,
          bgcolor: "#f8fafc",
          zIndex: 5,
        }}
      >
        <Autocomplete
          options={searchResults}
          getOptionLabel={(option: any) => option.equipment_name}
          filterOptions={(x) => x}
          value={null}
          onChange={(event, newValue) => handleAddEquipment(newValue)}
          onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search equipment to add (Name, SKU)..."
              variant="outlined"
              fullWidth
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <SearchIcon color="action" sx={{ ml: 1, mr: -0.5 }} />
                ),
                endAdornment: (
                  <>
                    {isLoading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps?.endAdornment}
                  </>
                ),
                sx: {
                  borderRadius: 2,
                  bgcolor: "white",
                  border: "2px solid #e2e8f0",
                },
              }}
            />
          )}
          renderOption={(props, option: any) => {
            const inStock = option.available_qty > 0;
            const isDaily =
              Number(option.minimum_rental_days) <= 1 &&
              Number(option.base_rental_price) ===
                Number(option.extra_daily_rate);

            return (
              <li
                {...props}
                key={option.equipment_id}
                className="flex items-center justify-between p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <HardwareIcon
                    sx={{ color: inStock ? "text.secondary" : "error.light" }}
                  />
                  <div>
                    <Typography
                      variant="body1"
                      fontWeight="600"
                      color={inStock ? "text.primary" : "text.disabled"}
                    >
                      {option.equipment_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isDaily
                        ? `Rs.${option.base_rental_price} / day`
                        : `Rs.${option.base_rental_price} for ${option.minimum_rental_days} days (+Rs.${option.extra_daily_rate}/day)`}
                    </Typography>
                  </div>
                </div>
                <Chip
                  size="small"
                  label={
                    inStock
                      ? `${option.available_qty} Available`
                      : "Out of Stock"
                  }
                  color={inStock ? "success" : "error"}
                  variant={inStock ? "outlined" : "filled"}
                />
              </li>
            );
          }}
        />
      </Box>

      {/* CART ITEMS */}
      <Box sx={{ px: 3, pb: 3, flexGrow: 1, overflowY: "auto" }}>
        {cartItems.length === 0 ? (
          <Box
            sx={{
              height: "100%",
              minHeight: 300,
              border: "2px dashed #cbd5e1",
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
            }}
          >
            <ShoppingCartCheckoutIcon
              sx={{ fontSize: 48, mb: 1, opacity: 0.5 }}
            />
            <Typography variant="body1" fontWeight="600">
              Cart is empty
            </Typography>
            <Typography variant="body2">
              Search and select equipment above to begin.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {cartItems.map((item) => {
              const { totalDays, lineCost, calculationText } =
                calculateLineMath(item);
              const isDailyMode = item.pricing_mode === "daily";

              return (
                <Paper
                  key={item.cart_id}
                  elevation={0}
                  sx={{
                    p: 0,
                    border: "1px solid #e2e8f0",
                    borderRadius: 3,
                    bgcolor: "white",
                    overflow: "hidden",
                  }}
                >
                  {/* ITEM HEADER */}
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      color="primary.dark"
                    >
                      {item.equipment_name}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeItem(item.cart_id)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
                    {/* ROW 1: LOGISTICS */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <TextField
                        type="number"
                        label="Qty"
                        size="small"
                        className="sm:col-span-2"
                        value={item.borrow_quantity}
                        onChange={(e) => {
                          let val = parseInt(e.target.value) || 1;
                          if (val > item.available_qty)
                            val = item.available_qty;
                          if (val < 1) val = 1;
                          updateItem(item.cart_id, "borrow_quantity", val);
                        }}
                        InputProps={{
                          inputProps: { min: 1, max: item.available_qty },
                        }}
                        disabled={!item.is_bulk_item}
                      />
                      <TextField
                        type="date"
                        label="Out Date"
                        size="small"
                        className="sm:col-span-5"
                        InputLabelProps={{ shrink: true }}
                        value={item.borrow_date}
                        onChange={(e) =>
                          updateItem(
                            item.cart_id,
                            "borrow_date",
                            e.target.value,
                          )
                        }
                      />
                      <TextField
                        type="date"
                        label="Due Date"
                        size="small"
                        className="sm:col-span-5"
                        InputLabelProps={{ shrink: true }}
                        value={item.expected_return_date}
                        onChange={(e) =>
                          updateItem(
                            item.cart_id,
                            "expected_return_date",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    {/* ROW 2: SMART FINANCIALS */}
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "#f8fafc",
                        borderRadius: 2,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight="bold"
                          color="text.secondary"
                          display="flex"
                          alignItems="center"
                          gap={0.5}
                        >
                          <RequestQuoteOutlinedIcon fontSize="small" />
                          {isDailyMode
                            ? "FLAT DAILY RATE"
                            : "TIERED RENTAL PRICING"}
                        </Typography>
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<SwapHorizIcon />}
                          onClick={() => togglePricingMode(item)}
                          sx={{
                            textTransform: "none",
                            fontSize: "0.75rem",
                            color: "primary.main",
                          }}
                        >
                          Switch to {isDailyMode ? "Tiered" : "Daily"}
                        </Button>
                      </Box>

                      {isDailyMode ? (
                        <TextField
                          type="number"
                          label="Rate Per Day"
                          size="small"
                          fullWidth
                          value={item.locked_base_price}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                Rs.
                              </InputAdornment>
                            ),
                          }}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            // SYNCS ALL VALUES INSTANTLY FOR BACKEND
                            updateItemBatch(item.cart_id, {
                              locked_base_price: val,
                              locked_extra_daily_rate: val,
                              locked_minimum_days: 1,
                            });
                          }}
                        />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <TextField
                            type="number"
                            label="Upfront Base Fee"
                            size="small"
                            value={item.locked_base_price}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  Rs.
                                </InputAdornment>
                              ),
                            }}
                            onChange={(e) =>
                              updateItem(
                                item.cart_id,
                                "locked_base_price",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                          <TextField
                            type="number"
                            label="Covered Days"
                            size="small"
                            value={item.locked_minimum_days}
                            onChange={(e) =>
                              updateItem(
                                item.cart_id,
                                "locked_minimum_days",
                                parseInt(e.target.value) || 1,
                              )
                            }
                          />
                          <TextField
                            type="number"
                            label="Extra / Day"
                            size="small"
                            value={item.locked_extra_daily_rate}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  Rs.
                                </InputAdornment>
                              ),
                            }}
                            onChange={(e) =>
                              updateItem(
                                item.cart_id,
                                "locked_extra_daily_rate",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                      )}
                    </Box>
                  </Box>

                  {/* ITEM FOOTER (MATH TOTAL) */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      bgcolor: "#eff6ff",
                      p: 2,
                      borderTop: "1px solid #bfdbfe",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="primary.main"
                      fontWeight="bold"
                    >
                      {calculationText}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight="900"
                      color="primary.dark"
                    >
                      Rs. {lineCost.toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
