import { useState } from "react";
import { Button, IconButton, Tooltip } from "@mui/material";
import { useTranslation } from "react-i18next";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

import { Can } from "@/components/auth/Can";
import type { TemplateKey } from "../api/whatsapp.api";
import { WA_GREEN, WA_GREEN_TEXT, WhatsAppSendDialog } from "./WhatsAppSendDialog";

interface WhatsAppButtonProps {
  invoiceId?: number;
  customerId?: number;
  templateKey?: TemplateKey;
  /** icon-only (default) or a labelled button */
  variant?: "icon" | "button";
  size?: "small" | "medium";
  disabled?: boolean;
  fullWidth?: boolean;
  label?: string;
}

// One drop-in "send this on WhatsApp" control. Hidden for people without the permission.
export function WhatsAppButton({ invoiceId, customerId, templateKey, variant = "icon", size = "small", disabled, fullWidth, label }: WhatsAppButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const text = label ?? t("whatsapp.button.send");

  if (!invoiceId && !customerId) return null;

  return (
    <Can perform="whatsapp:send">
      {variant === "icon" ? (
        <Tooltip title={text}>
          <span>
            <IconButton
              size={size}
              aria-label={text}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              sx={{ color: "#1fa855", "&:hover": { bgcolor: "rgba(37, 211, 102, 0.12)" } }}
            >
              <WhatsAppIcon fontSize={size === "small" ? "small" : "medium"} />
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Button
          size={size}
          variant="contained"
          disableElevation
          fullWidth={fullWidth}
          disabled={disabled}
          startIcon={<WhatsAppIcon />}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          sx={{ bgcolor: WA_GREEN, color: WA_GREEN_TEXT, fontWeight: 800, borderRadius: 2.5, textTransform: "none", "&:hover": { bgcolor: "#1fbd5b" } }}
        >
          {text}
        </Button>
      )}
      {open && <WhatsAppSendDialog open={open} onClose={() => setOpen(false)} invoiceId={invoiceId} customerId={customerId} templateKey={templateKey} />}
    </Can>
  );
}
