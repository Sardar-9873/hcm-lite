const LeaveRequest = require('../models/LeaveRequest');
const CompanySettings = require('../models/CompanySettings');
const { logAudit } = require('../utils/audit');

function isWeekend(date, weekendDays) {
  const dayName = date.toLocaleDateString('en-US', {
    weekday: 'long'
  });

  return weekendDays.includes(dayName);
}

function calculateWorkingDays(
  startDateStr,
  endDateStr,
  weekendDays,
  publicHolidays
) {
  let count = 0;
  let cur = new Date(startDateStr);
  const end = new Date(endDateStr);

  const holidayDates = new Set(
    publicHolidays.map(h => h.date)
  );

  while (cur <= end) {
    const curStr = cur.toISOString().split('T')[0];

    if (
      !isWeekend(cur, weekendDays) &&
      !holidayDates.has(curStr)
    ) {
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
    return res.status(400).json({
      error: 'Start date cannot be after end date'
    });
  }

  const overlapping = await LeaveRequest.findOne({
    employeeId,
    status: { $in: ['pending', 'approved'] },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    ]
  });

  if (overlapping) {
    return res.status(422).json({
      error: '422: Overlapping leave request exists'
    });
  }

  const settings = await CompanySettings.findOne();

  const days = calculateWorkingDays(
    startDate,
    endDate,
    settings.weekend,
    settings.publicHolidays
  );

  if (days <= 0) {
    return res.status(400).json({
      error: 'Selected range contains zero working days'
    });
  }

  if (leaveType !== 'unpaid') {
    const approved = await LeaveRequest.aggregate([
      {
        $match: {
          employeeId,
          leaveType,
          status: 'approved'
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$daysCount' }
        }
      }
    ]);

    const alreadyTaken = approved[0]?.totalDays || 0;
    const maxQuota = settings.quotas[leaveType] || 0;

    if (alreadyTaken + days > maxQuota) {
      return res.status(422).json({
        error: `422: Quota exceeded. Available: ${
          maxQuota - alreadyTaken
        }, Requested: ${days}`
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
  try {
    const { id } = req.params;
    const { action, comment } = req.body;

    // 1. Validate action
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action. Only approved or rejected are allowed.'
      });
    }

    // 2. Find leave request
    const leave = await LeaveRequest.findById(id);

    if (!leave) {
      return res.status(404).json({
        error: 'Leave request not found'
      });
    }

    // 3. Prevent reprocessing decided requests
    if (leave.status !== 'pending') {
      return res.status(409).json({
        error: `Leave request is already ${leave.status}`
      });
    }

    const before = leave.toObject();

    // 4. Atomic update: only pending requests can be processed
    const updatedLeave = await LeaveRequest.findOneAndUpdate(
      {
        _id: id,
        status: 'pending'
      },
      {
        $set: {
          status: action,
          comment: comment || '',
          approvedBy: req.user.id
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    // Another request may have processed it simultaneously
    if (!updatedLeave) {
      return res.status(409).json({
        error: 'Leave request has already been processed'
      });
    }

    // 5. Audit log
    await logAudit(
      req.user.email,
      `LEAVE_${action.toUpperCase()}`,
      'LeaveRequest',
      updatedLeave._id,
      before,
      updatedLeave
    );

    return res.json(updatedLeave);

  } catch (error) {
    console.error('Leave approval error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid leave request ID'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to process leave request'
    });
  }
};
