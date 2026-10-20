const request = require('supertest');
const moment = require('moment');
const app = require('../../src/app');
const { User, Token } = require('../../src/models');
const tokens = require('../../src/services/token.service');
const email = require('../../src/services/email.service');
const setupTestDB = require('../utils/setupTestDB');
setupTestDB();
const account = () => ({ firstName: 'Maria', lastName: 'Silva', email: 'maria@example.com', password: 'password1', phoneNumber: '5511999999999' });
const register = () => request(app).post('/v1/auth/register').send(account());
describe('Authentication HTTP and persistence contracts', () => {
  test('registers, hashes the password, hides private fields and persists refresh token', async () => {
    const { body } = await register().expect(201);
    expect(body.user).toMatchObject({ firstName: 'Maria', role: { id: 2, name: 'USER' } });
    expect(body.user).not.toHaveProperty('password');
    expect(body.user).not.toHaveProperty('_id');
    expect(body.tokens).toEqual({ token: expect.any(String), refreshToken: expect.any(String), tokenExpires: expect.any(String) });
    const user = await User.findById(body.user.id);
    expect(user.password).not.toBe(account().password);
    expect(await user.isPasswordMatch(account().password)).toBe(true);
    expect(await Token.countDocuments({ user: user.id, type: 'refresh' })).toBe(1);
  });
  test.each(['email', 'firstName', 'lastName', 'phoneNumber', 'password'])('requires %s', async (key) => {
    const data = account(); delete data[key];
    await request(app).post('/v1/auth/register').send(data).expect(400);
    expect(await User.countDocuments()).toBe(0);
  });
  test('rejects duplicate email and duplicate phone', async () => {
    await register().expect(201);
    await register().expect(400);
    await request(app).post('/v1/auth/register').send({ ...account(), email: 'other@example.com' }).expect(400);
  });
  test('login keeps the flat token contract and rejects wrong credentials', async () => {
    await register();
    const { body } = await request(app).post('/v1/auth/login').send({ email: account().email, password: account().password }).expect(200);
    expect(body).toMatchObject({ token: expect.any(String), refreshToken: expect.any(String), user: { email: account().email } });
    await request(app).post('/v1/auth/login').send({ email: account().email, password: 'wrong' }).expect(401);
    await request(app).post('/v1/auth/login').send({ email: 'missing@example.com', password: 'wrong' }).expect(401);
  });
  test('reads and updates the profile using the existing raw refresh Authorization contract', async () => {
    const { body } = await register();
    const auth = body.tokens.refreshToken;
    await request(app).get('/v1/auth/me').set('Authorization', auth).expect(200).expect(r => expect(r.body.id).toBe(body.user.id));
    await request(app).patch('/v1/auth/me').set('Authorization', auth).send({ firstName: 'Ana' }).expect(200);
    expect((await User.findById(body.user.id)).firstName).toBe('Ana');
  });
  test('refresh succeeds and logout revokes the persisted token', async () => {
    const { body } = await register();
    const refreshed = await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken: body.tokens.refreshToken }).expect(200);
    expect(refreshed.body.token).toEqual(expect.any(String));
    await request(app).post('/v1/auth/logout').send({ refreshToken: refreshed.body.refreshToken }).expect(204);
    await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken: refreshed.body.refreshToken }).expect(401);
    await request(app).post('/v1/auth/logout').send({ refreshToken: refreshed.body.refreshToken }).expect(404);
  });
  test('rejects expired and unpersisted refresh tokens', async () => {
    const { body } = await register();
    const expired = tokens.generateToken(body.user.id, moment().subtract(1, 'hour'), 'refresh');
    await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken: expired }).expect(401);
    await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken: 'invalid' }).expect(401);
  });
  test('resets passwords once and invalidates the reset token', async () => {
    const { body } = await register();
    const send = jest.spyOn(email, 'sendResetPasswordEmail').mockResolvedValue();
    await request(app).post('/v1/auth/forgot-password').send({ email: account().email }).expect(204);
    expect(send).toHaveBeenCalledWith(account().email, expect.any(String));
    const token = send.mock.calls[0][1];
    await request(app).post('/v1/auth/reset-password').query({ token }).send({ password: 'newpassword2' }).expect(204);
    expect(await (await User.findById(body.user.id)).isPasswordMatch('newpassword2')).toBe(true);
    await request(app).post('/v1/auth/reset-password').query({ token }).send({ password: 'another3' }).expect(401);
  });
  test('verifies email once and requires authentication to request verification', async () => {
    const { body } = await register();
    const send = jest.spyOn(email, 'sendVerificationEmail').mockResolvedValue();
    await request(app).post('/v1/auth/send-verification-email').expect(401);
    await request(app).post('/v1/auth/send-verification-email').set('Authorization', 'Bearer ' + body.tokens.token).expect(204);
    const token = send.mock.calls[0][1];
    await request(app).post('/v1/auth/verify-email').query({ token }).expect(204);
    expect((await User.findById(body.user.id)).isEmailVerified).toBe(true);
    await request(app).post('/v1/auth/verify-email').query({ token }).expect(401);
  });
});
