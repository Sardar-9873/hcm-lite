require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();
connectDB();

const corsOptions = {
  origin: [process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', apiRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`HCM Lite backend running on port ${PORT}`);
});