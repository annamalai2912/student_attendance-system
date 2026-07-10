// backend/models/AcademicCalendar.js
const mongoose = require('mongoose');

const calendarSchema = new mongoose.Schema({
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  date:        { type: Date, required: true },
  type:        { type: String, enum: ['WORKING', 'HOLIDAY', 'EXAM', 'EVENT', 'HALFDAY'], default: 'HOLIDAY' },
  title:       { type: String, required: true, trim: true },   // "Pongal", "Internal Exam", "Sports Day"
  description: { type: String, default: '' },
  department:  { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null }, // null = all departments
  isRecurring: { type: Boolean, default: false },
}, { timestamps: true });

calendarSchema.index({ academicYear: 1, date: 1 });

module.exports = mongoose.model('AcademicCalendar', calendarSchema);
