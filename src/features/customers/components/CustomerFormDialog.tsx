import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  MenuItem,
  Divider,
  CircularProgress,
  FormControlLabel,
  Switch,
  Paper,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";

import {
  customerSchema,
  CustomerFormData,
  Customer,
} from "../schemas/customer.schema";
import { useCreateCustomer, useUpdateCustomer } from "../hooks/useCustomerHooks";
// import { useCreateCustomer, useUpdateCustomer, useBusinessCustomers } from "../hooks/useCustomerHooks";

interface CustomerFormDialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: Customer | null;
}

export function CustomerFormDialog({
  open,
  onClose,
  initialData,
}: CustomerFormDialogProps) {
  // const createMutation = useCreateCustomer();
  // const updateMutation = useUpdateCustomer();
  // const { data: businessCustomers = [] } = useBusinessCustomers();

  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    mode: "onChange", // <-- FIX 1: Triggers validation instantly as the user types
    defaultValues: {
      customer_type: "Individual",
      is_worker_for_company: false,
      is_id_retained_currently: false,
      status: "Active",
      deposit_balance: 0,
    },
  });

  const customerType = watch("customer_type");
  const isWorkerForCompany = watch("is_worker_for_company");

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          ...initialData,
          deposit_balance: Number(initialData.deposit_balance),
          is_worker_for_company: !!initialData.parent_customer_id,
        });
      } else {
        reset({
          customer_type: "Individual",
          is_worker_for_company: false,
          is_id_retained_currently: false,
          status: "Active",
          deposit_balance: 0,
        });
      }
    }
  }, [open, initialData, reset]);

// Inside CustomerFormDialog:
const createMutation = useCreateCustomer();
const updateMutation = useUpdateCustomer();

const isPending = createMutation.isPending || updateMutation.isPending;

