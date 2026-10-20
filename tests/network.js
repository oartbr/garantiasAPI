const nock = require('nock');

// Fail closed: no test can send mail, upload files or contact third-party APIs.
beforeAll(() => {
  nock.disableNetConnect();
  nock.enableNetConnect(/^(127\.0\.0\.1|localhost)(:\d+)?$/);
});
afterEach(() => nock.cleanAll());
afterAll(() => nock.enableNetConnect());
