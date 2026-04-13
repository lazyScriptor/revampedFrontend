import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

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
  Avatar,
} from "@mui/material";
import { Visibility, VisibilityOff, LockOutlined } from "@mui/icons-material";

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
      console.log("first", data.user);
      setAuth(data.user.auth);
      navigate({ to: "/dashboard" });
    },
  });

  // 3. Form Submission Handler
  const onSubmit = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    // Background container
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "grey.100", // Clean, light SaaS background
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={4}
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            borderRadius: 2,
          }}
        >
          {/* Logo / Icon */}
          <Avatar sx={{ m: 1, bgcolor: "primary.main", width: 48, height: 48 }}>
            <LockOutlined />
          </Avatar>

          <Typography
            component="h1"
            variant="h5"
            fontWeight="bold"
            gutterBottom
          >
            GearGrid
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to manage your rentals
          </Typography>

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ mt: 1, width: "100%" }}
            noValidate
          >
            {/* Email Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              autoComplete="email"
              autoFocus
              {...register("email")}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            {/* Password Field with Toggle */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
              error={!!errors.password}
              helperText={errors.password?.message}
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
              <Alert severity="error" sx={{ mt: 2, borderRadius: 1 }}>
                {loginMutation.error instanceof Error
                  ? loginMutation.error.message
                  : "Invalid credentials"}
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loginMutation.isPending}
              sx={{ mt: 3, mb: 2, py: 1.2 }}
            >
              {loginMutation.isPending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Sign In"
              )}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
