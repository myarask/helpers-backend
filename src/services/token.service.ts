import moment from "moment";
import { formatISO } from "date-fns";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/catchAsync";
import httpStatus from "http-status";
import prismaClient from "../prismaClient";
import { userService } from './index'
import { TOKEN_TYPES } from "../passport/config";
import CONFIG from '../config/config'

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, expires, type, secret = CONFIG.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  const tokenDoc = await prismaClient.tokens.create({
    data: {
      token,
      userId: userId,
      expiresAt: expires.toISOString(),
      createdAt: formatISO(new Date()),
      updatedAt: formatISO(new Date()),
      type,
      blacklisted,
    },
  });
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
  const payload = jwt.verify(token, CONFIG.jwt.secret);
  const tokenDoc = await prismaClient.tokens.findFirst({
    where: {
      token,
      type,
      userId: payload.sub,
      blacklisted: false,
    },
  });

  if (!tokenDoc) {
    throw new Error("Token not found");
  }
  return tokenDoc;
};

/**
 * Delete token by ID
 * @param {number} id
 * @returns {Promise<Token>}
 */
const deleteTokenById = async (id) => {
  await prismaClient.tokens.delete({
    where: {
      id,
    },
  });
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(
    CONFIG.jwt.accessExpirationMinutes,
    "minutes"
  );
  const accessToken = generateToken(
    user.id,
    accessTokenExpires,
    TOKEN_TYPES.ACCESS
  );

  const refreshTokenExpires = moment().add(
    CONFIG.jwt.refreshExpirationDays,
    "days"
  );
  const refreshToken = generateToken(
    user.id,
    refreshTokenExpires,
    TOKEN_TYPES.REFRESH
  );
  await saveToken(
    refreshToken,
    user.id,
    refreshTokenExpires,
    TOKEN_TYPES.REFRESH
  );

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email) => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }
  const expires = moment().add(CONFIG.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(user.id, expires, TOKEN_TYPES.RESET_PASSWORD);
  await saveToken(resetPasswordToken, user.id, expires, TOKEN_TYPES.RESET_PASSWORD);
  return resetPasswordToken;
};

const tokenService = {
  generateToken,
  saveToken,
  deleteTokenById,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
};

export default tokenService;
