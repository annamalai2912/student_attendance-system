// backend/routes/attendance.js
const express    = require('express');
const Attendance = require('../models/Attendance');
const Student    = require('../models/Student');
const Subject    = require('../models/Subject');
const Leave      = require('../models/Leave');
const { sendAbsentAlert } = require('../services/notificationService');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// ── Mark attendance (subject-wise bulk) ───────────────────────────────────────
// Body: { date, subjectId, periodNo, semester, records: [{ studentId, status }] }
router.post('/mark', protect, authorize('admin', 'teacher'), async (req, res) => {
  const { date, subjectId, periodNo, semester, records } = req.body;

  const ops = records.map(r => ({
    updateOne: {
      filter: {
        studentRef: r.studentId,
        date,
        subjectRef: subjectId || null,
        periodNo:   periodNo   || null,
      },
      update: {
        $set: {
          studentRef: r.studentId,
          date,
          subjectRef: subjectId || null,
          semester:   semester  || null,
          periodNo:   periodNo  || null,
          subject:    r.subjectName || 'General', // legacy fallback
          status:     r.status,
          markedBy:   req.user._id,
        },
      },
      upsert: true,
    },
  }));
  await Attendance.bulkWrite(ops);

  // Trigger absent alerts async
  const absentIds = records.filter(r => r.status === 'A').map(r => r.studentId);
  if (absentIds.length > 0) {
    const students = await Student.find({ _id: { $in: absentIds } });
    students.forEach(s => sendAbsentAlert(s, date).catch(console.error));
  }
  res.json({ message: `Attendance marked for ${records.length} students` });
});

// ── Roll-call sheet: students + existing status for a subject+period+date ──────
router.get('/class', protect, async (req, res) => {
  const { date, class: cls, subjectId, periodNo } = req.query;
  // Progressive class matching: exact → prefix → contains
  // Handles "ECE-B" finding "ECE" students and vice versa
  let students = await Student.find({ class: cls, isActive: true })
    .select('name regNo section gender').sort({ name: 1 });

  if (students.length === 0) {
    // Prefix match: "ECE-B" → base "ECE", matches students with class starting with ECE
    const baseCls = cls.split(/[-\s]/)[0];
    students = await Student.find({
      class: new RegExp('^' + baseCls, 'i'),
      isActive: true,
    }).select('name regNo section gender').sort({ name: 1 });
  }

  if (students.length === 0) {
    // Contains match: any student whose class contains the base part
    const baseCls = cls.split(/[-\s]/)[0];
    students = await Student.find({
      class: new RegExp(baseCls, 'i'),
      isActive: true,
    }).select('name regNo section gender').sort({ name: 1 });
  }

  const filter = { date };
  if (subjectId) filter.subjectRef = subjectId;
  if (periodNo)  filter.periodNo   = Number(periodNo);
  const existing = await Attendance.find(filter).lean();
  const map = {};
  existing.forEach(a => { map[a.studentRef.toString()] = a.status; });

  // Check approved leaves for these students on this date
  const approvedLeaves = await Leave.find({
    student: { $in: students.map(s => s._id) },
    status:  'APPROVED',
    fromDate: { $lte: new Date(date) },
    toDate:   { $gte: new Date(date) },
  }).lean();
  const onLeave = new Set(approvedLeaves.map(l => l.student.toString()));

  const result = students.map(s => ({
    studentId:   s._id,
    regNo:       s.regNo,
    name:        s.name,
    section:     s.section,
    status:      map[s._id.toString()] || (onLeave.has(s._id.toString()) ? 'L' : null),
    onApprovedLeave: onLeave.has(s._id.toString()),
  }));
  res.json(result);
});

// ── Student attendance records ─────────────────────────────────────────────────
router.get('/student/:studentId', protect, async (req, res) => {
  const { from, to, subjectId, semester } = req.query;
  const filter = { studentRef: req.params.studentId };
  if (from || to)  filter.date = {};
  if (from)        filter.date.$gte = from;
  if (to)          filter.date.$lte = to;
  if (subjectId)   filter.subjectRef = subjectId;
  if (semester)    filter.semester   = semester;
  const records = await Attendance.find(filter)
    .populate('subjectRef', 'name code')
    .sort({ date: -1 });
  res.json(records);
});

// ── Subject-wise attendance summary for a student ─────────────────────────────
router.get('/subject-summary/:studentId', protect, async (req, res) => {
  const { semester } = req.query;
  const filter = { studentRef: req.params.studentId };
  if (semester) filter.semester = semester;

  const records = await Attendance.find(filter).populate('subjectRef', 'name code isLab');

  // Group by subject
  const grouped = {};
  records.forEach(r => {
    const key = r.subjectRef ? r.subjectRef._id.toString() : 'general';
    if (!grouped[key]) {
      grouped[key] = {
        subjectId:   r.subjectRef?._id,
        subjectName: r.subjectRef?.name || 'General',
        subjectCode: r.subjectRef?.code || '-',
        isLab:       r.subjectRef?.isLab || false,
        total: 0, present: 0, absent: 0, leave: 0,
      };
    }
    grouped[key].total++;
    if (r.status === 'P') grouped[key].present++;
    if (r.status === 'A') grouped[key].absent++;
    if (r.status === 'L') grouped[key].leave++;
  });

  const result = Object.values(grouped).map(g => ({
    ...g,
    percentage: g.total > 0 ? +((g.present / g.total) * 100).toFixed(1) : 0,
    isBarred:   g.total > 0 && ((g.present / g.total) * 100) < 75,
  }));

  res.json(result);
});

// ── Overall stats for a student ───────────────────────────────────────────────
router.get('/stats/:studentId', protect, async (req, res) => {
  const records  = await Attendance.find({ studentRef: req.params.studentId });
  const total    = records.length;
  const present  = records.filter(r => r.status === 'P').length;
  const absent   = records.filter(r => r.status === 'A').length;
  const leave    = records.filter(r => r.status === 'L').length;
  const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
  res.json({ total, present, absent, leave, percentage });
});

// ── Class-level summary (analytics / dashboard) ───────────────────────────────
router.get('/summary', protect, async (req, res) => {
  const pipeline = [
    { $group: { _id: '$date', total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } } } },
    { $sort:  { _id: 1 } },
    { $limit: 30 },
  ];
  const data = await Attendance.aggregate(pipeline);
  res.json(data);
});

// ── Barred students list (< 75% in any subject) for a class/semester ──────────
router.get('/barred', protect, async (req, res) => {
  const { class: cls, semester } = req.query;
  const students = await Student.find({ class: cls, isActive: true }).select('name regNo');
  const filter   = { semester };
  const records  = await Attendance.find(filter).lean();

  // Build per-student per-subject map
  const map = {};
  records.forEach(r => {
    const sk = r.studentRef.toString();
    const subk = r.subjectRef ? r.subjectRef.toString() : 'general';
    if (!map[sk]) map[sk] = {};
    if (!map[sk][subk]) map[sk][subk] = { total: 0, present: 0 };
    map[sk][subk].total++;
    if (r.status === 'P') map[sk][subk].present++;
  });

  const barred = students.filter(s => {
    const subjectMap = map[s._id.toString()] || {};
    return Object.values(subjectMap).some(v => v.total > 0 && (v.present / v.total) * 100 < 75);
  });

  res.json(barred);
});

module.exports = router;
