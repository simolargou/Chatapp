const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password)
            return res.status(400).json({ msg: 'Please enter all fields' });
        if (await User.findOne({ username }))
            return res.status(400).json({ msg: 'User already exists' });

        const user = new User({ username, password }); 
        await user.save();
        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).send('Server error');
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!username || !password)
            return res.status(400).json({ msg: 'Invalid credentials' });

        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password)))
            return res.status(400).json({ msg: 'Invalid credentials' });

        const payload = { user: { id: user.id, username: user.username } };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '8h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username } });
            }
        );
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
