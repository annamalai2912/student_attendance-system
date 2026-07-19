// backend/services/smsService.js
// Fast2SMS — Free Indian SMS gateway (no "from" number needed)
// Sign up free at https://www.fast2sms.com → Dashboard → Dev API → API Key
const axios = require('axios');
const i18n  = require('../i18n');

function isEnabled() {
  const key = process.env.FAST2SMS_API_KEY;
  return key && key !== 'your_fast2sms_api_key';
}

// Format phone — strip country code, keep 10 digits
function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits.slice(2);
  if (digits.length === 10) return digits;
  return null;
}

async function sendSMS(to, message) {
  if (!isEnabled()) return null;

  const phone = formatPhone(to);
  if (!phone) {
    console.error('Fast2SMS: invalid phone number →', to);
    return null;
  }

  try {
    const response = await axios.get(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        params: {
          authorization: process.env.FAST2SMS_API_KEY,
          route:         'q',        // Fast2SMS Quick SMS route (correct for dev API)
          message,
          language:      'english',
          flash:         0,
          numbers:       phone,
        },
        timeout: 10000,
      }
    );
    // Print full response so we can see exactly what Fast2SMS returned
    console.log('Fast2SMS status:', response.status);
    console.log('Fast2SMS response:', JSON.stringify(response.data));
    return response.data;
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('Fast2SMS HTTP status:', err.response?.status);
    console.error('Fast2SMS error:', JSON.stringify(detail));
    throw new Error(typeof detail === 'object' ? JSON.stringify(detail) : detail);
  }
}


// ── Absent today ──────────────────────────────────────────────────────────────
async function sendAbsentSMS(parent, studentName, date) {
  if (parent.smsOptIn === false || !parent.phone) return;
  const lng  = parent.preferredLang || 'en';
  const body = i18n.t('absent_today_body', { lng, name: studentName, date });
  return sendSMS(parent.phone, body);
}

// ── Attendance warning ────────────────────────────────────────────────────────
async function sendAttendanceSMS(parent, studentName, percentage) {
  if (parent.smsOptIn === false || !parent.phone) return;
  const lng  = parent.preferredLang || 'en';
  const body = i18n.t('attendance_warning_body', { lng, name: studentName, percentage });
  return sendSMS(parent.phone, body);
}

// ── Fee reminder ──────────────────────────────────────────────────────────────
async function sendFeeSMS(parent, studentName, balance, dueDate, days) {
  if (parent.smsOptIn === false || !parent.phone) return;
  const lng  = parent.preferredLang || 'en';
  const body = i18n.t('fee_reminder_body', { lng, name: studentName, balance, dueDate, days });
  return sendSMS(parent.phone, body);
}

// ── Test SMS (admin tool) ─────────────────────────────────────────────────────
async function sendTestSMS(to) {
  if (!isEnabled()) throw new Error('Fast2SMS not configured. Add FAST2SMS_API_KEY to .env');
  return sendSMS(to,
    'EduTrack SMS Test: Your SMS integration is working! ' +
    'Parents will receive attendance & fee alerts via SMS.'
  );
}

module.exports = { sendAbsentSMS, sendAttendanceSMS, sendFeeSMS, sendTestSMS };
