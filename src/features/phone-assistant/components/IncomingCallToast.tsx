import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import StarIcon from "@mui/icons-material/Star";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useCanPerform } from "@/components/auth/Can";
import { usePlanChecker } from "@/features/plan/usePlan";
import { connectSocket, getSocket } from "@/lib/socket";
import { CustomerFormDialog } from "@/features/customers/components/CustomerFormDialog";
import { useCallDetails } from "../hooks/useCalls";
import { useUsePhoneContact } from "../hooks/usePhoneContacts";
import type { ContactMatchLite } from "../api/phoneAssistantApi";

interface CallIncomingEvent {
  call_id: number;
  started_at: string;
}

interface CallEndedEvent {
  call_id: number;
  duration_seconds: number | null;
}

interface AddCustomerDialogState {
  open: boolean;
  prefill?: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
  };
  sourceContactId?: number | null;
}

const formatCallerPhone = (rawNumber?: string | null, phoneE164?: string | null): string => {
  if (phoneE164 && /^94\d{9}$/.test(phoneE164)) {
    return `0${phoneE164.slice(2)}`;
  }
  if (rawNumber && rawNumber.trim()) return rawNumber.trim();
  if (phoneE164) return `+${phoneE164}`;
  return "—";
};

const splitDisplayName = (displayName: string) => {
  const parts = String(displayName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
};

export function IncomingCallToast() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canViewCalls = useCanPerform("calls:view");
  const canPlan = usePlanChecker();
  const allowed = Boolean(canViewCalls && canPlan("phone_assistant"));

  const [activeCallId, setActiveCallId] = useState<number | null>(null);
  const [endedDuration, setEndedDuration] = useState<number | null>(null);
  const [hasEnded, setHasEnded] = useState(false);
  const [customerDialog, setCustomerDialog] = useState<AddCustomerDialogState>({ open: false });

  const activeCallIdRef = useRef<number | null>(null);
  activeCallIdRef.current = activeCallId;

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    clearDismissTimer();
    setActiveCallId(null);
    setHasEnded(false);
    setEndedDuration(null);
  }, [clearDismissTimer]);

  useEffect(() => {
    if (!allowed) return;

    connectSocket();
    const socket = getSocket();

    const handleIncoming = (payload: CallIncomingEvent) => {
      if (!payload?.call_id) return;
      clearDismissTimer();
      setActiveCallId(Number(payload.call_id));
      setHasEnded(false);
      setEndedDuration(null);
    };

    const handleEnded = (payload: CallEndedEvent) => {
      if (!payload?.call_id) return;
      if (activeCallIdRef.current !== Number(payload.call_id)) return;
      setHasEnded(true);
      setEndedDuration(
        payload.duration_seconds !== null && payload.duration_seconds !== undefined
          ? Number(payload.duration_seconds)
          : null,
      );
      queryClient.invalidateQueries({ queryKey: ["calls"] });

      clearDismissTimer();
      dismissTimerRef.current = setTimeout(() => {
        setActiveCallId(null);
        setHasEnded(false);
        setEndedDuration(null);
      }, 10_000);
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:ended", handleEnded);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:ended", handleEnded);
      clearDismissTimer();
    };
  }, [allowed, clearDismissTimer, queryClient]);

  const { data, isLoading } = useCallDetails(activeCallId, allowed && activeCallId !== null);
  const useContactMutation = useUsePhoneContact();

  if (!allowed) return null;

  const handleOpenCustomer = () => {
    dismissToast();
    navigate({ to: "/customers" });
  };

  const handleNewBill = () => {
    dismissToast();
    navigate({ to: "/invoices", search: { mode: "dispatch" } as any });
  };

  const handleAddContactAsCustomer = async (contact: ContactMatchLite) => {
    try {
      const prefill = await useContactMutation.mutateAsync(contact.contact_id);
      setCustomerDialog({
        open: true,
        prefill: {
          first_name: prefill.first_name,
          last_name: prefill.last_name,
          phone_number: prefill.phone_number,
        },
        sourceContactId: contact.contact_id,
      });
    } catch {
      const split = splitDisplayName(contact.display_name);
      setCustomerDialog({
        open: true,
        prefill: {
          first_name: split.first_name,
          last_name: split.last_name,
          phone_number: formatCallerPhone(null, contact.phone_e164),
        },
        sourceContactId: contact.contact_id,
      });
    }
  };

  const handleAddUnknownAsCustomer = (phoneDisplay: string) => {
    setCustomerDialog({
      open: true,
      prefill: {
        phone_number: phoneDisplay === "—" ? "" : phoneDisplay,
      },
      sourceContactId: null,
    });
  };

  const isDark = theme.palette.mode === "dark";
  const surfaceBg = isDark ? "#0f172a" : "#ffffff";
  const surfaceBorder = isDark ? "#334155" : "#e2e8f0";
  const primaryText = isDark ? "#f8fafc" : "#0f172a";
  const secondaryText = isDark ? "#cbd5e1" : "#475569";

  const brief = data?.match === "customer" ? data.brief : null;
  const contact = data?.match === "contact" ? data.contact : null;
  const call = data?.call;
  const phoneDisplay = formatCallerPhone(
    call?.raw_number,
    brief?.phones?.[0] ?? contact?.phone_e164 ?? call?.phone_e164,
  );
  const isBlacklisted = brief?.status === "Blacklisted";

  return (
    <>
      {activeCallId !== null && (
        <Paper
          role="status"
          aria-live="polite"
          data-testid="incoming-call-toast"
          elevation={8}
          sx={{
            position: "fixed",
            bottom: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            width: { xs: "calc(100vw - 32px)", sm: 380 },
            maxWidth: "calc(100vw - 32px)",
            zIndex: 1400,
            bgcolor: surfaceBg,
            color: primaryText,
            border: `1px solid ${isBlacklisted ? theme.palette.error.main : surfaceBorder}`,
            borderTop: `3px solid ${isBlacklisted ? theme.palette.error.main : theme.palette.primary.main}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {isBlacklisted && (
            <Box
              data-testid="incoming-call-blacklisted-banner"
              sx={{
                bgcolor: "error.main",
                color: "error.contrastText",
                px: 2,
                py: 0.75,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <WarningAmberIcon sx={{ fontSize: 18 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {t("phoneAssistant.calls.blacklistedBanner")}
              </Typography>
            </Box>
          )}

          <Box sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.25 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: isBlacklisted
                      ? "rgba(225, 29, 72, 0.14)"
                      : "rgba(245, 158, 11, 0.16)",
                    color: isBlacklisted ? "error.main" : "primary.main",
                    flexShrink: 0,
                  }}
                >
                  <PhoneOutlinedIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: primaryText }}>
                      {hasEnded
                        ? t("phoneAssistant.calls.endedTitle")
                        : t("phoneAssistant.calls.incomingTitle")}
                    </Typography>
                    {hasEnded && endedDuration !== null && (
                      <Chip
                        size="small"
                        label={t("phoneAssistant.calls.durationSeconds", { seconds: endedDuration })}
                        sx={{ height: 18, fontSize: "0.7rem", fontVariantNumeric: "tabular-nums" }}
                      />
                    )}
                  </Box>
                  {call?.device_label && (
                    <Typography variant="caption" sx={{ color: secondaryText, display: "block" }} noWrap>
                      {t("phoneAssistant.calls.viaDevice", { device: call.device_label })}
                    </Typography>
                  )}
                </Box>
              </Box>

              <IconButton
                aria-label={t("phoneAssistant.calls.dismiss")}
                size="small"
                onClick={dismissToast}
                sx={{ color: secondaryText, width: 32, height: 32 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {isLoading && !data ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" sx={{ color: secondaryText }}>
                  {t("phoneAssistant.calls.loadingCaller")}
                </Typography>
              </Box>
            ) : brief ? (
              <Stack spacing={1.25}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: primaryText, lineHeight: 1.25 }} noWrap>
                      {brief.display_name}
                    </Typography>
                    {brief.rating !== null && brief.rating !== undefined && (
                      <Chip
                        size="small"
                        icon={<StarIcon sx={{ fontSize: "14px !important", color: "#f59e0b !important" }} />}
                        label={brief.rating.toFixed(1)}
                        sx={{
                          height: 22,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          bgcolor: isDark ? "#1e293b" : "#fffbeb",
                          color: isDark ? "#fbbf24" : "#b45309",
                        }}
                      />
                    )}
                  </Box>

                  {(brief.company_name || brief.parent_company) && (
                    <Typography variant="caption" sx={{ color: secondaryText, display: "block" }} noWrap>
                      {[brief.company_name, brief.parent_company].filter(Boolean).join(" · ")}
                    </Typography>
                  )}

                  <Typography
                    variant="caption"
                    sx={{ color: secondaryText, fontVariantNumeric: "tabular-nums", display: "block", mt: 0.25 }}
                  >
                    {phoneDisplay}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: isDark ? "#1e293b" : "#f8fafc",
                    border: `1px solid ${surfaceBorder}`,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: primaryText }}
                  >
                    {brief.summary_line}
                  </Typography>
                  {brief.id_retained && (
                    <Chip
                      size="small"
                      label={t("phoneAssistant.calls.idRetained")}
                      color="warning"
                      variant="outlined"
                      sx={{ mt: 0.75, height: 20, fontSize: "0.7rem" }}
                    />
                  )}
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleOpenCustomer}
                    sx={{ flex: 1, fontWeight: 600 }}
                  >
                    {t("phoneAssistant.calls.openCustomer")}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={<ReceiptLongOutlinedIcon sx={{ fontSize: 16 }} />}
                    onClick={handleNewBill}
                    sx={{ flex: 1, fontWeight: 600 }}
                  >
                    {t("phoneAssistant.calls.newBill")}
                  </Button>
                </Box>
              </Stack>
            ) : contact ? (
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: primaryText }}>
                    {contact.display_name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: secondaryText, fontVariantNumeric: "tabular-nums" }}
                  >
                    {phoneDisplay}
                  </Typography>
                  {contact.device_label && (
                    <Chip
                      size="small"
                      label={t("phoneAssistant.calls.fromDeviceContact", { device: contact.device_label })}
                      sx={{ mt: 0.75, height: 22 }}
                    />
                  )}
                </Box>

                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  disabled={useContactMutation.isPending}
                  onClick={() => handleAddContactAsCustomer(contact)}
                  sx={{ fontWeight: 600 }}
                >
                  {t("phoneAssistant.calls.addAsCustomer")}
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: primaryText }}>
                    {t("phoneAssistant.calls.notInGearGrid")}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: secondaryText, fontVariantNumeric: "tabular-nums" }}
                  >
                    {phoneDisplay}
                  </Typography>
                </Box>

                {phoneDisplay !== "—" && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleAddUnknownAsCustomer(phoneDisplay)}
                    sx={{ fontWeight: 600 }}
                  >
                    {t("phoneAssistant.calls.addAsCustomer")}
                  </Button>
                )}
              </Stack>
            )}
          </Box>
        </Paper>
      )}

      {customerDialog.open && (
        <CustomerFormDialog
          open={customerDialog.open}
          onClose={() => setCustomerDialog({ open: false })}
          prefill={customerDialog.prefill}
          sourceContactId={customerDialog.sourceContactId}
          onCreated={() => {
            setCustomerDialog({ open: false });
            queryClient.invalidateQueries({ queryKey: ["calls"] });
          }}
        />
      )}
    </>
  );
}
