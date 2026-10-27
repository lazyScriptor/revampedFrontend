// features/signatures/components/SimplifiedSignPage.tsx
//
// Minimal sign page shown on the paired phone when a signature request is
// pending. No name field, no agree-to-terms checkbox — the tap on the role
// button IS the agreement. Terms text is visible above the fold.
//
// This page replaces the full MobileSignPage for paired devices. The
// backend endpoints are the same; we just submit without agreed_to_terms
// toggling (hard-coded true) and without a user-supplied name (derived
// from invoice.Customer or the paired operator).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import GavelIcon from '@mui/icons-material/Gavel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useNavigate } from '@tanstack/react-router';
import type { SignatureRole } from '@geargrid/contracts';
import { SignatureCanvas, type SignatureCanvasHandle } from './SignatureCanvas';
import { useSignatureSession, useSubmitSignature } from '../hooks/useSignatures';
import { ROLE_LABEL } from '../lib/labels';
import { useDeviceManifest, useScreenWakeLock } from '../lib/deviceShell';
import { useTranslation } from "react-i18next";

const ROLE_ICON: Record<SignatureRole, React.ReactElement> = {
  CUSTOMER: <PersonIcon sx={{ fontSize: 32 }} />,
  OPERATOR: <SupportAgentIcon sx={{ fontSize: 32 }} />,
  GUARANTOR: <PersonIcon sx={{ fontSize: 32 }} />,
  WITNESS: <PersonIcon sx={{ fontSize: 32 }} />,
};

// Seconds the done screen stays up before the phone goes back to waiting.
const AUTO_RETURN_SECONDS = 3;

const formatLKR = (n: number) =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(n);

interface SimplifiedSignPageProps {
  token: string;
}

