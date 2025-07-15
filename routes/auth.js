const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create the profile-pics upload folder if it doesn't exist
const profilePicsDir = path.join(__dirname, '../uploads/profile-pics');
if (!fs.existsSync(profilePicsDir)) {
    fs.mkdirSync(profilePicsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, profilePicsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `profile-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage });

// --- REGISTER ---
router.post('/register', upload.single('profilePic'), async (req, res) => {
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

// --- LOGIN ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password)
            return res.status(400).json({ msg: 'Invalid credentials' });

        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password)))
            return res.status(400).json({ msg: 'Invalid credentials' });

        const payload = { user: { id: user.id, username: user.username, profilePic: user.profilePic } };
        jwt.sign(
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

module.exports = router;
