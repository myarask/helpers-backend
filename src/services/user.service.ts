import httpStatus from "http-status";
import prismaClient from '../prismaClient'
import { ApiError } from "../utils/catchAsync";

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  const ifExist = await prismaClient.users.findUnique({ where: { email: userBody.email } });
  if (ifExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This email is already in use. Please login');
  }

  // const user = await prismaClient.users.create({
  //   data: {
  //     email: userBody.email,
  //     // password: hashPassword(userBody.password)
  //   }
  // });
  // return user;
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  const user = await prismaClient.users.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};


const userService = {
  createUser,
  getUserByEmail,
};

export default userService;