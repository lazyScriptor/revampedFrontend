import { useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import { useTranslation } from "react-i18next";
import { usePosCustomerSearch } from "@/features/invoices/hooks/usePosSearch";
import { WhatsAppButton } from "@/features/whatsapp/components/WhatsAppButton";
import { formatDisplayDate } from "@/lib/dates";
import type { SettlementCustomer, SettlementOverviewResponse } from "../types";

interface SettlementCustomerStepProps {
  selectedCustomerId: number | null;
  onSelectCustomer: (customerId: number | null) => void;
  overview?: SettlementOverviewResponse;
  isOverviewLoading: boolean;
  onProceed?: () => void;
  compact?: boolean;
}

const fmtLkr = (n: number) =>
  `Rs ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const bucketColor = (bucket: string) => {
  if (bucket === "green") return "#10b981";
  if (bucket === "amber") return "#f59e0b";
  return "#ef4444";
};

export function getCustomerDisplayName(c?: SettlementCustomer | any | null): string {
  if (!c) return "";
  if (c.name) return c.name;
  if (c.company_name) return c.company_name;
  return `${c.first_name || ""} ${c.last_name || ""}`.trim() || `#${c.customer_id}`;
}

export function SettlementCustomerStep({
  selectedCustomerId,
  onSelectCustomer,
  overview,
  isOverviewLoading,
  onProceed,
  compact = false,
}: SettlementCustomerStepProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [inputValue, setInputValue] = useState("");
  const { data: searchResults = [], isLoading: searchLoading } = usePosCustomerSearch(inputValue);

  const customer = overview?.customer;
  const summary = overview?.summary;
  const billsBar = overview?.bills_bar ?? [];
  const totalOwedBar = billsBar.reduce((s, b) => s + Math.max(0, Number(b.owed || 0)), 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* Customer search */}
      <Autocomplete
        size="small"
        options={searchResults}
        value={customer ?? null}
        inputValue={inputValue}
        onInputChange={(_, val) => setInputValue(val)}
        onChange={(_, val: any) => onSelectCustomer(val?.customer_id ?? null)}
        getOptionLabel={(opt: any) => getCustomerDisplayName(opt)}
        isOptionEqualToValue={(a: any, b: any) => a?.customer_id === b?.customer_id}
        filterOptions={(x) => x}
        loading={searchLoading}
        noOptionsText={t("settlement.customer.noMatches", "No matching customers")}
        renderOption={(props, opt: any) => {
          const { key, ...rest } = props as any;
          const name = getCustomerDisplayName(opt);
          return (
            <Box
              component="li"
              key={opt.customer_id ?? key}
              {...rest}
              sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.75 }}
            >
              <Avatar sx={{ width: 28, height: 28, fontSize: "0.75rem", bgcolor: "#f59e0b", color: "#0f172a" }}>
                {opt.customer_type === "Business" ? <BusinessIcon fontSize="small" /> : name.charAt(0)}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }} noWrap>
                  {[opt.phone_number, opt.nic_number].filter(Boolean).join(" · ") || `#${opt.customer_id}`}
                </Typography>
              </Box>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={t("settlement.customer.searchPlaceholder", "Search customer by name, phone or NIC…")}
            slotProps={{
              htmlInput: params.slotProps?.htmlInput,
              input: {
                ...(params.slotProps?.input || {}),
                startAdornment: (
                  <>
                    <SearchIcon sx={{ color: "text.secondary", mr: 1, fontSize: 18 }} />
                    {params.slotProps?.input?.startAdornment}
                  </>
                ),
                endAdornment: (
                  <>
                    {searchLoading && <CircularProgress size={16} sx={{ mr: 1 }} />}
                    {params.slotProps?.input?.endAdornment}
                  </>
                ),
                sx: {
                  borderRadius: 2,
                  bgcolor: isDark ? "#1e293b" : "#ffffff",
                  color: isDark ? "#f8fafc" : "#0f172a",
                },
              },
            }}
          />
        )}
      />

      {/* Big Customer Card */}
      {selectedCustomerId && isOverviewLoading && !overview && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
          <Skeleton variant="text" width="55%" height={28} />
          <Skeleton variant="text" width="80%" height={22} />
          <Skeleton variant="rectangular" height={14} sx={{ mt: 1.5, borderRadius: 1 }} />
        </Paper>
      )}

      {selectedCustomerId && overview && customer && summary && (
        <Paper
          data-testid="settlement-customer-card"
          elevation={0}
          sx={{
            p: compact ? 1.5 : 2,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: isDark ? "#334155" : "#e2e8f0",
            bgcolor: isDark ? "#0f172a" : "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {/* Identity row */}
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
              <Avatar
                src={customer.photo_url || undefined}
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: "#f59e0b",
                  color: "#0f172a",
                  fontWeight: 800,
                }}
              >
                {getCustomerDisplayName(customer).charAt(0) || <PersonIcon />}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.15 }} noWrap>
                  {getCustomerDisplayName(customer)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {[customer.phone_number, customer.nic_number].filter(Boolean).join(" · ") || `#${customer.customer_id}`}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              {customer.phone_number && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    component="a"
                    href={`tel:${customer.phone_number}`}
                    startIcon={<PhoneIcon sx={{ fontSize: 15 }} />}
                    sx={{ minHeight: 34, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                  >
                    {t("settlement.customer.call", "Call")}
                  </Button>
                  <WhatsAppButton
                    variant="button"
                    size="small"
                    customerId={customer.customer_id}
                    invoiceId={billsBar[0]?.invoice_id ?? 0}
                    templateKey="payment_reminder"
                    disabled={!billsBar.length}
                  />
                </>
              )}
            </Box>
          </Box>

          {/* Big summary headline */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: isDark ? "#1e293b" : "#f8fafc",
              border: "1px solid",
              borderColor: isDark ? "#334155" : "#e2e8f0",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
                color: summary.total_owed > 0 ? "error.main" : "success.main",
                fontSize: { xs: "1.05rem", sm: "1.2rem" },
              }}
            >
              {t("settlement.customer.owesSummary", {
                amount: fmtLkr(summary.total_owed),
                bills: summary.open_bills_count,
                machines: summary.machines_out_count,
                defaultValue: `Owes ${fmtLkr(summary.total_owed)} on ${summary.open_bills_count} bills · ${summary.machines_out_count} machines out`,
              })}
            </Typography>

            {/* Stacked age bar: one segment per bill */}
            {billsBar.length > 0 && (
              <Box sx={{ mt: 1.25 }}>
                <Box
                  data-testid="settlement-age-bar"
                  sx={{
                    display: "flex",
                    height: 10,
                    borderRadius: 99,
                    overflow: "hidden",
                    bgcolor: isDark ? "#334155" : "#e2e8f0",
                    gap: "2px",
                  }}
                >
                  {billsBar.map((b) => {
                    const weight =
                      totalOwedBar > 0
                        ? Math.max(4, (Math.max(0, b.owed) / totalOwedBar) * 100)
                        : 100 / billsBar.length;
                    return (
                      <Tooltip
                        key={b.invoice_id}
                        title={`INV-${b.invoice_id}: ${fmtLkr(b.owed)} (${b.age_days}d)`}
                      >
                        <Box
                          sx={{
                            width: `${weight}%`,
                            bgcolor: bucketColor(b.age_bucket),
                            height: "100%",
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
                <Box sx={{ display: "flex", gap: 1.5, mt: 0.75, flexWrap: "wrap" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981" }} />
                    {t("settlement.age.under7", "< 7d")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                    {t("settlement.age.7to30", "7–30d")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ef4444" }} />
                    {t("settlement.age.over30", "> 30d")}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Small facts */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {summary.oldest_unpaid_bill_date && (
              <Chip
                size="small"
                variant="outlined"
                label={t("settlement.customer.oldestUnpaid", {
                  date: formatDisplayDate(summary.oldest_unpaid_bill_date),
                  defaultValue: `Oldest unpaid: ${formatDisplayDate(summary.oldest_unpaid_bill_date)}`,
                })}
                sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
              />
            )}
            {summary.last_payment && (
              <Chip
                size="small"
                variant="outlined"
                label={t("settlement.customer.lastPayment", {
                  amount: fmtLkr(summary.last_payment.amount),
                  date: formatDisplayDate(summary.last_payment.date),
                  defaultValue: `Last payment: ${fmtLkr(summary.last_payment.amount)} (${formatDisplayDate(summary.last_payment.date)})`,
                })}
                sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
              />
            )}
            {Number(customer.deposit_balance || 0) > 0 && (
              <Chip
                size="small"
                icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 15 }} />}
                color="success"
                label={t("settlement.customer.hasCredit", {
                  amount: fmtLkr(Number(customer.deposit_balance)),
                  defaultValue: `Has ${fmtLkr(Number(customer.deposit_balance))} credit`,
                })}
                sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 800 }}
              />
            )}
            {summary.id_cards_held_count > 0 && (
              <Chip
                size="small"
                icon={<BadgeOutlinedIcon sx={{ fontSize: 15 }} />}
                color="warning"
                label={t("settlement.customer.idCardsHeld", {
                  count: summary.id_cards_held_count,
                  defaultValue: `${summary.id_cards_held_count} ID card(s) held`,
                })}
                sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}
              />
            )}
          </Box>

          {onProceed && (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={onProceed}
              sx={{
                alignSelf: "flex-end",
                textTransform: "none",
                fontWeight: 800,
                borderRadius: 2,
                bgcolor: "#f59e0b",
                color: "#0f172a",
                "&:hover": { bgcolor: "#d97706" },
              }}
            >
              {t("settlement.customer.continueToBills", "Continue to bills")}
            </Button>
          )}
        </Paper>
      )}
    </Box>
  );
}
