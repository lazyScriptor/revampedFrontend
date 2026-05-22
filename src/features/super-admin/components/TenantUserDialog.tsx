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
      : "Operation failed.");

  const avatarText = isEdit && editUser
    ? `${editUser.first_name?.[0] || ""}${editUser.last_name?.[0] || ""}`.toUpperCase() || "U"
    : "+";

  return (
    <FormDialogShell
      open={open}
      onClose={handleClose}
      maxWidth="md"
      eyebrow={isEdit ? "Edit User" : "New User"}
      title={
        isEdit && editUser
          ? `${editUser.first_name} ${editUser.last_name}`.trim() || editUser.username
          : "Create a tenant user"
      }
      subtitle={
        isEdit
          ? "Update account details and role assignment."
          : "Provisions a new login inside this tenant."
      }
      avatarText={avatarText}
      footer={
        <>
          <FormFooterMeta>
            {errorCount > 0
              ? `Fix ${errorCount} issue${errorCount > 1 ? "s" : ""} before saving`
              : mutationError
                ? mutationError
                : isDirty && !activeMutation.isPending
                  ? "Unsaved changes"
                  : ""}
          </FormFooterMeta>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={handleClose} disabled={activeMutation.isPending} color="inherit">
              Cancel
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
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create user"}
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
          title="Identity"
          hint="Personal information shown across the tenant's product."
        >
          <FieldGrid>
            <TextField
              label="First name"
              size="small"
              required
              fullWidth
              {...register("first_name", { required: "Required" })}
              error={!!errors.first_name}
              helperText={errors.first_name?.message}
            />
            <TextField
              label="Last name"
              size="small"
              required
              fullWidth
              {...register("last_name", { required: "Required" })}
              error={!!errors.last_name}
              helperText={errors.last_name?.message}
            />
          </FieldGrid>
          <FieldGrid>
            <TextField
              label="Username"
              size="small"
              required
              fullWidth
              {...register("username", { required: "Required" })}
              error={!!errors.username}
              helperText={errors.username?.message}
            />
            <TextField
              label="Email"
              size="small"
              type="email"
              required
              fullWidth
              {...register("email", {
                required: "Required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Invalid email",
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </FieldGrid>
        </FormSection>

        <FormSection
          icon={<LockOutlinedIcon />}
          title={isEdit ? "Reset password" : "Initial password"}
          hint={
            isEdit
              ? "Leave blank to keep the user's existing password."
              : "Provided on first login. They can change it later from their profile."
          }
        >
          <TextField
            label={isEdit ? "New password" : "Password"}
            size="small"
            type="password"
            fullWidth
            autoComplete="new-password"
            {...register(
              "password",
              isEdit
                ? {}
                : {
                    required: "Required",
                    minLength: { value: 8, message: "Min 8 characters" },
                  },
            )}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
        </FormSection>

        <FormSection
          icon={<SecurityOutlinedIcon />}
          title="Role assignment"
          hint="The role governs which permissions the user inherits."
        >
          <Controller
            name="role_id"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Role" size="small" fullWidth>
                <MenuItem value="">— No role —</MenuItem>
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
                title="Account active"
                hint="Inactive users cannot sign in but their data remains intact."
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
