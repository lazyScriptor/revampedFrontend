import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HandymanIcon from "@mui/icons-material/Handyman";
import EngineeringIcon from "@mui/icons-material/Engineering";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import {
  useDefectList,
  useAssignTechnician,
  useResolveDefect,
  useTechnicianRoster,
} from "@/features/inventory/hooks/useDefectHooks";

// --- KPI WIDGET ---
const KpiCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      flex: 1,
      border: "1px solid #e2e8f0",
      borderRadius: 2,
      display: "flex",
      alignItems: "center",
      gap: 2,
      bgcolor: "#ffffff",
    }}
  >
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: `${color}15`,
        color: color,
        display: "flex",
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography
        variant="body2"
        color="text.secondary"
        fontWeight="600"
        textTransform="uppercase"
        letterSpacing={0.5}
      >
        {title}
      </Typography>
      <Typography variant="h5" fontWeight="bold" color="text.primary">
        {value}
      </Typography>
    </Box>
  </Paper>
);

export default function MaintenanceRoute() {
  const { data: defects = [], isLoading: defectsLoading } = useDefectList();
  const { data: technicians = [] } = useTechnicianRoster();
  const assignMutation = useAssignTechnician();
  const resolveMutation = useResolveDefect();
  const [assignQty, setAssignQty] = useState<string>(""); // <-- ADD THIS
  const [currentTab, setCurrentTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Modal States
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    defect: any | null;
  }>({ open: false, defect: null });
  const [selectedTechId, setSelectedTechId] = useState<string>("");

  const [resolveModal, setResolveModal] = useState<{
    open: boolean;
    defect: any | null;
  }>({ open: false, defect: null });
  const [resolveQty, setResolveQty] = useState<string>("");

  const showToast = (message: string, severity: "success" | "error") =>
    setToast({ open: true, message, severity });

  // --- ACTIONS ---
  const handleAssignSubmit = () => {
    const qty = parseInt(assignQty);
    if (!selectedTechId || !assignModal.defect) return;
    if (!qty || qty <= 0 || qty > assignModal.defect.pending_quantity) {
      return showToast("Please enter a valid assignment quantity.", "error");
    }

    assignMutation.mutate(
      {
        defectId: assignModal.defect.log_id,
        technicianId: parseInt(selectedTechId),
        quantity: qty,
      },
      {
        onSuccess: () => {
          showToast(
            `Successfully assigned ${qty} items to technician.`,
            "success",
          );
          setAssignModal({ open: false, defect: null });
          setSelectedTechId("");
          setAssignQty("");
        },
        onError: (err: any) =>
          showToast(
            err.response?.data?.message || "Assignment failed",
            "error",
          ),
      },
    );
  };

  const handleResolveSubmit = () => {
    const qty = parseInt(resolveQty);
    if (
      !qty ||
      !resolveModal.defect ||
      qty <= 0 ||
      qty > resolveModal.defect.pending_quantity
    ) {
      return showToast("Please enter a valid quantity.", "error");
    }
    resolveMutation.mutate(
      { defectId: resolveModal.defect.log_id, quantity: qty },
      {
        onSuccess: () => {
          showToast(`Successfully repaired ${qty} items!`, "success");
          setResolveModal({ open: false, defect: null });
          setResolveQty("");
        },
        onError: (err: any) =>
          showToast(
            err.response?.data?.message || "Resolution failed",
            "error",
          ),
      },
    );
  };

  // --- DATA PIPELINES ---
  // --- DATA PIPELINES (Bulletproof Edition) ---
  const safeDefects = Array.isArray(defects) ? defects : [];

  const queueDefects = safeDefects.filter((d: any) => {
    const status = (d.repair_status || d.status || "").toLowerCase();
    return (
      status === "pending assignment" ||
      status === "reported" ||
      status === "pending"
    );
  });

  const workshopDefects = safeDefects.filter((d: any) => {
    const status = (d.repair_status || d.status || "").toLowerCase();
    return status === "in repair" || status === "partially resolved";
  });

  const historyDefects = safeDefects.filter((d: any) => {
    const status = (d.repair_status || d.status || "").toLowerCase();
    return (
      status === "resolved" || status === "repaired" || status === "completed"
    );
  });

  const getFilteredData = () => {
    let baseData =
      currentTab === 0
        ? queueDefects
        : currentTab === 1
          ? workshopDefects
          : historyDefects;

    // Safety bypass: If the search bar is empty, don't run the filter at all
    const term = searchQuery.toLowerCase().trim();
    if (!term) return baseData;

    return baseData.filter(
      (d: any) =>
        (d.Equipment?.equipment_name || "").toLowerCase().includes(term) ||
        (d.reported_on_invoice_id
          ? `inv-${d.reported_on_invoice_id}`
          : ""
        ).includes(term),
    );
  };

  if (defectsLoading)
    return (
      <Box p={5} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        maxWidth: 1400,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {/* HEADER & KPIs */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight="800"
            color="text.primary"
            gutterBottom
          >
            Workshop Command Center
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Allocate technicians, log partial repairs, and monitor fleet health.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<AssessmentIcon />}
          sx={{ bgcolor: "white" }}
        >
          Export Report
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <KpiCard
          title="Awaiting Assignment"
          value={queueDefects.length}
          icon={<HandymanIcon fontSize="large" />}
          color="#f43f5e"
        />
        <KpiCard
          title="Active in Workshop"
          value={workshopDefects.length}
          icon={<EngineeringIcon fontSize="large" />}
          color="#f59e0b"
        />
        <KpiCard
          title="Fully Restored"
          value={historyDefects.length}
          icon={<CheckCircleIcon fontSize="large" />}
          color="#10b981"
        />
      </Box>

      {/* MASTER DATA TABLE */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "white",
        }}
      >
        <Box
          sx={{
            borderBottom: "1px solid #e2e8f0",
            px: 2,
            pt: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            bgcolor: "#f8fafc",
          }}
        >
          <Tabs
            value={currentTab}
            onChange={(e, v) => setCurrentTab(v)}
            sx={{
              "& .MuiTab-root": {
                fontWeight: 600,
                textTransform: "none",
                fontSize: "1rem",
              },
            }}
          >
            <Tab label={`Queue (${queueDefects.length})`} />
            <Tab label={`Workshop (${workshopDefects.length})`} />
            <Tab label={`History (${historyDefects.length})`} />
          </Tabs>
          <Box sx={{ pb: 1.5, width: 300 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search item or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: { bgcolor: "white", borderRadius: 2 },
              }}
            />
          </Box>
        </Box>

        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ fontWeight: "bold", bgcolor: "#f1f5f9", width: "25%" }}
                >
                  Equipment & Defect
                </TableCell>
                <TableCell
                  sx={{ fontWeight: "bold", bgcolor: "#f1f5f9", width: "25%" }}
                >
                  Repair Progress
                </TableCell>
                <TableCell
                  sx={{ fontWeight: "bold", bgcolor: "#f1f5f9", width: "20%" }}
                >
                  Technician
                </TableCell>
                <TableCell
                  sx={{ fontWeight: "bold", bgcolor: "#f1f5f9", width: "15%" }}
                >
                  Status
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: "bold", bgcolor: "#f1f5f9", width: "15%" }}
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredData().length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No records found in this view.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {getFilteredData().map((row: any) => {
                // Calculate progress percentage
                const progress =
                  Math.round(
                    (row.repaired_quantity / row.defective_quantity) * 100,
                  ) || 0;

                return (
                  <TableRow key={row.log_id} hover>
                    {/* Column 1: Info */}
                    <TableCell>
                      <Typography fontWeight="700" color="primary.main">
                        {row.Equipment?.equipment_name ||
                          `Item #${row.equipment_id}`}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="error.main"
                        sx={{ mt: 0.5, mb: 0.5 }}
                      >
                        "{row.defect_description}"
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ticket #{row.log_id} • Reported on{" "}
                        {new Date(row.reported_date).toLocaleDateString()}
                      </Typography>
                    </TableCell>

                    {/* Column 2: Progress Math */}
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight="bold"
                          color="text.secondary"
                        >
                          Total Broken: {row.defective_quantity}
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight="bold"
                          color="success.main"
                        >
                          {row.repaired_quantity} Fixed
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        color={progress === 100 ? "success" : "warning"}
                        sx={{ height: 8, borderRadius: 4, bgcolor: "#e2e8f0" }}
                      />
                      {row.pending_quantity > 0 && (
                        <Typography
                          variant="caption"
                          color="warning.dark"
                          sx={{ mt: 0.5, display: "block" }}
                        >
                          {row.pending_quantity} items remaining in shop
                        </Typography>
                      )}
                    </TableCell>

                    {/* Column 3: Tech Assignment */}
                    <TableCell>
                      {row.Technician ? (
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: "primary.light",
                              fontSize: "0.8rem",
                            }}
                          >
                            {row.Technician.first_name[0]}
                          </Avatar>
                          <Typography variant="body2" fontWeight="500">
                            {row.Technician.first_name}{" "}
                            {row.Technician.last_name}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.disabled"
                          fontStyle="italic"
                        >
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>

                    {/* Column 4: Status */}
                    <TableCell>
                      <Chip
                        label={row.repair_status}
                        color={
                          row.repair_status === "Pending Assignment"
                            ? "error"
                            : row.repair_status === "Resolved"
                              ? "success"
                              : "warning"
                        }
                        size="small"
                        sx={{ fontWeight: "bold" }}
                      />
                    </TableCell>

                    {/* Column 5: Actions */}
                    <TableCell align="right">
                      {/* Render Assign button for ANY queue status */}
                      {(row.repair_status === "Pending Assignment" ||
                        row.repair_status === "Reported" ||
                        row.repair_status === "Pending") && (
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          onClick={() =>
                            setAssignModal({ open: true, defect: row })
                          }
                        >
                          Assign Tech
                        </Button>
                      )}

                      {/* Render Repair button for ANY workshop status */}
                      {(row.repair_status === "In Repair" ||
                        row.repair_status === "Partially Resolved") && (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          disableElevation
                          onClick={() =>
                            setResolveModal({ open: true, defect: row })
                          }
                        >
                          Log Repair
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* --- MODAL 1: ASSIGN TECHNICIAN --- */}
      {/* --- MODAL 1: COMPREHENSIVE ASSIGN TECHNICIAN --- */}
      <Dialog
        open={assignModal.open}
        onClose={() => setAssignModal({ open: false, defect: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight="bold">Assign Repair Task</DialogTitle>
        <DialogContent>
          {/* Detailed Context Box */}
          <Box
            sx={{
              p: 2,
              bgcolor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              mb: 3,
              mt: 1,
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              textTransform="uppercase"
              fontWeight="bold"
              mb={1}
            >
              Equipment to Repair
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary.main">
              {assignModal.defect?.Equipment?.equipment_name}
            </Typography>
            <Typography
              variant="body2"
              color="error.main"
              sx={{ mt: 0.5, fontStyle: "italic" }}
            >
              "{assignModal.defect?.defect_description}"
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 3,
                mt: 2,
                pt: 2,
                borderTop: "1px dashed #cbd5e1",
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total In Queue
                </Typography>
                <Typography fontWeight="bold">
                  {assignModal.defect?.pending_quantity} Units
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Source
                </Typography>
                <Typography fontWeight="bold">
                  {assignModal.defect?.reported_on_invoice_id
                    ? `INV-${assignModal.defect.reported_on_invoice_id}`
                    : "Manual Entry"}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Typography variant="body2" fontWeight="bold" mb={1.5}>
            1. Select Technician
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 3 }}>
            <InputLabel>Select Technician</InputLabel>
            <Select
              value={selectedTechId}
              label="Select Technician"
              onChange={(e) => setSelectedTechId(e.target.value)}
            >
              {technicians.length === 0 ? (
                <MenuItem disabled>No technicians available</MenuItem>
              ) : null}
              {technicians.map((tech: any) => (
                <MenuItem
                  key={tech.user_id || tech.id}
                  value={tech.user_id || tech.id}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <span>
                      {tech.first_name} {tech.last_name}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                      {tech.active_tickets} active tickets
                    </span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="body2" fontWeight="bold" mb={1.5}>
            2. Assignment Quantity
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Quantity to Assign"
            value={assignQty}
            onChange={(e) => setAssignQty(e.target.value)}
            helperText={`You can assign between 1 and ${assignModal.defect?.pending_quantity} units. Any unassigned units will remain in the Queue as a new ticket.`}
            InputProps={{
              inputProps: { min: 1, max: assignModal.defect?.pending_quantity },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => setAssignModal({ open: false, defect: null })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignSubmit}
            variant="contained"
            disableElevation
            disabled={!selectedTechId || !assignQty || assignMutation.isPending}
          >
            Confirm Assignment
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- MODAL 2: LOG PARTIAL/FULL REPAIR --- */}
      <Dialog
        open={resolveModal.open}
        onClose={() => setResolveModal({ open: false, defect: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight="bold">Log Repair Progress</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Item:
            </Typography>
            <Typography fontWeight="bold" mb={1}>
              {resolveModal.defect?.Equipment?.equipment_name}
            </Typography>
            <Typography variant="body2" color="warning.dark" fontWeight="bold">
              Still Pending Fix: {resolveModal.defect?.pending_quantity}
            </Typography>
          </Box>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label="Quantity Fixed Today"
            value={resolveQty}
            onChange={(e) => setResolveQty(e.target.value)}
            helperText={`Enter a number between 1 and ${resolveModal.defect?.pending_quantity}. These items will be returned to the shelf immediately.`}
            InputProps={{
              inputProps: {
                min: 1,
                max: resolveModal.defect?.pending_quantity,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setResolveModal({ open: false, defect: null })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleResolveSubmit}
            variant="contained"
            color="success"
            disableElevation
            disabled={!resolveQty || resolveMutation.isPending}
          >
            Commit to Inventory
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
