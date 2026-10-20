const mongoose = require('mongoose');
const config = require('./config/config');

let connectionPromise;
async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(config.mongoose.url, {
      ...config.mongoose.options,
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10000,
    }).catch(error => {
      connectionPromise = undefined;
      throw error;
    });
  }
  try {
    return await connectionPromise;
  } finally {
    // The active mongoose connection is reused; a later disconnect can reconnect.
    connectionPromise = undefined;
  }
}

module.exports = connectDatabase;
