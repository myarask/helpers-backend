import httpStatus from "http-status";
import { catchAsync } from "../utils/catchAsync";
import path from 'path';
import { authService, tokenService, emailService } from "../services";
import sanitizeUser from "../utils/sanitizeUser";

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user: sanitizeUser(user), tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});


const resetPasswordPage = catchAsync(async (req, res) => {
  res.sendFile(path.join(__dirname+'/../views/reset-password.html'));
});


export default {
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  resetPasswordPage
};