const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const router = express.Router();


function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token, authorization denied" });
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token is not valid" });
  }
}


router.delete('/:id', authenticate, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    if (String(msg.author) !== req.user.id) {
      return res.status(403).json({ error: "Not allowed to delete this message" });
    }

    await msg.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
