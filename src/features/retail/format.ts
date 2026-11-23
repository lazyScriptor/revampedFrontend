/** "Rs 1,250" or "Rs 1,250.50": money in the shop's currency, for display next to tabular numerals. */
export const formatRs = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined || n === "") return "";
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return `Rs ${v.toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};
