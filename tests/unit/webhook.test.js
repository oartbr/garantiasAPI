const { getExpectedTwilioSignature } = require('twilio');
const config = require('../../src/config/config');
const verify = require('../../src/middlewares/twilio-signature');
const url = 'http://example.test/v1/messaging/whatsIncoming';
function request(body, signature) {
  return { method: 'POST', protocol: 'http', originalUrl: '/v1/messaging/whatsIncoming', signatureBody: body,
    get: name => ({ host: 'example.test', 'x-twilio-signature': signature })[name] };
}
test('accepts a signed webhook using the original body before sanitization', () => {
  const body = { Body: 'A < B', From: 'whatsapp:+123' };
  const next = jest.fn();
  verify(request(body, getExpectedTwilioSignature(config.twilio.authToken, url, body)), {}, next);
  expect(next).toHaveBeenCalledWith();
});
test('rejects a forged webhook', () => {
  const next = jest.fn(); verify(request({ Body: 'fake' }, 'forged'), {}, next);
  expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
});
test('rejects modification of a signed payload', () => {
  const signature = getExpectedTwilioSignature(config.twilio.authToken, url, { Body: 'original' });
  const next = jest.fn(); verify(request({ Body: 'changed' }, signature), {}, next);
  expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
});
