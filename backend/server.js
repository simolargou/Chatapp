// backend/server.js

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');


console.log('🛠️  Using MONGO_URI:', process.env.MONGO_URI);


const User         = require('./models/User');
const Message      = require('./models/Message');
const Conversation = require('./models/Conversation');


const app    = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());


const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, uploadsDir),
  filename:    (req,file,cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, `${file.fieldname}-${suffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });
app.use('/uploads', express.static(uploadsDir));


app.use('/api/auth', require('./routes/auth'));
app.post('/api/upload/audio', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error:'No file uploaded.' });
  res.json({ audioUrl: `/uploads/${req.file.filename}` });
});


app.get('/api/messages/public', async (req,res) => {
  try {
    const history = await Message.find({ conversation: null })
      .sort({ timestamp: 1 })
      .populate('author','username');
    res.json(history);
  } catch(err) {
    console.error('Error fetching public messages:', err);
    res.status(500).json({ error:'Server error' });
  }
});


mongoose.set('debug', true);
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected:', mongoose.connection.host, mongoose.connection.name);
    mongoose.connection.on('connected', () => {
      console.log('🗄️  Connected to DB →', mongoose.connection.db.databaseName);
    });
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

const io = new Server(server, {
  cors:{ origin:'*', methods:['GET','POST'] }
});

let onlineUsers = {}; 

io.on('connection', socket => {
  console.log('🔌 Socket connected:', socket.id);


  socket.on('userOnline', user => {
    if (!user?.id) return;
    socket.auth = { user };
    onlineUsers[user.id] = { username:user.username, socketId:socket.id };
    io.emit('getOnlineUsers',
      Object.entries(onlineUsers).map(([id,u])=>({id,username:u.username}))
    );
  });


  socket.on('disconnect', () => {
    const u = socket.auth?.user;
    if (u?.id) {
      delete onlineUsers[u.id];
      io.emit('getOnlineUsers',
        Object.entries(onlineUsers).map(([id,u])=>({id,username:u.username}))
      );
    }
  });

  socket.on('loadPublicHistory', async () => {
    console.log('→ loadPublicHistory from', socket.id);
    try {
      const history = await Message.find({ conversation:null })
        .sort({ timestamp:1 })
        .populate('author','username');
      socket.emit('publicHistory', history);
      console.log(`← publicHistory (${history.length}) sent`);
    } catch(err) {
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
        author:       authorId,
        messageType:  data.messageType,
        text:         data.text,
        audioUrl:     data.audioUrl,
        timestamp:    new Date(),
        conversation: null
      });
      console.log('   ▶︎ about to save:', newMsg);
      const saved = await newMsg.save();
      console.log('   ✅ saved:', saved._id);

      const count = await Message.countDocuments();
      console.log('   🔢 total messages in DB:', count);

      const populated = await saved.populate('author','username');
      io.emit('receivePublicMessage', populated);
      console.log('   📡 broadcasted:', populated._id);
    } catch(err) {
      console.error('❌ Error saving public message:', err);
    }
  });


  socket.on('startPrivateChat', async ({fromUserId,toUsername}) => {
    console.log('→ startPrivateChat:', fromUserId, toUsername);
    try {
      const toUser = await User.findOne({ username:toUsername });
      if (!toUser) {
        return socket.emit('privateChatError',{ error:'User not found' });
      }
      let convo = await Conversation.findOne({
        participants:{ $all:[fromUserId,toUser._id] }
      });
      if (!convo) {
        convo = new Conversation({
          participants:[fromUserId,toUser._id],
          messages:[]
        });
        await convo.save();
      }
      socket.emit('privateChatStarted', convo);
      console.log('← privateChatStarted:', convo._id);
    } catch(err) {
      console.error('❌ startPrivateChat error:', err);
      socket.emit('privateChatError',{ error:'Server error' });
    }
  });

  socket.on('sendPrivateMessage', async data => {
    try {
      const convo = await Conversation.findById(data.conversationId);
      if (!convo) return;
      const entry = {
        author:      data.author,
        messageType: data.messageType,
        text:        data.text,
        audioUrl:    data.audioUrl,
        timestamp:   new Date()
      };
      convo.messages.push(entry);
      await convo.save();

      const recipientId = convo.participants
        .find(p=>p.toString()!==socket.auth.user.id)
        .toString();
      if (onlineUsers[recipientId]) {
        io.to(onlineUsers[recipientId].socketId).emit(
          'receivePrivateMessage',
          { conversationId:data.conversationId, message:entry }
        );
      }
    } catch(err) {
      console.error('❌ sendPrivateMessage error:', err);
    }
  });

}); 

server.listen(process.env.PORT||5000, ()=>
  console.log(`🚀 Server running on port ${process.env.PORT||5000}`)
);
