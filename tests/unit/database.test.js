jest.mock('mongoose', () => ({ connection: { readyState: 0 }, connect: jest.fn() }));
const mongoose = require('mongoose');
const connect = require('../../src/database');

test('concurrent cold invocations share one connection attempt and warm ones reuse it', async () => {
  let resolve;
  mongoose.connect.mockReturnValue(new Promise(r => { resolve = r; }));
  const first = connect();
  const second = connect();
  expect(mongoose.connect).toHaveBeenCalledTimes(1);
  mongoose.connection.readyState = 1;
  resolve(mongoose);
  await Promise.all([first, second]);
  await connect();
  expect(mongoose.connect).toHaveBeenCalledTimes(1);
});

test('a failed cold connection can retry', async () => {
  mongoose.connection.readyState = 0;
  mongoose.connect.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(mongoose);
  await expect(connect()).rejects.toThrow('offline');
  await expect(connect()).resolves.toBe(mongoose);
});
