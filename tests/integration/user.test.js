
const app = require('../../src/app');
const { User } = require('../../src/models');
const setupTestDB = require('../utils/setupTestDB');
setupTestDB();
const request = require('../utils/adminRequest')();
const data = { firstName: 'Maria', lastName: 'Silva', email: 'user@example.com', password: 'password1', phoneNumber: '5511988888888' };
describe('Current user resource contract', () => {
  test('creates, reads, updates and deletes a user without exposing password', async () => {
    const created = await request(app).post('/v1/users').send(data).expect(201);
    const id = created.body.id;
    expect(id).toMatch(/^[a-f0-9]{24}$/);
    expect(created.body).not.toHaveProperty('password');
    await request(app).get('/v1/users/' + id).expect(200);
    await request(app).patch('/v1/users/' + id).send({ firstName: 'Ana', lastName: 'Silva' }).expect(200);
    expect((await User.findById(id)).firstName).toBe('Ana');
    await request(app).delete('/v1/users/' + id).expect(204);
    expect(await User.findById(id)).toBeNull();
    await request(app).get('/v1/users/' + id).expect(404);
  });
  test('rejects invalid identifiers and incomplete updates', async () => {
    await request(app).get('/v1/users/invalid').expect(400);
    await request(app).patch('/v1/users/507f1f77bcf86cd799439011').send({}).expect(400);
  });
  test('returns pagination and role filters', async () => {
    await User.create(data);
    const result = await request(app).get('/v1/users').query({ sort: JSON.stringify([{ orderBy: 'firstName', order: 'asc' }]), page: 1, limit: 10, filters: JSON.stringify({ roles: [{ id: 2 }] }) }).expect(200);
    expect(result.body).toMatchObject({ page: 1, limit: 10, totalResults: 1, hasNextPage: false });
    expect(result.body.results[0].email).toBe(data.email);
  });
  test('prevents duplicate email on update', async () => {
    const a = await User.create(data);
    const b = await User.create({ ...data, email: 'second@example.com', phoneNumber: 5511977777777 });
    await request(app).patch('/v1/users/' + b.id).send({ firstName: 'B', lastName: 'B', email: a.email }).expect(400);
    expect((await User.findById(b.id)).email).toBe('second@example.com');
  });
});
