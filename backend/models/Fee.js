// backend/models/Fee.js
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  date:          { type: Date, default: Date.now },
  amount:        { type: Number, required: true },
  transactionID: { type: String, default: '' },
  pdfUrl:        { type: String, default: '' },
}, { _id: false });

const feeSchema = new mongoose.Schema({
  studentRef:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  semester:      { type: Number, required: true },
  academicYear:  { type: String, required: true }, // e.g. "2025-2026"
  totalAmount:   { type: Number, required: true },
  paidAmount:    { type: Number, default: 0 },
  balance:       { type: Number },
  dueDate:       { type: Date, required: true },
  paidStatus:    { type: Boolean, default: false },
  receipts:      [receiptSchema],
  alertSent:     { type: Boolean, default: false },
}, { timestamps: true });

// Mongoose 9 + express-async-errors: do NOT use next() in pre hooks
feeSchema.pre('save', function () {
  this.balance = this.totalAmount - this.paidAmount;
  if (this.balance <= 0) this.paidStatus = true;
});

module.exports = mongoose.model('Fee', feeSchema);
