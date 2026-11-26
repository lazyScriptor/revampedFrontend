import type { CollectionsQueryParams } from "../types";

/**
 * The Collections page keeps its filters under its own names; the server
 * (`collectionsReportService`) reads different ones. Without this mapping the option cards,
 * the date preset and the returned/not-returned filter were silently ignored.
 *   owes_money / not_returned / late / everyone  -> options=owes_money,late,...
 *   date_preset                                   -> preset
 *   return_status                                 -> machine_status
 *   sort_by overdue_max_days                      -> overdue_days
 */
const SORT_ALIASES: Record<string, string> = { overdue_max_days: "overdue_days" };

export const toServerCollectionsParams = (p: CollectionsQueryParams & { filters_on?: boolean }) => {
  const {
    owes_money,
    not_returned,
    late,
    everyone,
    date_preset,
    return_status,
    sort_by,
    ...rest
  } = p;
  const options = [
    owes_money && "owes_money",
    not_returned && "not_returned",
    late && "late",
    everyone && "everyone",
  ].filter(Boolean) as string[];

  const out: Record<string, unknown> = { ...rest };
  if (options.length) out.options = options.join(",");
  if (date_preset) out.preset = date_preset;
  if (return_status) out.machine_status = return_status;
  if (sort_by) out.sort_by = SORT_ALIASES[sort_by] ?? sort_by;
  for (const k of Object.keys(out)) if (out[k] === undefined || out[k] === "") delete out[k];
  return out;
};
