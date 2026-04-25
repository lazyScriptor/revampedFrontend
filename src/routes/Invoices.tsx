import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import { PosCustomerPanel } from "@/features/invoices/components/PosCustomerPanel";
import {
  PosLedgerPanel,
  CartItem,
} from "@/features/invoices/components/PosLedgerPanel";
import { PosCheckoutPanel } from "@/features/invoices/components/PosCheckoutPanel";

import { api } from "@/lib/api";

export default function InvoicesRoute() {
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [fees, setFees] = useState({ transport: 0, discount: 0, advance: 0 });

  // --- NEW: MUI UX State ---
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "error" as "error" | "success" | "warning",
  });
  const [isClearCartOpen, setIsClearCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (
    message: string,
    severity: "error" | "success" | "warning" = "error",
  ) => {
    setToast({ open: true, message, severity });
  };

  const executeClearCart = () => {
    setCartItems([]);
    setFees({ transport: 0, discount: 0, advance: 0 });
    setIsClearCartOpen(false);
    showToast("Cart cleared successfully.", "success");
  };

  // --- THE FINAL SUBMISSION LOGIC ---
  const handleConfirmDispatch = async () => {
    if (!selectedCustomer)
      return showToast("Please select a customer first.", "error");
    if (cartItems.length === 0) return showToast("The cart is empty.", "error");

    setIsSubmitting(true);
    try {
      const payload = {
        customer_id: selectedCustomer.customer_id,
        items: cartItems,
        fees: fees,
      };

      // Hit our new backend endpoint!
      const response = await api.post("/invoices", payload);

      showToast("Invoice created successfully!", "success");

      // Reset POS for the next customer
      setSelectedCustomer(null);
      setCartItems([]);
      setFees({ transport: 0, discount: 0, advance: 0 });
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to create invoice.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        gap: 3,
        height: { lg: "calc(100vh - 100px)" },
        overflow: "hidden",
      }}
    >
      {/* ... PANE 1 stays the same ... */}
      <Paper
        elevation={0}
        sx={{
          flex: { lg: "0 0 320px", xl: "0 0 360px" },
          display: "flex",
          flexDirection: "column",
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          overflowY: "auto",
          bgcolor: "#f8fafc",
        }}
      >
        <Box
          sx={{
            p: 3,
            bgcolor: "white",
            borderBottom: "1px solid #e2e8f0",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Lookup & Client
          </Typography>
        </Box>
        <Box sx={{ p: 3, flexGrow: 1 }}>
          <PosCustomerPanel
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
          />
        </Box>
      </Paper>

      {/* --- PANE 2 (Pass showToast as a prop) --- */}
      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 3,
            bgcolor: "white",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Dispatch Ledger
          </Typography>
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={() => setIsClearCartOpen(true)}
            disabled={cartItems.length === 0}
            sx={{ borderRadius: 2 }}
          >
            Clear Cart
          </Button>
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: "hidden", bgcolor: "#f8fafc" }}>
          <PosLedgerPanel
            cartItems={cartItems}
            setCartItems={setCartItems}
            showToast={showToast}
          />
        </Box>
      </Paper>

      {/* --- PANE 3 --- */}
      <Paper
        elevation={0}
        sx={{
          flex: { lg: "0 0 320px", xl: "0 0 380px" },
          display: "flex",
          flexDirection: "column",
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          bgcolor: "#f8fafc",
        }}
      >
        <Box sx={{ p: 3, bgcolor: "white", borderBottom: "1px solid #e2e8f0" }}>
          <Typography variant="h6" fontWeight="bold">
            Checkout
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: "hidden" }}>
          <PosCheckoutPanel
            cartItems={cartItems}
            selectedCustomer={selectedCustomer}
            fees={fees}
            setFees={setFees}
          />
        </Box>
        <Box sx={{ p: 3, bgcolor: "white", borderTop: "1px solid #e2e8f0" }}>
          <Button
            variant="contained"
            color="success"
            fullWidth
            size="large"
            disableElevation
            disabled={
              !selectedCustomer || cartItems.length === 0 || isSubmitting
            }
            onClick={handleConfirmDispatch}
            sx={{
              py: 2,
              borderRadius: 2,
              fontSize: "1.1rem",
              fontWeight: "bold",
            }}
          >
            {isSubmitting ? "Processing..." : "Confirm Dispatch"}
          </Button>
        </Box>
      </Paper>

      {/* --- GLOBAL APP OVERLAYS --- */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 500, boxShadow: 3 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      <Dialog open={isClearCartOpen} onClose={() => setIsClearCartOpen(false)}>
        <DialogTitle fontWeight="bold">Clear Cart?</DialogTitle>
        <DialogContent>
          Are you sure you want to remove all items and reset fees?
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsClearCartOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={executeClearCart}
            color="error"
            variant="contained"
            disableElevation
          >
            Clear Everything
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
