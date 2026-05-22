import { create } from "zustand";
import {
  NotificationRow,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationApi,
} from "@/features/notifications/api/notifications.api";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";

interface NotificationState {
  items: NotificationRow[];
  unreadCount: number;
  loading: boolean;
  initialized: boolean;
  socketConnected: boolean;

  init: () => Promise<void>;
  teardown: () => void;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: number) => Promise<void>;

  // Internal — called by socket listener
  pushIncoming: (n: NotificationRow) => void;
  updateJob: (job: any) => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  initialized: false,
  socketConnected: false,

  init: async () => {
    if (get().initialized) return;
    set({ initialized: true, loading: true });

    try {
      const socket = getSocket();
      socket.on("connect", () => set({ socketConnected: true }));
      socket.on("disconnect", () => set({ socketConnected: false }));
      socket.on("connect_error", (err: any) => {
        // eslint-disable-next-line no-console
        console.warn("socket connect_error:", err?.message || err);
      });

      socket.on("notification:new", (n: NotificationRow) => {
        get().pushIncoming(n);
      });
      socket.on("bulkJob:update", (job: any) => {
        get().updateJob(job);
      });
      socket.on("bulkJob:complete", (job: any) => {
        get().updateJob(job);
      });

      connectSocket();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("notification socket init failed:", err);
    }

    // Refresh in the background — never let a notification fetch failure block
    // the rest of the UI or surface as an unhandled rejection.
    get()
      .refresh()
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("initial notification refresh failed:", err?.message || err);
      })
      .finally(() => set({ loading: false }));
  },

  teardown: () => {
    disconnectSocket();
    set({
      items: [],
      unreadCount: 0,
      initialized: false,
      socketConnected: false,
    });
  },

  refresh: async () => {
    // Both calls run in parallel but failures are isolated — a 401 on one
    // shouldn't blow away the data the other returned.
    const [itemsResult, countResult] = await Promise.allSettled([
      fetchNotifications({ limit: 30 }),
      fetchUnreadCount(),
    ]);
    if (itemsResult.status === "fulfilled") set({ items: itemsResult.value });
    if (countResult.status === "fulfilled") set({ unreadCount: countResult.value });
  },

  markRead: async (id) => {
    set((s) => ({
      items: s.items.map((n) =>
        n.notification_id === id && !n.read_at
          ? { ...n, read_at: new Date().toISOString() }
          : n,
      ),
      unreadCount: Math.max(
        0,
        s.unreadCount - (s.items.find((n) => n.notification_id === id && !n.read_at) ? 1 : 0),
      ),
    }));
    try {
      await markNotificationRead(id);
    } catch {
      // If the server call fails, do a refresh to reconcile.
      await get().refresh();
    }
  },

  markAllRead: async () => {
    set((s) => ({
      items: s.items.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
      unreadCount: 0,
    }));
    try {
      await markAllNotificationsRead();
    } catch {
      await get().refresh();
    }
  },

  remove: async (id) => {
    const removed = get().items.find((n) => n.notification_id === id);
    set((s) => ({
      items: s.items.filter((n) => n.notification_id !== id),
      unreadCount:
        removed && !removed.read_at ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
    }));
    try {
      await deleteNotificationApi(id);
    } catch {
      await get().refresh();
    }
  },

  pushIncoming: (n) => {
    set((s) => {
      // Dedupe in case server emits before HTTP poll catches up
      if (s.items.some((x) => x.notification_id === n.notification_id)) return s;
      return {
        items: [n, ...s.items].slice(0, 50),
        unreadCount: s.unreadCount + (n.read_at ? 0 : 1),
      };
    });
  },

  updateJob: () => {
    // Hook reserved for live job-progress UI; the bulk-jobs query cache
    // is invalidated by the data-arena hooks listening separately. Keep this
    // method here so the socket subscription has a place to land.
  },
}));
