import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { formatDisplayDate } from "@/lib/dates";

import {
  useDefectList,
  useAssignTechnician,
  useResolveDefect,
  useTechnicianRoster,
} from "@/features/inventory/hooks/useDefectHooks";
import { GearGridLoader } from "@/components/ui/GearGridLoader";
import { ResponsiveKpiStrip } from "@/components/ui/ResponsiveKpiStrip";

// --- STAGE TILE (doubles as the tab switcher: Queue -> Workshop -> History) ---
const StageTile = ({
  title,
  value,
  icon,
  color,
  active,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  active: boolean;
  onClick: () => void;
}) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    aria-pressed={active}
    sx={{
      all: "unset",
      boxSizing: "border-box",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      minHeight: 64,
      px: 2,
      py: 1.25,
      borderRadius: 2.5,
      bgcolor: "#ffffff",
      border: "1px solid",
      borderColor: active ? color : "#e2e8f0",
      boxShadow: active ? `0 0 0 3px ${color}22` : "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      "&:hover": { borderColor: color },
      "&:focus-visible": { outline: `3px solid ${color}66`, outlineOffset: 2 },
    }}
  >
    <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}1a`, color, display: "flex", flexShrink: 0 }}>
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "1.5rem", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Typography>
      <Typography noWrap sx={{ color: "#475569", fontWeight: 600, fontSize: "0.78rem" }}>
        {title}
      </Typography>
    </Box>
  </Box>
);

export default function MaintenanceRoute() {
  const { t } = useTranslation();
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
      return showToast(t("pages.Maintenance.pleaseEnterAValidAssignment"), "error");
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
            t("pages.Maintenance.successfullyAssignedItemsToTechnician", { qty }),
            "success",
          );
          setAssignModal({ open: false, defect: null });
          setSelectedTechId("");
          setAssignQty("");
        },
        onError: (err: any) =>
          showToast(
            err.response?.data?.message || t("pages.Maintenance.assignmentFailed"),
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
      return showToast(t("pages.Maintenance.pleaseEnterAValidQuantity"), "error");
    }
    resolveMutation.mutate(
      { defectId: resolveModal.defect.log_id, quantity: qty },
      {
        onSuccess: () => {
          showToast(t("pages.Maintenance.successfullyRepairedItems", { qty }), "success");
          setResolveModal({ open: false, defect: null });
          setResolveQty("");
        },
        onError: (err: any) =>
          showToast(
            err.response?.data?.message || t("pages.Maintenance.resolutionFailed"),
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
      <GearGridLoader centered size="lg" label={t("pages.Maintenance.loadingFleetDiagnostics")} sublabel={t("pages.Maintenance.fetchingActiveMaintenanceTicketsAnd")} sx={{ py: 10 }} />
    );

  const rows = getFilteredData();
  const stageTitle = [
    t("pages.Maintenance.queue", { queueDefectsCount: queueDefects.length }),
    t("pages.Maintenance.workshop", { workshopDefectsCount: workshopDefects.length }),
    t("pages.Maintenance.history", { historyDefectsCount: historyDefects.length }),
  ][currentTab];

  const progressOf = (row: any) =>
    Math.round((row.repaired_quantity / row.defective_quantity) * 100) || 0;

  const statusColor = (row: any): "error" | "success" | "warning" =>
    row.repair_status === "Pending Assignment"
      ? "error"
      : row.repair_status === "Resolved"
        ? "success"
        : "warning";

  const itemName = (row: any) =>
    row.Equipment?.equipment_name || t("pages.Maintenance.item2", { equipment_id: row.equipment_id });

  const renderProgress = (row: any) => {
    const progress = progressOf(row);
    return (
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5, gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569", fontVariantNumeric: "tabular-nums" }}>
            {t("pages.Maintenance.totalBroken")} {row.defective_quantity}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "success.dark", fontVariantNumeric: "tabular-nums" }}>
            {t("pages.Maintenance.fixed", { repaired_quantity: row.repaired_quantity })}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          color={progress === 100 ? "success" : "warning"}
          aria-label={`${progress}%`}
          sx={{ height: 8, borderRadius: 4, bgcolor: "#e2e8f0" }}
        />
        {row.pending_quantity > 0 && (
          <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "warning.dark", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {t("pages.Maintenance.itemsRemainingInShop", { pending_quantity: row.pending_quantity })}
          </Typography>
        )}
      </Box>
    );
  };

  const renderTech = (row: any) =>
    row.Technician ? (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main", fontSize: "0.8rem" }}>
          {row.Technician.first_name[0]}
        </Avatar>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#0f172a" }}>
          {row.Technician.first_name} {row.Technician.last_name}
        </Typography>
      </Box>
    ) : (
      <Typography variant="body2" sx={{ color: "#64748b", fontStyle: "italic" }}>
        {t("pages.Maintenance.unassigned")}
      </Typography>
    );

  const renderAction = (row: any, fullWidth = false) => (
    <>
      {(row.repair_status === "Pending Assignment" ||
        row.repair_status === "Reported" ||
        row.repair_status === "Pending") && (
        <Button
          variant="contained"
          color="primary"
          disableElevation
          fullWidth={fullWidth}
          onClick={() => setAssignModal({ open: true, defect: row })}
          sx={{ minHeight: 40, fontWeight: 700, textTransform: "none", whiteSpace: "nowrap" }}
        >
          {t("pages.Maintenance.assignTech")}
        </Button>
      )}
      {(row.repair_status === "In Repair" || row.repair_status === "Partially Resolved") && (
        <Button
          variant="contained"
          color="success"
          disableElevation
          fullWidth={fullWidth}
          onClick={() => setResolveModal({ open: true, defect: row })}
          sx={{ minHeight: 40, fontWeight: 700, textTransform: "none", whiteSpace: "nowrap" }}
        >
          {t("pages.Maintenance.logRepair")}
        </Button>
      )}
    </>
  );

  const renderMeta = (row: any) => (
    <Typography variant="caption" sx={{ color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
      {t("pages.Maintenance.ticketReportedOn", { log_id: row.log_id, value: formatDisplayDate(row.reported_date) })}
      {row.reported_on_invoice_id ? ` · INV-${row.reported_on_invoice_id}` : ""}
    </Typography>
  );

  const headCell = { fontWeight: 700, bgcolor: "#f1f5f9", color: "#334155", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.4 } as const;

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        maxWidth: 1400,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, md: 2.5 },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{ fontWeight: 800, color: "#0f172a", fontSize: { xs: "1.5rem", md: "1.9rem" }, lineHeight: 1.2 }}
          >
            {t("maintenance.title")}
          </Typography>
          <Typography sx={{ color: "#475569", fontSize: "0.92rem", mt: 0.25 }}>
            {t("maintenance.subtitle")}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<AssessmentIcon />}
          sx={{ bgcolor: "white", alignSelf: { xs: "flex-start", sm: "auto" }, minHeight: 40, textTransform: "none", fontWeight: 700 }}
        >
          {t("reports.exportPdf")}
        </Button>
      </Box>

      {/* WORKFLOW STAGES — click to switch the list below */}
      <ResponsiveKpiStrip columns={3} collapsibleOnMobile={false}>
        <StageTile
          title={t("pages.Maintenance.awaitingAssignment")}
          value={queueDefects.length}
          icon={<HandymanIcon />}
          color="#e11d48"
          active={currentTab === 0}
          onClick={() => setCurrentTab(0)}
        />
        <StageTile
          title={t("pages.Maintenance.activeInWorkshop")}
          value={workshopDefects.length}
          icon={<EngineeringIcon />}
          color="#d97706"
          active={currentTab === 1}
          onClick={() => setCurrentTab(1)}
        />
        <StageTile
          title={t("pages.Maintenance.fullyRestored")}
          value={historyDefects.length}
          icon={<CheckCircleIcon />}
          color="#059669"
          active={currentTab === 2}
          onClick={() => setCurrentTab(2)}
        />
      </ResponsiveKpiStrip>

      {/* LIST */}
      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden", bgcolor: "white" }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 1.5,
            bgcolor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Typography component="h2" sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem" }}>
            {stageTitle}
          </Typography>
          <TextField
            size="small"
            placeholder={t("pages.Maintenance.searchItemOrInvoice")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: "100%", md: 320 }, "& .MuiOutlinedInput-root": { bgcolor: "white", borderRadius: 2 }, "& input": { color: "#0f172a" } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {rows.length === 0 && (
          <Box sx={{ py: 7, textAlign: "center" }}>
            <Typography sx={{ color: "#475569" }}>{t("pages.Maintenance.noRecordsFoundInThis")}</Typography>
          </Box>
        )}

        {/* Desktop / tablet: table */}
        {rows.length > 0 && (
          <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headCell, width: "34%" }}>{t("pages.Maintenance.equipmentDefect")}</TableCell>
                  <TableCell sx={{ ...headCell, width: "24%" }}>{t("pages.Maintenance.repairProgress")}</TableCell>
                  <TableCell sx={{ ...headCell, width: "16%" }}>{t("maintenance.technician")}</TableCell>
                  <TableCell sx={{ ...headCell, width: "12%" }}>{t("common.status")}</TableCell>
                  <TableCell align="right" sx={{ ...headCell, width: "14%" }}>
                    {t("invoices.InvoicePrintHistoryDialog.action")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row: any) => (
                  <TableRow key={row.log_id} hover sx={{ "& td": { verticalAlign: "top", py: 2 } }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{itemName(row)}</Typography>
                      <Typography variant="body2" sx={{ color: "#b91c1c", my: 0.5 }}>
                        {row.defect_description}
                      </Typography>
                      {renderMeta(row)}
                    </TableCell>
                    <TableCell>{renderProgress(row)}</TableCell>
                    <TableCell>{renderTech(row)}</TableCell>
                    <TableCell>
                      <Chip label={row.repair_status} color={statusColor(row)} size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="right">{renderAction(row)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Mobile: one card per ticket — no sideways scrolling */}
        {rows.length > 0 && (
          <Box sx={{ display: { xs: "flex", md: "none" }, flexDirection: "column" }}>
            {rows.map((row: any) => (
              <Box key={row.log_id} sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.25, borderBottom: "1px solid #e2e8f0", "&:last-of-type": { borderBottom: "none" } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                  <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{itemName(row)}</Typography>
                  <Chip label={row.repair_status} color={statusColor(row)} size="small" sx={{ fontWeight: 700, flexShrink: 0 }} />
                </Box>
                <Typography variant="body2" sx={{ color: "#b91c1c" }}>
                  {row.defect_description}
                </Typography>
                {renderMeta(row)}
                {renderProgress(row)}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
                  {renderTech(row)}
                </Box>
                {renderAction(row, true)}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* --- MODAL 1: COMPREHENSIVE ASSIGN TECHNICIAN --- */}
      <Dialog
        open={assignModal.open}
        onClose={() => setAssignModal({ open: false, defect: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight="bold">{t("pages.Maintenance.assignRepairTask")}</DialogTitle>
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
              {t("pages.Maintenance.equipmentToRepair")}
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
                  {t("pages.Maintenance.totalInQueue")}
                </Typography>
                <Typography fontWeight="bold">
                  {t("pages.Maintenance.units", { pending_quantity: assignModal.defect?.pending_quantity })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t("pages.Maintenance.source")}
                </Typography>
                <Typography fontWeight="bold">
                  {assignModal.defect?.reported_on_invoice_id
                    ? `INV-${assignModal.defect.reported_on_invoice_id}`
                    : t("pages.Maintenance.manualEntry")}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Typography variant="body2" fontWeight="bold" mb={1.5}>
            {t("pages.Maintenance.1SelectTechnician")}
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 3 }}>
            <InputLabel>{t("pages.Maintenance.selectTechnician")}</InputLabel>
            <Select
              value={selectedTechId}
              label={t("pages.Maintenance.selectTechnician")}
              onChange={(e) => setSelectedTechId(e.target.value)}
            >
              {technicians.length === 0 ? (
                <MenuItem disabled>{t("pages.Maintenance.noTechniciansAvailable")}</MenuItem>
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
                      {t("pages.Maintenance.activeTickets", { active_tickets: tech.active_tickets })}
                    </span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="body2" fontWeight="bold" mb={1.5}>
            {t("pages.Maintenance.2AssignmentQuantity")}
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            label={t("pages.Maintenance.quantityToAssign")}
            value={assignQty}
            onChange={(e) => setAssignQty(e.target.value)}
            helperText={t("pages.Maintenance.youCanAssignBetween1", { pending_quantity: assignModal.defect?.pending_quantity })}
            slotProps={{
              htmlInput: { min: 1, max: assignModal.defect?.pending_quantity },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={() => setAssignModal({ open: false, defect: null })}
            color="inherit"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleAssignSubmit}
            variant="contained"
            disableElevation
            disabled={!selectedTechId || !assignQty || assignMutation.isPending}
          >
            {t("pages.Maintenance.confirmAssignment")}
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
        <DialogTitle fontWeight="bold">{t("pages.Maintenance.logRepairProgress")}</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {t("pages.Maintenance.item")}
            </Typography>
            <Typography fontWeight="bold" mb={1}>
              {resolveModal.defect?.Equipment?.equipment_name}
            </Typography>
            <Typography variant="body2" color="warning.dark" fontWeight="bold">
              {t("pages.Maintenance.stillPendingFix")} {resolveModal.defect?.pending_quantity}
            </Typography>
          </Box>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label={t("pages.Maintenance.quantityFixedToday")}
            value={resolveQty}
            onChange={(e) => setResolveQty(e.target.value)}
            helperText={t("pages.Maintenance.enterANumberBetween1", { pending_quantity: resolveModal.defect?.pending_quantity })}
            slotProps={{
              htmlInput: {
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
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleResolveSubmit}
            variant="contained"
            color="success"
            disableElevation
            disabled={!resolveQty || resolveMutation.isPending}
          >
            {t("pages.Maintenance.commitToInventory")}
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
