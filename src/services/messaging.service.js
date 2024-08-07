// src/services/twilioService.js
const twilio = require('twilio');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const { Garantia } = require('../models');
const { CheckPhoneNumber } = require('../models');
const { User } = require('../models');

const messagingClient = new twilio(config.twilio.accountSid, config.twilio.authToken);

const confirmWhatsCode = async (code, garantiaId) => {
  
  
  const confirmPhoneNumberCode = await CheckPhoneNumber.confirmCode(code, garantiaId);
  
  if (!confirmPhoneNumberCode) {
    const countFails = await CheckPhoneNumber.findOne({ garantiaId });
    if (countFails === null) {
      throw new ApiError(httpStatus.NOT_FOUND, `Code doesn't match, please request a new one.`);
    } else if (countFails.confirmed === true) {
      throw new ApiError(httpStatus.ALREADY_REPORTED, `This code was already confirmed, please request a new one.`);
    } else if (countFails.count > 3) {
      await CheckPhoneNumber.deleteOne({ garantiaId });
      throw new ApiError(httpStatus.TOO_MANY_REQUESTS, `Code doesn't match, please request a new one.`);
    } else {
      throw new ApiError(httpStatus.PRECONDITION_REQUIRED, `Code doesn't match. ${countFails.count} failed attempts.`);
    }
  } else {
    
    const success = await CheckPhoneNumber.findOneAndUpdate(
      { code, garantiaId },
      { $set: { confirmed: true } },
      { upsert: true }
    );
  }

  return true;
};

const confirmWhatsCodeLogin = async (code, phoneNumber) => {
  
  
  const confirmPhoneNumberCode = await CheckPhoneNumber.confirmCodeLogin(code, phoneNumber);
  
  if (!confirmPhoneNumberCode) {
    const countFails = await CheckPhoneNumber.findOne({ phoneNumber });
    if (countFails === null) {
      throw new ApiError(httpStatus.NOT_FOUND, `Code doesn't match, please request a new one.`);
    } else if (countFails.confirmed === true) {
      throw new ApiError(httpStatus.ALREADY_REPORTED, `This code was already confirmed, please request a new one.`);
    } else if (countFails.count > 3) {
      await CheckPhoneNumber.deleteOne({ phoneNumber });
      throw new ApiError(httpStatus.TOO_MANY_REQUESTS, `Code doesn't match, please request a new one.`);
    } else {
      throw new ApiError(httpStatus.PRECONDITION_REQUIRED, `Code doesn't match. ${countFails.count} failed attempts.`);
    }
  } else {
    
    const success = await CheckPhoneNumber.findOneAndUpdate(
      { code, phoneNumber },
      { $set: { confirmed: true } },
      { upsert: true }
    );
  }
  const user = await User.findOne({ phoneNumber });

  return {user, phoneNumber, confirmed: true};
};

const sendMessage = async (phoneNumber, message, garantiaId) => {
  const toPhoneNumber = `whatsapp:${phoneNumber}`;

  const garantiaExists = await Garantia.isGarantiaTaken(garantiaId);
  const checkExists = await CheckPhoneNumber.checkExists({ garantiaId });

  if (!checkExists) {
    const checkPhone = await CheckPhoneNumber.create({
      garantiaId,
      code: message,
      phoneNumber,
      count: 0,
    });
  } else {
    const checkPhoneMess = await CheckPhoneNumber.updateOne(
      { garantiaId },
      { $set: { code: message, confirmed: false, count: 0, phoneNumber: phoneNumber } },
      { upsert: true }
    );
  }

  if (!garantiaExists) {
    throw new ApiError(httpStatus.NOT_FOUND, `Garantia doesn't exist.`);
  }

  try {
    const response = await messagingClient.messages
      .create({
        body: message,
        from: config.twilio.phoneNumber,
        to: toPhoneNumber,
      })
      .then((mess) => {});
    return response;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Failed to send Message: ${error.message}`);
  }
  return true;
};

const sendMessageLogin = async (phoneNumber, message) => {
  const toPhoneNumber = `whatsapp:${phoneNumber}`;

  const checkExists = await CheckPhoneNumber.checkExists({ phoneNumber });

  if (!checkExists) {
    const checkPhone = await CheckPhoneNumber.create({
      code: message,
      phoneNumber,
      count: 0,
    });
  } else {
    const checkPhoneMess = await CheckPhoneNumber.updateOne(
      { phoneNumber },
      { $set: { code: message, confirmed: false, count: 0 } },
      { upsert: true }
    );
  }

  try {
    const response = await messagingClient.messages
      .create({
        body: message,
        from: config.twilio.phoneNumber,
        to: toPhoneNumber,
      })
      .then((mess) => {});
    return response;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Failed to send Message: ${error.message}`);
  }
  return true;
};

module.exports = {
  sendMessage,
  confirmWhatsCode,
  sendMessageLogin,
  confirmWhatsCodeLogin,
};
