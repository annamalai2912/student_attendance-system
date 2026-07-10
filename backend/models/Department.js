// backend/models/Department.js
const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },  // "Electronics & Communication Engineering"
  code:     { type: String, required: true, unique: true, trim: true, uppercase: true }, // "ECE"
  hod:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
