import { ReactNode } from "react";
import {
  Avatar,
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Switch,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * FormDialogShell — the project's signature form dialog scaffold.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │  Hero (dark gradient + avatar + title)   │  ← `header` block
 *   │  optional chip row                        │  ← `headerChips` block
 *   ├──────────────────────────────────────────┤
 *   │  Body — scrollable, padded                │  ← `children`
 *   ├──────────────────────────────────────────┤
 *   │  Footer (sticky)                          │  ← `footer` block
 *   └──────────────────────────────────────────┘
 *
 * Pulled from the CustomerFormDialog pattern so every form across the app
 * matches the same UI rhythm: distinctive hero header, padded scrollable
 * body, sticky footer button bar.
 */
export function FormDialogShell({
  open,
  onClose,
  maxWidth = "md",
  eyebrow,
  title,
  subtitle,
  avatarText,
  avatarIcon,
  headerChips,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Tiny uppercase label above the title — e.g. "Edit Customer" */
  eyebrow?: ReactNode;
  /** Big title — e.g. customer's name or "Register a renter" */
  title: ReactNode;
  /** Smaller description below the title */
  subtitle?: ReactNode;
  /** Single letter or short text shown in the hero avatar (e.g. customer initial) */
  avatarText?: string;
  /** Or a full ReactNode to render inside the avatar (replaces avatarText) */
  avatarIcon?: ReactNode;
  /** Optional chip row rendered below the title (e.g. status badges) */
  headerChips?: ReactNode;
  /** Sticky footer content (typically Cancel + Save buttons) */
  footer: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            // The header has its own bg — turn off Paper's default surface.
            "& .MuiDialogContent-root": { bgcolor: theme.palette.surface.muted },
          },
        },
      }}
    >
      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: "relative",
          px: { xs: 2.5, sm: 4 },
          py: { xs: 2.5, sm: 3.5 },
          background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${alpha(theme.palette.secondary.main, 0.92)} 55%, ${theme.palette.primary.main} 140%)`,
          color: "#fff",
          overflow: "hidden",
        }}
      >
        {/* decorative blobs — pure brand flair */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            bgcolor: alpha(theme.palette.primary.main, 0.18),
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            bottom: -80,
            left: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            bgcolor: alpha(theme.palette.accent.main, 0.18),
            filter: "blur(20px)",
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
            <Avatar
              sx={{
                width: 52,
                height: 52,
                bgcolor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontWeight: 800,
                fontSize: "1.2rem",
                color: "#fff",
              }}
            >
              {avatarIcon || avatarText || "+"}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              {eyebrow && (
                <Typography
                  variant="overline"
                  sx={{ opacity: 0.7, letterSpacing: 2, fontWeight: 700, color: "#fff" }}
                >
                  {eyebrow}
                </Typography>
              )}
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  mt: 0.25,
                  color: "#fff",
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" sx={{ opacity: 0.78, mt: 0.25, color: "#fff" }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.1)",
              color: "#fff",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
              flexShrink: 0,
            }}
            aria-label="Close dialog"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {headerChips && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
            {headerChips}
          </Box>
        )}
      </Box>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <DialogContent
        dividers
        sx={{
          p: 0,
          borderTop: "none",
          bgcolor: theme.palette.surface.muted,
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {children}
        </Box>
      </DialogContent>

      {/* ── Sticky footer ────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          bgcolor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.border.subtle}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        {footer}
      </Box>
    </Dialog>
  );
}

/**
 * SectionLabel — paired icon + heading + hint row for grouping form fields.
 * Use one above each related cluster of inputs.
 */
export function SectionLabel({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1.5,
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          color: theme.palette.primary.main,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "& svg": { fontSize: 16 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2, color: theme.palette.text.primary }}>
          {title}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ lineHeight: 1.2, color: theme.palette.text.secondary }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/**
 * FormSection — labelled, optionally bordered container for a cluster of fields.
 * Pairs naturally with `SectionLabel` to give every section the same rhythm.
 */
export function FormSection({
  icon,
  title,
  hint,
  children,
  bordered = true,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
  bordered?: boolean;
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        ...(bordered && {
          p: 2,
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.border.subtle}`,
          borderRadius: 2,
        }),
      }}
    >
      <SectionLabel icon={icon} title={title} hint={hint} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>{children}</Box>
    </Box>
  );
}

/**
 * FieldGrid — responsive 2-column grid that collapses to 1 column on xs.
 * Use to lay out paired fields like first/last name, phone/email.
 */
export function FieldGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: columns === 1 ? "1fr" : columns === 3 ? "repeat(2, 1fr)" : "1fr 1fr",
          md: columns === 1 ? "1fr" : `repeat(${columns}, 1fr)`,
        },
        gap: 1.5,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * SelectableTypeCard — big radio-like card with icon + label + description.
 * Used for primary "type" choices like Individual vs Business.
 * Wrap two or three in a `<FieldGrid>` to form the chooser row.
 */
export function SelectableTypeCard({
  icon,
  label,
  description,
  selected,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.75,
        borderRadius: 2,
        cursor: disabled ? "not-allowed" : "pointer",
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.08) : theme.palette.background.paper,
        border: `1.5px solid ${selected ? theme.palette.primary.main : theme.palette.border.subtle}`,
        opacity: disabled ? 0.5 : 1,
        transition: "background-color 160ms, border-color 160ms",
        "&:hover": disabled
          ? undefined
          : {
              borderColor: selected ? theme.palette.primary.main : theme.palette.border.strong,
            },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: selected ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1),
          color: selected ? theme.palette.primary.contrastText : theme.palette.primary.main,
          "& svg": { fontSize: 18 },
          transition: "background-color 160ms, color 160ms",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1.2 }}>
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, lineHeight: 1.3, display: "block", mt: 0.25 }}>
            {description}
          </Typography>
        )}
      </Box>
      {selected && (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 18,
            height: 18,
            borderRadius: "50%",
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          ✓
        </Box>
      )}
    </Box>
  );
}

/**
 * ToggleRow — labelled boolean toggle row used as an inline section-style
 * control. Renders an icon chip, title, hint, and a Switch on the right.
 * Used in CustomerFormDialog for "Link to parent" and "Physical NIC retained".
 */
export function ToggleRow({
  icon,
  title,
  hint,
  checked,
  onChange,
  disabled,
}: {
  icon: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.border.subtle}`,
        borderRadius: 2,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 1.5,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "& svg": { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.2 }}>
          {title}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, lineHeight: 1.35, display: "block", mt: 0.25 }}>
            {hint}
          </Typography>
        )}
      </Box>
      <Switch
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        size="small"
      />
    </Box>
  );
}

/**
 * FormFooterMeta — sticky footer-left meta text ("Unsaved changes" / errors).
 * Use this in the `footer` slot of FormDialogShell paired with action buttons.
 */
export function FormFooterMeta({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        minWidth: 0,
        color: theme.palette.text.secondary,
        fontSize: "0.78rem",
        fontWeight: 500,
      }}
    >
      {children}
    </Box>
  );
}
