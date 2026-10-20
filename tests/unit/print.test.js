jest.mock('@vercel/blob', () => ({ put: jest.fn() }));
jest.mock('../../src/models', () => ({ Print: { findById: jest.fn() } }));
const { put } = require('@vercel/blob');
const { Print } = require('../../src/models');
const { createPdf } = require('../../src/services/print.service');

describe('PDF completion in a serverless request', () => {
  const print = { _id: 'print-id', printId: 'ABC', items: ['https://example.test/qr.svg'] };
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, text: async () => '<svg width="100" height="100"><rect width="20" height="20"/></svg>' });
    Print.findById.mockResolvedValue({ updateOne: jest.fn().mockResolvedValue({}) });
    put.mockResolvedValue({ url: 'https://example.test/file.pdf' });
  });
  afterEach(() => jest.restoreAllMocks());
  test('waits for a real PDF and upload before resolving', async () => {
    expect(await createPdf(print)).toBe('https://example.test/file.pdf');
    expect(put.mock.calls.at(-1)[1].subarray(0, 4).toString()).toBe('%PDF');
    expect(Print.findById).toHaveBeenCalledWith('print-id');
  });
  test('propagates storage failure through the request error handler', async () => {
    put.mockRejectedValueOnce(new Error('storage offline'));
    await expect(createPdf(print)).rejects.toMatchObject({ statusCode: 500 });
  });
  test('rejects inaccessible SVG input', async () => {
    fetch.mockResolvedValueOnce({ ok: false });
    await expect(createPdf(print)).rejects.toMatchObject({ statusCode: 400 });
  });
});
