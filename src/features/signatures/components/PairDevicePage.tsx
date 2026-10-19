// features/signatures/components/PairDevicePage.tsx
//
// Public, no-auth pairing page shown on the phone PWA when no OPERATOR_DEVICE
// is bound to the phone's local device_id yet. Operator mints a code on their
// POS (Profile → Signature → Pair a phone), tells the phone user, who types
// it here. On success → navigates to /device.

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Stack,
} from '@mui/material';
import DrawIcon from '@mui/icons-material/Draw';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import { useNavigate } from '@tanstack/react-router';
import {
  getOrCreateDeviceId,
  suggestDeviceLabel,
  getDeviceLabel,
  setDeviceLabel as persistDeviceLabel,
} from '../lib/deviceId';
import { useClaimPairingCode, useDeviceStatus } from '../hooks/useSignatures';

export function PairDevicePage() {
  const navigate = useNavigate();
  const [deviceId] = useState<string>(() => getOrCreateDeviceId());
  const [code, setCode] = useState('');
  const [label, setLabel] = useState<string>(() => getDeviceLabel() || suggestDeviceLabel());
  const [submitError, setSubmitError] = useState<string | null>(null);

  // If the phone is already paired (e.g. landed on /pair by accident), skip
  // the form entirely and send to its home.
  const statusQuery = useDeviceStatus(deviceId);
  useEffect(() => {
    if (statusQuery.data?.paired) {
      navigate({ to: '/device', replace: true });
    }
  }, [statusQuery.data?.paired, navigate]);

  const claim = useClaimPairingCode();

  const normalizedCode = useMemo(
    () =>
      code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/^([A-Z0-9]{3})([A-Z0-9]+)$/, '$1-$2')
        .slice(0, 7),
    [code],
  );

  const canSubmit = normalizedCode.length === 7 && !claim.isPending;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitError(null);
    if (!canSubmit) return;
    try {
      await claim.mutateAsync({
        code: normalizedCode,
        device_id: deviceId,
        device_label: label || undefined,
      });
      if (label) persistDeviceLabel(label);
      navigate({ to: '/device', replace: true });
    } catch (err: any) {
      setSubmitError(err?.message || 'Could not pair this phone. Ask the POS for a new code.');
    }
  };

  if (statusQuery.isLoading) {
    return (
      <FullBleedCentered>
        <CircularProgress />
      </FullBleedCentered>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        px: 2,
        py: 3,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Avatar sx={{ bgcolor: '#1d4ed8', width: 44, height: 44 }}>
          <DrawIcon />
        </Avatar>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
            Pair this phone
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#64748b' }}>
            One-time setup to sign bills from this device
          </Typography>
        </Box>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          bgcolor: 'white',
        }}
      >
        <Typography sx={{ fontSize: 13, color: '#334155', mb: 2 }}>
          On your POS, open <strong>Profile → Signature → Pair a phone</strong>.
          A short code will appear. Type it below.
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            autoFocus
            label="Pairing code"
            placeholder="ABC-XYZ"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            slotProps={{
              htmlInput: {
                maxLength: 10,
                style: {
                  fontSize: 28,
                  letterSpacing: 6,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  textTransform: 'uppercase',
                },
              },
            }}
            // Show the normalized code as helper text so the user sees the
            // dashed form the backend expects.
            helperText={normalizedCode ? `Interpreted as: ${normalizedCode}` : ' '}
          />

          <TextField
            fullWidth
            label="Label (optional)"
            placeholder={suggestDeviceLabel()}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            sx={{ mt: 1.5 }}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />

          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={!canSubmit}
            sx={{
              mt: 2.5,
              py: 1.5,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: 16,
            }}
          >
            {claim.isPending ? 'Pairing…' : 'Pair this phone'}
          </Button>
        </form>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 2,
          bgcolor: '#eef2ff',
          border: '1px solid #c7d2fe',
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <SmartphoneIcon sx={{ color: '#4338ca', fontSize: 20, mt: 0.2 }} />
          <Box>
            <Typography sx={{ fontSize: 13, color: '#1e293b', fontWeight: 600, mb: 0.5 }}>
              Keep this app on your home screen
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              Once paired, you'll tap the app icon from your phone's home
              screen every time a bill needs signatures — no QR scanning,
              no login.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {statusQuery.data?.paired === false && (
        <Chip
          icon={<CheckCircleOutlinedIcon />}
          label="Phone ready to pair"
          size="small"
          sx={{ alignSelf: 'center', mt: 2, bgcolor: '#f1f5f9', color: '#334155' }}
        />
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
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f8fafc',
      }}
    >
      {children}
    </Box>
  );
}
