import { useState, useEffect, useMemo } from "react";
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
  Divider,
  BottomNavigation,
  BottomNavigationAction,
  Badge,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate, useSearch } from "@tanstack/react-router";
import PersonIcon from "@mui/icons-material/Person";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SearchIcon from "@mui/icons-material/Search";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { mode?: "dispatch" | "manage" };

  const [posMode, setPosMode] = useState<"dispatch" | "manage">(
    search.mode === "manage" ? "manage" : "dispatch"
  );
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [activeMobilePane, setActiveMobilePane] = useState(0);

  // Sync URL changes (e.g. sidebar nav while already on /invoices) → local state
  useEffect(() => {
    if (search.mode === "manage" && posMode !== "manage") setPosMode("manage");
    if (search.mode === "dispatch" && posMode !== "dispatch") setPosMode("dispatch");
  }, [search.mode]);

  const switchPosMode = (next: "dispatch" | "manage") => {
    setPosMode(next);
    navigate({ to: "/invoices", search: { mode: next } as any, replace: true });
  };

  // ── Dispatch State ────────────────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [onBehalfOfCustomer, setOnBehalfOfCustomer] = useState<any | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [fees, setFees] = useState({ transport: 0, discount: 0, advance: 0 });

  // ── Manage State ──────────────────────────────────────────────────────────────
  const [selectedManageInvoiceId, setSelectedManageInvoiceId] = useState<number | null>(null);
  const { data: activeInvoice } = useInvoiceDetails(selectedManageInvoiceId);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // ── UX State ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "error" as "error" | "success" | "warning",
  });
  const [isClearCartOpen, setIsClearCartOpen] = useState(false);
  const [isConfirmDispatchOpen, setIsConfirmDispatchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Auto-navigation on mobile ─────────────────────────────────────────────────
  useEffect(() => {
    if (isMobile && posMode === "dispatch" && selectedCustomer) {
      setActiveMobilePane(1);
    }
  }, [selectedCustomer, isMobile, posMode]);

  useEffect(() => {
    if (isMobile && posMode === "manage" && selectedManageInvoiceId) {
      setActiveMobilePane(1);
    }
  }, [selectedManageInvoiceId, isMobile, posMode]);

  useEffect(() => {
    setActiveMobilePane(0);
  }, [posMode]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const showToast = (message: string, severity: "error" | "success" | "warning" = "error") => {
    setToast({ open: true, message, severity });
  };

  const executeDispatch = async () => {
    setIsSubmitting(true);
    try {
      await api.post("/invoices", {
        customer_id: selectedCustomer.customer_id,
        borrowed_on_behalf_of_customer_id: onBehalfOfCustomer?.customer_id ?? null,
        items: cartItems,
        fees: fees,
      });
      showToast("Invoice created successfully!", "success");
      setSelectedCustomer(null);
      setOnBehalfOfCustomer(null);
      setCartItems([]);
      setFees({ transport: 0, discount: 0, advance: 0 });
      setIsConfirmDispatchOpen(false);
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to create invoice.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const subTotal = useMemo(
    () => cartItems.reduce((total, item) => total + calculateLineMath(item).lineCost, 0),
    [cartItems]
  );
  const grandTotal = Math.max(0, subTotal + fees.transport - fees.discount);
  const balanceDue = Math.max(0, grandTotal - fees.advance);

  // ── Pane definitions ──────────────────────────────────────────────────────────
  const pane1 = (
    <Paper
      elevation={0}
      sx={{
        flex: { lg: "0 0 300px", xl: "0 0 340px" },
        width: { xs: "100%", lg: "auto" },
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e2e8f0",
        borderRadius: 3,
        bgcolor: "#f8fafc",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <Box sx={{ px: 2.5, py: 2, bgcolor: "white", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b", fontSize: "0.68rem" }}>
          {posMode === "dispatch" ? "CLIENT LOOKUP" : "INVOICE SEARCH"}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", mt: 0.25 }}>
          {posMode === "dispatch" ? "Select a customer" : "Find an order"}
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: "auto", minHeight: 0, p: 2 }}>
        {posMode === "dispatch" ? (
          <PosCustomerPanel
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onBehalfOfCustomer={onBehalfOfCustomer}
            onChangeOnBehalfOfCustomer={setOnBehalfOfCustomer}
          />
        ) : (
          <ManageSearchPanel
            onSelectInvoice={setSelectedManageInvoiceId}
            selectedInvoiceId={selectedManageInvoiceId}
          />
        )}
      </Box>
    </Paper>
  );

  const pane2 = (
    <Paper
      elevation={0}
      sx={{
        flexGrow: 1,
        width: { xs: "100%", lg: "auto" },
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e2e8f0",
        borderRadius: 3,
        bgcolor: "#f8fafc",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: 2.5,
          py: 2,
          bgcolor: "white",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5, color: "#64748b", fontSize: "0.68rem" }}>
            {posMode === "dispatch" ? "DISPATCH CART" : "ORDER LEDGER"}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", mt: 0.25 }}>
            {posMode === "dispatch"
              ? `${cartItems.length} item${cartItems.length !== 1 ? "s" : ""} in cart`
              : activeInvoice
              ? `INV-${activeInvoice.invoice_id}`
              : "No invoice selected"}
          </Typography>
        </Box>
        {posMode === "dispatch" && (
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={() => setIsClearCartOpen(true)}
            disabled={cartItems.length === 0}
            sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.72rem" }}
          >
            Clear Cart
          </Button>
        )}
      </Box>
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
  );

  const pane3 = (
    <Paper
      elevation={0}
      sx={{
        flex: isTerminalOpen
          ? { lg: "0 0 300px", xl: "0 0 420px" }
          : "0 0 70px",
        width: { xs: "100%", lg: "auto" },
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e2e8f0",
        borderRadius: 3,
        bgcolor: "#0f172a",
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
  );

  // ── Mobile tab labels ─────────────────────────────────────────────────────────
  const dispatchTabs = [
    { label: "Client", icon: <PersonIcon sx={{ fontSize: 20 }} /> },
    {
      label: "Cart",
      icon: (
        <Badge badgeContent={cartItems.length} color="primary" max={99}>
          <ShoppingCartIcon sx={{ fontSize: 20 }} />
        </Badge>
      ),
    },
    { label: "Checkout", icon: <ReceiptLongIcon sx={{ fontSize: 20 }} /> },
  ];
  const manageTabs = [
    { label: "Search", icon: <SearchIcon sx={{ fontSize: 20 }} /> },
    { label: "Details", icon: <ListAltIcon sx={{ fontSize: 20 }} /> },
    { label: "Financial", icon: <AccountBalanceIcon sx={{ fontSize: 20 }} /> },
  ];
  const tabs = posMode === "dispatch" ? dispatchTabs : manageTabs;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "auto", md: "calc(100vh - 100px)" },
        minHeight: { xs: "calc(100vh - 100px)", md: "auto" },
        overflow: { xs: "visible", md: "hidden" },
        gap: { xs: 1.5, lg: 2.5 },
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}
          >
            {posMode === "dispatch" ? "New Dispatch" : "Order Management"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {posMode === "dispatch"
              ? "Draft and commit new rental dispatch orders"
              : "Manage returns, payments, and vaults for active orders"}
          </Typography>
        </Box>

        {/* Mode toggle — custom styled, not MUI ToggleButtonGroup */}
        <Box
          sx={{
            display: "flex",
            bgcolor: "#f1f5f9",
            borderRadius: 2.5,
            p: 0.5,
            gap: 0.5,
          }}
        >
          <Box
            onClick={() => switchPosMode("dispatch")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: { xs: 1.5, sm: 2.5 },
              py: 1,
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.2s",
              bgcolor: posMode === "dispatch" ? "#0f172a" : "transparent",
              color: posMode === "dispatch" ? "white" : "#64748b",
              fontWeight: 800,
              fontSize: "0.8rem",
              userSelect: "none",
              "&:hover": {
                bgcolor: posMode === "dispatch" ? "#1e293b" : "#e2e8f0",
              },
            }}
          >
            <RocketLaunchIcon sx={{ fontSize: 15 }} />
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              New Dispatch
            </Box>
          </Box>
          <Box
            onClick={() => switchPosMode("manage")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: { xs: 1.5, sm: 2.5 },
              py: 1,
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.2s",
              bgcolor: posMode === "manage" ? "#2563eb" : "transparent",
              color: posMode === "manage" ? "white" : "#64748b",
              fontWeight: 800,
              fontSize: "0.8rem",
              userSelect: "none",
              "&:hover": {
                bgcolor: posMode === "manage" ? "#1d4ed8" : "#e2e8f0",
              },
            }}
          >
            <ManageSearchIcon sx={{ fontSize: 15 }} />
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              Manage Orders
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Pane area ──────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflow: "hidden",
          pb: { xs: isMobile ? "56px" : 0, lg: 0 },
        }}
      >
        {/* Desktop: all 3 panes side by side */}
        {!isMobile && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 2.5,
              height: "100%",
              overflow: "hidden",
            }}
          >
            {pane1}
            {pane2}
            {pane3}
          </Box>
        )}

        {/* Mobile: one pane at a time */}
        {isMobile && (
          <Box sx={{ height: "100%", overflow: "hidden" }}>
            {activeMobilePane === 0 && (
              <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {pane1}
              </Box>
            )}
            {activeMobilePane === 1 && (
              <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {pane2}
              </Box>
            )}
            {activeMobilePane === 2 && (
              <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {pane3}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ── Mobile Bottom Navigation ────────────────────────────────────────────── */}
      {isMobile && (
        <BottomNavigation
          value={activeMobilePane}
          onChange={(_, newValue) => setActiveMobilePane(newValue)}
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: posMode === "dispatch" ? "#0f172a" : "#1e3a8a",
            borderTop: "1px solid",
            borderColor: posMode === "dispatch" ? "#1e293b" : "#1e40af",
            zIndex: 10,
            "& .MuiBottomNavigationAction-root": {
              color: "#64748b",
              minWidth: 0,
              "&.Mui-selected": {
                color: posMode === "dispatch" ? "#4ade80" : "#93c5fd",
              },
            },
            "& .MuiBottomNavigationAction-label": {
              fontWeight: 700,
              fontSize: "0.65rem",
              "&.Mui-selected": { fontSize: "0.65rem" },
            },
          }}
        >
          {tabs.map((tab, idx) => (
            <BottomNavigationAction
              key={idx}
              label={tab.label}
              icon={tab.icon}
            />
          ))}
        </BottomNavigation>
      )}

      {/* ── Dispatch Confirmation Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={isConfirmDispatchOpen}
        onClose={() => setIsConfirmDispatchOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle
          sx={{ bgcolor: "#0f172a", color: "white", fontWeight: 800, py: 2.5 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <RocketLaunchIcon sx={{ fontSize: 20 }} />
            Confirm Dispatch
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f8fafc" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Review the order before committing to the inventory ledger.
          </Typography>

          {/* Client block */}
          <Box
            sx={{
              p: 2,
              bgcolor: "white",
              borderRadius: 2,
              border: "1px solid #e2e8f0",
              borderLeft: "4px solid #2563eb",
              mb: 2.5,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              Client
            </Typography>
            <Typography variant="h6" sx={{ color: "#2563eb", fontWeight: 800, lineHeight: 1.2 }}>
              {selectedCustomer?.customer_type === "Business"
                ? selectedCustomer?.company_name
                : `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedCustomer?.phone_number}
            </Typography>
            {onBehalfOfCustomer && (
              <Box
                sx={{
                  mt: 1.5,
                  px: 1.5,
                  py: 1,
                  bgcolor: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  borderRadius: 1.5,
                }}
              >
                <Typography variant="caption" sx={{ color: "#4338ca", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  On behalf of
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: "#1e1b4b", mt: 0.25 }}>
                  {onBehalfOfCustomer.company_name ||
                    `${onBehalfOfCustomer.first_name || ""} ${onBehalfOfCustomer.last_name || ""}`.trim()}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Items */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Items ({cartItems.length})
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              mb: 2.5,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {cartItems.map((item, index) => {
              const { totalDays, lineCost } = calculateLineMath(item);
              return (
                <Box
                  key={index}
                  sx={{
                    p: 1.5,
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                    bgcolor: "white",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {item.equipment_name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#2563eb" }}>
                      Rs. {lineCost.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">
                      {item.borrow_date} → {item.expected_return_date} ({totalDays}d)
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      Qty: {item.borrow_quantity}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Financial breakdown */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Financial Summary
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: "#0f172a",
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>Subtotal</Typography>
              <Typography variant="body2" sx={{ color: "#cbd5e1", fontWeight: 700 }}>
                Rs. {subTotal.toLocaleString()}
              </Typography>
            </Box>
            {fees.transport > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>Transport</Typography>
                <Typography variant="body2" sx={{ color: "#cbd5e1", fontWeight: 700 }}>
                  + Rs. {fees.transport.toLocaleString()}
                </Typography>
              </Box>
            )}
            {fees.discount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>Discount</Typography>
                <Typography variant="body2" sx={{ color: "#f87171", fontWeight: 700 }}>
                  − Rs. {fees.discount.toLocaleString()}
                </Typography>
              </Box>
            )}
            {fees.advance > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>Advance Paid</Typography>
                <Typography variant="body2" sx={{ color: "#4ade80", fontWeight: 700 }}>
                  − Rs. {fees.advance.toLocaleString()}
                </Typography>
              </Box>
            )}
            <Divider sx={{ borderColor: "#334155" }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ color: "#94a3b8", fontWeight: 700 }}>Balance Due</Typography>
              <Typography variant="h6" sx={{ color: balanceDue > 0 ? "#f87171" : "#4ade80", fontWeight: 900 }}>
                Rs. {balanceDue.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: "white" }}>
          <Button onClick={() => setIsConfirmDispatchOpen(false)} color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={executeDispatch}
            variant="contained"
            disableElevation
            disabled={isSubmitting}
            startIcon={<RocketLaunchIcon />}
            sx={{ bgcolor: "#16a34a", fontWeight: 800, px: 3, "&:hover": { bgcolor: "#15803d" } }}
          >
            {isSubmitting ? "Processing…" : "Confirm & Dispatch"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Clear Cart Dialog ─────────────────────────────────────────────────────── */}
      <Dialog
        open={isClearCartOpen}
        onClose={() => setIsClearCartOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Clear Cart?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            All items and adjustments will be removed. This cannot be undone.
          </Typography>
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
            sx={{ fontWeight: 700 }}
          >
            Clear Everything
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Return Dialog ─────────────────────────────────────────────────────────── */}
      {posMode === "manage" && (
        <ReturnSettlementDialog
          open={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          invoice={activeInvoice}
          showToast={showToast}
        />
      )}

      {/* ── Toast ────────────────────────────────────────────────────────────────── */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 700, boxShadow: 4, borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
