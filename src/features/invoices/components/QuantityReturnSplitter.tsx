import { useState, useEffect } from "react";
import { Box, IconButton, Typography, Collapse, Alert, Button, TextField } from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Primary control: how many units are coming back this time (partial return).
// Collapsible: defective qty + actual return date — neither is mandatory.
// The collapsible auto-opens if either field already has a non-default value
// so a user editing a previously-saved return never sees "phantom" state
// hidden behind a closed tray.

interface Props {
  remaining: number;
  returningQty: number;
  defectiveQty: number;
  actualReturnDate: string;
  onChange: (next: {
    returningQty: number;
    defectiveQty: number;
    actualReturnDate: string;
  }) => void;
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  tone?: "neutral" | "error";
  disabled?: boolean;
  size?: "sm" | "md";
}

function Stepper({ value, min, max, onChange, tone = "neutral", disabled, size = "md" }: StepperProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const atMin = value <= min || disabled;
  const atMax = value >= max || disabled;

  const accent =
    tone === "error"
      ? { ring: "#fecaca", text: "#b91c1c", bg: value > 0 ? "#fef2f2" : "white" }
      : { ring: "#cbd5e1", text: "#0f172a", bg: "white" };

  const btn = size === "sm" ? { w: 30, icon: 16 } : { w: 36, icon: 18 };
  const wrap = size === "sm" ? { h: 36, val: 36, fs: "0.95rem" } : { h: 44, val: 40, fs: "1.05rem" };

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid",
        borderColor: accent.ring,
        borderRadius: 999,
        bgcolor: accent.bg,
        height: wrap.h,
        userSelect: "none",
        transition: "background-color 0.15s",
        flexShrink: 0,
      }}
    >
      <IconButton
        size="small"
        onClick={dec}
        disabled={atMin}
        sx={{
          width: btn.w,
          height: btn.w,
          ml: 0.5,
          color: accent.text,
          "&.Mui-disabled": { color: "#e2e8f0" },
        }}
      >
        <RemoveIcon sx={{ fontSize: btn.icon }} />
      </IconButton>
      <Box
        sx={{
          width: wrap.val,
          textAlign: "center",
          fontWeight: 800,
          fontSize: wrap.fs,
          color: accent.text,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Box>
      <IconButton
        size="small"
        onClick={inc}
        disabled={atMax}
        sx={{
          width: btn.w,
          height: btn.w,
          mr: 0.5,
          color: accent.text,
          "&.Mui-disabled": { color: "#e2e8f0" },
        }}
      >
        <AddIcon sx={{ fontSize: btn.icon }} />
      </IconButton>
    </Box>
  );
}

