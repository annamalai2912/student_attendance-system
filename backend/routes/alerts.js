// backend/routes/alerts.js
const express = require('express');
const Alert   = require('../models/Alert');
const { protect, authorize } = require('../middleware/auth');
const router  = express.Router();

// GET alerts — admin sees all, student sees their own
router.get('/', protect, async (req, res) => {
  const { type, language } = req.query;
  const filter = {};
  if (type)     filter.type     = type;
  if (language) filter.language = language;

  // Students only see alerts for their own record
  if (req.user.role === 'student') {
    const Student = require('../models/Student');
    let student = req.user.studentRef
      ? await Student.findById(req.user.studentRef)
      : await Student.findOne({ userRef: req.user._id });
    if (!student) return res.json([]); // no student linked → empty
    filter.studentRef = student._id;
  }

  const limit = req.user.role === 'student' ? 50 : 200;
  const alerts = await Alert.find(filter)
    .populate('studentRef', 'name regNo class')
    .sort({ sentAt: -1 })
    .limit(limit);
  res.json(alerts);
});

// GET alerts for a student
router.get('/student/:studentId', protect, async (req, res) => {
  const alerts = await Alert.find({ studentRef: req.params.studentId })
    .sort({ sentAt: -1 })
    .limit(50);
  res.json(alerts);
});

// GET alert counts grouped by type
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  const stats = await Alert.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
  res.json(stats);
});

// POST /api/alerts/test-email  — admin only, sends a quick verification email
router.post('/test-email', protect, authorize('admin'), async (req, res) => {
  const nodemailer = require('nodemailer');
  const to = req.body.to || req.user.email;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASS,
    },
  });

  try {
    await transporter.verify();   // check credentials first
    await transporter.sendMail({
      from: `"EduTrack System" <${process.env.GMAIL_USER}>`,
      to,
      subject: '✅ EduTrack — Email Test Successful',
      html: `
        <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
        <body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fb;margin:0;padding:20px">
          <div style="background:#fff;border-radius:12px;padding:30px;max-width:520px;margin:auto;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
            <div style="background:linear-gradient(135deg,#1d4ed8,#0ea5e9);color:#fff;border-radius:8px;padding:18px 24px;margin-bottom:24px">
              <h2 style="margin:0;font-size:18px">📚 EduTrack — Email Verified!</h2>
            </div>
            <p style="font-size:15px;color:#374151;line-height:1.7">
              🎉 <strong>Email notifications are working!</strong><br><br>
              Your Gmail SMTP is configured correctly.<br>
              Parents will now receive alerts for:
            </p>
            <ul style="font-size:14px;color:#374151;line-height:2">
              <li>📌 Student absent notifications (instant)</li>
              <li>📌 Attendance below 75% warnings (8 PM daily)</li>
              <li>📌 Fee due date reminders (9 AM daily)</li>
            </ul>
            <p style="font-size:13px;color:#9ca3af;border-top:1px solid #e5e7eb;margin-top:20px;padding-top:16px;text-align:center">
              EduTrack · Attendance &amp; Fee Management System
            </p>
          </div>
        </body></html>
      `,
    });
    res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/alerts/test-sms  — admin only, sends a test SMS via Twilio
router.post('/test-sms', protect, authorize('admin'), async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ message: 'Provide a "to" phone number' });
  try {
    const smsSvc = require('../services/smsService');
    const result = await smsSvc.sendTestSMS(to);
    if (!result) return res.status(503).json({ message: 'Fast2SMS not configured. Add FAST2SMS_API_KEY to .env' });
    res.json({ success: true, message: `Test SMS sent to ${to}`, sid: result.sid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/alerts/send — admin sends a custom notification to one/multiple students
router.post('/send', protect, authorize('admin', 'teacher'), async (req, res) => {
  const { title, message, studentIds, classFilter, language = 'en', sendEmail = false } = req.body;
  if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });

  const Student = require('../models/Student');
  let targets = [];

  if (studentIds?.length > 0) {
    targets = await Student.find({ _id: { $in: studentIds }, isActive: true });
  } else if (classFilter) {
    targets = await Student.find({ class: new RegExp(classFilter, 'i'), isActive: true });
  } else {
    targets = await Student.find({ isActive: true });
  }

  if (targets.length === 0) return res.status(404).json({ message: 'No students found for selection' });

  // Create alert records
  const alertDocs = targets.map(s => ({
    studentRef: s._id, type: 'CUSTOM_NOTIFICATION',
    title, message, language, channels: sendEmail ? ['email'] : [],
    status: 'SENT', sentBy: req.user._id,
  }));
  const created = await Alert.insertMany(alertDocs);

  // Optional email blast
  if (sendEmail && process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS },
    });
    const emailTargets = targets.filter(s => s.email);
    for (const student of emailTargets) {
      transporter.sendMail({
        from: `"EduTrack" <${process.env.GMAIL_USER}>`,
        to: student.email,
        subject: `📢 ${title} — EduTrack`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
          <div style="background:linear-gradient(135deg,#1d4ed8,#0ea5e9);color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:20px">
            <h2 style="margin:0;font-size:17px">📢 ${title}</h2>
          </div>
          <p style="font-size:15px;line-height:1.7;color:#374151">${message}</p>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
            EduTrack — Sent to ${student.name} (${student.regNo})
          </p></div>`,
      }).catch(console.error);
    }
  }

  res.json({ message: `Notification sent to ${targets.length} student(s)`, count: targets.length, alertIds: created.map(a => a._id) });
});

// DELETE /api/alerts/:id — admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  await Alert.findByIdAndDelete(req.params.id);
  res.json({ message: 'Alert deleted' });
});

module.exports = router;
