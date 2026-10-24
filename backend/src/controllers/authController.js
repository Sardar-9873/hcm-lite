const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CompanySettings = require('../models/CompanySettings');
const { logAudit } = require('../utils/audit');

exports.checkFirstRun = async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'Admin' });
    return res.json({ firstRun: !adminExists });
  } catch (err) {
    return res.status(500).json({ error: 'DB Connection Error: ' + err.message });
  }
};

exports.firstRunSetup = async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'Admin' });
    if (adminExists) {
      return res.status(400).json({ error: 'System is already initialized' });
    }

    const { companyName, adminEmail, adminPassword } = req.body;
    if (!companyName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Missing required configuration fields' });
    }

    // Company Settings create karein
    await CompanySettings.create({ companyName });

    // Password hash karein
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await User.create({
      email: adminEmail,
      password: hashedPassword,
      role: 'Admin',
      mustChangePassword: false
    });

    // Audit log
    await logAudit(adminEmail, 'FIRST_RUN_SETUP', 'CompanySettings', adminUser._id, null, { companyName });

    return res.status(201).json({ message: 'First-run setup successfully completed' });
  } catch (err) {
    console.error('Setup Error:', err);
    return res.status(500).json({ error: 'Database/Server Error: ' + err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, employeeId: user.employeeId },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '12h' }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user.id, { password: hashedPassword, mustChangePassword: false });
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};