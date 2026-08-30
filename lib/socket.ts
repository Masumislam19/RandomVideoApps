import { io } from 'socket.io-client';

const SERVER_URL = 'https://randomvideoapps.onrender.com';

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}