export function SimplifiedSignPage({ token }: SimplifiedSignPageProps) {
  const { t } = useTranslation();
  // ── ALL hooks declared at the top, before any early return.
  //    (Trap 17 — React error #310: calling a hook below an early-return
  //    branch means the first render has fewer hooks than the second.)
  const navigate = useNavigate();
  const session = useSignatureSession(token);
  const submit = useSubmitSignature(token);
  const canvasRef = useRef<SignatureCanvasHandle | null>(null);

  const [selectedRole, setSelectedRole] = useState<SignatureRole | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const data = session.data; // may be undefined on first renders
  useDeviceManifest();
  useScreenWakeLock();

  // Once the request is finished (signed, expired or cancelled at the counter)
  // go back to the waiting screen by itself, so the next request opens with no taps.
  const finished = !!data && ['COMPLETED', 'EXPIRED', 'CANCELLED'].includes(data.status);
  const [returnIn, setReturnIn] = useState(AUTO_RETURN_SECONDS);
  useEffect(() => {
    if (!finished) return;
    setReturnIn(AUTO_RETURN_SECONDS);
    const tick = setInterval(() => setReturnIn((s) => Math.max(0, s - 1)), 1000);
    const go = setTimeout(() => navigate({ to: '/device', replace: true }), AUTO_RETURN_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(go);
    };
  }, [finished, navigate]);

  const activeRole: SignatureRole | null = useMemo(() => {
    if (!data?.pending_roles) return null;
    if (selectedRole && data.pending_roles.includes(selectedRole)) return selectedRole;
    return data.pending_roles[0] || null;
  }, [selectedRole, data?.pending_roles]);

  const signatoryName = useMemo(() => {
    if (!data) return 'Signatory';
    if (activeRole === 'OPERATOR') return data.operator_saved_signature?.operator_name || 'Operator';
    if (activeRole === 'CUSTOMER') return data.invoice.customer_name || 'Walk-in customer';
    return 'Signatory';
  }, [activeRole, data]);

  // ── Early returns from here down — hook count is now stable.
  if (session.isLoading) {
    return (
      <FullBleedCentered>
        <CircularProgress />
      </FullBleedCentered>
    );
  }

  if (session.error || !data) {
    return (
      <FullBleedCentered>
        <Alert severity="error" sx={{ mb: 2 }}>
          {(session.error as Error)?.message || t("signatures.SimplifiedSignPage.couldNotLoadTheSignature")}
        </Alert>
        <Button variant="outlined" onClick={() => navigate({ to: '/device' })}>{t("common.back")}</Button>
      </FullBleedCentered>
    );
  }

  // Terminal states — the request is done or dead. Bounce back to device home.
  if (finished) {
    return (
      <FullBleedCentered>
        <Avatar
          sx={{
            bgcolor: data.status === 'COMPLETED' ? '#16a34a' : '#f59e0b',
            width: 72,
            height: 72,
            mb: 2,
          }}
        >
          <CheckCircleOutlinedIcon sx={{ fontSize: 44 }} />
        </Avatar>
        <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1, textAlign: 'center' }}>
          {data.status === 'COMPLETED' ? t("signatures.SignatureCaptureDialog.allSignaturesCaptured") : t("signatures.SimplifiedSignPage.sessionEnded")}
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2, textTransform: 'none' }}
          onClick={() => navigate({ to: '/device', replace: true })}
        >
          {t("signatures.SimplifiedSignPage.backToHome")}
        </Button>
        <Typography sx={{ mt: 1.5, fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
          {t("signatures.SimplifiedSignPage.returningIn", { count: returnIn })}
        </Typography>
      </FullBleedCentered>
    );
  }

  const canUseStoredOperatorSig =
    activeRole === 'OPERATOR' && !!data.operator_saved_signature?.has_saved_signature;

  const handleSubmit = async (useStored = false) => {
    setSubmitError(null);
    if (!activeRole) return;

    let imageDataUrl: string | null = null;
    if (!useStored) {
      imageDataUrl = canvasRef.current?.toDataUrl('image/png') ?? null;
      if (!imageDataUrl) {
        setSubmitError(t("signatures.SimplifiedSignPage.pleaseDrawYourSignatureIn"));
        return;
      }
    }

    try {
      await submit.mutateAsync({
        role: activeRole,
        signatory_name: signatoryName,
        agreed_to_terms: true,
        terms_version: data.terms.version,
        use_stored_operator_signature: useStored,
        image_data_url: useStored ? undefined : imageDataUrl ?? undefined,
      });
      canvasRef.current?.clear();
      setSelectedRole(null);
      session.refetch();
    } catch (err: any) {
      setSubmitError(err?.message || t("signatures.SimplifiedSignPage.submissionFailed"));
    }
  };

  const theme = {
    primary: data.tenant.primary_color || '#1976d2',
    secondary: data.tenant.secondary_color || '#9c27b0',
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
          color: 'white',
          px: 2,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, opacity: 0.9, fontWeight: 500 }}>
            {data.invoice.invoice_number} · {data.checkpoint.replace(/_/g, ' ').toLowerCase()}
          </Typography>
          <Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.1 }}>
            {data.invoice.customer_name || t("signatures.MobileSignPage.walkInCustomer")}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
          {formatLKR(data.invoice.total_amount)}
        </Typography>
      </Box>

      {/* Captured roles chips */}
      {data.captured_roles.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ px: 2, pt: 2, flexWrap: 'wrap' }}>
          {data.captured_roles.map((r) => (
            <Chip
              key={r.role}
              size="small"
              icon={<CheckCircleOutlinedIcon />}
              label={t("signatures.roleSigned", { role: t(ROLE_LABEL[r.role]) })}
              sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 600 }}
            />
          ))}
        </Stack>
      )}

      {/* Role picker (only when more than one is pending) */}
      {data.pending_roles.length > 1 && (
        <Stack direction="row" spacing={1.5} sx={{ px: 2, pt: 2 }}>
          {data.pending_roles.map((role) => (
            <Paper
              key={role}
              elevation={0}
              onClick={() => setSelectedRole(role)}
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 2,
                cursor: 'pointer',
                textAlign: 'center',
                bgcolor: activeRole === role ? theme.primary : 'white',
                color: activeRole === role ? 'white' : '#0f172a',
                border: `2px solid ${activeRole === role ? theme.primary : '#e2e8f0'}`,
                transition: 'all 120ms ease',
              }}
            >
              {ROLE_ICON[role]}
              <Typography sx={{ mt: 0.5, fontSize: 14, fontWeight: 700 }}>
                {t(ROLE_LABEL[role])}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Terms (collapsible, visible above-fold) */}
      <Paper
        elevation={0}
        sx={{
          mx: 2,
          mt: 2,
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          bgcolor: 'white',
        }}
      >
        <Box
          onClick={() => setShowTerms((s) => !s)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1.25,
            cursor: 'pointer',
          }}
        >
          <GavelIcon sx={{ color: '#64748b', fontSize: 20 }} />
          <Typography sx={{ fontSize: 13, color: '#0f172a', fontWeight: 600, flex: 1 }}>
            {t("signatures.MobileSignPage.rentalTermsV", { version: data.terms.version })}
          </Typography>
          <IconButton size="small" sx={{ p: 0 }}>
            {showTerms ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
        {showTerms && (
          <Box
            sx={{
              px: 2,
              pb: 2,
              fontSize: 13,
              color: '#334155',
              whiteSpace: 'pre-wrap',
              maxHeight: 180,
              overflowY: 'auto',
              borderTop: '1px solid #e2e8f0',
              pt: 1.5,
            }}
          >
            {data.terms.markdown}
          </Box>
        )}
      </Paper>

      {/* Canvas + submit */}
      {activeRole && (
        <Paper
          elevation={0}
          sx={{
            mx: 2,
            mt: 2,
            mb: 3,
            p: 2,
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            bgcolor: 'white',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
            {ROLE_ICON[activeRole]}
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                {t("signatures.SimplifiedSignPage.signature", { role: t(ROLE_LABEL[activeRole]) })}
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                {t("signatures.SimplifiedSignPage.signingAs", { signatoryName })}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ mb: 1.5 }} />
          <SignatureCanvas ref={canvasRef} height={200} />

          {submitError && (
            <Alert severity="error" sx={{ mt: 1.5, fontSize: 13 }}>
              {submitError}
            </Alert>
          )}

          <Stack direction="column" spacing={1.25} sx={{ mt: 2 }}>
            {canUseStoredOperatorSig && (
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<FlashOnIcon />}
                disabled={submit.isPending}
                onClick={() => handleSubmit(true)}
                sx={{
                  bgcolor: theme.primary,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 1.5,
                  fontSize: 16,
                }}
              >
                {t("signatures.SimplifiedSignPage.useMySavedSignature")}
              </Button>
            )}
            <Button
              variant={canUseStoredOperatorSig ? 'outlined' : 'contained'}
              fullWidth
              size="large"
              disabled={submit.isPending}
              onClick={() => handleSubmit(false)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                py: 1.5,
                fontSize: 16,
                ...(canUseStoredOperatorSig ? {} : { bgcolor: theme.primary }),
              }}
            >
              {submit.isPending ? t("signatures.MobileSignPage.submitting") : t("signatures.SimplifiedSignPage.submitSignature", { role: t(ROLE_LABEL[activeRole]).toLowerCase() })}
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

function FullBleedCentered({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        bgcolor: '#f8fafc',
      }}
    >
      {children}
    </Box>
  );
}
