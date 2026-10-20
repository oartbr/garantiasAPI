const app = require('./app');
const connectDatabase = require('./database');

module.exports = async (req, res) => {
  try {
    await connectDatabase();
  } catch {
    return res.status(503).json({ code: 503, message: 'Database temporarily unavailable' });
  }
  return app(req, res);
};
