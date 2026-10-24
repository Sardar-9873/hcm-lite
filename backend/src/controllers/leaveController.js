const LeaveRequest = require('../models/LeaveRequest');
const CompanySettings = require('../models/CompanySettings');
const { logAudit } = require('../utils/audit');

function isWeekend(date, weekendDays) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  return weekendDays.includes(dayName);
}

function calculateWorkingDays(startDateStr, endDateStr, weekendDays, publicHolidays) {
  let count = 0;
  let cur = new Date(startDateStr);
  const end = new Date(endDateStr);
  const holidayDates = new Set(publicHolidays.map(h => h.date));

  while (cur <= end) {
    const curStr = cur.toISOString().split('T')[0];
    if (!isWeekend(cur, weekendDays) && !holidayDates.has(curStr)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

exports.applyLeave = async (req, res) => {
  const employeeId = req.user.employeeId;
  const { leaveType, startDate, endDate, reason } = req.body;

  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ error: 'Start date cannot be after end date' });
  }

  // Check overlap (Over-balance or Overlap = 422)
  const overlapping = await LeaveRequest.findOne({
    employeeId,
    status: { $in: ['pending', 'approved'] },
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  });

  if (overlapping) {
    return res.status(422).json({ error: '422: Overlapping leave request exists' });
  }

  const settings = await CompanySettings.findOne();
  const days = calculateWorkingDays(startDate, endDate, settings.weekend, settings.publicHolidays);

  if (days <= 0) {
    return res.status(400).json({ error: 'Selected range contains zero working days' });
  }

  // Quota check
  if (leaveType !== 'unpaid') {
    const approved = await LeaveRequest.aggregate([
      { $match: { employeeId, leaveType, status: 'approved' } },
      { $group: { _id: null, totalDays: { $sum: '$daysCount' } } }
    ]);
    const alreadyTaken = approved[0]?.totalDays || 0;
    const maxQuota = settings.quotas[leaveType] || 0;

    if (alreadyTaken + days > maxQuota) {
      return res.status(422).json({ 
        error: `422: Quota exceeded. Available: ${maxQuota - alreadyTaken}, Requested: ${days}` 
      });
    }
  }

  const leave = await LeaveRequest.create({
    employeeId,
    leaveType,
    startDate,
    endDate,
    daysCount: days,
    reason
  });

  return res.status(201).json(leave);
};

exports.approveOrReject = async (req, res) => {
  const { id } = req.params;
  const { action, comment } = req.body; // action: 'approved' | 'rejected'

  const leave = await LeaveRequest.findById(id);
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });

  const before = leave.toObject();
  leave.status = action;
  leave.comment = comment || '';
  leave.approvedBy = req.user.id;
  await leave.save();

  await logAudit(req.user.email, `LEAVE_${action.toUpperCase()}`, 'LeaveRequest', leave._id, before, leave);
  return res.json(leave);
};