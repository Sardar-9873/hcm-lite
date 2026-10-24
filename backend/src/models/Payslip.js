// backend/src/models/Payslip.js
const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  payrollRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: String, required: true },
  basic: { type: Number, required: true },
  hra: { type: Number, required: true },
  medical: { type: Number, required: true },
  grossSalary: { type: Number, required: true },
  workingDays: { type: Number, required: true },
  absentDays: { type: Number, default: 0 },
  halfDays: { type: Number, default: 0 },
  unpaidLeaveDays: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  annualTax: { type: Number, default: 0 },
  monthlyTax: { type: Number, default: 0 },
  netSalary: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Payslip', payslipSchema);