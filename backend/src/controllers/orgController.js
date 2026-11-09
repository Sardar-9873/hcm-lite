
const CompanySettings = require('../models/CompanySettings');
const { logAudit } = require('../utils/audit');

// GET: Fetch company settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await CompanySettings.findOne().lean();

    if (!settings) {
      return res.status(404).json({
        error: 'Company settings not found'
      });
    }

    return res.status(200).json(settings);
  } catch (err) {
    console.error('Get organization settings error:', err);
    return res.status(500).json({
      error: 'Failed to fetch company settings'
    });
  }
};

// PUT: Update company settings
exports.updateSettings = async (req, res) => {
  try {
    const allowedFields = [
      'companyName',
      'officeStart',
      'graceMinutes',
      'halfDayUnderHours',
      'weekend',
      'officeLocation',
      'quotas',
      'departments',
      'designations',
      'publicHolidays'
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid settings provided'
      });
    }

    const settings = await CompanySettings.findOne();

    if (!settings) {
      return res.status(404).json({
        error: 'Company settings not found'
      });
    }

    const beforeState = settings.toObject();

    for (const [key, value] of Object.entries(updates)) {
      settings.set(key, value);
    }

    await settings.save();

    await logAudit(
      req.user.email,
      'UPDATE_ORG_SETTINGS',
      'CompanySettings',
      settings._id,
      beforeState,
      settings.toObject()
    );

    return res.status(200).json({
      message: 'Company settings updated successfully',
      settings
    });
  } catch (err) {
    console.error('Update organization settings error:', err);
    return res.status(500).json({
      error: 'Failed to update company settings'
    });
  }
};
