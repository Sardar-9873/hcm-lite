const PayrollRun = require('../models/PayrollRun');
const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const CompanySettings = require('../models/CompanySettings');
const { calculateAnnualTax } = require('../utils/taxCalculator');
const { logAudit } = require('../utils/audit');
const PDFDocument = require('pdfkit');

exports.createMonthlyDraft = async (req, res) => {
  const { month } = req.body; // Format: YYYY-MM
  let run = await PayrollRun.findOne({ month });
  if (run && run.status === 'finalized') {
    return res.status(400).json({ error: 'Payroll run is finalized and locked.' });
  }

  if (!run) {
    run = await PayrollRun.create({ month, status: 'draft' });
  } else {
    await Payslip.deleteMany({ payrollRunId: run._id });
  }

  const settings = await CompanySettings.findOne();
  const employees = await Employee.find({ status: 'active' });

  // Compute total working days in the month (assume standard 22 or calculate)
  const totalWorkingDaysInMonth = 22; 
  let totalGrossRun = 0;
  let totalNetRun = 0;

  for (const emp of employees) {
    const basic = emp.basicSalary;
    const hra = basic * 0.40;
    const medical = basic * 0.10;
    const gross = basic * 1.50; // Formula Gross = 1.5 * Basic

    // Pull attendance deductions
    const records = await Attendance.find({
      employeeId: emp._id,
      date: { $regex: `^${month}` }
    });

    const halfDays = records.filter(r => r.status === 'half_day').length;
    const unpaidLeaves = await LeaveRequest.find({
      employeeId: emp._id,
      leaveType: 'unpaid',
      status: 'approved',
      startDate: { $regex: `^${month}` }
    });
    const unpaidDaysCount = unpaidLeaves.reduce((acc, l) => acc + l.daysCount, 0);

    const perDayRate = gross / totalWorkingDaysInMonth;
    // Rule: deduct absent + unpaid + 0.5 * half_days
    const deductionAmount = (unpaidDaysCount + (0.5 * halfDays)) * perDayRate;

    const annualGross = gross * 12;
    const annualTax = calculateAnnualTax(annualGross);
    const monthlyTax = annualTax / 12;

    const netSalary = Math.max(0, gross - deductionAmount - monthlyTax);

    totalGrossRun += gross;
    totalNetRun += netSalary;

    await Payslip.create({
      payrollRunId: run._id,
      employeeId: emp._id,
      month,
      basic,
      hra,
      medical,
      grossSalary: Math.round(gross),
      workingDays: totalWorkingDaysInMonth,
      halfDays,
      unpaidLeaveDays: unpaidDaysCount,
      deductions: Math.round(deductionAmount),
      annualTax: Math.round(annualTax),
      monthlyTax: Math.round(monthlyTax),
      netSalary: Math.round(netSalary)
    });
  }

  run.totalGross = Math.round(totalGrossRun);
  run.totalNet = Math.round(totalNetRun);
  await run.save();

  return res.json({ message: 'Payroll draft calculated', run });
};

exports.finalizePayroll = async (req, res) => {
  const { id } = req.params;
  const run = await PayrollRun.findById(id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found' });
  if (run.status === 'finalized') return res.status(400).json({ error: 'Already finalized' });

  run.status = 'finalized';
  run.finalizedBy = req.user.id;
  run.finalizedAt = new Date();
  await run.save();

  await logAudit(req.user.email, 'FINALIZE_PAYROLL', 'PayrollRun', run._id, null, run);
  return res.json({ message: 'Payroll successfully locked and finalized', run });
};

exports.downloadPayslipPDF = async (req, res) => {
  const { payslipId } = req.params;
  const payslip = await Payslip.findById(payslipId).populate('employeeId');
  if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

  // Data scope check
  if (req.user.role === 'Employee' && req.user.employeeId.toString() !== payslip.employeeId._id.toString()) {
    return res.status(403).json({ error: 'Unauthorized to view this payslip' });
  }

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=payslip_${payslip.month}.pdf`);

  doc.pipe(res);
  doc.fontSize(20).text('HCM Lite - Employee Payslip', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Employee: ${payslip.employeeId.firstName} ${payslip.employeeId.lastName}`);
  doc.text(`Department: ${payslip.employeeId.department}`);
  doc.text(`Month: ${payslip.month}`);
  doc.moveDown();
  doc.text(`Basic Salary: PKR ${payslip.basic}`);
  doc.text(`HRA (40%): PKR ${payslip.hra}`);
  doc.text(`Medical (10%): PKR ${payslip.medical}`);
  doc.text(`Gross Salary (1.5x Basic): PKR ${payslip.grossSalary}`);
  doc.moveDown();
  doc.text(`Deductions (Unpaid/Half-days): PKR ${payslip.deductions}`);
  doc.text(`Income Tax (Monthly Slab): PKR ${payslip.monthlyTax}`);
  doc.moveDown();
  doc.fontSize(14).text(`Net Salary Disbursed: PKR ${payslip.netSalary}`, { bold: true });
  doc.end();
};