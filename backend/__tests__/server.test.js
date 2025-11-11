const request = require('supertest');
const { app } = require('../server');

describe('Server Health Check', () => {
  test('GET / should return API information', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('version');
  });

  test('GET /api/invalid-route should return 404', async () => {
    const response = await request(app)
      .get('/api/invalid-route')
      .expect(404);
    
    expect(response.body).toHaveProperty('error');
  });
});