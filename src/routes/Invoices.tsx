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
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";

// Components
import { PosCustomerPanel } from "@/features/invoices/components/PosCustomerPanel";
import {
  PosLedgerPanel,
  CartItem,
} from "@/features/invoices/components/PosLedgerPanel";
import { PosCheckoutPanel } from "@/features/invoices/components/PosCheckoutPanel";
import {
  ManageSearchPanel,
  ManageLedgerPanel,
  ManageFinancialPanel,
} from "@/features/invoices/components/ManageInvoiceViews";
import { ReturnSettlementDialog } from "@/features/invoices/components/ReturnSettlementDialog";

// Hooks
import { api } from "@/lib/api";
import { useInvoiceDetails } from "@/features/invoices/hooks/useInvoiceHooks";

export default function InvoicesRoute() {
  // --- MASTER MODE STATE ---
  const [posMode, setPosMode] = useState<"dispatch" | "manage">("dispatch");

  // --- DISPATCH STATE ---
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [fees, setFees] = useState({ transport: 0, discount: 0, advance: 0 });

  // --- MANAGE STATE ---
  const [selectedManageInvoiceId, setSelectedManageInvoiceId] = useState<
    number | null
  >(null);
  const { data: activeInvoice } = useInvoiceDetails(selectedManageInvoiceId);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // --- UX STATE ---
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
      await api.post("/invoices", payload);
      showToast("Invoice created successfully!", "success");
      setSelectedCustomer(null);
      setCartItems([]);
      setFees({ transport: 0, discount: 0, advance: 0 });
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "Failed to create invoice.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        height: { lg: "calc(100vh - 100px)" },
        overflow: "hidden",
      }}
    >
      {/* --- NEW: THE HEADER & MODE TOGGLE --- */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Point of Sale
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {posMode === "dispatch"
              ? "Draft a new dispatch order."
              : "Manage returns, payments, and vaults for active orders."}
          </Typography>
        </Box>

        <ToggleButtonGroup
          color="primary"
          value={posMode}
          exclusive
          onChange={(e, newMode) => {
            if (newMode) setPosMode(newMode);
          }}
          sx={{ bgcolor: "white" }}
        >
          <ToggleButton value="dispatch" sx={{ px: 4, fontWeight: "bold" }}>
            New Dispatch
          </ToggleButton>
          <ToggleButton value="manage" sx={{ px: 4, fontWeight: "bold" }}>
            Manage Order
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* THE 3 PANES */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: 3,
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        {/* PANE 1: Lookup */}
        <Paper
          elevation={0}
          sx={{
            flex: { lg: "0 0 320px", xl: "0 0 360px" },
            display: "flex",
            flexDirection: "column",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#f8fafc",
          }}
        >
          <Box
            sx={{ p: 3, bgcolor: "white", borderBottom: "1px solid #e2e8f0" }}
          >
            <Typography variant="h6" fontWeight="bold">
              {posMode === "dispatch" ? "Lookup Client" : "Find Invoice"}
            </Typography>
          </Box>
          <Box sx={{ p: 3, flexGrow: 1, overflowY: "auto" }}>
            {posMode === "dispatch" ? (
              <PosCustomerPanel
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
              />
            ) : (
              <ManageSearchPanel onSelectInvoice={setSelectedManageInvoiceId} />
            )}
          </Box>
        </Paper>

        {/* PANE 2: Ledger */}
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: "#f8fafc",
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
              {posMode === "dispatch" ? "Dispatch Cart" : "Order Ledger"}
            </Typography>
            {posMode === "dispatch" && (
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
            )}
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: "hidden" }}>
            {posMode === "dispatch" ? (
              <PosLedgerPanel
                cartItems={cartItems}
                setCartItems={setCartItems}
                showToast={showToast}
              />
            ) : (
              <ManageLedgerPanel
                invoice={activeInvoice}
                onOpenReturn={() => setIsReturnModalOpen(true)}
              />
            )}
          </Box>
        </Paper>

        {/* PANE 3: Checkout / Terminal */}
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
          <Box
            sx={{ p: 3, bgcolor: "white", borderBottom: "1px solid #e2e8f0" }}
          >
            <Typography variant="h6" fontWeight="bold">
              {posMode === "dispatch" ? "Financials" : "Terminal"}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: "hidden" }}>
            {posMode === "dispatch" ? (
              <PosCheckoutPanel
                cartItems={cartItems}
                selectedCustomer={selectedCustomer}
                fees={fees}
                setFees={setFees}
              />
            ) : (
              <ManageFinancialPanel
                invoice={activeInvoice}
                showToast={showToast}
              />
            )}
          </Box>
          {posMode === "dispatch" && (
            <Box
              sx={{ p: 3, bgcolor: "white", borderTop: "1px solid #e2e8f0" }}
            >
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
          )}
        </Paper>
      </Box>

      {/* OVERLAYS */}
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
            onClick={() => {
              setCartItems([]);
              setFees({ transport: 0, discount: 0, advance: 0 });
              setIsClearCartOpen(false);
            }}
            color="error"
            variant="contained"
            disableElevation
          >
            Clear Everything
          </Button>
        </DialogActions>
      </Dialog>

      {/* THE MASTER RETURN DIALOG (Reused beautifully for Manage Mode!) */}
      {posMode === "manage" && (
        <ReturnSettlementDialog
          open={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          invoice={activeInvoice}
          showToast={showToast}
        />
      )}
    </Box>
  );
}
