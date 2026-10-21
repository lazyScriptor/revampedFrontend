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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      : t("superAdmin.CreateTenantDialog.failedToCreateTenant"));

  return (
    <FormDialogShell
      open={open}
      onClose={handleClose}
      maxWidth="md"
      eyebrow={t("superAdmin.CreateTenantDialog.newTenant")}
      title={t("superAdmin.CreateTenantDialog.provisionATenant")}
      subtitle={t("superAdmin.CreateTenantDialog.spinsUpANewDatabase")}
      avatarIcon={<BusinessOutlinedIcon sx={{ fontSize: 22 }} />}
      footer={
        <>
          <FormFooterMeta>
            {errorCount > 0
              ? t("forms.fixIssuesBeforeSaving", { count: errorCount })
              : mutationError
                ? mutationError
                : isDirty && !createMutation.isPending
                  ? t("common.unsavedChanges")
                  : ""}
          </FormFooterMeta>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleClose} disabled={createMutation.isPending} color="inherit">
              {t("common.cancel")}
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
              {createMutation.isPending ? t("superAdmin.CreateTenantDialog.creating") : t("superAdmin.CreateTenantDialog.createTenant")}
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
          title={t("superAdmin.CreateTenantDialog.businessIdentity")}
          hint={t("superAdmin.CreateTenantDialog.howThisTenantAppearsAcross")}
        >
          <FieldGrid>
            <TextField
              label={t("superAdmin.CreateTenantDialog.displayName")}
              size="small"
              fullWidth
              required
              {...register("display_name", { required: t("validation.required") })}
              error={!!errors.display_name}
              helperText={errors.display_name?.message}
            />
            <TextField
              label={t("superAdmin.CreateTenantDialog.contactEmail")}
              size="small"
              fullWidth
              required
              type="email"
              {...register("contact_email", {
                required: t("validation.required"),
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t("superAdmin.CreateTenantDialog.invalidEmail") },
              })}
              error={!!errors.contact_email}
              helperText={errors.contact_email?.message}
            />
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<LockOutlinedIcon />}
          title={t("superAdmin.CreateTenantDialog.adminAccount")}
          hint={t("superAdmin.CreateTenantDialog.credentialsForTheTenantS")}
        >
          <FieldGrid>
            <TextField
              label={t("superAdmin.CreateTenantDialog.adminUsername")}
              size="small"
              fullWidth
              required
              {...register("admin_username", { required: t("validation.required") })}
              error={!!errors.admin_username}
              helperText={errors.admin_username?.message}
            />
            <TextField
              label={t("superAdmin.CreateTenantDialog.adminPassword")}
              size="small"
              fullWidth
              required
              type="password"
              {...register("admin_password", {
                required: t("validation.required"),
                minLength: { value: 8, message: t("superAdmin.CreateTenantDialog.min8Characters") },
              })}
              error={!!errors.admin_password}
              helperText={errors.admin_password?.message}
              autoComplete="new-password"
            />
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<StorageOutlinedIcon />}
          title={t("superAdmin.CreateTenantDialog.databaseTier")}
          hint={t("superAdmin.CreateTenantDialog.theSlugDeterminesTheFinal")}
        >
          <TextField
            label={t("superAdmin.CreateTenantDialog.databaseSlug")}
            size="small"
            fullWidth
            required
            {...register("db_name_slug", {
              required: t("validation.required"),
              pattern: {
                value: /^[a-z0-9_]+$/,
                message: t("superAdmin.CreateTenantDialog.onlyLowercaseLettersNumbersUnderscores"),
              },
            })}
            error={!!errors.db_name_slug}
            helperText={
              errors.db_name_slug?.message ?? t("superAdmin.CreateTenantDialog.finalDbNameGeargridSlug")
            }
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography
                      variant="caption"
                      sx={{ color: "text.disabled", fontFamily: "monospace" }}
                    >
                      {t("superAdmin.CreateTenantDialog.geargrid")}
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
                <TextField {...field} select label={t("superAdmin.CreateTenantDialog.tier")} size="small" fullWidth>
                  {["Basic", "Pro", "Enterprise"].map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label={t("superAdmin.CreateTenantDialog.monthlyRate")}
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
                        {t("superAdmin.CreateTenantDialog.lkrMo")}
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
