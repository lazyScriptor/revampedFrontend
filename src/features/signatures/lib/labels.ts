import type { SignatureCheckpoint, SignatureRole } from '@geargrid/contracts';
import { tk } from '@/i18n/marker';

// Display labels are translation KEYS — translate at render time: t(ROLE_LABEL[role]).
export const ROLE_LABEL: Record<SignatureRole, string> = {
  CUSTOMER: tk('signatures.roles.customer'),
  OPERATOR: tk('signatures.roles.operator'),
  GUARANTOR: tk('signatures.roles.guarantor'),
  WITNESS: tk('signatures.roles.witness'),
};

export const CHECKPOINT_LABEL: Record<SignatureCheckpoint, string> = {
  DEPOSIT_COLLECTED: tk('signatures.checkpoints.depositCollected'),
  EQUIPMENT_DISPATCHED: tk('signatures.checkpoints.equipmentDispatched'),
  EQUIPMENT_RETURNED: tk('signatures.checkpoints.equipmentReturned'),
  PAYMENT_RECEIVED: tk('signatures.checkpoints.paymentReceived'),
  OTHER: tk('signatures.checkpoints.other'),
};
