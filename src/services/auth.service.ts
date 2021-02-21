import httpStatus from "http-status";
import { tokenService, userService } from "./index";
import { ApiError } from "../utils/catchAsync";
import TOKEN_TYPES from "../passport/config";
import prismaClient from "../prismaClient";
import { compareHashPassword, hashPassword } from "../utils/userPassword";

/**
 * Login with username and OTP
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  const isPasswordMatch = await compareHashPassword(password, user.password);
  if (!isPasswordMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await prismaClient.tokens.findFirst({
    where: {
      token: refreshToken,
      type: TOKEN_TYPES.REFRESH,
      blacklisted: false
    }
  });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await tokenService.deleteTokenById(refreshTokenDoc.id)
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, TOKEN_TYPES.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.userId);
    if (!user) {
      throw new Error();
    }
    await tokenService.deleteTokenById(refreshTokenDoc.id)
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  if (!newPassword) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Please provide new password');
  }

  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, TOKEN_TYPES.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.userId);
    if (!user) {
      throw new Error();
    }
    const slatedPassword = await hashPassword(newPassword)
    await userService.updateUserById(user.id, { password: slatedPassword });
    await prismaClient.tokens.deleteMany({ where: { userId: user.id, type: TOKEN_TYPES.RESET_PASSWORD }});
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

const authService = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
}

export default authService;