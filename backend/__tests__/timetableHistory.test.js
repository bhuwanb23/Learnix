const request = require('supertest');
const { app } = require('../server');

// Mock authentication token for testing
const mockToken = 'Bearer mock-jwt-token';

describe('Timetable History and Rollback', () => {
  test('should get timetable history', async () => {
    const timetableId = 1;

    const response = await request(app)
      .get(`/api/timetables/${timetableId}/history`)
      .set('Authorization', mockToken)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  test('should return 404 for non-existent history record', async () => {
    const timetableId = 99999;
    const historyId = 99999;

    const response = await request(app)
      .post(`/api/timetables/${timetableId}/rollback/${historyId}`)
      .set('Authorization', mockToken)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});