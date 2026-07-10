// backend/routes/auth.js
const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const router  = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

// POST /api/auth/register  — Admin only (not public)
router.post('/register', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create accounts' });
  }
  const { name, email, password, role, assignedClass, studentRef } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, password, role, assignedClass, studentRef });
  const token = signToken(user._id);
  res.status(201).json({ token, user });
});

// POST /api/auth/register/seed  — One-time first admin creation (only if NO admin exists)
router.post('/register/seed', async (req, res) => {
  const adminExists = await User.findOne({ role: 'admin' });
  if (adminExists) return res.status(403).json({ message: 'Admin already exists. Use admin panel.' });
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, password, role: 'admin' });
  const token = signToken(user._id);
  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email    = (req.body.email    || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();
  if (!email || !password) return res.status(400).json({ message: 'Provide email and password' });
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'Account has been deactivated. Contact admin.' });
  const token = signToken(user._id);
  res.json({ token, user });
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('studentRef', 'name regNo class batch');
  res.json(user);
});

module.exports = router;
