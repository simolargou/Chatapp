require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const simolife   = require('./simolife');

const app        = express();
const server     = http.createServer(app);

console.log('🛠️  Using MONGO_URI:', process.env.MONGO_URI);

const User         = require('./models/User');
const Message      = require('./models/Message');
const Conversation = require('./models/Conversation');

// ======= EXPRESS MIDDLEWARE =======
app.use(express.json());
const uploadsDir = path.join(__dirname, 'uploads');
// ---- CORS-Header für ALLE Anfragen (vor allen Routern!) ----
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Für Prod: deine Domain statt '*'
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// ======= FILE UPLOAD =======

const profilePicsDir = path.join(uploadsDir, 'profile-pics');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(profilePicsDir)) fs.mkdirSync(profilePicsDir, { recursive: true });

// Multer storage for audio uploads (default)
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${suffix}${path.extname(file.originalname)}`);
  }
});
const audioUpload = multer({ storage: audioStorage });

// Multer storage for profile pics
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilePicsDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile-${Date.now()}${ext}`);
  }
});
const profilePicUpload = multer({ storage: profilePicStorage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Audio upload endpoint
app.post('/api/upload/audio', audioUpload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  res.json({ audioUrl: `/uploads/${req.file.filename}` });
});

// ======= ROUTES =======
const expressJwt = require('jsonwebtoken'); // for reference, if you want to add JWT middleware later

// --- Auth Routes ---
const authRouter = express.Router();

// Register with profile pic upload
authRouter.post('/register', profilePicUpload.single('profilePic'), async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password)
      return res.status(400).json({ msg: 'Please enter all fields' });
    if (await User.findOne({ username }))
      return res.status(400).json({ msg: 'User already exists' });

    const profilePicUrl = req.file ? `/uploads/profile-pics/${req.file.filename}` : '';
    const user = new User({ username, password, profilePic: profilePicUrl });
    await user.save();
    res.status(201).json({ msg: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).send('Server error');
  }
});

// Login unchanged, but returns profilePic
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password)
      return res.status(400).json({ msg: 'Invalid credentials' });

    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password)))
      return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user.id, username: user.username, profilePic: user.profilePic } };
    expressJwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, username: user.username, profilePic: user.profilePic } });
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error');
  }
});

app.use('/api/auth', authRouter);

// --- Messages Routes ---
const messagesRouter = require('./routes/messages');
app.use('/api/messages', messagesRouter);

