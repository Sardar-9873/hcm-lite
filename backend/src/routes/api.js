const express = require('express');
const router = express.Router();
const { authGuard, roleGuard } = require('../middleware/auth');
const auth = require('../controllers/authController');
const attendance = require('../controllers/attendanceController');
const leave = require('../controllers/leaveController');
const payroll = require('../controllers/payrollController');
const ai = require('../controllers/aiController');
const AuditLog = require('../models/AuditLog');

// M1: Setup & Auth
router.get('/setup/first-run', auth.checkFirstRun);
router.post('/setup/first-run', auth.firstRunSetup);
router.post('/auth/login', auth.login);
router.post('/auth/change-password', authGuard, auth.changePassword);

// M4: Attendance
router.post('/attendance/check-in', authGuard, attendance.checkIn);
router.post('/attendance/check-out', authGuard, attendance.checkOut);
router.get('/attendance/board', authGuard, roleGuard(['Admin', 'HR']), attendance.getDailyBoard);

// M5: Leave
router.post('/leave/apply', authGuard, leave.applyLeave);
router.patch('/leave/:id/decision', authGuard, roleGuard(['HR']), leave.approveOrReject);

// M6: Payroll
router.post('/payroll/draft', authGuard, roleGuard(['HR']), payroll.createMonthlyDraft);
router.patch('/payroll/:id/finalize', authGuard, roleGuard(['Admin']), payroll.finalizePayroll);
router.get('/payroll/payslip/:payslipId/pdf', authGuard, payroll.downloadPayslipPDF);

// M8: AI Assistant
router.post('/ai/chat', authGuard, ai.chat);
router.post('/ai/smart-leave', authGuard, ai.smartLeaveExtract);

// M9: Audit Logs
router.get('/audit/logs', authGuard, roleGuard(['Admin']), async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
  res.json(logs);
});

module.exports = router;