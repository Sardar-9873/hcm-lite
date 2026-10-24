// backend/src/models/PayrollRun.js
const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema({
  month: { type: String, required: true, unique: true }, // YYYY-MM
  status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  finalizedAt: { type: Date, default: null },
  totalGross: { type: Number, default: 0 },
  totalNet: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);