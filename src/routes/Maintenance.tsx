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
  IconButton,
  Tooltip,
} from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import AssessmentIcon from "@mui/icons-material/Assessment";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HandymanIcon from "@mui/icons-material/Handyman";
import {
  useDefectList,
  useRepairDefect,
} from "@/features/inventory/hooks/useDefectHooks";

// --- ENTERPRISE KPI COMPONENT ---
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
  const { data: defects = [], isLoading } = useDefectList();
  const repairMutation = useRepairDefect();

  const [currentTab, setCurrentTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const handleRepair = (defectId: number) => {
    repairMutation.mutate(defectId, {
      onSuccess: () =>
        setToast({
          open: true,
          message:
            "Equipment marked as repaired and returned to active inventory.",
          severity: "success",
        }),
      onError: (err: any) =>
        setToast({
          open: true,
          message: err.response?.data?.message || "Repair failed",
          severity: "error",
        }),
    });
  };

  // --- DATA PROCESSING (Bulletproof Filters) ---

  // Safely ensure defects is an array before filtering
  const safeDefects = Array.isArray(defects) ? defects : [];

  // Catch both new ("Reported") and old ("Pending Repair") statuses, ignoring uppercase/lowercase
  const pendingDefects = safeDefects.filter((d: any) => {
    const status = (d.repair_status || d.status || "").toLowerCase();
    return (
      status === "reported" ||
      status === "pending repair" ||
      status === "pending"
    );
  });

  const repairedDefects = safeDefects.filter((d: any) => {
    const status = (d.repair_status || d.status || "").toLowerCase();
    return (
      status === "resolved" || status === "repaired" || status === "completed"
    );
  });

  // Filter based on search query
  const filteredData = (
    currentTab === 0 ? pendingDefects : repairedDefects
  ).filter((d: any) => {
    const term = searchQuery.toLowerCase();
    const itemName = d.Equipment?.equipment_name?.toLowerCase() || "";
    const invoiceStr = d.reported_on_invoice_id
      ? `inv-${d.reported_on_invoice_id}`
      : "";
    return itemName.includes(term) || invoiceStr.includes(term);
  });

  if (isLoading)
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
      {/* HEADER SECTION */}
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
            Maintenance & Repair
          </Typography>
          <Typography color="text.secondary" variant="body1">
            Manage defective returns, track workshop queue, and reinstate
            inventory.
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

      {/* KPI DASHBOARD */}
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <KpiCard
          title="Items in Repair"
          value={pendingDefects.length}
          icon={<HandymanIcon fontSize="large" />}
          color="#f59e0b"
        />
        <KpiCard
          title="Repaired Today"
          value={repairedDefects.length}
          icon={<CheckCircleIcon fontSize="large" />}
          color="#10b981"
        />
        <KpiCard
          title="Critical Alerts"
          value={pendingDefects.length > 5 ? "High Volume" : "Normal"}
          icon={<WarningAmberIcon fontSize="large" />}
          color={pendingDefects.length > 5 ? "#ef4444" : "#64748b"}
        />
      </Box>

      {/* MAIN DATA WORKSPACE */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "white",
        }}
      >
        {/* Toolbar & Tabs */}
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
            indicatorColor="primary"
            textColor="primary"
            sx={{
              "& .MuiTab-root": {
                fontWeight: 600,
                textTransform: "none",
                fontSize: "1rem",
              },
            }}
          >
            <Tab label={`Pending Repairs (${pendingDefects.length})`} />
            <Tab label={`Repair History (${repairedDefects.length})`} />
          </Tabs>

          <Box sx={{ pb: 1.5, width: 300 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name or invoice..."
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

        {/* DATA TABLE */}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    bgcolor: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  Defect ID
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    bgcolor: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  Equipment Name
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    bgcolor: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  Defect Details
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    bgcolor: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  Source
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    bgcolor: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontWeight: "bold",
                    bgcolor: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    align="center"
                    sx={{ py: 6, color: "text.secondary" }}
                  >
                    <Typography variant="h6">No records found.</Typography>
                    <Typography variant="body2">
                      You're all caught up!
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {filteredData.map((row: any) => (
                <TableRow
                  key={row.log_id}
                  hover
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="text.secondary"
                    >
                      #{row.log_id}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography fontWeight="600" color="primary.main">
                      {row.Equipment?.equipment_name ||
                        `Unknown ID: ${row.equipment_id}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Defective Qty: {row.defective_quantity}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography
                      variant="body2"
                      color="error.dark"
                      noWrap
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <BuildIcon fontSize="inherit" /> {row.defect_description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Reported:{" "}
                      {new Date(row.reported_date).toLocaleDateString()}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {row.reported_on_invoice_id ? (
                      <Chip
                        label={`INV-${row.reported_on_invoice_id}`}
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Manual Entry
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={row.repair_status}
                      color={
                        row.repair_status === "Reported" ? "warning" : "success"
                      }
                      size="small"
                      sx={{ fontWeight: "bold" }}
                    />
                  </TableCell>

                  <TableCell align="right">
                    {row.repair_status === "Reported" ? (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        disableElevation
                        onClick={() => handleRepair(row.log_id)}
                        disabled={repairMutation.isPending}
                        sx={{ textTransform: "none", fontWeight: "bold" }}
                      >
                        Resolve
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        Resolved{" "}
                        {new Date(row.resolved_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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
