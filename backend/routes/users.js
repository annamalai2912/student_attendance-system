// backend/routes/users.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const router  = express.Router();

// GET /api/users — accessible to all authenticated users (for dropdowns)
// Write operations below are admin-only

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

// GET /api/users — all authenticated users can list (for dropdowns)
router.get('/', protect, async (req, res) => {
  const { role, search } = req.query;
  const filter = {};
  if (role)   filter.role = role;
  if (search) filter.$or = [
    { name:  { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// POST /api/users — admin only
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { name, email, password, role, assignedClass, studentRef } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ message: 'name, email, password, role are required' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, password, role, assignedClass, studentRef });
  res.status(201).json({ token: signToken(user._id), user });
});

// PUT /api/users/:id — admin only
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const allowed = ['name', 'email', 'role', 'assignedClass', 'isActive', 'studentRef'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// PUT /api/users/:id/reset-password — admin only
router.put('/:id/reset-password', protect, authorize('admin'), async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  // bcryptjs v3 — hash directly
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save({ validateBeforeSave: false });
  res.json({ message: 'Password reset successfully' });
});

// DELETE /api/users/:id — deactivate (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  if (req.params.id === req.user._id.toString())
    return res.status(400).json({ message: 'Cannot deactivate your own account' });
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deactivated', user });
});

// DELETE /api/users/:id/permanent — hard delete (admin only)
router.delete('/:id/permanent', protect, authorize('admin'), async (req, res) => {
  if (req.params.id === req.user._id.toString())
    return res.status(400).json({ message: 'Cannot delete your own account' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  // Prevent deleting last admin
  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (adminCount <= 1) return res.status(400).json({ message: 'Cannot delete the only admin account' });
  }
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: `User "${user.name}" permanently deleted` });
});

module.exports = router;
