// features/signatures/components/MobileSignPage.tsx
//
// Public, no-auth sign page served at /sign/:token.
// Phone users scan the QR shown on the POS and land here. Everything
// (invoice summary, tenant branding, terms, pending roles) is fetched from
// the backend using the token itself as authorization.
//
// Latency-first design — no router guards, no auth hydration, straight to
// the canvas. Submission is one request; a successful submit short-circuits
// to "Done ✓" immediately and leaves the socket to notify the POS.

import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Stack,
  Avatar,
  IconButton,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import GavelIcon from '@mui/icons-material/Gavel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DrawIcon from '@mui/icons-material/Draw';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import type { SignatureRole } from '@geargrid/contracts';
import { SignatureCanvas, type SignatureCanvasHandle } from './SignatureCanvas';
import { useSignatureSession, useSubmitSignature } from '../hooks/useSignatures';
import { ROLE_LABEL } from '../lib/labels';
import { useTranslation } from "react-i18next";

const ROLE_ICON: Record<SignatureRole, React.ReactElement> = {
  CUSTOMER: <PersonIcon />,
  OPERATOR: <SupportAgentIcon />,
  GUARANTOR: <PersonIcon />,
  WITNESS: <PersonIcon />,
};

const formatLKR = (n: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(n);

interface MobileSignPageProps {
  token: string;
}

export function MobileSignPage({ token }: MobileSignPageProps) {
  const { t } = useTranslation();
  const { data: session, isLoading, error, refetch } = useSignatureSession(token);
  const submit = useSubmitSignature(token);
  const canvasRef = useRef<SignatureCanvasHandle | null>(null);

  const [selectedRole, setSelectedRole] = useState<SignatureRole | null>(null);
  const [signatoryName, setSignatoryName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState<SignatureRole | null>(null);

  // Default-pick the first pending role on load so the user doesn't have to
  // tap. Updates when captured_roles changes under them (e.g. the operator
  // signed on their own device first and this device is now for the customer).
  const defaultRole = useMemo(() => {
    if (!session?.pending_roles?.length) return null;
    return session.pending_roles[0];
  }, [session?.pending_roles]);

  const activeRole = selectedRole ?? defaultRole;

  // Pre-fill operator name from the stored-sig metadata; customer must type.
  const prefilledName = useMemo(() => {
    if (activeRole === 'OPERATOR' && session?.operator_saved_signature?.operator_name) {
      return session.operator_saved_signature.operator_name;
    }
    return '';
  }, [activeRole, session]);

  const canUseStoredOperatorSig =
    activeRole === 'OPERATOR' && !!session?.operator_saved_signature?.has_saved_signature;

  // ── Loading / error / terminal states ──────────────────────────────────
  if (isLoading) {
    return (
      <FullBleedCentered>
        <CircularProgress />
        <Typography sx={{ mt: 2, color: '#94a3b8' }}>{t("signatures.MobileSignPage.loadingSignatureRequest")}</Typography>
      </FullBleedCentered>
    );
  }

  if (error || !session) {
    return (
      <FullBleedCentered>
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error)?.message || t("signatures.MobileSignPage.thisSignatureRequestCouldNot")}
        </Alert>
        <Button variant="outlined" onClick={() => refetch()}>{t("common.retry")}</Button>
      </FullBleedCentered>
    );
  }

  const isTerminal =
    session.status === 'COMPLETED' ||
    session.status === 'EXPIRED' ||
    session.status === 'CANCELLED';

  if (isTerminal && !justSigned) {
    return (
      <FullBleedCentered>
        <Avatar sx={{ bgcolor: session.status === 'COMPLETED' ? '#16a34a' : '#f59e0b', width: 72, height: 72, mb: 2 }}>
          <CheckCircleIcon sx={{ fontSize: 44 }} />
        </Avatar>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
          {session.status === 'COMPLETED'
            ? t("signatures.SignatureCaptureDialog.allSignaturesCaptured")
            : session.status === 'EXPIRED'
              ? t("signatures.MobileSignPage.sessionExpired")
              : t("signatures.MobileSignPage.sessionCancelled")}
        </Typography>
        <Typography sx={{ color: '#64748b', textAlign: 'center', maxWidth: 320 }}>
          {session.status === 'COMPLETED'
            ? t("signatures.MobileSignPage.youCanHandThePhone")
            : t("signatures.MobileSignPage.pleaseAskTheOperatorTo")}
        </Typography>
      </FullBleedCentered>
    );
  }

  const handleSubmit = async (useStored = false) => {
    setSubmitError(null);
    if (!activeRole) return;
    if (!agreed) {
      setSubmitError(t("signatures.MobileSignPage.youMustAgreeToThe"));
      return;
    }

    const name = (signatoryName || prefilledName).trim();
    if (!name) {
      setSubmitError(t("signatures.MobileSignPage.pleaseTypeYourName"));
      return;
    }

    let imageDataUrl: string | null = null;
    if (!useStored) {
      imageDataUrl = canvasRef.current?.toDataUrl('image/png') ?? null;
      if (!imageDataUrl) {
        setSubmitError(t("signatures.MobileSignPage.pleaseDrawYourSignature"));
        return;
      }
    }

    try {
      await submit.mutateAsync({
        role: activeRole,
        signatory_name: name,
        agreed_to_terms: true,
        terms_version: session.terms.version,
        use_stored_operator_signature: useStored,
        image_data_url: useStored ? undefined : imageDataUrl ?? undefined,
      });
      setJustSigned(activeRole);
      setSelectedRole(null);
      setSignatoryName('');
      setAgreed(false);
      canvasRef.current?.clear();
      refetch();
    } catch (err: any) {
      setSubmitError(err?.message || t("signatures.MobileSignPage.submissionFailedPleaseTryAgain"));
    }
  };

  const theme = {
    primary: session.tenant.primary_color || '#1976d2',
    secondary: session.tenant.secondary_color || '#9c27b0',
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        pb: 4,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
          color: 'white',
          px: 2,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {session.tenant.logo_url ? (
          <Avatar src={session.tenant.logo_url} sx={{ width: 48, height: 48 }} />
        ) : (
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', width: 48, height: 48 }}>
            <DrawIcon />
          </Avatar>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1.1 }}>
            {session.tenant.business_display_name}
          </Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
            {t("signatures.MobileSignPage.signatureRequired", { value: session.checkpoint.replace(/_/g, ' ').toLowerCase() })}
          </Typography>
        </Box>
      </Box>

      {/* Invoice summary */}
      <Paper
        elevation={0}
        sx={{
          mx: 2,
          mt: 2,
          p: 2,
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          bgcolor: 'white',
        }}
      >
        <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
          {session.invoice.invoice_number}
        </Typography>
        <Typography sx={{ fontSize: 15, color: '#0f172a', fontWeight: 500, mt: 0.5 }}>
          {session.invoice.customer_name || t("signatures.MobileSignPage.walkInCustomer")}
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 14 }}>
          <Typography sx={{ color: '#64748b' }}>{t("common.total")}</Typography>
          <Typography sx={{ color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {formatLKR(session.invoice.total_amount)}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 14, mt: 0.5 }}>
          <Typography sx={{ color: '#64748b' }}>{t("invoices.paid")}</Typography>
          <Typography sx={{ color: '#0f172a', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {formatLKR(session.invoice.amount_paid)}
          </Typography>
        </Stack>
        {session.invoice.deposit_held > 0 && (
          <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 14, mt: 0.5 }}>
            <Typography sx={{ color: '#64748b' }}>{t("signatures.MobileSignPage.depositHeld")}</Typography>
            <Typography sx={{ color: '#0f172a', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              {formatLKR(session.invoice.deposit_held)}
            </Typography>
          </Stack>
        )}
      </Paper>

      {/* Role picker */}
      {session.pending_roles.length > 0 && (
        <Box sx={{ mx: 2, mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
            {t("signatures.MobileSignPage.signingAs")}
          </Typography>
          <ToggleButtonGroup
            value={activeRole}
            exclusive
            fullWidth
            onChange={(_, v) => v && setSelectedRole(v)}
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none', py: 1 } }}
          >
            {session.pending_roles.map((role) => (
              <ToggleButton key={role} value={role} sx={{ gap: 1 }}>
                {ROLE_ICON[role]}
                <span>{t(ROLE_LABEL[role])}</span>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {session.captured_roles.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              {session.captured_roles.map((c) => (
                <Chip
                  key={c.role}
                  size="small"
                  icon={<CheckCircleIcon />}
                  label={t("signatures.roleSigned", { role: t(ROLE_LABEL[c.role]) })}
                  sx={{ bgcolor: '#dcfce7', color: '#166534', fontSize: 11 }}
                />
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* Terms */}
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
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1.25,
          }}
        >
          <GavelIcon sx={{ color: '#64748b', fontSize: 20 }} />
          <Typography sx={{ fontSize: 13, color: '#0f172a', fontWeight: 600, flex: 1 }}>
            {t("signatures.MobileSignPage.rentalTermsV", { version: session.terms.version })}
          </Typography>
          <IconButton size="small" onClick={() => setShowTerms((s) => !s)} aria-label={t("signatures.MobileSignPage.toggleTerms")}>
            {showTerms ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
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
              maxHeight: 220,
              overflowY: 'auto',
              borderTop: '1px solid #e2e8f0',
              pt: 1.5,
            }}
          >
            {session.terms.markdown}
          </Box>
        )}
      </Paper>

      {/* Canvas / stored-sig / name / agree / submit */}
      {activeRole && (
        <Paper
          elevation={0}
          sx={{
            mx: 2,
            mt: 2,
            p: 2,
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            bgcolor: 'white',
          }}
        >
          <Typography sx={{ fontSize: 13, color: '#0f172a', fontWeight: 600, mb: 1.5 }}>
            {t("profile.SignatureSection.drawYourSignature")}
          </Typography>
          <SignatureCanvas ref={canvasRef} height={200} />

          <TextField
            fullWidth
            size="small"
            placeholder={
              activeRole === 'OPERATOR' && prefilledName ? prefilledName : t("signatures.MobileSignPage.yourFullName")
            }
            value={signatoryName}
            onChange={(e) => setSignatoryName(e.target.value)}
            sx={{ mt: 2 }}
            slotProps={{ htmlInput: { maxLength: 150 } }}
          />

          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Checkbox
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography sx={{ fontSize: 13, color: '#334155' }}>
                {t("signatures.MobileSignPage.iHaveReadAndAgree", { version: session.terms.version })}
              </Typography>
            }
          />

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
                disabled={submit.isPending || !agreed}
                onClick={() => handleSubmit(true)}
                sx={{
                  bgcolor: theme.primary,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 1.25,
                }}
              >
                {t("signatures.MobileSignPage.useMySavedSignatureOne")}
              </Button>
            )}
            <Button
              variant={canUseStoredOperatorSig ? 'outlined' : 'contained'}
              fullWidth
              size="large"
              disabled={submit.isPending || !agreed}
              onClick={() => handleSubmit(false)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                py: 1.25,
                ...(canUseStoredOperatorSig
                  ? {}
                  : { bgcolor: theme.primary }),
              }}
            >
              {submit.isPending ? t("signatures.MobileSignPage.submitting") : t("signatures.MobileSignPage.submitSignature")}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Just-signed confirmation strip */}
      {justSigned && (
        <Alert
          severity="success"
          icon={<CheckCircleIcon />}
          sx={{ mx: 2, mt: 2, borderRadius: 2 }}
        >
          {t("signatures.MobileSignPage.roleSignatureCaptured", { role: t(ROLE_LABEL[justSigned]) })}
          {session.pending_roles.length > 0
            ? ` ${t("signatures.MobileSignPage.morePending", { count: session.pending_roles.length })}`
            : ` ${t("signatures.MobileSignPage.handPhoneBack")}`}
        </Alert>
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
