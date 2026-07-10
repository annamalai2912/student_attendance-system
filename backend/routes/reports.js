// backend/routes/reports.js  — PDF & Excel attendance reports
const express    = require('express');
const PDFDocument = require('pdfkit');
const XLSX       = require('xlsx');
const Attendance = require('../models/Attendance');
const Student    = require('../models/Student');
const Subject    = require('../models/Subject');
const FeeReceipt = require('../models/FeeReceipt');
const Fee        = require('../models/Fee');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// ── Helper: build attendance matrix ──────────────────────────────────────────
async function buildMatrix(cls, semester, from, to) {
  const students = await Student.find({ class: cls, isActive: true }).sort({ name: 1 });
  const subjects = await Subject.find({ class: cls, semester }).sort({ code: 1 });

  // Collect all working dates in range
  const allDates = [];
  const cur = new Date(from);
  while (cur <= new Date(to)) {
    if (cur.getDay() !== 0) allDates.push(cur.toISOString().substring(0, 10)); // exclude Sundays
    cur.setDate(cur.getDate() + 1);
  }

  // Fetch all records
  const records = await Attendance.find({
    studentRef: { $in: students.map(s => s._id) },
    date: { $gte: from, $lte: to },
    semester,
  }).lean();

  const map = {};
  records.forEach(r => {
    const sk = r.studentRef.toString();
    const subk = r.subjectRef ? r.subjectRef.toString() : 'general';
    const dk = r.date;
    if (!map[sk]) map[sk] = {};
    if (!map[sk][subk]) map[sk][subk] = {};
    map[sk][subk][dk] = r.status;
  });

  return { students, subjects, allDates, map };
}

