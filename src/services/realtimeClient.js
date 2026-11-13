import { io } from 'socket.io-client';
import { API_BASE_URL, DEMO_MODE } from '../config/backendApi';
import { readStoredSession } from './apiClient';

let socket = null;
let socketToken = null;

export async function connectChatSocket() {
  if (DEMO_MODE) return null;
  const session = await readStoredSession();
  if (!session?.accessToken) return null;
  if (socket && socketToken !== session.accessToken) {
    socket.disconnect();
    socket = null;
  }
  if (!socket) {
    socketToken = session.accessToken;
    socket = io(API_BASE_URL.replace(/\/api\/v1\/?$/, ''), {
      autoConnect: false,
      auth: { token: session.accessToken },
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectChatSocket() {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}
