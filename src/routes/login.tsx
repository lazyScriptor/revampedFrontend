import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

// MUI Imports
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

// Local Imports
import {
  loginSchema,
  LoginCredentials,
} from "@/features/auth/schemas/auth.schema";
import { loginUser } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/stores/useAuthStore";

export default function LoginRoute() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useTranslation();

  // 1. Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
  });

  // 2. Setup TanStack Query Mutation
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      setAuth(data.user);
      navigate({ to: "/dashboard" });
    },
  });

  // 3. Form Submission Handler
  const onSubmit = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    // Background container: Subtle SaaS grid pattern
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc", // slate-50
        backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", // slate-300 dots
        backgroundSize: "24px 24px",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, md: 6 },
            display: "flex",
            flexDirection: "column",
            borderRadius: 4,
            border: "1px solid #e2e8f0", // slate-200
            boxShadow:
              "0 20px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.05)",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Header Section */}
          <Box sx={{ mb: 4, textAlign: "center" }}>
            <Typography
              component="h1"
              variant="h3"
              fontWeight="900"
              sx={{ color: "#0f172a", letterSpacing: "-0.03em" }} // slate-900
            >
              GearGrid
              <Box component="span" sx={{ color: "#f59e0b" }}>
                .
              </Box>
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ color: "#64748b", mt: 1, fontWeight: 500 }} // slate-500
            >
              {t("language.title") === "Language" ? "Enterprise Management System" : "ව්‍යවසාය කළමනාකරණ පද්ධතිය"}
            </Typography>
          </Box>

          {/* Form Section */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ width: "100%" }}
            noValidate
          >
            {/* Email Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t("common.email")}
              autoComplete="email"
              autoFocus
              {...register("email")}
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: "#ffffff",
                },
              }}
            />

            {/* Password Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="password"
              label={t("common.password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: "#ffffff",
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* API Error Alert */}
            {loginMutation.isError && (
              <Alert
                severity="error"
                sx={{ mt: 2, borderRadius: 2, alignItems: "center" }}
              >
                {loginMutation.error instanceof Error
                  ? loginMutation.error.message
                  : "Invalid credentials"}
              </Alert>
            )}

            {/* Submit Button (Matches Landing Page Button styling) */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loginMutation.isPending}
              sx={{
                mt: 4,
                mb: 1,
                py: 1.5,
                backgroundColor: "#0f172a", // slate-900
                color: "#ffffff",
                fontWeight: "bold",
                fontSize: "1rem",
                textTransform: "none",
                borderRadius: "9999px", // Fully rounded to match landing page
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "#f59e0b", // amber-500
                  boxShadow: "0 10px 15px -3px rgba(245, 158, 11, 0.4)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              {loginMutation.isPending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                t("common.submit")
              )}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
