jest.mock('@vercel/blob', () => ({ put: jest.fn(async path => ({ url: 'https://storage.example.test/' + path })) }));

const app = require('../../src/app');
const { Sku, Garantia, Print } = require('../../src/models');
const qr = require('../../src/services/qrcode.service');
const setupTestDB = require('../utils/setupTestDB');
setupTestDB();
const request = require('../utils/adminRequest')();
const query = { sort: JSON.stringify([{ orderBy: 'createdAt', order: 'asc' }]), page: 1, limit: 10 };
describe('SKU and warranty contracts', () => {
  test('creates, reads, updates, paginates and deletes a SKU', async () => {
    const { body } = await request(app).post('/v1/sku/create').send({ skuId: 'SKU-1', description: 'Tank', category: 'Tank', capacity: 200 }).expect(201);
    await request(app).get('/v1/sku/' + body.id).expect(200).expect(r => expect(r.body.sku.skuId).toBe('SKU-1'));
    await request(app).patch('/v1/sku/' + body.id).send({ description: 'Updated', capacity: 300 }).expect(200);
    expect((await Sku.findById(body.id)).capacity).toBe(300);
    await request(app).get('/v1/sku').query(query).expect(200).expect(r => expect(r.body.totalResults).toBe(1));
    await request(app).delete('/v1/sku/' + body.id).expect(200);
    await request(app).get('/v1/sku/' + body.id).expect(404);
  });
  test('rejects invalid SKU IDs and missing model fields', async () => {
    await request(app).get('/v1/sku/invalid').expect(400);
    await request(app).post('/v1/sku/create').send({ skuId: 'incomplete' }).expect(400);
  });
  test('generates warranties, real SVGs, stores the print job and reads public status', async () => {
    jest.spyOn(qr, 'loadImage').mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg" width="188" height="136"></svg>');
    const { body } = await request(app).post('/v1/garantia/create').send({ quantity: 2, length: 7, prefix: 'TEST', type: 'string' }).expect(201);
    expect(body.quantity).toBe(2);
    expect(new Set(body.garantias).size).toBe(2);
    expect(await Garantia.countDocuments({ printId: body.printId })).toBe(2);
    expect((await Print.findOne({ printId: body.printId })).items).toHaveLength(2);
    await request(app).get('/v1/garantia/' + body.garantias[0]).expect(200).expect(r => expect(r.body.garantia).toMatchObject({ garantiaId: body.garantias[0], status: 'created' }));
    await request(app).get('/v1/garantia').expect(404);
    await request(app).get('/v1/garantia/getAll').query(query).expect(200).expect(r => expect(r.body.totalResults).toBe(2));
  });
  test('preserves warranty status filters and missing resource errors', async () => {
    await Garantia.create([{ garantiaId: 'ONE', status: 'created' }, { garantiaId: 'TWO', status: 'assigned' }]);
    const result = await request(app).get('/v1/garantia/getAll').query({ ...query, filters: JSON.stringify({ status: [{ id: 'assigned' }] }) }).expect(200);
    expect(result.body.results.map(g => g.garantiaId)).toEqual(['TWO']);
    await request(app).get('/v1/garantia/missing').expect(404);
    await request(app).get('/v1/garantia/getPdfFile/missing').expect(404);
  });
});
