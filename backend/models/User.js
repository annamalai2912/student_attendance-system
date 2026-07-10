// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true, minlength: 6 },
  role:       { type: String, enum: ['admin', 'teacher', 'parent', 'student'], default: 'teacher' },
  assignedClass: { type: String, default: '' },
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

// bcryptjs v3+ — use async/await, no callback param
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.set('toJSON', {
  transform: (_, ret) => { delete ret.password; return ret; }
});

module.exports = mongoose.model('User', userSchema);
