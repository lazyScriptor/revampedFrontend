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

import { usePosCustomerSearch } from "../hooks/usePosSearch";
import { useCustomerDetails } from "@/features/customers/hooks/useCustomerHooks";

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
  const [inputValue, setInputValue] = useState("");
  const { data: searchResults = [], isLoading } = usePosCustomerSearch(inputValue);

  // Fetch nested parent + workers for the selected customer so we know whether
  // to surface the "rent on behalf of" picker. Skipped until something is
  // actually selected.
  const { data: selectedCustomerDetails } = useCustomerDetails(
    selectedCustomer?.customer_id ?? null,
  );

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
        subtitle: "Linked parent",
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
          subtitle: "Linked child / worker",
          data: w,
          relation: "worker",
        });
      });
    }
    return list;
  }, [selectedCustomerDetails, selectedCustomer]);

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
          noOptionsText={inputValue.length < 2 ? "Type to search…" : "No clients found."}
          onChange={(_, newValue) => onSelectCustomer(newValue)}
          onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
          renderInput={(params) => (
            <TextField
              {...(params as any)}
              placeholder="Scan NIC, phone, or name…"
              size="small"
              fullWidth
              slotProps={{
                ...((params as any).slotProps),
                input: {
                  ...((params as any).slotProps?.input || {}),
                  startAdornment: (
                    <SearchIcon sx={{ color: "action.disabled", ml: 0.5, mr: 0.5, fontSize: 18 }} />
                  ),
                  endAdornment: (
                    <>
                      {isLoading && <CircularProgress size={16} />}
                      {((params as any).slotProps?.input as any)?.endAdornment}
                    </>
                  ),
                  sx: {
                    borderRadius: 2,
                    bgcolor: "white",
                    "& fieldset": { borderColor: "#e2e8f0" },
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
                    width: 34,
                    height: 34,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    bgcolor:
                      option.status === "Blacklisted"
                        ? "error.light"
                        : option.customer_type === "Business"
                        ? "primary.main"
                        : "#475569",
                  }}
                >
                  {option.first_name?.charAt(0)}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {displayName(option)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {option.nic_number} · {option.phone_number}
                  </Typography>
                </Box>
                {option.status === "Blacklisted" && (
                  <Chip
                    size="small"
                    label="Blocked"
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
            bgcolor: "white",
            border: "1px solid",
            borderColor: isBlacklisted ? "#fca5a5" : "#e2e8f0",
            borderRadius: 2.5,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
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
              }}
            >
              {selectedCustomer.first_name?.charAt(0)}
            </Avatar>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
                {displayName(selectedCustomer)}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                {selectedCustomer.customer_type === "Business" ? (
                  <BusinessIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                ) : (
                  <PersonIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                )}
                <Typography variant="caption" color="text.secondary">
                  {selectedCustomer.customer_type}
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Remove selection">
              <IconButton size="small" onClick={() => onSelectCustomer(null)} sx={{ color: "action.disabled" }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider />

          {/* Quick info rows */}
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BadgeIcon sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                {selectedCustomer.nic_number || "—"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PhoneIcon sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary">
                {selectedCustomer.phone_number || "—"}
              </Typography>
            </Box>
          </Box>

          {/* Stats row */}
          <Box
            sx={{
              mx: 2,
              mb: 2,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                bgcolor: "#f8fafc",
                borderRadius: 2,
                border: "1px solid #f1f5f9",
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 700, mb: 0.5 }}>
                <StarIcon sx={{ fontSize: 12, color: "#eab308" }} /> Trust Score
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {selectedCustomer.rating?.toFixed(1) || "5.0"} / 5
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1.5,
                bgcolor: hasWallet ? "#f0fdf4" : "#f8fafc",
                borderRadius: 2,
                border: "1px solid",
                borderColor: hasWallet ? "#bbf7d0" : "#f1f5f9",
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
                  color: hasWallet ? "success.dark" : "text.secondary",
                }}
              >
                <AccountBalanceWalletIcon sx={{ fontSize: 12 }} /> Wallet
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: hasWallet ? "success.main" : "text.secondary" }}>
                Rs. {Number(selectedCustomer.deposit_balance || 0).toLocaleString()}
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
                BLACKLISTED — Do not process this order.
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
                Physical ID currently in the security vault.
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
                  Rental Attribution
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                This customer is linked to a {relationshipOptions.some((o) => o.relation === "parent") ? "parent" : ""}
                {relationshipOptions.some((o) => o.relation === "parent") && relationshipOptions.some((o) => o.relation === "worker") ? " and " : ""}
                {relationshipOptions.some((o) => o.relation === "worker") ? "child / worker" : ""}. Choose who this rental is for.
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
                      Rent for self
                    </Typography>
                  </Box>
                </MenuItem>
                {relationshipOptions.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                      <AccountTreeIcon sx={{ fontSize: 16, color: opt.relation === "parent" ? "#7c3aed" : "#0ea5e9" }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                          On behalf of {opt.label}
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
                  Invoice will be attributed to both customers' history.
                </Typography>
              )}
            </Box>
          )}
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
            border: "2px dashed #e2e8f0",
            borderRadius: 2.5,
            p: 3,
            textAlign: "center",
            gap: 1,
            color: "#94a3b8",
          }}
        >
          <PersonIcon sx={{ fontSize: 40, opacity: 0.3 }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            No Client Selected
          </Typography>
          <Typography variant="caption">
            Search by name, NIC, or phone number above.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
