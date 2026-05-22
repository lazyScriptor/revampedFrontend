import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  FieldGrid,
  FormDialogShell,
  FormFooterMeta,
  FormSection,
} from "@/components/forms/FormDialogShell";
import { useCreateTenant } from "@/features/super-admin/hooks/useSuperAdminHooks";

interface FormValues {
  display_name: string;
  contact_email: string;
  admin_username: string;
  admin_password: string;
  db_name_slug: string;
  tier: string;
  monthly_rate: string;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (tenantId: string) => void;
}

export default function CreateTenantDialog({ open, onClose, onCreated }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: { tier: "Basic", monthly_rate: "0" },
  });

  const displayName = watch("display_name");

  useEffect(() => {
    if (displayName) {
      setValue("db_name_slug", slugify(displayName), { shouldValidate: false });
    }
  }, [displayName, setValue]);

  const createMutation = useCreateTenant();

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      {
        display_name: values.display_name,
        contact_email: values.contact_email,
        admin_username: values.admin_username,
        admin_password: values.admin_password,
        db_name_slug: values.db_name_slug,
        tier: values.tier,
        monthly_rate: parseFloat(values.monthly_rate) || 0,
      },
      {
        onSuccess: (tenant: Record<string, unknown>) => {
          reset();
          onCreated(tenant.tenant_id as string);
        },
      },
    );
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    reset();
    createMutation.reset();
    onClose();
  };

  const errorCount = Object.keys(errors).length;
  const mutationError =
    createMutation.isError &&
    (createMutation.error instanceof Error
      ? createMutation.error.message
      : "Failed to create tenant.");

  return (
    <FormDialogShell
      open={open}
      onClose={handleClose}
      maxWidth="md"
      eyebrow="New Tenant"
      title="Provision a tenant"
      subtitle="Spins up a new database, admin user, roles, and permissions automatically."
      avatarIcon={<BusinessOutlinedIcon sx={{ fontSize: 22 }} />}
      footer={
        <>
          <FormFooterMeta>
            {errorCount > 0
              ? `Fix ${errorCount} issue${errorCount > 1 ? "s" : ""} before saving`
              : mutationError
                ? mutationError
                : isDirty && !createMutation.isPending
                  ? "Unsaved changes"
                  : ""}
          </FormFooterMeta>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleClose} disabled={createMutation.isPending} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-tenant-form"
              variant="contained"
              disabled={createMutation.isPending}
              startIcon={
                createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined
              }
            >
              {createMutation.isPending ? "Creating…" : "Create tenant"}
            </Button>
          </Box>
        </>
      }
    >
      <Box
        component="form"
        id="create-tenant-form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {mutationError && (
          <Alert severity="error" variant="outlined" icon={<WarningAmberIcon />}>
            {mutationError}
          </Alert>
        )}

        <FormSection
          icon={<BusinessOutlinedIcon />}
          title="Business identity"
          hint="How this tenant appears across the platform."
        >
          <FieldGrid>
            <TextField
              label="Display name"
              size="small"
              fullWidth
              required
              {...register("display_name", { required: "Required" })}
              error={!!errors.display_name}
              helperText={errors.display_name?.message}
            />
            <TextField
              label="Contact email"
              size="small"
              fullWidth
              required
              type="email"
              {...register("contact_email", {
                required: "Required",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
              })}
              error={!!errors.contact_email}
              helperText={errors.contact_email?.message}
            />
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<LockOutlinedIcon />}
          title="Admin account"
          hint="Credentials for the tenant's first admin user."
        >
          <FieldGrid>
            <TextField
              label="Admin username"
              size="small"
              fullWidth
              required
              {...register("admin_username", { required: "Required" })}
              error={!!errors.admin_username}
              helperText={errors.admin_username?.message}
            />
            <TextField
              label="Admin password"
              size="small"
              fullWidth
              required
              type="password"
              {...register("admin_password", {
                required: "Required",
                minLength: { value: 8, message: "Min 8 characters" },
              })}
              error={!!errors.admin_password}
              helperText={errors.admin_password?.message}
              autoComplete="new-password"
            />
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<StorageOutlinedIcon />}
          title="Database & tier"
          hint="The slug determines the final database name. Tier governs feature access."
        >
          <TextField
            label="Database slug"
            size="small"
            fullWidth
            required
            {...register("db_name_slug", {
              required: "Required",
              pattern: {
                value: /^[a-z0-9_]+$/,
                message: "Only lowercase letters, numbers, underscores",
              },
            })}
            error={!!errors.db_name_slug}
            helperText={
              errors.db_name_slug?.message ?? "Final DB name: geargrid_{slug}_{timestamp}"
            }
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography
                      variant="caption"
                      sx={{ color: "text.disabled", fontFamily: "monospace" }}
                    >
                      geargrid_
                    </Typography>
                  </InputAdornment>
                ),
              },
            }}
          />
          <FieldGrid>
            <Controller
              name="tier"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Tier" size="small" fullWidth>
                  {["Basic", "Pro", "Enterprise"].map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Monthly rate"
              size="small"
              fullWidth
              type="number"
              {...register("monthly_rate")}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="caption" sx={{ color: "text.disabled" }}>
                        LKR / mo
                      </Typography>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </FieldGrid>
        </FormSection>
      </Box>
    </FormDialogShell>
  );
}
