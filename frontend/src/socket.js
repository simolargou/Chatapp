// src/socket.js
import { io } from 'socket.io-client';

const URL = process.env.REACT_APP_API_URL;

class SocketService {
  socket = null;

  connect(user) {
    if (!user) return;

    if (this.socket) {
      this.socket.auth = { user };

      if (!this.socket.connected) {
        this.registerCoreEvents(user); 
        this.socket.connect();
      }
      return;
    }

    console.log("⚙️ Connecting socket to", URL);
    this.socket = io(URL, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { user }
    });

    this.registerCoreEvents(user);

    this.socket.on('connect', () => {
      console.log(`✅ Socket connected. ID: ${this.socket.id}`);
      this.emit('userOnline', user);
    });

    this.socket.on('connect_error', err => {
      console.error('🚨 Socket connect_error:', err.message);
    });

    this.socket.on('disconnect', reason => {
      console.log(`⚠️ Socket disconnected: ${reason}`);
    });

    this.socket.connect();
  }

  disconnect() {
    if (this.socket) {
      console.log("🔌 Disconnecting socket");
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(evt, data) {
    if (!this.socket) return;
    console.log(`📤 emit '${evt}':`, data);
    this.socket.emit(evt, data);
  }

  on(evt, cb) {
    if (!this.socket) return;
    this.socket.on(evt, cb);
  }

  off(evt, cb) {
    if (!this.socket) return;
    if (cb) {
      this.socket.off(evt, cb);
    } else {
      this.socket.off(evt); // remove all listeners for event
    }
  }

  onceConnected(callback) {
    if (this.socket?.connected) {
      callback();
    } else {
      this.socket.once('connect', callback);
    }
  }

  // Optional: add reusable default listeners here if needed
  registerCoreEvents(user) {
    this.on('userOnline', (u) => {
      console.log("🟢 Online:", u?.username);
    });
  }
}

export const socket = new SocketService();
