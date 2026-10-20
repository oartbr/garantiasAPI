const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');
const { verifyToken } = require('../services/token.service');
const ApiError = require('../utils/ApiError');

const roleNames = { 1: 'ADMIN', 2: 'USER', 3: 'QA', 4: 'CARRIER', 5: 'SALES', 6: 'MAINTENANCE' };
const roleName = user => roleNames[user?.role?.id] || user?.role?.name;
const isStaff = user => ['ADMIN', 'QA', 'CARRIER', 'SALES', 'MAINTENANCE'].includes(roleName(user));
const session = (...roles) => async (req, res, next) => {
  try {
    const header = req.get('authorization');
    if (!header) throw new Error('Missing token');
    let userId;
    if (/^Bearer /i.test(header)) {
      const payload = jwt.verify(header.slice(7), config.jwt.secret, { algorithms: ['HS256'] });
      if (payload.type !== 'access') throw new Error('Wrong token type');
      userId = payload.sub;
    } else {
      // Compatibility with the existing frontend: revocable raw refresh token.
      userId = (await verifyToken(header, 'refresh')).user;
    }
    req.user = await User.findById(userId);
    if (!req.user) throw new Error('Missing user');
  } catch {
    return next(new ApiError(401, 'Please authenticate'));
  }
  if (roles.length && !roles.includes(roleName(req.user))) return next(new ApiError(403, 'Forbidden'));
  return next();
};
const requireOwner = (user, ownerId) => {
  if (!isStaff(user) && String(user.id) !== String(ownerId)) throw new ApiError(403, 'Forbidden');
};
module.exports = { session, roleName, isStaff, requireOwner };
