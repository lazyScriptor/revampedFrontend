import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { connectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRetailEnabled } from "../useRetailEnabled";
import { decideApproval, fetchDesk } from "../api/retail.api";
import type { DeskQuery } from "../api/types";

export const DESK_KEY = ["approvals", "desk"] as const;

/** Can this user decide approvals, in a shop that has retail? */
export const useCanUseDesk = () => {
  const retail = useRetailEnabled();
  const allowed = useAuthStore((s) => s.hasPermission("approvals:decide"));
  return retail && allowed;
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

/** The 🛎 number: requests waiting for a decision. */
export const useWaitingCount = () => {
  const enabled = useCanUseDesk();
  useDeskLiveUpdates(enabled);
  const q = useQuery({
    queryKey: [...DESK_KEY, "waiting-count"],
    queryFn: async () => (await fetchDesk({ tab: "waiting", page: 1, limit: 1 })).total,
    enabled,
    staleTime: 30 * 1000,
  });
  return { enabled, count: q.data ?? 0 };
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
