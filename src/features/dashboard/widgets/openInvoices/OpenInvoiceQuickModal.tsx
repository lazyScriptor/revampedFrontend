import React from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, useMediaQuery, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "@tanstack/react-router";
import { useInvoiceDetails } from "@/features/invoices/hooks/useInvoiceHooks";
import { ReadOnlyInvoiceModal } from "@/features/invoices/components/ReadOnlyInvoiceModal";
import { SkeletonCard, SkeletonListRows } from "@/components/ui/loading";
import type { TemplateKey } from "@/features/whatsapp/api/whatsapp.api";

interface OpenInvoiceQuickModalProps {
  invoiceId: number | null;
  whatsAppTemplate?: TemplateKey;
  onClose: () => void;
}

export const OpenInvoiceQuickModal: React.FC<OpenInvoiceQuickModalProps> = ({
  invoiceId,
  whatsAppTemplate,
  onClose,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoiceDetails(invoiceId);

  if (invoiceId === null) return null;

  if (isLoading || !invoice) {
    return (
      <Dialog
        open
        onClose={onClose}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: isMobile ? 0 : 3 },
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "#0f172a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontWeight: 800,
          }}
        >
          INV-{invoiceId}
          <IconButton aria-label="close" onClick={onClose} sx={{ color: "#94a3b8" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <SkeletonCard height={96} />
          <SkeletonListRows rows={4} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <ReadOnlyInvoiceModal
      open
      onClose={onClose}
      invoice={invoice}
      whatsAppTemplate={whatsAppTemplate}
      onOpenInvoice={() => {
        onClose();
        navigate({
          to: "/invoices",
          search: { mode: "manage", invoiceId } as any,
        });
      }}
    />
  );
};
