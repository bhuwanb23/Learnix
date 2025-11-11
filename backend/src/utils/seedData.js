const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
const Document = require('../models/Document');

// Load environment variables
dotenv.config();

// Connect to database
mongoose.connect(process.env.DB_HOST || 'mongodb://localhost:27017/learnix_academic', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB for seeding'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Sample data
const sampleTimetables = [
  {
    courseId: new mongoose.Types.ObjectId(),
    classId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    roomId: 'A101',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:30',
    startDate: new Date('2023-09-01'),
    endDate: new Date('2023-12-31'),
    isActive: true
  },
  {
    courseId: new mongoose.Types.ObjectId(),
    classId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    roomId: 'B205',
    dayOfWeek: 2,
    startTime: '14:00',
    endTime: '15:30',
    startDate: new Date('2023-09-01'),
    endDate: new Date('2023-12-31'),
    isActive: true
  }
];

const sampleAttendance = [
  {
    courseId: new mongoose.Types.ObjectId(),
    classId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    teacherId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    date: new Date(),
    status: 'present',
    method: 'manual',
    recordedBy: new mongoose.Types.ObjectId()
  }
];

const sampleDocuments = [
  {
    title: 'Introduction to Mathematics',
    description: 'Lecture notes for Chapter 1',
    courseId: new mongoose.Types.ObjectId(),
    classId: new mongoose.Types.ObjectId(),
    subjectId: new mongoose.Types.ObjectId(),
    uploadedBy: new mongoose.Types.ObjectId(),
    fileType: 'application/pdf',
    fileName: 'math-intro.pdf',
    filePath: '/uploads/math-intro.pdf',
    fileSize: 1024000,
    isPublic: true,
    tags: ['mathematics', 'introduction', 'lecture-notes']
  }
];

async function seedDatabase() {
  try {
    // Clear existing data
    await Timetable.deleteMany({});
    await Attendance.deleteMany({});
    await Document.deleteMany({});
    
    // Insert sample data
    await Timetable.insertMany(sampleTimetables);
    await Attendance.insertMany(sampleAttendance);
    await Document.insertMany(sampleDocuments);
    
    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;