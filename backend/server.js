const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./src/config/db');
const logger = require('./src/config/logger');
const realTimeService = require('./src/services/realTimeService');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io available to routes
app.set('io', io);

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  next();
});

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/attendance', require('./src/routes/attendanceRoutes'));
app.use('/api/timetables', require('./src/routes/timetableRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/documents', require('./src/routes/documentRoutes'));
app.use('/api/syllabus', require('./src/routes/syllabusRoutes'));
app.use('/api/ai', require('./src/routes/aiRoutes'));
app.use('/api/quizzes', require('./src/routes/quizRoutes'));
app.use('/api/performance', require('./src/routes/performanceRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  // Don't send stack trace to client in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;
    
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: errorMessage 
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url
  });
  
  res.status(404).json({ 
    error: 'Route not found' 
  });
});

// Only start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

module.exports = { app, io, realTimeService, server };