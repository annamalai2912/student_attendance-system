// backend/routes/calendar.js
const express          = require('express');
const AcademicCalendar = require('../models/AcademicCalendar');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET events by year (and optional month)
router.get('/', protect, async (req, res) => {
  const { yearId, month, year: yr } = req.query;
  const filter = {};
  if (yearId) filter.academicYear = yearId;
  if (yr && month) {
    const start = new Date(yr, month - 1, 1);
    const end   = new Date(yr, month, 0, 23, 59, 59);
    filter.date = { $gte: start, $lte: end };
  }
  const events = await AcademicCalendar.find(filter).sort({ date: 1 });
  res.json(events);
});

// GET working days count between two dates (for attendance % calc)
router.get('/working-days', protect, async (req, res) => {
  const { yearId, from, to } = req.query;
  if (!from || !to) return res.status(400).json({ message: 'from and to dates required' });

  const holidays = await AcademicCalendar.find({
    academicYear: yearId,
    date: { $gte: new Date(from), $lte: new Date(to) },
    type: { $in: ['HOLIDAY', 'EXAM'] },
  });
  const holidayDates = new Set(holidays.map(h => h.date.toISOString().substring(0, 10)));

  let count = 0;
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const day = cur.getDay(); // 0=Sun, 6=Sat
    const ds  = cur.toISOString().substring(0, 10);
    if (day !== 0 && !holidayDates.has(ds)) count++; // exclude Sundays and holidays
    cur.setDate(cur.getDate() + 1);
  }
  res.json({ count, from, to });
});

// POST create event/holiday
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const event = await AcademicCalendar.create(req.body);
    res.status(201).json(event);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// PUT update event
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const event = await AcademicCalendar.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(event);
});

// DELETE event
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  await AcademicCalendar.findByIdAndDelete(req.params.id);
  res.json({ message: 'Event deleted' });
});

module.exports = router;
