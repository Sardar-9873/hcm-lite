const Attendance = require('../models/Attendance');
const CompanySettings = require('../models/CompanySettings');
const { calculateDistanceInMeters } = require('../utils/haversine');
const { logAudit } = require('../utils/audit');

exports.checkIn = async (req, res) => {
  const employeeId = req.user.employeeId;
  if (!employeeId) return res.status(400).json({ error: 'No employee record linked to user' });

  const todayStr = new Date().toISOString().split('T')[0];
  const existing = await Attendance.findOne({ employeeId, date: todayStr });
  if (existing) {
    return res.status(409).json({ error: 'Conflict: Attendance already checked in for today' });
  }

  const settings = await CompanySettings.findOne();
  const { lat, lng, source } = req.body;

  if (source === 'camera') {
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Location coordinates required for camera check-in' });
    }
    const distance = calculateDistanceInMeters(lat, lng, settings.officeLocation.lat, settings.officeLocation.lng);
    if (distance > settings.officeLocation.radiusMeters) {
      return res.status(400).json({ error: `Outside office geofence radius. Distance: ${Math.round(distance)}m` });
    }
  }

  const now = new Date();
  const [startHour, startMin] = settings.officeStart.split(':').map(Number);
  const cutoffTime = new Date(now);
  cutoffTime.setHours(startHour, startMin + settings.graceMinutes, 0, 0);

  let initialStatus = now > cutoffTime ? 'late' : 'present';

  const record = await Attendance.create({
    employeeId,
    date: todayStr,
    checkIn: now,
    status: initialStatus,
    source: source || 'web'
  });

  return res.status(201).json(record);
};

exports.checkOut = async (req, res) => {
  const employeeId = req.user.employeeId;
  const todayStr = new Date().toISOString().split('T')[0];

  const record = await Attendance.findOne({ employeeId, date: todayStr });
  if (!record) return res.status(404).json({ error: 'No active check-in found for today' });

  const now = new Date();
  const workHours = (now - new Date(record.checkIn)) / (1000 * 60 * 60);

  const settings = await CompanySettings.findOne();
  let status = record.status;
  if (workHours < settings.halfDayUnderHours) {
    status = 'half_day';
  }

  record.checkOut = now;
  record.workHours = Number(workHours.toFixed(2));
  record.status = status;
  await record.save();

  return res.json(record);
};

exports.getDailyBoard = async (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  const records = await Attendance.find({ date: targetDate }).populate('employeeId');
  return res.json(records);
};