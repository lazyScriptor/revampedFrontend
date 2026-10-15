import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { InvoiceReceipt } from "./InvoiceReceipt";
import { handlePrintInvoice } from "../utils/thermalPrint";

interface PrintLogItem {
  log_id: number;
  invoice_id: number | null;
  doc_number: string;
  doc_type: "DISPATCH" | "COMPLETED" | "DRAFT" | "RETURN_SETTLEMENT";
  printed_by_user_id: number;
  printed_by_name: string;
  printed_by_role: string;
  customer_name: string | null;
  customer_phone: string | null;
  print_method: "direct_agent" | "browser_dialog";
  printer_name: string | null;
  paper_width: string;
  copies: number;
  height_mm: number | null;
  total_items: number;
  total_machines: number;
  subtotal: number;
  transport_fee: number;
  discount_amount: number;
  grand_total: number;
  total_paid: number;
  balance_due: number;
  language: string;
  custom_notes: string | null;
  bill_snapshot: any;
  ip_address: string | null;
  printed_at: string;
}

interface InvoicePrintHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber?: string;
}

export function InvoicePrintHistoryDialog({
  open,
  onClose,
  invoiceId,
  invoiceNumber,
}: InvoicePrintHistoryDialogProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<PrintLogItem | null>(null);
  const [reprinting, setReprinting] = useState(false);

  const {
    data: logs = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<PrintLogItem[]>({
    queryKey: ["invoice-print-logs", invoiceId],
    queryFn: async () => {
      const res = await api.get(`/invoices/${invoiceId}/print-logs`);
      return res.data?.data || [];
    },
    enabled: open && !!invoiceId,
  });

  const handleReprint = async () => {
    if (!selectedSnapshot) return;
    try {
      setReprinting(true);
      await handlePrintInvoice({
        invoice: selectedSnapshot.bill_snapshot?.invoice_id ? selectedSnapshot.bill_snapshot : undefined,
        isDraft: selectedSnapshot.doc_type === "DRAFT",
        draftData: selectedSnapshot.doc_type === "DRAFT" ? selectedSnapshot.bill_snapshot : undefined,
        paperWidth: (selectedSnapshot.paper_width as any) || "80mm",
        language: (selectedSnapshot.language as any) || "en",
        customNotes: selectedSnapshot.custom_notes || undefined,
        copies: selectedSnapshot.copies || 1,
        sourceElementId: "history-reprint-dom",
      });
    } catch (err) {
      console.error("Reprint failed:", err);
    } finally {
      setReprinting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1.5,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                bgcolor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HistoryIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>
                Print Audit Trail · {invoiceNumber || `INV-${invoiceId}`}
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b" }}>
                Complete log of physical bills printed for this invoice
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton size="small" onClick={() => refetch()} disabled={isFetching}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, minHeight: 320 }}>
          {isLoading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, gap: 1.5 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                Loading print history...
              </Typography>
            </Box>
          ) : logs.length === 0 ? (
            <Box
              sx={{
                p: 5,
                textAlign: "center",
                bgcolor: "#f8fafc",
                borderRadius: 2.5,
                border: "1px dashed #cbd5e1",
                my: 2,
              }}
            >
              <HistoryIcon sx={{ fontSize: 44, color: "#94a3b8", mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#334155" }}>
                No Bills Printed Yet
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748b", maxWidth: 360, display: "block", mx: "auto" }}>
                There are no thermal receipt prints logged for this invoice yet. Future prints will appear here automatically with complete audit details.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Printed At</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Operator</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Method / Device</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Paper / Copies</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Balance Due</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#475569" }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.log_id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                          {new Date(log.printed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                          {new Date(log.printed_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                          <PersonOutlineIcon sx={{ fontSize: 16, color: "#64748b" }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                              {log.printed_by_name}
                            </Typography>
                            <Chip
                              label={log.printed_by_role}
                              size="small"
                              sx={{ height: 16, fontSize: "0.62rem", fontWeight: 700, bgcolor: "#f1f5f9" }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={log.print_method === "direct_agent" ? "Direct Agent (CUPS)" : "Browser Dialog"}
                          color={log.print_method === "direct_agent" ? "success" : "default"}
                          variant={log.print_method === "direct_agent" ? "filled" : "outlined"}
                          sx={{ fontWeight: 700, fontSize: "0.68rem" }}
                        />
                        {log.printer_name && (
                          <Typography variant="caption" sx={{ display: "block", color: "#64748b", mt: 0.2 }}>
                            {log.printer_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {log.paper_width} · {log.copies}x
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                          {log.language === "si" ? "සිංහල" : "English"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 800,
                            color: Number(log.balance_due) > 0 ? "#dc2626" : "#16a34a",
                          }}
                        >
                          {Number(log.balance_due) === 0 ? "PAID" : `Rs. ${Number(log.balance_due).toLocaleString()}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                          Total: Rs. {Number(log.grand_total).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon sx={{ fontSize: 14 }} />}
                          onClick={() => setSelectedSnapshot(log)}
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.72rem",
                            textTransform: "none",
                            borderRadius: 1.5,
                            borderColor: "#cbd5e1",
                            color: "#0f172a",
                          }}
                        >
                          View Bill
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={onClose} sx={{ fontWeight: 700, color: "#64748b" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snapshot Preview Dialog */}
      <Dialog
        open={Boolean(selectedSnapshot)}
        onClose={() => setSelectedSnapshot(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Exact Bill Snapshot · Log #{selectedSnapshot?.log_id}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Printed by {selectedSnapshot?.printed_by_name} on{" "}
              {selectedSnapshot?.printed_at ? new Date(selectedSnapshot.printed_at).toLocaleString() : ""}
            </Typography>
          </Box>
          <IconButton onClick={() => setSelectedSnapshot(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedSnapshot && (
            <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" } }}>
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                    Metadata Summary
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    <strong>Operator:</strong> {selectedSnapshot.printed_by_name} ({selectedSnapshot.printed_by_role})
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    <strong>Print Method:</strong> {selectedSnapshot.print_method}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    <strong>Paper Width:</strong> {selectedSnapshot.paper_width}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    <strong>Language:</strong> {selectedSnapshot.language === "si" ? "Sinhala" : "English"}
                  </Typography>
                  {selectedSnapshot.ip_address && (
                    <Typography variant="body2" sx={{ color: "#475569" }}>
                      <strong>IP Address:</strong> {selectedSnapshot.ip_address}
                    </Typography>
                  )}
                </Paper>

                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                    Financial State at Print Time
                  </Typography>
                  <Typography variant="body2">
                    Subtotal: Rs. {Number(selectedSnapshot.subtotal).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Grand Total: Rs. {Number(selectedSnapshot.grand_total).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#16a34a" }}>
                    Total Paid: Rs. {Number(selectedSnapshot.total_paid).toLocaleString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 800,
                      color: Number(selectedSnapshot.balance_due) > 0 ? "#dc2626" : "#16a34a",
                    }}
                  >
                    Balance Due: Rs. {Number(selectedSnapshot.balance_due).toLocaleString()}
                  </Typography>
                </Paper>
              </Box>

              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", mb: 1 }}>
                  Physical Bill Preview
                </Typography>
                <Box
                  sx={{
                    maxHeight: "500px",
                    overflowY: "auto",
                    p: 2,
                    bgcolor: "#334155",
                    borderRadius: 2,
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  <InvoiceReceipt
                    id="history-reprint-dom"
                    invoice={selectedSnapshot.bill_snapshot?.invoice_id ? selectedSnapshot.bill_snapshot : undefined}
                    isDraft={selectedSnapshot.doc_type === "DRAFT"}
                    draftData={selectedSnapshot.doc_type === "DRAFT" ? selectedSnapshot.bill_snapshot : undefined}
                    paperWidth={(selectedSnapshot.paper_width as any) || "80mm"}
                    language={(selectedSnapshot.language as any) || "en"}
                    customNotes={selectedSnapshot.custom_notes || undefined}
                    isPreview={true}
                  />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0", justifyContent: "space-between" }}>
          <Button onClick={() => setSelectedSnapshot(null)}>Close</Button>
          <Button
            variant="contained"
            startIcon={reprinting ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
            onClick={handleReprint}
            disabled={reprinting}
            sx={{ fontWeight: 800, bgcolor: "#0f172a" }}
          >
            Re-print Copy
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
