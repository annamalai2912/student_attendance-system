// backend/routes/academicYears.js
const express      = require('express');
const AcademicYear = require('../models/AcademicYear');
const Semester     = require('../models/Semester');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET all years with their semesters
router.get('/', protect, async (req, res) => {
  const years = await AcademicYear.find().sort({ startDate: -1 });
  const semesters = await Semester.find().populate('academicYear', 'label');
  const result = years.map(y => ({
    ...y.toObject(),
    semesters: semesters.filter(s => String(s.academicYear._id) === String(y._id)),
  }));
  res.json(result);
});

// GET active year
router.get('/active', protect, async (req, res) => {
  const year = await AcademicYear.findOne({ isActive: true });
  if (!year) return res.status(404).json({ message: 'No active academic year' });
  const semesters = await Semester.find({ academicYear: year._id });
  res.json({ ...year.toObject(), semesters });
});

// POST create year
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const year = await AcademicYear.create(req.body);
    res.status(201).json(year);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// PUT update year
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // If setting active, deactivate others first
    if (req.body.isActive) {
      await AcademicYear.updateMany({ _id: { $ne: req.params.id } }, { isActive: false });
    }
    const year = await AcademicYear.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(year);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// DELETE
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  await AcademicYear.findByIdAndDelete(req.params.id);
  res.json({ message: 'Academic year deleted' });
});

// ── Semester sub-routes ──────────────────────────────────────────────────────

// GET semesters for a year
router.get('/:yearId/semesters', protect, async (req, res) => {
  const semesters = await Semester.find({ academicYear: req.params.yearId }).sort({ number: 1 });
  res.json(semesters);
});

// POST create semester
router.post('/:yearId/semesters', protect, authorize('admin'), async (req, res) => {
  try {
    const semester = await Semester.create({ ...req.body, academicYear: req.params.yearId });
    res.status(201).json(semester);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// PUT update semester
router.put('/semesters/:semId', protect, authorize('admin'), async (req, res) => {
  try {
    if (req.body.isActive) {
      // Deactivate all other semesters
      await Semester.updateMany({ _id: { $ne: req.params.semId } }, { isActive: false });
    }
    const sem = await Semester.findByIdAndUpdate(req.params.semId, req.body, { new: true });
    res.json(sem);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// DELETE semester
router.delete('/semesters/:semId', protect, authorize('admin'), async (req, res) => {
  await Semester.findByIdAndDelete(req.params.semId);
  res.json({ message: 'Semester deleted' });
});

// GET active semester
router.get('/semesters/active', protect, async (req, res) => {
  const sem = await Semester.findOne({ isActive: true }).populate('academicYear');
  res.json(sem);
});

module.exports = router;
