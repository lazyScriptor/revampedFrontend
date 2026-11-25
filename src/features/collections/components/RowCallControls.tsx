import React, { useContext, useState } from "react";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import { QueryClient, QueryClientContext, QueryClientProvider } from "@tanstack/react-query";
import PhoneIcon from "@mui/icons-material/Phone";
import NoteAddOutlinedIcon from "@mui/icons-material/NoteAddOutlined";
import { useTranslation } from "react-i18next";
import { useMyDevices } from "@/features/signatures/hooks/useSignatures";
import { useDialFromPhone } from "../hooks/useCollections";
import type { LastCallSummary } from "../types";
import { CallCardPopover } from "./CallCardPopover";
import { dashboardTokens as dt, dashboardTones } from "@/features/dashboard/_tokens";

const fallbackQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

interface RowCallControlsProps {
  customerId: number;
  customerName: string;
  phone?: string | null;
  invoiceIds?: number[];
  lastCall?: LastCallSummary | null;
  compact?: boolean;
  externalOpen?: boolean;
  onExternalClose?: () => void;
}

const RowCallControlsInner: React.FC<RowCallControlsProps> = ({
  customerId,
  customerName,
  phone,
  invoiceIds,
  lastCall,
  compact = true,
  externalOpen = false,
  onExternalClose,
}) => {
  const { t } = useTranslation();
  const devicesQuery = useMyDevices();
  const dialMutation = useDialFromPhone();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const devices = (devicesQuery.data as any)?.devices ?? [];
  const hasPairedPhone = Array.isArray(devices) && devices.some((d: any) => !d.status || d.status === "ACTIVE");

  const isOpen = popoverOpen || externalOpen;

  const handleClose = () => {
    setPopoverOpen(false);
    onExternalClose?.();
  };

  const handleCallFromPhone = async (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!phone) return;
    setAnchorEl(e.currentTarget);
    try {
      await dialMutation.mutateAsync({
        phone,
        customer_id: customerId,
        invoice_ids: invoiceIds,
      });
    } catch {
      // Even if dial fails (e.g. offline), still allow logging the call manually
    }
    setPopoverOpen(true);
  };

  const handleOpenManual = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setPopoverOpen(true);
  };

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, flexShrink: 0 }}
    >
      {phone &&
        (hasPairedPhone ? (
          compact ? (
            <Tooltip title={t("collections.call.callFromMyPhone", "Call from my phone")}>
              <IconButton
                size="small"
                onClick={handleCallFromPhone}
                aria-label={t("collections.call.callFromMyPhone", "Call from my phone")}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: dt.radius.sm,
                  border: "1px solid",
                  borderColor: "divider",
                  color: dashboardTones.accent.strong,
                  "&:hover": {
                    bgcolor: dashboardTones.accent.soft,
                    borderColor: dashboardTones.accent.strong,
                  },
                }}
              >
                <PhoneIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PhoneIcon fontSize="small" />}
              onClick={handleCallFromPhone}
              disabled={dialMutation.isPending}
              sx={{ textTransform: "none", fontWeight: 700, minHeight: 34 }}
            >
              {t("collections.call.callFromMyPhone", "Call from my phone")}
            </Button>
          )
        ) : compact ? (
          <Tooltip
            title={t("dashboard.ActionableReturnsTable.call", {
              phone_number: phone,
              defaultValue: `Call ${phone}`,
            })}
          >
            <Box
              component="a"
              href={`tel:${phone}`}
              aria-label={`Call ${phone}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: dt.radius.sm,
                border: "1px solid",
                borderColor: "divider",
                color: dashboardTones.accent.strong,
                textDecoration: "none",
                "&:hover": {
                  bgcolor: dashboardTones.accent.soft,
                  borderColor: dashboardTones.accent.strong,
                },
              }}
            >
              <PhoneIcon sx={{ fontSize: 15 }} />
            </Box>
          </Tooltip>
        ) : (
          <Button
            component="a"
            href={`tel:${phone}`}
            size="small"
            variant="outlined"
            startIcon={<PhoneIcon fontSize="small" />}
            sx={{ textTransform: "none", fontWeight: 700, minHeight: 34 }}
          >
            {t("collections.call.call", "Call")}
          </Button>
        ))}

      {compact ? (
        <Tooltip title={t("collections.callCard.logCall", "Log call")}>
          <IconButton
            size="small"
            onClick={handleOpenManual}
            aria-label={t("collections.callCard.logCall", "Log call")}
            sx={{
              width: 30,
              height: 30,
              borderRadius: dt.radius.sm,
              border: "1px solid",
              borderColor: lastCall?.needs_note ? dashboardTones.warning.strong : "divider",
              color: lastCall?.needs_note ? dashboardTones.warning.strong : "text.secondary",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <NoteAddOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          size="small"
          variant="text"
          startIcon={<NoteAddOutlinedIcon fontSize="small" />}
          onClick={handleOpenManual}
          sx={{ textTransform: "none", fontWeight: 700, minHeight: 34 }}
        >
          {t("collections.callCard.logCall", "Log call")}
        </Button>
      )}

      <CallCardPopover
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        customerId={customerId}
        customerName={customerName}
        phone={phone}
        invoiceIds={invoiceIds}
        initialCall={lastCall}
      />
    </Box>
  );
};

export const RowCallControls: React.FC<RowCallControlsProps> = (props) => {
  const existingClient = useContext(QueryClientContext);
  if (!existingClient) {
    return (
      <QueryClientProvider client={fallbackQueryClient}>
        <RowCallControlsInner {...props} />
      </QueryClientProvider>
    );
  }
  return <RowCallControlsInner {...props} />;
};
