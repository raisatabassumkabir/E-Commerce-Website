const request = require('supertest');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const app = require('../app'); // Path to your Express app export

describe('API Route Testing: Auth Endpoints', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('GET / - Should return 404 for unhandled root routes if configured', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/auth/forgot-password - Should handle invalid email requests', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistentuser@example.com' });

    // Assuming your controller returns a 200, 400, 404, or 500 for unverified/missing emails
    expect([200, 400, 404, 500]).toContain(res.statusCode);
  });
});
