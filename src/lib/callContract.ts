// @geargrid/contracts resolves via package.json file: dep against the vendored
// copy under revampedFrontend/vendor/@geargrid/contracts/. Vercel installs it
// as a normal local dependency — no workspace / monorepo config needed.
// To update the vendored copy after editing shared/ sources, run
// `npm run contracts:release` from the GearGrid System repo root.

import { z } from 'zod';
import type { Contract } from '@geargrid/contracts';
import { api } from './api';

/**
 * callContract — the single typed entry point for any endpoint governed by a
 * @geargrid/contracts Contract. Hooks never touch `api.*` directly or write
 * `res.data.data` — all unwrapping and validation happens here, once.
 *
 *   const data = await callContract(VaultToggleContract, { params: { id: 42 } });
 *   // data is typed as { is_id_retained_currently, id_card_status }
 *
 * What this function guarantees:
 *   1. URL path params (/:id) are substituted from `args.params`.
 *   2. Request body/query/params are validated client-side with the contract's
 *      Zod schemas (so a wrong field type never leaves the browser).
 *   3. The response envelope is validated AT RUNTIME with the contract's
 *      response schema, then the inner `data` field is returned.
 *   4. Trap 15 is structurally dead: hooks cannot write `res.data.data`
 *      because they never see `res` at all.
 */
export async function callContract<TParams, TQuery, TBody, TData>(
  contract: Contract<TParams, TQuery, TBody, TData>,
  args: {
    params?: TParams;
    query?: TQuery;
    body?: TBody;
  } = {},
): Promise<TData> {
  // 1. Build the concrete URL by swapping /:name tokens with values.
  let url = contract.path;
  if (args.params && typeof args.params === 'object') {
    for (const [key, value] of Object.entries(args.params as Record<string, unknown>)) {
      url = url.replace(`:${key}`, encodeURIComponent(String(value)));
    }
  }

  // 2. Validate the request pieces on the client — fail-fast on bad inputs.
  if (contract.params) assertValid(contract.params, args.params, 'params');
  if (contract.query) assertValid(contract.query, args.query, 'query');
  if (contract.body) assertValid(contract.body, args.body, 'body');

  // 3. Fire the request. The axios interceptor in src/lib/api.ts already
  //    unwraps response.data, so `raw` IS the server envelope `{ status, data }`.
  const raw = await api.request({
    url,
    method: contract.method,
    params: args.query,
    data: args.body,
  });

  // 4. Validate the envelope and return the inner payload.
  const parsed = contract.response.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = ['response', ...(first?.path ?? [])].join('.');
    throw new Error(
      `Contract ${contract.method} ${contract.path} returned an unexpected shape: ${path} — ${first?.message ?? 'validation failed'}`,
    );
  }
  return parsed.data.data;
}

function assertValid<T>(schema: z.ZodType<T>, value: unknown, label: string) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = [label, ...(first?.path ?? [])].join('.');
    throw new Error(`Invalid ${path}: ${first?.message ?? 'validation failed'}`);
  }
}
