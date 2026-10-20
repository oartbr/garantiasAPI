const mongoose = require('mongoose');
const config = require('../../src/config/config');
const { MongoMemoryServer } = require('mongodb-memory-server');

const setupTestDB = () => {
  let server;
  beforeAll(async () => {
    server = await MongoMemoryServer.create({ binary: { version: '8.0.16' }, instance: { dbName: 'garantias-test' } });
    config.mongoose.url = server.getUri('garantias-test');
    // NODE-7832: Jest cannot resolve the driver's dynamic OS import.
    await mongoose.connect(config.mongoose.url, { ...config.mongoose.options, runtimeAdapters: { os: require('os') } });
  });

  beforeEach(async () => {
    if (mongoose.connection.host !== '127.0.0.1' || mongoose.connection.name !== 'garantias-test') {
      throw new Error('Refusing to clear a database not owned by this test run');
    }
    await Promise.all(Object.values(mongoose.connection.collections).map(async (collection) => collection.deleteMany()));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (server) await server.stop();
  });
};

module.exports = setupTestDB;
