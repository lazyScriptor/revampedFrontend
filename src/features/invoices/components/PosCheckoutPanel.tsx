import { useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Divider,
  InputAdornment,
  Button,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { CartItem, calculateLineMath } from "./PosLedgerPanel";

interface PosCheckoutPanelProps {
  cartItems: CartItem[];
  selectedCustomer: any | null;
  fees: { transport: number; discount: number; advance: number };
  setFees: React.Dispatch<
    React.SetStateAction<{
      transport: number;
      discount: number;
      advance: number;
    }>
  >;
}

export function PosCheckoutPanel({
  cartItems,
  selectedCustomer,
  fees,
  setFees,
}: PosCheckoutPanelProps) {
  // 1. Calculate the dynamic subtotal from the cart
  const subTotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const { lineCost } = calculateLineMath(item);
      return total + lineCost;
    }, 0);
  }, [cartItems]);

  // 2. Final Math
  const grandTotal = Math.max(0, subTotal + fees.transport - fees.discount);
  const balanceDue = Math.max(0, grandTotal - fees.advance);

  // 3. Helper to handle input changes safely
  const handleFeeChange = (field: keyof typeof fees, value: string) => {
    const num = parseFloat(value);
    setFees((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  // 4. Quick-apply customer wallet balance
  const handleApplyWallet = () => {
    if (selectedCustomer && selectedCustomer.deposit_balance) {
      // Don't apply more than the grand total
      const maxApplicable = Math.min(
        Number(selectedCustomer.deposit_balance),
        grandTotal,
      );
      setFees((prev) => ({ ...prev, advance: maxApplicable }));
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        p: 3,
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* --- Adjustments Section --- */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Transport / Delivery Fee"
          type="number"
          fullWidth
          value={fees.transport || ""}
          onChange={(e) => handleFeeChange("transport", e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">Rs.</InputAdornment>
            ),
            inputProps: { min: 0 },
          }}
        />
        <TextField
          label="Discount"
          type="number"
          fullWidth
          value={fees.discount || ""}
          onChange={(e) => handleFeeChange("discount", e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">Rs.</InputAdornment>
            ),
            inputProps: { min: 0 },
          }}
        />
      </Box>

      <Divider sx={{ borderStyle: "dashed" }} />

      {/* --- Total Summary Section --- */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography color="text.secondary">
            Subtotal ({cartItems.length} items)
          </Typography>
          <Typography fontWeight="500">
            Rs. {subTotal.toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography color="text.secondary">Transport</Typography>
          <Typography fontWeight="500">
            + Rs. {fees.transport.toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography color="text.secondary">Discount</Typography>
          <Typography fontWeight="500" color="error.main">
            - Rs. {fees.discount.toLocaleString()}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 1,
            p: 1.5,
            bgcolor: "#eff6ff",
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" fontWeight="bold" color="primary.dark">
            Grand Total
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="primary.dark">
            Rs. {grandTotal.toLocaleString()}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderStyle: "dashed" }} />

      {/* --- Payments & Deposits --- */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="subtitle2" fontWeight="600">
          Advance Payment Today
        </Typography>

        {/* Customer Wallet Helper */}
        {selectedCustomer && Number(selectedCustomer.deposit_balance) > 0 && (
          <Box
            sx={{
              p: 1.5,
              bgcolor: "#f0fdf4",
              borderRadius: 2,
              border: "1px solid #bbf7d0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography
                variant="caption"
                color="success.dark"
                display="flex"
                alignItems="center"
                gap={0.5}
              >
                <AccountBalanceWalletIcon fontSize="inherit" /> Client Wallet
                Balance
              </Typography>
              <Typography
                variant="body2"
                fontWeight="bold"
                color="success.dark"
              >
                Rs. {Number(selectedCustomer.deposit_balance).toLocaleString()}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              color="success"
              sx={{ bgcolor: "white" }}
              onClick={handleApplyWallet}
            >
              Apply
            </Button>
          </Box>
        )}

        <TextField
          label="Cash / Card Collected Now"
          type="number"
          fullWidth
          value={fees.advance || ""}
          onChange={(e) => handleFeeChange("advance", e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">Rs.</InputAdornment>
            ),
            inputProps: { min: 0 },
          }}
        />

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
          <Typography color="text.secondary" fontWeight="500">
            Remaining Balance Due
          </Typography>
          <Typography
            fontWeight="bold"
            color={balanceDue > 0 ? "error.main" : "text.secondary"}
          >
            Rs. {balanceDue.toLocaleString()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
