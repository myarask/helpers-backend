import httpStatus from "http-status";
import { catchAsync } from "../utils/catchAsync";
import { authService, tokenService } from "../services";

const login = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const user = await authService.loginUserWithEmailAndOTP(email, otp);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

export default {
  login,
  logout,
  refreshTokens,
};