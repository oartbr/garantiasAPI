const express = require('express');
const { session } = require('../../middlewares/session');
const validate = require('../../middlewares/validate');
const filesValidation = require('../../validations/files.validation');
const filesController = require('../../controllers/files.controller');

const router = express.Router();
router.use(session());

router.post('/upload/:folder', validate(filesValidation.postFile), filesController.postFile);

module.exports = router;
