// backend/jobs/alertJob.js
const cron       = require('node-cron');
const Student    = require('../models/Student');
const Attendance = require('../models/Attendance');
const Fee        = require('../models/Fee');
const { sendAttendanceAlert, sendFeeAlert } = require('../services/notificationService');

const THRESHOLD = parseFloat(process.env.ATTENDANCE_THRESHOLD || 75);
const FEE_DAYS  = parseInt(process.env.FEE_ALERT_DAYS_BEFORE || 5, 10);

async function runAttendanceCheck() {
  console.log('⏰ [CRON] Running attendance check...');
  const students = await Student.find({ isActive: true });
  for (const student of students) {
    try {
      const records = await Attendance.find({ studentRef: student._id });
      if (records.length === 0) continue;
      const present    = records.filter(r => r.status === 'P').length;
      const percentage = ((present / records.length) * 100).toFixed(1);
      if (parseFloat(percentage) < THRESHOLD) {
        await sendAttendanceAlert(student, percentage);
        console.log(`  📩 Alert sent to ${student.name} (${percentage}%)`);
      }
    } catch (e) { console.error(`  ❌ Error for ${student.name}:`, e.message); }
  }
  console.log('✅ [CRON] Attendance check complete');
}

async function runFeeCheck() {
  console.log('⏰ [CRON] Running fee check...');
  const fees = await Fee.find({ paidStatus: false }).populate('studentRef');
  const now  = new Date();
  for (const fee of fees) {
    try {
      const student  = fee.studentRef;
      if (!student || !student.isActive) continue;
      const daysLeft = Math.ceil((new Date(fee.dueDate) - now) / 86400000);
      if (daysLeft >= 0 && daysLeft <= FEE_DAYS) {
        await sendFeeAlert(student, fee.balance, fee.dueDate, daysLeft);
        console.log(`  💰 Fee alert sent to ${student.name} (${daysLeft} days left)`);
      }
    } catch (e) { console.error(`  ❌ Fee error:`, e.message); }
  }
  console.log('✅ [CRON] Fee check complete');
}

function startJobs() {
  // Attendance check: every day at 8:00 PM
  cron.schedule('0 20 * * *', runAttendanceCheck, { timezone: 'Asia/Kolkata' });
  // Fee check: every day at 9:00 AM
  cron.schedule('0 9 * * *', runFeeCheck, { timezone: 'Asia/Kolkata' });
  console.log('🕐 Cron jobs scheduled (Attendance: 8PM | Fee: 9AM IST)');
}

module.exports = { startJobs, runAttendanceCheck, runFeeCheck };
