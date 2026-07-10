// backend/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date:       { type: String, required: true },                                         // "YYYY-MM-DD"
  status:     { type: String, enum: ['P', 'A', 'L'], required: true },                 // Present/Absent/Leave
  markedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── Subject-wise fields (Phase 1 upgrade) ──
  subjectRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null }, // null = legacy day-level
  semester:   { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', default: null },
  periodNo:   { type: Number, default: null },                                          // 1, 2, 3...

  // Legacy field kept for backward compatibility
  subject:    { type: String, default: 'General' },
}, { timestamps: true });

// Unique: one record per student per subject per period per day
attendanceSchema.index({ studentRef: 1, date: 1, subjectRef: 1, periodNo: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
