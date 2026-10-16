import { useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Divider,
  InputAdornment,
  Button,
  Tooltip,
  IconButton,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DiscountIcon from "@mui/icons-material/Discount";
import PaymentsIcon from "@mui/icons-material/Payments";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { CartItem, calculateLineMath } from "./PosLedgerPanel";

interface PosCheckoutPanelProps {
  cartItems: CartItem[];
  selectedCustomer: any | null;
  fees: { transport: number; discount: number; advance: number; advance_payment_method?: string };
  setFees: React.Dispatch<React.SetStateAction<any>>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onConfirmDispatch: () => void;
  onPrintEstimate?: () => void;
  isSubmitting: boolean;
}

export function PosCheckoutPanel({
  cartItems,
  selectedCustomer,
  fees,
  setFees,
  isCollapsed,
  onToggleCollapse,
  onConfirmDispatch,
  onPrintEstimate,
  isSubmitting,
}: PosCheckoutPanelProps) {
  const subTotal = useMemo(
    () => cartItems.reduce((total, item) => total + calculateLineMath(item).lineCost, 0),
    [cartItems]
  );
  const grandTotal = Math.max(0, subTotal + fees.transport - fees.discount);
  const balanceDue = Math.max(0, grandTotal - fees.advance);

  const handleFeeChange = (field: string, value: string) => {
    const num = parseFloat(value);
    setFees((prev: any) => ({
      ...prev,
      [field]: isNaN(num) ? 0 : num,
      ...(field === "advance" ? { advance_payment_method: "Cash" } : {}),
    }));
  };

  const handleApplyWallet = () => {
    if (selectedCustomer?.deposit_balance) {
      const maxApplicable = Math.min(Number(selectedCustomer.deposit_balance), grandTotal);
      setFees((prev: any) => ({
        ...prev,
        advance: maxApplicable,
        advance_payment_method: "WalletDeposit",
      }));
    }
  };

  const canDispatch = !!selectedCustomer && cartItems.length > 0 && !isSubmitting;

  // ── Collapsed sidebar strip ──────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <Box
        onClick={onToggleCollapse}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          alignItems: "center",
          py: 3,
          cursor: "pointer",
          bgcolor: "#0f172a",
          color: "white",
          "&:hover": { bgcolor: "#1e293b" },
          transition: "background-color 0.2s",
        }}
      >
        <Tooltip title="Expand Checkout" placement="left">
          <IconButton color="inherit" size="small" sx={{ mb: 4 }}>
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
        <Typography
          sx={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontWeight: 800,
            letterSpacing: 2,
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
            color: balanceDue > 0 ? "#4ade80" : "#94a3b8",
          }}
        >
          TOTAL · Rs. {grandTotal.toLocaleString()}
        </Typography>
      </Box>
    );
  }

  // ── Full terminal ────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        maxHeight: "100%",
        bgcolor: "#0f172a",
        overflow: "hidden",
      }}
    >
      {/* Terminal header */}
      <Box
        sx={{
          flexShrink: 0,
          px: 3,
          py: 2,
          borderBottom: "1px solid #1e293b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "#4ade80",
              boxShadow: "0 0 6px #4ade80",
            }}
          />
          <Typography variant="overline" sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 2 }}>
            CHECKOUT
          </Typography>
        </Box>
        <IconButton onClick={onToggleCollapse} size="small" sx={{ color: "#475569" }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Scrollable body */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": { background: "#334155", borderRadius: "4px" },
        }}
      >
        {/* Fees */}
        <Box>
          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, letterSpacing: 1, mb: 1.5, display: "block" }}>
            ORDER ADJUSTMENTS
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField
              label="Transport / Delivery"
              type="number"
              size="small"
              fullWidth
              value={fees.transport || ""}
              onChange={(e) => handleFeeChange("transport", e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#1e293b",
                  color: "#f8fafc",
                  "& fieldset": { borderColor: "#334155" },
                  "&:hover fieldset": { borderColor: "#475569" },
                  "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                },
                "& .MuiInputBase-input": {
                  color: "#f8fafc !important",
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  WebkitTextFillColor: "#f8fafc !important",
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocalShippingIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                  inputProps: { min: 0 },
                },
                inputLabel: { sx: { color: "#94a3b8" } },
              }}
            />
            <TextField
              label="Discount"
              type="number"
              size="small"
              fullWidth
              value={fees.discount || ""}
              onChange={(e) => handleFeeChange("discount", e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#1e293b",
                  color: "#f8fafc",
                  "& fieldset": { borderColor: "#334155" },
                  "&:hover fieldset": { borderColor: "#475569" },
                  "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                },
                "& .MuiInputBase-input": {
                  color: "#f8fafc !important",
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                  WebkitTextFillColor: "#f8fafc !important",
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <DiscountIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                    </InputAdornment>
                  ),
                  inputProps: { min: 0 },
                },
                inputLabel: { sx: { color: "#94a3b8" } },
              }}
            />
          </Box>
        </Box>

        {/* Financial breakdown */}
        <Box sx={{ bgcolor: "#1e293b", borderRadius: 2, p: 2, border: "1px solid #334155", display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              Subtotal ({cartItems.length} items)
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#f8fafc",
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Rs. {subTotal.toLocaleString()}
            </Typography>
          </Box>
          {fees.transport > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>Transport</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#cbd5e1",
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                + Rs. {fees.transport.toLocaleString()}
              </Typography>
            </Box>
          )}
          {fees.discount > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>Discount</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#f87171",
                  fontWeight: 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                − Rs. {fees.discount.toLocaleString()}
              </Typography>
            </Box>
          )}
          <Divider sx={{ borderColor: "#334155", my: 0.5 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography variant="body2" sx={{ color: "#94a3b8", fontWeight: 800 }}>Grand Total</Typography>
            <Typography
              variant="h6"
              sx={{
                color: "white",
                fontWeight: 900,
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: -0.5,
              }}
            >
              Rs. {grandTotal.toLocaleString()}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "#1e293b" }} />

        {/* Advance */}
        <Box>
          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, letterSpacing: 1, mb: 1.5, display: "block" }}>
            ADVANCE PAYMENT
          </Typography>

          {selectedCustomer && Number(selectedCustomer.deposit_balance) > 0 && (
            <Box
              sx={{
                p: 1.5,
                bgcolor: "#0f2416",
                border: "1px solid #14532d",
                borderRadius: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 16, color: "#4ade80" }} />
                <Box>
                  <Typography variant="caption" sx={{ color: "#4ade80", fontWeight: 700, display: "block" }}>
                    Client Wallet
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#86efac",
                      fontWeight: 800,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    Rs. {Number(selectedCustomer.deposit_balance).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={handleApplyWallet}
                sx={{
                  color: "#4ade80",
                  borderColor: "#14532d",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  "&:hover": { bgcolor: "#14532d", borderColor: "#166534" },
                }}
              >
                Apply
              </Button>
            </Box>
          )}

          <TextField
            label="Collected Now"
            type="number"
            size="small"
            fullWidth
            value={fees.advance || ""}
            onChange={(e) => handleFeeChange("advance", e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "#1e293b",
                color: "#f8fafc",
                "& fieldset": { borderColor: "#334155" },
                "&:hover fieldset": { borderColor: "#475569" },
                "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
              },
              "& .MuiInputBase-input": {
                color: "#f8fafc !important",
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
                WebkitTextFillColor: "#f8fafc !important",
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PaymentsIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                  </InputAdornment>
                ),
                inputProps: { min: 0 },
              },
              inputLabel: { sx: { color: "#94a3b8" } },
            }}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mt: 1.5 }}>
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700 }}>Remaining balance</Typography>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 900,
                color: balanceDue > 0 ? "#f87171" : "#4ade80",
                fontFamily: "'JetBrains Mono', monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Rs. {balanceDue.toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Dispatch button footer */}
      <Box sx={{ flexShrink: 0, p: 3, borderTop: "1px solid #1e293b" }}>
        {!selectedCustomer && (
          <Typography variant="caption" sx={{ color: "#64748b", display: "block", textAlign: "center", mb: 1 }}>
            Select a client to enable dispatch
          </Typography>
        )}
        {selectedCustomer && cartItems.length === 0 && (
          <Typography variant="caption" sx={{ color: "#64748b", display: "block", textAlign: "center", mb: 1 }}>
            Add equipment to the order first
          </Typography>
        )}
        {cartItems.length > 0 && onPrintEstimate && (
          <Button
            variant="outlined"
            fullWidth
            size="medium"
            disabled={!selectedCustomer}
            onClick={onPrintEstimate}
            startIcon={<ReceiptLongIcon />}
            sx={{
              mb: 1.5,
              py: 1.2,
              borderRadius: 2.5,
              fontSize: "0.85rem",
              fontWeight: 700,
              color: selectedCustomer ? "#cbd5e1" : "#475569",
              borderColor: selectedCustomer ? "#334155" : "#1e293b",
              "&:hover": {
                borderColor: "#64748b",
                bgcolor: "rgba(255,255,255,0.04)",
                color: "white",
              },
            }}
          >
            Print Quotation / Estimate Slip
          </Button>
        )}
        <Button
          variant="contained"
          fullWidth
          size="large"
          disableElevation
          disabled={!canDispatch}
          onClick={onConfirmDispatch}
          startIcon={<RocketLaunchIcon />}
          sx={{
            py: 1.75,
            borderRadius: 2.5,
            fontSize: "0.95rem",
            fontWeight: 800,
            bgcolor: canDispatch ? "#16a34a" : "#1e293b",
            color: canDispatch ? "white" : "#475569",
            letterSpacing: 0.5,
            "&:hover": { bgcolor: "#15803d" },
            "&.Mui-disabled": { bgcolor: "#1e293b", color: "#475569" },
          }}
        >
          {isSubmitting ? "Processing…" : "Place Dispatch Order"}
        </Button>
      </Box>
    </Box>
  );
}
