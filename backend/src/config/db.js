const mongoose = require('mongoose');

const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Yahan se function directly export hona zaroori hai
module.exports = connectDB;