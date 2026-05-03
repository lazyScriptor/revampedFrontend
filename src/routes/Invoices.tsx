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
  Divider,
} from "@mui/material";

import { PosCustomerPanel } from "@/features/invoices/components/PosCustomerPanel";
import {
  PosLedgerPanel,
  CartItem,
  calculateLineMath,
} from "@/features/invoices/components/PosLedgerPanel";
import { PosCheckoutPanel } from "@/features/invoices/components/PosCheckoutPanel";
import {
  ManageSearchPanel,
  ManageLedgerPanel,
  ManageFinancialPanel,
} from "@/features/invoices/components/ManageInvoiceViews";
import { ReturnSettlementDialog } from "@/features/invoices/components/ReturnSettlementDialog";
import { api } from "@/lib/api";
import { useInvoiceDetails } from "@/features/invoices/hooks/useInvoiceHooks";

export default function InvoicesRoute() {
  const [posMode, setPosMode] = useState<"dispatch" | "manage">("dispatch");
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);

  // Dispatch State
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [fees, setFees] = useState({ transport: 0, discount: 0, advance: 0 });

  // Manage State
  const [selectedManageInvoiceId, setSelectedManageInvoiceId] = useState<
    number | null
  >(null);
  const { data: activeInvoice } = useInvoiceDetails(selectedManageInvoiceId);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // UX State
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "error" as "error" | "success" | "warning",
  });
  const [isClearCartOpen, setIsClearCartOpen] = useState(false);
  const [isConfirmDispatchOpen, setIsConfirmDispatchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (
    message: string,
    severity: "error" | "success" | "warning" = "error",
  ) => {
    setToast({ open: true, message, severity });
  };

  const executeDispatch = async () => {
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
      setIsConfirmDispatchOpen(false);
    } catch (error: any) {
      showToast(
        error.response?.data?.message || "Failed to create invoice.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const subTotal = cartItems.reduce(
    (total, item) => total + calculateLineMath(item).lineCost,
    0,
  );
  const grandTotal = Math.max(0, subTotal + fees.transport - fees.discount);
  const balanceDue = Math.max(0, grandTotal - fees.advance);

  return (
    // STRICT HEIGHT LOCK PREVENTS CONTENT FROM BEING PUSHED OFF SCREEN
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        height: "calc(100vh - 100px)",
        overflow: "hidden",
      }}
    >
      {/* HEADER & MODE TOGGLE */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Point of Sale
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {posMode === "dispatch"
              ? "Draft a new dispatch order."
              : "Manage returns, payments, and vaults for active orders.umesha"}
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
          minHeight: 0,
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
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 3,
              bgcolor: "white",
              borderBottom: "1px solid #e2e8f0",
              flexShrink: 0,
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              {posMode === "dispatch" ? "Lookup Client" : "Find Invoice"}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}>
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
            overflow: "hidden",
          }}
        >
          {posMode === "dispatch" && (
            <Box
              sx={{
                flexShrink: 0,
                p: 3,
                bgcolor: "white",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                Dispatch Cart
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
          )}
          <Box sx={{ flexGrow: 1, overflowY: "hidden", minHeight: 0 }}>
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
            flex: isTerminalOpen
              ? { lg: "0 0 320px", xl: "0 0 450px" }
              : "0 0 70px",
            display: "flex",
            flexDirection: "column",
            border: "1px solid #e2e8f0",
            borderRadius: 3,
            bgcolor: isTerminalOpen ? "#f8fafc" : "#0f172a",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden",
            height: "100%",
          }}
        >
          {posMode === "dispatch" ? (
            <PosCheckoutPanel
              cartItems={cartItems}
              selectedCustomer={selectedCustomer}
              fees={fees}
              setFees={setFees}
              isCollapsed={!isTerminalOpen}
              onToggleCollapse={() => setIsTerminalOpen(!isTerminalOpen)}
              onConfirmDispatch={() => setIsConfirmDispatchOpen(true)}
              isSubmitting={isSubmitting}
            />
          ) : (
            <ManageFinancialPanel
              invoice={activeInvoice}
              showToast={showToast}
              isCollapsed={!isTerminalOpen}
              onToggleCollapse={() => setIsTerminalOpen(!isTerminalOpen)}
            />
          )}
        </Paper>
      </Box>

      {/* --- PRE-FLIGHT DISPATCH CONFIRMATION MODAL --- */}
      <Dialog
        open={isConfirmDispatchOpen}
        onClose={() => setIsConfirmDispatchOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight="bold">Confirm Dispatch Details</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Please review the order details before committing to the inventory
            ledger.
          </Typography>

          <Box
            sx={{
              p: 2,
              bgcolor: "#f8fafc",
              borderRadius: 2,
              border: "1px solid #e2e8f0",
              mb: 3,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight="bold"
              textTransform="uppercase"
            >
              Client
            </Typography>
            <Typography variant="h6" color="primary.main" fontWeight="bold">
              {selectedCustomer?.customer_type === "Business"
                ? selectedCustomer?.company_name
                : `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedCustomer?.phone_number}
            </Typography>
          </Box>

          <Typography variant="subtitle2" fontWeight="bold" mb={1}>
            Items ({cartItems.length})
          </Typography>

          {/* Detailed Item Breakdown */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              mb: 3,
              maxHeight: 220,
              overflowY: "auto",
              pr: 1,
            }}
          >
            {cartItems.map((item, index) => {
              const { totalDays, lineCost } = calculateLineMath(item);
              return (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    p: 1.5,
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {item.equipment_name}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="primary.main"
                    >
                      Rs. {lineCost.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {item.borrow_date} to {item.expected_return_date} (
                      {totalDays} Days)
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                      Qty: {item.borrow_quantity}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Typography variant="subtitle2" fontWeight="bold" mb={1}>
            Financial Breakdown
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              mb: 2,
              p: 2,
              bgcolor: "#f8fafc",
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography color="text.secondary">Base Subtotal</Typography>
              <Typography fontWeight="bold">
                Rs. {subTotal.toLocaleString()}
              </Typography>
            </Box>
            {fees.transport > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary">Transport Fee</Typography>
                <Typography fontWeight="bold">
                  + Rs. {fees.transport.toLocaleString()}
                </Typography>
              </Box>
            )}
            {fees.discount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary">Discount Applied</Typography>
                <Typography fontWeight="bold" color="error.main">
                  - Rs. {fees.discount.toLocaleString()}
                </Typography>
              </Box>
            )}
            {fees.advance > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="text.secondary">
                  Advance Paid Today
                </Typography>
                <Typography fontWeight="bold" color="success.main">
                  - Rs. {fees.advance.toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              Total Balance Due
            </Typography>
            <Typography variant="h5" fontWeight="900" color="success.main">
              Rs. {balanceDue.toLocaleString()}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setIsConfirmDispatchOpen(false)}
            color="inherit"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={executeDispatch}
            color="success"
            variant="contained"
            disableElevation
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Confirm & Dispatch"}
          </Button>
        </DialogActions>
      </Dialog>

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

      {posMode === "manage" && (
        <ReturnSettlementDialog
          open={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          invoice={activeInvoice}
          showToast={showToast}
        />
      )}

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
    </Box>
  );
}
