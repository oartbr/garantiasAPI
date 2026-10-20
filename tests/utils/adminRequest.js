const supertest = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');
const { generateAuthTokens } = require('../../src/services/token.service');

module.exports = () => {
  let token;
  beforeEach(async () => {
    const user = await User.create({ firstName: 'Test', lastName: 'Admin', email: 'admin-fixture@example.test', password: 'password1', phoneNumber: '5511000000000', role: { id: 1, name: 'ADMIN' } });
    token = (await generateAuthTokens(user)).refreshToken;
  });
  return () => Object.fromEntries(['get', 'post', 'patch', 'delete', 'put'].map(method => [method, url => supertest(app)[method](url).set('Authorization', token)]));
};
