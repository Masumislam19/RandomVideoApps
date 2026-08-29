import { io } from 'socket.io-client';

const SERVER_URL = 'http://127.0.0.1:3000';

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
