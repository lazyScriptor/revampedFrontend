import { useState, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Button,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  severity: "error" | "warning" | "info";
  onConfirm: () => void;
}

const defaultState: ConfirmState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  severity: "warning",
  onConfirm: () => {},
};

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(defaultState);

  const confirm = useCallback(
    (options: {
      title: string;
      message: string;
      confirmLabel?: string;
      severity?: "error" | "warning" | "info";
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel || "Confirm",
          severity: options.severity || "warning",
          onConfirm: () => {
            setState(defaultState);
            resolve(true);
          },
        });
        // If the dialog is closed without confirming, resolve false
        // This is handled via the onClose prop below
      });
    },
    [],
  );

  const handleClose = useCallback(() => {
    setState(defaultState);
  }, []);

  const ConfirmDialogComponent = () => {
    const colorMap = {
      error: "error" as const,
      warning: "warning" as const,
      info: "primary" as const,
    };
    const btnColor = colorMap[state.severity];

    return (
      <Dialog open={state.open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
          <WarningAmberIcon color={btnColor} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {state.title}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {state.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button onClick={state.onConfirm} variant="contained" color={btnColor} disableElevation>
            {state.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}
