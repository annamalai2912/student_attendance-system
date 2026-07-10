// backend/routes/leaves.js
const express    = require('express');
const Leave      = require('../models/Leave');
const Student    = require('../models/Student');
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET all leaves (admin/faculty see all; student sees own)
router.get('/', protect, async (req, res) => {
  const { studentId, status, type } = req.query;
  const filter = {};
  if (studentId) filter.student = studentId;
  if (status)    filter.status  = status;
  if (type)      filter.type    = type;

  // If student role, restrict to own leaves
  if (req.user.role === 'student') {
    // Try User.studentRef first, then Student.userRef fallback
    let stu = req.user.studentRef
      ? await Student.findById(req.user.studentRef)
      : await Student.findOne({ userRef: req.user._id });
    if (!stu) return res.json([]); // no student linked → empty list
    filter.student = stu._id;
  }

  const leaves = await Leave.find(filter)
    .populate('student', 'name regNo class')
    .populate('approvedBy', 'name')
    .populate('subjects', 'name code')
    .sort({ createdAt: -1 });
  res.json(leaves);
});

// GET single leave
router.get('/:id', protect, async (req, res) => {
  const leave = await Leave.findById(req.params.id)
    .populate('student', 'name regNo class parent')
    .populate('approvedBy', 'name')
    .populate('subjects', 'name code');
  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  res.json(leave);
});

// POST apply for leave (student/admin)
router.post('/', protect, async (req, res) => {
  try {
    let studentId = req.body.student;
    if (req.user.role === 'student' && !studentId) {
      // Try User.studentRef first, then Student.userRef fallback
      let stu = req.user.studentRef
        ? await Student.findById(req.user.studentRef)
        : await Student.findOne({ userRef: req.user._id });
      if (!stu) return res.status(403).json({ message: 'Student record not found. Ask admin to link your account.' });
      studentId = stu._id;
    }
    const leave = await Leave.create({ ...req.body, student: studentId });
    res.status(201).json(leave);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// PUT approve/reject (faculty/admin only)
router.put('/:id/review', protect, authorize('admin', 'teacher'), async (req, res) => {
  const { status, approverNote } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(status))
    return res.status(400).json({ message: 'Status must be APPROVED or REJECTED' });

  const leave = await Leave.findById(req.params.id).populate('student');
  if (!leave) return res.status(404).json({ message: 'Leave not found' });

  leave.status       = status;
  leave.approvedBy   = req.user._id;
  leave.approverNote = approverNote || '';
  leave.approvedAt   = new Date();
  await leave.save();

  // If APPROVED — update attendance records for that date range to 'L' (Leave)
  if (status === 'APPROVED') {
    const dates = [];
    const cur = new Date(leave.fromDate);
    const end = new Date(leave.toDate);
    while (cur <= end) {
      dates.push(cur.toISOString().substring(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    // Update existing 'A' records to 'L' for the student on those dates
    await Attendance.updateMany(
      { studentRef: leave.student._id, date: { $in: dates }, status: 'A' },
      { status: 'L' }
    );
  }

  res.json(leave);
});

// DELETE withdraw leave (student only, if still PENDING)
router.delete('/:id', protect, async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  if (leave.status !== 'PENDING')
    return res.status(400).json({ message: 'Cannot withdraw a reviewed leave' });
  await Leave.findByIdAndDelete(req.params.id);
  res.json({ message: 'Leave withdrawn' });
});

module.exports = router;
