import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useDeviceManifest } from "@/features/signatures/lib/deviceShell";
import { useDeviceInvoice } from "../hooks/usePushSettings";

const fmtMoney = (n: number) =>
  `Rs. ${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function DeviceInvoicePage({ invoiceId }: { invoiceId: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useDeviceManifest();

  const validId = Number.isInteger(invoiceId) && invoiceId > 0 ? invoiceId : null;
  const { data, isLoading, isError, error } = useDeviceInvoice(validId);

  const errStatus = (error as any)?.status;
  const errMsg = String((error as any)?.message || "");
  const isForbidden =
    errStatus === 403 || /403|forbidden|only shop admin/i.test(errMsg);

  const issuedDisplay = (() => {
    if (!data?.issued_at) return "";
    try {
      return new Date(data.issued_at).toLocaleString();
    } catch {
      return data.issued_at;
    }
  })();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        color: "#0f172a",
        p: 2,
        pb: 4,
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 540, mx: "auto" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate({ to: "/device" })}
            sx={{
              minHeight: 40,
              textTransform: "none",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {t("phoneAssistant.deviceInvoice.backToDevice")}
          </Button>
        </Stack>

        {!validId && (
          <Alert severity="error">
            {t("phoneAssistant.deviceInvoice.notFound")}
          </Alert>
        )}

        {validId && isLoading && (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              borderRadius: 2.5,
              bgcolor: "#ffffff",
              borderColor: "#e2e8f0",
              textAlign: "center",
            }}
          >
            <CircularProgress size={28} sx={{ color: "#d97706", mb: 1.5 }} />
            <Typography variant="body2" sx={{ color: "#475569" }}>
              {t("phoneAssistant.deviceInvoice.loading")}
            </Typography>
          </Paper>
        )}

        {validId && isError && (
          <Alert severity={isForbidden ? "warning" : "error"}>
            {isForbidden
              ? t("phoneAssistant.deviceInvoice.forbidden")
              : t("phoneAssistant.deviceInvoice.notFound")}
          </Alert>
        )}

        {data && (
          <>
            <Paper
              variant="outlined"
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: "#ffffff",
                borderColor: "#e2e8f0",
              }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
              >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(245, 158, 11, 0.14)",
                      color: "#d97706",
                    }}
                  >
                    <ReceiptLongOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        fontSize: 18,
                        color: "#0f172a",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {data.invoice_number}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#475569",
                        display: "block",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {t("phoneAssistant.deviceInvoice.issuedAt", {
                        value: issuedDisplay,
                      })}
                    </Typography>
                    {data.issued_by && (
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        {t("phoneAssistant.deviceInvoice.issuedBy", {
                          name: data.issued_by,
                        })}
                      </Typography>
                    )}
                  </Box>
                </Stack>

                <Chip
                  size="small"
                  label={data.status}
                  sx={{
                    fontWeight: 700,
                    textTransform: "capitalize",
                    bgcolor: "#fef3c7",
                    color: "#92400e",
                  }}
                />
              </Stack>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: "#ffffff",
                borderColor: "#e2e8f0",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#475569",
                  display: "block",
                  mb: 0.75,
                }}
              >
                {t("phoneAssistant.deviceInvoice.customerHeading")}
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, color: "#0f172a" }}
                >
                  {data.customer.name}
                </Typography>

                {data.customer.phone && (
                  <Button
                    component="a"
                    href={`tel:${data.customer.phone}`}
                    size="small"
                    variant="outlined"
                    startIcon={<PhoneOutlinedIcon fontSize="small" />}
                    sx={{
                      minHeight: 38,
                      textTransform: "none",
                      fontWeight: 600,
                      borderColor: "#d97706",
                      color: "#b45309",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {data.customer.phone}
                  </Button>
                )}
              </Stack>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: "#ffffff",
                borderColor: "#e2e8f0",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#475569",
                  display: "block",
                  mb: 1.25,
                }}
              >
                {t("phoneAssistant.deviceInvoice.itemsHeading")}
              </Typography>

              <Stack spacing={1.25} divider={<Divider sx={{ borderColor: "#f1f5f9" }} />}>
                {data.items.map((item, idx) => (
                  <Stack
                    key={`${item.name}-${idx}`}
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "center", justifyContent: "space-between" }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "#0f172a" }}
                      >
                        {item.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#64748b",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {t("phoneAssistant.deviceInvoice.qtyLabel", {
                          count: Number(item.quantity || 0),
                        })}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: "#0f172a",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtMoney(item.line_total)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider sx={{ my: 1.75, borderColor: "#e2e8f0" }} />

              <Stack spacing={0.85}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    {t("phoneAssistant.deviceInvoice.totalAmount")}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: "#0f172a",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtMoney(data.total_amount)}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: "#475569" }}>
                    {t("phoneAssistant.deviceInvoice.paidAmount")}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "#15803d",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtMoney(data.paid_amount)}
                  </Typography>
                </Stack>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ pt: 0.75, borderTop: "1px dashed #cbd5e1" }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 800, color: "#0f172a" }}
                  >
                    {t("phoneAssistant.deviceInvoice.balanceDue")}
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                      color:
                        Number(data.balance_due || 0) > 0 ? "#be123c" : "#15803d",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtMoney(data.balance_due)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </>
        )}
      </Stack>
    </Box>
  );
}