export function QuantityReturnSplitter({
  remaining,
  returningQty,
  defectiveQty,
  actualReturnDate,
  onChange,
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  // Auto-open the secondary tray if either field has a non-default value, so a
  // user re-opening a previously-edited return immediately sees that state.
  const shouldAutoOpen = defectiveQty > 0 || (actualReturnDate && actualReturnDate !== today);
  const [extrasOpen, setExtrasOpen] = useState<boolean>(Boolean(shouldAutoOpen));

  // Keep the tray open if state ever satisfies the open condition (e.g. user
  // dec's defective back to 0 — we don't slam it shut on them mid-edit).
  useEffect(() => {
    if (shouldAutoOpen) setExtrasOpen(true);
  }, [shouldAutoOpen]);

  const goodQty = Math.max(0, returningQty - defectiveQty);
  const stillOut = Math.max(0, remaining - returningQty);

  const setReturning = (n: number) => {
    const clampedReturn = Math.max(0, Math.min(remaining, n));
    // If shrinking returning below current defective, snap defective down too.
    const clampedDefective = Math.min(defectiveQty, clampedReturn);
    onChange({
      returningQty: clampedReturn,
      defectiveQty: clampedDefective,
      actualReturnDate,
    });
  };

  const setDefective = (n: number) => {
    const clamped = Math.max(0, Math.min(returningQty, n));
    onChange({ returningQty, defectiveQty: clamped, actualReturnDate });
  };

  const setDate = (v: string) => {
    onChange({ returningQty, defectiveQty, actualReturnDate: v });
  };

  return (
    <Box
      sx={{
        bgcolor: "#fafafa",
        border: "1px solid #e2e8f0",
        borderRadius: 2,
        p: { xs: 2, sm: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {/* ── Primary: returning qty (partial return) ───────────────────── */}
      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 0.5, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
            How many are coming back?
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            of {remaining} still out
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1, flexWrap: "wrap" }}>
          <Stepper
            value={returningQty}
            min={0}
            max={remaining}
            onChange={setReturning}
            disabled={remaining === 0}
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {stillOut > 0
              ? `${stillOut} unit${stillOut !== 1 ? "s" : ""} will remain out on rental`
              : "All units accounted for"}
          </Typography>
        </Box>
      </Box>

      {/* ── Visual split bar ──────────────────────────────────────────── */}
      <Box>
        <Box
          sx={{
            display: "flex",
            height: 10,
            borderRadius: 5,
            overflow: "hidden",
            bgcolor: "#e2e8f0",
          }}
        >
          {goodQty > 0 && (
            <Box sx={{ flex: goodQty, bgcolor: "success.main", transition: "flex 0.25s ease" }} />
          )}
          {defectiveQty > 0 && (
            <Box sx={{ flex: defectiveQty, bgcolor: "error.main", transition: "flex 0.25s ease" }} />
          )}
          {stillOut > 0 && (
            <Box sx={{ flex: stillOut, bgcolor: "#fde68a", transition: "flex 0.25s ease" }} />
          )}
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1, flexWrap: "wrap", gap: 1 }}>
          <Typography
            variant="caption"
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "success.dark", fontWeight: 700 }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 13 }} />
            {goodQty} good
          </Typography>
          {defectiveQty > 0 && (
            <Typography
              variant="caption"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "error.dark", fontWeight: 700 }}
            >
              <BuildCircleIcon sx={{ fontSize: 13 }} />
              {defectiveQty} defective
            </Typography>
          )}
          {stillOut > 0 && (
            <Typography variant="caption" sx={{ color: "#92400e", fontWeight: 700 }}>
              {stillOut} still out
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Defect routing notice ─────────────────────────────────────── */}
      {defectiveQty > 0 && (
        <Alert
          severity="warning"
          icon={<BuildCircleIcon sx={{ fontSize: 18 }} />}
          sx={{ py: 0.5, "& .MuiAlert-message": { fontSize: "0.78rem", fontWeight: 600 } }}
        >
          {defectiveQty} unit{defectiveQty !== 1 ? "s" : ""} auto-routed to Defect Desk for repair.
        </Alert>
      )}

      {/* ── Collapsible: actual return date + defective qty ───────────── */}
      <Box sx={{ borderTop: "1px dashed #e2e8f0", pt: 1.5 }}>
        <Button
          fullWidth
          onClick={() => setExtrasOpen((v) => !v)}
          endIcon={
            <ExpandMoreIcon
              sx={{
                fontSize: 18,
                transform: extrasOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          }
          sx={{
            justifyContent: "space-between",
            textTransform: "none",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: extrasOpen ? "primary.main" : "text.secondary",
            px: 1,
            "&:hover": { bgcolor: "transparent", color: "primary.main" },
          }}
        >
          {extrasOpen ? "Hide details" : "Mark defective or set return date"}
        </Button>
        <Collapse in={extrasOpen}>
          <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontWeight: 600, mb: 0.5 }}>
                Actual return date
              </Typography>
              <TextField
                type="date"
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
                value={actualReturnDate}
                onChange={(e) => setDate(e.target.value)}
                sx={{ maxWidth: { xs: "100%", sm: 240 }, width: "100%" }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontWeight: 600, mb: 0.5 }}>
                Of those returning, how many are broken or defective?
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                <Stepper
                  value={defectiveQty}
                  min={0}
                  max={returningQty}
                  onChange={setDefective}
                  tone="error"
                  disabled={returningQty === 0}
                />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {defectiveQty === 0
                    ? "All units returning are in good condition"
                    : `${goodQty} good · ${defectiveQty} defective`}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
