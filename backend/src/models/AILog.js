const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true
  },

  role: {
    type: String,
    required: true,
    enum: ['Admin', 'HR', 'Employee']
  },

  prompt: {
    type: String,
    required: true
  },

  // Kept for backward compatibility.
  toolInvoked: {
    type: String,
    default: null
  },

  // Records every distinct tool used in this request.
  toolsInvoked: {
    type: [String],
    default: []
  },

  toolCallCount: {
    type: Number,
    default: 0
  },

  response: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('AILog', aiLogSchema);
