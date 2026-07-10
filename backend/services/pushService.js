// backend/services/pushService.js
const i18n = require('../i18n');
let admin;

function getAdmin() {
  if (!admin && process.env.FIREBASE_PROJECT_ID) {
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
  }
  return admin;
}

async function sendPush(token, title, body) {
  const adm = getAdmin();
  if (!adm || !token) return;
  return adm.messaging().send({
    token,
    notification: { title, body },
    webpush: { notification: { icon: '/logo192.png', badge: '/badge.png' } },
  });
}

async function sendAttendancePush(parent, studentName, percentage) {
  if (!parent.pushOptIn || !parent.fcmToken) return;
  const lng   = parent.preferredLang || 'en';
  const title = i18n.t('attendance_push_title', { lng });
  const body  = i18n.t('attendance_push_body',  { lng, name: studentName, percentage });
  return sendPush(parent.fcmToken, title, body);
}

async function sendFeePush(parent, studentName, balance, days) {
  if (!parent.pushOptIn || !parent.fcmToken) return;
  const lng   = parent.preferredLang || 'en';
  const title = i18n.t('fee_push_title', { lng });
  const body  = i18n.t('fee_push_body',  { lng, name: studentName, balance, days });
  return sendPush(parent.fcmToken, title, body);
}

async function sendAbsentPush(parent, studentName, date) {
  if (!parent.pushOptIn || !parent.fcmToken) return;
  const lng   = parent.preferredLang || 'en';
  const title = i18n.t('absent_push_title', { lng });
  const body  = i18n.t('absent_push_body',  { lng, name: studentName, date });
  return sendPush(parent.fcmToken, title, body);
}

module.exports = { sendAttendancePush, sendFeePush, sendAbsentPush };
