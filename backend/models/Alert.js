// backend/models/Alert.js
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type:       { type: String, enum: ['ATTENDANCE_WARNING', 'FEE_REMINDER', 'ABSENT_TODAY', 'CUSTOM_NOTIFICATION'], required: true },
  channels:   [{ type: String, enum: ['email', 'push', 'whatsapp', 'sms'] }],
  language:   { type: String, enum: ['en', 'ta', 'te'], default: 'en' },
  title:      { type: String, default: '' },
  message:    { type: String, default: '' },
  metadata:   { type: mongoose.Schema.Types.Mixed, default: {} },
  status:     { type: String, enum: ['SENT', 'DELIVERED', 'FAILED'], default: 'SENT' },
  sentAt:     { type: Date, default: Date.now },
  sentBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
