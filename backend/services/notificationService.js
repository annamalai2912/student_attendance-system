// backend/services/notificationService.js
// Orchestrator — calls email + push + whatsapp + SMS and logs to DB
const Alert        = require('../models/Alert');
const emailSvc     = require('./emailService');
const pushSvc      = require('./pushService');
const whatsappSvc  = require('./whatsappService');
const smsSvc       = require('./smsService');

async function logAlert(studentId, type, language, message, channels) {
  try {
    await Alert.create({ studentRef: studentId, type, language, message, channels, status: 'SENT' });
  } catch (e) { console.error('Alert log error:', e.message); }
}

// ── Attendance warning (below 75%) ─────────────────────────────────────────
async function sendAttendanceAlert(student, percentage) {
  const { parent, name, _id } = student;
  const channels = [];
  await Promise.allSettled([
    emailSvc.sendAttendanceAlert(parent, name, percentage).then(() => channels.push('email')),
    pushSvc.sendAttendancePush(parent, name, percentage).then(() => channels.push('push')),
    whatsappSvc.sendAttendanceWhatsApp(parent, name, percentage).then(() => channels.push('whatsapp')),
    smsSvc.sendAttendanceSMS(parent, name, percentage).then(() => channels.push('sms')),
  ]);
  await logAlert(_id, 'ATTENDANCE_WARNING', parent.preferredLang || 'en',
    `Attendance: ${percentage}%`, channels);
}

// ── Fee reminder (N days before due) ──────────────────────────────────────
async function sendFeeAlert(student, balance, dueDate, days) {
  const { parent, name, _id } = student;
  const dueFmt  = new Date(dueDate).toLocaleDateString('en-IN');
  const channels = [];
  await Promise.allSettled([
    emailSvc.sendFeeReminder(parent, name, balance, dueFmt, days).then(() => channels.push('email')),
    pushSvc.sendFeePush(parent, name, balance, days).then(() => channels.push('push')),
    whatsappSvc.sendFeeWhatsApp(parent, name, balance, dueFmt, days).then(() => channels.push('whatsapp')),
    smsSvc.sendFeeSMS(parent, name, balance, dueFmt, days).then(() => channels.push('sms')),
  ]);
  await logAlert(_id, 'FEE_REMINDER', parent.preferredLang || 'en',
    `Fee ₹${balance} due in ${days} day(s)`, channels);
}

// ── Absent today (real-time, triggered on attendance marking) ─────────────
async function sendAbsentAlert(student, date) {
  const { parent, name, _id } = student;
  const channels = [];
  await Promise.allSettled([
    emailSvc.sendAbsentEmail(parent, name, date).then(() => channels.push('email')),
    pushSvc.sendAbsentPush(parent, name, date).then(() => channels.push('push')),
    whatsappSvc.sendAbsentWhatsApp(parent, name, date).then(() => channels.push('whatsapp')),
    smsSvc.sendAbsentSMS(parent, name, date).then(() => channels.push('sms')),
  ]);
  await logAlert(_id, 'ABSENT_TODAY', parent.preferredLang || 'en',
    `Absent on ${date}`, channels);
}

module.exports = { sendAttendanceAlert, sendFeeAlert, sendAbsentAlert };

