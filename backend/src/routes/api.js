const express = require('express');
const router = express.Router();
const { authGuard, roleGuard } = require('../middleware/auth');
const auth = require('../controllers/authController');
const attendance = require('../controllers/attendanceController');
const leave = require('../controllers/leaveController');
const payroll = require('../controllers/payrollController');
const ai = require('../controllers/aiController');
const AuditLog = require('../models/AuditLog');
const employee = require('../controllers/employeeController');
const dashboard = require('../controllers/dashboardController');
const org = require('../controllers/orgController');
const { validate, employeeSchema, orgSettingsSchema } = require('../middleware/validator');

// M1: Setup & Auth
router.get('/setup/first-run', auth.checkFirstRun);
router.post('/setup/first-run', auth.firstRunSetup);
router.post('/auth/login', auth.login);
router.post('/auth/change-password', authGuard, auth.changePassword);

// M2: Employee Management
router.post(
  '/employees',
  authGuard,
  roleGuard(['Admin', 'HR']),
  validate(employeeSchema),
  employee.createEmployee
);

// Admin Dashboard
router.get(
  '/dashboard/admin',
  authGuard,
  roleGuard(['Admin']),
  dashboard.getAdminDashboard
);

// Organization Settings
router.get(
  '/org/settings',
  authGuard,
  roleGuard(['Admin']),
  org.getSettings
);

router.put(
  '/org/settings',
  authGuard,
  roleGuard(['Admin']),
  validate(orgSettingsSchema),
  org.updateSettings
);

// M4: Attendance
router.post('/attendance/check-in', authGuard, attendance.checkIn);
router.post('/attendance/check-out', authGuard, attendance.checkOut);
router.get('/attendance/board', authGuard, roleGuard(['Admin', 'HR']), attendance.getDailyBoard);

// M5: Leave
router.post('/leave/apply', authGuard, leave.applyLeave);
router.patch('/leave/:id/decision', authGuard, roleGuard(['HR']), leave.approveOrReject);

// M6: Payroll
router.post('/payroll/draft', authGuard, roleGuard(['HR']), payroll.createMonthlyDraft);
router.get('/payroll/runs', authGuard, roleGuard(['Admin']), payroll.getPayrollRuns);
router.patch('/payroll/:id/finalize', authGuard, roleGuard(['Admin']), payroll.finalizePayroll);
router.get('/payroll/payslip/:payslipId/pdf', authGuard, payroll.downloadPayslipPDF);

router.get(
  '/payroll/payslips/:month',
  authGuard,
  roleGuard(['Admin', 'HR']),
  async (req, res) => {
    const Payslip = require('../models/Payslip');

    const payslips = await Payslip.find({
      month: req.params.month
    }).populate('employeeId', 'firstName lastName email');

    res.json(payslips);
  }
);

router.get(
  '/payroll/my-payslips',
  authGuard,
  roleGuard(['Employee']),
  async (req, res) => {
    try {
      const Payslip = require('../models/Payslip');

      if (!req.user.employeeId) {
        return res.status(400).json({
          error: 'Employee profile not linked to this account.'
        });
      }

      const payslips = await Payslip.find({
        employeeId: req.user.employeeId
      })
        .select('-__v')
        .sort({ month: -1 });

      return res.status(200).json(payslips);
    } catch (error) {
      console.error('Fetch employee payslips error:', error);

      return res.status(500).json({
        error: 'Failed to fetch your payslips.'
      });
    }
  }
);

// M8: AI Assistant
router.post('/ai/chat', authGuard, ai.chat);
router.post('/ai/smart-leave', authGuard, ai.smartLeaveExtract);

// M9: Audit Logs
router.get('/audit/logs', authGuard, roleGuard(['Admin']), async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
  res.json(logs);
});

module.exports = router;