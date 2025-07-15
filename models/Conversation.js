const mongoose = require('mongoose');


const EmbeddedMessageSchema = new mongoose.Schema({
    author: { type: String, required: true },
    messageType: { type: String, enum: ['text', 'audio'], required: true, default: 'text' },
    text: { type: String },
    audioUrl: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const ConversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    messages: [EmbeddedMessageSchema] 
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema);