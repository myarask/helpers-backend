import httpStatus from "http-status";
import { tokenService, userService } from "./index";
import { ApiError } from "../utils/catchAsync";
import TOKEN_TYPES from "../passport/config";

/**
 * Login with username and OTP
 * @param {string} email
 * @param {string} otp
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  const isPasswordMatch = await otpService.verifyOTP(user.id, password);
  if (!isOTPMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or OTP');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: TOKEN_TYPES.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, TOKEN_TYPES.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

const authService = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
}

export default authService;