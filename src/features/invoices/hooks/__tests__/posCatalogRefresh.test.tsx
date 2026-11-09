// After a price edit the till must not keep selling at the old price: every equipment save
// refreshes ["equipment"], and the till's catalog lives under that key.
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/features/equipment/api/equipment.api", () => ({
  fetchEquipment: vi.fn(),
  createEquipment: vi.fn(async () => ({})),
  deleteEquipment: vi.fn(async () => ({})),
  updateEquipment: vi.fn(async () => ({})),
  bulkUpdateEquipment: vi.fn(async () => ({})),
}));

import { POS_CATALOG_KEY } from "../usePosEquipmentCatalog";
import { useBulkUpdateEquipment, useCreateEquipment, useUpdateEquipment } from "@/features/equipment/hooks/useEquipmentHooks";

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = [...POS_CATALOG_KEY, { search: "", categoryId: null, stockFilter: true }];
  client.setQueryData(key, { pages: [{ equipment: [{ equipment_id: 90, base_rental_price: "50.00" }] }] });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, key, wrapper };
};

describe("till equipment catalog refresh", () => {
  it("is filed under the equipment key", () => {
    expect(POS_CATALOG_KEY[0]).toBe("equipment");
  });

  it.each([
    ["editing one machine", useUpdateEquipment, { id: 90, data: { base_rental_price: 250, minimum_rental_days: 5 } }],
    ["bulk editing", useBulkUpdateEquipment, { ids: [90], updates: { base_rental_price: 250 } }],
    ["adding a machine", useCreateEquipment, { equipment_name: "Scaffolding" }],
  ])("%s marks the till's prices stale", async (_label, useHook, vars) => {
    const { client, key, wrapper } = setup();
    expect(client.getQueryState(key)?.isInvalidated).toBe(false);
    const { result } = renderHook(() => (useHook as any)(), { wrapper });
    result.current.mutate(vars);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });
});
