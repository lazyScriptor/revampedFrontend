import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
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
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PersonIcon from "@mui/icons-material/Person";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SearchIcon from "@mui/icons-material/Search";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

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
import { InvoiceReceipt } from "@/features/invoices/components/InvoiceReceipt";
import { ReceiptPrintDialog } from "@/features/invoices/components/ReceiptPrintDialog";
import { api } from "@/lib/api";
import { useInvoiceDetails, handlePrintInvoice } from "@/features/invoices/hooks/useInvoiceHooks";

export default function InvoicesRoute() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const refreshInvoiceData = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["invoice-search"] });
    queryClient.invalidateQueries({ queryKey: ["customer-invoices"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    queryClient.invalidateQueries({ queryKey: ["equipment"] });
    queryClient.invalidateQueries({ queryKey: ["pos-equipment-catalog"] });
  };

  const switchPosMode = (next: "dispatch" | "manage") => {
    if (next === "manage") refreshInvoiceData();
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

  // ── Thermal Bill Print States ──────────────────────────────────────────────────
  const [lastDispatchedInvoice, setLastDispatchedInvoice] = useState<any | null>(null);
  const [isPostDispatchOpen, setIsPostDispatchOpen] = useState(false);
  const [isEstimatePrintOpen, setIsEstimatePrintOpen] = useState(false);
  const [isDispatchPrintOpen, setIsDispatchPrintOpen] = useState(false);

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

  const executeDispatch = async (shouldAutoPrint = false) => {
    setIsSubmitting(true);
    try {
      const response = await api.post("/invoices", {
        customer_id: selectedCustomer.customer_id,
        borrowed_on_behalf_of_customer_id: onBehalfOfCustomer?.customer_id ?? null,
        items: cartItems,
        fees: fees,
      });

      const backendInv = response.data?.data?.invoice || response.data?.invoice || {};
      
      // Hydrate with full details for printing
      const hydratedInvoice = {
        ...backendInv,
        invoice_id: backendInv.invoice_id || Math.floor(1000 + Math.random() * 9000),
        issued_date: backendInv.issued_date || backendInv.createdAt || new Date().toISOString(),
        total_amount: grandTotal,
        sub_total: subTotal,
        transport_fee: fees.transport,
        discount_amount: fees.discount,
        advance_paid: fees.advance,
        id_card_status: 1,
        status: "Active",
        Customer: selectedCustomer,
        OnBehalfOfCustomer: onBehalfOfCustomer,
        InvoiceLines: cartItems.map((item, idx) => {
          const math = calculateLineMath(item);
          return {
            line_id: idx + 1,
            equipment_id: item.equipment_id,
            Equipment: {
              equipment_name: item.equipment_name,
              is_bulk_item: item.is_bulk_item,
            },
            borrow_quantity: item.borrow_quantity,
            borrow_date: item.borrow_date,
            expected_return_date: item.expected_return_date,
            locked_base_price: item.locked_base_price,
            locked_minimum_days: item.locked_minimum_days,
            locked_extra_daily_rate: item.locked_extra_daily_rate,
            line_total_amount: math.lineCost,
            line_status: "Active",
          };
        }),
        Payments:
          fees.advance > 0
            ? [
                {
                  payment_amount: fees.advance,
                  method: (fees as any).advance_payment_method || "Cash",
                  payment_date: new Date().toISOString(),
                },
              ]
            : [],
      };

      refreshInvoiceData();
      setLastDispatchedInvoice(hydratedInvoice);
      showToast(t("pages.Invoices.invoiceCreatedSuccessfully"), "success");
      setIsConfirmDispatchOpen(false);

      if (shouldAutoPrint) {
        setTimeout(() => {
          const cust = hydratedInvoice.Customer || selectedCustomer;
          const custName = cust?.company_name || `${cust?.first_name || ""} ${cust?.last_name || ""}`.trim() || "Walk-in Customer";
          const paid = hydratedInvoice.Payments?.reduce((s: number, p: any) => s + Number(p.payment_amount || 0), 0) || 0;
          handlePrintInvoice("pos-dispatch-silent-receipt", {
            invoiceId: hydratedInvoice.invoice_id,
            docNumber: `INV-${hydratedInvoice.invoice_id}`,
            docType: "DISPATCH",
            customerName: custName,
            customerPhone: cust?.phone_number,
            totalItems: cartItems.length,
            totalMachines: cartItems.reduce((acc, it) => acc + (it.borrow_quantity || 1), 0),
            subtotal: Number(hydratedInvoice.sub_total || 0),
            transportFee: Number(hydratedInvoice.transport_fee || 0),
            discountAmount: Number(hydratedInvoice.discount_amount || 0),
            grandTotal: Number(hydratedInvoice.total_amount || 0),
            totalPaid: paid,
            balanceDue: Math.max(0, Number(hydratedInvoice.total_amount || 0) - paid),
            billSnapshot: hydratedInvoice,
          });
        }, 350);
      }

      // Open post-dispatch dialog with summary & quick print
      setIsPostDispatchOpen(true);

      // Reset cart and customer selection
      setSelectedCustomer(null);
      setOnBehalfOfCustomer(null);
      setCartItems([]);
      setFees({ transport: 0, discount: 0, advance: 0 });
    } catch (error: any) {
      showToast(error.response?.data?.message || t("pages.Invoices.failedToCreateInvoice"), "error");
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
        flex: { lg: "0 0 310px", xl: "0 0 350px" },
        width: { xs: "100%", lg: "auto" },
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${(theme.palette as any).border?.subtle || theme.palette.divider}`,
        borderRadius: 3,
        bgcolor: theme.palette.mode === "dark" ? "background.paper" : "#f8fafc",
        overflow: "hidden",
        minHeight: 0,
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          bgcolor: theme.palette.mode === "dark" ? "background.paper" : "#ffffff",
          borderBottom: `1px solid ${(theme.palette as any).border?.subtle || theme.palette.divider}`,
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{
              fontWeight: 800,
              letterSpacing: 1.5,
              color: "text.secondary",
              fontSize: "0.68rem",
              display: "block",
            }}
          >
            {posMode === "dispatch" ? t("invoices.selectCustomer").toUpperCase() : t("invoices.invoiceSearch").toUpperCase()}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary", mt: 0.25 }}>
            {posMode === "dispatch" ? t("invoices.selectCustomer") : t("invoices.findOrder")}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={posMode === "dispatch" ? t("dataArena.BulkManager.step1") : t("pages.Invoices.index")}
          sx={{
            height: 20,
            fontSize: "0.65rem",
            fontWeight: 800,
            bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
            color: "text.secondary",
          }}
        />
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
        border: `1px solid ${(theme.palette as any).border?.subtle || theme.palette.divider}`,
        borderRadius: 3,
        bgcolor: theme.palette.mode === "dark" ? "background.paper" : "#f8fafc",
        overflow: "hidden",
        minHeight: 0,
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: 2.5,
          py: 1.75,
          bgcolor: theme.palette.mode === "dark" ? "background.paper" : "#ffffff",
          borderBottom: `1px solid ${(theme.palette as any).border?.subtle || theme.palette.divider}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{
              fontWeight: 800,
              letterSpacing: 1.5,
              color: "text.secondary",
              fontSize: "0.68rem",
              display: "block",
            }}
          >
            {posMode === "dispatch" ? t("invoices.dispatch").toUpperCase() : t("orders.orderLedger").toUpperCase()}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              color: "text.primary",
              mt: 0.25,
              fontFamily: activeInvoice && posMode === "manage" ? "'JetBrains Mono', monospace" : undefined,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {posMode === "dispatch"
              ? t("invoices.lineItem", { count: cartItems.length })
              : activeInvoice
              ? `INV-${activeInvoice.invoice_id}`
              : t("invoices.selectAnInvoice")}
          </Typography>
        </Box>
        {posMode === "dispatch" && (
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={() => setIsClearCartOpen(true)}
            disabled={cartItems.length === 0}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              fontSize: "0.72rem",
              textTransform: "none",
              py: 0.5,
              px: 1.5,
            }}
          >
            {t("pages.Invoices.clearCart")}
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
          ? { lg: "0 0 310px", xl: "0 0 420px" }
          : "0 0 70px",
        width: { xs: "100%", lg: "auto" },
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${theme.palette.mode === "dark" ? "#1e293b" : "#1e293b"}`,
        borderRadius: 3,
        bgcolor: "#0f172a",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        height: "100%",
        minHeight: 0,
        maxHeight: "100%",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
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
          onPrintEstimate={() => setIsEstimatePrintOpen(true)}
          isSubmitting={isSubmitting}
        />
      ) : (
        <ManageFinancialPanel
          invoice={activeInvoice}
          showToast={showToast}
          isCollapsed={!isTerminalOpen}
          onToggleCollapse={() => setIsTerminalOpen(!isTerminalOpen)}
          onInvoiceDeleted={() => setSelectedManageInvoiceId(null)}
        />
      )}
    </Paper>
  );

  // ── Mobile tab labels ─────────────────────────────────────────────────────────
  const dispatchTabs = [
    { label: t("pages.Invoices.client"), icon: <PersonIcon sx={{ fontSize: 20 }} /> },
    {
      label: t("pages.Invoices.cart"),
      icon: (
        <Badge badgeContent={cartItems.length} color="primary" max={99}>
          <ShoppingCartIcon sx={{ fontSize: 20 }} />
        </Badge>
      ),
    },
    { label: t("pages.Invoices.checkout"), icon: <ReceiptLongIcon sx={{ fontSize: 20 }} /> },
  ];
  const manageTabs = [
    { label: t("common.search"), icon: <SearchIcon sx={{ fontSize: 20 }} /> },
    { label: t("dataArena.JobHistoryTable.details"), icon: <ListAltIcon sx={{ fontSize: 20 }} /> },
    { label: t("pages.Invoices.financial"), icon: <AccountBalanceIcon sx={{ fontSize: 20 }} /> },
  ];
  const tabs = posMode === "dispatch" ? dispatchTabs : manageTabs;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "auto", md: "calc(100vh - 88px)" },
        minHeight: { xs: "calc(100vh - 88px)", md: "auto" },
        overflow: { xs: "visible", md: "hidden" },
        gap: { xs: 1.5, lg: 2 },
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 900, color: "text.primary", lineHeight: 1.1, tracking: "-0.02em" }}
            >
              {posMode === "dispatch"
                ? t("invoices.newDispatch")
                : posMode === "manage"
                ? t("orders.title")
                : t("invoices.InvoicePrintLogsView.billPrintingAuditLogs")}
            </Typography>
            {posMode === "dispatch" && cartItems.length > 0 && (
              <Chip
                icon={<ShoppingCartIcon sx={{ fontSize: "14px !important" }} />}
                label={t("pages.Invoices.itemsRs", { cartItemsCount: cartItems.length, subTotal: subTotal.toLocaleString() })}
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  fontVariantNumeric: "tabular-nums",
                  bgcolor: (t) => t.palette.mode === "dark" ? "rgba(56, 189, 248, 0.15)" : "#eff6ff",
                  color: (t) => t.palette.mode === "dark" ? "#38bdf8" : "#1d4ed8",
                  border: (t) => `1px solid ${t.palette.mode === "dark" ? "rgba(56, 189, 248, 0.3)" : "#bfdbfe"}`,
                }}
              />
            )}
            {posMode === "manage" && activeInvoice && (
              <Chip
                icon={<ReceiptLongIcon sx={{ fontSize: "14px !important" }} />}
                label={`INV-${activeInvoice.invoice_id} · ${activeInvoice.status}`}
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "'JetBrains Mono', monospace",
                  bgcolor: (t) =>
                    activeInvoice.status === "Active"
                      ? (t.palette.mode === "dark" ? "rgba(245, 158, 11, 0.15)" : "#fffbeb")
                      : (t.palette.mode === "dark" ? "rgba(16, 185, 129, 0.15)" : "#f0fdf4"),
                  color: (t) =>
                    activeInvoice.status === "Active"
                      ? (t.palette.mode === "dark" ? "#fbbf24" : "#b45309")
                      : (t.palette.mode === "dark" ? "#34d399" : "#15803d"),
                  border: (t) =>
                    `1px solid ${
                      activeInvoice.status === "Active"
                        ? (t.palette.mode === "dark" ? "rgba(245, 158, 11, 0.3)" : "#fde68a")
                        : (t.palette.mode === "dark" ? "rgba(16, 185, 129, 0.3)" : "#bbf7d0")
                    }`,
                }}
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 0.25, display: "block" }}>
            {posMode === "dispatch"
              ? `${t("invoices.newDispatch")} — ${t("pages.Invoices.posSubtitle")}`
              : posMode === "manage"
              ? `${t("orders.subtitle")} — ${t("pages.Invoices.manageSubtitle")}`
              : t("pages.Reports.completeImmutableLogOfAll")}
          </Typography>
        </Box>

        {/* Mode toggle — custom styled segmented control */}
        <Box
          sx={{
            display: "flex",
            bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
            border: (t) => `1px solid ${(t.palette as any).border?.subtle || t.palette.divider}`,
            borderRadius: 2.5,
            p: 0.5,
            gap: 0.5,
          }}
        >
          <Box
            role="button"
            tabIndex={0}
            onClick={() => switchPosMode("dispatch")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") switchPosMode("dispatch"); }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: { xs: 1.5, sm: 2.5 },
              py: 0.9,
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              bgcolor: posMode === "dispatch" ? (theme.palette.mode === "dark" ? "#1e293b" : "#0f172a") : "transparent",
              color: posMode === "dispatch" ? "white" : "text.secondary",
              fontWeight: 800,
              fontSize: "0.8rem",
              userSelect: "none",
              boxShadow: posMode === "dispatch" ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
              "&:hover": {
                bgcolor: posMode === "dispatch" ? (theme.palette.mode === "dark" ? "#334155" : "#1e293b") : "rgba(0,0,0,0.04)",
              },
            }}
          >
            <RocketLaunchIcon sx={{ fontSize: 15 }} />
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              {t("invoices.newDispatch")}
            </Box>
          </Box>
          <Box
            role="button"
            tabIndex={0}
            onClick={() => switchPosMode("manage")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") switchPosMode("manage"); }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: { xs: 1.5, sm: 2.5 },
              py: 0.9,
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              bgcolor: posMode === "manage" ? "#2563eb" : "transparent",
              color: posMode === "manage" ? "white" : "text.secondary",
              fontWeight: 800,
              fontSize: "0.8rem",
              userSelect: "none",
              boxShadow: posMode === "manage" ? "0 2px 8px rgba(37,99,235,0.25)" : "none",
              "&:hover": {
                bgcolor: posMode === "manage" ? "#1d4ed8" : "rgba(0,0,0,0.04)",
              },
            }}
          >
            <ManageSearchIcon sx={{ fontSize: 15 }} />
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              {t("invoices.manageOrders")}
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
          pb: { xs: isMobile ? "70px" : 0, lg: 0 },
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
          <Box sx={{ height: "100%", minHeight: 0, overflow: "hidden" }}>
            {activeMobilePane === 0 && (
              <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
                {pane1}
              </Box>
            )}
            {activeMobilePane === 1 && (
              <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
                {pane2}
              </Box>
            )}
            {activeMobilePane === 2 && (
              <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
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
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 56,
            bgcolor: posMode === "dispatch" ? "#0f172a" : "#1e3a8a",
            borderTop: "1px solid",
            borderColor: posMode === "dispatch" ? "#1e293b" : "#1e40af",
            zIndex: 1000,
            boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.15)",
            pb: "env(safe-area-inset-bottom, 0px)",
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
            {t("pages.Invoices.confirmDispatch")}
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#f8fafc" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("pages.Invoices.reviewTheOrderBeforeCommitting")}
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
              {t("pages.Invoices.client")}
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
                  {t("customers.onBehalfOf")}
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
            {t("pages.Invoices.items", { cartItemsCount: cartItems.length })}
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
                      {t("pages.Invoices.qty")} {item.borrow_quantity}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Financial breakdown */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            {t("pages.Invoices.financialSummary")}
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
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>{t("common.subtotal")}</Typography>
              <Typography variant="body2" sx={{ color: "#cbd5e1", fontWeight: 700 }}>
                Rs. {subTotal.toLocaleString()}
              </Typography>
            </Box>
            {fees.transport > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>{t("invoices.transport")}</Typography>
                <Typography variant="body2" sx={{ color: "#cbd5e1", fontWeight: 700 }}>
                  + Rs. {fees.transport.toLocaleString()}
                </Typography>
              </Box>
            )}
            {fees.discount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>{t("common.discount")}</Typography>
                <Typography variant="body2" sx={{ color: "#f87171", fontWeight: 700 }}>
                  − Rs. {fees.discount.toLocaleString()}
                </Typography>
              </Box>
            )}
            {fees.advance > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>{t("pages.Invoices.advancePaid")}</Typography>
                <Typography variant="body2" sx={{ color: "#4ade80", fontWeight: 700 }}>
                  − Rs. {fees.advance.toLocaleString()}
                </Typography>
              </Box>
            )}
            <Divider sx={{ borderColor: "#334155" }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ color: "#94a3b8", fontWeight: 700 }}>{t("orders.balanceDue")}</Typography>
              <Typography variant="h6" sx={{ color: balanceDue > 0 ? "#f87171" : "#4ade80", fontWeight: 900 }}>
                Rs. {balanceDue.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: "white", gap: 1 }}>
          <Button onClick={() => setIsConfirmDispatchOpen(false)} color="inherit" disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => executeDispatch(true)}
            variant="outlined"
            disabled={isSubmitting}
            startIcon={<PrintIcon />}
            sx={{
              fontWeight: 800,
              color: "#2563eb",
              borderColor: "#bfdbfe",
              "&:hover": { bgcolor: "#eff6ff", borderColor: "#93c5fd" },
            }}
          >
            {t("pages.Invoices.confirmPrintBill")}
          </Button>
          <Button
            onClick={() => executeDispatch(false)}
            variant="contained"
            disableElevation
            disabled={isSubmitting}
            startIcon={<RocketLaunchIcon />}
            sx={{ bgcolor: "#16a34a", fontWeight: 800, px: 2.5, "&:hover": { bgcolor: "#15803d" } }}
          >
            {isSubmitting ? t("invoices.PosCheckoutPanel.processing") : t("pages.Invoices.confirmDispatch2")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Post-Dispatch Success & Print Dialog ─────────────────────────────────── */}
      <Dialog
        open={isPostDispatchOpen}
        onClose={() => setIsPostDispatchOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ textAlign: "center", pt: 3, pb: 1 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 1.5,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 36 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
            {t("pages.Invoices.dispatchedSuccessfully")}
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
            {t("pages.Invoices.invoiceIsNowActive", { invoice_id: lastDispatchedInvoice?.invoice_id })}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center", px: 3, py: 1.5 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              mb: 1,
              textAlign: "left",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#64748b" }}>{t("pages.Invoices.client2")}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {lastDispatchedInvoice?.Customer?.company_name ||
                  `${lastDispatchedInvoice?.Customer?.first_name || ""} ${lastDispatchedInvoice?.Customer?.last_name || ""}`}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#64748b" }}>{t("pages.Invoices.equipment")}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#0f172a" }}>
                {t("pages.Invoices.machinesCount", { count: lastDispatchedInvoice?.InvoiceLines?.reduce((sum: number, l: any) => sum + (l.borrow_quantity || 1), 0) || 0 })}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748b" }}>{t("pages.Invoices.netTotal")}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#16a34a" }}>
                Rs. {Number(lastDispatchedInvoice?.total_amount || 0).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0, flexDirection: "column", gap: 1 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<PrintIcon />}
            onClick={() => setIsDispatchPrintOpen(true)}
            sx={{
              bgcolor: "#16a34a",
              "&:hover": { bgcolor: "#15803d" },
              fontWeight: 800,
              py: 1.4,
              borderRadius: 2,
            }}
          >
            {t("pages.Invoices.printPosBillThermal")}
          </Button>
          <Button
            fullWidth
            variant="text"
            color="inherit"
            onClick={() => setIsPostDispatchOpen(false)}
            sx={{ fontWeight: 700, color: "#64748b" }}
          >
            {t("pages.Invoices.startNextOrder")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Silent / Immediate Print Mount for Newly Created Invoice ─────────────── */}
      {lastDispatchedInvoice && (
        <InvoiceReceipt
          id="pos-dispatch-silent-receipt"
          invoice={lastDispatchedInvoice}
        />
      )}

      {/* ── Dispatched Invoice Print & Customizer Dialog ─────────────────────────── */}
      {lastDispatchedInvoice && (
        <ReceiptPrintDialog
          open={isDispatchPrintOpen}
          onClose={() => setIsDispatchPrintOpen(false)}
          invoice={lastDispatchedInvoice}
          title={t("pages.Invoices.posBillInv", { invoice_id: lastDispatchedInvoice.invoice_id })}
        />
      )}

      {/* ── Mid-way Quotation / Estimate Print & Customizer Dialog ───────────────── */}
      <ReceiptPrintDialog
        open={isEstimatePrintOpen}
        onClose={() => setIsEstimatePrintOpen(false)}
        isDraft={true}
        draftData={{
          customer: selectedCustomer,
          onBehalfOfCustomer,
          items: cartItems,
          fees,
        }}
        title={t("pages.Invoices.quotationEstimateSlipPreview")}
      />

      {/* ── Clear Cart Dialog ─────────────────────────────────────────────────────── */}
      <Dialog
        open={isClearCartOpen}
        onClose={() => setIsClearCartOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>{t("pages.Invoices.clearCart2")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t("pages.Invoices.allItemsAndAdjustmentsWill")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsClearCartOpen(false)} color="inherit">
            {t("common.cancel")}
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
            {t("pages.Invoices.clearEverything")}
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
