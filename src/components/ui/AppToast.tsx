import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { Snackbar, Box, Typography, IconButton } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmberOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

type Severity = "success" | "error" | "warning" | "info";

interface ToastOptions {
  title?: string;
  message: string;
  severity?: Severity;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
};

const SEVERITY_ICONS: Record<Severity, React.ReactNode> = {
  success: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,
  error: <ErrorOutlineIcon sx={{ fontSize: 18 }} />,
  warning: <WarningAmberIcon sx={{ fontSize: 18 }} />,
  info: <InfoOutlinedIcon sx={{ fontSize: 18 }} />,
};

const DEFAULT_TITLES: Record<Severity, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ToastOptions>({
    message: "",
    severity: "info",
    duration: 5000,
  });

  const showToast = useCallback((options: ToastOptions | string) => {
    const opts: ToastOptions =
      typeof options === "string" ? { message: options, severity: "info" } : options;
    setCurrent({ severity: "info", duration: 5000, ...opts });
    setOpen(true);
  }, []);

  const showSuccess = useCallback(
    (message: string, title?: string) =>
      showToast({ message, title, severity: "success" }),
    [showToast],
  );
  const showError = useCallback(
    (message: string, title?: string) =>
      showToast({ message, title, severity: "error", duration: 7000 }),
    [showToast],
  );
  const showWarning = useCallback(
    (message: string, title?: string) =>
      showToast({ message, title, severity: "warning" }),
    [showToast],
  );
  const showInfo = useCallback(
    (message: string, title?: string) =>
      showToast({ message, title, severity: "info" }),
    [showToast],
  );

  const value = useMemo(
    () => ({ showToast, showSuccess, showError, showWarning, showInfo }),
    [showToast, showSuccess, showError, showWarning, showInfo],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastSurface
        open={open}
        onClose={() => setOpen(false)}
        current={current}
      />
    </ToastContext.Provider>
  );
};

// Separate component so it can read the live theme (per-tenant branding).
const ToastSurface: React.FC<{
  open: boolean;
  onClose: () => void;
  current: ToastOptions;
}> = ({ open, onClose, current }) => {
  const theme = useTheme();
  const sev = current.severity || "info";

  const palette = theme.palette[sev];
  const accentStrong = palette.main;
  const accentSoft = alpha(accentStrong, 0.1);
  const accentText = palette.dark || palette.main;

  return (
    <Snackbar
      open={open}
      autoHideDuration={current.duration}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      sx={{
        "& .MuiSnackbarContent-root": { p: 0 },
        maxWidth: 420,
        minWidth: 320,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          pl: 1.5,
          pr: 1,
          py: 1.25,
          borderRadius: 2,
          borderLeft: `3px solid ${accentStrong}`,
          backgroundColor: theme.palette.background.paper,
          boxShadow: theme.shadows[6],
          minWidth: 320,
          maxWidth: 420,
          border: `1px solid ${theme.palette.border.subtle}`,
          borderLeftWidth: 3,
          borderLeftColor: accentStrong,
        }}
      >
        {/* Icon chip — tinted with the severity's tone */}
        <Box
          sx={{
            mt: 0.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 1.5,
            backgroundColor: accentSoft,
            color: accentStrong,
            flexShrink: 0,
          }}
        >
          {SEVERITY_ICONS[sev]}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.8rem",
              color: theme.palette.text.primary,
              lineHeight: 1.3,
            }}
          >
            {current.title || DEFAULT_TITLES[sev]}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: theme.palette.text.secondary,
              lineHeight: 1.45,
              mt: 0.25,
              wordBreak: "break-word",
            }}
          >
            {current.message}
          </Typography>
        </Box>

        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: theme.palette.text.disabled,
            "&:hover": { color: accentText, backgroundColor: accentSoft },
            mt: -0.25,
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Snackbar>
  );
};
