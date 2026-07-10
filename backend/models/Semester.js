// backend/models/Semester.js
const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  number:       { type: Number, required: true, min: 1, max: 8 },   // 1-8
  name:         { type: String, required: true, trim: true },        // "Odd Semester 2024"
  startDate:    { type: Date, required: true },
  endDate:      { type: Date, required: true },
  isActive:     { type: Boolean, default: false },
}, { timestamps: true });

// Unique semester per academic year
semesterSchema.index({ academicYear: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Semester', semesterSchema);
