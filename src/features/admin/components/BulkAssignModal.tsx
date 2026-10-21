import { useState } from "react";
import {
  Modal, Box, Typography, Button, Stack,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedUsers: number[];
  roles: any[];
  onAssign: (roleId: string) => void;
}

export default function BulkAssignModal({ open, onClose, selectedUsers, roles, onAssign }: Props) {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState("");

  const handleAssign = () => {
    if (selectedRole) {
      onAssign(selectedRole);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 400, bgcolor: "background.paper", boxShadow: 24, p: 4, borderRadius: 2,
      }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>{t("admin.BulkAssignModal.bulkAssignRole")}</Typography>
        <Typography variant="body2" mb={2}>
          {t("admin.BulkAssignModal.youAreAboutToAssign", { selectedUsersCount: selectedUsers.length })}
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>{t("admin.BulkAssignModal.roleToAssign")}</InputLabel>
          <Select
            value={selectedRole}
            label={t("admin.BulkAssignModal.roleToAssign")}
            onChange={(e) => setSelectedRole(e.target.value as string)}
          >
            {roles.map((role: any) => (
              <MenuItem key={role.role_id} value={role.role_id}>{role.role_name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onClose} color="inherit">{t("common.cancel")}</Button>
          <Button onClick={handleAssign} variant="contained" disabled={!selectedRole}>{t("admin.BulkAssignModal.assign")}</Button>
        </Stack>
      </Box>
    </Modal>
  );
}
