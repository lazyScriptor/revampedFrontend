// features/signatures/api/signatureApi.ts
//
// Typed thin wrappers around callContract for every signature endpoint.
// Hooks consume these; nothing in app code should touch `api.*` directly.
import { callContract } from '@/lib/callContract';
import {
  CreateSignatureRequestContract,
  GetSignatureSessionContract,
  SubmitSignatureContract,
  CancelSignatureRequestContract,
  ListInvoiceSignaturesContract,
  SetOperatorSignatureContract,
  DeleteOperatorSignatureContract,
  GetRentalTermsContract,
  UpdateRentalTermsContract,
  type SignatureCheckpoint,
  type SignatureRole,
} from '@geargrid/contracts';

export const createSignatureRequest = (
  invoiceId: number,
  body: { checkpoint: SignatureCheckpoint; required_roles: SignatureRole[]; expires_in_minutes?: number },
) =>
  callContract(CreateSignatureRequestContract, {
    params: { id: invoiceId },
    body,
  });

// NOTE: GetSignatureSessionContract and SubmitSignatureContract are PUBLIC
// endpoints — the token in the URL is the authorization. The axios instance
// still attaches an Authorization header if one is present, but the backend
// ignores it on these routes.
export const getSignatureSession = (token: string) =>
  callContract(GetSignatureSessionContract, { params: { token } });

export const submitSignature = (
  token: string,
  body: {
    role: SignatureRole;
    signatory_name: string;
    agreed_to_terms: true;
    terms_version: number;
    use_stored_operator_signature?: boolean;
    image_data_url?: string;
  },
) =>
  callContract(SubmitSignatureContract, { params: { token }, body });

export const cancelSignatureRequest = (token: string) =>
  callContract(CancelSignatureRequestContract, { params: { token } });

export const listInvoiceSignatures = (invoiceId: number) =>
  callContract(ListInvoiceSignaturesContract, { params: { id: invoiceId } });

export const setOperatorSignature = (image_data_url: string) =>
  callContract(SetOperatorSignatureContract, { body: { image_data_url } });

export const deleteOperatorSignature = () => callContract(DeleteOperatorSignatureContract, {});

export const getRentalTerms = () => callContract(GetRentalTermsContract, {});

export const updateRentalTerms = (markdown: string) =>
  callContract(UpdateRentalTermsContract, { body: { markdown } });
