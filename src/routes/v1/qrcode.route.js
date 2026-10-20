const express = require('express');
const { session } = require('../../middlewares/session');
const validate = require('../../middlewares/validate');
const qrcodeValidation = require('../../validations/qrcode.validation');
const qrcodeController = require('../../controllers/qrcode.controller');

const router = express.Router();
router.use(session('ADMIN'));

router.get('/create/:url', validate(qrcodeValidation.getQRcode), qrcodeController.getQRcode);

module.exports = router;
