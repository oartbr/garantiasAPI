jest.mock('twilio', () => jest.fn(() => ({ messages: { create: jest.fn() } })));
jest.mock('../../src/models', () => ({ Whats: { findOne: jest.fn() }, User: {}, CheckPhoneNumber: {} }));
const Twilio = require('twilio');
const { Whats } = require('../../src/models');
const { refreshWhatsQueue } = require('../../src/services/messaging.service');
const send = Twilio.mock.results[0].value.messages.create;

afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test('empty queue does not contact external providers', async () => {
  Whats.findOne.mockResolvedValue(null);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  expect(await refreshWhatsQueue()).toEqual({ message: 'No pending threads' });
  expect(send).not.toHaveBeenCalled();
});
test('queue request remains open until the provider finishes and state is saved', async () => {
  jest.useFakeTimers();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  const thread = { threadId: 'thread-test', runId: 'run-test', phoneNumber: '123', updateOne: jest.fn().mockResolvedValue({}) };
  Whats.findOne.mockResolvedValue(thread);
  jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce({ json: async () => ({ status: 'completed' }) })
    .mockResolvedValueOnce({ json: async () => ({ data: [{ role: 'assistant', content: [{ text: { value: 'Reply' } }] }] }) });
  let finishSend;
  send.mockReturnValueOnce(new Promise(resolve => { finishSend = resolve; }));
  let finished = false;
  const request = refreshWhatsQueue().then(result => { finished = true; return result; });
  await jest.advanceTimersByTimeAsync(5000);
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ body: 'Reply' }));
  expect(finished).toBe(false);
  finishSend({ sid: 'simulated' });
  await expect(request).resolves.toEqual({ message: 'Pending threads found' });
  expect(thread.updateOne).toHaveBeenLastCalledWith({ lastReply: 'Reply', status: 'ok' });
});
