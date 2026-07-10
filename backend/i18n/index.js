// backend/i18n/index.js
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path    = require('path');

i18next.use(Backend).init({
  initImmediate: false,
  fallbackLng: process.env.DEFAULT_LANG || 'en',
  supportedLngs: ['en', 'ta', 'te'],
  backend: {
    loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json'),
  },
  ns: ['notifications'],
  defaultNS: 'notifications',
});

module.exports = i18next;
