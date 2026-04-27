import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Avatar,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import EngineeringIcon from "@mui/icons-material/Engineering";
import SpeedIcon from "@mui/icons-material/Speed";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import {
  useUpdateTechnician,
  useToggleTechnicianStatus,
  useTechnicianRoster,
  useAddTechnician,
} from "@/features/inventory/hooks/useDefectHooks";

export default function WorkforceRoute() {
  const { data: roster = [], isLoading } = useTechnicianRoster();
  const addMutation = useAddTechnician();
  const updateMutation = useUpdateTechnician();
  const toggleMutation = useToggleTechnicianStatus();

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);

  // Menu State
  const [anchorEl, setAnchorEl] = useState<{
    [key: number]: HTMLElement | null;
  }>({});

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    nic_no: "",
    first_name: "",
    last_name: "",
    phone_number: "",
  });

  const showToast = (message: string, severity: "success" | "error") =>
    setToast({ open: true, message, severity });

  // --- ACTIONS ---
  const handleOpenAdd = () => {
    setIsEditMode(false);
    setSelectedTechId(null);
    setFormData({
      username: "",
      email: "",
      nic_no: "",
      first_name: "",
      last_name: "",
      phone_number: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tech: any) => {
    setIsEditMode(true);
    setSelectedTechId(tech.user_id || tech.id);
    setFormData({
      username: tech.username,
      email: tech.email,
      nic_no: tech.nic_no,
      first_name: tech.first_name,
      last_name: tech.last_name,
      phone_number: tech.phone_number || "",
    });
    setAnchorEl({ ...anchorEl, [tech.user_id || tech.id]: null }); // Close menu
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.first_name || !formData.email)
      return showToast("Name and Email are required.", "error");

    if (isEditMode && selectedTechId) {
      updateMutation.mutate(
        { id: selectedTechId, data: formData },
        {
          onSuccess: () => {
            showToast("Technician updated successfully!", "success");
            setIsModalOpen(false);
          },
          onError: (err: any) =>
            showToast(err.response?.data?.message || "Update failed.", "error"),
        },
      );
    } else {
      addMutation.mutate(formData, {
        onSuccess: () => {
          showToast("Technician added successfully!", "success");
          setIsModalOpen(false);
        },
        onError: (err: any) =>
          showToast(
            err.response?.data?.message || "Registration failed.",
            "error",
          ),
      });
    }
  };

  const handleToggleStatus = (tech: any) => {
    const newStatus = tech.is_active === 1 ? false : true; // Using the boolean mapping from your controller
    toggleMutation.mutate(
      { id: tech.user_id || tech.id, isActive: newStatus },
      {
        onSuccess: () =>
          showToast(
            `Technician ${newStatus ? "activated" : "deactivated"}.`,
            "success",
          ),
        onError: (err: any) =>
          showToast(
            err.response?.data?.message || "Failed to change status.",
            "error",
          ),
      },
    );
    setAnchorEl({ ...anchorEl, [tech.user_id || tech.id]: null }); // Close menu
  };

  if (isLoading)
    return (
      <Box p={5} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 5,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight="800"
            color="text.primary"
            gutterBottom
          >
            Workforce Management
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Manage your repair technicians and monitor their current workloads.
          </Typography>
        </Box>
        <Button
          variant="contained"
          disableElevation
          startIcon={<GroupAddIcon />}
          onClick={handleOpenAdd}
        >
          Add Technician
        </Button>
      </Box>

      {/* ROSTER CARDS */}
      <Grid container spacing={3}>
        {roster.map((tech: any) => {
          const isDeactivated =
            tech.is_active === 0 || tech.is_active === false;
          const workloadColor = isDeactivated
            ? "default"
            : tech.active_tickets > 5
              ? "error"
              : tech.active_tickets > 2
                ? "warning"
                : "success";
          const workloadStatus = isDeactivated
            ? "Inactive"
            : tech.active_tickets > 5
              ? "Overloaded"
              : tech.active_tickets > 2
                ? "Busy"
                : "Available";
          const techId = tech.user_id || tech.id;

          return (
            <Grid item xs={12} md={6} lg={4} key={techId}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: "1px solid #e2e8f0",
                  borderRadius: 3,
                  opacity: isDeactivated ? 0.6 : 1,
                  transition: "0.2s",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <Avatar
                      sx={{
                        width: 50,
                        height: 50,
                        bgcolor: isDeactivated ? "grey.400" : "primary.main",
                        fontWeight: "bold",
                      }}
                    >
                      {tech.first_name[0]}
                      {tech.last_name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        lineHeight={1.2}
                      >
                        {tech.first_name} {tech.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {tech.email}
                      </Typography>
                    </Box>
                  </Box>

                  {/* ACTION MENU */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      label={workloadStatus}
                      color={workloadColor as any}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: "bold" }}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) =>
                        setAnchorEl({ ...anchorEl, [techId]: e.currentTarget })
                      }
                    >
                      <MoreVertIcon />
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl[techId]}
                      open={Boolean(anchorEl[techId])}
                      onClose={() =>
                        setAnchorEl({ ...anchorEl, [techId]: null })
                      }
                    >
                      <MenuItem onClick={() => handleOpenEdit(tech)}>
                        <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                        Details
                      </MenuItem>
                      <MenuItem
                        onClick={() => handleToggleStatus(tech)}
                        sx={{
                          color: isDeactivated ? "success.main" : "error.main",
                        }}
                      >
                        {isDeactivated ? (
                          <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                        ) : (
                          <BlockIcon fontSize="small" sx={{ mr: 1 }} />
                        )}
                        {isDeactivated
                          ? "Reactivate Worker"
                          : "Deactivate Worker"}
                      </MenuItem>
                    </Menu>
                  </Box>
                </Box>

                <Box sx={{ bgcolor: "#f8fafc", p: 2, borderRadius: 2, mt: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="text.secondary"
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <EngineeringIcon fontSize="small" /> Active Tickets
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {tech.active_tickets}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="text.secondary"
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <SpeedIcon fontSize="small" /> Total Items Pending
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {tech.total_items_pending}
                    </Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={Math.min((tech.active_tickets / 10) * 100, 100)}
                    color={workloadColor as any}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      mt: 2,
                      bgcolor: "#e2e8f0",
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* MASTER CRUD MODAL (Handles both Add and Edit) */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight="bold">
          {isEditMode ? "Edit Technician Details" : "Register New Technician"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
              />
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
              />
            </Box>

            {/* We only allow editing username/nic on Add. On Edit, these are usually locked for enterprise identity. */}
            {!isEditMode && (
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
                <TextField
                  fullWidth
                  label="NIC Number"
                  value={formData.nic_no}
                  onChange={(e) =>
                    setFormData({ ...formData, nic_no: e.target.value })
                  }
                />
              </Box>
            )}

            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phone_number}
              onChange={(e) =>
                setFormData({ ...formData, phone_number: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setIsModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disableElevation
            disabled={updateMutation.isPending || addMutation.isPending}
          >
            {isEditMode ? "Save Changes" : "Register Worker"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 500 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
