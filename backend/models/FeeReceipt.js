// backend/models/FeeReceipt.js
const mongoose = require('mongoose');

// Auto-increment receipt counter
const counterSchema = new mongoose.Schema({ _id: String, seq: Number });
const Counter = mongoose.model('Counter', counterSchema);

const feeReceiptSchema = new mongoose.Schema({
  receiptNo:   { type: String, unique: true },                                          // "REC-2025-0001"
  student:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  fee:         { type: mongoose.Schema.Types.ObjectId, ref: 'Fee', default: null },
  paidAmount:  { type: Number, required: true },
  paidDate:    { type: Date, default: Date.now },
  paymentMode: { type: String, enum: ['CASH', 'ONLINE', 'DD', 'CHEQUE', 'UPI'], default: 'CASH' },
  description: { type: String, default: '' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-generate receipt number before save (Mongoose v7+ — async, no next())
feeReceiptSchema.pre('save', async function () {
  if (this.receiptNo) return;
  const year = new Date().getFullYear();
  const counter = await Counter.findByIdAndUpdate(
    `receipt_${year}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  this.receiptNo = `REC-${year}-${String(counter.seq).padStart(4, '0')}`;
});

module.exports = mongoose.model('FeeReceipt', feeReceiptSchema);
