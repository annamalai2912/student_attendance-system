// backend/models/Timetable.js
const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema({
  periodNo:  { type: Number, required: true },                          // 1, 2, 3...
  subject:   { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }, // null = free period/break
  startTime: { type: String, default: '' },                            // "09:00"
  endTime:   { type: String, default: '' },                            // "10:00"
  label:     { type: String, default: '' },                            // "Break" / "Lunch"
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  semester:  { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  class:     { type: String, required: true },
  batch:     { type: String, required: true },
  day:       { type: String, enum: ['MON','TUE','WED','THU','FRI','SAT'], required: true },
  periods:   [periodSchema],
}, { timestamps: true });

timetableSchema.index({ semester: 1, class: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);
