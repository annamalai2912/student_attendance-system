// backend/routes/dashboard.js
const express    = require('express');
const Student    = require('../models/Student');
const Attendance = require('../models/Attendance');
const Fee        = require('../models/Fee');
const Alert      = require('../models/Alert');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET admin dashboard KPIs
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  const [totalStudents, totalActive, fees, allAttendance, recentAlerts] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ isActive: true }),
    Fee.find({}),
    Attendance.find({}),
    Alert.find({}).sort({ sentAt: -1 }).limit(10).populate('studentRef', 'name regNo'),
  ]);
  const totalDue   = fees.reduce((s, f) => s + (f.balance || 0), 0);
  const totalPaid  = fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
  const totalFeeAmount = fees.reduce((s, f) => s + (f.totalAmount || 0), 0);
  const present    = allAttendance.filter(a => a.status === 'P').length;
  const total      = allAttendance.length;
  const avgAttendance = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';

  res.json({
    totalStudents,
    totalActive,
    avgAttendance,
    totalDue,
    totalPaid,
    totalFeeAmount,
    feeCollectionRate: totalFeeAmount > 0 ? ((totalPaid / totalFeeAmount) * 100).toFixed(1) : '0.0',
    recentAlerts,
  });
});

// GET teacher dashboard — students below threshold in teacher's class
router.get('/teacher', protect, authorize('admin', 'teacher'), async (req, res) => {
  const cls       = req.user.assignedClass || req.query.class;
  const threshold = parseFloat(process.env.ATTENDANCE_THRESHOLD || 75);
  const students  = await Student.find({ class: cls, isActive: true });
  const result    = [];
  for (const s of students) {
    const records = await Attendance.find({ studentRef: s._id });
    const total   = records.length;
    const present = records.filter(r => r.status === 'P').length;
    const pct     = total > 0 ? (present / total) * 100 : 0;
    result.push({ student: s, total, present, percentage: pct.toFixed(1), belowThreshold: pct < threshold });
  }
  res.json(result);
});

// GET parent dashboard — single student's stats
router.get('/parent/:studentId', protect, async (req, res) => {
  const [student, attendance, fees, alerts] = await Promise.all([
    Student.findById(req.params.studentId),
    Attendance.find({ studentRef: req.params.studentId }),
    Fee.find({ studentRef: req.params.studentId }),
    Alert.find({ studentRef: req.params.studentId }).sort({ sentAt: -1 }).limit(10),
  ]);
  const total    = attendance.length;
  const present  = attendance.filter(a => a.status === 'P').length;
  const pct      = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
  const pendingFees = fees.filter(f => !f.paidStatus);
  res.json({ student, attendance: { total, present, percentage: pct }, pendingFees, recentAlerts: alerts });
});

module.exports = router;
