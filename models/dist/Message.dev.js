"use strict";

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var MessageSchema = new Schema({
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageType: {
    type: String,
    "enum": ['text', 'audio'],
    "default": 'text'
  },
  text: {
    type: String
  },
  audioUrl: {
    type: String
  },
  timestamp: {
    type: Date,
    "default": Date.now
  },
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    "default": null
  }
});
module.exports = mongoose.model('Message', MessageSchema);