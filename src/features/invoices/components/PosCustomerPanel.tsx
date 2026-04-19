import { useState } from "react";
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  Avatar,
  Chip,
  Paper,
  Divider,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import StarIcon from "@mui/icons-material/Star";

import { usePosCustomerSearch } from "../hooks/usePosSearch";

// Prop interface so the main POS screen knows who is selected
interface PosCustomerPanelProps {
  selectedCustomer: any | null;
  onSelectCustomer: (customer: any | null) => void;
}

export function PosCustomerPanel({
  selectedCustomer,
  onSelectCustomer,
}: PosCustomerPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const { data: searchResults = [], isLoading } =
    usePosCustomerSearch(inputValue);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 3, height: "100%" }}
    >
      {/* --- 1. The Global Search Bar --- */}
      <Autocomplete
        options={searchResults}
        getOptionLabel={(option: any) =>
          `${option.first_name} ${option.last_name}`
        }
        filterOptions={(x) => x} // Disable local filtering, let the backend handle it
        autoComplete
        includeInputInList
        filterSelectedOptions
        value={selectedCustomer}
        noOptionsText={
          inputValue.length < 2 ? "Type to search..." : "No clients found."
        }
        onChange={(event, newValue) => onSelectCustomer(newValue)}
        onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Scan ID, Phone, or Name..."
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <SearchIcon color="action" sx={{ ml: 1, mr: -0.5 }} />
              ),
              endAdornment: (
                <>
                  {isLoading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {/* CRITICAL FIX: Added the '?' optional chaining operator below */}
                  {params.InputProps?.endAdornment}
                </>
              ),
              sx: { borderRadius: 2, bgcolor: "white" },
            }}
          />
        )}
        // MASTERCLASS UX: Rich dropdown items
        renderOption={(props, option: any) => (
          <li
            {...props}
            key={option.customer_id}
            className="flex items-center gap-3 p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50"
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor:
                  option.customer_type === "Business"
                    ? "primary.main"
                    : "slate.400",
              }}
            >
              {option.first_name.charAt(0)}
            </Avatar>
            <div className="flex-grow">
              <Typography variant="body1" fontWeight="600" color="text.primary">
                {option.customer_type === "Business"
                  ? option.company_name
                  : `${option.first_name} ${option.last_name}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                NIC: {option.nic_number} • Phone: {option.phone_number}
              </Typography>
            </div>
            {option.status === "Blacklisted" && (
              <Chip
                size="small"
                color="error"
                label="Blacklisted"
                sx={{ height: 20, fontSize: "0.7rem" }}
              />
            )}
          </li>
        )}
      />

      {/* --- 2. The Customer Snapshot Widget --- */}
      {selectedCustomer ? (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            border: "1px solid #e2e8f0",
            borderRadius: 2,
            bgcolor: "white",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Header */}
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor:
                  selectedCustomer.customer_type === "Business"
                    ? "primary.main"
                    : "slate.700",
              }}
            >
              {selectedCustomer.first_name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
                {selectedCustomer.customer_type === "Business"
                  ? selectedCustomer.company_name
                  : `${selectedCustomer.first_name} ${selectedCustomer.last_name}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedCustomer.nic_number} • {selectedCustomer.phone_number}
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Box
              sx={{
                p: 1.5,
                bgcolor: "#f8fafc",
                borderRadius: 2,
                border: "1px solid #f1f5f9",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Trust Rating
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "#eab308",
                }}
              >
                <StarIcon fontSize="small" />
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color="text.primary"
                >
                  {selectedCustomer.rating}.0 / 5.0
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                p: 1.5,
                bgcolor: "#f8fafc",
                borderRadius: 2,
                border: "1px solid #f1f5f9",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Floating Advance
              </Typography>
              <Typography
                variant="body2"
                fontWeight="bold"
                color={
                  Number(selectedCustomer.deposit_balance) > 0
                    ? "success.main"
                    : "text.primary"
                }
              >
                Rs.{" "}
                {Number(selectedCustomer.deposit_balance || 0).toLocaleString()}
              </Typography>
            </Box>
          </div>

          {/* Critical Warnings Engine */}
          {selectedCustomer.status === "Blacklisted" && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1.5,
                bgcolor: "#fef2f2",
                borderRadius: 2,
                border: "1px solid #fca5a5",
                color: "#dc2626",
              }}
            >
              <WarningAmberIcon fontSize="small" />
              <Typography variant="body2" fontWeight="600">
                Client is Blacklisted. DO NOT RENT.
              </Typography>
            </Box>
          )}

          {selectedCustomer.is_id_retained_currently && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1.5,
                bgcolor: "#fffbeb",
                borderRadius: 2,
                border: "1px solid #fde047",
                color: "#b45309",
              }}
            >
              <VerifiedUserIcon fontSize="small" />
              <Typography variant="body2" fontWeight="600">
                Physical ID is currently in the vault.
              </Typography>
            </Box>
          )}
        </Paper>
      ) : (
        /* Empty State */
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexGrow: 1,
            border: "2px dashed #e2e8f0",
            borderRadius: 2,
            bgcolor: "#f8fafc",
            p: 3,
            textAlign: "center",
          }}
        >
          <PersonAddIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 2 }} />
          <Typography variant="body1" fontWeight="600" color="text.secondary">
            No Client Selected
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Search above or register a new client to begin drafting this
            invoice.
          </Typography>
          <Button variant="outlined" size="small" sx={{ borderRadius: 2 }}>
            Register New Client
          </Button>
        </Box>
      )}
    </Box>
  );
}
