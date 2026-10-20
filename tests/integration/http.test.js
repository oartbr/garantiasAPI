const request = require('supertest');
const app = require('../../src/app');

describe('HTTP boundary', () => {
  test('unsigned provider webhooks are rejected before processing', async () => {
    await request(app).post('/v1/messaging/whatsIncoming').send({}).expect(403);
    await request(app).get('/v1/call/incoming').expect(403);
  });
  test('unknown routes return JSON 404', async () => {
    await request(app).get('/unknown').expect(404).expect(r => expect(r.body).toMatchObject({ code: 404, message: 'Not found' }));
  });
  test.each(['/', '/v1/auth/login', '/v1/files/upload/photos'])('handles CORS preflight at %s', async path => {
    const result = await request(app).options(path).set('Origin', 'http://localhost:3000').set('Access-Control-Request-Method', 'POST');
    expect(result.status).toBe(204);
    expect(result.headers['access-control-allow-origin']).toBeTruthy();
  });
  test('malformed JSON is a client error', async () => {
    await request(app).post('/v1/auth/login').set('Content-Type', 'application/json').send('{broken').expect(400);
  });
  test('protected catalog requires authentication before query validation', async () => {
    await request(app).get('/v1/sku').query({ page: 'wrong' }).expect(401);
  });
});
