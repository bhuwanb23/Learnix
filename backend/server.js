const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Create Socket.io instance
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize real-time service
const RealTimeService = require('./src/services/realTimeService');
const realTimeService = new RealTimeService(io);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Custom logging middleware
const requestLogger = require('./src/middleware/logging');
app.use(requestLogger);

// Database connection
const { connectDB } = require('./src/config/db');
connectDB();

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Learnix Academic & Classroom Management API', 
    version: '1.0.0' 
  });
});

// Health check endpoint
const { healthCheck } = require('./src/controllers/healthController');
app.get('/health', healthCheck);

// Authentication routes
app.use('/api/auth', require('./src/routes/authRoutes'));

// API Routes
app.use('/api/timetables', require('./src/routes/timetableRoutes'));
app.use('/api/timetable-subscriptions', require('./src/routes/timetableSubscriptionRoutes'));
app.use('/api/attendance', require('./src/routes/attendanceRoutes'));
app.use('/api/documents', require('./src/routes/documentRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found' 
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io, realTimeService };