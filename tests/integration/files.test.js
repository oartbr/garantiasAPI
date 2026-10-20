jest.mock('@vercel/blob', () => ({ put: jest.fn() }));
const { put } = require('@vercel/blob');

require('../utils/setupTestDB')();
const request = require('../utils/adminRequest')();

describe('Multipart uploads through Express', () => {
  beforeEach(() => put.mockReset());
  test('uploads bytes and preserves the Blob response contract', async () => {
    put.mockResolvedValue({ url: 'https://storage.example.test/image.png', pathname: 'photos/image.png' });
    const result = await request().post('/v1/files/upload/photos').attach('file', Buffer.from('image-bytes'), 'image.png').expect(201);
    expect(result.body.url).toBe('https://storage.example.test/image.png');
    expect(put).toHaveBeenCalledWith(expect.stringMatching(/^photos\//), Buffer.from('image-bytes'), expect.objectContaining({ access: 'public', contentType: 'image/png' }));
  });
  test('rejects multipart without a file', async () => {
    await request().post('/v1/files/upload/photos').field('description', 'no file').expect(400);
    expect(put).not.toHaveBeenCalled();
  });
  test('forwards storage errors through the normal API error handler', async () => {
    put.mockRejectedValue(new Error('storage unavailable'));
    const result = await request().post('/v1/files/upload/photos').attach('file', Buffer.from('data'), 'image.png').expect(500);
    expect(result.body.code).toBe(500);
  });
});

