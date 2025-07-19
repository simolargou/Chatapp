// src/socket.js
import { io } from 'socket.io-client';

const URL = process.env.REACT_APP_API_URL;

class SocketService {
  socket = null;

  connect(user) {
    if (!user) return;

    // Wenn Socket bereits initialisiert
    if (this.socket) {
      this.socket.auth = { user };
      if (!this.socket.connected) {
        this.registerCoreEvents(user); // 🔁 wichtig bei reconnect
        this.socket.connect();
      }
      return;
    }

    console.log("⚙️ Connecting socket to", URL);

    this.socket = io(URL, {
      autoConnect: false,
      transports: ['websocket'],
    });

    this.socket.auth = { user };
    this.registerCoreEvents(user); // Events binden
    this.socket.connect();         // Verbindung starten
  }

  registerCoreEvents(user) {
    this.socket.on('connect', () => {
      console.log(`✅ Socket connected. ID: ${this.socket.id}`);
      this.emit('userOnline', user); // wichtig!
    });

    this.socket.on('connect_error', err => {
      console.error('❌ Socket connect_error:', err.message);
    });

    this.socket.on('disconnect', reason => {
      console.log(`🔌 Socket disconnected: ${reason}`);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log("🛑 Disconnecting socket");
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
    console.log(`📤 emit '${evt}':`, data);
    this.socket.emit(evt, data);
  }
}

export const socket = new SocketService();
