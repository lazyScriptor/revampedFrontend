import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  MenuItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LockIcon from "@mui/icons-material/Lock";
import StarIcon from "@mui/icons-material/Star";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import BadgeIcon from "@mui/icons-material/Badge";
import PhoneIcon from "@mui/icons-material/Phone";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

import { usePosCustomerSearch } from "../hooks/usePosSearch";
import { useCustomerDetails, useCustomerInvoices } from "@/features/customers/hooks/useCustomerHooks";
import { ReadOnlyInvoiceModal } from "./ReadOnlyInvoiceModal";
import { useTranslation } from "react-i18next";

interface PosCustomerPanelProps {
  selectedCustomer: any | null;
  onSelectCustomer: (customer: any | null) => void;
  onBehalfOfCustomer?: any | null;
  onChangeOnBehalfOfCustomer?: (c: any | null) => void;
}

export function PosCustomerPanel({
  selectedCustomer,
  onSelectCustomer,
  onBehalfOfCustomer,
  onChangeOnBehalfOfCustomer,
}: PosCustomerPanelProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [selectedPreviewInvoice, setSelectedPreviewInvoice] = useState<any | null>(null);
  const { data: searchResults = [], isLoading } = usePosCustomerSearch(inputValue);

  // Fetch nested parent + workers for the selected customer so we know whether
  // to surface the "rent on behalf of" picker. Skipped until something is
  // actually selected.
  const { data: selectedCustomerDetails } = useCustomerDetails(
    selectedCustomer?.customer_id ?? null,
  );

  // Fetch client invoices & live stats (Total, Active, Completed) with caching
  const { data: customerInvoicesData, isLoading: loadingInvoices } = useCustomerInvoices(
    selectedCustomer?.customer_id ?? null,
  );
  const invoiceStats = customerInvoicesData?.stats || { total: 0, active: 0, completed: 0 };
  const pastInvoices = customerInvoicesData?.invoices || [];

  const relDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (d === 0) return t("time.today");
    if (d === 1) return t("time.yesterday");
    if (d < 7) return t("time.daysAgo", { count: d });
    return new Date(dateStr).toLocaleDateString();
  };

  const relationshipOptions = useMemo(() => {
    const list: Array<{ id: number; label: string; subtitle: string; data: any; relation: "parent" | "worker" }> = [];
    const detail = selectedCustomerDetails || selectedCustomer;
    if (!detail) return list;
    if (detail.ParentCompany && detail.ParentCompany.customer_id) {
      const p = detail.ParentCompany;
      const name = p.company_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
      list.push({
        id: p.customer_id,
        label: name,
        subtitle: t("invoices.PosCustomerPanel.linkedParent"),
        data: p,
        relation: "parent",
      });
    }
    if (Array.isArray(detail.Workers)) {
      detail.Workers.forEach((w: any) => {
        if (w?.status === "Blacklisted") return;
        list.push({
          id: w.customer_id,
          label: `${w.first_name} ${w.last_name}`,
          subtitle: t("invoices.PosCustomerPanel.linkedChildWorker"),
          data: w,
          relation: "worker",
        });
      });
    }
    return list;
  }, [selectedCustomerDetails, selectedCustomer, t]);

  // Reset the on-behalf selection whenever the actor customer changes —
  // a beneficiary from a previous customer never applies to a new one.
  useEffect(() => {
    if (onBehalfOfCustomer && onChangeOnBehalfOfCustomer) {
      onChangeOnBehalfOfCustomer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.customer_id]);

  const isBlacklisted = selectedCustomer?.status === "Blacklisted";
  const hasWallet = Number(selectedCustomer?.deposit_balance) > 0;
  const idInVault = selectedCustomer?.is_id_retained_currently;

  const displayName = (c: any) =>
    c?.customer_type === "Business"
      ? c?.company_name
      : `${c?.first_name} ${c?.last_name}`;

  const theme = useTheme();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 2 }}>
      {/* Search */}
      <Box sx={{ position: "relative" }}>
        <Autocomplete
          options={searchResults}
          getOptionLabel={(option: any) => displayName(option) || ""}
          filterOptions={(x) => x}
          autoComplete
          includeInputInList
          filterSelectedOptions
          value={selectedCustomer}
          noOptionsText={inputValue.length < 2 ? t("invoices.PosCustomerPanel.typeToSearch") : t("invoices.PosCustomerPanel.noClientsFound")}
          onChange={(_, newValue) => onSelectCustomer(newValue)}
          onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
          renderInput={(params) => (
            <TextField
              {...(params as any)}
              placeholder={t("invoices.PosCustomerPanel.scanNicPhoneOrName")}
              size="small"
              fullWidth
              slotProps={{
                ...((params as any).slotProps),
                input: {
                  ...((params as any).slotProps?.input || {}),
                  startAdornment: (
                    <SearchIcon sx={{ color: "text.secondary", ml: 0.5, mr: 0.5, fontSize: 18 }} />
                  ),
                  endAdornment: (
                    <>
                      {isLoading && <CircularProgress size={16} />}
                      {((params as any).slotProps?.input as any)?.endAdornment}
                    </>
                  ),
                  sx: {
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
                    "& .MuiInputBase-input": {
                      color: theme.palette.mode === "dark" ? "#f8fafc" : "#0f172a",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                    },
                    "& fieldset": { borderColor: theme.palette.mode === "dark" ? "#334155" : "#e2e8f0" },
                    "&:hover fieldset": { borderColor: theme.palette.mode === "dark" ? "#475569" : "#cbd5e1" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  },
                },
              }}
            />
          )}
          renderOption={(props, option: any) => {
            const { key, ...rest } = props as any;
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
                  "&:hover": { bgcolor: "#f8fafc" },
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    bgcolor:
                      option.status === "Blacklisted"
                        ? "error.main"
                        : option.customer_type === "Business"
                        ? "primary.main"
                        : "#475569",
                  }}
                >
                  {option.first_name?.charAt(0) || option.company_name?.charAt(0) || "C"}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }} noWrap>
                    {displayName(option)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}
                  >
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>
                      {option.nic_number || t("invoices.PosCustomerPanel.noNic")}
                    </span>
                    {option.phone_number && (
                      <>
                        <span>·</span>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{option.phone_number}</span>
                      </>
                    )}
                  </Typography>
                </Box>
                {option.status === "Blacklisted" && (
                  <Chip
                    size="small"
                    label={t("invoices.PosCustomerPanel.blocked")}
                    color="error"
                    sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20 }}
                  />
                )}
              </Box>
            );
          }}
        />
      </Box>

      {/* Client card */}
      {selectedCustomer ? (
        <Box
          sx={{
            flex: 1,
            bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
            border: "1px solid",
            borderColor: isBlacklisted
              ? "#fca5a5"
              : (theme.palette as any).border?.subtle || "#e2e8f0",
            borderRadius: 2.5,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Card header with accent bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 2,
              p: 2,
              borderLeft: "4px solid",
              borderLeftColor: isBlacklisted
                ? "error.main"
                : selectedCustomer.customer_type === "Business"
                ? "primary.main"
                : "#475569",
              bgcolor: isBlacklisted ? "rgba(239, 68, 68, 0.04)" : "transparent",
            }}
          >
            <Avatar
              sx={{
                width: 46,
                height: 46,
                fontWeight: 800,
                fontSize: "1.1rem",
                bgcolor: isBlacklisted
                  ? "error.main"
                  : selectedCustomer.customer_type === "Business"
                  ? "primary.main"
                  : "#475569",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              }}
            >
              {selectedCustomer.first_name?.charAt(0) || selectedCustomer.company_name?.charAt(0) || "C"}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.25,
                  color: "#0f172a",
                  letterSpacing: "-0.01em",
                }}
                noWrap
              >
                {displayName(selectedCustomer)}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5, flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  icon={selectedCustomer.customer_type === "Business" ? <BusinessIcon sx={{ fontSize: 13 }} /> : <PersonIcon sx={{ fontSize: 13 }} />}
                  label={selectedCustomer.customer_type}
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    borderColor: "#cbd5e1",
                    color: "#475569",
                  }}
                />
                {selectedCustomer.nic_number && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <BadgeIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontVariantNumeric: "tabular-nums",
                        color: "text.secondary",
                        fontWeight: 600,
                      }}
                    >
                      {selectedCustomer.nic_number}
                    </Typography>
                  </Box>
                )}
                {selectedCustomer.phone_number && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PhoneIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        color: "text.secondary",
                        fontWeight: 600,
                      }}
                    >
                      {selectedCustomer.phone_number}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            <Tooltip title={t("invoices.PosCustomerPanel.removeSelection")}>
              <IconButton
                size="small"
                onClick={() => onSelectCustomer(null)}
                sx={{
                  color: "text.secondary",
                  "&:hover": { color: "error.main", bgcolor: "rgba(239,68,68,0.08)" },
                }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider />

          {/* Stats row */}
          <Box
            sx={{
              p: 2,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                bgcolor: "#f8fafc",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontWeight: 700,
                  mb: 0.5,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontSize: "0.68rem",
                }}
              >
                <StarIcon sx={{ fontSize: 13, color: "#eab308" }} /> {t("invoices.PosCustomerPanel.trustScore")}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: "#0f172a",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.95rem",
                }}
              >
                {selectedCustomer.rating ? Number(selectedCustomer.rating).toFixed(1) : "5.0"} <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>/ 5.0</span>
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1.5,
                bgcolor: hasWallet ? "#f0fdf4" : "#f8fafc",
                borderRadius: 2,
                border: "1px solid",
                borderColor: hasWallet ? "#bbf7d0" : "#e2e8f0",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontWeight: 700,
                  mb: 0.5,
                  color: hasWallet ? "#15803d" : "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontSize: "0.68rem",
                }}
              >
                <AccountBalanceWalletIcon sx={{ fontSize: 13 }} /> {t("invoices.PosCheckoutPanel.clientWallet")}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: hasWallet ? "#16a34a" : "#64748b",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.95rem",
                }}
              >
                Rs. {Number(selectedCustomer.deposit_balance || 0).toLocaleString()}
              </Typography>
            </Box>
          </Box>

          {/* Customer Invoices KPI Strip */}
          <Box
            sx={{
              mx: 2,
              mb: 2,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
            }}
          >
            <Box
              sx={{
                p: 1.25,
                bgcolor: "#f8fafc",
                borderRadius: 2,
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#64748b",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  display: "block",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {t("nav.invoices")}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: "#0f172a",
                  fontVariantNumeric: "tabular-nums",
                  mt: 0.25,
                }}
              >
                {loadingInvoices ? "…" : invoiceStats.total}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1.25,
                bgcolor: invoiceStats.active > 0 ? "#fffbeb" : "#f8fafc",
                borderRadius: 2,
                border: "1px solid",
                borderColor: invoiceStats.active > 0 ? "#fde68a" : "#e2e8f0",
                textAlign: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: invoiceStats.active > 0 ? "#b45309" : "#64748b",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  display: "block",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {t("common.pending")}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: invoiceStats.active > 0 ? "#d97706" : "#64748b",
                  fontVariantNumeric: "tabular-nums",
                  mt: 0.25,
                }}
              >
                {loadingInvoices ? "…" : invoiceStats.active}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1.25,
                bgcolor: invoiceStats.completed > 0 ? "#f0fdf4" : "#f8fafc",
                borderRadius: 2,
                border: "1px solid",
                borderColor: invoiceStats.completed > 0 ? "#bbf7d0" : "#e2e8f0",
                textAlign: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: invoiceStats.completed > 0 ? "#15803d" : "#64748b",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  display: "block",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {t("invoices.completed")}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: invoiceStats.completed > 0 ? "#16a34a" : "#64748b",
                  fontVariantNumeric: "tabular-nums",
                  mt: 0.25,
                }}
              >
                {loadingInvoices ? "…" : invoiceStats.completed}
              </Typography>
            </Box>
          </Box>

          {/* Warnings */}
          {isBlacklisted && (
            <Box
              sx={{
                mx: 2,
                mb: 2,
                px: 2,
                py: 1.25,
                bgcolor: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <WarningAmberIcon sx={{ fontSize: 16, color: "error.main", flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>
                {t("invoices.PosCustomerPanel.blacklistedDoNotProcessThis")}
              </Typography>
            </Box>
          )}

          {idInVault && (
            <Box
              sx={{
                mx: 2,
                mb: 2,
                px: 2,
                py: 1.25,
                bgcolor: "#fffbeb",
                border: "1px solid #fde047",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <LockIcon sx={{ fontSize: 14, color: "#b45309", flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: "#b45309", fontWeight: 600 }}>
                {t("invoices.PosCustomerPanel.physicalIdCurrentlyInThe")}
              </Typography>
            </Box>
          )}

          {/* On-behalf-of selector — only when this customer has a parent and/or workers */}
          {relationshipOptions.length > 0 && onChangeOnBehalfOfCustomer && (
            <Box
              sx={{
                mx: 2,
                mb: 2,
                px: 1.5,
                py: 1.5,
                bgcolor: onBehalfOfCustomer ? "#eef2ff" : "#f8fafc",
                border: "1px solid",
                borderColor: onBehalfOfCustomer ? "#c7d2fe" : "#e2e8f0",
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <AccountTreeIcon sx={{ fontSize: 16, color: "#4f46e5" }} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.65rem" }}>
                  {t("invoices.PosCustomerPanel.rentalAttribution")}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                {t(
                  relationshipOptions.some((o) => o.relation === "parent") && relationshipOptions.some((o) => o.relation === "worker")
                    ? "invoices.PosCustomerPanel.linkedBoth"
                    : relationshipOptions.some((o) => o.relation === "parent")
                      ? "invoices.PosCustomerPanel.linkedParent"
                      : "invoices.PosCustomerPanel.linkedWorker",
                )}
              </Typography>
              <TextField
                select
                size="small"
                fullWidth
                value={onBehalfOfCustomer?.customer_id ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    onChangeOnBehalfOfCustomer(null);
                    return;
                  }
                  const chosen = relationshipOptions.find((o) => o.id === Number(v));
                  onChangeOnBehalfOfCustomer(chosen ? chosen.data : null);
                }}
                slotProps={{
                  input: { sx: { bgcolor: "white", borderRadius: 2 } },
                }}
              >
                <MenuItem value="">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t("invoices.PosCustomerPanel.rentForSelf")}
                    </Typography>
                  </Box>
                </MenuItem>
                {relationshipOptions.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                      <AccountTreeIcon sx={{ fontSize: 16, color: opt.relation === "parent" ? "#7c3aed" : "#0ea5e9" }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                          {t("invoices.PosCustomerPanel.onBehalfOf", { label: opt.label })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                          {opt.subtitle}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
              {onBehalfOfCustomer && (
                <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#4f46e5", fontWeight: 700 }}>
                  {t("invoices.PosCustomerPanel.invoiceWillBeAttributedTo")}
                </Typography>
              )}
            </Box>
          )}

          {/* Customer Invoices History List */}
          <Box
            sx={{
              mx: 2,
              mb: 2,
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "#ffffff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 1,
                bgcolor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <ReceiptLongIcon sx={{ fontSize: 15, color: "#475569" }} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.68rem" }}>
                  {t("invoices.PosCustomerPanel.invoiceHistory")}
                </Typography>
                <Chip
                  size="small"
                  label={pastInvoices.length}
                  sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                {t("invoices.PosCustomerPanel.clickForDetails")}
              </Typography>
            </Box>

            <Box sx={{ maxHeight: 220, overflowY: "auto", p: 1, display: "flex", flexDirection: "column", gap: 1 }}>
              {loadingInvoices && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={18} />
                </Box>
              )}

              {!loadingInvoices && pastInvoices.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ p: 2, textAlign: "center", display: "block" }}>
                  {t("invoices.PosCustomerPanel.noPreviousInvoicesForThis")}
                </Typography>
              )}

              {!loadingInvoices &&
                pastInvoices.map((inv: any) => {
                  const isActive = inv.status === "Active";
                  const invLines = inv.InvoiceLines || inv.lines || [];
                  const invPayments = inv.Payments || inv.payments || [];
                  const paid = invPayments.reduce((s: number, p: any) => s + Number(p.payment_amount || 0), 0);
                  const bal = Math.max(0, Number(inv.total_amount || 0) - paid);
                  const equipSummary = invLines
                    .map((l: any) => l.Equipment?.equipment_name || t("invoices.PosCustomerPanel.asset"))
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(", ");
                  const moreEquipCount = Math.max(0, invLines.length - 2);

                  return (
                    <Box
                      key={inv.invoice_id}
                      onClick={() => setSelectedPreviewInvoice(inv)}
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: isActive ? "#fed7aa" : "#e2e8f0",
                        bgcolor: isActive ? "#fffaf5" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease-in-out",
                        "&:hover": {
                          bgcolor: "#f1f5f9",
                          borderColor: "#94a3b8",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                            INV-{inv.invoice_id}
                          </Typography>
                          <Chip
                            size="small"
                            label={inv.status}
                            color={isActive ? "warning" : "success"}
                            sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700 }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 800, color: "#0f172a" }}>
                          Rs. {Number(inv.total_amount || 0).toLocaleString()}
                        </Typography>
                      </Box>

                      {equipSummary && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", fontSize: "0.7rem", mb: 0.5 }}>
                          {equipSummary}
                          {moreEquipCount > 0 ? t("invoices.PosCustomerPanel.more", { moreEquipCount }) : ""}
                        </Typography>
                      )}

                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem" }}>
                          {relDate(inv.issued_date)}
                        </Typography>
                        {bal > 0 ? (
                          <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 700, fontSize: "0.68rem", fontVariantNumeric: "tabular-nums" }}>
                            {t("invoices.PosCustomerPanel.dueRs", { bal: bal.toLocaleString() })}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 600, fontSize: "0.65rem" }}>
                            {t("orders.settled")}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
            </Box>
          </Box>
        </Box>
      ) : (
        /* Empty state */
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "2px dashed #cbd5e1",
            borderRadius: 2.5,
            p: 3,
            textAlign: "center",
            gap: 1.5,
            color: "#64748b",
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              bgcolor: "#f1f5f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              mb: 0.5,
            }}
          >
            <PersonIcon sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 800, color: "#1e293b" }}>
            {t("invoices.PosCustomerPanel.noClientSelected")}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 220, lineHeight: 1.4 }}>
            {t("invoices.PosCustomerPanel.scanNicPhoneOrSearch")}
          </Typography>
        </Box>
      )}

      {/* Read-only mobile-friendly invoice details preview modal */}
      <ReadOnlyInvoiceModal
        open={Boolean(selectedPreviewInvoice)}
        onClose={() => setSelectedPreviewInvoice(null)}
        invoice={selectedPreviewInvoice}
      />
    </Box>
  );
}
