import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { connectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRetailEnabled } from "../useRetailEnabled";
import { decideApproval, fetchDesk } from "../api/retail.api";
import {
  createUnlistedItem,
  fetchToSortDesk,
  linkUnlistedLines,
  markUnlistedOneOff,
} from "../api/pos.api";
import type { DeskQuery } from "../api/types";
import type { FamilyInput, ProductInput } from "../api/catalog.types";

export const DESK_KEY = ["approvals", "desk"] as const;

/** Can this user decide approvals? */
export const useCanDecideApprovals = () => {
  const retail = useRetailEnabled();
  const allowed = useAuthStore((s) => s.hasPermission("approvals:decide"));
  return retail && allowed;
};

/** Can this user sort unlisted items on the desk? */
export const useCanSortUnlisted = () => {
  const retail = useRetailEnabled();
  const allowed = useAuthStore((s) => s.hasPermission("retail:confirm_unlisted"));
  return retail && allowed;
};

/** Can this user open the manager desk (decider or unlisted sorter)? */
export const useCanUseDesk = () => {
  const canDecide = useCanDecideApprovals();
  const canSort = useCanSortUnlisted();
  return canDecide || canSort;
};

/** Re-reads the desk whenever a till asks or a manager decides (Socket.IO events from the server). */
export const useDeskLiveUpdates = (enabled: boolean) => {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    connectSocket();
    const socket = getSocket();
    const refresh = () => {
      qc.invalidateQueries({ queryKey: DESK_KEY });
    };
    socket.on("approval:requested", refresh);
    socket.on("approval:decided", refresh);
    return () => {
      socket.off("approval:requested", refresh);
      socket.off("approval:decided", refresh);
    };
  }, [enabled, qc]);
};

export const useToSortList = (enabled = true) => {
  const canSort = useCanSortUnlisted();
  return useQuery({
    queryKey: [...DESK_KEY, "to-sort"],
    queryFn: fetchToSortDesk,
    enabled: canSort && enabled,
    staleTime: 15 * 1000,
  });
};

/** The 🛎 number: requests waiting for a decision + unlisted groups waiting to be sorted. */
export const useWaitingCount = () => {
  const canDecide = useCanDecideApprovals();
  const canSort = useCanSortUnlisted();
  const enabled = canDecide || canSort;
  useDeskLiveUpdates(enabled);
  const waitingQ = useQuery({
    queryKey: [...DESK_KEY, "waiting-count"],
    queryFn: async () => (await fetchDesk({ tab: "waiting", page: 1, limit: 1 })).total,
    enabled: canDecide,
    staleTime: 30 * 1000,
  });
  const sortQ = useQuery({
    queryKey: [...DESK_KEY, "to-sort"],
    queryFn: fetchToSortDesk,
    enabled: canSort,
    staleTime: 30 * 1000,
  });
  return {
    enabled,
    count: (waitingQ.data ?? 0) + (sortQ.data?.total ?? 0),
  };
};

export const useDeskList = (q: DeskQuery, enabled = true) =>
  useQuery({
    queryKey: [...DESK_KEY, "list", q],
    queryFn: () => fetchDesk(q),
    enabled,
    staleTime: 15 * 1000,
    placeholderData: (prev) => prev,
  });

export const useDecide = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve }: { id: number; approve: boolean }) => decideApproval(id, approve),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: DESK_KEY });
    },
  });
};

const invalidateAfterSort = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: DESK_KEY });
  void qc.invalidateQueries({ queryKey: ["retail", "catalog"] });
  void qc.invalidateQueries({ queryKey: ["retail", "stock"] });
  void qc.invalidateQueries({ queryKey: ["invoices"] });
};

export const useLinkUnlisted = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { sale_line_ids: number[]; product_id: number }) => linkUnlistedLines(input),
    onSuccess: () => invalidateAfterSort(qc),
  });
};

export const useCreateUnlisted = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      sale_line_ids: number[];
      item: ProductInput | FamilyInput;
      opening_qty?: number | null;
    }) => createUnlistedItem(input),
    onSuccess: () => invalidateAfterSort(qc),
  });
};

export const useOneOffUnlisted = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { sale_line_ids: number[] }) => markUnlistedOneOff(input),
    onSuccess: () => invalidateAfterSort(qc),
  });
};
