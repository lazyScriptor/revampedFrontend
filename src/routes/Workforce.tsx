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
  InputAdornment,
  Menu,
  MenuItem,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import EngineeringIcon from "@mui/icons-material/Engineering";
import SpeedIcon from "@mui/icons-material/Speed";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BuildIcon from "@mui/icons-material/Build";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import VerifiedIcon from "@mui/icons-material/Verified";
import ConstructionIcon from "@mui/icons-material/Construction";

import { useAuthStore } from "@/stores/useAuthStore";
import {
  useUpdateTechnician,
  useToggleTechnicianStatus,
  useTechnicianRoster,
  useAddTechnician,
  useMyTickets,
  useResolveDefect,
} from "@/features/inventory/hooks/useDefectHooks";
import { formatDisplayDate } from "@/lib/dates";

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────
const getWorkloadColor = (active: number, isDeactivated: boolean) => {
  if (isDeactivated) return "default";
  if (active > 5) return "error";
  if (active > 2) return "warning";
  return "success";
};

const getWorkloadLabel = (active: number, isDeactivated: boolean) => {
  if (isDeactivated) return "Inactive";
  if (active > 5) return "Overloaded";
  if (active > 2) return "Busy";
  return "Available";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "In Repair": return "warning";
    case "Partially Resolved": return "info";
    case "Pending Assignment": return "default";
    case "Resolved": return "success";
    default: return "default";
  }
};

// ─────────────────────────────────────────────
// Toast hook
// ─────────────────────────────────────────────
const useToast = () => {
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
  const show = (message: string, severity: "success" | "error" = "success") =>
    setToast({ open: true, message, severity });
  const close = () => setToast((t) => ({ ...t, open: false }));
  return { toast, show, close };
};

