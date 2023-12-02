import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

export const generateOTP = (otp_length) => {
  var digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < otp_length; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

export const sendSMS = async ({ otp, contactNumber }) => {
  const url = 'https://www.fast2sms.com/dev/bulkV2';
  fetch(`${url}?authorization=${process.env.OTP_SMS_API_KEY}&route=otp&variables_values=${otp}&flash=0&numbers=${contactNumber}`)
  .then(() => {
    return true;
  }).catch(() => {
    return false;
  })
};

export const createJwtToken = (payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1y" });
  return token;
};

export const verifyJwtToken = (token) => {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    return userId;
};
