// Per-counter bill preferences, remembered on this computer so every print
// path (POS dispatch, reprint, print dialog) uses the same choice.
export type ReceiptDesign = "minimal" | "classic";

const DESIGN_KEY = "pos_receipt_design";
const ID_STATUS_KEY = "pos_receipt_show_id_status";

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
};

export const getReceiptDesign = (): ReceiptDesign => (read(DESIGN_KEY) === "classic" ? "classic" : "minimal");
export const setReceiptDesign = (d: ReceiptDesign) => write(DESIGN_KEY, d);

export const getShowIdStatus = (): boolean => read(ID_STATUS_KEY) === "1";
export const setShowIdStatus = (on: boolean) => write(ID_STATUS_KEY, on ? "1" : "0");
