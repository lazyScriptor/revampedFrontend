import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

// MUI Imports
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery,
  Divider,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  EmailOutlined as MailIcon,
  LockOutlined as LockIcon,
  Language as LanguageIcon,
  CheckCircle as CheckCircleIcon,
  FiberManualRecord as DotIcon,
  ArrowForward as ArrowForwardIcon,
  Construction as EquipmentIcon,
  Warehouse as WarehouseIcon,
  ShieldOutlined as ShieldIcon,
  AutoMode as AutoModeIcon,
} from "@mui/icons-material";

// Local Imports
import {
  loginSchema,
  LoginCredentials,
} from "@/features/auth/schemas/auth.schema";
import { loginUser } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/stores/useAuthStore";
import { GearGridLoader } from "@/components/ui/GearGridLoader";

export default function LoginRoute() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Toggle Language between English and Sinhala
  const currentLang = i18n.language || "en";
  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  // Form setup with Zod validation
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // TanStack Query Mutation
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data: any) => {
      const user = data?.user || data?.data?.user || data;
      const token =
        data?.token ||
        data?.accessToken ||
        data?.data?.token ||
        data?.data?.accessToken ||
        null;
      setAuth(user, token);
      navigate({ to: "/dashboard" });
    },
  });

  const onSubmit = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  // Quick-fill helper for demo convenience
  const fillSampleCredentials = (email: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", "Admin@123456", { shouldValidate: true });
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "#070B14",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 1. LEFT PANEL: Cinematic Brand Showcase (Hidden on small mobile)      */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {!isMobile && (
        <Box
          sx={{
            flex: { md: "1 1 52%", lg: "1 1 55%" },
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            p: { md: 6, lg: 8 },
            overflow: "hidden",
            background: "linear-gradient(145deg, #070B14 0%, #0F172A 50%, #0A1124 100%)",
            borderRight: "1px solid rgba(255, 255, 255, 0.07)",
          }}
        >
          {/* Ambient Lighting Gradients */}
          <Box
            sx={{
              position: "absolute",
              top: "-15%",
              left: "-10%",
              width: "600px",
              height: "600px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0) 70%)",
              filter: "blur(70px)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: "-15%",
              right: "-10%",
              width: "550px",
              height: "550px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(37, 99, 235, 0.14) 0%, rgba(37, 99, 235, 0) 70%)",
              filter: "blur(80px)",
              pointerEvents: "none",
            }}
          />

          {/* Coordinate Precision Grid Texture */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
              pointerEvents: "none",
            }}
          />

          {/* Kinetic Background Gears (Dual Interlocking Rotation) */}
          <Box
            sx={{
              position: "absolute",
              right: "-120px",
              top: "22%",
              opacity: 0.12,
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
              style={{ width: 440, height: 440 }}
            >
              <svg viewBox="0 0 200 200" fill="none" stroke="#F59E0B" strokeWidth="2.5">
                <circle cx="100" cy="100" r="75" strokeDasharray="6 4" />
                <circle cx="100" cy="100" r="50" />
                <circle cx="100" cy="100" r="22" fill="#F59E0B" fillOpacity="0.1" />
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <rect
                    key={deg}
                    x="94"
                    y="10"
                    width="12"
                    height="18"
                    rx="3"
                    fill="#F59E0B"
                    transform={`rotate(${deg} 100 100)`}
                  />
                ))}
              </svg>
            </motion.div>
          </Box>

          <Box
            sx={{
              position: "absolute",
              right: "180px",
              top: "52%",
              opacity: 0.08,
              pointerEvents: "none",
            }}
          >
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              style={{ width: 280, height: 280 }}
            >
              <svg viewBox="0 0 200 200" fill="none" stroke="#38BDF8" strokeWidth="2.5">
                <circle cx="100" cy="100" r="65" strokeDasharray="4 4" />
                <circle cx="100" cy="100" r="35" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <rect
                    key={deg}
                    x="95"
                    y="18"
                    width="10"
                    height="16"
                    rx="2.5"
                    fill="#38BDF8"
                    transform={`rotate(${deg} 100 100)`}
                  />
                ))}
              </svg>
            </motion.div>
          </Box>

          {/* Top Brand Banner */}
          <Box sx={{ position: "relative", zIndex: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {/* Rotating Logo Insignia */}
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 24px -4px rgba(245, 158, 11, 0.35)",
                }}
              >
                <GearGridLoader size={26} color="primary" />
              </Box>

              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    color: "#FFFFFF",
                    letterSpacing: "-0.02em",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  GearGrid
                  <Box component="span" sx={{ color: "#F59E0B" }}>
                    .
                  </Box>
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#94A3B8",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontSize: "0.68rem",
                  }}
                >
                  Operations OS
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Center Showcase Narrative */}
          <Box sx={{ position: "relative", zIndex: 2, my: "auto", py: 4 }}>
            {/* Pill Tag */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Chip
                icon={<AutoModeIcon sx={{ fontSize: 15, color: "#F59E0B !important" }} />}
                label="Enterprise Fleet Telemetry & Rental POS"
                size="small"
                sx={{
                  backgroundColor: "rgba(245, 158, 11, 0.12)",
                  color: "#FBBF24",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  mb: 3,
                  py: 0.5,
                  px: 1,
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  color: "#FFFFFF",
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  fontSize: { md: "2.4rem", lg: "3rem" },
                  mb: 2.5,
                }}
              >
                Orchestrate fleet operations with{" "}
                <Box
                  component="span"
                  sx={{
                    background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #F97316 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  absolute clarity.
                </Box>
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: "#94A3B8",
                  fontSize: "1rem",
                  lineHeight: 1.65,
                  maxWidth: "520px",
                  mb: 5,
                }}
              >
                Multi-warehouse asset dispatching, continuous return settlements,
                preventative maintenance tickets, and double-entry accounting — unified in a
                single multi-tenant architecture.
              </Typography>
            </motion.div>

            {/* 3 Telemetry Feature Badges */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: "500px" }}>
              {[
                {
                  icon: <EquipmentIcon sx={{ color: "#F59E0B" }} />,
                  title: "Intelligent Fleet Lifecycle",
                  desc: "Barcode/serial tracking with automated defect resolution pipelines.",
                },
                {
                  icon: <WarehouseIcon sx={{ color: "#38BDF8" }} />,
                  title: "Multi-Warehouse Routing",
                  desc: "Real-time inventory sync & split-quantity return reconciliations.",
                },
                {
                  icon: <ShieldIcon sx={{ color: "#10B981" }} />,
                  title: "Dedicated Tenant Security",
                  desc: "Database-per-tenant isolation with granular role permission overrides.",
                },
              ].map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + idx * 0.12 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 2,
                      borderRadius: 3,
                      backgroundColor: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.07)",
                      backdropFilter: "blur(12px)",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        backgroundColor: "rgba(15, 23, 42, 0.85)",
                        borderColor: "rgba(245, 158, 11, 0.3)",
                        transform: "translateX(4px)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2.5,
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ color: "#F1F5F9", fontWeight: 700, fontSize: "0.88rem" }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "#64748B", fontSize: "0.76rem", display: "block" }}
                      >
                        {item.desc}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              ))}
            </Box>
          </Box>

          {/* Bottom Live System Pulse */}
          <Box
            sx={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              pt: 3,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#10B981",
                  boxShadow: "0 0 10px #10B981",
                }}
              />
              <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                Master Platform Telemetry: Active
              </Typography>
            </Box>

            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 500 }}>
              GearGrid Engine v2.4
            </Typography>
          </Box>
        </Box>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* 2. RIGHT PANEL: The High-Precision Authentication Console             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          flex: { xs: "1 1 100%", md: "1 1 48%", lg: "1 1 45%" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          p: { xs: 3, sm: 6, lg: 8 },
          position: "relative",
          zIndex: 10,
          backgroundColor: "#0A0F1D",
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245, 158, 11, 0.08), transparent 70%), radial-gradient(circle at 100% 100%, rgba(37, 99, 235, 0.06), transparent 50%)",
        }}
      >
        {/* Top Control Bar: Language Switcher & System Status */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 460,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          {/* Mobile Logo Fallback */}
          {isMobile ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #1E293B, #0F172A)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GearGridLoader size={18} color="primary" />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#FFFFFF" }}>
                GearGrid<Box component="span" sx={{ color: "#F59E0B" }}>.</Box>
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DotIcon sx={{ color: "#10B981", fontSize: 12 }} />
              <Typography
                variant="caption"
                sx={{ color: "#64748B", fontWeight: 600, letterSpacing: "0.03em" }}
              >
                All Systems Operational
              </Typography>
            </Box>
          )}

          {/* Language Selector Pill */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              p: 0.5,
              borderRadius: "999px",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <Button
              size="small"
              onClick={() => toggleLanguage("en")}
              sx={{
                minHeight: 26,
                py: 0.25,
                px: 1.5,
                borderRadius: "999px",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: currentLang === "en" ? "#0F172A" : "#94A3B8",
                backgroundColor: currentLang === "en" ? "#F59E0B" : "transparent",
                "&:hover": {
                  backgroundColor: currentLang === "en" ? "#D97706" : "rgba(255, 255, 255, 0.08)",
                },
              }}
            >
              EN
            </Button>
            <Button
              size="small"
              onClick={() => toggleLanguage("si")}
              sx={{
                minHeight: 26,
                py: 0.25,
                px: 1.5,
                borderRadius: "999px",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: currentLang === "si" ? "#0F172A" : "#94A3B8",
                backgroundColor: currentLang === "si" ? "#F59E0B" : "transparent",
                "&:hover": {
                  backgroundColor: currentLang === "si" ? "#D97706" : "rgba(255, 255, 255, 0.08)",
                },
              }}
            >
              සිංහල
            </Button>
          </Box>
        </Box>

        {/* ── Main Glassmorphic Auth Card ── */}
        <Paper
          elevation={0}
          component={motion.div}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          sx={{
            width: "100%",
            maxWidth: 460,
            p: { xs: 3.5, sm: 5 },
            borderRadius: 4,
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow:
              "0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.06)",
          }}
        >
          {/* Card Header */}
          <Box sx={{ mb: 3.5, textAlign: "left" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 900,
                  color: "#FFFFFF",
                  letterSpacing: "-0.03em",
                  fontSize: { xs: "1.75rem", sm: "2rem" },
                }}
              >
                {t("login.signIn") || "Welcome Back"}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ color: "#94A3B8", fontWeight: 500, fontSize: "0.88rem" }}
            >
              Enter your corporate email to access your workspace.
            </Typography>
          </Box>

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ width: "100%" }}
            noValidate
          >
            {/* Email Field */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "#CBD5E1",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  fontSize: "0.7rem",
                  letterSpacing: "0.06em",
                  display: "block",
                  mb: 0.75,
                }}
              >
                {t("login.workEmail") || "Corporate Email"}
              </Typography>
              <TextField
                required
                fullWidth
                id="email"
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                {...register("email")}
                error={!!errors.email}
                helperText={errors.email?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailIcon sx={{ color: "#64748B", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                    backgroundColor: "rgba(2, 6, 23, 0.6)",
                    color: "#FFFFFF",
                    fontSize: "0.92rem",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    transition: "all 0.2s ease",
                    "& fieldset": { border: "none" },
                    "&:hover": {
                      backgroundColor: "rgba(2, 6, 23, 0.8)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "rgba(2, 6, 23, 0.95)",
                      border: "1.5px solid #F59E0B",
                      boxShadow: "0 0 0 3px rgba(245, 158, 11, 0.2)",
                    },
                  },
                  "& .MuiFormHelperText-root": {
                    color: "#F87171",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    mt: 0.5,
                  },
                }}
              />
            </Box>

            {/* Password Field */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#CBD5E1",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: "0.7rem",
                    letterSpacing: "0.06em",
                  }}
                >
                  {t("login.password") || "Password"}
                </Typography>
                <Tooltip title="Contact your tenant administrator to reset credentials" arrow>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#F59E0B",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    {t("login.forgotPassword") || "Forgot?"}
                  </Typography>
                </Tooltip>
              </Box>

              <TextField
                required
                fullWidth
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                autoComplete="current-password"
                {...register("password")}
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: "#64748B", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                        size="small"
                        sx={{ color: "#64748B", "&:hover": { color: "#F1F5F9" } }}
                      >
                        {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2.5,
                    backgroundColor: "rgba(2, 6, 23, 0.6)",
                    color: "#FFFFFF",
                    fontSize: "0.92rem",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    transition: "all 0.2s ease",
                    "& fieldset": { border: "none" },
                    "&:hover": {
                      backgroundColor: "rgba(2, 6, 23, 0.8)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "rgba(2, 6, 23, 0.95)",
                      border: "1.5px solid #F59E0B",
                      boxShadow: "0 0 0 3px rgba(245, 158, 11, 0.2)",
                    },
                  },
                  "& .MuiFormHelperText-root": {
                    color: "#F87171",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    mt: 0.5,
                  },
                }}
              />
            </Box>

            {/* Remember Me Checkbox */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    size="small"
                    sx={{
                      color: "#475569",
                      "&.Mui-checked": { color: "#F59E0B" },
                    }}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "0.8rem" }}>
                    {t("login.rememberMe") || "Remember this device for 30 days"}
                  </Typography>
                }
              />
            </Box>

            {/* API Error Notification */}
            <AnimatePresence>
              {loginMutation.isError && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert
                    severity="error"
                    variant="filled"
                    sx={{
                      mb: 2.5,
                      borderRadius: 2.5,
                      backgroundColor: "rgba(220, 38, 38, 0.9)",
                      color: "#FFFFFF",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      alignItems: "center",
                      boxShadow: "0 4px 14px rgba(220, 38, 38, 0.25)",
                    }}
                  >
                    {loginMutation.error instanceof Error
                      ? loginMutation.error.message
                      : t("login.invalidCredentials") || "Invalid email or password"}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Action Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loginMutation.isPending}
              sx={{
                py: 1.6,
                borderRadius: 2.5,
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                color: "#0F172A",
                fontWeight: 800,
                fontSize: "0.95rem",
                letterSpacing: "0.01em",
                textTransform: "none",
                boxShadow: "0 8px 24px -4px rgba(245, 158, 11, 0.45)",
                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                "&:hover": {
                  background: "linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)",
                  boxShadow: "0 12px 32px -4px rgba(245, 158, 11, 0.65)",
                  transform: "translateY(-1.5px)",
                },
                "&:active": {
                  transform: "translateY(0px)",
                },
                "&.Mui-disabled": {
                  background: "rgba(245, 158, 11, 0.5)",
                  color: "#0F172A",
                },
              }}
            >
              {loginMutation.isPending ? (
                <GearGridLoader size="xs" color="secondary" label="Authenticating Workspace..." />
              ) : (
                <>
                  <span>{t("login.signIn") || "Sign In to Workspace"}</span>
                  <ArrowForwardIcon sx={{ fontSize: 18 }} />
                </>
              )}
            </Button>
          </Box>

          <Divider sx={{ my: 3.5, borderColor: "rgba(255, 255, 255, 0.08)" }} />

          {/* Super Admin Routing Callout */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1.5,
              borderRadius: 2,
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 500, fontSize: "0.76rem" }}>
              Platform Super Administrator?
            </Typography>
            <Link
              to="/super-admin/login"
              style={{ textDecoration: "none" }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#F59E0B",
                  fontWeight: 700,
                  fontSize: "0.76rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Control Console →
              </Typography>
            </Link>
          </Box>

          {/* Phone-first entry: operators who installed the app as a PWA on
              their phone land here from app.geargrid.live/. This visible
              link lets them discover the pairing page without typing a URL. */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1.5,
              mt: 1.25,
              borderRadius: 2,
              backgroundColor: "rgba(29, 78, 216, 0.08)",
              border: "1px solid rgba(29, 78, 216, 0.25)",
            }}
          >
            <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 500, fontSize: "0.76rem" }}>
              Signing bills from a phone?
            </Typography>
            <Link to="/pair" style={{ textDecoration: "none" }}>
              <Typography
                variant="caption"
                sx={{
                  color: "#60A5FA",
                  fontWeight: 700,
                  fontSize: "0.76rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Pair this phone →
              </Typography>
            </Link>
          </Box>
        </Paper>

        {/* Security & Multi-Tenant Assurance Footer */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 460,
            mt: 3.5,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShieldIcon sx={{ fontSize: 14, color: "#64748B" }} />
            <Typography variant="caption" sx={{ color: "#64748B", fontSize: "0.72rem", fontWeight: 500 }}>
              End-to-End Encrypted • Multi-Tenant Schema Isolated
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "#475569", fontSize: "0.68rem" }}>
            © {new Date().getFullYear()} GearGrid Technologies Inc. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
