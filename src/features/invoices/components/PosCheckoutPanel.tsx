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
import { CartItem, calculateLineMath } from "./PosLedgerPanel";

const customScrollbar = {
  "&::-webkit-scrollbar": { width: "6px" },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" },
  "&::-webkit-scrollbar-thumb:hover": { background: "#94a3b8" },
};

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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onConfirmDispatch: () => void;
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
  isSubmitting,
}: PosCheckoutPanelProps) {
  const subTotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + calculateLineMath(item).lineCost,
      0,
    );
  }, [cartItems]);

  const grandTotal = Math.max(0, subTotal + fees.transport - fees.discount);
  const balanceDue = Math.max(0, grandTotal - fees.advance);

  const handleFeeChange = (field: keyof typeof fees, value: string) => {
    const num = parseFloat(value);
    setFees((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  const handleApplyWallet = () => {
    if (selectedCustomer && selectedCustomer.deposit_balance) {
      const maxApplicable = Math.min(
        Number(selectedCustomer.deposit_balance),
        grandTotal,
      );
      setFees((prev) => ({ ...prev, advance: maxApplicable }));
    }
  };

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
          color: "white",
          "&:hover": { bgcolor: "#1e293b" },
        }}
      >
        <Tooltip title="Expand Terminal" placement="left">
          <IconButton color="inherit" sx={{ mb: 4 }}>
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
        <Typography
          sx={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontWeight: "bold",
            letterSpacing: 2,
            fontSize: "1.2rem",
            whiteSpace: "nowrap",
          }}
        >
          DISPATCH: Rs. {grandTotal.toLocaleString()}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "#f8fafc",
        overflow: "hidden",
      }}
    >
      {/* LOCKED HEADER */}
      <Box
        sx={{
          flexShrink: 0,
          p: 3,
          bgcolor: "white",
          borderBottom: "1px solid #e2e8f0",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Financials
        </Typography>
        <IconButton onClick={onToggleCollapse} size="small" color="primary">
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* SCROLLABLE BODY */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          p: 3,
          ...customScrollbar,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            flexShrink: 0,
          }}
        >
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

        <Divider sx={{ borderStyle: "dashed", flexShrink: 0 }} />

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            flexShrink: 0,
          }}
        >
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

        <Divider sx={{ borderStyle: "dashed", flexShrink: 0 }} />

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            flexShrink: 0,
          }}
        >
          <Typography variant="subtitle2" fontWeight="600">
            Advance Payment Today
          </Typography>
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
                  Rs.{" "}
                  {Number(selectedCustomer.deposit_balance).toLocaleString()}
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

      {/* LOCKED FOOTER ACTION (flexShrink ensures it stays at the bottom!) */}
      <Box
        sx={{
          flexShrink: 0,
          p: 3,
          bgcolor: "white",
          borderTop: "1px solid #e2e8f0",
          zIndex: 10,
        }}
      >
        <Button
          variant="contained"
          color="success"
          fullWidth
          size="large"
          disableElevation
          disabled={!selectedCustomer || cartItems.length === 0 || isSubmitting}
          onClick={onConfirmDispatch}
          sx={{
            py: 2,
            borderRadius: 2,
            fontSize: "1.1rem",
            fontWeight: "bold",
          }}
        >
          {isSubmitting ? "Processing..." : "Place Dispatch Order"}
        </Button>
      </Box>
    </Box>
  );
}
