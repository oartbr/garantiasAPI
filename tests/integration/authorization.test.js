const request = require('supertest');
const app = require('../../src/app');
const { User, Garantia, Token } = require('../../src/models');
const { generateAuthTokens } = require('../../src/services/token.service');
require('../utils/setupTestDB')();
const account = async (id, name) => {
  const user = await User.create({ firstName: name, lastName: 'Test', email: `${name}@example.test`, password: 'password1', phoneNumber: `551100000000${id}`, role: { id, name } });
  return { user, ...(await generateAuthTokens(user)) };
};
const protectedRoutes = [
  ['get','/v1/users'], ['post','/v1/users'], ['delete','/v1/users/507f1f77bcf86cd799439011'],
  ['get','/v1/sku'], ['post','/v1/sku/create'], ['patch','/v1/sku/507f1f77bcf86cd799439011'],
  ['post','/v1/garantia/create'], ['get','/v1/garantia/getAll'], ['get','/v1/garantia/getPdfs/pending'],
  ['patch','/v1/garantia/CODE'], ['delete','/v1/garantia/CODE'], ['post','/v1/garantia/register'],
  ['get','/v1/garantia/getList/507f1f77bcf86cd799439011'], ['get','/v1/garantia/getUser/CODE'],
  ['post','/v1/files/upload/photos'], ['get','/v1/cron/refreshQueue'], ['get','/v1/QRcode/create/test'],
];
test.each(protectedRoutes)('%s %s rejects anonymous callers', async (method, url) => {
  await request(app)[method](url).expect(401);
});
test('ordinary users cannot manage accounts or mutate the catalog', async () => {
  const login = await account(2, 'USER');
  for (const [method, url] of [['get','/v1/users'], ['post','/v1/users'], ['post','/v1/sku/create'], ['post','/v1/garantia/create'], ['patch','/v1/garantia/CODE']]) {
    await request(app)[method](url).set('Authorization', login.refreshToken).expect(403);
  }
});
test('accepts raw refresh and access Bearer tokens and rejects revoked sessions', async () => {
  const login = await account(1, 'ADMIN');
  await request(app).get('/v1/users/invalid').set('Authorization', login.refreshToken).expect(400);
  await request(app).get('/v1/users/invalid').set('Authorization', `Bearer ${login.token}`).expect(400);
  await request(app).get('/v1/users').set('Authorization', `Bearer ${login.refreshToken}`).expect(401);
  await Token.deleteMany({ user: login.user.id });
  await request(app).get('/v1/users').set('Authorization', login.refreshToken).expect(401);
});
test('QA retains quality-check access but cannot create users', async () => {
  const login = await account(3, 'QA');
  await request(app).patch('/v1/garantia/qualityCheck/CODE').set('Authorization', login.refreshToken).send({}).expect(404);
  await request(app).post('/v1/users').set('Authorization', login.refreshToken).send({}).expect(403);
});
test('public status stays public while owner identity cannot be forged in the URL', async () => {
  const owner = await account(1, 'ADMIN');
  const other = await account(2, 'USER');
  await Garantia.create({ garantiaId: 'OWNED', status: 'registered', userId: owner.user.id });
  await request(app).get('/v1/garantia/OWNED').expect(200).expect(r => expect(r.body.garantia).toEqual({ garantiaId: 'OWNED', status: 'registered' }));
  await request(app).get(`/v1/garantia/OWNED/${owner.user.id}`).set('Authorization', other.refreshToken).expect(401);
  await request(app).get(`/v1/garantia/getList/${owner.user.id}`).set('Authorization', other.refreshToken).expect(403);
});
