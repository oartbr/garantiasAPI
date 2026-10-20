jest.mock('twilio', () => jest.fn(() => ({ messages: { create: jest.fn().mockResolvedValue({ sid: 'test-message' }) } })));
const Twilio = require('twilio');
const { CheckPhoneNumber } = require('../../src/models');
const service = require('../../src/services/messaging.service');
const setupTestDB = require('../utils/setupTestDB');
setupTestDB();
const phone = 551199999;
const send = Twilio.mock.results[0].value.messages.create;

describe('WhatsApp verification with a simulated provider', () => {
  test.each(['sendMessage', 'sendMessageLogin'])('%s persists and renews verification codes', async method => {
    await service[method](phone, '123456');
    expect((await CheckPhoneNumber.findOne({ phoneNumber: phone })).code).toBe(123456);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: `whatsapp:${phone}` }));
    await CheckPhoneNumber.updateOne({ phoneNumber: phone }, { confirmed: true, count: 3 });
    await service[method](phone, '654321');
    expect(await CheckPhoneNumber.findOne({ phoneNumber: phone }).lean()).toMatchObject({ code: 654321, confirmed: false, count: 0 });
    send.mockRejectedValueOnce(new Error('provider unavailable'));
    await expect(service[method](phone, '654321')).rejects.toMatchObject({ statusCode: 400 });
  });
  test.each(['confirmWhatsCode', 'confirmWhatsCodeLogin'])('%s confirms once, limits attempts and expires invalid codes', async method => {
    const id = method === 'confirmWhatsCode' ? 'WHATS' : phone;
    await expect(service[method](123456, id)).rejects.toMatchObject({ statusCode: 404 });
    await CheckPhoneNumber.create({ garantiaId: 'WHATS', phoneNumber: phone, code: 123456 });
    await expect(service[method](111111, id)).rejects.toMatchObject({ statusCode: 428 });
    expect(await service[method](123456, id)).toBeTruthy();
    await expect(service[method](123456, id)).rejects.toMatchObject({ statusCode: 208 });
    await CheckPhoneNumber.updateOne({ phoneNumber: phone }, { confirmed: false, count: 3 });
    await expect(service[method](111111, id)).rejects.toMatchObject({ statusCode: 429 });
    expect(await CheckPhoneNumber.countDocuments()).toBe(0);
  });
});
