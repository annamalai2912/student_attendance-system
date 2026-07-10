// backend/models/Subject.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },   // "Digital Signal Processing"
  code:           { type: String, required: true, trim: true },   // "EC401"
  department:     { type: String, required: true, trim: true },   // "ECE" — plain text, no ref needed
  semester:       { type: Number, required: true, min: 1, max: 12 }, // 1–8
  class:          { type: String, required: true },               // "ECE-B"
  batch:          { type: String, default: '' },                  // "2021-2025"
  faculty:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  periodsPerWeek: { type: Number, default: 4 },
  isLab:          { type: Boolean, default: false },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

subjectSchema.index({ department: 1, semester: 1, class: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
