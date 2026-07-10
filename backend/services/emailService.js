// backend/services/emailService.js
const nodemailer = require('nodemailer');
const i18n       = require('../i18n');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

const htmlWrap = (body) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 20px; }
  .card { background: #fff; border-radius: 12px; padding: 30px; max-width: 560px; margin: auto;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1d4ed8, #0ea5e9); color: #fff;
            border-radius: 8px; padding: 18px 24px; margin-bottom: 24px; }
  .header h2 { margin: 0; font-size: 18px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: 15px; line-height: 1.7;
        color: #374151; margin: 0; }
  .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;
            font-size: 12px; color: #9ca3af; text-align: center; }
</style></head>
<body>
  <div class="card">
    <div class="header"><h2>📚 Attendance &amp; Fee Management System</h2></div>
    <pre>${body}</pre>
    <div class="footer">This is an automated message. Please do not reply directly to this email.</div>
  </div>
</body></html>`;

async function sendAttendanceAlert(parent, studentName, percentage) {
  if (!parent.emailOptIn) return;
  const lng     = parent.preferredLang || 'en';
  const subject = i18n.t('attendance_warning_subject', { lng, name: studentName });
  const body    = i18n.t('attendance_warning_body',    { lng, name: studentName, percentage });
  return transporter.sendMail({
    from: `"Attendance System" <${process.env.GMAIL_USER}>`,
    to: parent.email,
    subject,
    html: htmlWrap(body),
  });
}

async function sendFeeReminder(parent, studentName, balance, dueDate, days) {
  if (!parent.emailOptIn) return;
  const lng     = parent.preferredLang || 'en';
  const subject = i18n.t('fee_reminder_subject', { lng, name: studentName });
  const body    = i18n.t('fee_reminder_body',    { lng, name: studentName, balance, dueDate, days });
  return transporter.sendMail({
    from: `"Fee System" <${process.env.GMAIL_USER}>`,
    to: parent.email,
    subject,
    html: htmlWrap(body),
  });
}

async function sendAbsentEmail(parent, studentName, date) {
  if (!parent.emailOptIn) return;
  const lng     = parent.preferredLang || 'en';
  const subject = i18n.t('absent_today_subject', { lng, name: studentName });
  const body    = i18n.t('absent_today_body',    { lng, name: studentName, date });
  return transporter.sendMail({
    from: `"Attendance System" <${process.env.GMAIL_USER}>`,
    to: parent.email,
    subject,
    html: htmlWrap(body),
  });
}

module.exports = { sendAttendanceAlert, sendFeeReminder, sendAbsentEmail };
