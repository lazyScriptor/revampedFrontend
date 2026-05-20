import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Switch,
  InputAdornment,
  Autocomplete,
  Avatar,
  Chip,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import {
  customerSchema,
  CustomerFormData,
  Customer,
} from "../schemas/customer.schema";
import {
  useCreateCustomer,
  useUpdateCustomer,
  useParentCustomerOptions,
  ParentCustomerOption,
} from "../hooks/useCustomerHooks";
import { useDebounce } from "@/features/invoices/hooks/usePosSearch";

interface CustomerFormDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: Customer | null;
}

const parentLabel = (p: ParentCustomerOption) =>
  p.customer_type === "Business" && p.company_name
    ? p.company_name
    : `${p.first_name} ${p.last_name}`;

export function CustomerFormDialog({
  open,
  onClose,
  initialData,
}: CustomerFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isEditing = !!initialData;

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    mode: "onChange",
    defaultValues: {
      customer_type: "Individual",
      is_worker_for_company: false,
      is_id_retained_currently: false,
      status: "Active",
      deposit_balance: 0,
      parent_customer_id: null,
    },
  });

  const customerType = watch("customer_type");
  const isLinkedToParent = watch("is_worker_for_company");
  const parentId = watch("parent_customer_id");
  const status = watch("status");
  const idInVault = watch("is_id_retained_currently");

  const [parentSearch, setParentSearch] = useState("");
  const debouncedParentSearch = useDebounce(parentSearch, 300);

  const { data: parentOptions = [], isLoading: parentsLoading } =
    useParentCustomerOptions(
      initialData?.customer_id,
      open && isLinkedToParent,
      debouncedParentSearch,
    );

  // When editing a customer that already has a parent, we still need to show
  // the chip even if that parent isn't in the current search results. Pull
  // from the bootstrap object if necessary.
  const selectedParent = useMemo<ParentCustomerOption | null>(() => {
    if (!parentId) return null;
    const fromList = parentOptions.find((p) => p.customer_id === Number(parentId));
    if (fromList) return fromList;
    if (initialData?.ParentCompany && initialData.parent_customer_id === Number(parentId)) {
      const p = initialData.ParentCompany;
      return {
        customer_id: Number(parentId),
        customer_type: (p.customer_type as "Individual" | "Business") || "Individual",
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        company_name: p.company_name || undefined,
        phone_number: p.phone_number,
      };
    }
    return null;
  }, [parentOptions, parentId, initialData]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          customer_type: initialData.customer_type,
          company_name: initialData.company_name || "",
          first_name: initialData.first_name,
          last_name: initialData.last_name,
          nic_number: initialData.nic_number,
          phone_number: initialData.phone_number,
          address_line1: initialData.address_line1 || "",
          address_line2: initialData.address_line2 || "",
          status: initialData.status,
          deposit_balance: Number(initialData.deposit_balance) || 0,
          is_id_retained_currently: initialData.is_id_retained_currently,
          parent_customer_id: initialData.parent_customer_id ?? null,
          is_worker_for_company: !!initialData.parent_customer_id,
        });
      } else {
        reset({
          customer_type: "Individual",
          is_worker_for_company: false,
          is_id_retained_currently: false,
          status: "Active",
          deposit_balance: 0,
          parent_customer_id: null,
        });
      }
    }
  }, [open, initialData, reset]);

  const onSubmit = (data: CustomerFormData) => {
    const payload: any = { ...data };
    if (payload.customer_type === "Individual") payload.company_name = null;
    if (!payload.is_worker_for_company) payload.parent_customer_id = null;
    delete payload.is_worker_for_company;

    if (isEditing && initialData?.customer_id) {
      updateMutation.mutate(
        { id: initialData.customer_id, data: payload },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => onClose() });
    }
  };

  const mutationError =
    (createMutation.error as any)?.response?.data?.message ||
    (updateMutation.error as any)?.response?.data?.message ||
    null;

  // ── Type selector chip cards ───────────────────────────────────────────────
  const typeCards = [
    {
      value: "Individual" as const,
      icon: <PersonIcon sx={{ fontSize: 28 }} />,
      title: "Individual",
      subtitle: "Walk-in customer or sole renter",
      accent: "#2563eb",
      bg: "#eff6ff",
    },
    {
      value: "Business" as const,
      icon: <BusinessIcon sx={{ fontSize: 28 }} />,
      title: "Business",
      subtitle: "Company or contractor account",
      accent: "#7c3aed",
      bg: "#f5f3ff",
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 0, sm: 3 },
            bgcolor: "#f8fafc",
            maxHeight: { xs: "100vh", sm: "92dvh" },
            overflow: "hidden",
          },
        },
      }}
    >
      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: "relative",
          px: { xs: 2.5, sm: 4 },
          py: { xs: 2.5, sm: 3.5 },
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #2563eb 140%)",
          color: "white",
          overflow: "hidden",
        }}
      >
        {/* decorative blobs */}
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            bgcolor: "rgba(99,102,241,0.18)",
            filter: "blur(10px)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -80,
            left: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            bgcolor: "rgba(20,184,166,0.18)",
            filter: "blur(10px)",
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                width: 52,
                height: 52,
                bgcolor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontWeight: 800,
                fontSize: "1.2rem",
              }}
            >
              {isEditing && initialData
                ? initialData.customer_type === "Business"
                  ? initialData.company_name?.charAt(0) || "B"
                  : initialData.first_name?.charAt(0) || "C"
                : "+"}
            </Avatar>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 2, fontWeight: 700 }}>
                {isEditing ? "Edit Customer" : "New Customer"}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25 }}>
                {isEditing
                  ? initialData?.customer_type === "Business"
                    ? initialData?.company_name
                    : `${initialData?.first_name} ${initialData?.last_name}`
                  : "Register a renter"}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.25 }}>
                Capture identity, link family or company, and set collateral terms.
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.1)",
              color: "white",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {isEditing && initialData && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
            <Chip
              size="small"
              icon={initialData.customer_type === "Business" ? <BusinessIcon sx={{ fontSize: 14 }} /> : <PersonIcon sx={{ fontSize: 14 }} />}
              label={initialData.customer_type}
              sx={{
                bgcolor: "rgba(255,255,255,0.12)",
                color: "white",
                fontWeight: 700,
                "& .MuiChip-icon": { color: "white" },
              }}
            />
            {initialData.ParentCompany && (
              <Chip
                size="small"
                icon={<AccountTreeIcon sx={{ fontSize: 14 }} />}
                label={`Linked to ${initialData.ParentCompany.company_name || `${initialData.ParentCompany.first_name} ${initialData.ParentCompany.last_name}`}`}
                sx={{
                  bgcolor: "rgba(255,255,255,0.12)",
                  color: "white",
                  fontWeight: 700,
                  "& .MuiChip-icon": { color: "white" },
                }}
              />
            )}
            {initialData.is_id_retained_currently && (
              <Chip
                size="small"
                icon={<VerifiedUserIcon sx={{ fontSize: 14 }} />}
                label="ID in Vault"
                sx={{
                  bgcolor: "rgba(239,68,68,0.18)",
                  color: "#fecaca",
                  fontWeight: 700,
                  "& .MuiChip-icon": { color: "#fecaca" },
                }}
              />
            )}
          </Box>
        )}
      </Box>

      <DialogContent dividers sx={{ p: 0, borderTop: "none" }}>
        <Box
          component="form"
          id="customer-form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            p: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {mutationError && (
            <Alert
              severity="error"
              variant="outlined"
              icon={<WarningAmberIcon />}
              sx={{ borderRadius: 2 }}
            >
              {mutationError}
            </Alert>
          )}

          {/* ── Section: Customer Type chooser ─────────────────────────────── */}
          <Box>
            <SectionLabel
              icon={<BusinessIcon fontSize="small" />}
              title="Customer Type"
              hint="How is this renter classified?"
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mt: 1.5,
              }}
            >
              {typeCards.map((card) => {
                const selected = customerType === card.value;
                return (
                  <Box
                    key={card.value}
                    onClick={() => setValue("customer_type", card.value, { shouldDirty: true })}
                    sx={{
                      cursor: "pointer",
                      border: "2px solid",
                      borderColor: selected ? card.accent : "#e2e8f0",
                      bgcolor: selected ? card.bg : "white",
                      borderRadius: 2.5,
                      px: 2,
                      py: 1.75,
                      display: "flex",
                      gap: 1.5,
                      alignItems: "center",
                      transition: "all 0.15s",
                      "&:hover": {
                        borderColor: card.accent,
                        bgcolor: card.bg,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: selected ? card.accent : "#f1f5f9",
                        color: selected ? "white" : "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                        {card.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.3 }}>
                        {card.subtitle}
                      </Typography>
                    </Box>
                    {selected && <CheckCircleIcon sx={{ color: card.accent, fontSize: 22 }} />}
                  </Box>
                );
              })}
            </Box>

            {customerType === "Business" && (
              <TextField
                fullWidth
                size="small"
                label="Company / Business Name"
                placeholder="e.g. Apex Construction Ltd."
                {...register("company_name")}
                error={!!errors.company_name}
                helperText={errors.company_name?.message}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          {/* ── Section: Parent Customer (works for both types) ─────────────── */}
          <Box
            sx={{
              border: "1px solid",
              borderColor: isLinkedToParent ? "#c7d2fe" : "#e2e8f0",
              bgcolor: isLinkedToParent ? "#eef2ff" : "white",
              borderRadius: 2.5,
              p: { xs: 1.75, sm: 2 },
              transition: "all 0.2s",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.5,
                  bgcolor: isLinkedToParent ? "#4f46e5" : "#f1f5f9",
                  color: isLinkedToParent ? "white" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AccountTreeIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a" }}>
                  Link to a parent customer
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Use when a child rents on behalf of a parent, or a worker on behalf of their company. Both keep their own rental history.
                </Typography>
              </Box>
              <Controller
                name="is_worker_for_company"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Switch
                    checked={value}
                    onChange={(e) => {
                      onChange(e.target.checked);
                      if (!e.target.checked) setValue("parent_customer_id", null);
                    }}
                  />
                )}
              />
            </Box>

            {isLinkedToParent && (
              <Box sx={{ mt: 2 }}>
                <Controller
                  name="parent_customer_id"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={parentOptions}
                      loading={parentsLoading}
                      value={selectedParent}
                      onChange={(_, v) => field.onChange(v?.customer_id ?? null)}
                      onInputChange={(_, v, reason) => {
                        // Only update the search term when the user is actively
                        // typing; ignore the "reset" reason that fires when MUI
                        // syncs the input to the newly selected value.
                        if (reason === "input" || reason === "clear") setParentSearch(v);
                      }}
                      filterOptions={(x) => x}
                      noOptionsText={
                        debouncedParentSearch.length === 0
                          ? "Start typing to search…"
                          : "No customers match that search"
                      }
                      getOptionLabel={parentLabel}
                      isOptionEqualToValue={(o, v) => o.customer_id === v.customer_id}
                      renderOption={(props, option) => {
                        const { key, ...rest } = props as any;
                        return (
                          <Box component="li" key={key} {...rest} sx={{ gap: 1.5, py: 1 }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: option.customer_type === "Business" ? "#7c3aed" : "#0ea5e9",
                                fontSize: "0.85rem",
                              }}
                            >
                              {option.customer_type === "Business" ? (
                                <BusinessIcon sx={{ fontSize: 16 }} />
                              ) : (
                                option.first_name?.charAt(0) || "?"
                              )}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {parentLabel(option)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.phone_number}
                                {option.nic_number ? ` · ${option.nic_number}` : ""}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={option.customer_type}
                              sx={{ fontWeight: 700, height: 20, fontSize: "0.65rem" }}
                            />
                          </Box>
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...(params as any)}
                          size="small"
                          label="Parent customer"
                          placeholder="Search by name, phone, or NIC…"
                          error={!!errors.parent_customer_id}
                          helperText={errors.parent_customer_id?.message}
                          slotProps={{
                            ...((params as any).slotProps),
                            input: {
                              ...((params as any).slotProps?.input || {}),
                              endAdornment: (
                                <>
                                  {parentsLoading && <CircularProgress size={16} />}
                                  {((params as any).slotProps?.input as any)?.endAdornment}
                                </>
                              ),
                            },
                          }}
                        />
                      )}
                    />
                  )}
                />
                {selectedParent && (
                  <Alert
                    severity="info"
                    variant="outlined"
                    icon={<AccountTreeIcon />}
                    sx={{ mt: 1.5, borderRadius: 2, fontSize: "0.78rem" }}
                  >
                    Linked to <b>{parentLabel(selectedParent)}</b>. On checkout you can choose to rent for self or on behalf of this parent.
                  </Alert>
                )}
              </Box>
            )}
          </Box>

          {/* ── Section: Identity ────────────────────────────────────────────── */}
          <Box>
            <SectionLabel
              icon={<PersonOutlineIcon fontSize="small" />}
              title="Identity"
              hint="Required for collateral and rental history"
            />
            <Box
              sx={{
                mt: 1.5,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              <TextField
                size="small"
                label="First name"
                {...register("first_name")}
                error={!!errors.first_name}
                helperText={errors.first_name?.message}
              />
              <TextField
                size="small"
                label="Last name"
                {...register("last_name")}
                error={!!errors.last_name}
                helperText={errors.last_name?.message}
              />
              <TextField
                size="small"
                label="NIC / Passport"
                {...register("nic_number")}
                error={!!errors.nic_number}
                helperText={errors.nic_number?.message || "Unique across all customers"}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <VerifiedUserIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                size="small"
                label="Phone"
                {...register("phone_number")}
                error={!!errors.phone_number}
                helperText={errors.phone_number?.message}
              />
            </Box>
          </Box>

          {/* ── Section: Address ─────────────────────────────────────────────── */}
          <Box>
            <SectionLabel
              icon={<HomeOutlinedIcon fontSize="small" />}
              title="Address"
              hint="Optional — useful for deliveries"
            />
            <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <TextField
                size="small"
                label="Address line 1"
                {...register("address_line1")}
                error={!!errors.address_line1}
                helperText={errors.address_line1?.message}
              />
              <TextField
                size="small"
                label="Address line 2 (optional)"
                {...register("address_line2")}
                error={!!errors.address_line2}
                helperText={errors.address_line2?.message}
              />
            </Box>
          </Box>

          {/* ── Section: Accounting & Security ──────────────────────────────── */}
          <Box>
            <SectionLabel
              icon={<AccountBalanceWalletOutlinedIcon fontSize="small" />}
              title="Accounting & Security"
              hint="Wallet balance, status, and collateral"
            />

            <Box
              sx={{
                mt: 1.5,
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              <TextField
                size="small"
                select
                label="Account status"
                value={status || "Active"}
                onChange={(e) => setValue("status", e.target.value as "Active" | "Blacklisted", { shouldDirty: true })}
                error={!!errors.status}
                helperText={errors.status?.message}
              >
                <MenuItem value="Active">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main" }} />
                    Active (Good standing)
                  </Box>
                </MenuItem>
                <MenuItem value="Blacklisted">
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "error.main" }} />
                    Blacklisted (Do not rent)
                  </Box>
                </MenuItem>
              </TextField>

              <TextField
                size="small"
                label="Deposit / Advance balance"
                type="number"
                inputProps={{ step: "0.01", min: 0 }}
                {...register("deposit_balance", { valueAsNumber: true })}
                error={!!errors.deposit_balance}
                helperText={errors.deposit_balance?.message || "Floating cash held"}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                mt: 1.75,
                p: 1.75,
                borderRadius: 2,
                bgcolor: idInVault ? "#fef2f2" : "#f8fafc",
                border: "1px solid",
                borderColor: idInVault ? "#fecaca" : "#e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.5,
                  bgcolor: idInVault ? "#dc2626" : "#f1f5f9",
                  color: idInVault ? "white" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <VerifiedUserIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: idInVault ? "#991b1b" : "#0f172a" }}>
                  Physical NIC retained in vault
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Toggle on if the shop is currently holding their physical ID as collateral.
                </Typography>
              </Box>
              <Controller
                name="is_id_retained_currently"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <FormControlLabel
                    control={<Switch checked={value} onChange={onChange} color="error" />}
                    label=""
                    sx={{ m: 0 }}
                  />
                )}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          bgcolor: "white",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", gap: 1 }}>
          {Object.keys(errors).length > 0 ? (
            <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
              Fix highlighted errors before saving.
            </Typography>
          ) : isDirty ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              Unsaved changes
            </Typography>
          ) : null}
        </Box>
        <Button onClick={onClose} disabled={isPending} sx={{ borderRadius: 2, textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="customer-form"
          variant="contained"
          disableElevation
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ borderRadius: 2, textTransform: "none", px: 3, fontWeight: 700 }}
        >
          {isPending ? "Saving…" : isEditing ? "Save changes" : "Create customer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SectionLabel({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: 1,
          bgcolor: "#f1f5f9",
          color: "#475569",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
          {title}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
