const Joi = require('joi');

// Employee registration validation
const employeeSchema = Joi.object({
  employeeCode: Joi.string().trim().required(),
  firstName: Joi.string().trim().required(),
  lastName: Joi.string().trim().required(),
  email: Joi.string().trim().email().required(),
  department: Joi.string().trim().required(),
  designation: Joi.string().trim().required(),
  basicSalary: Joi.number().positive().required(),
  joiningDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
}).required();

// Organization settings validation
const orgSettingsSchema = Joi.object({
  companyName: Joi.string().trim().min(2),
  officeStart: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
  graceMinutes: Joi.number().integer().min(0).max(120),
  halfDayUnderHours: Joi.number().min(0).max(24),
  weekend: Joi.array().items(
    Joi.string().valid(
      'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday', 'Sunday'
    )
  ),
  officeLocation: Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    radiusMeters: Joi.number().positive()
  }).min(1),
  quotas: Joi.object({
    annual: Joi.number().min(0),
    sick: Joi.number().min(0),
    casual: Joi.number().min(0)
  }).min(1),
  departments: Joi.array().items(Joi.string().trim().min(1)),
  designations: Joi.array().items(Joi.string().trim().min(1)),
  publicHolidays: Joi.array().items(
    Joi.object({
      date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
      name: Joi.string().trim().required()
    })
  )
}).min(1);

// Reusable validation middleware
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false
  });

  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map((detail) => detail.message)
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validate,
  employeeSchema,
  orgSettingsSchema
};
