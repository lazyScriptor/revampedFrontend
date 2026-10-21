import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  TextField,
} from "@mui/material";
import Person2OutlinedIcon from "@mui/icons-material/Person2Outlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import ToggleOnOutlinedIcon from "@mui/icons-material/ToggleOnOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  FieldGrid,
  FormDialogShell,
  FormFooterMeta,
  FormSection,
  ToggleRow,
} from "@/components/forms/FormDialogShell";
import {
  useCreateTenantUser,
  useUpdateTenantUser,
  useTenantRoles,
} from "@/features/super-admin/hooks/useSuperAdminHooks";
import { useTranslation } from "react-i18next";

interface FormValues {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role_id: string;
  is_active: boolean;
}

interface ExistingUser {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role_ids: number[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  editUser?: ExistingUser | null;
}

export default function TenantUserDialog({ open, onClose, tenantId, editUser }: Props) {
  const { t } = useTranslation();
  const isEdit = !!editUser;
  const { data: roles = [] } = useTenantRoles(tenantId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      username: "",
      email: "",
      first_name: "",
      last_name: "",
      password: "",
      role_id: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (isEdit && editUser) {
        reset({
          username: editUser.username,
          email: editUser.email,
          first_name: editUser.first_name,
          last_name: editUser.last_name,
          password: "",
          role_id: editUser.role_ids?.[0]?.toString() || "",
          is_active: editUser.is_active,
        });
      } else {
        reset({
          username: "",
          email: "",
          first_name: "",
          last_name: "",
          password: "",
          role_id: "",
          is_active: true,
        });
      }
    }
  }, [open, editUser, isEdit, reset]);

  const createMutation = useCreateTenantUser();
  const updateMutation = useUpdateTenantUser();
  const activeMutation = isEdit ? updateMutation : createMutation;

  const onSubmit = (values: FormValues) => {
    if (isEdit && editUser) {
      const payload: Record<string, unknown> = {
        username: values.username,
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        is_active: values.is_active,
        role_id: values.role_id ? parseInt(values.role_id) : undefined,
      };
      if (values.password) payload.password = values.password;

      updateMutation.mutate(
        { tenantId, userId: editUser.user_id, data: payload },
        {
          onSuccess: () => {
            reset();
            onClose();
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          tenantId,
          data: {
            username: values.username,
            email: values.email,
            first_name: values.first_name,
            last_name: values.last_name,
            password: values.password,
            role_id: values.role_id ? parseInt(values.role_id) : undefined,
          },
        },
        {
          onSuccess: () => {
            reset();
            onClose();
          },
        },
      );
    }
  };

  const handleClose = () => {
    if (activeMutation.isPending) return;
    reset();
    createMutation.reset();
    updateMutation.reset();
    onClose();
  };

  const errorCount = Object.keys(errors).length;
  const mutationError =
    activeMutation.isError &&
    (activeMutation.error instanceof Error
      ? activeMutation.error.message
      : t("superAdmin.TenantUserDialog.operationFailed"));

  const avatarText = isEdit && editUser
    ? `${editUser.first_name?.[0] || ""}${editUser.last_name?.[0] || ""}`.toUpperCase() || "U"
    : "+";

  return (
    <FormDialogShell
      open={open}
      onClose={handleClose}
      maxWidth="md"
      eyebrow={isEdit ? t("admin.UserFormDrawer.editUser") : t("superAdmin.TenantDetailPanel.newUser")}
      title={
        isEdit && editUser
          ? `${editUser.first_name} ${editUser.last_name}`.trim() || editUser.username
          : t("superAdmin.TenantUserDialog.createATenantUser")
      }
      subtitle={
        isEdit
          ? t("superAdmin.TenantUserDialog.updateAccountDetailsAndRole")
          : t("superAdmin.TenantUserDialog.provisionsANewLoginInside")
      }
      avatarText={avatarText}
      footer={
        <>
          <FormFooterMeta>
            {errorCount > 0
              ? t("forms.fixIssuesBeforeSaving", { count: errorCount })
              : mutationError
                ? mutationError
                : isDirty && !activeMutation.isPending
                  ? t("common.unsavedChanges")
                  : ""}
          </FormFooterMeta>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleClose} disabled={activeMutation.isPending} color="inherit">
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              form="tenant-user-form"
              variant="contained"
              disabled={activeMutation.isPending}
              startIcon={
                activeMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined
              }
            >
              {activeMutation.isPending
                ? t("common.saving")
                : isEdit
                  ? t("common.saveChanges")
                  : t("admin.users.createUser")}
            </Button>
          </Box>
        </>
      }
    >
      <Box
        component="form"
        id="tenant-user-form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {mutationError && (
          <Alert severity="error" variant="outlined" icon={<WarningAmberIcon />}>
            {mutationError}
          </Alert>
        )}

        <FormSection
          icon={<Person2OutlinedIcon />}
          title={t("admin.RoleFormDrawer.identity")}
          hint={t("superAdmin.TenantUserDialog.personalInformationShownAcrossThe")}
        >
          <FieldGrid>
            <TextField
              label={t("common.firstName")}
              size="small"
              required
              fullWidth
              {...register("first_name", { required: t("validation.required") })}
              error={!!errors.first_name}
              helperText={errors.first_name?.message}
            />
            <TextField
              label={t("common.lastName")}
              size="small"
              required
              fullWidth
              {...register("last_name", { required: t("validation.required") })}
              error={!!errors.last_name}
              helperText={errors.last_name?.message}
            />
          </FieldGrid>
          <FieldGrid>
            <TextField
              label={t("common.username")}
              size="small"
              required
              fullWidth
              {...register("username", { required: t("validation.required") })}
              error={!!errors.username}
              helperText={errors.username?.message}
            />
            <TextField
              label={t("common.email")}
              size="small"
              type="email"
              required
              fullWidth
              {...register("email", {
                required: t("validation.required"),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t("superAdmin.CreateTenantDialog.invalidEmail"),
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<LockOutlinedIcon />}
          title={isEdit ? t("admin.UserFormDrawer.resetPassword") : t("admin.UserFormDrawer.initialPassword")}
          hint={
            isEdit
              ? t("superAdmin.TenantUserDialog.leaveBlankToKeepThe")
              : t("superAdmin.TenantUserDialog.providedOnFirstLoginThey")
          }
        >
          <TextField
            label={isEdit ? t("profile.newPassword") : t("common.password")}
            size="small"
            type="password"
            fullWidth
            autoComplete="new-password"
            {...register(
              "password",
              isEdit
                ? {}
                : {
                    required: t("validation.required"),
                    minLength: { value: 8, message: t("superAdmin.CreateTenantDialog.min8Characters") },
                  },
            )}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
        </FormSection>

        <FormSection
          icon={<SecurityOutlinedIcon />}
          title={t("superAdmin.TenantUserDialog.roleAssignment")}
          hint={t("superAdmin.TenantUserDialog.theRoleGovernsWhichPermissions")}
        >
          <Controller
            name="role_id"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label={t("superAdmin.TenantUserDialog.role")} size="small" fullWidth>
                <MenuItem value="">{t("superAdmin.TenantUserDialog.noRole")}</MenuItem>
                {roles.map((r) => (
                  <MenuItem key={r.role_id} value={r.role_id.toString()}>
                    {r.role_name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </FormSection>

        {isEdit && (
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <ToggleRow
                icon={<ToggleOnOutlinedIcon />}
                title={t("superAdmin.TenantUserDialog.accountActive")}
                hint={t("superAdmin.TenantUserDialog.inactiveUsersCannotSignIn")}
                checked={!!field.value}
                onChange={field.onChange}
              />
            )}
          />
        )}
      </Box>
    </FormDialogShell>
  );
}
