import { useState } from "react";
import {
  Modal, Box, Typography, Button, Stack,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedUsers: number[];
  roles: any[];
  onAssign: (roleId: string) => void;
}

export default function BulkAssignModal({ open, onClose, selectedUsers, roles, onAssign }: Props) {
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
        <Typography variant="h6" fontWeight="bold" mb={2}>Bulk Assign Role</Typography>
        <Typography variant="body2" mb={2}>
          You are about to assign a role to {selectedUsers.length} selected user(s).
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Role to Assign</InputLabel>
          <Select
            value={selectedRole}
            label="Role to Assign"
            onChange={(e) => setSelectedRole(e.target.value as string)}
          >
            {roles.map((role: any) => (
              <MenuItem key={role.role_id} value={role.role_id}>{role.role_name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onClose} color="inherit">Cancel</Button>
          <Button onClick={handleAssign} variant="contained" disabled={!selectedRole}>Assign</Button>
        </Stack>
      </Box>
    </Modal>
  );
}