// ======= PUBLIC MESSAGE HISTORY =======
app.get('/api/messages/public', async (req, res) => {
  try {
    const history = await Message.find({ conversation: null })
      .sort({ timestamp: 1 })
      .populate('author', 'username profilePic');
    res.json(history);
  } catch (err) {
    console.error('Error fetching public messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======= MONGOOSE SETUP =======
mongoose.set('debug', true);
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected:', mongoose.connection.host, mongoose.connection.name);
    mongoose.connection.on('connected', () => {
      console.log('🗄️  Connected to DB →', mongoose.connection.db.databaseName);
    });
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ======= SOCKET.IO =======
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let onlineUsers = {};

io.on('connection', socket => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('userOnline', user => {
    if (!user?.id) return;
    socket.auth = { user };
    onlineUsers[user.id] = { username: user.username, profilePic: user.profilePic, socketId: socket.id };
    io.emit('getOnlineUsers',
      Object.entries(onlineUsers).map(([id, u]) => ({ id, username: u.username, profilePic: u.profilePic }))
    );
  });

  socket.on('disconnect', () => {
    const u = socket.auth?.user;
    if (u?.id) {
      delete onlineUsers[u.id];
      io.emit('getOnlineUsers',
        Object.entries(onlineUsers).map(([id, u]) => ({ id, username: u.username, profilePic: u.profilePic }))
      );
    }
  });

  socket.on('loadPublicHistory', async () => {
    console.log('→ loadPublicHistory from', socket.id);
    try {
      const history = await Message.find({ conversation: null })
        .sort({ timestamp: 1 })
        .populate('author', 'username profilePic');
      socket.emit('publicHistory', history);
      console.log(`← publicHistory (${history.length}) sent`);
    } catch (err) {
      console.error('Error in loadPublicHistory:', err);
      socket.emit('publicHistory', []);
    }
  });

  socket.on('sendPublicMessage', async data => {
    const authorId = socket.auth?.user?.id || data.author;
    if (!authorId) {
      console.error('❌ sendPublicMessage missing authorId');
      return;
    }
    console.log('📩 sendPublicMessage payload:', data);
    try {
      const newMsg = new Message({
        author: authorId,
        messageType: data.messageType,
        text: data.text,
        audioUrl: data.audioUrl,
        timestamp: new Date(),
        conversation: null
      });
      console.log('   ▶︎ about to save:', newMsg);
      const saved = await newMsg.save();
      console.log('   ✅ saved:', saved._id);

      const count = await Message.countDocuments();
      console.log('   🔢 total messages in DB:', count);

      const populated = await saved.populate('author', 'username profilePic');
      io.emit('receivePublicMessage', populated);
      console.log('   📡 broadcasted:', populated._id);
    } catch (err) {
      console.error('❌ Error saving public message:', err);
    }
  });

  socket.on('startPrivateChat', async ({ fromUserId, toUsername }) => {
    console.log('→ startPrivateChat:', fromUserId, toUsername);
    try {
      const toUser = await User.findOne({ username: toUsername });
      if (!toUser) {
        return socket.emit('privateChatError', { error: 'User not found' });
      }
      let convo = await Conversation.findOne({
        participants: { $all: [fromUserId, toUser._id] }
      });
      if (!convo) {
        convo = new Conversation({
          participants: [fromUserId, toUser._id],
          messages: []
        });
        await convo.save();
      }
      socket.emit('privateChatStarted', convo);
      console.log('← privateChatStarted:', convo._id);
    } catch (err) {
      console.error('❌ startPrivateChat error:', err);
      socket.emit('privateChatError', { error: 'Server error' });
    }
  });

  socket.on('sendPrivateMessage', async data => {
    try {
      const convo = await Conversation.findById(data.conversationId);
      if (!convo) return;
      const entry = {
        author: data.author,
        messageType: data.messageType,
        text: data.text,
        audioUrl: data.audioUrl,
        timestamp: new Date()
      };
      convo.messages.push(entry);
      await convo.save();

      const recipientId = convo.participants
        .find(p => p.toString() !== socket.auth.user.id)
        .toString();
      if (onlineUsers[recipientId]) {
        io.to(onlineUsers[recipientId].socketId).emit(
          'receivePrivateMessage',
          { conversationId: data.conversationId, message: entry }
        );
      }
    } catch (err) {
      console.error('❌ sendPrivateMessage error:', err);
    }
  });
    // --- SIMOLIFE video matching logic ---
  socket.on('simolife-join', user => {
    simolife.addUser(socket, user);
    const pair = simolife.findPair();
    if (pair) {
      pair.forEach(u => {
        io.to(u.socketId).emit('simolife-matched', {
          peer: pair.find(x => x.socketId !== u.socketId)
        });
      });
    }
  });

  socket.on('simolife-next', user => {
    simolife.removeUser(socket);
    simolife.addUser(socket, user);
    const pair = simolife.findPair();
    if (pair) {
      pair.forEach(u => {
        io.to(u.socketId).emit('simolife-matched', {
          peer: pair.find(x => x.socketId !== u.socketId)
        });
      });
    }
  });

  socket.on('simolife-leave', () => {
    simolife.removeUser(socket);
  });

  // ---- WebRTC signaling for Simolife ----
  socket.on('simolife-offer', data => {
    io.to(data.to).emit('simolife-offer', { from: socket.id, offer: data.offer });
  });
  socket.on('simolife-answer', data => {
    io.to(data.to).emit('simolife-answer', { from: socket.id, answer: data.answer });
  });
  socket.on('simolife-ice', data => {
    io.to(data.to).emit('simolife-ice', { from: socket.id, candidate: data.candidate });
  });


  // Audio-Call Events...
  function getUserIdByUsername(username) {
    for (const id in onlineUsers) {
      if (onlineUsers[id].username === username) return id;
    }
    return null;
  }

  socket.on('audio-call-offer', ({ to, offer, from }) => {
    const recipientId = getUserIdByUsername(to);
    if (recipientId && onlineUsers[recipientId]) {
      io.to(onlineUsers[recipientId].socketId).emit('audio-call-offer', { from, offer });
    }
  });

  socket.on('audio-call-answer', ({ to, answer, from }) => {
    const recipientId = getUserIdByUsername(to);
    if (recipientId && onlineUsers[recipientId]) {
      io.to(onlineUsers[recipientId].socketId).emit('audio-call-answer', { from, answer });
    }
  });

  socket.on('audio-call-ice', ({ to, candidate, from }) => {
    const recipientId = getUserIdByUsername(to);
    if (recipientId && onlineUsers[recipientId]) {
      io.to(onlineUsers[recipientId].socketId).emit('audio-call-ice', { from, candidate });
    }
  });

  socket.on('audio-call-ended', ({ to, from }) => {
    const recipientId = getUserIdByUsername(to);
    if (recipientId && onlineUsers[recipientId]) {
      io.to(onlineUsers[recipientId].socketId).emit('audio-call-ended', { from });
    }
  });

});

// ======= SERVER START =======
server.listen(process.env.PORT || 5000, () =>
  console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
);
