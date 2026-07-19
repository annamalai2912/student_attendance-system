// backend/models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  regNo:      { type: String, required: true, unique: true, trim: true },
  name:       { type: String, required: true, trim: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  class:      { type: String, required: true },
  batch:      { type: String, required: true },
  section:    { type: String, default: 'A' },
  gender:     { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
  dob:        { type: Date },
  userRef:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // student portal login
  parent: {
    name:          { type: String, required: true },
    phone:         { type: String, required: true },
    email:         { type: String, required: true },
    preferredLang: { type: String, enum: ['en', 'ta', 'te'], default: 'en' },
    fcmToken:      { type: String, default: '' },
    whatsappOptIn: { type: Boolean, default: false },
    emailOptIn:    { type: Boolean, default: true },
    smsOptIn:      { type: Boolean, default: true },
    pushOptIn:     { type: Boolean, default: true },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
