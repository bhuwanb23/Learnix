# Learnix Academic & Classroom Management Backend

This is the backend service for the Academic & Classroom Management features of the Learnix ERP system.

## Features Implemented

1. Smart timetable scheduling & real-time updates
2. Automated + manual attendance tracking
3. Lecture notes upload, sharing & versioning
4. Syllabus progress tracker with completion analytics
5. AI-generated topic summaries & explanations
6. Interactive quizzes, MCQ generation & instant grading
7. Weak topic detection & personalized study suggestions
8. Assignment submission, plagiarism check & grading
9. Exam scheduling, evaluation & result publishing
10. AI-checked draft feedback & improvement tips

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **Multer** - File upload handling

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration files
│   └── uploads/         # Uploaded files
├── docs/               # Documentation
├── .env                # Environment variables
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies
├── server.js           # Entry point
└── README.md           # This file
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file based on `.env.example` and configure:
   - Database connection
   - JWT secret
   - Port number

3. **Database Setup**
   - Install MongoDB locally or use a cloud service
   - Update the database connection string in `.env`

4. **Run the Application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Timetable Management
- `GET /api/timetables` - Get all timetables
- `POST /api/timetables` - Create a new timetable
- `GET /api/timetables/:id` - Get a specific timetable
- `PUT /api/timetables/:id` - Update a timetable
- `DELETE /api/timetables/:id` - Delete a timetable
- `GET /api/timetables/class/:classId` - Get timetable for a class

### Attendance Tracking
- `GET /api/attendance` - Get all attendance records
- `POST /api/attendance` - Create a new attendance record
- `GET /api/attendance/:id` - Get a specific attendance record
- `PUT /api/attendance/:id` - Update an attendance record
- `DELETE /api/attendance/:id` - Delete an attendance record
- `GET /api/attendance/stats` - Get attendance statistics

### Document Management
- `GET /api/documents` - Get all documents
- `POST /api/documents` - Upload a new document
- `GET /api/documents/:id` - Get a specific document
- `PUT /api/documents/:id` - Update a document
- `DELETE /api/documents/:id` - Delete a document
- `GET /api/documents/:id/download` - Download a document

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Development

- **Code Style**: Follow Airbnb JavaScript style guide
- **Branching**: Use feature branches for new functionality
- **Testing**: Write unit tests for all new features
- **Documentation**: Update this README when adding new features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

MIT