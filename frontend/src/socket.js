// socket.js

import { io } from 'socket.io-client';

const URL = process.env.REACT_APP_API_URL ;

class SocketService {
  socket;

  connect(user) {
    if (this.socket?.connected) return;

    console.log("⚙️ Connecting socket to", URL);
    this.socket = io(URL, {
      autoConnect: false,
      auth: { user }
    });

    this.socket.on('connect', () => {
      console.log(`Socket connected. ID: ${this.socket.id}`);
      this.emit('userOnline', user);
    });

    this.socket.on('connect_error', err => {
      console.error('Socket connect_error:', err.message);
    });

    this.socket.on('disconnect', reason => {
      console.log(`Socket disconnected: ${reason}`);
    });

    this.socket.connect();
  }

  disconnect() {
    if (this.socket) {
      console.log("Disconnecting socket");
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(evt, cb) {
    this.socket?.on(evt, cb);
  }

  off(evt, cb) {
    this.socket?.off(evt, cb);
  }

  emit(evt, data) {
    console.log(`emit '${evt}':`, data);
    this.socket?.emit(evt, data);
  }
}

export const socket = new SocketService();
