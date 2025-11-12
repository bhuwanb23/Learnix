const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, sequelize } = require('./src/config/db');
const logger = require('./src/config/logger');
const RealTimeService = require('./src/services/realTimeService');

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/syllabus', require('./src/routes/syllabusRoutes'));
app.use('/api/ai', require('./src/routes/aiRoutes'));
app.use('/api/quizzes', require('./src/routes/quizRoutes'));
app.use('/api/documents', require('./src/routes/documentRoutes'));
app.use('/api/attendance', require('./src/routes/attendanceRoutes'));
app.use('/api/timetable', require('./src/routes/timetableRoutes'));
app.use('/api/performance', require('./src/routes/performanceRoutes'));
app.use('/api/assignments', require('./src/routes/assignmentRoutes'));
app.use('/api/exams', require('./src/routes/examRoutes'));
app.use('/api/drafts', require('./src/routes/draftRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

// Start server function with proper database handling
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Only start listening when this file is run directly, not when imported
    if (require.main === module) {
      server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
      });
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Initialize real-time service
const realTimeService = new RealTimeService(io);

// Start the server only when this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, server, realTimeService };