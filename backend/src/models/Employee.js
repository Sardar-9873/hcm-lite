const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  joiningDate: { type: Date, required: true },
  leavingDate: { type: Date, default: null },
  basicSalary: { type: Number, required: true },
  status: { type: String, enum: ['active', 'probation', 'exited'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);