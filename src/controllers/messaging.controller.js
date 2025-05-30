const httpStatus = require('http-status');
// const pick = require('../utils/pick');
// const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { sendMessage, sendMessageLogin, confirmWhatsCodeLogin } = require('../services/messaging.service');
const { messagingService } = require('../services');
const { tokenService } = require('../services');
// const { createCheck } = require('../services/checkPhoneNumber.service');
const CodeGenerator = require('../utils/generator');

const sendCodeWhatsApp = catchAsync(async (req, res) => {
  const oCode = new CodeGenerator(5, 'number');
  await sendMessage(req.body.phoneNumber, oCode.code, req.body.garantiaId || 'pending').then(() => {
    res.status(httpStatus.OK).send({ success: `Code sent to ${req.body.phoneNumber}.` });
  });
});

// snedWhats is a function that sends a code to a phone number
const sendWhats = catchAsync(async (req, res) => {
  const oCode = new CodeGenerator(5, 'number');
  await sendMessageLogin(req.body.phoneNumber, oCode.code).then(() => {
    res.status(httpStatus.OK).send({ success: `Code sent to ${req.body.phoneNumber}.` });
  });
});

const confirmCode = catchAsync(async (req, res) => {
  const response = await confirmWhatsCodeLogin(req.body.code, req.body.phoneNumber);
  let resp;
  if (response.user) {
    const tokens = await tokenService.generateAuthTokens(response.user);
    resp = {
      phoneNumber: response.phoneNumber,
      confirmation: true,
      user: response.user,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      tokenExpires: tokens.tokenExpires,
    };
  } else {
    resp = {
      phoneNumber: response.phoneNumber,
      confirmation: true,
    };
  }

  if (response.confirmed) {
    res.status(httpStatus.OK).send(resp);
  } else {
    res.send({ response: 'Code does not match', confirmation: false });
  }
});

// whatsIncomming is a function that receives messages sent via whatsapp
const whatsIncoming = catchAsync(async (req, res) => {
  await messagingService.whatsIncoming(req, res).then((resp) => {
    res.status(httpStatus.OK).send(resp);
  });
});

// Check if there are any pending messages on the Whats queue, if so, get assistant messages and return them.
const refreshWhatsQueue = catchAsync(async (req, res) => {
  await messagingService.refreshWhatsQueue(req, res).then((resp) => {
    res.status(httpStatus.OK).send(resp);
  });
});

module.exports = {
  sendCodeWhatsApp,
  confirmCode,
  sendWhats,
  whatsIncoming,
  refreshWhatsQueue,
};

/* example:
commClient.messages
  .create({
    body: 'Your appointment is coming up on July 21 at 3PM',
    from: process.env.ACCOUNTSID,
    to: process.env.FROMWHATS,
  })
  .then((message) => console.log(message.sid));

export default { commClient };
*/
