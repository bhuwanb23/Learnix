class RealTimeService {
  constructor(io) {
    this.io = io;
    this.setupConnectionHandler();
  }

  setupConnectionHandler() {
    this.io.on('connection', (socket) => {
      console.log('User connected to real-time service:', socket.id);

      // Join room for specific class
      socket.on('joinClass', (classId) => {
        socket.join(`class-${classId}`);
        console.log(`User ${socket.id} joined class ${classId}`);
      });

      // Leave room for specific class
      socket.on('leaveClass', (classId) => {
        socket.leave(`class-${classId}`);
        console.log(`User ${socket.id} left class ${classId}`);
      });

      // Join room for specific timetable
      socket.on('subscribeToTimetable', (timetableId) => {
        socket.join(`timetable-${timetableId}`);
        console.log(`User ${socket.id} subscribed to timetable ${timetableId}`);
      });

      // Leave room for specific timetable
      socket.on('unsubscribeFromTimetable', (timetableId) => {
        socket.leave(`timetable-${timetableId}`);
        console.log(`User ${socket.id} unsubscribed from timetable ${timetableId}`);
      });

      // Handle timetable updates
      socket.on('timetableUpdate', (data) => {
        this.broadcastTimetableUpdate(data);
      });

      // Handle attendance updates
      socket.on('attendanceUpdate', (data) => {
        this.broadcastAttendanceUpdate(data);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected from real-time service:', socket.id);
      });
    });
  }

  broadcastTimetableUpdate(data) {
    if (data.classId) {
      this.io.to(`class-${data.classId}`).emit('timetableUpdated', data);
    } else {
      this.io.emit('timetableUpdated', data);
    }
  }

  broadcastAttendanceUpdate(data) {
    if (data.classId) {
      this.io.to(`class-${data.classId}`).emit('attendanceUpdated', data);
    } else {
      this.io.emit('attendanceUpdated', data);
    }
  }

  // Notify specific user
  notifyUser(userId, event, data) {
    this.io.to(`user-${userId}`).emit(event, data);
  }

  // Notify specific class
  notifyClass(classId, event, data) {
    this.io.to(`class-${classId}`).emit(event, data);
  }

  // Notify specific timetable subscribers
  notifyTimetableSubscribers(timetableId, event, data) {
    this.io.to(`timetable-${timetableId}`).emit(event, data);
  }
}

module.exports = RealTimeService;