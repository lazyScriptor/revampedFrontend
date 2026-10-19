// features/profile/components/SignatureSection.tsx
//
// "My saved signature" — the operator stores one signature once; every bill
// they capture signatures for pre-populates OPERATOR with this image via a
// one-tap "Use my saved signature" button on the mobile sign page.

import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DrawIcon from '@mui/icons-material/Draw';
import {
  SignatureCanvas,
  type SignatureCanvasHandle,
} from '@/features/signatures/components/SignatureCanvas';
import {
  useSetOperatorSignature,
  useDeleteOperatorSignature,
} from '@/features/signatures/hooks/useSignatures';
import { PairedPhonesSection } from '@/features/signatures/components/PairedPhonesSection';

const resolveImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '';
  const origin = apiBase.replace(/\/api\/?$/, '');
  return origin ? `${origin}${url.startsWith('/') ? '' : '/'}${url}` : url;
};

interface SignatureSectionProps {
  profile: any;
}

export function SignatureSection({ profile }: SignatureSectionProps) {
  return (
    <>
      <OperatorSavedSignatureCard profile={profile} />
      <PairedPhonesSection />
    </>
  );
}

interface OperatorSavedSignatureCardProps {
  profile: any;
}

function OperatorSavedSignatureCard({ profile }: OperatorSavedSignatureCardProps) {
  const canvasRef = useRef<SignatureCanvasHandle | null>(null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const setMut = useSetOperatorSignature();
  const delMut = useDeleteOperatorSignature();

  const storedUrl = resolveImageUrl(profile?.signature_url);
  const capturedAt = profile?.signature_captured_at
    ? new Date(profile.signature_captured_at)
    : null;

  const handleSave = async () => {
    const dataUrl = canvasRef.current?.toDataUrl('image/png') || null;
    if (!dataUrl) {
      setNotice({ kind: 'error', text: 'Please draw your signature first.' });
      return;
    }
    try {
      await setMut.mutateAsync(dataUrl);
      setNotice({ kind: 'success', text: 'Signature saved. You can now use it on every bill with one tap.' });
      canvasRef.current?.clear();
      setDirty(false);
      setShowEditor(false);
    } catch (err: any) {
      setNotice({ kind: 'error', text: err?.message || 'Could not save signature.' });
    }
  };

  const handleDelete = async () => {
    try {
      await delMut.mutateAsync();
      setNotice({ kind: 'success', text: 'Saved signature removed.' });
    } catch (err: any) {
      setNotice({ kind: 'error', text: err?.message || 'Could not remove signature.' });
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2.5,
        border: '1px solid #e2e8f0',
        bgcolor: 'white',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <DrawIcon sx={{ color: '#64748b' }} />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
            My saved signature
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#64748b' }}>
            Draw once; reuse on every bill with a single tap.
          </Typography>
        </Box>
      </Stack>

      {notice && (
        <Alert
          severity={notice.kind}
          onClose={() => setNotice(null)}
          sx={{ mb: 2 }}
        >
          {notice.text}
        </Alert>
      )}

      {/* Current state */}
      {storedUrl && !showEditor ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <Box
            sx={{
              width: 180,
              height: 90,
              bgcolor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={storedUrl}
              alt="Saved signature"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Chip
              icon={<CheckCircleOutlinedIcon />}
              label="Active"
              size="small"
              sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 600 }}
            />
            {capturedAt && (
              <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.75 }}>
                Saved on {capturedAt.toLocaleString()}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setShowEditor(true)}
                sx={{ textTransform: 'none' }}
              >
                Replace
              </Button>
              <Button
                size="small"
                variant="text"
                color="error"
                startIcon={<DeleteOutlinedIcon fontSize="small" />}
                disabled={delMut.isPending}
                onClick={handleDelete}
                sx={{ textTransform: 'none' }}
              >
                Remove
              </Button>
            </Stack>
          </Box>
        </Box>
      ) : (
        <>
          <SignatureCanvas
            ref={canvasRef}
            height={200}
            onDirtyChange={setDirty}
            placeholder="Draw your signature"
          />
          <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 2 }}>
            {storedUrl && (
              <Button
                variant="text"
                onClick={() => setShowEditor(false)}
                sx={{ textTransform: 'none', color: '#64748b' }}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!dirty || setMut.isPending}
              onClick={handleSave}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {setMut.isPending ? 'Saving…' : storedUrl ? 'Replace signature' : 'Save signature'}
            </Button>
          </Stack>
        </>
      )}
    </Paper>
  );
}
