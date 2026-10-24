const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, default: null },
  status: { 
    type: String, 
    enum: ['present', 'late', 'half_day', 'absent', 'missing_checkout'],
    default: 'present' 
  },
  workHours: { type: Number, default: 0 },
  source: { type: String, enum: ['web', 'camera'], default: 'web' },
  correctionRequested: { type: Boolean, default: false },
  correctionReason: { type: String, default: '' }
}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('Attendance', attendanceSchema);