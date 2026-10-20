const { Garantia, CheckPhoneNumber, User } = require('../../src/models');
const service = require('../../src/services/garantia.service');
const setupTestDB = require('../utils/setupTestDB');
const { userOne, insertUsers } = require('../fixtures/user.fixture');
setupTestDB();

describe('warranty lifecycle with MongoDB', () => {
  test('only one owner can claim a warranty, including concurrent registrations', async () => {
    await insertUsers([userOne]);
    const other = await User.create({ firstName: 'Other', lastName: 'Owner', email: 'other@example.test', password: 'password1', phoneNumber: '5511888888888' });
    await Garantia.create({ garantiaId: 'RACE', status: 'qualityChecked' });
    const attempts = await Promise.allSettled([
      service.register({ garantiaId: 'RACE', userId: userOne._id }),
      service.register({ garantiaId: 'RACE', userId: other.id }),
    ]);
    expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.find(r => r.status === 'rejected').reason.statusCode).toBe(409);
    const owner = (await Garantia.findOne({ garantiaId: 'RACE' })).userId;
    const attacker = String(owner) === other.id ? userOne._id : other.id;
    await expect(service.register({ garantiaId: 'RACE', userId: attacker })).rejects.toMatchObject({ statusCode: 409 });
  });
  test('assigns, checks quality and registers the owner with populated userId', async () => {
    await insertUsers([userOne]);
    await service.create({ garantiaId: 'LIFECYCLE' });
    const product = { brand: 'Brand', description: 'Tank', sku: 'SKU' };
    const assigned = await service.assign({ garantiaId: 'LIFECYCLE' }, product);
    expect(assigned.status).toBe('assigned');
    expect(assigned.assignedAt).toBeInstanceOf(Date);
    const checked = await service.qualityCheck({ garantiaId: 'LIFECYCLE' }, { ...product, qualityCheck: [] });
    expect(checked.status).toBe('qualityChecked');
    const registered = await service.register({ garantiaId: 'LIFECYCLE', userId: userOne._id, firstName: 'Owner', phoneNumber: '12345' });
    expect(registered.status).toBe('registered');
    expect(registered.userId.email).toBe(userOne.email);
    expect((await Garantia.findOne({ garantiaId: 'LIFECYCLE' })).registeredAt).toBeInstanceOf(Date);
    expect(await User.countDocuments()).toBe(1);
  });
  test.each(['assign', 'qualityCheck', 'updateGarantiaById', 'patchGarantiaById', 'register'])('%s rejects a missing warranty', async method => {
    const id = ['assign', 'qualityCheck', 'register'].includes(method) ? { garantiaId: 'MISSING' } : 'MISSING';
    await expect(service[method](id, {})).rejects.toMatchObject({ statusCode: 404 });
  });
  test('rejects duplicate codes and persists partial updates', async () => {
    await service.create({ garantiaId: 'UNIQUE' });
    await expect(service.create({ garantiaId: 'UNIQUE' })).rejects.toMatchObject({ statusCode: 400 });
    await service.patchGarantiaById('UNIQUE', { status: 'shipped' });
    expect((await service.getGarantiaInfo('UNIQUE')).status).toBe('shipped');
  });
  test('tracks wrong phone codes and rejects reuse of confirmed checks', async () => {
    await CheckPhoneNumber.createNewCheck({ garantiaId: 'PHONE', phoneNumber: 551199999, code: 123456 });
    expect(await CheckPhoneNumber.checkExists({ garantiaId: 'PHONE' })).toBe(true);
    expect(await CheckPhoneNumber.confirmCode(999999, 'PHONE')).toBe(false);
    expect(await CheckPhoneNumber.confirmCodeLogin(999999, 551199999)).toBe(false);
    expect((await CheckPhoneNumber.getCheckById('PHONE')).count).toBe(2);
    expect(await CheckPhoneNumber.confirmCode(123456, 'PHONE')).toBe(true);
    expect(await CheckPhoneNumber.confirmCodeLogin(123456, 551199999)).toBe(true);
    await CheckPhoneNumber.updateOne({ garantiaId: 'PHONE' }, { confirmed: true });
    expect(await CheckPhoneNumber.confirmCode(123456, 'PHONE')).toBe(false);
    expect(await CheckPhoneNumber.confirmCodeLogin(123456, 551199999)).toBe(false);
    await expect(CheckPhoneNumber.getCheckById('MISSING')).rejects.toMatchObject({ statusCode: 404 });
  });
});
