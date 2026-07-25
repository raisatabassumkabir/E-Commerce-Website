const request = require('supertest');
const User = require('../models/User');

// Require email module FIRST and spy on sendResetPasswordEmail before requiring app/authController
const emailUtils = require('../utils/email');
const sendResetEmailSpy = vi.spyOn(emailUtils, 'sendResetPasswordEmail').mockResolvedValue(true);

// Now require app, so authController destructures the spied sendResetPasswordEmail function
const app = require('../app');

describe('AuthController - forgotPassword Integration Suite', () => {
  let findOneSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    findOneSpy = vi.spyOn(User, 'findOne');
    sendResetEmailSpy.mockResolvedValue(true);
  });

  it('1. Successful reset link trigger - should return 200 and trigger reset email when user exists', async () => {
    const mockUser = {
      _id: 'user123',
      name: 'Jane Doe',
      email: 'jane@example.com',
      save: vi.fn().mockResolvedValue(true),
    };

    findOneSpy.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'jane@example.com' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
    expect(findOneSpy).toHaveBeenCalledWith({ email: 'jane@example.com' });
    expect(mockUser.save).toHaveBeenCalled();
    expect(sendResetEmailSpy).toHaveBeenCalledWith('jane@example.com', 'Jane Doe', expect.any(String));
  });

  it('2. Missing email body payload - should return 400 validation error', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Valid email is required');
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it('3. Non-existent email - should return 200 with generic success message without leaking existence', async () => {
    findOneSpy.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
    expect(findOneSpy).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
    expect(sendResetEmailSpy).not.toHaveBeenCalled();
  });
});
