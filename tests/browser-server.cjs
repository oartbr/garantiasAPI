require('./setup-env');
process.env.CORS_ORIGIN = 'http://127.0.0.1:3100';
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const nock = require('nock');

(async () => {
  const database = await MongoMemoryServer.create({ binary: { version: '8.0.16' }, instance: { dbName: 'garantias-browser-test' } });
  process.env.MONGODB_URL = database.getUri('garantias-browser-test');
  nock.disableNetConnect();
  nock.enableNetConnect(/^(127\.0\.0\.1|localhost)(:\d+)?$/);
  const app = require('../src/app');
  const { User } = require('../src/models');
  await mongoose.connect(process.env.MONGODB_URL);
  await User.create({ firstName: 'Browser', lastName: 'Test', email: 'browser@example.test', password: 'password1', phoneNumber: '5511999999999', role: { id: 1, name: 'ADMIN' } });
  const server = app.listen(4010, '127.0.0.1', () => console.log('Isolated API ready'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
    server.close(); await mongoose.disconnect(); await database.stop(); process.exit(0);
  });
})().catch(error => { console.error(error); process.exit(1); });