const onSubmit = (data: CustomerFormData) => {
  const payload: any = { ...data };

  if (payload.customer_type === "Individual") payload.company_name = null;
  if (!payload.is_worker_for_company) payload.parent_customer_id = null;
  delete payload.is_worker_for_company;

  if (isEditing && initialData?.customer_id) {
    updateMutation.mutate(
      { id: initialData.customer_id, data: payload },
      { onSuccess: () => onClose() }
    );
  } else {
    createMutation.mutate(payload, {
      onSuccess: () => onClose()
    });
  }
};

  // FIX 2: Debugger function to catch silent validation failures
  const onValidationError = (errors: any) => {
    console.error("Zod Validation Failed! Blocked submission. Errors:", errors);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: { borderRadius: 3, bgcolor: "#f8fafc", maxHeight: "90vh" },
      }}
    >
      <DialogTitle
        sx={{ p: 3, bgcolor: "white", borderBottom: "1px solid #e2e8f0" }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="bold" color="text.primary">
              {isEditing ? "Edit Customer Profile" : "Register New Customer"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage CRM details, business relationships, and collateral.
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ bgcolor: "grey.100" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, borderTop: "none" }}>
        <Box
          component="form"
          id="customer-form"
          // We attach the error logger here as the second argument
          onSubmit={handleSubmit(onSubmit, onValidationError)}
          sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}
        >
          {/* SECTION 1: Client Classification */}
          <Paper
            elevation={0}
            sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <BusinessCenterOutlinedIcon color="primary" />
              <Typography variant="h6" fontWeight="600">
                Client Classification
              </Typography>
            </Box>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                select
                fullWidth
                label="Customer Type"
                {...register("customer_type")}
                error={!!errors.customer_type}
                helperText={errors.customer_type?.message}
              >
                <MenuItem value="Individual">Individual Person</MenuItem>
                <MenuItem value="Business">Business / Company</MenuItem>
              </TextField>

              {customerType === "Business" && (
                <TextField
                  fullWidth
                  label="Company Name"
                  {...register("company_name")}
                  error={!!errors.company_name}
                  helperText={errors.company_name?.message}
                />
              )}
            </div>

            {customerType === "Individual" && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: "#eff6ff",
                  borderRadius: 2,
                  border: "1px solid #dbeafe",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: isWorkerForCompany ? 2 : 0,
                  }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      color="primary.dark"
                    >
                      Delegated Worker
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Is this person renting on behalf of a parent company?
                    </Typography>
                  </Box>
                  <Controller
                    name="is_worker_for_company"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={value}
                            onChange={onChange}
                            color="primary"
                          />
                        }
                        label={value ? "Yes" : "No"}
                        labelPlacement="start"
                        sx={{ m: 0 }}
                      />
                    )}
                  />
                </Box>

                {isWorkerForCompany && (
                  <TextField
                    select
                    fullWidth
                    label="Select Parent Company"
                    {...register("parent_customer_id")}
                    error={!!errors.parent_customer_id}
                    helperText={errors.parent_customer_id?.message}
                  >
                    <MenuItem value={1}>Apex Construction Ltd</MenuItem>
                    <MenuItem value={2}>Silva Builders Co.</MenuItem>
                  </TextField>
                )}
              </Box>
            )}
          </Paper>

          {/* SECTION 2: General Information */}
          <Paper
            elevation={0}
            sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <PersonOutlineIcon color="secondary" />
              <Typography variant="h6" fontWeight="600">
                Personal Details
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="First Name"
                  {...register("first_name")}
                  error={!!errors.first_name}
                  helperText={errors.first_name?.message}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  {...register("last_name")}
                  error={!!errors.last_name}
                  helperText={errors.last_name?.message}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="NIC / Passport Number"
                  {...register("nic_number")}
                  error={!!errors.nic_number}
                  helperText={errors.nic_number?.message}
                />
                <TextField
                  fullWidth
                  label="Phone Number"
                  {...register("phone_number")}
                  error={!!errors.phone_number}
                  helperText={errors.phone_number?.message}
                />
              </div>
              <TextField
                fullWidth
                label="Address Line 1"
                {...register("address_line1")}
                error={!!errors.address_line1}
                helperText={errors.address_line1?.message}
              />
              <TextField
                fullWidth
                label="Address Line 2 (Optional)"
                {...register("address_line2")}
                error={!!errors.address_line2}
                helperText={errors.address_line2?.message}
              />
            </Box>
          </Paper>

          {/* SECTION 3: Accounting & Security */}
          <Paper
            elevation={0}
            sx={{ p: 3, border: "1px solid #e2e8f0", borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <AccountBalanceWalletOutlinedIcon color="success" />
              <Typography variant="h6" fontWeight="600">
                Accounting & Security
              </Typography>
            </Box>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <TextField
                fullWidth
                label="Account Status"
                select
                {...register("status")}
                error={!!errors.status}
                helperText={errors.status?.message}
              >
                <MenuItem value="Active">Active (Good Standing)</MenuItem>
                <MenuItem value="Blacklisted">
                  Blacklisted (Do Not Rent)
                </MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="Deposit / Advance Balance"
                type="number"
                inputProps={{ step: "0.01" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">Rs.</InputAdornment>
                  ),
                }}
                // FIX 3: Force RHF to treat this input as a Number, not a String
                {...register("deposit_balance", { valueAsNumber: true })}
                error={!!errors.deposit_balance}
                helperText={
                  errors.deposit_balance?.message ||
                  "Current floating cash held"
                }
              />
            </div>

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 2,
                bgcolor: "#fef2f2",
                borderRadius: 2,
                border: "1px solid #fee2e2",
              }}
            >
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  color="error.dark"
                >
                  Physical ID Retained
                </Typography>
                <Typography variant="body2" color="error.main">
                  Is the shop currently holding this customer's physical
                  NIC/Passport in the vault?
                </Typography>
              </Box>
              <Controller
                name="is_id_retained_currently"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        onChange={onChange}
                        color="error"
                      />
                    }
                    label={value ? "Yes (In Vault)" : "No"}
                    labelPlacement="start"
                    sx={{ m: 0 }}
                  />
                )}
              />
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{ px: 3, py: 2, bgcolor: "white", borderTop: "1px solid #e2e8f0" }}
      >
        <Typography
          variant="caption"
          color="error"
          sx={{ flexGrow: 1, fontWeight: 500 }}
        >
          {Object.keys(errors).length > 0 &&
            "Please fix highlighted errors before saving."}
        </Typography>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={isPending}
          sx={{ borderRadius: 2, textTransform: "none", px: 3 }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="customer-form"
          variant="contained"
          disableElevation
          disabled={isPending}
          startIcon={
            isPending && <CircularProgress size={20} color="inherit" />
          }
          sx={{ borderRadius: 2, textTransform: "none", px: 4 }}
        >
          {isPending
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : "Save Customer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
