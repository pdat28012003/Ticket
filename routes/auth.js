const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role, team } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
    
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const user = new User({ fullName, email, password, role: role || 'project_team', team });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, team: user.team }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, team: user.team }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// Get all infra team members (for assignment)
router.get('/infra-members', auth, async (req, res) => {
  try {
    const members = await User.find({ role: { $in: ['infra_team', 'admin'] }, isActive: true }).select('fullName email role team');
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