// ─────────────────────────────────────────────
// Resolve Ticket Dialog
// ─────────────────────────────────────────────
function ResolveDialog({
  open,
  ticket,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  ticket: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [qty, setQty] = useState("1");
  const resolveMutation = useResolveDefect();

  const handleResolve = () => {
    const quantity = parseInt(qty);
    if (!quantity || quantity < 1 || quantity > ticket?.pending_quantity) {
      onError(`Enter a quantity between 1 and ${ticket?.pending_quantity}`);
      return;
    }
    resolveMutation.mutate(
      { defectId: ticket.defect_log_id, quantity },
      {
        onSuccess: () => {
          onSuccess(`${quantity} item(s) marked as repaired.`);
          onClose();
        },
        onError: (err: any) =>
          onError(err.response?.data?.message || "Failed to resolve ticket."),
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: "bold" }}>Mark Items as Repaired</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Equipment: <strong>{ticket?.Equipment?.equipment_name}</strong>
          <br />
          Pending: <strong>{ticket?.pending_quantity}</strong> item(s)
        </Typography>
        <TextField
          fullWidth
          label="Quantity Repaired"
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          slotProps={{ htmlInput: { min: 1, max: ticket?.pending_quantity } }}
          helperText={`Max: ${ticket?.pending_quantity}`}
        />
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          onClick={handleResolve}
          variant="contained"
          disableElevation
          disabled={resolveMutation.isPending}
          startIcon={<DoneAllIcon />}
        >
          Confirm Repair
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// TECHNICIAN VIEW — personal work dashboard
// ─────────────────────────────────────────────
function TechnicianDashboard() {
  const { data: tickets = [], isLoading } = useMyTickets();
  const { toast, show, close } = useToast();
  const [resolveTarget, setResolveTarget] = useState<any>(null);
  const user = useAuthStore((s) => s.user);

  const activeTickets = tickets.filter((t: any) => t.repair_status !== "Resolved");
  const pendingItems = activeTickets.reduce((sum: number, t: any) => sum + (t.pending_quantity || 0), 0);
  const inRepairCount = activeTickets.filter((t: any) => t.repair_status === "In Repair").length;

  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <CircularProgress />
      </Box>
    );

  const statCards = [
    { label: "Active Tickets", value: activeTickets.length, icon: <AssignmentIcon />, color: "#3b82f6" },
    { label: "Items Pending Repair", value: pendingItems, icon: <ConstructionIcon />, color: "#f59e0b" },
    { label: "In Repair Now", value: inRepairCount, icon: <BuildIcon />, color: "#8b5cf6" },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48, fontWeight: "bold" }}>
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }} color="text.primary">
              My Workspace
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Welcome back, {user?.username} — here's your current workload.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid size={{ xs: 12, sm: 4 }} key={card.label}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid #e2e8f0",
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: `${card.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: card.color,
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800 }} color="text.primary">
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tickets Table */}
      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3 }}>
        <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 1 }}>
          <PendingActionsIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            My Active Repair Tickets
          </Typography>
        </Box>
        <Divider />
        {activeTickets.length === 0 ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <VerifiedIcon sx={{ fontSize: 56, color: "success.light", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              All clear! No active tickets assigned to you.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Equipment</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Serial No.</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Pending
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reported</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeTickets.map((ticket: any) => (
                  <TableRow key={ticket.defect_log_id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {ticket.Equipment?.equipment_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                        {ticket.Equipment?.serial_number || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ticket.repair_status}
                        color={getStatusColor(ticket.repair_status) as any}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={ticket.pending_quantity}
                        size="small"
                        sx={{ fontWeight: 700, bgcolor: "#fff7ed", color: "#c2410c" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220 }} noWrap>
                        {ticket.defect_description || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDisplayDate(ticket.reported_date)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Mark items as repaired">
                        <Button
                          size="small"
                          variant="contained"
                          disableElevation
                          startIcon={<DoneAllIcon />}
                          onClick={() => setResolveTarget(ticket)}
                          sx={{ textTransform: "none", borderRadius: 2 }}
                        >
                          Resolve
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {resolveTarget && (
        <ResolveDialog
          open={!!resolveTarget}
          ticket={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onSuccess={(msg) => show(msg, "success")}
          onError={(msg) => show(msg, "error")}
        />
      )}

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={close} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={toast.severity} variant="filled" sx={{ width: "100%", fontWeight: 500 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ─────────────────────────────────────────────
// ADMIN VIEW — workforce roster management
// ─────────────────────────────────────────────
const EMPTY_FORM = {
  username: "",
  email: "",
  nic_no: "",
  first_name: "",
  last_name: "",
  phone_number: "",
  password: "",
};

function AdminRosterView() {
  const { data: roster = [], isLoading } = useTechnicianRoster();
  const addMutation = useAddTechnician();
  const updateMutation = useUpdateTechnician();
  const toggleMutation = useToggleTechnicianStatus();
  const { toast, show, close } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<{ [key: number]: HTMLElement | null }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const activeTechs = roster.filter((t: any) => t.is_active !== 0 && t.is_active !== false);
  const overloadedCount = activeTechs.filter((t: any) => t.active_tickets > 5).length;
  const busyCount = activeTechs.filter((t: any) => t.active_tickets > 2 && t.active_tickets <= 5).length;
  const availableCount = activeTechs.filter((t: any) => t.active_tickets <= 2).length;

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setSelectedTechId(null);
    setFormData(EMPTY_FORM);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tech: any) => {
    const techId = tech.user_id || tech.id;
    setIsEditMode(true);
    setSelectedTechId(techId);
    setFormData({
      username: tech.username || "",
      email: tech.email || "",
      nic_no: tech.nic_no || "",
      first_name: tech.first_name || "",
      last_name: tech.last_name || "",
      phone_number: tech.phone_number || "",
      password: "",
    });
    setAnchorEl((prev) => ({ ...prev, [techId]: null }));
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.first_name || !formData.email)
      return show("Name and email are required.", "error");
    if (!isEditMode && !formData.password)
      return show("Password is required.", "error");
    if (!isEditMode && formData.password.length < 8)
      return show("Password must be at least 8 characters.", "error");

    if (isEditMode && selectedTechId) {
      updateMutation.mutate(
        { id: selectedTechId, data: formData },
        {
          onSuccess: () => { show("Technician updated."); setIsModalOpen(false); },
          onError: (err: any) => show(err.response?.data?.message || "Update failed.", "error"),
        }
      );
    } else {
      addMutation.mutate(formData, {
        onSuccess: () => { show("Technician registered successfully!"); setIsModalOpen(false); },
        onError: (err: any) => show(err.response?.data?.message || "Registration failed.", "error"),
      });
    }
  };

  const handleToggleStatus = (tech: any) => {
    const techId = tech.user_id || tech.id;
    const newStatus = tech.is_active === 0 || tech.is_active === false ? true : false;
    toggleMutation.mutate(
      { id: techId, isActive: newStatus },
      {
        onSuccess: () => show(`Technician ${newStatus ? "activated" : "deactivated"}.`),
        onError: (err: any) => show(err.response?.data?.message || "Status change failed.", "error"),
      }
    );
    setAnchorEl((prev) => ({ ...prev, [techId]: null }));
  };

  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <CircularProgress />
      </Box>
    );

  const summaryCards = [
    { label: "Total Technicians", value: roster.length, color: "#3b82f6", icon: <EngineeringIcon /> },
    { label: "Available", value: availableCount, color: "#10b981", icon: <CheckCircleIcon /> },
    { label: "Busy", value: busyCount, color: "#f59e0b", icon: <SpeedIcon /> },
    { label: "Overloaded", value: overloadedCount, color: "#ef4444", icon: <BuildIcon /> },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }} color="text.primary" gutterBottom>
            Workforce Management
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Monitor technician availability and manage your repair team.
          </Typography>
        </Box>
        <Button variant="contained" disableElevation startIcon={<GroupAddIcon />} onClick={handleOpenAdd}>
          Add Technician
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: "1px solid #e2e8f0",
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: `${card.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: card.color,
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800 }} color="text.primary">
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Roster Cards */}
      {roster.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 8, textAlign: "center", border: "1px solid #e2e8f0", borderRadius: 3 }}
        >
          <EngineeringIcon sx={{ fontSize: 64, color: "action.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No technicians registered yet.</Typography>
          <Button variant="contained" disableElevation sx={{ mt: 3 }} onClick={handleOpenAdd}>
            Register First Technician
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {roster.map((tech: any) => {
            const techId = tech.user_id || tech.id;
            const isDeactivated = tech.is_active === 0 || tech.is_active === false;
            const workloadColor = getWorkloadColor(tech.active_tickets, isDeactivated);
            const workloadLabel = getWorkloadLabel(tech.active_tickets, isDeactivated);

            return (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={techId}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    border: "1px solid #e2e8f0",
                    borderRadius: 3,
                    opacity: isDeactivated ? 0.6 : 1,
                    transition: "0.2s",
                    "&:hover": { borderColor: "primary.main", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" },
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <Avatar
                        sx={{
                          width: 52,
                          height: 52,
                          bgcolor: isDeactivated ? "grey.400" : "primary.main",
                          fontWeight: "bold",
                          fontSize: "1.1rem",
                        }}
                      >
                        {tech.first_name?.[0]}
                        {tech.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {tech.first_name} {tech.last_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {tech.email}
                        </Typography>
                        {tech.phone_number && (
                          <Typography variant="caption" color="text.disabled">
                            {tech.phone_number}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Chip
                        label={workloadLabel}
                        color={workloadColor as any}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => setAnchorEl((prev) => ({ ...prev, [techId]: e.currentTarget }))}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      <Menu
                        anchorEl={anchorEl[techId]}
                        open={Boolean(anchorEl[techId])}
                        onClose={() => setAnchorEl((prev) => ({ ...prev, [techId]: null }))}
                      >
                        <MenuItem onClick={() => handleOpenEdit(tech)}>
                          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit Details
                        </MenuItem>
                        <Divider />
                        <MenuItem
                          onClick={() => handleToggleStatus(tech)}
                          sx={{ color: isDeactivated ? "success.main" : "error.main" }}
                        >
                          {isDeactivated ? (
                            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                          ) : (
                            <BlockIcon fontSize="small" sx={{ mr: 1 }} />
                          )}
                          {isDeactivated ? "Reactivate" : "Deactivate"}
                        </MenuItem>
                      </Menu>
                    </Box>
                  </Box>

                  <Box sx={{ bgcolor: "#f8fafc", p: 2, borderRadius: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <EngineeringIcon sx={{ fontSize: 15 }} /> Active Tickets
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {tech.active_tickets}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <SpeedIcon sx={{ fontSize: 15 }} /> Items Pending
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {tech.total_items_pending}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((tech.active_tickets / 8) * 100, 100)}
                      color={workloadColor as any}
                      sx={{ height: 6, borderRadius: 3, bgcolor: "#e2e8f0" }}
                    />
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block", textAlign: "right" }}>
                      Capacity: {tech.active_tickets}/8 tickets
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {isEditMode ? "Edit Technician Details" : "Register New Technician"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData((f) => ({ ...f, first_name: e.target.value }))}
              />
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData((f) => ({ ...f, last_name: e.target.value }))}
              />
            </Box>

            {!isEditMode && (
              <>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={formData.username}
                    onChange={(e) => setFormData((f) => ({ ...f, username: e.target.value }))}
                  />
                  <TextField
                    fullWidth
                    label="NIC Number"
                    value={formData.nic_no}
                    onChange={(e) => setFormData((f) => ({ ...f, nic_no: e.target.value }))}
                  />
                </Box>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                  helperText="Minimum 8 characters"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end">
                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </>
            )}

            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={formData.phone_number}
              onChange={(e) => setFormData((f) => ({ ...f, phone_number: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setIsModalOpen(false)} color="inherit">Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disableElevation
            disabled={updateMutation.isPending || addMutation.isPending}
          >
            {isEditMode ? "Save Changes" : "Register Technician"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={close} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={toast.severity} variant="filled" sx={{ width: "100%", fontWeight: 500 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ─────────────────────────────────────────────
// Root export — decides which view to render
// ─────────────────────────────────────────────
export default function WorkforceRoute() {
  const hasManage = useAuthStore((s) => s.hasPermission("workforce:manage"));
  return hasManage ? <AdminRosterView /> : <TechnicianDashboard />;
}
