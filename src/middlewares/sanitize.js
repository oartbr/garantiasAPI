const { inHTMLData } = require('xss-filters');
const { sanitize } = require('express-mongo-sanitize');

// Preserve the previous xss-clean escaping without assigning Express 5's query getter.
const clean = value => {
  if (value === undefined) return value;
  if (value === null) return null;
  return typeof value === 'object'
    ? sanitize(JSON.parse(inHTMLData(JSON.stringify(value)).trim()))
    : inHTMLData(String(value)).trim();
};
module.exports = (req, res, next) => {
  req.signatureBody = req.body;
  req.body = clean(req.body);
  req.sanitizedQuery = clean(req.query);
  next();
};
