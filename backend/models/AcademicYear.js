// backend/models/AcademicYear.js
const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  label:     { type: String, required: true, unique: true, trim: true }, // "2024-2025"
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  // Admin-configurable periods per day
  periodsPerDay:   { type: Number, default: 6, min: 1, max: 12 },
  periodDuration:  { type: Number, default: 60 }, // minutes
  isActive:  { type: Boolean, default: false }, // only one active at a time
}, { timestamps: true });

module.exports = mongoose.model('AcademicYear', academicYearSchema);
