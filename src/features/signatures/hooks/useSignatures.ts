// features/signatures/hooks/useSignatures.ts
//
// React Query bindings for signature endpoints + a socket-listener helper
// hook that pushes signature:captured / signature:all-captured events into
// the active capture session cache so the POS dialog updates in real time.
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSocket, connectSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  createSignatureRequest,
  getSignatureSession,
  submitSignature,
  cancelSignatureRequest,
  listInvoiceSignatures,
  setOperatorSignature,
  deleteOperatorSignature,
  getRentalTerms,
  updateRentalTerms,
  mintPairingCode,
  claimPairingCode,
  getDeviceStatus,
  getDevicePendingSignatures,
  listMyDevices,
  unpairDevice,
} from '../api/signatureApi';
import type { SignatureCheckpoint, SignatureRole } from '@geargrid/contracts';

export const useCreateSignatureRequest = () =>
  useMutation({
    mutationFn: (vars: {
      invoiceId: number;
      checkpoint: SignatureCheckpoint;
      required_roles: SignatureRole[];
      expires_in_minutes?: number;
    }) =>
      createSignatureRequest(vars.invoiceId, {
        checkpoint: vars.checkpoint,
        required_roles: vars.required_roles,
        expires_in_minutes: vars.expires_in_minutes,
      }),
  });

export const useCancelSignatureRequest = () =>
  useMutation({ mutationFn: (token: string) => cancelSignatureRequest(token) });

// Public hook — token-authed. Polls every 15s as a fallback for when the
// phone's socket.io connection isn't available (user is on cellular, strict
// corporate wifi, etc.); the main delivery channel is still websocket.
export const useSignatureSession = (token: string | null) =>
  useQuery({
    queryKey: ['signatures', 'session', token],
    queryFn: () => getSignatureSession(token!),
    enabled: !!token,
    refetchInterval: 15_000,
    retry: 1,
  });

export const useSubmitSignature = (token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof submitSignature>[1]) => submitSignature(token, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures', 'session', token] });
    },
  });
};

export const useInvoiceSignatures = (invoiceId: number | null) =>
  useQuery({
    queryKey: ['signatures', 'byInvoice', invoiceId],
    queryFn: () => listInvoiceSignatures(invoiceId!),
    enabled: !!invoiceId,
    staleTime: 60_000,
  });

export const useSetOperatorSignature = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (image_data_url: string) => setOperatorSignature(image_data_url),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'profile'] }),
  });
};

export const useDeleteOperatorSignature = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteOperatorSignature(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'profile'] }),
  });
};

export const useRentalTerms = () =>
  useQuery({ queryKey: ['config', 'rental-terms'], queryFn: getRentalTerms });

export const useUpdateRentalTerms = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (markdown: string) => updateRentalTerms(markdown),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config', 'rental-terms'] }),
  });
};

// ── Device pairing ──────────────────────────────────────────────────────

export const useMintPairingCode = () =>
  useMutation({ mutationFn: () => mintPairingCode() });

export const useClaimPairingCode = () =>
  useMutation({
    mutationFn: (body: { code: string; device_id: string; device_label?: string }) =>
      claimPairingCode(body),
  });

// Public: phone calls on launch to decide "show pairing input" vs "redirect
// to device home". Polls every 15s as a backstop while sitting on the
// pairing screen.
export const useDeviceStatus = (device_id: string | null, options?: { refetchInterval?: number }) =>
  useQuery({
    queryKey: ['devices', 'status', device_id],
    queryFn: () => getDeviceStatus(device_id!),
    enabled: !!device_id,
    refetchInterval: options?.refetchInterval,
    retry: 1,
  });

// Public: phone polls while on device home. 3-second interval is cheap on
// bandwidth and gives perceived-instant UX for the operator who taps
// "Request signatures" on the POS.
export const useDevicePendingSignatures = (device_id: string | null) =>
  useQuery({
    queryKey: ['devices', 'pending', device_id],
    queryFn: () => getDevicePendingSignatures(device_id!),
    enabled: !!device_id,
    refetchInterval: 3_000,
    retry: 1,
  });

export const useMyDevices = () =>
  useQuery({
    queryKey: ['me', 'devices'],
    queryFn: () => listMyDevices(),
    staleTime: 60_000,
  });

export const useUnpairDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (operator_device_id: number) => unpairDevice(operator_device_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'devices'] }),
  });
};

// ─────────────────────────────────────────────────────────────────────────
// Socket subscription — the POS uses this to react the moment a signature
// is submitted on a phone. Backend emits to tenant:<db>:user:<userId>, which
// our socket.io server joins automatically on handshake.
// ─────────────────────────────────────────────────────────────────────────
export const useSignatureSocketEvents = ({
  activeRequestId,
  onCaptured,
  onAllCaptured,
  onCancelled,
}: {
  activeRequestId: number | null;
  onCaptured?: (payload: {
    request_id: number;
    role: SignatureRole;
    signatory_name: string;
    image_url: string;
    pending_roles: SignatureRole[];
  }) => void;
  onAllCaptured?: (payload: { request_id: number; invoice_id: number }) => void;
  onCancelled?: (payload: { request_id: number }) => void;
}) => {
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    if (!activeRequestId || !token) return;
    connectSocket();
    const socket = getSocket();

    const captured = (payload: any) => {
      if (payload?.request_id === activeRequestId) onCaptured?.(payload);
    };
    const allCaptured = (payload: any) => {
      if (payload?.request_id === activeRequestId) onAllCaptured?.(payload);
    };
    const cancelled = (payload: any) => {
      if (payload?.request_id === activeRequestId) onCancelled?.(payload);
    };

    socket.on('signature:captured', captured);
    socket.on('signature:all-captured', allCaptured);
    socket.on('signature:cancelled', cancelled);

    return () => {
      socket.off('signature:captured', captured);
      socket.off('signature:all-captured', allCaptured);
      socket.off('signature:cancelled', cancelled);
    };
  }, [activeRequestId, token, onCaptured, onAllCaptured, onCancelled]);
};
