// features/signatures/components/DeviceHomePage.tsx
//
// Phone's post-pairing "home screen". Polls the pending-signatures endpoint
// every few seconds; the moment the paired operator triggers "Request
// signatures" on the POS, this page auto-navigates to the simplified sign
// page for that invoice. Zero taps required.

import { useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  CircularProgress,
  Button,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import DrawIcon from '@mui/icons-material/Draw';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { useNavigate } from '@tanstack/react-router';
import { getDeviceId, clearDeviceId } from '../lib/deviceId';
import {
  useDeviceStatus,
  useDevicePendingSignatures,
} from '../hooks/useSignatures';

export function DeviceHomePage() {
  const navigate = useNavigate();
  const deviceId = getDeviceId();

  // No device_id at all → the phone was never paired. Send to /pair.
  useEffect(() => {
    if (!deviceId) {
      navigate({ to: '/pair', replace: true });
    }
  }, [deviceId, navigate]);

  const status = useDeviceStatus(deviceId, { refetchInterval: 30_000 });
  const pending = useDevicePendingSignatures(deviceId);

  // If the backend says the device isn't paired any more (operator unpaired
  // it from POS), clear local state and bounce back to pairing.
  // Debounce 1s so a stale cached "not paired" response from immediately
  // after pairing has time to be superseded by the fresh query result
  // (useClaimPairingCode seeds the cache; this is defense in depth).
  useEffect(() => {
    if (!status.isSuccess || status.data?.paired !== false) return;
    const t = setTimeout(() => {
      if (status.data?.paired === false) {
        clearDeviceId();
        navigate({ to: '/pair', replace: true });
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [status.isSuccess, status.data?.paired, status.data, navigate]);

  // Auto-redirect to the simplified sign page the moment a pending request
  // appears for this device's paired operator.
  useEffect(() => {
    const first = pending.data?.pending?.[0];
    if (first?.token) {
      navigate({ to: '/sign-paired/$token', params: { token: first.token }, replace: true });
    }
  }, [pending.data?.pending, navigate]);

  if (status.isLoading || !deviceId) {
    return (
      <FullBleedCentered>
        <CircularProgress />
      </FullBleedCentered>
    );
  }

  if (!status.data?.paired) {
    return null; // redirecting
  }

  const operator = status.data.operator!;
  const tenant = status.data.tenant!;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, ${tenant.primary_color} 0%, ${tenant.secondary_color} 100%)`,
          color: 'white',
          px: 2,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {tenant.logo_url ? (
          <Avatar src={tenant.logo_url} sx={{ width: 48, height: 48 }} />
        ) : (
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', width: 48, height: 48 }}>
            <DrawIcon />
          </Avatar>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 17, lineHeight: 1.1 }}>
            {tenant.business_display_name}
          </Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
            Paired to {operator.operator_name}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            bgcolor: 'white',
            textAlign: 'center',
          }}
        >
          <Avatar
            sx={{
              bgcolor: '#dcfce7',
              color: '#16a34a',
              width: 72,
              height: 72,
              mx: 'auto',
              mb: 2,
            }}
          >
            <CheckCircleOutlinedIcon sx={{ fontSize: 44 }} />
          </Avatar>
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#0f172a', mb: 0.5 }}>
            Ready to sign
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748b', mb: 2 }}>
            This phone will open automatically the next time a bill needs a
            signature.
          </Typography>

          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <HourglassBottomIcon sx={{ color: '#64748b', fontSize: 18 }} />
            <Typography sx={{ fontSize: 12, color: '#64748b' }}>
              Waiting for signature requests…
            </Typography>
          </Stack>

          {operator.has_saved_signature && (
            <Chip
              size="small"
              icon={<DrawIcon />}
              label="Your saved signature is active"
              sx={{ mt: 2, bgcolor: '#f0fdf4', color: '#166534' }}
            />
          )}
        </Paper>

        {pending.isError && (
          <Alert severity="warning">
            <strong>Couldn't fetch pending requests.</strong>
            {' '}
            {(pending.error as Error)?.message || 'Retrying automatically.'}
          </Alert>
        )}
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', bgcolor: 'white' }}>
        <Button
          fullWidth
          variant="text"
          size="small"
          onClick={() => {
            if (confirm('Unpair this phone? You will need a new code from the POS.')) {
              clearDeviceId();
              navigate({ to: '/pair', replace: true });
            }
          }}
          sx={{ textTransform: 'none', color: '#64748b' }}
        >
          Unpair this phone
        </Button>
      </Box>
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
