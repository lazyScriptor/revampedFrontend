// When a rented line went out and came back, with the time of day. The line itself only stores
// dates; the exact moments live on the invoice (`issued_date`) and the RETURN_PROCESSED traces.

export interface Iteration {
  date: string;
  good: number;
  defective: number;
}

/** The handovers that touched one line, oldest first, from the RETURN_PROCESSED traces. */
export const iterationsFor = (lineId: number, returnTraces: any[]): Iteration[] =>
  returnTraces
    .map((trace) => {
      let payload = trace.state_payload || {};
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = {};
        }
      }
      const rl = (payload.lines_returned || []).find((l: any) => l.line_id === lineId);
      if (rl && (Number(rl.good_qty) > 0 || Number(rl.defective_qty) > 0)) {
        return { date: trace.occurred_at || trace.createdAt, good: Number(rl.good_qty) || 0, defective: Number(rl.defective_qty) || 0 };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()) as Iteration[];

/** The latest handover moment for a line (date and time), else its stored return date, else null. */
export const lastBackAt = (line: any, iterations: Iteration[]): string | null => {
  if (iterations.length) return iterations[iterations.length - 1].date;
  const back = line.actual_return_date;
  return back ? String(back) : null;
};

/** The returned traces of an invoice. */
export const returnTracesOf = (invoice: any): any[] => {
  const traces = invoice?.InvoiceTraces || invoice?.InvoiceTrace || invoice?.invoice_traces || invoice?.traces || [];
  return traces.filter((tr: any) => tr.event_action === "RETURN_PROCESSED");
};
