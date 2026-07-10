// backend/models/Leave.js
const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type:         { type: String, enum: ['MEDICAL', 'OD', 'CASUAL'], required: true },
  fromDate:     { type: Date, required: true },
  toDate:       { type: Date, required: true },
  reason:       { type: String, required: true, trim: true },
  documentUrl:  { type: String, default: '' },
  subjects:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }], // affected subjects
  status:       { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approverNote: { type: String, default: '' },
  approvedAt:   { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
