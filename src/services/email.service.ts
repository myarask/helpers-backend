import nodemailer from "nodemailer";
import CONFIG from "../config/config";

const transport = nodemailer.createTransport(CONFIG.email.smtp);
transport
  .verify()
  .then(() => console.info("Connected to email server"))
  .catch(() =>
    console.warn(
      "Unable to connect to email server. Make sure you have configured the SMTP options in .env"
    )
  );

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
  const msg = { from: CONFIG.email.from, to, subject, text };
  await transport.sendMail(msg);
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = "Reset password";
  const resetPasswordUrl = `${CONFIG.email.resetPasswordUrl}?token=${token}`;
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, text);
};

export default {
  transport,
  sendEmail,
  sendResetPasswordEmail,
};