// ── GET attendance PDF (monthly register) ────────────────────────────────────
router.get('/attendance/pdf', protect, async (req, res) => {
  const { class: cls, semester, from, to, subjectId } = req.query;
  if (!cls || !from || !to) return res.status(400).json({ message: 'class, from, to required' });

  const students = await Student.find({ class: cls, isActive: true }).sort({ name: 1 });
  const filter = { studentRef: { $in: students.map(s => s._id) }, date: { $gte: from, $lte: to } };
  if (semester)  filter.semester   = semester;
  if (subjectId) filter.subjectRef = subjectId;
  const records = await Attendance.find(filter).lean();

  // Get date range
  const dates = [];
  const cur = new Date(from);
  while (cur <= new Date(to)) {
    if (cur.getDay() !== 0) dates.push(cur.toISOString().substring(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  // Build lookup: studentId → date → status
  const map = {};
  records.forEach(r => {
    const sk = r.studentRef.toString();
    if (!map[sk]) map[sk] = {};
    map[sk][r.date] = r.status;
  });

  // PDF generation
  const doc = new PDFDocument({ margin: 30, size: 'A3', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="attendance_${cls}_${from}.pdf"`);
  doc.pipe(res);

  // Title
  doc.fontSize(16).font('Helvetica-Bold').text(`Attendance Register — ${cls}`, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Period: ${from} to ${to}`, { align: 'center' });
  doc.moveDown(0.5);

  // Table header
  const colW = 18;
  const nameW = 150;
  const regW = 60;
  let x = 30, y = doc.y;

  doc.fontSize(7).font('Helvetica-Bold');
  doc.rect(x, y, regW, 20).stroke();
  doc.text('Reg No', x + 2, y + 6, { width: regW - 4 });
  x += regW;
  doc.rect(x, y, nameW, 20).stroke();
  doc.text('Student Name', x + 2, y + 6, { width: nameW - 4 });
  x += nameW;

  dates.forEach(d => {
    const day = d.substring(8); // "15"
    doc.rect(x, y, colW, 20).stroke();
    doc.text(day, x + 2, y + 6, { width: colW - 4, align: 'center' });
    x += colW;
  });

  // P% column
  doc.rect(x, y, 35, 20).stroke();
  doc.text('%', x + 2, y + 6, { width: 31, align: 'center' });
  y += 20;

  // Rows
  doc.font('Helvetica').fontSize(7);
  students.forEach(s => {
    x = 30;
    const statusMap = map[s._id.toString()] || {};
    let present = 0;
    dates.forEach(d => { if (statusMap[d] === 'P') present++; });
    const pct = dates.length > 0 ? ((present / dates.length) * 100).toFixed(0) : '-';
    const isLow = Number(pct) < 75;

    if (isLow) doc.fillColor('#fff0f0').rect(x, y, nameW + regW + colW * dates.length + 35, 16).fill();
    doc.fillColor('black');

    doc.rect(x, y, regW, 16).stroke();
    doc.text(s.regNo, x + 2, y + 4, { width: regW - 4 });
    x += regW;
    doc.rect(x, y, nameW, 16).stroke();
    doc.text(s.name, x + 2, y + 4, { width: nameW - 4 });
    x += nameW;

    dates.forEach(d => {
      const st = statusMap[d] || '-';
      const color = st === 'P' ? '#166534' : st === 'A' ? '#991b1b' : '#92400e';
      doc.rect(x, y, colW, 16).stroke();
      doc.fillColor(color).text(st, x + 2, y + 4, { width: colW - 4, align: 'center' });
      doc.fillColor('black');
      x += colW;
    });

    doc.rect(x, y, 35, 16).stroke();
    doc.fillColor(isLow ? 'red' : 'black').text(`${pct}%`, x + 2, y + 4, { width: 31, align: 'center' });
    doc.fillColor('black');
    y += 16;

    if (y > doc.page.height - 60) { doc.addPage(); y = 30; }
  });

  doc.end();
});

// ── GET attendance Excel export ───────────────────────────────────────────────
router.get('/attendance/excel', protect, async (req, res) => {
  const { class: cls, semester, from, to } = req.query;
  const students = await Student.find({ class: cls, isActive: true }).sort({ name: 1 });
  const filter = { studentRef: { $in: students.map(s => s._id) }, date: { $gte: from, $lte: to } };
  if (semester) filter.semester = semester;
  const records = await Attendance.find(filter).lean();

  const dates = [];
  const cur = new Date(from);
  while (cur <= new Date(to)) {
    if (cur.getDay() !== 0) dates.push(cur.toISOString().substring(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  const map = {};
  records.forEach(r => {
    const sk = r.studentRef.toString();
    if (!map[sk]) map[sk] = {};
    map[sk][r.date] = r.status;
  });

  const rows = students.map((s, i) => {
    const sm = map[s._id.toString()] || {};
    const present = dates.filter(d => sm[d] === 'P').length;
    const row = {
      'S.No': i + 1, 'Reg No': s.regNo, 'Name': s.name,
    };
    dates.forEach(d => { row[d.substring(5)] = sm[d] || '-'; }); // MM-DD
    row['Present'] = present;
    row['Total']   = dates.length;
    row['%']       = dates.length > 0 ? ((present / dates.length) * 100).toFixed(1) : '0';
    return row;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="attendance_${cls}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ── POST generate fee receipt ─────────────────────────────────────────────────
router.post('/fee-receipt', protect, authorize('admin'), async (req, res) => {
  try {
    const receipt = await FeeReceipt.create({ ...req.body, generatedBy: req.user._id });
    res.status(201).json(receipt);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── GET fee receipt PDF ───────────────────────────────────────────────────────
router.get('/fee-receipt/:id/pdf', protect, async (req, res) => {
  const receipt = await FeeReceipt.findById(req.params.id)
    .populate('student', 'name regNo class batch')
    .populate('generatedBy', 'name');
  if (!receipt) return res.status(404).json({ message: 'Receipt not found' });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNo}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('EduTrack College', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Fee Payment Receipt', { align: 'center' });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  // Receipt details
  const row = (label, value) => {
    doc.font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(value || '-');
  };
  row('Receipt No', receipt.receiptNo);
  row('Date', new Date(receipt.paidDate).toLocaleDateString('en-IN'));
  doc.moveDown(0.5);
  row('Student Name', receipt.student?.name);
  row('Reg No', receipt.student?.regNo);
  row('Class', receipt.student?.class);
  doc.moveDown(0.5);
  row('Amount Paid', `₹${receipt.paidAmount.toLocaleString('en-IN')}`);
  row('Payment Mode', receipt.paymentMode);
  row('Description', receipt.description);
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').text(`Generated by: ${receipt.generatedBy?.name || 'System'}`, { align: 'right' });
  doc.text('This is a computer-generated receipt.', { align: 'center' });
  doc.end();
});

// ── GET all fee receipts for a student ───────────────────────────────────────
router.get('/fee-receipts/:studentId', protect, async (req, res) => {
  const receipts = await FeeReceipt.find({ student: req.params.studentId })
    .populate('generatedBy', 'name').sort({ createdAt: -1 });
  res.json(receipts);
});

module.exports = router;
