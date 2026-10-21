import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  FormDialogShell,
  FormSection,
} from "@/components/forms/FormDialogShell";
import { roleApi } from "../api/admin.api";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: any;
}

const blankForm = { roleName: "", description: "", hierarchyLevel: 10 };

export default function RoleFormDialog({
  open,
  onClose,
  onSuccess,
  roleToEdit = null,
}: Props) {
  const { t } = useTranslation();
  const isEditMode = Boolean(roleToEdit);

  const [formData, setFormData] = useState(blankForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (roleToEdit) {
      setFormData({
        roleName: roleToEdit.role_name || "",
        description: roleToEdit.description || "",
        hierarchyLevel: roleToEdit.hierarchy_level ?? 10,
      });
    } else {
      setFormData(blankForm);
    }
    setError(null);
    setDirty(false);
  }, [roleToEdit, open]);

  const handleChange =
    (field: keyof typeof blankForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]:
          field === "hierarchyLevel"
            ? parseInt(e.target.value) || 0
            : e.target.value,
      }));
      setDirty(true);
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isEditMode) {
        await roleApi.updateRole(roleToEdit.role_id, {
          role_name: formData.roleName,
          description: formData.description,
          hierarchy_level: formData.hierarchyLevel,
        });
      } else {
        await roleApi.createRole(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || t("admin.RoleFormDrawer.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const lockedSystemName = isEditMode && roleToEdit?.is_system_default;

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="sm"
      eyebrow={isEditMode ? t("pages.Permissions.editRole") : t("admin.RoleFormDrawer.newRole")}
      title={isEditMode ? roleToEdit?.role_name || t("superAdmin.TenantUserDialog.role") : t("admin.RoleFormDrawer.createARole")}
      subtitle={t("admin.RoleFormDrawer.defineAPrivilegeLevelAssign")}
      avatarText={(formData.roleName || "R")[0].toUpperCase()}
      footer={
        <>
          <Box sx={{ minWidth: 0, color: "text.secondary", fontSize: "0.78rem" }}>
            {dirty && !loading && !error ? t("common.unsavedChanges") : ""}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={onClose} disabled={loading} color="inherit">
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              form="role-form"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {loading ? t("common.saving") : isEditMode ? t("common.saveChanges") : t("admin.roles.createRole")}
            </Button>
          </Box>
        </>
      }
    >
      <Box
        component="form"
        id="role-form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {error && (
          <Alert severity="error" variant="outlined" icon={<WarningAmberIcon />}>
            {error}
          </Alert>
        )}

        <FormSection
          icon={<SecurityOutlinedIcon />}
          title={t("admin.RoleFormDrawer.identity")}
          hint={t("admin.RoleFormDrawer.theNameShownInPickers")}
        >
          <TextField
            label={t("admin.RoleFormDrawer.roleName")}
            required
            value={formData.roleName}
            onChange={handleChange("roleName")}
            size="small"
            fullWidth
            disabled={lockedSystemName}
            helperText={
              lockedSystemName ? t("admin.RoleFormDrawer.systemDefaultRoleNamesCannot") : " "
            }
          />
        </FormSection>

        <FormSection
          icon={<TextSnippetOutlinedIcon />}
          title={t("admin.RoleFormDrawer.descriptionPrivilegeLevel")}
          hint={t("admin.RoleFormDrawer.higherNumbersRepresentMorePrivileged")}
        >
          <TextField
            label={t("common.description")}
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={handleChange("description")}
            size="small"
          />
          <TextField
            label={t("admin.RoleFormDrawer.hierarchyLevel")}
            type="number"
            required
            value={formData.hierarchyLevel}
            onChange={handleChange("hierarchyLevel")}
            size="small"
            fullWidth
            helperText={t("admin.RoleFormDrawer.100HighestUsersCanOnly")}
          />
        </FormSection>
      </Box>
    </FormDialogShell>
  );
}
