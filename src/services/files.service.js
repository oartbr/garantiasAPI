const { put } = require('@vercel/blob');
const formidable = require('formidable');
const fs = require('fs').promises;
const ApiError = require('../utils/ApiError');

const postFile = async (request, res, folder) => {
  const form = new formidable.IncomingForm();
  const temporaryFiles = [];
  form.on('fileBegin', (name, file) => temporaryFiles.push(file));
  try {
    let files;
    try {
      [, files] = await form.parse(request);
    } catch (error) {
      throw new ApiError(error.httpCode || 400, 'Error parsing form data');
    }
    const file = files.file?.[0];
    if (!file) throw new ApiError(400, 'No file uploaded');
    const content = await fs.readFile(file.filepath);
    return await put(folder + '/' + file.newFilename, content, { access: 'public', contentType: file.mimetype });
  } finally {
    await Promise.all(temporaryFiles.map(file => fs.unlink(file.filepath).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    })));
  }
};
const postQRcode = (file, filename, folder) => put(folder + '/' + filename + '.svg', file, {
  access: 'public', contentType: 'image/svg+xml',
});
module.exports = { postFile, postQRcode };
