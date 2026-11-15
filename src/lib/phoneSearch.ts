// Customers are searched by phone number only (a name can match the wrong person).
// Mirrors phoneSearchCore in revampedBackend_Geargrid/src/utils/customerPhoneSearch.js.

/** Fewest phone digits, after a leading 0 / 94 / 0094, a search needs. */
export const MIN_PHONE_SEARCH_DIGITS = 3;

// FUTURE (super admin setting): synced phone contacts appear at the POS only after this many digits
// are typed, so staff cannot browse the shop's contacts with a few numbers. The shop owner wants it
// adjustable per shop from the super admin console; until then it is fixed here and in
// revampedBackend_Geargrid/src/services/phoneContactService.js. See revampedBackend_Geargrid/docs/FUTURE_SETTINGS.md.
export const MIN_CONTACT_SEARCH_DIGITS = 9;

/** True when the text is a phone number search: digits and phone formatting only, enough digits. */
export function isPhoneSearch(text: string): boolean {
  const trimmed = text.trim();
  if (!/^[\d\s+()\-./]+$/.test(trimmed)) return false;
  const core = trimmed.replace(/\D/g, "").replace(/^(?:0094|94|0)/, "");
  return core.length >= MIN_PHONE_SEARCH_DIGITS;
}

/** True when enough digits are typed to look up synced phone contacts. */
export function isContactSearch(text: string): boolean {
  return isPhoneSearch(text) && text.replace(/\D/g, "").length >= MIN_CONTACT_SEARCH_DIGITS;
}
