// backend/services/whatsappService.js
// Uses whatsapp-web.js (free, open-source) — no paid API needed
// Set WHATSAPP_ENABLED=true in .env and scan QR code on first run
const i18n = require('../i18n');

let client = null;
let ready  = false;

function initWhatsApp() {
  if (process.env.WHATSAPP_ENABLED !== 'true') return;
  try {
    const { Client, LocalAuth } = require('whatsapp-web.js');
    client = new Client({ authStrategy: new LocalAuth(), puppeteer: { headless: true } });
    client.on('qr', (qr) => {
      console.log('\n📱 WhatsApp QR — scan with your phone:');
      // In production, render this QR code via a one-time /api/whatsapp/qr endpoint
      require('qrcode-terminal').generate(qr, { small: true });
    });
    client.on('ready', () => { ready = true; console.log('✅ WhatsApp client ready'); });
    client.on('disconnected', () => { ready = false; console.log('⚠️ WhatsApp disconnected'); });
    client.initialize();
  } catch (e) {
    console.warn('WhatsApp init skipped:', e.message);
  }
}

async function sendWhatsApp(phone, message) {
  if (!ready || !client) return;
  const chatId = `91${phone}@c.us`; // India +91 — adjust country code if needed
  return client.sendMessage(chatId, message);
}

async function sendAttendanceWhatsApp(parent, studentName, percentage) {
  if (!parent.whatsappOptIn) return;
  const lng     = parent.preferredLang || 'en';
  const message = i18n.t('attendance_warning_body', { lng, name: studentName, percentage });
  return sendWhatsApp(parent.phone, message);
}

async function sendFeeWhatsApp(parent, studentName, balance, dueDate, days) {
  if (!parent.whatsappOptIn) return;
  const lng     = parent.preferredLang || 'en';
  const message = i18n.t('fee_reminder_body', { lng, name: studentName, balance, dueDate, days });
  return sendWhatsApp(parent.phone, message);
}

async function sendAbsentWhatsApp(parent, studentName, date) {
  if (!parent.whatsappOptIn) return;
  const lng     = parent.preferredLang || 'en';
  const message = i18n.t('absent_today_body', { lng, name: studentName, date });
  return sendWhatsApp(parent.phone, message);
}

module.exports = { initWhatsApp, sendAttendanceWhatsApp, sendFeeWhatsApp, sendAbsentWhatsApp };
