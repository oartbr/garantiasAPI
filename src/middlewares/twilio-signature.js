const { validateRequest } = require('twilio');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

module.exports = (req, res, next) => {
  const signature = req.get('x-twilio-signature');
  const protocol = process.env.VERCEL ? 'https' : req.protocol;
  const url = `${protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.method === 'POST' ? req.signatureBody || req.body : {};
  if (!signature || !config.twilio.authToken || !validateRequest(config.twilio.authToken, signature, url, params)) {
    return next(new ApiError(403, 'Invalid webhook signature'));
  }
  return next();
};
