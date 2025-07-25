
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const server = http.createServer(app);

console.log('🛠️  Using MONGO_URI:', process.env.MONGO_URI);

const User = require('./models/User');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const cors = require('cors');
const allowedOrigins = [
  process.env.DOMAIN,
  process.env.WDOMAIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log(`❌ Blocked CORS origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// ======= Uploads =======
const uploadsDir = path.join(__dirname, 'uploads');
const profilePicsDir = path.join(uploadsDir, 'profile-pics');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(profilePicsDir)) fs.mkdirSync(profilePicsDir, { recursive: true });

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${suffix}${path.extname(file.originalname)}`);
  }
});
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilePicsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile-${Date.now()}${ext}`);
  }
});

const audioUpload = multer({ storage: audioStorage });
const profilePicUpload = multer({ storage: profilePicStorage });

app.use('/uploads', cors(), express.static(path.join(__dirname, 'uploads')));
app.post('/api/upload/audio', audioUpload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  res.json({ audioUrl: `/uploads/${req.file.filename}` });
});

app.get('/ping', (_, res) => res.send('pong ✅'));
app.get('/', (_, res) => res.send('Backend läuft!'));


// ======= Auth Routes =======
const jwt = require('jsonwebtoken');
const authRouter = express.Router();

authRouter.post('/register', profilePicUpload.single('profilePic'), async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) return res.status(400).json({ msg: 'Missing fields' });
    if (await User.findOne({ username })) return res.status(400).json({ msg: 'User exists' });

    const profilePicUrl = req.file ? `/uploads/profile-pics/${req.file.filename}` : '';
    const user = new User({ username, password, profilePic: profilePicUrl });
    await user.save();
    res.status(201).json({ msg: 'Registered' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).send('Server error');
  }
});

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password)))
      return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user.id, username: user.username, profilePic: user.profilePic } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: payload.user });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error');
  }
});

app.use('/api/auth', authRouter);

const messagesRouter = require('./routes/messages');
app.use('/api/messages', messagesRouter);

app.get('/api/messages/public', async (req, res) => {
  try {
    const history = await Message.find({ conversation: null })
      .sort({ timestamp: 1 })
      .populate('author', 'username profilePic');
    res.json(history);
  } catch (err) {
    console.error('Public message fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======= MONGOOSE =======
mongoose.set('debug', true);
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ======= SOCKET.IO =======
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

let onlineUsers = {};
let simolifeQueue = [];

function getSocketByUserId(userId) {
  for (const [id, s] of io.of('/').sockets) {
    if (s.auth?.user?.id === userId) return s;
  }
  return null;
}

function matchSimolifeSocket(socket) {
  const user = socket.auth?.user;
  if (!user) return;

  const peer = simolifeQueue.find(s => s.id !== socket.id && s.simolifeActive && !s.simolifePeer && s.connected);
  if (peer) {
    socket.simolifePeer = peer.auth.user;
    peer.simolifePeer = socket.auth.user;
    simolifeQueue = simolifeQueue.filter(s => s.id !== peer.id && s.id !== socket.id);
    socket.emit("simolife-matched", { peer: peer.auth.user });
    peer.emit("simolife-matched", { peer: socket.auth.user });
    console.log(`🔁 Matched ${user.username} ↔ ${peer.auth.user.username}`);
  } else {
    console.log(`👤 ${user.username} waiting in queue`);
    simolifeQueue.push(socket);
    socket.emit("simolife-matched", { peer: null });
  }
}
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("🧪 Decoded:", decoded);
    const userId = decoded.user?.id;
    if (!userId) return next(new Error("❌ No user ID in token"));

    const user = await User.findById(userId).lean();

    if (!user) return next(new Error("❌ User not found"));

    socket.auth = { user };
    next();
  } catch (err) {
    console.error("❌ Auth error:", err.message);
    next(new Error("Unauthorized"));
  }
});


io.on('connection', socket => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('userOnline', user => {
    if (!user?.id) return;
    socket.auth = { user };
    onlineUsers[user.id] = { username: user.username, profilePic: user.profilePic, socketId: socket.id };
    io.emit('getOnlineUsers', Object.entries(onlineUsers).map(([id, u]) => ({ id, ...u })));
  });

  socket.on('disconnect', () => {
    const u = socket.auth?.user;
    if (u?.id) delete onlineUsers[u.id];
    io.emit('getOnlineUsers', Object.entries(onlineUsers).map(([id, u]) => ({ id, ...u })));

    simolifeQueue = simolifeQueue.filter(s => s.id !== socket.id);
    if (socket.simolifePeer) {
      const peerSocket = getSocketByUserId(socket.simolifePeer.id);
      if (peerSocket) {
        peerSocket.emit('simolife-peer-left');
        peerSocket.simolifePeer = null;
      }
    }
  });

  socket.on('loadPublicHistory', async () => {
    const history = await Message.find({ conversation: null }).sort({ timestamp: 1 }).populate('author', 'username profilePic');
    socket.emit('publicHistory', history);
  });

  socket.on('sendPublicMessage', async data => {
    const authorId = socket.auth?.user?.id || data.author;
    const msg = new Message({
      author: authorId,
      messageType: data.messageType,
      text: data.text,
      audioUrl: data.audioUrl,
      timestamp: new Date(),
      conversation: null
    });
    const saved = await msg.save();
    const populated = await saved.populate('author', 'username profilePic');
    io.emit('receivePublicMessage', populated);
  });
 socket.on('sendPrivateMessage', async ({ conversationId, author, messageType, text, audioUrl }) => {
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo) return;

        const fromUser = await User.findOne({ username: author });
        if (!fromUser) return;

        const msg = new Message({
          conversation: convo._id,
          author: fromUser._id,
          messageType,
          text,
          audioUrl,
          timestamp: new Date(),
        });
        await msg.save();

        convo.messages.push(msg._id);
        await convo.save();

        const populatedMessage = await msg.populate('author', 'username');

       
        for (const participantId of convo.participants) {
          const targetSocket = getSocketByUserId(participantId.toString());
          if (targetSocket) {
            targetSocket.emit('receivePrivateMessage', {
              conversationId: convo._id,
              message: {
                author: populatedMessage.author.username,
                messageType,
                text,
                audioUrl,
                timestamp: populatedMessage.timestamp,
              }
            });
          }
        }
      } catch (err) {
        console.error('sendPrivateMessage error:', err);
      }
    });
  socket.on('audio-call-offer', ({ to, offer, from }) => {
    const targetUser = Object.values(onlineUsers).find(u => u.username === to);
    if (targetUser) {
      const peerSocket = io.sockets.sockets.get(targetUser.socketId);
      if (peerSocket) {
        const from = {
          username: socket.auth.user.username,
          profilePic: socket.auth.user.profilePic
        };
        peerSocket.emit('audio-call-offer', { from, offer });
      }
    }
  });

  socket.on('audio-call-answer', ({ to, answer, from }) => {
    const targetUser = Object.values(onlineUsers).find(u => u.username === to);
    if (targetUser) {
      const peerSocket = io.sockets.sockets.get(targetUser.socketId);
      if (peerSocket) {
        peerSocket.emit('audio-call-answer', { from, answer });
      }
    }
  });

  socket.on('audio-call-ice', ({ to, candidate, from }) => {
    const targetUser = Object.values(onlineUsers).find(u => u.username === to);
    if (targetUser) {
      const peerSocket = io.sockets.sockets.get(targetUser.socketId);
      if (peerSocket) {
        peerSocket.emit('audio-call-ice', { from, candidate });
      }
    }
  });

  socket.on('audio-call-ended', ({ to, from }) => {
    const targetUser = Object.values(onlineUsers).find(u => u.username === to);
    if (targetUser) {
      const peerSocket = io.sockets.sockets.get(targetUser.socketId);
      if (peerSocket) {
        peerSocket.emit('audio-call-ended', { from });
      }
    }
  });

  // ======= SIMOLIFE =======
  socket.on('simolife-join', user => {
  
    socket.auth = { user };
    socket.simolifeActive = true;

    if (socket.simolifePeer) {
      const oldPeerSocket = getSocketByUserId(socket.simolifePeer.id);
      if (oldPeerSocket) {
        oldPeerSocket.emit('simolife-peer-left');
        oldPeerSocket.simolifePeer = null;
      }
      socket.simolifePeer = null;
    }

    matchSimolifeSocket(socket);
  });

  socket.on('simolife-leave', () => {
    socket.simolifeActive = false;
    simolifeQueue = simolifeQueue.filter(s => s.id !== socket.id);
    if (socket.simolifePeer) {
      const peerSocket = getSocketByUserId(socket.simolifePeer.id);
      if (peerSocket) {
        peerSocket.emit('simolife-peer-left');
        peerSocket.simolifePeer = null;
      }
      socket.simolifePeer = null;
    }
  });

  socket.on('simolife-next', user => {
    if (socket.simolifePeer) {
      const peerSocket = getSocketByUserId(socket.simolifePeer.id);
      if (peerSocket) {
        peerSocket.emit('simolife-peer-left');
        peerSocket.simolifePeer = null;
      }
      socket.simolifePeer = null;
    }
    simolifeQueue = simolifeQueue.filter(s => s.id !== socket.id);
    setTimeout(() => {
      socket.simolifeActive = true;
      matchSimolifeSocket(socket);
    }, 2000);
  });
    socket.on('startPrivateChat', async ({ fromUserId, toUsername }) => {
        try {
          const fromUser = await User.findById(fromUserId);
          const toUser = await User.findOne({ username: toUsername });

          if (!fromUser || !toUser) {
            return socket.emit('privateChatError', { error: 'User not found' });
          }

          let conversation = await Conversation.findOne({
            participants: { $all: [fromUser._id, toUser._id], $size: 2 }
          }).populate({
            path: 'messages',
            options: { sort: { timestamp: 1 } }
          });

          if (!conversation) {
            conversation = new Conversation({ participants: [fromUser._id, toUser._id], messages: [] });
            await conversation.save();
          }

          const messages = await Message.find({ conversation: conversation._id })
              .sort({ timestamp: 1 })
              .populate('author', 'username profilePic');

          const convoData = {
            _id: conversation._id,
            participants: [fromUser, toUser],
            messages
          };

          socket.emit('privateChatStarted', convoData);

        } catch (err) {
          console.error('Private chat error:', err);
          socket.emit('privateChatError', { error: 'Server error' });
        }
      });

  socket.on('simolife-offer', ({ to, offer }) => {
    const peer = getSocketByUserId(to.id);
    if (peer) peer.emit('simolife-offer', { from: socket.auth.user, offer });
  });

  socket.on('simolife-answer', ({ to, answer }) => {
    const peer = getSocketByUserId(to.id);
    if (peer) peer.emit('simolife-answer', { from: socket.auth.user, answer });
  });

  socket.on('simolife-ice', ({ to, candidate }) => {
    const peer = getSocketByUserId(to.id);
    if (peer) peer.emit('simolife-ice', { from: socket.auth.user, candidate });
  });
});
console.log('✅ Allowed Origins:', allowedOrigins);
// ======= SERVER START =======
server.listen(process.env.PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});