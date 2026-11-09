
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const PayrollRun = require('../models/PayrollRun');
const AuditLog = require('../models/AuditLog');

exports.getAdminDashboard = async (req, res) => {
  try {
    const [
      totalEmployees,
      activeEmployees,
      exitedEmployees,
      averageSalary,
      todayAttendance,
      pendingLeaves,
      latestPayroll,
      recentActivity
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: { $in: ['active', 'probation'] } }),
      Employee.countDocuments({ status: 'exited' }),
      Employee.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, average: { $avg: '$basicSalary' } } }
      ]),
      Attendance.countDocuments({
        date: new Date().toLocaleDateString('en-CA', {
          timeZone: 'Asia/Karachi'
        })
      }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      PayrollRun.findOne({ status: 'finalized' })
        .sort({ month: -1 })
        .lean(),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    const attritionRate = totalEmployees > 0
      ? Number(((exitedEmployees / totalEmployees) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      stats: {
        headcount: activeEmployees,
        totalEmployees,
        payrollCost: latestPayroll?.totalGross || 0,
        attritionRate,
        avgSalary: Math.round(averageSalary[0]?.average || 0),
        todayAttendance,
        pendingLeaves
      },
      latestPayroll,
      recentActivity
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({
      error: 'Failed to fetch admin dashboard data'
    });
  }
};
