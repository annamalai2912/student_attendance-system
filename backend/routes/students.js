// backend/routes/students.js
const express = require('express');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET all students (with optional userRef filter for student portal)
router.get('/', protect, async (req, res) => {
  const { class: cls, batch, isActive, userRef } = req.query;
  const filter = {};
  if (cls)     filter.class   = cls;
  if (batch)   filter.batch   = batch;
  if (userRef) filter.userRef = userRef;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  const students = await Student.find(filter).populate('department', 'name code').sort({ name: 1 });
  res.json(students);
});

// GET /me — returns the student record linked to the logged-in user
router.get('/me', protect, async (req, res) => {
  // Prefer studentRef on the user document
  const id = req.user.studentRef;
  let student;
  if (id) {
    student = await Student.findById(id).populate('department', 'name code');
  } else {
    student = await Student.findOne({ userRef: req.user._id }).populate('department', 'name code');
  }
  if (!student) return res.status(404).json({ message: 'No student profile linked to your account. Ask admin to link your account.' });
  res.json(student);
});

// GET /meta/classes — distinct class values (for dropdowns/autocomplete)
router.get('/meta/classes', protect, async (req, res) => {
  const classes = await Student.distinct('class', { isActive: true });
  res.json(classes.filter(Boolean).sort());
});

// GET /meta/batches — distinct batch values
router.get('/meta/batches', protect, async (req, res) => {
  const batches = await Student.distinct('batch', { isActive: true });
  res.json(batches.filter(Boolean).sort());
});

// GET single student
router.get('/:id', protect, async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  res.json(student);
});

// POST create student (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  const student = await Student.create(req.body);
  res.status(201).json(student);
});

// PUT update student
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  res.json(student);
});

// PUT update FCM token (parent self-service)
router.put('/:id/fcm-token', protect, async (req, res) => {
  const { fcmToken } = req.body;
  const student = await Student.findByIdAndUpdate(
    req.params.id,
    { 'parent.fcmToken': fcmToken },
    { new: true }
  );
  res.json({ success: true, student });
});

// GET unique classes list
router.get('/meta/classes', protect, async (req, res) => {
  const classes = await Student.distinct('class');
  res.json(classes);
});

// GET sample Excel template
router.get('/meta/template', protect, authorize('admin'), (req, res) => {
  const XLSX = require('xlsx');
  const sample = [
    {
      'Reg No':        '21ECE001',
      'Student Name':  'Arjun Kumar',
      'Class':         'ECE-B',
      'Batch':         '2021-2025',
      'Section':       'B',
      'Gender':        'Male',
      'DOB (YYYY-MM-DD)': '2003-05-15',
      'Parent Name':   'Ramesh Kumar',
      'Parent Phone':  '9876543210',
      'Parent Email':  'ramesh@gmail.com',
      'Language':      'en',
      'Email Alerts':  'yes',
    },
    {
      'Reg No':        '21ECE002',
      'Student Name':  'Priya Sharma',
      'Class':         'ECE-B',
      'Batch':         '2021-2025',
      'Section':       'B',
      'Gender':        'Female',
      'DOB (YYYY-MM-DD)': '2003-08-22',
      'Parent Name':   'Suresh Sharma',
      'Parent Phone':  '9123456789',
      'Parent Email':  'suresh@gmail.com',
      'Language':      'ta',
      'Email Alerts':  'yes',
    },
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sample);
  // Column widths
  ws['!cols'] = [
    {wch:10},{wch:20},{wch:10},{wch:14},{wch:9},{wch:8},
    {wch:18},{wch:20},{wch:14},{wch:24},{wch:9},{wch:13},
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// POST /api/students/bulk-import — upload .xlsx or .csv
router.post('/bulk-import', protect, authorize('admin'), (req, res) => {
  const multer = require('multer');
  const XLSX   = require('xlsx');

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_, file, cb) => {
      const ok = /xlsx|xls|csv/.test(file.mimetype) ||
                 /\.(xlsx|xls|csv)$/.test(file.originalname);
      cb(ok ? null : new Error('Only .xlsx, .xls, .csv files allowed'), ok);
    },
  }).single('file');

  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
      // Parse workbook
      const wb   = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) return res.status(400).json({ message: 'File is empty' });

      const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Excel row (1-indexed + header)

        const regNo = String(row['Reg No'] || row['reg_no'] || row['RegNo'] || '').trim();
        const name  = String(row['Student Name'] || row['name'] || '').trim();
        const cls   = String(row['Class'] || row['class'] || '').trim();
        const batch = String(row['Batch'] || row['batch'] || '').trim();
        const parentPhone = String(row['Parent Phone'] || row['parent_phone'] || '').trim();
        const parentEmail = String(row['Parent Email'] || row['parent_email'] || '').trim();
        const parentName  = String(row['Parent Name'] || row['parent_name'] || '').trim();

        // Validate required fields
        if (!regNo || !name || !cls || !batch || !parentPhone || !parentEmail || !parentName) {
          results.errors.push({ row: rowNum, regNo: regNo || '?', reason: 'Missing required fields' });
          results.skipped++;
          continue;
        }

        const lang = String(row['Language'] || 'en').trim().toLowerCase();
        const validLangs = ['en', 'ta', 'te'];

        const studentData = {
          regNo,
          name,
          class:   cls,
          batch,
          section: String(row['Section'] || row['section'] || 'A').trim(),
          gender:  ['Male','Female','Other'].includes(row['Gender']) ? row['Gender'] : 'Male',
          dob:     row['DOB (YYYY-MM-DD)'] ? new Date(row['DOB (YYYY-MM-DD)']) : undefined,
          parent: {
            name:          parentName,
            phone:         parentPhone,
            email:         parentEmail,
            preferredLang: validLangs.includes(lang) ? lang : 'en',
            emailOptIn:    String(row['Email Alerts'] || 'yes').toLowerCase() !== 'no',
          },
          isActive: true,
        };

        try {
          const existing = await Student.findOne({ regNo });
          if (existing) {
            await Student.findByIdAndUpdate(existing._id, studentData, { runValidators: true });
            results.updated++;
          } else {
            await Student.create(studentData);
            results.inserted++;
          }
        } catch (e) {
          results.errors.push({ row: rowNum, regNo, reason: e.message });
          results.skipped++;
        }
      }

      res.json({
        message: `Import complete: ${results.inserted} added, ${results.updated} updated, ${results.skipped} skipped`,
        ...results,
      });
    } catch (e) {
      res.status(500).json({ message: 'Failed to parse file: ' + e.message });
    }
  });
});

// DELETE deactivate
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  await Student.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'Student deactivated' });
});

module.exports = router;
