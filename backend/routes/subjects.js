// backend/routes/subjects.js
const express    = require('express');
const Subject    = require('../models/Subject');
const Timetable  = require('../models/Timetable');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET subjects (filter by dept/semester/class/batch/faculty)
router.get('/', protect, async (req, res) => {
  const { department, semester, class: cls, batch, faculty } = req.query;
  const filter = { isActive: true };
  if (department) filter.department = department;
  if (semester)   filter.semester   = Number(semester);
  if (cls)        filter.class      = cls;
  if (batch)      filter.batch      = batch;
  if (faculty)    filter.faculty    = faculty;
  const subjects = await Subject.find(filter)
    .populate('faculty', 'name email')
    .sort({ semester: 1, code: 1 });
  res.json(subjects);
});

// GET subjects for logged-in faculty
router.get('/my-subjects', protect, async (req, res) => {
  const subjects = await Subject.find({ faculty: req.user._id, isActive: true })
    .populate('faculty', 'name email')
    .sort({ semester: 1, code: 1 });
  res.json(subjects);
});

// POST create — admin or teacher
router.post('/', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json(subject);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// PUT update — admin or teacher
router.put('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(subject);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// DELETE — admin or teacher
router.delete('/:id', protect, authorize('admin', 'teacher'), async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  res.json({ message: 'Subject deleted' });
});

// ── Timetable sub-routes ─────────────────────────────────────────────────────

// GET timetable for class/semester
router.get('/timetable', protect, async (req, res) => {
  const { semester, class: cls, batch } = req.query;
  const filter = {};
  if (semester) filter.semester = semester;
  if (cls)      filter.class    = cls;
  if (batch)    filter.batch    = batch;
  const tt = await Timetable.find(filter)
    .populate({ path: 'periods.subject', populate: [{ path: 'faculty', select: 'name' }] })
    .sort({ day: 1 });
  res.json(tt);
});

// POST upsert timetable day
router.post('/timetable', protect, authorize('admin'), async (req, res) => {
  const { semester, class: cls, batch, day, periods } = req.body;
  try {
    const tt = await Timetable.findOneAndUpdate(
      { semester, class: cls, batch, day },
      { periods },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(tt);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

module.exports = router;
