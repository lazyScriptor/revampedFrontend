import { useEffect, useMemo, useState } from "react";
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
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useDeviceManifest } from "@/features/signatures/lib/deviceShell";
import { useDeviceInvoice } from "../hooks/usePushSettings";
import type { DeviceInvoiceSummary } from "../api/phoneAssistantApi";
import { formatCachedAgeMinutes, getCachedBill, putCachedBill } from "../lib/billCache";
import {
  installWebBackOverlayHandler,
  useSyncNativeStatusBar,
} from "../lib/phoneAppState";
import { shareElementAsPdf } from "../lib/sharePdf";
import { isNativePhoneApp } from "../lib/nativeBridge";
import { useAuthStore } from "@/stores/useAuthStore";
import { checkActivityEvent } from "@/features/activity/api/activityApi";
import { formatCallLength } from "../lib/callFormat";

const fmtMoney = (n: number | null | undefined) =>
  `Rs. ${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDateOnly = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
};

const sameDay = (a?: string | null, b?: string | null) => {
  if (!a || !b) return true;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return true;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const toWhatsappDigits = (phone: string) => {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0") && digits.length === 10) return `94${digits.slice(1)}`;
  return digits;
};

export function DeviceInvoicePage({ invoiceId }: { invoiceId: number }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fromEventId =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("from") || "").trim()
      : "";
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCheckActivity = Boolean(user) && hasPermission("activity:check");

  useDeviceManifest();
  useSyncNativeStatusBar();
  installWebBackOverlayHandler();

  const validId = Number.isInteger(invoiceId) && invoiceId > 0 ? invoiceId : null;
  const cachedEntry = useMemo(
    () => (validId ? getCachedBill<DeviceInvoiceSummary>(validId) : null),
    [validId],
  );
  const { data: liveData, isLoading, isError, error } = useDeviceInvoice(validId);

  useEffect(() => {
    if (validId && liveData) {
      putCachedBill(validId, liveData);
    }
  }, [validId, liveData]);

  const data = liveData ?? cachedEntry?.data ?? undefined;
  const showingCache = Boolean(!liveData && cachedEntry?.data);
  const cacheAgeMin = cachedEntry ? formatCachedAgeMinutes(cachedEntry.cachedAt) : 0;

  const [checking, setChecking] = useState(false);
  const [checkedLocal, setCheckedLocal] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const errStatus = (error as any)?.status;
  const errMsg = String((error as any)?.message || "");
  const isForbidden =
    errStatus === 403 || /403|forbidden|only shop admin/i.test(errMsg);

  const canSeeMoney = data?.can_see_money !== false;
  const isSi = i18n.language?.startsWith("si");

  const issuedDisplay = (() => {
    if (!data?.issued_at) return "";
    try {
      return new Date(data.issued_at).toLocaleString();
    } catch {
      return data.issued_at;
    }
  })();

  const fromHistoryItem = useMemo(() => {
    if (!fromEventId || !data?.history) return null;
    const numericId = fromEventId.replace(/^act-/, "");
    return (
      data.history.find(
        (h) => h.id === fromEventId || h.id === `act-${numericId}`,
      ) ?? null
    );
  }, [fromEventId, data?.history]);

  const firstUncheckedActivity = useMemo(() => {
    if (!data?.history) return null;
    if (fromHistoryItem && fromHistoryItem.source === "activity" && !fromHistoryItem.checked_at) {
      return fromHistoryItem;
    }
    return (
      data.history.find((h) => h.source === "activity" && !h.checked_at) ?? null
    );
  }, [data?.history, fromHistoryItem]);

  const handleMarkChecked = async () => {
    const target = firstUncheckedActivity;
    if (!target) return;
    const rawId = Number(target.id.replace(/^act-/, ""));
    if (!Number.isInteger(rawId) || rawId <= 0) return;
    setChecking(true);
    try {
      // The paired phone's own credentials: nobody needs to be signed in to tick Checked here.
      await checkActivityEvent(rawId, "device");
      setCheckedLocal(true);
    } catch {
      // Non-fatal
    } finally {
      setChecking(false);
    }
  };

  const handleSharePdf = async () => {
    if (!data) return;
    setSharingPdf(true);
    try {
      await shareElementAsPdf("device-invoice-printable", `${data.invoice_number}.pdf`, 72);
    } finally {
      setSharingPdf(false);
    }
  };

  const payments = data?.payments ?? [];
  const saleLines = data?.sale_lines ?? [];
  const calls = data?.calls ?? [];
  const history = data?.history ?? [];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        p: 2,
        pb: 4,
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 540, mx: "auto" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate({ to: "/device/alerts" })}
            sx={{
              minHeight: 40,
              textTransform: "none",
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            {t("phoneShell.tab_alerts")}
          </Button>
          {showingCache && (
            <Chip
              size="small"
              color="info"
              variant="outlined"
              label={t("phoneAssistant.deviceInvoice.cachedAgo", { count: cacheAgeMin })}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            />
          )}
        </Stack>

        {!validId && (
          <Alert severity="error">
            {t("phoneAssistant.deviceInvoice.notFound")}
          </Alert>
        )}

        {validId && isLoading && !data && (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              borderRadius: 2.5,
              bgcolor: "background.paper",
              borderColor: "divider",
              textAlign: "center",
            }}
          >
            <CircularProgress size={28} sx={{ color: "warning.main", mb: 1.5 }} />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("phoneAssistant.deviceInvoice.loading")}
            </Typography>
          </Paper>
        )}

        {validId && isError && !data && (
          <Alert severity={isForbidden ? "warning" : "error"}>
            {isForbidden
              ? t("phoneAssistant.deviceInvoice.forbidden")
              : t("phoneAssistant.deviceInvoice.notFound")}
          </Alert>
        )}

        {data && (
          <Stack id="device-invoice-printable" spacing={2}>
            {/* Highlighted notification banner when opened from a push/alert */}
            {fromEventId && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {t("phoneAssistant.deviceInvoice.openedFrom", {
                  summary: fromHistoryItem
                    ? isSi
                      ? fromHistoryItem.sentence_si
                      : fromHistoryItem.sentence_en
                    : `#${fromEventId}`,
                })}
              </Alert>
            )}

            {/* 1. Header */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: "background.paper",
                borderColor: "divider",
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
                      color: "warning.main",
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
                        color: "text.primary",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {data.invoice_number}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        display: "block",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {t("phoneAssistant.deviceInvoice.issuedAt", {
                        value: issuedDisplay,
                      })}
                    </Typography>
                    {data.issued_by && (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {t("phoneAssistant.deviceInvoice.issuedBy", {
                          name: data.issued_by,
                        })}
                      </Typography>
                    )}
                  </Box>
                </Stack>

                <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {data.bill_kind && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t(`phoneAssistant.deviceInvoice.kind_${data.bill_kind}`)}
                      sx={{ fontWeight: 600, textTransform: "capitalize" }}
                    />
                  )}
                  <Chip
                    size="small"
                    label={data.status}
                    color={data.is_deleted ? "error" : "warning"}
                    sx={{ fontWeight: 700, textTransform: "capitalize" }}
                  />
                </Stack>
              </Stack>

              {((data.backdated_days ?? 0) > 0 || data.settlement_id) && (
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
                  {(data.backdated_days ?? 0) > 0 && (
                    <Chip
                      size="small"
                      color="warning"
                      variant="outlined"
                      label={t("phoneAssistant.deviceInvoice.backdatedDays", {
                        count: data.backdated_days,
                      })}
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    />
                  )}
                  {data.settlement_id && (
                    <Chip
                      size="small"
                      color="info"
                      variant="outlined"
                      label={t("phoneAssistant.deviceInvoice.settlementTag", {
                        id: data.settlement_id,
                      })}
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    />
                  )}
                </Stack>
              )}
            </Paper>

            {/* 2. Customer */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: "background.paper",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "text.secondary",
                  display: "block",
                  mb: 0.75,
                }}
              >
                {t("phoneAssistant.deviceInvoice.customerHeading")}
              </Typography>
              {data.customer.is_walk_in ? (
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {t("phoneAssistant.deviceInvoice.walkInCustomer")}
                </Typography>
              ) : (
                <Stack spacing={1}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, color: "text.primary" }}
                    >
                      {data.customer.name}
                    </Typography>
                    {data.customer.id_card_status !== undefined && data.customer.id_card_status > 0 && (
                      <Chip
                        size="small"
                        color={data.customer.id_card_status === 1 ? "warning" : "success"}
                        variant="outlined"
                        label={
                          data.customer.id_card_status === 1
                            ? t("phoneAssistant.deviceInvoice.idCardHeld")
                            : t("phoneAssistant.deviceInvoice.idCardReturned")
                        }
                      />
                    )}
                  </Stack>
                  {data.customer.phone && (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
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
                          borderColor: "warning.main",
                          color: "warning.main",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {data.customer.phone}
                      </Button>
                      <Button
                        component="a"
                        href={`https://wa.me/${toWhatsappDigits(data.customer.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<WhatsAppIcon fontSize="small" />}
                        sx={{ minHeight: 38, textTransform: "none", fontWeight: 600 }}
                      >
                        WhatsApp
                      </Button>
                    </Stack>
                  )}
                </Stack>
              )}
            </Paper>

            {/* 3. Money box (only for roles allowed to see money) */}
            {canSeeMoney && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.25,
                  borderRadius: 2.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                }}
              >
                <Stack spacing={0.85}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {t("phoneAssistant.deviceInvoice.totalAmount")}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: "text.primary", fontVariantNumeric: "tabular-nums" }}
                    >
                      {fmtMoney(data.total_amount)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {t("phoneAssistant.deviceInvoice.paidAmount")}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "success.main", fontVariantNumeric: "tabular-nums" }}
                    >
                      {fmtMoney(data.paid_amount)}
                    </Typography>
                  </Stack>

                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between", pt: 0.75, borderTop: "1px dashed", borderColor: "divider" }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                      {t("phoneAssistant.deviceInvoice.balanceDue")}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        color: Number(data.balance_due || 0) > 0 ? "error.main" : "success.main",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtMoney(data.balance_due)}
                    </Typography>
                  </Stack>

                  {(data.rent_amount != null ||
                    (data.items_amount ?? 0) > 0 ||
                    (data.transport_fee ?? 0) > 0 ||
                    (data.discount_amount ?? 0) > 0 ||
                    (data.late_fees ?? 0) > 0 ||
                    (data.returned_amount ?? 0) > 0) && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      {data.rent_amount != null && (
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="caption" color="text.secondary">
                            {t("phoneAssistant.deviceInvoice.rentLabel")}
                          </Typography>
                          <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {fmtMoney(data.rent_amount)}
                          </Typography>
                        </Stack>
                      )}
                      {(data.items_amount ?? 0) > 0 && (
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="caption" color="text.secondary">
                            {t("phoneAssistant.deviceInvoice.itemsAmountLabel")}
                          </Typography>
                          <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {fmtMoney(data.items_amount)}
                          </Typography>
                        </Stack>
                      )}
                      {(data.transport_fee ?? 0) > 0 && (
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="caption" color="text.secondary">
                            {t("phoneAssistant.deviceInvoice.transportLabel")}
                          </Typography>
                          <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {fmtMoney(data.transport_fee)}
                          </Typography>
                        </Stack>
                      )}
                      {(data.discount_amount ?? 0) > 0 && (
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="caption" color="text.secondary">
                            {t("phoneAssistant.deviceInvoice.discountLabel")}
                            {data.discount_reason_key ? ` · ${data.discount_reason_key}` : ""}
                            {data.discount_reason_note ? ` (${data.discount_reason_note})` : ""}
                          </Typography>
                          <Typography variant="caption" color="warning.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            −{fmtMoney(data.discount_amount)}
                          </Typography>
                        </Stack>
                      )}
                      {(data.late_fees ?? 0) > 0 && (
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="caption" color="text.secondary">
                            {t("phoneAssistant.deviceInvoice.lateFeesLabel")}
                          </Typography>
                          <Typography variant="caption" color="error.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {fmtMoney(data.late_fees)}
                          </Typography>
                        </Stack>
                      )}
                      {(data.returned_amount ?? 0) > 0 && (
                        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="caption" color="text.secondary">
                            {t("phoneAssistant.deviceInvoice.returnedLabel")}
                          </Typography>
                          <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {fmtMoney(data.returned_amount)}
                          </Typography>
                        </Stack>
                      )}
                    </>
                  )}
                </Stack>
              </Paper>
            )}

            {/* 4. Machines */}
            {data.items.length > 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.25,
                  borderRadius: 2.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "text.secondary",
                    display: "block",
                    mb: 1.25,
                  }}
                >
                  {t("phoneAssistant.deviceInvoice.itemsHeading")}
                </Typography>

                <Stack spacing={1.25} divider={<Divider sx={{ borderColor: "divider" }} />}>
                  {data.items.map((item, idx) => (
                    <Stack
                      key={`${item.name}-${idx}`}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                          {item.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", display: "block" }}
                        >
                          {t("phoneAssistant.deviceInvoice.qtyLabel", {
                            count: Number(item.quantity || 0),
                          })}
                          {item.borrow_date ? ` · ${fmtDateOnly(item.borrow_date)}` : ""}
                          {item.expected_return_date ? ` → ${fmtDateOnly(item.expected_return_date)}` : ""}
                        </Typography>
                        {(item.line_status || (item.days_late ?? 0) > 0) && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                            {item.line_status && (
                              <Chip size="small" variant="outlined" label={item.line_status} />
                            )}
                            {(item.days_late ?? 0) > 0 && (
                              <Chip
                                size="small"
                                color="error"
                                label={t("phoneAssistant.deviceInvoice.daysLate", { count: item.days_late })}
                                sx={{ fontVariantNumeric: "tabular-nums" }}
                              />
                            )}
                          </Stack>
                        )}
                      </Box>

                      {canSeeMoney && item.line_total != null && (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: "text.primary",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtMoney(item.line_total)}
                        </Typography>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* 5. Items sold (if any) */}
            {saleLines.length > 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.25,
                  borderRadius: 2.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "text.secondary",
                    display: "block",
                    mb: 1.25,
                  }}
                >
                  {t("phoneAssistant.deviceInvoice.saleLinesHeading")}
                </Typography>
                <Stack spacing={1.25} divider={<Divider sx={{ borderColor: "divider" }} />}>
                  {saleLines.map((sl, idx) => (
                    <Stack
                      key={`${sl.name}-${idx}`}
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {sl.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {sl.quantity} {sl.unit || ""}
                          {canSeeMoney && sl.unit_price != null ? ` × ${fmtMoney(sl.unit_price)}` : ""}
                          {(sl.returned_qty ?? 0) > 0 ? ` · ${sl.returned_qty} returned` : ""}
                        </Typography>
                      </Box>
                      {canSeeMoney && sl.line_total != null && (
                        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {fmtMoney(sl.line_total)}
                        </Typography>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* 6. Payments and refunds */}
            {payments.length > 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.25,
                  borderRadius: 2.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "text.secondary",
                    display: "block",
                    mb: 1.25,
                  }}
                >
                  {t("phoneAssistant.deviceInvoice.paymentsHeading")}
                </Typography>
                <Stack spacing={1} divider={<Divider sx={{ borderColor: "divider" }} />}>
                  {payments.map((p, idx) => {
                    const datesDiffer = !sameDay(p.payment_date, p.entered_at);
                    return (
                      <Stack
                        key={p.payment_id ?? idx}
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {p.method}
                            {p.is_refund ? ` (${t("phoneAssistant.deviceInvoice.refundTag")})` : ""}
                            {p.is_voided ? ` (${t("phoneAssistant.deviceInvoice.voidedTag")})` : ""}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontVariantNumeric: "tabular-nums", display: "block" }}
                          >
                            {fmtDateOnly(p.payment_date)}
                            {datesDiffer
                              ? ` · ${t("phoneAssistant.deviceInvoice.enteredOn", {
                                  date: fmtDateOnly(p.entered_at),
                                })}`
                              : ""}
                            {p.staff_name ? ` · ${p.staff_name}` : ""}
                          </Typography>
                        </Box>
                        {canSeeMoney && p.amount != null && (
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                              textDecoration: p.is_voided ? "line-through" : "none",
                              color: p.is_refund ? "error.main" : "success.main",
                            }}
                          >
                            {fmtMoney(p.amount)}
                          </Typography>
                        )}
                      </Stack>
                    );
                  })}
                </Stack>
              </Paper>
            )}

            {/* 7. Calls about this bill */}
            {calls.length > 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.25,
                  borderRadius: 2.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "text.secondary",
                    display: "block",
                    mb: 1,
                  }}
                >
                  {t("phoneAssistant.deviceInvoice.callsHeading")}
                </Typography>
                <Stack spacing={1} divider={<Divider sx={{ borderColor: "divider" }} />}>
                  {calls.map((c) => (
                    <Box key={c.call_id}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {c.outcome
                          ? t(`phoneShell.callCard.outcome_${c.outcome}`)
                          : t(`phoneShell.callCard.direction_${c.direction}`)}
                        {c.result
                          ? ` · ${t(`phoneShell.callCard.result_${c.result}`, { defaultValue: c.result })}`
                          : ""}
                        {c.staff_name ? ` · ${c.staff_name}` : ""}
                      </Typography>
                      {c.note && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {c.note}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {fmtDateOnly(c.started_at)} · {formatCallLength(t, c.duration_seconds)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* 8. History (newest first) */}
            {history.length > 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.25,
                  borderRadius: 2.5,
                  bgcolor: "background.paper",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "text.secondary",
                    display: "block",
                    mb: 1.25,
                  }}
                >
                  {t("phoneAssistant.deviceInvoice.historyHeading")}
                </Typography>
                <Stack spacing={1} divider={<Divider sx={{ borderColor: "divider" }} />}>
                  {history.map((h) => (
                    <Box key={h.id}>
                      <Typography variant="body2" sx={{ fontWeight: h.risk === "high" ? 700 : 500 }}>
                        {isSi ? h.sentence_si : h.sentence_en}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {new Date(h.occurred_at).toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* 9. Action buttons */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <Button
                variant="contained"
                color="warning"
                startIcon={<OpenInNewOutlinedIcon fontSize="small" />}
                onClick={() =>
                  navigate({
                    to: "/invoices",
                    search: { mode: "manage", invoice: data.invoice_id } as any,
                  })
                }
                sx={{ minHeight: 44, textTransform: "none", fontWeight: 700, flex: 1 }}
              >
                {t("phoneAssistant.deviceInvoice.openInGearGrid")}
              </Button>

              {isNativePhoneApp() && (
                <Button
                  variant="outlined"
                  startIcon={<ShareOutlinedIcon fontSize="small" />}
                  disabled={sharingPdf}
                  onClick={() => void handleSharePdf()}
                  sx={{ minHeight: 44, textTransform: "none", fontWeight: 600 }}
                >
                  {t("phoneAssistant.deviceInvoice.sharePdf")}
                </Button>
              )}

              {canCheckActivity && firstUncheckedActivity && !checkedLocal && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircleOutlinedIcon fontSize="small" />}
                  disabled={checking}
                  onClick={() => void handleMarkChecked()}
                  sx={{ minHeight: 44, textTransform: "none", fontWeight: 600 }}
                >
                  {t("phoneAssistant.deviceInvoice.markChecked")}
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
