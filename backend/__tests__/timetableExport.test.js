const request = require('supertest');
const { app } = require('../server');

// Mock authentication token for testing
const mockToken = 'Bearer mock-jwt-token';

describe('Timetable Export', () => {
  test('should export timetable as PDF', async () => {
    const classId = 1;

    const response = await request(app)
      .get(`/api/timetables/class/${classId}/export/pdf`)
      .set('Authorization', mockToken)
      .expect(200);

    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(`filename=timetable-${classId}.pdf`);
  });

  test('should export timetable as CSV', async () => {
    const classId = 1;

    const response = await request(app)
      .get(`/api/timetables/class/${classId}/export/csv`)
      .set('Authorization', mockToken)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain(`filename=timetable-${classId}.csv`);
  });
});