// backend/routes/departments.js
const express    = require('express');
const Department = require('../models/Department');
const User       = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET all
router.get('/', protect, async (req, res) => {
  const depts = await Department.find().populate('hod', 'name email').sort({ code: 1 });
  res.json(depts);
});

// POST create
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json(dept);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// PUT update
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// DELETE
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  await Department.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'Department deactivated' });
});

module.exports = router;
