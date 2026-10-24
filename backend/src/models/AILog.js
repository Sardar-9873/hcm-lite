// backend/src/models/AILog.js
const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  role: { type: String, required: true },
  prompt: { type: String, required: true },
  toolInvoked: { type: String, default: null },
  response: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('AILog', aiLogSchema);