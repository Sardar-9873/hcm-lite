const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const Employee = require('../models/Employee');
const User = require('../models/User');
const { logAudit } = require('../utils/audit');

exports.createEmployee = async (req, res) => {
  let employee = null;

  try {
    const {
      employeeCode,
      firstName,
      lastName,
      email,
      department,
      designation,
      basicSalary,
      joiningDate,
    } = req.body;

    // 1. Validate required fields
    if (
      !employeeCode?.trim() ||
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email?.trim() ||
      !department?.trim() ||
      !designation?.trim() ||
      basicSalary === undefined ||
      basicSalary === '' ||
      !joiningDate
    ) {
      return res.status(400).json({
        error: 'All required employee fields must be provided.',
      });
    }

    // 2. Validate salary
    const salary = Number(basicSalary);

    if (!Number.isFinite(salary) || salary <= 0) {
      return res.status(400).json({
        error: 'Basic salary must be a positive number.',
      });
    }

    // 3. Normalize values
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = employeeCode.trim();

    // 4. Check duplicate email or employee code
    const existingEmployee = await Employee.findOne({
      $or: [
        { email: normalizedEmail },
        { employeeCode: normalizedCode },
      ],
    });

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingEmployee || existingUser) {
      return res.status(409).json({
        error: 'An employee or user with this email/code already exists.',
      });
    }

    // 5. Validate joining date
    const parsedJoiningDate = new Date(`${joiningDate}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedJoiningDate.getTime()) ||
      parsedJoiningDate.toISOString().slice(0, 10) !== joiningDate
    ) {
      return res.status(400).json({
        error: 'Please provide a valid joining date in YYYY-MM-DD format.',
      });
    }

    // 6. Generate a temporary password
    const temporaryPassword = crypto
      .randomBytes(12)
      .toString('base64url');

    // 7. Hash password before storing it
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // 8. Create employee profile
    employee = await Employee.create({
      employeeCode: normalizedCode,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      department: department.trim(),
      designation: designation.trim(),
      basicSalary: salary,
      joiningDate: parsedJoiningDate,
    });

    // 9. Create login account linked to employee profile
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role: 'Employee',
      employeeId: employee._id,
      mustChangePassword: true,
      isActive: true,
    });

    // 10. Record audit event
    await logAudit(
      req.user.email,
      'EMPLOYEE_CREATED',
      'Employee',
      employee._id,
      null,
      {
        employeeCode: employee.employeeCode,
        email: employee.email,
        role: user.role,
      }
    );

    // 11. Return success and temporary credentials
    return res.status(201).json({
      message: 'Employee and login account created successfully.',
      employee: {
        id: employee._id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joiningDate,
      },
      credentials: {
        email: user.email,
        temporaryPassword,
        mustChangePassword: true,
      },
    });
  } catch (error) {
    // If login creation fails after profile creation,
    // remove the incomplete employee profile.
    if (employee?._id) {
      try {
        await Employee.deleteOne({ _id: employee._id });
      } catch (rollbackError) {
        console.error(
          'Employee rollback failed:',
          rollbackError.message
        );
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        error: 'Employee email or employee code already exists.',
      });
    }

    console.error('Employee registration error:', error);

    return res.status(500).json({
      error: 'Employee registration failed. Please try again.',
    });
  }
};