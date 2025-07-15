// src/socket.js

import { io } from 'socket.io-client';

// Default to localhost for dev, but use env for prod
const URL = process.env.REACT_APP_API_URL ;

class SocketService {
  socket = null;

  connect(user) {
    // Only reconnect if not connected or not created
    if (this.socket && this.socket.connected) return;
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
      return;
    }

    // Create new socket connection
    console.log("⚙️ Connecting socket to", URL);
    this.socket = io(URL, {
      autoConnect: false,
      auth: { user },
      transports: ['websocket'],  // force WebSocket for WebRTC, can help in prod
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
    if (!this.socket) return;
    this.socket.on(evt, cb);
  }

  off(evt, cb) {
    if (!this.socket) return;
    this.socket.off(evt, cb);
  }

  emit(evt, data) {
    if (!this.socket) return;
    console.log(`emit '${evt}':`, data);
    this.socket.emit(evt, data);
  }
}

// Export as singleton
export const socket = new SocketService();
