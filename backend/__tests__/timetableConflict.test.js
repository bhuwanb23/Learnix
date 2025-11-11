const request = require('supertest');
const { app } = require('../server');

// Mock authentication token for testing
const mockToken = 'Bearer mock-jwt-token';

describe('Timetable Conflict Detection', () => {
  test('should reject timetable with teacher conflict', async () => {
    const timetableData = {
      courseId: 1,
      classId: 1,
      subjectId: 1,
      teacherId: 1,
      roomId: 'A101',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:30',
      startDate: '2023-09-01',
      endDate: '2023-12-31'
    };

    const response = await request(app)
      .post('/api/timetables')
      .set('Authorization', mockToken)
      .send(timetableData)
      .expect(409);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
  });

  test('should reject timetable with room conflict', async () => {
    const timetableData = {
      courseId: 1,
      classId: 1,
      subjectId: 1,
      teacherId: 2, // Different teacher
      roomId: 'A101', // Same room
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:30',
      startDate: '2023-09-01',
      endDate: '2023-12-31'
    };

    const response = await request(app)
      .post('/api/timetables')
      .set('Authorization', mockToken)
      .send(timetableData)
      .expect(409);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
  });
});