jest.mock('../../src/app', () => jest.fn());
jest.mock('../../src/database', () => jest.fn());
const app = require('../../src/app');
const connect = require('../../src/database');
const handler = require('../../src/serverless');

test('awaits the database before dispatching to Express', async () => {
  connect.mockResolvedValueOnce({});
  const req = {}; const res = {};
  await handler(req, res);
  expect(app).toHaveBeenCalledWith(req, res);
});
test('returns a retriable 503 without leaking database credentials', async () => {
  connect.mockRejectedValueOnce(new Error('secret database URL'));
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await handler({}, res);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({ code: 503, message: 'Database temporarily unavailable' });
});
