const PayrollRun = require('../models/PayrollRun');
const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const CompanySettings = require('../models/CompanySettings');
const { calculateAnnualTax } = require('../utils/taxCalculator');
const { logAudit } = require('../utils/audit');
const PDFDocument = require('pdfkit');

// Convert dates to YYYY-MM-DD without timezone shifts
const toDateString = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

// Get every date in a month
const getMonthDates = (month) => {
  const [year, monthNumber] = month.split('-').map(Number);

  const totalDays = new Date(
    Date.UTC(year, monthNumber, 0)
  ).getUTCDate();

  const dates = [];

  for (let day = 1; day <= totalDays; day++) {
    dates.push(
      `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    );
  }

  return dates;
};

// Check whether a date is a working day
const isWorkingDay = (dateString, weekends, holidays) => {
  const date = new Date(`${dateString}T00:00:00Z`);

  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  const dayName = dayNames[date.getUTCDay()];

  return !weekends.includes(dayName) && !holidays.has(dateString);
};

exports.createMonthlyDraft = async (req, res) => {
  try {
    const { month } = req.body;

    if (
      typeof month !== 'string' ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
    ) {
      return res.status(400).json({
        error: 'Invalid month. Expected YYYY-MM.'
      });
    }

    let run = await PayrollRun.findOne({ month });

    if (run && run.status === 'finalized') {
      return res.status(400).json({
        error: 'Payroll run is finalized and locked.'
      });
    }

    const settings = await CompanySettings.findOne();

    if (!settings) {
      return res.status(404).json({
        error: 'Company settings not found.'
      });
    }

    const employees = await Employee.find({
      status: 'active'
    });

    const monthDates = getMonthDates(month);
    const monthStart = monthDates[0];
    const monthEnd = monthDates[monthDates.length - 1];

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi'
    }).format(new Date());

    const weekends = settings.weekend || [
      'Saturday',
      'Sunday'
    ];

    const holidays = new Set(
      (settings.publicHolidays || [])
        .map(holiday => toDateString(holiday.date))
        .filter(date => date >= monthStart && date <= monthEnd)
    );

    // Complete month's working dates
    const monthWorkingDates = monthDates.filter(date =>
      isWorkingDay(date, weekends, holidays)
    );

    const totalMonthWorkingDays = monthWorkingDates.length;

    let totalGrossRun = 0;
    let totalNetRun = 0;

    const payslips = [];

    for (const emp of employees) {
      const basic = emp.basicSalary;
      const hra = basic * 0.40;
      const medical = basic * 0.10;
      const gross = basic * 1.50;

      // Employee eligibility starts from joining date
      const joiningDate = toDateString(emp.joiningDate);

      const employeeWorkingDates = monthWorkingDates.filter(date =>
        !joiningDate || date >= joiningDate
      );

      const workingDays = employeeWorkingDates.length;

      // Prorated salary based on eligible working days
      const salaryRatio = totalMonthWorkingDays > 0
        ? workingDays / totalMonthWorkingDays
        : 0;

      const proratedBasic = basic * salaryRatio;
      const proratedHra = hra * salaryRatio;
      const proratedMedical = medical * salaryRatio;
      const proratedGross = gross * salaryRatio;

      // Fetch attendance and overlapping approved leaves
      const [records, approvedLeaves] = await Promise.all([
        Attendance.find({
          employeeId: emp._id,
          date: {
            $gte: monthStart,
            $lte: monthEnd
          }
        }).lean(),

        LeaveRequest.find({
          employeeId: emp._id,
          status: 'approved',
          startDate: { $lte: monthEnd },
          endDate: { $gte: monthStart }
        }).lean()
      ]);

      const attendanceByDate = new Map(
        records.map(record => [record.date, record])
      );

      const paidLeaveDates = new Set();
      const unpaidLeaveDates = new Set();

      // Expand approved leave ranges into working dates
      for (const leave of approvedLeaves) {
        const leaveStart = toDateString(leave.startDate);
        const leaveEnd = toDateString(leave.endDate);

        for (const date of employeeWorkingDates) {
          if (date < leaveStart || date > leaveEnd) {
            continue;
          }

          if (leave.leaveType === 'unpaid') {
            unpaidLeaveDates.add(date);
          } else {
            paidLeaveDates.add(date);
          }
        }
      }

      let absentDays = 0;
      let halfDays = 0;
      let unpaidLeaveDays = 0;

      // Calculate deductions date by date
      for (const date of employeeWorkingDates) {
        const attendance = attendanceByDate.get(date);

        // Paid leave takes priority
        if (paidLeaveDates.has(date)) {
          continue;
        }

        // Unpaid leave takes priority over absence
        if (unpaidLeaveDates.has(date)) {
          unpaidLeaveDays++;
          continue;
        }

        if (
          attendance &&
          ['present', 'late', 'missing_checkout'].includes(
            attendance.status
          )
        ) {
          continue;
        }

        if (attendance?.status === 'half_day') {
          halfDays++;
          continue;
        }

        if (attendance?.status === 'absent') {
          absentDays++;
          continue;
        }

        // Missing attendance counts only for elapsed dates
        if (date < today) {
          absentDays++;
        }
      }

      // Deduction rate based on complete monthly working days
      const perDayRate = totalMonthWorkingDays > 0
        ? gross / totalMonthWorkingDays
        : 0;

      const deductionUnits =
        absentDays +
        unpaidLeaveDays +
        (halfDays * 0.5);

      const deductionAmount = deductionUnits * perDayRate;

      // Annual tax on contractual annual salary
      const annualGross = gross * 12;
      const annualTax = calculateAnnualTax(annualGross);

      // Prorate monthly tax for joining month
      const monthlyTax = (annualTax / 12) * salaryRatio;

      // Round displayed salary components first
      const roundedBasic = Math.round(proratedBasic);
      const roundedHra = Math.round(proratedHra);
      const roundedMedical = Math.round(proratedMedical);
      const roundedGross = Math.round(proratedGross);
      const roundedDeduction = Math.round(deductionAmount);
      const roundedTax = Math.round(monthlyTax);

      // Calculate net from displayed rounded values
      const roundedNet = Math.max(
        0,
        roundedGross - roundedDeduction - roundedTax
      );

      payslips.push({
        payrollRunId: null,
        employeeId: emp._id,
        month,

        basic: roundedBasic,
        hra: roundedHra,
        medical: roundedMedical,

        grossSalary: roundedGross,
        workingDays,

        absentDays,
        halfDays,
        unpaidLeaveDays,

        deductions: roundedDeduction,
        annualTax: Math.round(annualTax),
        monthlyTax: roundedTax,

        netSalary: roundedNet
      });

      totalGrossRun += roundedGross;
      totalNetRun += roundedNet;
    }

    // Create or update draft after calculations succeed
    if (!run) {
      run = await PayrollRun.create({
        month,
        status: 'draft'
      });
    } else {
      await Payslip.deleteMany({
        payrollRunId: run._id
      });
    }

    for (const payslip of payslips) {
      payslip.payrollRunId = run._id;
    }

    if (payslips.length > 0) {
      await Payslip.insertMany(payslips);
    }

    run.totalGross = totalGrossRun;
    run.totalNet = totalNetRun;

    await run.save();

    return res.status(200).json({
      message: 'Payroll draft calculated successfully',
      run
    });

  } catch (error) {
    console.error('Create monthly payroll error:', error);

    return res.status(500).json({
      error: 'Failed to calculate payroll draft'
    });
  }
};

exports.finalizePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    const run = await PayrollRun.findById(id);

    if (!run) {
      return res.status(404).json({
        error: 'Payroll run not found'
      });
    }

    if (run.status === 'finalized') {
      return res.status(400).json({
        error: 'Already finalized'
      });
    }

    run.status = 'finalized';
    run.finalizedBy = req.user.id;
    run.finalizedAt = new Date();

    await run.save();

    await logAudit(
      req.user.email,
      'FINALIZE_PAYROLL',
      'PayrollRun',
      run._id,
      null,
      run
    );

    return res.json({
      message: 'Payroll successfully locked and finalized',
      run
    });

  } catch (error) {
    console.error('Finalize payroll error:', error);

    return res.status(500).json({
      error: 'Failed to finalize payroll'
    });
  }
};

exports.downloadPayslipPDF = async (req, res) => {
  try {
    const { payslipId } = req.params;

    const payslip = await Payslip.findById(payslipId)
      .populate('employeeId');

    if (!payslip || !payslip.employeeId) {
      return res.status(404).json({
        error: 'Payslip or employee not found'
      });
    }

    if (
      req.user.role === 'Employee' &&
      (!req.user.employeeId ||
        req.user.employeeId.toString() !==
        payslip.employeeId._id.toString())
    ) {
      return res.status(403).json({
        error: 'Unauthorized to view this payslip'
      });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payslip_${payslip.month}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text(
      'HCM Lite - Employee Payslip',
      { align: 'center' }
    );

    doc.moveDown();

    doc.fontSize(12).text(
      `Employee: ${payslip.employeeId.firstName} ${payslip.employeeId.lastName}`
    );
    doc.text(`Department: ${payslip.employeeId.department}`);
    doc.text(`Month: ${payslip.month}`);

    doc.moveDown();

    doc.text(`Basic Salary: PKR ${payslip.basic}`);
    doc.text(`HRA (40%): PKR ${payslip.hra}`);
    doc.text(`Medical (10%): PKR ${payslip.medical}`);
    doc.text(`Gross Salary: PKR ${payslip.grossSalary}`);

    doc.moveDown();

    doc.text(`Working Days: ${payslip.workingDays}`);
    doc.text(`Absent Days: ${payslip.absentDays}`);
    doc.text(`Half Days: ${payslip.halfDays}`);
    doc.text(`Unpaid Leave Days: ${payslip.unpaidLeaveDays}`);

    doc.moveDown();

    doc.text(`Total Deductions: PKR ${payslip.deductions}`);
    doc.text(`Annual Tax: PKR ${payslip.annualTax}`);
    doc.text(`Monthly Tax: PKR ${payslip.monthlyTax}`);

    doc.moveDown();

    doc.fontSize(14).text(
      `Net Salary: PKR ${payslip.netSalary}`,
      { bold: true }
    );

    doc.end();

  } catch (error) {
    console.error('Download payslip error:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Failed to generate payslip PDF'
      });
    }
  }
};

exports.getPayrollRuns = async (req, res) => {
  try {
    const runs = await PayrollRun.find()
      .sort({ month: -1 });

    return res.status(200).json(runs);

  } catch (error) {
    console.error('Fetch payroll runs error:', error);

    return res.status(500).json({
      error: 'Failed to fetch payroll runs'
    });
  }
};
