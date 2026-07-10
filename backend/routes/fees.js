// backend/routes/fees.js
const express = require('express');
const Fee     = require('../models/Fee');
const { protect, authorize } = require('../middleware/auth');
const router  = express.Router();

// GET /fees/me — student gets their own fees
router.get('/me', protect, async (req, res) => {
  const Student = require('../models/Student');
  let student = null;

  // Try via studentRef on User first (most common)
  if (req.user.studentRef) {
    student = await Student.findById(req.user.studentRef);
  }
  // Fallback: look up Student by userRef
  if (!student) {
    student = await Student.findOne({ userRef: req.user._id });
  }
  if (!student) return res.status(404).json({ message: 'No student profile linked' });

  const fees = await Fee.find({ studentRef: student._id }).sort({ createdAt: -1 });
  res.json(fees);
});

// GET fees for a student (admin/teacher or the student themselves)
router.get('/student/:studentId', protect, async (req, res) => {
  const fees = await Fee.find({ studentRef: req.params.studentId }).sort({ createdAt: -1 });
  res.json(fees);
});

// GET all fees with optional filters
router.get('/', protect, authorize('admin'), async (req, res) => {
  const { paidStatus, academicYear } = req.query;
  const filter = {};
  if (paidStatus !== undefined) filter.paidStatus = paidStatus === 'true';
  if (academicYear) filter.academicYear = academicYear;
  const fees = await Fee.find(filter).populate('studentRef', 'name regNo class').sort({ createdAt: -1 });
  res.json(fees);
});

// POST create fee record
router.post('/', protect, authorize('admin'), async (req, res) => {
  const fee = await Fee.create(req.body);
  res.status(201).json(fee);
});

// PUT add payment
router.put('/:id/pay', protect, authorize('admin'), async (req, res) => {
  const { amount, transactionID } = req.body;
  const fee = await Fee.findById(req.params.id);
  if (!fee) return res.status(404).json({ message: 'Fee record not found' });
  fee.paidAmount += amount;
  fee.receipts.push({ amount, transactionID, date: new Date() });
  await fee.save(); // balance recalculated in pre-save hook
  res.json(fee);
});

// DELETE fee record
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  await Fee.findByIdAndDelete(req.params.id);
  res.json({ message: 'Fee record deleted' });
});

// GET fee summary stats
router.get('/stats/summary', protect, authorize('admin'), async (req, res) => {
  const fees = await Fee.find({});
  const totalDue    = fees.reduce((s, f) => s + f.balance, 0);
  const totalPaid   = fees.reduce((s, f) => s + f.paidAmount, 0);
  const paidCount   = fees.filter(f => f.paidStatus).length;
  const unpaidCount = fees.filter(f => !f.paidStatus).length;
  res.json({ totalDue, totalPaid, paidCount, unpaidCount, total: fees.length });
});

module.exports = router;
