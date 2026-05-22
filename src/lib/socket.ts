import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const resolveSocketUrl = () => {
  // The Vite env var points at /api; the WebSocket lives on the bare origin.
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!apiUrl) return "/";
  return apiUrl.replace(/\/api\/?$/, "");
};

export const getSocket = (): Socket => {
  if (socket) return socket;
  socket = io(resolveSocketUrl(), {
    withCredentials: true,
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
