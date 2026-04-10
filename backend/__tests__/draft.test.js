const request = require('supertest');
const { app, server } = require('../server');
const { sequelize } = require('../src/config/db');
const { User, Draft } = require('../src/models');

describe('Draft API', () => {
  let authToken;
  let studentUser;
  let teacherUser;

  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
    
    // Create test users
    studentUser = await User.create({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      role: 'student'
    });
    
    teacherUser = await User.create({
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      password: 'password123',
      role: 'teacher'
    });
    
    // Login as student to get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'password123'
      });
    
    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Clean up database
    await sequelize.close();
    server.close();
  });

  describe('POST /api/drafts', () => {
    it('should create a new draft', async () => {
      const draftData = {
        title: 'Test Essay',
        content: 'This is a test essay content for evaluation.',
        draft_type: 'essay'
      };
      
      const res = await request(app)
        .post('/api/drafts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(draftData)
        .expect(201);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(draftData.title);
      expect(res.body.data.content).toBe(draftData.content);
      expect(res.body.data.student_id).toBe(studentUser.id);
    });
  });

  describe('GET /api/drafts/:id', () => {
    let draftId;
    
    beforeAll(async () => {
      const draft = await Draft.create({
        title: 'Test Draft',
        content: 'Test content',
        student_id: studentUser.id,
        draft_type: 'essay'
      });
      draftId = draft.id;
    });

    it('should get a draft by ID', async () => {
      const res = await request(app)
        .get(`/api/drafts/${draftId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(draftId);
      expect(res.body.data.title).toBe('Test Draft');
    });
  });

  describe('GET /api/drafts', () => {
    it('should get current user drafts', async () => {
      const res = await request(app)
        .get('/api/drafts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PUT /api/drafts/:id', () => {
    let draftId;
    
    beforeAll(async () => {
      const draft = await Draft.create({
        title: 'Original Draft',
        content: 'Original content',
        student_id: studentUser.id,
        draft_type: 'essay'
      });
      draftId = draft.id;
    });

    it('should update a draft', async () => {
      const updateData = {
        title: 'Updated Draft',
        content: 'Updated content'
      };
      
      const res = await request(app)
        .put(`/api/drafts/${draftId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(updateData.title);
      expect(res.body.data.content).toBe(updateData.content);
    });
  });

  describe('POST /api/drafts/:id/analyze', () => {
    let draftId;
    
    beforeAll(async () => {
      const draft = await Draft.create({
        title: 'Analysis Draft',
        content: 'This is content for AI analysis testing.',
        student_id: studentUser.id,
        draft_type: 'essay'
      });
      draftId = draft.id;
    });

    it('should analyze draft with AI', async () => {
      const res = await request(app)
        .post(`/api/drafts/${draftId}/analyze`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('analysis');
      expect(res.body.data.analysis).toHaveProperty('analysisScore');
    });
  });

  describe('POST /api/drafts/:id/feedback', () => {
    let draftId;
    
    beforeAll(async () => {
      const draft = await Draft.create({
        title: 'Feedback Draft',
        content: 'This is content for feedback generation testing.',
        student_id: studentUser.id,
        draft_type: 'essay'
      });
      draftId = draft.id;
    });

    it('should generate AI feedback for draft', async () => {
      const res = await request(app)
        .post(`/api/drafts/${draftId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('feedback');
      expect(res.body.data.feedback).toHaveProperty('feedback');
    });
  });

  describe('POST /api/drafts/:id/suggestions', () => {
    let draftId;
    
    beforeAll(async () => {
      const draft = await Draft.create({
        title: 'Suggestions Draft',
        content: 'This is content for improvement suggestions testing.',
        student_id: studentUser.id,
        draft_type: 'essay'
      });
      draftId = draft.id;
    });

    it('should generate improvement suggestions for draft', async () => {
      const res = await request(app)
        .post(`/api/drafts/${draftId}/suggestions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ focusAreas: ['grammar', 'clarity'] })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('suggestions');
      expect(Array.isArray(res.body.data.suggestions)).toBe(true);
    });
  });
});